import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

interface MockRequest {
  user?: { role?: string };
}

function buildContext(request: MockRequest): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class Dummy {},
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows access when no @Roles metadata is present', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(buildContext({ user: { role: 'USER' } }))).toBe(true);
  });

  it('allows access when the user role matches required (case-insensitive)', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(guard.canActivate(buildContext({ user: { role: 'ADMIN' } }))).toBe(true);
  });

  it('throws ForbiddenException when the user role is not in required roles', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(() => guard.canActivate(buildContext({ user: { role: 'USER' } }))).toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when no user is present on the request', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(() => guard.canActivate(buildContext({}))).toThrow(ForbiddenException);
  });
});
