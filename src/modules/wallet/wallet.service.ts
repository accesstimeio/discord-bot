import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class WalletService {
    private readonly logger = new Logger(WalletService.name);

    constructor() {}

    generateNonce() {}

    generateSignatureMessage() {}

    verifySignature() {}

    initiateWalletLinking() {}

    completeWalletLinking() {}

    unlinkWallet() {}
}
