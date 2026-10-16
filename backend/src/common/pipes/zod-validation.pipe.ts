import {
  BadRequestException,
  type ArgumentMetadata,
  type PipeTransform,
} from "@nestjs/common";
import type { ZodSchema } from "zod";

export class ZodValidationPipe implements PipeTransform {
  constructor(
    private readonly schema: ZodSchema,
    private readonly targetType: "body" | "query" | "param" = "body",
  ) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== this.targetType) {
      return value;
    }

    const result = this.schema.safeParse(value);
    if (!result.success) {
      const formattedErrors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        errors: formattedErrors,
      });
    }

    return result.data;
  }
}
