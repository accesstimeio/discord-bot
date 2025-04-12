import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class WalletService {
    private readonly logger = new Logger(WalletService.name);

    constructor() {}

    generateNonce() {}

    generateSignatureMessage() {}

    verifySignature() {}

    initiateWalletLinking(serverId: string, userId: string, walletAddress: string) {}

    completeWalletLinking(serverId: string, userId: string, walletAddress: string, signature: string): boolean {}

    unlinkWallet(serverId: string, userId: string): boolean {}

    getWalletByDiscordId(serverId: string, userId: string): string {}
}
