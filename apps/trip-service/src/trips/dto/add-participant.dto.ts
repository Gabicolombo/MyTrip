import { IsString, IsNotEmpty } from 'class-validator';

export class AddParticipantDto {
  @IsNotEmpty()
  tripId: number;

  @IsNotEmpty()
  userId: number;

  @IsNotEmpty()
  @IsString()
  role: 'OWNER' | 'EDITOR' | 'VIEWER';

  @IsNotEmpty()
  joinedAt: Date;
}
