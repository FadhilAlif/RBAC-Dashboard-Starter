import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, ne } from "drizzle-orm";
import { DRIZZLE_DB } from "../../database/database.module.js";
import type { DrizzleDatabase } from "../../database/connection.js";
import {
  emailVerificationTokens,
  passwordResetTokens,
  permissions,
  refreshTokens,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "../../database/schema/index.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type.js";
import { comparePassword, hashPassword } from "../../utils/hash.js";
import { MailService } from "./mail.service.js";
import { TokenService } from "./token.service.js";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateMeInput,
} from "./auth.schemas.js";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthResult {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterUserResult {
  id: number;
  name: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(MailService) private readonly mailService: MailService,
  ) {}

  async register(input: RegisterInput): Promise<RegisterUserResult> {
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existing) throw new Error("EMAIL_TAKEN");

    const passwordHash = await hashPassword(input.password);

    const [newUser] = await this.db
      .insert(users)
      .values({
        fullName: input.name,
        email: input.email,
        passwordHash,
        isActive: false,
      })
      .returning({ id: users.id });

    if (!newUser) throw new Error("Failed to create user");

    // Assign default role 'user'
    const [defaultRole] = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, "user"))
      .limit(1);

    if (defaultRole) {
      await this.db
        .insert(userRoles)
        .values({ userId: newUser.id, roleId: defaultRole.id })
        .onConflictDoNothing();
    }

    const rawToken = this.tokenService.generateVerificationToken();
    const tokenHash = this.tokenService.hashVerificationToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

    await this.db.insert(emailVerificationTokens).values({
      userId: newUser.id,
      tokenHash,
      expiresAt,
    });

    await this.mailService.sendVerificationEmail(input.email, input.name, rawToken);

    return { id: newUser.id, name: input.name, email: input.email };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (!user) throw new Error("INVALID_CREDENTIALS");

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) throw new Error("INVALID_CREDENTIALS");

    if (!user.emailVerifiedAt) throw new Error("EMAIL_NOT_VERIFIED");
    if (!user.isActive) throw new Error("ACCOUNT_DISABLED");

    return this.buildAuthResult(user.id);
  }

  async verifyEmail(token: string): Promise<AuthResult> {
    const tokenHash = this.tokenService.hashVerificationToken(token);
    const [record] = await this.db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenHash, tokenHash))
      .limit(1);

    if (!record || record.usedAt !== null) throw new Error("INVALID_VERIFICATION_TOKEN");
    if (new Date() > record.expiresAt) throw new Error("VERIFICATION_TOKEN_EXPIRED");

    await this.db.transaction(async (tx) => {
      await tx
        .update(emailVerificationTokens)
        .set({ usedAt: new Date() })
        .where(eq(emailVerificationTokens.tokenHash, tokenHash));

      await tx
        .update(users)
        .set({ isActive: true, emailVerifiedAt: new Date() })
        .where(eq(users.id, record.userId));
    });

    return this.buildAuthResult(record.userId);
  }

  async resendVerification(email: string): Promise<void> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) return;
    if (user.emailVerifiedAt !== null) throw new Error("ALREADY_VERIFIED");

    await this.db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.userId, user.id));

    const rawToken = this.tokenService.generateVerificationToken();
    const tokenHash = this.tokenService.hashVerificationToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

    await this.db.insert(emailVerificationTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await this.mailService.sendVerificationEmail(user.email, user.fullName, rawToken);
  }

  async forgotPassword(email: string): Promise<void> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) return;

    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.userId, user.id));

    const rawToken = this.tokenService.generateVerificationToken();
    const tokenHash = this.tokenService.hashVerificationToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await this.mailService.sendPasswordResetEmail(user.email, user.fullName, rawToken);
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const tokenHash = this.tokenService.hashVerificationToken(token);
    const [record] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (!record || record.usedAt !== null) throw new Error("INVALID_RESET_TOKEN");
    if (new Date() > record.expiresAt) throw new Error("RESET_TOKEN_EXPIRED");

    const newPasswordHash = await hashPassword(password);

    await this.db.transaction(async (tx) => {
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.tokenHash, tokenHash));

      await tx
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          ...(record.isInvite ? { isActive: true, emailVerifiedAt: new Date() } : {}),
        })
        .where(eq(users.id, record.userId));

      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.userId, record.userId));
    });
  }

  async logout(userId: number, refreshTokenHash?: string): Promise<void> {
    if (refreshTokenHash) {
      await this.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.tokenHash, refreshTokenHash));
    }
  }

  async refresh(rawRefreshToken: string): Promise<AuthResult> {
    const tokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);
    const [stored] = await this.db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
      .limit(1);

    if (!stored) throw new Error("INVALID_REFRESH_TOKEN");

    if (new Date() > stored.expiresAt) {
      await this.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.tokenHash, tokenHash));
      throw new Error("REFRESH_TOKEN_EXPIRED");
    }

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, stored.userId))
      .limit(1);

    if (!user) throw new Error("USER_NOT_FOUND");
    if (!user.emailVerifiedAt) throw new Error("EMAIL_NOT_VERIFIED");
    if (!user.isActive) throw new Error("ACCOUNT_DISABLED");

    // Token rotation: Revoke old token
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenHash));

    return this.buildAuthResult(stored.userId);
  }

  async getMe(userId: number): Promise<AuthenticatedUser> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new Error("USER_NOT_FOUND");

    const [rolesList, permissionsList] = await Promise.all([
      this.getUserRoles(userId),
      this.getUserPermissions(userId),
    ]);

    return {
      id: user.id,
      name: user.fullName,
      fullName: user.fullName,
      email: user.email,
      roles: rolesList,
      permissions: permissionsList,
    };
  }

  async updateMe(userId: number, input: UpdateMeInput): Promise<AuthenticatedUser> {
    if (input.email) {
      const [conflict] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, input.email), ne(users.id, userId)))
        .limit(1);

      if (conflict) throw new Error("EMAIL_TAKEN");
    }

    await this.db
      .update(users)
      .set({
        ...(input.name !== undefined ? { fullName: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
      })
      .where(eq(users.id, userId));

    return this.getMe(userId);
  }

  async changePassword(userId: number, input: ChangePasswordInput): Promise<void> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new Error("USER_NOT_FOUND");

    const valid = await comparePassword(input.current_password, user.passwordHash);
    if (!valid) throw new Error("WRONG_PASSWORD");

    const newHash = await hashPassword(input.new_password);

    await this.db
      .update(users)
      .set({ passwordHash: newHash })
      .where(eq(users.id, userId));

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, userId));

    await this.mailService.sendPasswordChangedEmail(user.email, user.fullName);
  }

  async getUserRoles(userId: number): Promise<string[]> {
    const rows = await this.db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    return rows.map((r) => r.name);
  }

  async getUserPermissions(userId: number): Promise<string[]> {
    const rows = await this.db
      .select({ name: permissions.name })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId));

    return Array.from(new Set(rows.map((r) => r.name)));
  }

  private async buildAuthResult(userId: number): Promise<AuthResult> {
    const user = await this.getMe(userId);

    const accessToken = this.tokenService.signAccessToken({
      userId: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
    });

    const rawRefresh = this.tokenService.generateRefreshToken();
    const refreshHash = this.tokenService.hashRefreshToken(rawRefresh);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.db.insert(refreshTokens).values({
      userId,
      tokenHash: refreshHash,
      expiresAt,
    });

    return { user, accessToken, refreshToken: rawRefresh };
  }
}
