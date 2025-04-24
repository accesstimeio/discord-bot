import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readFileSync } from "fs";
import Redis from "ioredis";
import { resolve } from "path";
import { Pool } from "pg";

import schema from "src/db/schema";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DatabaseService.name);
    private pool: Pool;
    public drizzle: NodePgDatabase<typeof schema>;
    public redis: Redis;

    constructor() {
        this.pool = new Pool({
            connectionString: process.env.POSTGRES_CONNECTION_URI,
            ssl:
                process.env.POSTGRES_SSL == "true"
                    ? {
                          ca: readFileSync(process.env.POSTGRES_SSL_PATH)
                      }
                    : false
        });

        this.drizzle = drizzle(this.pool, { schema });

        this.redis = new Redis(process.env.REDIS_URL);
    }

    async onModuleInit() {
        try {
            await this.pool.query("SELECT NOW()");
            this.logger.log("Database connection established");

            await migrate(this.drizzle, {
                migrationsFolder: resolve("src/db/migrations"),
                migrationsTable: "__migrations"
            });
        } catch (error) {
            this.logger.error("Failed to connect to database:", error);
            throw error;
        }
    }

    async onModuleDestroy() {
        await this.pool.end();
        this.redis.disconnect();
    }
}
