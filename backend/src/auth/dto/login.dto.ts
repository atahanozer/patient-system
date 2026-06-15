import { IsEmail, IsString, MinLength } from 'class-validator';

// CONTRACT: mirrored by the frontend zod schema in
// frontend/src/lib/contracts/auth.ts (loginSchema). POST /auth/login → { token, user }.
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
