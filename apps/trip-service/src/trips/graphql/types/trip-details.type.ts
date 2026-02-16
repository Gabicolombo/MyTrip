import { ObjectType, Field, Int } from '@nestjs/graphql';
import { TripDestinationType } from './trip-destination.type';
import { TripParticipantType } from './trip-participant.type';

@ObjectType()
export class TripDetailsType {
  @Field(() => Int)
  id!: number;

  @Field()
  title!: string;

  @Field()
  description!: string;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;

  @Field(() => [TripDestinationType])
  destinations!: TripDestinationType[];

  @Field(() => [TripParticipantType])
  participants!: TripParticipantType[];

  @Field({ nullable: true })
  imageUrl?: string;
}
