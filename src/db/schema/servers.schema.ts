import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const servers = pgTable("servers", {
    id: serial("id").primaryKey(),
    discordServerId: text("discord_server_id").notNull().unique(),
    accessTimeProjectId: text("accesstime_project_id").notNull(),
    accessTimeChainId: text("accesstime_chain_id").notNull(),
    verificationSignature: text("verification_signature").notNull(),
    isVerified: boolean("is_verified").notNull(),
    isSyncable: boolean("is_syncable").notNull(),
    subscriberRoleId: text("subscriber_role_id").notNull(),
    lastSyncAt: timestamp("last_sync_at").notNull(),
    nonce: text("nonce").notNull(), // Used for signature verification
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull()
});
