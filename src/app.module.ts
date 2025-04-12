import { Module } from "@nestjs/common";
import { DrizzlePGModule } from "@knaadh/nestjs-drizzle-pg";
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";
import * as schema from "./db/schema";
import Joi from "joi";

const NODE_ENV = process.env.NODE_ENV;

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: !NODE_ENV ? ".env" : `.env.${NODE_ENV}`,
            isGlobal: true,
            validationSchema: Joi.object({
                POSTGRES_CONNECTION_URI: Joi.string().required(),
                DISCORD_TOKEN: Joi.string().required(),
                DISCORD_CLIENT_ID: Joi.string().required()
            })
        }),
        DrizzlePGModule.registerAsync({
            tag: "DB_PROD",
            useFactory() {
                return {
                    pg: {
                        connection: "client",
                        config: {
                            connectionString: process.env.POSTGRES_CONNECTION_URI
                        }
                    },
                    config: { schema: { ...schema } }
                };
            }
        }),
        ScheduleModule.forRoot()
    ],
    controllers: [AppController],
    providers: []
})
export class AppModule {}
