import { IsEmail, IsJWT, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @IsJWT()
  @MaxLength(2048)
  token!: string;
}

export class ResendVerificationDto {
  @IsEmail()
  email!: string;
}
