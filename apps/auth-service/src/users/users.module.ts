import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { CryptoModule } from '../../../../libs/crypto/src/crypto.module';
import { ConfigModule } from '@nestjs/config';
import { EmailVerificationService } from './email-verification.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), CryptoModule, ConfigModule],
  controllers: [UsersController],
  providers: [UsersService, EmailVerificationService],
  exports: [UsersService, EmailVerificationService],
})
export class UsersModule {}
