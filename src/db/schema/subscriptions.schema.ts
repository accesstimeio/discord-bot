import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const subscriptions = pgTable("subscriptions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(), // Reference to users table
    serverId: integer("server_id").notNull(), // Reference to servers table
    subscriptionStatus: text("subscription_status").notNull(), // active, expired, etc.
    expiresAt: timestamp("expires_at").notNull(),
    updatedAt: timestamp("updated_at").notNull()
});
