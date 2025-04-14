import { Module } from "@nestjs/common";

import { ServerService } from "./server.service";

import { AccessTimeModule } from "../accesstime/accesstime.module";
import { DiscordService } from "../discord/discord.service";
import { DatabaseModule } from "../database/database.module";

@Module({
    imports: [AccessTimeModule, DiscordService, DatabaseModule],
    providers: [ServerService],
    exports: [ServerService]
})
export class ServerModule {}
