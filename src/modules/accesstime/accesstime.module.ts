import { Module } from "@nestjs/common";
import { AccessTimeService } from "./accesstime.service";

@Module({
    providers: [AccessTimeService],
    exports: [AccessTimeService]
})
export class AccessTimeModule {}
