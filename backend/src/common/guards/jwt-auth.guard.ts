import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import { TokenService } from "../../modules/auth/token.service.js";
import type { Request } from "express";

import { Inject } from "@nestjs/common";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly reflector: Reflector;
  private readonly tokenService: TokenService;

  constructor(
    @Optional() @Inject(Reflector) reflector?: Reflector,
    @Optional() @Inject(TokenService) tokenService?: TokenService,
  ) {
    this.reflector = reflector ?? new Reflector();
    this.tokenService = tokenService ?? new TokenService();
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token =
      request.cookies?.["access_token"] ||
      request.cookies?.["accessToken"] ||
      this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("Unauthorized");
    }

    try {
      const payload = this.tokenService.verifyAccessToken(token);
      request.user = {
        id: payload.userId,
        email: payload.email,
        roles: payload.roles,
        permissions: payload.permissions,
      };
      return true;
    } catch {
      throw new UnauthorizedException("Token expired or invalid");
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
