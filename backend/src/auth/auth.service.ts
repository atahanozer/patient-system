import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

export interface LoginResult {
  token: string;
  user: { email: string; role: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.users.findByEmail(email);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { token, user: { email: user.email, role: user.role.toLowerCase() } };
  }
}
