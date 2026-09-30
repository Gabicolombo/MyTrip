import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { LoginUserDto } from '../users/dto/login-user.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const usersService = { login: jest.fn() };
  const jwtService = { signAsync: jest.fn() };
  const loginDto: LoginUserDto = {
    email: 'test@example.com',
    password: 'test1234',
  };
  const user = {
    id: 7,
    name: 'Test User',
    email: loginDto.email,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('returns a signed token containing the user identity', async () => {
    usersService.login.mockResolvedValue(user);
    jwtService.signAsync.mockResolvedValue('signed-token');

    await expect(service.login(loginDto)).resolves.toEqual({
      access_token: 'signed-token',
      name: user.name,
    });
    expect(usersService.login).toHaveBeenCalledWith(loginDto);
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      username: user.name,
      id: user.id,
      email: user.email,
    });
  });

  it('rejects when the user service returns no user', async () => {
    usersService.login.mockResolvedValue(null);

    await expect(service.login(loginDto)).rejects.toThrow(
      new BadRequestException('Invalid credentials'),
    );
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('propagates invalid-credential errors from the user service', async () => {
    usersService.login.mockRejectedValue(
      new BadRequestException('Invalid credentials'),
    );

    await expect(service.login(loginDto)).rejects.toThrow(
      new BadRequestException('Invalid credentials'),
    );
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
