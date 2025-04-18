import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { FactoryModule } from "../factory/factory.module";
import { DiscordModule } from "../discord/discord.module";
import { SubgraphModule } from "../subgraph/subgraph.module";

import { AccessTimeService } from "./accesstime.service";

@Module({
    imports: [DatabaseModule, FactoryModule, DiscordModule, SubgraphModule],
    providers: [AccessTimeService],
    exports: [AccessTimeService]
})
export class AccessTimeModule {}
