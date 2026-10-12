import { Global, Module, type OnApplicationShutdown } from "@nestjs/common";
import { db, queryClient } from "./connection.js";

export const DRIZZLE_DB = Symbol("DRIZZLE_DB");

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DB,
      useValue: db,
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  async onApplicationShutdown() {
    await queryClient.end();
  }
}
