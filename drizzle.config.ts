import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/db/schema",
    out: "./src/db/migrations",
    migrations: {
        table: "__migrations"
    }
});
