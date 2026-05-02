import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import * as path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,

  entities: ['apps/trip-service/src/**/*.entity.ts'],
  migrations: ['apps/trip-service/src/migrations/*.ts'],

  synchronize: false,
});

/**
 * For migration: npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate apps/trip-service/src/migrations/add-cascade-trip-relations -d apps/trip-service/src/data-source.ts
 */
