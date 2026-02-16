import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class UserType {
  @Field()
  name!: string;

  @Field()
  nationality!: string;
}
