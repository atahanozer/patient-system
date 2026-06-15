// Force chaos OFF before AppModule (and thus ConfigModule) is imported, so the
// ChaosInterceptor never randomly 503s during the run. This is belt-and-braces:
// the `test:e2e` npm script also sets CHAOS_ENABLED=false. @nestjs/config does NOT
// override existing process.env, so this value wins over the `.env` file's `true`.
process.env.CHAOS_ENABLED = 'false';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';

// supertest types `res.body` as `any`; these shapes let us narrow it once (via a
// typed `body()` helper) instead of scattering unsafe member access everywhere.
interface LoginBody {
  token: string;
  user: { email: string; role: string };
}
interface PatientBody {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dob: string;
}
interface ListBody {
  data: PatientBody[];
  page: number;
  limit: number;
  total: number;
}
interface OkBody {
  ok: boolean;
}

const body = <T>(res: request.Response): T => res.body as T;

const ADMIN = { email: 'admin@demo.health', password: 'Admin123!' };
const USER = { email: 'user@demo.health', password: 'User123!' };

// Unique per run so re-runs never collide on the Patient.email unique constraint.
const RUN_ID = Date.now();
const newPatient = () => ({
  firstName: 'E2eFirst',
  lastName: 'E2eLast',
  email: `e2e+${RUN_ID}@test.local`,
  phoneNumber: '+15555550123',
  dob: '1990-01-01',
});

describe('Patients API (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    // Guard against a leaking .env value despite the process.env override above.
    expect(process.env.CHAOS_ENABLED).toBe('false');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mirror main.ts so validation + error envelopes match production.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    server = app.getHttpServer();

    const adminRes = await request(server).post('/auth/login').send(ADMIN).expect(200);
    adminToken = body<LoginBody>(adminRes).token;

    const userRes = await request(server).post('/auth/login').send(USER).expect(200);
    userToken = body<LoginBody>(userRes).token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('auth', () => {
    it('1. POST /auth/login (admin) → 200 with token + user.role=admin', async () => {
      const res = await request(server).post('/auth/login').send(ADMIN).expect(200);
      const b = body<LoginBody>(res);
      expect(typeof b.token).toBe('string');
      expect(b.token.length).toBeGreaterThan(0);
      expect(b.user.email).toBe(ADMIN.email);
      expect(b.user.role).toBe('admin');
    });

    it('2. POST /auth/login (wrong password) → 401', async () => {
      await request(server)
        .post('/auth/login')
        .send({ email: ADMIN.email, password: 'wrong-password' })
        .expect(401);
    });
  });

  describe('patients - read', () => {
    it('3. GET /patients without Authorization → 401', async () => {
      await request(server).get('/patients').expect(401);
    });

    it('4. GET /patients?limit=5 (admin) → 200 paginated envelope', async () => {
      const res = await request(server)
        .get('/patients?limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const b = body<ListBody>(res);
      expect(Array.isArray(b.data)).toBe(true);
      expect(b.data.length).toBeLessThanOrEqual(5);
      expect(b.page).toBe(1);
      expect(b.limit).toBe(5);
      expect(typeof b.total).toBe('number');
    });

    it('5. GET /patients?search=<known lastName> → 200 filtered results', async () => {
      // Fetch a real patient first, then search by its lastName so the value is
      // guaranteed present and we can assert the filter actually matched.
      const seed = await request(server)
        .get('/patients?limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const seedBody = body<ListBody>(seed);
      expect(seedBody.data.length).toBeGreaterThan(0);
      const lastName = seedBody.data[0].lastName;

      const res = await request(server)
        .get(`/patients?search=${encodeURIComponent(lastName)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const b = body<ListBody>(res);
      expect(b.total).toBeGreaterThan(0);
      expect(b.data.length).toBeGreaterThan(0);
      const needle = lastName.toLowerCase();
      // search matches firstName | lastName | email (case-insensitive).
      for (const p of b.data) {
        const haystack = `${p.firstName} ${p.lastName} ${p.email}`.toLowerCase();
        expect(haystack).toContain(needle);
      }
    });
  });

  describe('patients - write / RBAC / CRUD', () => {
    let createdId: string;

    it('6. POST /patients as user → 403', async () => {
      await request(server)
        .post('/patients')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newPatient())
        .expect(403);
    });

    it('7. POST /patients as admin (valid body) → 201 with id + fields', async () => {
      const payload = newPatient();
      const res = await request(server)
        .post('/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      const b = body<PatientBody>(res);
      expect(typeof b.id).toBe('string');
      expect(b.firstName).toBe(payload.firstName);
      expect(b.lastName).toBe(payload.lastName);
      expect(b.email).toBe(payload.email);
      expect(b.phoneNumber).toBe(payload.phoneNumber);
      createdId = b.id;
    });

    it('8. POST /patients as admin (invalid body) → 400', async () => {
      await request(server)
        .post('/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'x' })
        .expect(400);
    });

    it('9. GET /patients/:id → 200; GET /patients/<random-uuid> → 404', async () => {
      expect(createdId).toBeDefined();

      const found = await request(server)
        .get(`/patients/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(body<PatientBody>(found).id).toBe(createdId);

      await request(server)
        .get('/patients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('10. PUT /patients/:id as admin → 200 with updated firstName', async () => {
      expect(createdId).toBeDefined();

      const res = await request(server)
        .put(`/patients/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'E2eUpdated' })
        .expect(200);

      const b = body<PatientBody>(res);
      expect(b.id).toBe(createdId);
      expect(b.firstName).toBe('E2eUpdated');
    });

    it('11. DELETE /patients/:id as admin → 200 {ok:true}; then GET → 404', async () => {
      expect(createdId).toBeDefined();

      const res = await request(server)
        .delete(`/patients/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(body<OkBody>(res)).toEqual({ ok: true });

      await request(server)
        .get(`/patients/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
