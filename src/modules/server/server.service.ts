import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { AccessTimeService } from "../accesstime/accesstime.service";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class ServerService {
    private readonly logger = new Logger(ServerService.name);
    private syncAllBusy: boolean = false;

    constructor(
        private readonly accessTimeService: AccessTimeService,
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
                            const syncResult = await this.accessTimeService.syncSubscriptions(
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

            return await this.accessTimeService.syncSubscriptions(
                serverId,
                server.subscriberRoleId
            );
        } catch (error) {
            this.logger.error(`Error in manual sync for server ${serverId}:`, error);
            throw error;
        }
    }
}
