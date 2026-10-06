import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HashService } from '../../../../libs/crypto/src/hash.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { EmailVerificationService } from './email-verification.service';

describe('UsersService', () => {
  let service: UsersService;
  const emailVerification = { send: jest.fn() };
  const usersRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const hashService = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  };
  const user = {
    id: 7,
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashed-password',
    nationality: 'Brazil',
    emailVerified: true,
  };
  const createUserDto: CreateUserDto = {
    name: user.name,
    email: user.email,
    password: 'test1234',
    nationality: user.nationality,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: EmailVerificationService, useValue: emailVerification },
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: HashService, useValue: hashService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('hashes the password and saves a new user', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      hashService.encrypt.mockResolvedValue(user.password);
      usersRepository.create.mockReturnValue(user);
      usersRepository.save.mockResolvedValue(user);

      await expect(service.create(createUserDto)).resolves.toEqual({
        message: 'Account created. Check your email to verify your account.',
      });
      expect(emailVerification.send).toHaveBeenCalledWith(user);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(hashService.encrypt).toHaveBeenCalledWith(createUserDto.password);
      expect(usersRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: user.password,
      });
      expect(usersRepository.save).toHaveBeenCalledWith(user);
    });

    it('rejects an email that already exists without hashing or saving', async () => {
      usersRepository.findOne.mockResolvedValue(user);

      await expect(service.create(createUserDto)).rejects.toThrow(
        new BadRequestException('User already exists'),
      );
      expect(hashService.encrypt).not.toHaveBeenCalled();
      expect(usersRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginUserDto = {
      email: user.email,
      password: 'test1234',
    };

    it('returns the user when the password matches', async () => {
      usersRepository.findOne.mockResolvedValue(user);
      hashService.decrypt.mockResolvedValue(true);

      await expect(service.login(loginDto)).resolves.toEqual(user);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(hashService.decrypt).toHaveBeenCalledWith(
        loginDto.password,
        user.password,
      );
    });

    it('rejects an unknown email', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new BadRequestException('Invalid credentials'),
      );
      expect(hashService.decrypt).not.toHaveBeenCalled();
    });

    // it('blocks unverified users even with the correct password', async () => {
    //   usersRepository.findOne.mockResolvedValue({
    //     ...user,
    //     emailVerified: false,
    //   });
    //   hashService.decrypt.mockResolvedValue(true);
    //   await expect(service.login(loginDto)).rejects.toThrow(
    //     'Verify your email',
    //   );
    // });

    it('rejects an incorrect password', async () => {
      usersRepository.findOne.mockResolvedValue(user);
      hashService.decrypt.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        new BadRequestException('Invalid credentials'),
      );
    });
  });

  describe('update', () => {
    it('prevents changing an email without verification', async () => {
      await expect(
        service.update(user.id, { email: 'new@example.com' }),
      ).rejects.toThrow('Email changes require');
      expect(usersRepository.update).not.toHaveBeenCalled();
    });
    it('hashes a new password before updating the user', async () => {
      const updateDto: UpdateUserDto = { password: 'newpass123' };
      usersRepository.findOne.mockResolvedValue(user);
      hashService.encrypt.mockResolvedValue('new-hash');
      usersRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.update(user.id, updateDto)).resolves.toEqual({
        affected: 1,
      });
      expect(hashService.encrypt).toHaveBeenCalledWith('newpass123');
      expect(usersRepository.update).toHaveBeenCalledWith(user.id, {
        password: 'new-hash',
      });
    });

    it('updates profile fields without hashing when no password is provided', async () => {
      const updateDto: UpdateUserDto = { name: 'Updated Name' };
      usersRepository.findOne.mockResolvedValue(user);
      usersRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.update(user.id, updateDto)).resolves.toEqual({
        affected: 1,
      });
      expect(hashService.encrypt).not.toHaveBeenCalled();
      expect(usersRepository.update).toHaveBeenCalledWith(user.id, updateDto);
    });

    it('reports an update error when the user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.update(user.id, {})).rejects.toThrow(
        new BadRequestException('Error updating user'),
      );
      expect(usersRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing user', async () => {
      usersRepository.findOne.mockResolvedValue(user);
      usersRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(service.remove(user.id)).resolves.toEqual({ affected: 1 });
      expect(usersRepository.delete).toHaveBeenCalledWith(user.id);
    });

    it('reports a removal error when the user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(user.id)).rejects.toThrow(
        new BadRequestException('Error removing user'),
      );
      expect(usersRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns user details without the password', async () => {
      usersRepository.findOne.mockResolvedValue(user);

      await expect(service.findOne(user.id)).resolves.toEqual({
        id: user.id,
        name: user.name,
        email: user.email,
        nationality: user.nationality,
        emailVerified: true,
      });
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: user.id },
      });
    });

    it('returns null when the user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(user.id)).resolves.toBeNull();
    });
  });
});
