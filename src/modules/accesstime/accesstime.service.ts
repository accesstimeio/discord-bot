import { AccessTime } from "@accesstimeio/accesstime-sdk";
import { Injectable, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { Address, Hash, isAddress, verifyMessage, zeroAddress } from "viem";

import { servers, subscriptions } from "src/db/schema";

import { DatabaseService } from "../database/database.service";
import { FactoryService } from "../factory/factory.service";
import { DiscordService } from "../discord/discord.service";
import { SubgraphService } from "../subgraph/subgraph.service";

@Injectable()
export class AccessTimeService {
    private readonly logger = new Logger(AccessTimeService.name);

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly factoryService: FactoryService,
        private readonly discordService: DiscordService,
        private readonly subgraphService: SubgraphService
    ) {}

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
            const accessTime = await this.factoryService.client[Number(chainId)].read.contracts([
                BigInt(projectId)
            ]);

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

    async syncSubscriptions(serverId: string, subscriberRoleId: string) {
        let added: number = 0;
        let removed: number = 0;

        try {
            // Get server info
            const serverData = await this.databaseService.drizzle.query.servers.findFirst({
                where: eq(servers.discordServerId, serverId)
            });

            if (!serverData || !serverData.accessTimeProjectId || !serverData.isVerified) {
                throw new Error("Server not configured or not verified");
            }

            // Check is syncable or not
            const isSyncable = await this.checkIsSyncable(serverId);
            if (isSyncable.guildScope != true || isSyncable.correctRoleHierarchy != true) {
                await this.databaseService.drizzle
                    .update(servers)
                    .set({
                        isSyncable: false,
                        updatedAt: new Date()
                    })
                    .where(eq(servers.discordServerId, serverId));
            } else {
                const chainId = Number(serverData.accessTimeChainId);
                const accessTime = await this.factoryService.client[chainId].read.contracts([
                    BigInt(serverData.accessTimeProjectId)
                ]);

                // Get all users with linked wallets for this server
                const usersWithWallets = await this.databaseService.drizzle.query.users.findMany({
                    where: (users, { not }) => not(eq(users.walletAddress, zeroAddress))
                });
                const contractSubscriptions = await this.fetchAllSubscriptions(accessTime, chainId);

                const nowTime = Math.floor(Date.now() / 1000);

                for (const user of usersWithWallets) {
                    if (!isAddress(user.walletAddress)) {
                        continue;
                    }

                    // Check if user has active subscription
                    const subscription = contractSubscriptions.find(
                        (_subscription) =>
                            _subscription.address.toLowerCase() == user.walletAddress.toLowerCase()
                    );
                    const subscriptionEndTime = subscription ? Number(subscription.endTime) : 0;

                    // Existing subscription record
                    const existingSubscription =
                        await this.databaseService.drizzle.query.subscriptions.findFirst({
                            where: (subscriptions, { and, eq }) =>
                                and(
                                    eq(subscriptions.userId, user.id),
                                    eq(subscriptions.serverId, serverData.id)
                                )
                        });

                    if (subscriptionEndTime > nowTime) {
                        // User should have the role
                        if (
                            !existingSubscription ||
                            existingSubscription.subscriptionStatus !== "active"
                        ) {
                            const operationStatus = await this.discordService.assignRole(
                                serverId,
                                user.discordId,
                                subscriberRoleId
                            );

                            if (!operationStatus) {
                                continue;
                            }

                            // Update or create subscription record
                            await this.databaseService.drizzle
                                .insert(subscriptions)
                                .values({
                                    userId: user.id,
                                    serverId: serverData.id,
                                    subscriptionStatus: "active",
                                    expiresAt: new Date(subscriptionEndTime),
                                    updatedAt: new Date()
                                })
                                .onConflictDoUpdate({
                                    target: [subscriptions.userId, subscriptions.serverId],
                                    set: {
                                        subscriptionStatus: "active",
                                        expiresAt: new Date(subscriptionEndTime),
                                        updatedAt: new Date()
                                    }
                                });

                            added++;
                        }
                    } else if (
                        existingSubscription &&
                        existingSubscription.subscriptionStatus === "active"
                    ) {
                        const operationStatus = await this.discordService.removeRole(
                            serverId,
                            user.discordId,
                            subscriberRoleId
                        );

                        if (!operationStatus) {
                            continue;
                        }

                        // Update subscription to expired
                        await this.databaseService.drizzle
                            .update(subscriptions)
                            .set({
                                subscriptionStatus: "expired",
                                updatedAt: new Date()
                            })
                            .where(eq(subscriptions.id, existingSubscription.id));

                        removed++;
                    }
                }

                // Update last sync time
                await this.databaseService.drizzle
                    .update(servers)
                    .set({
                        isSyncable: true,
                        lastSyncAt: new Date(),
                        updatedAt: new Date()
                    })
                    .where(eq(servers.id, serverData.id));
            }

            return {
                added,
                removed
            };
        } catch (error) {
            this.logger.error(`Error syncing subscriptions for server ${serverId}:`, error);
            throw error;
        }
    }

    async checkIsSyncable(serverId: string) {
        let roleInfo: string = "Not configured";
        let guildScope: boolean = false;
        let correctRoleHierarchy: boolean = false;

        const serverData = await this.databaseService.drizzle.query.servers.findFirst({
            where: eq(servers.discordServerId, serverId)
        });

        try {
            if (serverData) {
                const guild = await this.discordService.getGuild(serverId);
                if (guild) {
                    guildScope = true;

                    if (serverData.subscriberRoleId) {
                        const role = await guild.roles.fetch(serverData.subscriberRoleId);
                        roleInfo = role ? `@${role.name}` : "Role not found";

                        if (role) {
                            const botMember = await guild.members.fetchMe();
                            const targetRole = await guild.roles.fetch(serverData.subscriberRoleId);
                            if (botMember.roles.highest.position > targetRole.position) {
                                correctRoleHierarchy = true;
                            }
                        }
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Error in checkIsSyncable server ${serverId}:`, error);
        }

        return { guildScope, correctRoleHierarchy, roleInfo };
    }

    async fetchAllSubscriptions(
        accessTimeAddress: Address,
        chainId: number
    ): Promise<{ address: Address; endTime: string }[]> {
        let subscriptions: { address: Address; endTime: string }[] = [];
        let nextPageCursor: string | null = null;

        while (nextPageCursor != "") {
            const result = await this.subgraphService.fetchSubscription(
                accessTimeAddress,
                chainId,
                nextPageCursor
            );

            subscriptions = subscriptions.concat(result.items);

            nextPageCursor = result.pageInfo.hasNextPage ? result.pageInfo.endCursor : "";
        }

        return subscriptions;
    }
}
