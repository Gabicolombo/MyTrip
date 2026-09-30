import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new UsersController(usersService as unknown as UsersService);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards registration data to the service', async () => {
    const user: CreateUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'test1234',
      nationality: 'Brazil',
    };
    usersService.create.mockResolvedValue({ id: 7, ...user });

    await expect(controller.create(user)).resolves.toMatchObject({ id: 7 });
    expect(usersService.create).toHaveBeenCalledWith(user);
  });

  it('loads the profile for the authenticated user', async () => {
    const profile = { id: 7, name: 'Test User' };
    usersService.findOne.mockResolvedValue(profile);

    await expect(
      controller.getProfile({ user: { id: 7 } } as never),
    ).resolves.toEqual(profile);
    expect(usersService.findOne).toHaveBeenCalledWith(7);
  });

  it('updates only the authenticated user', async () => {
    const update: UpdateUserDto = { name: 'Updated User' };
    usersService.update.mockResolvedValue({ affected: 1 });

    await expect(
      controller.update({ user: { id: 7 } } as never, update),
    ).resolves.toEqual({ affected: 1 });
    expect(usersService.update).toHaveBeenCalledWith(7, update);
  });

  it('removes only the authenticated user', async () => {
    usersService.remove.mockResolvedValue({ affected: 1 });

    await expect(
      controller.remove({ user: { id: 7 } } as never),
    ).resolves.toEqual({ affected: 1 });
    expect(usersService.remove).toHaveBeenCalledWith(7);
  });
});
