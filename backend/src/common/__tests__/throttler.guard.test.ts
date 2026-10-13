import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../app.module.js";

describe("AppModule & AppThrottlerGuard DI Bootstrap", () => {
  it("should resolve all AppModule dependencies including AppThrottlerGuard and AuditLogInterceptor", async () => {
    const app = await NestFactory.create(AppModule, { abortOnError: false });
    await app.init();
    expect(app).toBeDefined();
    await app.close();
  });
});
