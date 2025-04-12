import { Inject, Injectable, Logger } from "@nestjs/common";
import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Address, Hash, verifyMessage } from "viem";

import * as schema from "src/db/schema";
import { servers, users } from "src/db/schema";

@Injectable()
export class WalletService {
    private readonly logger = new Logger(WalletService.name);

    constructor(@Inject("DB_PROD") private database: NodePgDatabase<typeof schema>) {}

    generateNonce(): string {
        return randomBytes(16).toString("hex");
    }

    generateSignatureMessage(nonce: string) {
        return `Verify your wallet for AccessTime Discord Bot\nNonce: ${nonce}`;
    }

    async verifySignature(message: string, signature: Hash, walletAddress: Address) {
        return await verifyMessage({
            address: walletAddress,
            message,
            signature
        });
    }

    async initiateWalletLinking(serverId: string, discordId: string) {
        try {
            // Generate nonce
            const nonce = this.generateNonce();

            const existingServer = await this.database.query.servers.findFirst({
                where: eq(servers.discordServerId, serverId)
            });

            // Check if user exists
            const existingUser = await this.database.query.users.findFirst({
                where: eq(users.discordId, discordId)
            });

            if (existingUser) {
                // Update existing user
                await this.database
                    .update(users)
                    .set({
                        nonce,
                        updatedAt: new Date()
                    })
                    .where(
                        and(eq(users.discordId, discordId), eq(users.serverId, existingServer.id))
                    );
            } else {
                // Create new user
                await this.database.insert(users).values({
                    discordId,
                    serverId: existingServer.id,
                    nonce
                });
            }

            // Return the message to sign
            return this.generateSignatureMessage(nonce);
        } catch (error) {
            this.logger.error(`Error initiating wallet linking for user ${discordId}:`, error);
            throw error;
        }
    }

    async completeWalletLinking(
        serverId: string,
        discordId: string,
        walletAddress: Address,
        signature: Hash
    ) {
        try {
            const existingServer = await this.database.query.servers.findFirst({
                where: eq(servers.discordServerId, serverId)
            });

            // Get user and nonce
            const user = await this.database.query.users.findFirst({
                where: and(eq(users.discordId, discordId), eq(users.serverId, existingServer.id))
            });

            if (!user || !user.nonce) {
                throw new Error("No pending wallet link request found");
            }

            // Verify signature
            const message = this.generateSignatureMessage(user.nonce);
            const isValid = this.verifySignature(message, signature, walletAddress);

            if (!isValid) {
                throw new Error("Invalid signature");
            }

            // Update user with wallet address
            await this.database
                .update(users)
                .set({
                    walletAddress,
                    nonce: null, // Clear nonce after successful verification
                    updatedAt: new Date()
                })
                .where(eq(users.id, user.id));

            return true;
        } catch (error) {
            this.logger.error(`Error completing wallet linking for user ${discordId}:`, error);
            throw error;
        }
    }

    async unlinkWallet(serverId: string, discordId: string) {
        try {
            const existingServer = await this.database.query.servers.findFirst({
                where: eq(servers.discordServerId, serverId)
            });

            const result = await this.database
                .update(users)
                .set({
                    walletAddress: null,
                    updatedAt: new Date()
                })
                .where(and(eq(users.discordId, discordId), eq(users.serverId, existingServer.id)));

            return result.rowCount > 0;
        } catch (error) {
            this.logger.error(`Error unlinking wallet for user ${discordId}:`, error);
            throw error;
        }
    }

    async getWalletByDiscordId(serverId: string, discordId: string) {
        try {
            const existingServer = await this.database.query.servers.findFirst({
                where: eq(servers.discordServerId, serverId)
            });

            const user = await this.database.query.users.findFirst({
                where: and(eq(users.discordId, discordId), eq(users.serverId, existingServer.id))
            });

            return user?.walletAddress || null;
        } catch (error) {
            this.logger.error(`Error getting wallet for user ${discordId}:`, error);
            throw error;
        }
    }
}
