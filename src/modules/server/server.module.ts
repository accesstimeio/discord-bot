import { Module } from "@nestjs/common";

import { ServerService } from "./server.service";

import { AccessTimeModule } from "../accesstime/accesstime.module";
import { DatabaseModule } from "../database/database.module";

@Module({
    imports: [AccessTimeModule, DatabaseModule],
    providers: [ServerService],
    exports: [ServerService]
})
export class ServerModule {}
