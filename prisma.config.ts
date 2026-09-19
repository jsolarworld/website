import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// CLI (migrate, db push, studio) uses the direct connection; the app uses DATABASE_URL_POOLED (see lib/db.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
