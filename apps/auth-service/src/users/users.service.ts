import {
  Injectable,
  BadRequestException,
  NotFoundException,
  // ForbiddenException,
} from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HashService } from '../../../../libs/crypto/src/hash.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly hashService: HashService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { email } = createUserDto;
    const userExists = await this.usersRepository.findOne({ where: { email } });
    if (userExists) {
      throw new BadRequestException('User already exists');
    }
    const hashedPassword = await this.hashService.encrypt(
      createUserDto.password,
    );
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    const saved = await this.usersRepository.save(user);
    await this.emailVerification.send(saved);
    return {
      message: 'Account created. Check your email to verify your account.',
    };
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    const userExists = await this.usersRepository.findOne({ where: { email } });
    if (!userExists) {
      throw new BadRequestException('Invalid credentials');
    }
    const isMatch = await this.hashService.decrypt(
      password,
      userExists.password,
    );
    if (!isMatch) {
      throw new BadRequestException('Invalid credentials');
    }
    // if (!userExists.emailVerified) {
    //   throw new ForbiddenException('Verify your email before logging in');
    // }
    return userExists;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.usersRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (!user.emailVerified) {
        throw new BadRequestException('Profile changes require verification');
      }
      if (updateUserDto.password) {
        const hashedPassword = await this.hashService.encrypt(
          updateUserDto.password,
        );
        updateUserDto.password = hashedPassword;
      }

      const emailChanged =
        updateUserDto.email !== undefined && updateUserDto.email !== user.email;

      if (emailChanged) {
        updateUserDto.emailVerified = false;
      }

      return this.usersRepository.update(id, updateUserDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error updating user');
    }
  }

  async remove(id: number) {
    try {
      const user = await this.usersRepository.findOne({ where: { id } });
      if (!user) {
        throw new BadRequestException('User not found');
      }
      return this.usersRepository.delete(id);
    } catch {
      throw new BadRequestException('Error removing user');
    }
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      return null;
    }
    const { password, ...userWithoutPassword } = user;
    void password;
    return userWithoutPassword;
  }
}
