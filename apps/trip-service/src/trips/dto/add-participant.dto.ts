import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { Role } from '../enums/role.enum';

export class AddParticipantDto {
  @IsNotEmpty()
  tripId!: number;

  @IsNotEmpty()
  userId!: number;

  @IsNotEmpty()
  @IsString()
  @IsEnum(Role)
  role!: Role;

  @IsNotEmpty()
  joinedAt!: Date;
}
