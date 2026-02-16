import { ObjectType, Field, Int } from '@nestjs/graphql';
@ObjectType()
export class TripDestinationType {
  @Field(() => Int)
  tripId!: number;

  @Field()
  city!: string;

  @Field()
  country!: string;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;
}
