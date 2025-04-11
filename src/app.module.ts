import { Module } from "@nestjs/common";
import { DrizzlePGModule } from "@knaadh/nestjs-drizzle-pg";

import { AppController } from "./app.controller";
import * as schema from "./db/schema";

@Module({
    imports: [
        DrizzlePGModule.registerAsync({
            tag: "DB_PROD",
            useFactory() {
                return {
                    pg: {
                        connection: "client",
                        config: {
                            connectionString: "postgres://*"
                        }
                    },
                    config: { schema: { ...schema } }
                };
            }
        })
    ],
    controllers: [AppController],
    providers: []
})
export class AppModule {}
