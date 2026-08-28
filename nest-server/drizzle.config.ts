import 'dotenv/config'; // CLI 실행 시 .env 파일 자동 로드!
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/postgresql/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.NEON_POSTGRESQL_URL!,
  },
});
