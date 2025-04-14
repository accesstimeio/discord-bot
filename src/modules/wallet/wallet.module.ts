import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";

import { WalletService } from "./wallet.service";

@Module({
    imports: [DatabaseModule],
    providers: [WalletService],
    exports: [WalletService]
})
export class WalletModule {}
