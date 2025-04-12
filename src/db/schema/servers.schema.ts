import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const servers = pgTable("servers", {
    id: serial("id").primaryKey(),
    discordServerId: text("discord_server_id").notNull().unique(),
    accessTimeProjectId: text("accesstime_project_id"),
    accessTimeChainId: text("accesstime_chain_id"),
    verificationSignature: text("verification_signature"),
    isVerified: boolean("is_verified").default(false),
    subscriberRoleId: text("subscriber_role_id"),
    lastSyncAt: timestamp("last_sync_at"),
    nonce: text("nonce"), // Used for signature verification
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
});
