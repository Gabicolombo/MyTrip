import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Role } from '../../enums/role.enum';
import { UserType } from './user.type';
@ObjectType()
export class TripParticipantType {
  @Field(() => Int)
  tripId!: number;

  @Field(() => UserType)
  user!: UserType;

  @Field(() => Role)
  role!: Role;

  @Field(() => Date)
  joinedAt!: Date;
}
