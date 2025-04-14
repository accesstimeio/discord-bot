import { Module } from "@nestjs/common";

import { FactoryService } from "./factory.service";

@Module({
    imports: [],
    providers: [FactoryService],
    exports: [FactoryService]
})
export class FactoryModule {}
