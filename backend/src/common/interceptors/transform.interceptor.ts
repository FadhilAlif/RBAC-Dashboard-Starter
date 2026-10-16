import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  StreamableFile,
} from "@nestjs/common";
import { type Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T> | T> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((result) => {
        // Jangan wrap binary files, SSE stream events, atau buffers (seperti export Excel)
        if (
          result instanceof StreamableFile ||
          Buffer.isBuffer(result) ||
          response.getHeader("content-type")?.toString().includes("spreadsheet") ||
          response.getHeader("content-type")?.toString().includes("text/event-stream") ||
          (result &&
            typeof result === "object" &&
            "type" in result &&
            "data" in result &&
            !("success" in result))
        ) {
          return result;
        }

        // Jika response sudah dibentuk sebagai standard object { success, ... }
        if (result && typeof result === "object" && "success" in result) {
          return result;
        }

        // Jika result berbentuk paginated { data, meta }
        if (result && typeof result === "object" && "meta" in result) {
          return {
            success: true,
            message: ("message" in result && typeof (result as Record<string, unknown>).message === "string") ? (result as Record<string, unknown>).message as string : "Success",
            data: "data" in result ? (result as Record<string, unknown>).data : [],
            meta: (result as Record<string, unknown>).meta,
          };
        }

        // Jika result berbentuk { message, data }
        if (result && typeof result === "object" && ("data" in result || "message" in result)) {
          return {
            success: true,
            message: result.message || "Success",
            data: result.data !== undefined ? result.data : null,
          };
        }

        return {
          success: true,
          message: "Success",
          data: result !== undefined ? result : null,
        };
      }),
    );
  }
}
