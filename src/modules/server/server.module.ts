import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";

import { AccessTimeModule } from "../accesstime/accesstime.module";
import { DatabaseModule } from "../database/database.module";

import { ServerService } from "./server.service";

@Module({
    imports: [
        AccessTimeModule,
        DatabaseModule,
        BullModule.registerQueueAsync({
            name: "accessTime",
            useFactory: () => ({
                connection: {
                    url: process.env.REDIS_URL
                },
                defaultJobOptions: {
                    attempts: 3,
                    lifo: true,
                    removeOnComplete: true
                }
            })
        })
    ],
    providers: [ServerService],
    exports: [ServerService]
})
export class ServerModule {}
