import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { AccessTimeService } from "../accesstime/accesstime.service";
import { DiscordService } from "../discord/discord.service";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class ServerService {
    private readonly logger = new Logger(ServerService.name);
    private syncAllBusy: boolean = false;

    constructor(
        private readonly accessTimeService: AccessTimeService,
        private readonly discordService: DiscordService,
        private readonly databaseService: DatabaseService
    ) {}

    @Cron(CronExpression.EVERY_5_MINUTES)
    async syncAll() {
        if (!this.syncAllBusy) {
            this.syncAllBusy = true;
            try {
                const allServers = await this.databaseService.drizzle.query.servers.findMany({
                    where: (servers, { eq }) => eq(servers.isVerified, true)
                });

                this.logger.log(`Starting sync for ${allServers.length} servers`);
                for (const server of allServers) {
                    try {
                        if (server.subscriberRoleId) {
                            const syncResult = await this.sync(
                                server.discordServerId,
                                server.subscriberRoleId
                            );

                            this.logger.log(
                                `Synced server ${server.discordServerId}: Added ${syncResult.added} roles, removed ${syncResult.removed} roles`
                            );
                        }
                    } catch (error) {
                        this.logger.error(`Error syncing server ${server.discordServerId}:`, error);
                    }
                }
            } catch (error) {
                this.logger.error("Error in syncAllServers:", error);
            }
            this.syncAllBusy = false;
        }
    }

    async manualSync(serverId: string) {
        try {
            const server = await this.databaseService.drizzle.query.servers.findFirst({
                where: (servers, { eq }) => eq(servers.discordServerId, serverId)
            });

            if (!server || !server.isVerified || !server.subscriberRoleId) {
                throw new Error("Server not configured or not verified");
            }

            return await this.sync(serverId, server.subscriberRoleId);
        } catch (error) {
            this.logger.error(`Error in manual sync for server ${serverId}:`, error);
            throw error;
        }
    }

    private async sync(serverId: string, subscriberRoleId: string) {
        try {
            // Sync subscriptions with AccessTime
            const syncResult = await this.accessTimeService.syncSubscriptions(serverId);

            // Apply role changes
            for (const discordId of syncResult.added) {
                await this.discordService.assignRole(serverId, discordId, subscriberRoleId);
            }

            for (const discordId of syncResult.removed) {
                await this.discordService.removeRole(serverId, discordId, subscriberRoleId);
            }

            return {
                added: syncResult.added.length,
                removed: syncResult.removed.length
            };
        } catch (error) {
            this.logger.error(`Error in sync for server ${serverId}:`, error);
            throw error;
        }
    }
}
