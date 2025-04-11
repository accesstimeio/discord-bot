import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class AccessTimeService {
    private readonly logger = new Logger(AccessTimeService.name);

    constructor() {}

    fetchSubscriptions() {}

    verifyProjectOwnership() {}

    syncSubscriptions() {}
}
