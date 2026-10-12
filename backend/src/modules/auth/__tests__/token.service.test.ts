import { describe, expect, it } from "vitest";
import { TokenService } from "../token.service.js";

describe("TokenService", () => {
  const tokenService = new TokenService();

  it("should generate, sign, and verify access token correctly", () => {
    const payload = {
      userId: 1,
      email: "admin@example.com",
      roles: ["admin"],
      permissions: ["users:read", "users:create"],
    };

    const token = tokenService.signAccessToken(payload);
    expect(typeof token).toBe("string");

    const decoded = tokenService.verifyAccessToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.roles).toEqual(payload.roles);
    expect(decoded.permissions).toEqual(payload.permissions);
  });

  it("should generate distinct refresh tokens and deterministic hashes", () => {
    const token1 = tokenService.generateRefreshToken();
    const token2 = tokenService.generateRefreshToken();
    expect(token1).not.toBe(token2);

    const hash1a = tokenService.hashRefreshToken(token1);
    const hash1b = tokenService.hashRefreshToken(token1);
    expect(hash1a).toBe(hash1b);

    const hash2 = tokenService.hashRefreshToken(token2);
    expect(hash1a).not.toBe(hash2);
  });
});
