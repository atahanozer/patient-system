import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

// bcrypt's CJS exports are non-configurable, so jest.spyOn can't patch them;
// auto-mock the module and drive `compare` through the typed mock instead.
jest.mock('bcrypt');
const compareMock = bcrypt.compare as unknown as jest.Mock;

const adminUser: User = {
  id: 'u-admin',
  email: 'admin@demo.health',
  passwordHash: 'hashed-admin',
  role: Role.ADMIN,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('AuthService', () => {
  let service: AuthService;
  let users: { findByEmail: jest.Mock };
  let jwt: { signAsync: jest.Mock };

  beforeEach(() => {
    compareMock.mockReset();
    users = { findByEmail: jest.fn() };
    jwt = { signAsync: jest.fn() };
    service = new AuthService(users as unknown as UsersService, jwt as unknown as JwtService);
  });

  describe('validateUser', () => {
    it('returns the user when bcrypt matches', async () => {
      users.findByEmail.mockResolvedValue(adminUser);
      compareMock.mockResolvedValue(true);

      const result = await service.validateUser('admin@demo.health', 'Admin123!');

      expect(result).toEqual(adminUser);
    });

    it('returns null when the user is missing', async () => {
      users.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('nobody@demo.health', 'x');

      expect(result).toBeNull();
      expect(compareMock).not.toHaveBeenCalled();
    });

    it('returns null when the password is wrong', async () => {
      users.findByEmail.mockResolvedValue(adminUser);
      compareMock.mockResolvedValue(false);

      const result = await service.validateUser('admin@demo.health', 'wrong');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException on bad credentials', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(service.login('admin@demo.health', 'wrong')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('returns a token and a lowercased role on success', async () => {
      users.findByEmail.mockResolvedValue(adminUser);
      compareMock.mockResolvedValue(true);
      jwt.signAsync.mockResolvedValue('signed.jwt.token');

      const result = await service.login('admin@demo.health', 'Admin123!');

      expect(result).toEqual({
        token: 'signed.jwt.token',
        user: { email: 'admin@demo.health', role: 'admin' },
      });
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 'u-admin',
        email: 'admin@demo.health',
        role: Role.ADMIN,
      });
    });
  });
});
