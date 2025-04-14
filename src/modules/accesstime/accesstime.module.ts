import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";

import { AccessTimeService } from "./accesstime.service";

@Module({
    imports: [DatabaseModule],
    providers: [AccessTimeService],
    exports: [AccessTimeService]
})
export class AccessTimeModule {}
