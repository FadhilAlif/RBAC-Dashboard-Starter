import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator.js";
import type { AuthenticatedUser } from "../types/authenticated-user.type.js";
import { PermissionsCacheService } from "../../modules/permissions/permissions-cache.service.js";

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(
    @Optional() @Inject(Reflector) reflector?: Reflector,
    @Optional()
    @Inject(PermissionsCacheService)
    private readonly permissionsCacheService?: PermissionsCacheService,
  ) {
    this.reflector = reflector ?? new Reflector();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException("Access denied: Insufficient permissions");
    }

    let userPermissions = user.permissions;

    // Resolve via cache/DB jika PermissionsCacheService tersedia
    if (this.permissionsCacheService && user.id) {
      userPermissions = await this.permissionsCacheService.getUserPermissionsOrFetch(user.id);
      user.permissions = userPermissions;
    }

    if (!userPermissions || userPermissions.length === 0) {
      throw new ForbiddenException("Access denied: Insufficient permissions");
    }

    const hasPermission = requiredPermissions.some((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException("Access denied: Insufficient permissions");
    }

    return true;
  }
}
