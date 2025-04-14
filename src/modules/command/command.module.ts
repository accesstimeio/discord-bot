import { Module } from "@nestjs/common";

import { CommandService } from "./command.service";

import { DiscordModule } from "../discord/discord.module";
import { AccessTimeModule } from "../accesstime/accesstime.module";
import { WalletModule } from "../wallet/wallet.module";
import { ServerModule } from "../server/server.module";
import { DatabaseModule } from "../database/database.module";

@Module({
    imports: [DiscordModule, AccessTimeModule, WalletModule, ServerModule, DatabaseModule],
    providers: [CommandService],
    exports: [CommandService]
})
export class CommandModule {}
