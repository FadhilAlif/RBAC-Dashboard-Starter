import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe.js";
import { BadRequestException } from "@nestjs/common";

describe("ZodValidationPipe", () => {
  const schema = z.object({
    name: z.string().min(2),
    age: z.number().positive(),
  });

  const pipe = new ZodValidationPipe(schema);

  it("should validate and return parsed data", () => {
    const input = { name: "Alice", age: 25 };
    const result = pipe.transform(input, { type: "body" });
    expect(result).toEqual({ name: "Alice", age: 25 });
  });

  it("should throw BadRequestException on invalid data", () => {
    const input = { name: "A", age: -5 };
    expect(() => pipe.transform(input, { type: "body" })).toThrow(BadRequestException);
  });

  it("should pass through route params untouched when validating body", () => {
    expect(pipe.transform(42, { type: "param", data: "id" })).toBe(42);
  });
});
