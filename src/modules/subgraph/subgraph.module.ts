import { Module } from "@nestjs/common";
import { SubgraphService } from "./subgraph.service";

@Module({
    imports: [],
    providers: [SubgraphService],
    exports: [SubgraphService]
})
export class SubgraphModule {}
