import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
// import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from '../../../libs/database/src/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    // AuthModule,
    UsersModule,
  ],
})
export class AppModule {}
