import { Global, Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { MailService } from "./mail.service.js";
import { TokenService } from "./token.service.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../../common/guards/permissions.guard.js";

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    MailService,
    Reflector,
    JwtAuthGuard,
    PermissionsGuard,
  ],
  exports: [
    AuthService,
    TokenService,
    MailService,
    Reflector,
    JwtAuthGuard,
    PermissionsGuard,
  ],
})
export class AuthModule {}
