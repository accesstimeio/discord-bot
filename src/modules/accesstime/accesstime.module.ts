import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";

import { AccessTimeService } from "./accesstime.service";
import { FactoryModule } from "../factory/factory.module";
import { DiscordModule } from "../discord/discord.module";

@Module({
    imports: [DatabaseModule, FactoryModule, DiscordModule],
    providers: [AccessTimeService],
    exports: [AccessTimeService]
})
export class AccessTimeModule {}
