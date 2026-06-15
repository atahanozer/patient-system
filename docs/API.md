# API Reference

Base URL (local): `http://localhost:3001`

All request/response bodies are JSON. Protected routes require an
`Authorization: Bearer <token>` header obtained from `POST /auth/login`.

## Conventions

### Error envelope

Every error (validation, auth, not-found, conflict, chaos, unexpected) is
returned by the global `HttpExceptionFilter` in this shape:

```json
{
  "statusCode": 404,
  "message": "Patient 1234 not found",
  "error": "Not Found",
  "timestamp": "2026-06-15T12:00:00.000Z",
  "path": "/patients/1234"
}
```

`message` may be a single string or, for validation errors, a comma-joined list
of field messages. 5xx responses use a generic message (`"Internal server
error"`) and never leak internals.

### Paginated list shape

```json
{
  "data": [ /* Patient[] */ ],
  "page": 1,
  "limit": 10,
  "total": 120
}
```

### Patient object

```json
{
  "id": "8f2c…",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "email": "ada@example.com",
  "phoneNumber": "+1-555-0100",
  "dob": "1815-12-10T00:00:00.000Z",
  "createdAt": "2026-06-15T12:00:00.000Z",
  "updatedAt": "2026-06-15T12:00:00.000Z"
}
```

### Rate limits

- Global: **100 requests / 60 s** per client (exceeding → `429`).
- `POST /auth/login`: **5 requests / 60 s** per client.

---

## `POST /auth/login`

Authenticate and receive a JWT.

- **Auth:** none
- **Body:**

  | field | type | rules |
  | --- | --- | --- |
  | `email` | string | valid email |
  | `password` | string | non-empty |

**Example request**

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.health","password":"Admin123!"}'
```

**Example response — `200 OK`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…",
  "user": { "email": "admin@demo.health", "role": "admin" }
}
```

**Status codes:** `200` success · `400` malformed body · `401` invalid credentials · `429` too many attempts.

---

## `GET /patients`

List patients with server-side search, sort, and pagination.

- **Auth:** any authenticated user (`admin` or `user`)
- **Query params:**

  | param | type | default | notes |
  | --- | --- | --- | --- |
  | `page` | int ≥ 1 | `1` | |
  | `limit` | int 1–100 | `10` | |
  | `search` | string | — | case-insensitive `contains` over `firstName`, `lastName`, `email` |
  | `sortBy` | enum | `lastName` | one of `lastName`, `firstName`, `dob`, `createdAt` |
  | `sortOrder` | enum | `asc` | `asc` or `desc` |

**Example request**

```bash
curl "http://localhost:3001/patients?page=1&limit=2&search=lov&sortBy=lastName&sortOrder=asc" \
  -H "Authorization: Bearer $TOKEN"
```

**Example response — `200 OK`**

```json
{
  "data": [
    {
      "id": "8f2c…",
      "firstName": "Ada",
      "lastName": "Lovelace",
      "email": "ada@example.com",
      "phoneNumber": "+1-555-0100",
      "dob": "1815-12-10T00:00:00.000Z",
      "createdAt": "2026-06-15T12:00:00.000Z",
      "updatedAt": "2026-06-15T12:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 2,
  "total": 1
}
```

**Status codes:** `200` success · `400` invalid query param (e.g. `sortBy` not in the allowed set, `limit > 100`) · `401` missing/invalid token · `503` simulated chaos failure.

---

## `GET /patients/:id`

Fetch a single patient.

- **Auth:** any authenticated user

**Example request**

```bash
curl http://localhost:3001/patients/8f2c… -H "Authorization: Bearer $TOKEN"
```

**Example response — `200 OK`:** a single [Patient object](#patient-object).

**Status codes:** `200` success · `401` unauthenticated · `404` no patient with that id · `503` simulated chaos failure.

---

## `POST /patients`

Create a patient.

- **Auth:** `admin` only
- **Body:**

  | field | type | rules |
  | --- | --- | --- |
  | `firstName` | string | min length 1 |
  | `lastName` | string | min length 1 |
  | `email` | string | valid email, **unique** |
  | `phoneNumber` | string | min length 3 |
  | `dob` | string | ISO date string (e.g. `1990-01-01`) |

**Example request**

```bash
curl -X POST http://localhost:3001/patients \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Grace","lastName":"Hopper","email":"grace@example.com","phoneNumber":"+1-555-0101","dob":"1906-12-09"}'
```

**Example response — `201 Created`:** the created [Patient object](#patient-object).

**Status codes:** `201` created · `400` validation error · `401` unauthenticated · `403` not an admin · `409` a patient with that email already exists · `503` simulated chaos failure.

**Example `409` (email conflict)**

```json
{
  "statusCode": 409,
  "message": "A patient with this email already exists",
  "error": "Conflict",
  "timestamp": "2026-06-15T12:00:00.000Z",
  "path": "/patients"
}
```

---

## `PUT /patients/:id`

Update a patient. All body fields are optional (partial update); the same field
rules apply when present.

- **Auth:** `admin` only

**Example request**

```bash
curl -X PUT http://localhost:3001/patients/8f2c… \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Augusta"}'
```

**Example response — `200 OK`:** the updated [Patient object](#patient-object).

**Status codes:** `200` updated · `400` validation error · `401` unauthenticated · `403` not an admin · `404` no patient with that id · `409` email conflict · `503` simulated chaos failure.

---

## `DELETE /patients/:id`

Delete a patient.

- **Auth:** `admin` only

**Example request**

```bash
curl -X DELETE http://localhost:3001/patients/8f2c… -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Example response — `200 OK`**

```json
{ "ok": true }
```

**Status codes:** `200` deleted · `401` unauthenticated · `403` not an admin · `404` no patient with that id · `503` simulated chaos failure.

---

## Status code summary

| Code | When |
| --- | --- |
| `200` | Successful read / update / delete / login |
| `201` | Patient created |
| `400` | Body or query failed validation (`ValidationPipe`) |
| `401` | No / invalid / expired bearer token, or bad login credentials |
| `403` | Authenticated but lacks the required role (non-admin write) |
| `404` | Patient id not found |
| `409` | Duplicate email on create/update (Prisma `P2002`) |
| `429` | Rate limit exceeded |
| `503` | Simulated downstream failure from `ChaosInterceptor` (patients routes, when `CHAOS_ENABLED`) |
| `500` | Unexpected server error (generic message; logged with stack) |
