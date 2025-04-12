import { Module } from "@nestjs/common";

import { ServerService } from "./server.service";

import { AccessTimeModule } from "../accesstime/accesstime.module";
import { DiscordService } from "../discord/discord.service";

@Module({
    imports: [AccessTimeModule, DiscordService],
    providers: [ServerService],
    exports: [ServerService]
})
export class ServerModule {}
