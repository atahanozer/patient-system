import { z } from "zod";

// CONTRACT: mirrors backend src/auth/* — POST /auth/login → { token, user }.
export const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const userSchema = z.object({
  email: z.email(),
  role: z.enum(["admin", "user"]),
});
export type AuthUser = z.infer<typeof userSchema>;

export const loginResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;
