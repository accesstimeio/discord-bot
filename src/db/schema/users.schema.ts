import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    serverId: integer("server_id").notNull(), // Reference to servers table
    discordId: text("discord_id").notNull().unique(),
    walletAddress: text("wallet_address").notNull(),
    nonce: text("nonce").notNull(), // Used for signature verification
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull()
});
