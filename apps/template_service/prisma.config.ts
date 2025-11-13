import { defineConfig, env } from 'prisma/config';
import * as dotenv from 'dotenv';

dotenv.config();

export const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:1234@localhost:5432/template_service';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  engine: 'classic',

  datasource: {
    url: env('DATABASE_URL'),
  },
});
