import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";

const ERROR_MAP: Record<string, { status: number; message: string }> = {
  INVALID_CREDENTIALS: { status: 401, message: "Invalid email or password." },
  ACCOUNT_DISABLED: { status: 403, message: "Your account has been disabled. Contact support." },
  INVALID_REFRESH_TOKEN: { status: 401, message: "Your session has expired. Please log in again." },
  REFRESH_TOKEN_EXPIRED: { status: 401, message: "Your session has expired. Please log in again." },
  EMAIL_TAKEN: { status: 409, message: "Email address is already in use." },
  USER_NOT_FOUND: { status: 404, message: "User not found." },
  WRONG_PASSWORD: { status: 400, message: "Current password is incorrect." },
  ROLE_NOT_FOUND: { status: 404, message: "Role not found." },
  ROLE_NAME_TAKEN: { status: 409, message: "A role with this name already exists." },
  PERMISSION_NOT_FOUND: { status: 404, message: "Permission not found." },
  PERMISSION_NAME_TAKEN: { status: 409, message: "A permission with this name already exists." },
  EMAIL_NOT_VERIFIED: { status: 403, message: "Please verify your email address before logging in." },
  INVALID_VERIFICATION_TOKEN: { status: 400, message: "This verification link is invalid or has already been used." },
  VERIFICATION_TOKEN_EXPIRED: { status: 400, message: "This verification link has expired. Please request a new one." },
  ALREADY_VERIFIED: { status: 400, message: "Your email address is already verified." },
  INVALID_RESET_TOKEN: { status: 400, message: "This reset link is invalid or has already been used." },
  RESET_TOKEN_EXPIRED: { status: 400, message: "This reset link has expired. Please request a new one." },
  NOTIFICATION_NOT_FOUND: { status: 404, message: "Notification not found." },
};

function isHttpExceptionLike(
  exception: unknown,
): exception is HttpException {
  return (
    exception instanceof HttpException ||
    (typeof exception === "object" &&
      exception !== null &&
      "getStatus" in exception &&
      typeof (exception as HttpException).getStatus === "function" &&
      "getResponse" in exception &&
      typeof (exception as HttpException).getResponse === "function")
  );
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "An unexpected error occurred. Please try again.";
    let errors: unknown = undefined;

    if (isHttpExceptionLike(exception)) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj.message as string) || exception.message;
        errors = obj.errors;
      }
    } else if (exception instanceof Error) {
      const mapped = ERROR_MAP[exception.message];
      if (mapped) {
        status = mapped.status;
        message = mapped.message;
      } else {
        this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
      }
    }

    response.status(status).json({
      success: false,
      message,
      data: null,
      ...(errors ? { errors } : {}),
    });
  }
}
