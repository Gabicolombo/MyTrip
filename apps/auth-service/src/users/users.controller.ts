import {
  Controller,
  Post,
  Body,
  Patch,
  Request,
  Delete,
  UseGuards,
} from '@nestjs/common';

interface RequestWithUser extends Request {
  user: { id: number };
}
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('/register')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  update(
    @Request() req: RequestWithUser,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(+req.user.id, updateUserDto);
  }

  @UseGuards(AuthGuard)
  @Delete('me')
  remove(@Request() req: RequestWithUser) {
    return this.usersService.remove(+req.user.id);
  }
}
