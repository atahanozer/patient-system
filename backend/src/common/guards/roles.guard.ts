import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) {
      return true;
    }
    const request = ctx.switchToHttp().getRequest<{ user?: { role?: string } }>();
    const role = String(request.user?.role ?? '').toLowerCase();
    if (!required.map((r) => r.toLowerCase()).includes(role)) {
      throw new ForbiddenException('Insufficient role'); // 403, distinct from 401
    }
    return true;
  }
}
