import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { TokenService } from "./token.service.js";
import { Public } from "../../common/decorators/public.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  updateMeSchema,
  verifyEmailSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResendVerificationInput,
  type ResetPasswordInput,
  type UpdateMeInput,
  type VerifyEmailInput,
} from "./auth.schemas.js";

import { Inject } from "@nestjs/common";

@ApiTags("Auth")
@Controller("api/auth")
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(TokenService) private readonly tokenService: TokenService,
  ) {}

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Body() input: RegisterInput) {
    const result = await this.authService.register(input);
    return {
      message: "Registration successful. Please check your email to verify your account.",
      data: {
        id: result.id,
        name: result.name,
        fullName: result.name,
        email: result.email,
      },
    };
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(
    @Body() input: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(input);
    this.tokenService.setAuthCookies(res, result.accessToken, result.refreshToken);

    const userPayload = {
      id: result.user.id,
      name: result.user.name ?? result.user.fullName ?? "",
      fullName: result.user.fullName ?? result.user.name ?? "",
      email: result.user.email,
      roles: result.user.roles,
      permissions: result.user.permissions,
      user: {
        id: result.user.id,
        name: result.user.name ?? result.user.fullName ?? "",
        fullName: result.user.fullName ?? result.user.name ?? "",
        email: result.user.email,
        roles: result.user.roles,
        permissions: result.user.permissions,
      },
    };

    return {
      message: "Login successful",
      data: userPayload,
    };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefresh = req.cookies?.["refresh_token"] as string | undefined;
    const tokenHash = rawRefresh ? this.tokenService.hashRefreshToken(rawRefresh) : undefined;

    await this.authService.logout(user.id, tokenHash);
    this.tokenService.clearAuthCookies(res);

    return {
      message: "Logged out successfully",
      data: null,
    };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefresh = req.cookies?.["refresh_token"] as string | undefined;
    if (!rawRefresh) {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    const result = await this.authService.refresh(rawRefresh);
    this.tokenService.setAuthCookies(res, result.accessToken, result.refreshToken);

    return {
      message: "Token refreshed",
      data: null,
    };
  }

  @Get("me")
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.authService.getMe(user.id);
    const userPayload = {
      id: profile.id,
      name: profile.name ?? profile.fullName ?? "",
      fullName: profile.fullName ?? profile.name ?? "",
      email: profile.email,
      roles: profile.roles,
      permissions: profile.permissions,
      user: {
        id: profile.id,
        name: profile.name ?? profile.fullName ?? "",
        fullName: profile.fullName ?? profile.name ?? "",
        email: profile.email,
        roles: profile.roles,
        permissions: profile.permissions,
      },
    };
    return {
      data: userPayload,
    };
  }

  @Patch("me")
  @UsePipes(new ZodValidationPipe(updateMeSchema))
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateMeInput,
  ) {
    const updated = await this.authService.updateMe(user.id, input);
    const userPayload = {
      id: updated.id,
      name: updated.name ?? updated.fullName ?? "",
      fullName: updated.fullName ?? updated.name ?? "",
      email: updated.email,
      roles: updated.roles,
      permissions: updated.permissions,
      user: {
        id: updated.id,
        name: updated.name ?? updated.fullName ?? "",
        fullName: updated.fullName ?? updated.name ?? "",
        email: updated.email,
        roles: updated.roles,
        permissions: updated.permissions,
      },
    };
    return {
      message: "Profile updated",
      data: userPayload,
    };
  }

  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(changePasswordSchema))
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: ChangePasswordInput,
  ) {
    await this.authService.changePassword(user.id, input);
    return {
      message: "Password changed successfully",
      data: null,
    };
  }

  @Public()
  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(verifyEmailSchema))
  async verifyEmail(
    @Body() input: VerifyEmailInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmail(input.token);
    this.tokenService.setAuthCookies(res, result.accessToken, result.refreshToken);

    const userPayload = {
      id: result.user.id,
      name: result.user.name ?? result.user.fullName ?? "",
      fullName: result.user.fullName ?? result.user.name ?? "",
      email: result.user.email,
      roles: result.user.roles,
      permissions: result.user.permissions,
      user: {
        id: result.user.id,
        name: result.user.name ?? result.user.fullName ?? "",
        fullName: result.user.fullName ?? result.user.name ?? "",
        email: result.user.email,
        roles: result.user.roles,
        permissions: result.user.permissions,
      },
    };

    return {
      message: "Email verified successfully",
      data: userPayload,
    };
  }

  @Public()
  @Post("resend-verification")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(resendVerificationSchema))
  async resendVerification(@Body() input: ResendVerificationInput) {
    await this.authService.resendVerification(input.email);
    return {
      message: "Verification email sent if account exists",
      data: null,
    };
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(forgotPasswordSchema))
  async forgotPassword(@Body() input: ForgotPasswordInput) {
    await this.authService.forgotPassword(input.email);
    return {
      message: "If that email exists, a reset link has been sent.",
      data: null,
    };
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  async resetPassword(@Body() input: ResetPasswordInput) {
    await this.authService.resetPassword(input.token, input.password);
    return {
      message: "Password reset successful",
      data: null,
    };
  }
}
