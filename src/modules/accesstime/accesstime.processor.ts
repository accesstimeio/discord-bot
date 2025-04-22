import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { AccessTimeService } from "./accesstime.service";

type SyncDataType = { discordServerId: string; subscriberRoleId: string };

export type SyncQueue = Queue<SyncDataType, void, "sync">;

type SyncJob = Job<SyncDataType, void, "sync">;

@Processor("accessTime")
export class AccessTimeProcessor extends WorkerHost {
    private readonly logger = new Logger(AccessTimeProcessor.name);

    constructor(private readonly accessTimeService: AccessTimeService) {
        super();
    }

    async process(job: SyncJob) {
        if (job.name == "sync") {
            const syncResult = await this.accessTimeService.syncSubscriptions(
                job.data.discordServerId,
                job.data.subscriberRoleId
            );

            this.logger.log(
                `Synced server ${job.data.discordServerId}: Added ${syncResult.added} roles, removed ${syncResult.removed} roles`
            );
        }
    }
}
