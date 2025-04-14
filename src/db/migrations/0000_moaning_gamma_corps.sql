CREATE TABLE "servers" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_server_id" text NOT NULL,
	"accesstime_project_id" text NOT NULL,
	"accesstime_chain_id" text NOT NULL,
	"verification_signature" text NOT NULL,
	"is_verified" boolean NOT NULL,
	"subscriber_role_id" text NOT NULL,
	"last_sync_at" timestamp NOT NULL,
	"nonce" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "servers_discord_server_id_unique" UNIQUE("discord_server_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"server_id" integer NOT NULL,
	"subscription_status" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"discord_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"nonce" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "users_discord_id_unique" UNIQUE("discord_id")
);
