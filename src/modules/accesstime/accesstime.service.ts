import { AccessTime, Factory } from "@accesstimeio/accesstime-sdk";
import { Injectable, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { Hash, verifyMessage } from "viem";

import { servers, subscriptions } from "src/db/schema";

import { DatabaseService } from "../database/database.service";

@Injectable()
export class AccessTimeService {
    private readonly logger = new Logger(AccessTimeService.name);

    constructor(private readonly databaseService: DatabaseService) {}

    generateOwnershipSignatureMessage(projectId: string, chainId: string, nonce: string) {
        return `Verify your wallet for AccessTime Discord Bot Ownership Verify\nProjectId: ${projectId}\nChainId: ${chainId}\nNonce: ${nonce}`;
    }

    async verifyProjectOwnership(
        projectId: string,
        chainId: string,
        nonce: string,
        signature: Hash
    ): Promise<boolean> {
        try {
            const factory = new Factory({
                id: Number(chainId)
            });
            const accessTime = await factory.read.contracts([BigInt(projectId)]);

            const contract = new AccessTime({
                accessTime,
                chain: {
                    id: Number(chainId)
                }
            });
            const owner = await contract.read.owner();

            return await verifyMessage({
                address: owner,
                message: this.generateOwnershipSignatureMessage(projectId, chainId, nonce),
                signature
            });
        } catch (error) {
            this.logger.error("Error in verifyProjectOwnership:", error);
            return false;
        }
    }

    async syncSubscriptions(serverId: string) {
        const result = {
            added: [],
            removed: []
        };

        try {
            // Get server info
            const serverData = await this.databaseService.drizzle.query.servers.findFirst({
                where: eq(servers.discordServerId, serverId)
            });

            if (!serverData || !serverData.accessTimeProjectId || !serverData.isVerified) {
                throw new Error("Server not configured or not verified");
            }

            // Get all users with linked wallets for this server
            const usersWithWallets = await this.databaseService.drizzle.query.users.findMany({
                where: (users, { isNotNull }) => isNotNull(users.walletAddress)
            });

            for (const user of usersWithWallets) {
                // Check if user has active subscription
                const subscriptionData = await this.fetchSubscriptions(
                    serverData.accessTimeProjectId,
                    serverData.accessTimeChainId,
                    user.walletAddress
                );

                const hasActiveSubscription = subscriptionData.some(
                    (sub) => sub.status === "active"
                );

                // Existing subscription record
                const existingSubscription =
                    await this.databaseService.drizzle.query.subscriptions.findFirst({
                        where: (subscriptions, { and, eq }) =>
                            and(
                                eq(subscriptions.userId, user.id),
                                eq(subscriptions.serverId, serverData.id)
                            )
                    });

                if (hasActiveSubscription) {
                    // User should have the role
                    if (
                        !existingSubscription ||
                        existingSubscription.subscriptionStatus !== "active"
                    ) {
                        // Update or create subscription record
                        await this.databaseService.drizzle
                            .insert(subscriptions)
                            .values({
                                userId: user.id,
                                serverId: serverData.id,
                                subscriptionStatus: "active",
                                expiresAt: new Date(subscriptionData[0].expiresAt),
                                updatedAt: new Date()
                            })
                            .onConflictDoUpdate({
                                target: [subscriptions.userId, subscriptions.serverId],
                                set: {
                                    subscriptionStatus: "active",
                                    expiresAt: new Date(subscriptionData[0].expiresAt),
                                    updatedAt: new Date()
                                }
                            });

                        result.added.push(user.discordId);
                    }
                } else if (
                    existingSubscription &&
                    existingSubscription.subscriptionStatus === "active"
                ) {
                    // Update subscription to expired
                    await this.databaseService.drizzle
                        .update(subscriptions)
                        .set({
                            subscriptionStatus: "expired",
                            updatedAt: new Date()
                        })
                        .where(eq(subscriptions.id, existingSubscription.id));

                    result.removed.push(user.discordId);
                }
            }

            // Update last sync time
            await this.databaseService.drizzle
                .update(servers)
                .set({
                    lastSyncAt: new Date(),
                    updatedAt: new Date()
                })
                .where(eq(servers.id, serverData.id));

            return result;
        } catch (error) {
            this.logger.error(`Error syncing subscriptions for server ${serverId}:`, error);
            throw error;
        }
    }
}
