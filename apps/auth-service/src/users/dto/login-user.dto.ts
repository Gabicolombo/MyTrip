import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class LoginUserDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
