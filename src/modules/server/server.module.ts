import { Module } from "@nestjs/common";

import { AccessTimeModule } from "../accesstime/accesstime.module";
import { DatabaseModule } from "../database/database.module";

import { ServerService } from "./server.service";

@Module({
    imports: [AccessTimeModule, DatabaseModule],
    providers: [ServerService],
    exports: [ServerService]
})
export class ServerModule {}
