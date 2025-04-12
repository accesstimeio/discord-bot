import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class AccessTimeService {
    private readonly logger = new Logger(AccessTimeService.name);

    constructor() {}

    fetchSubscriptions() {}

    async verifyProjectOwnership(projectId: string, signature: string): boolean {}

    async syncSubscriptions(serverId: string) {
        return {
            added: [],
            removed: []
        };
    }
}
