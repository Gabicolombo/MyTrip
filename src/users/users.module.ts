import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { CryptoModule } from 'src/common/crypto/crypto.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), CryptoModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
