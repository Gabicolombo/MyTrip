import { Module } from '@nestjs/common';
import { PostgresModule } from './postgres/postgres.module';

@Module({
  imports: [PostgresModule],
  exports: [PostgresModule],
})
export class DatabaseModule {}
