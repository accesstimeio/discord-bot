import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

import { AppController } from "./app.controller";
import { CommandModule } from "./modules/command/command.module";

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
        ScheduleModule.forRoot(),
        CommandModule
    ],
    controllers: [AppController],
    providers: []
})
export class AppModule {}
