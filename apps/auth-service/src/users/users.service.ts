import { Injectable, BadRequestException } from '@nestjs/common';
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
    return this.usersRepository.save(user);
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
    return userExists;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.usersRepository.findOne({ where: { id } });
      if (!user) {
        throw new BadRequestException('User not found');
      }
      return this.usersRepository.update(id, updateUserDto);
    } catch {
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
}
