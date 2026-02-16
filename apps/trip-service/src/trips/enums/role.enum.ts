import { registerEnumType } from '@nestjs/graphql';

export enum Role {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

registerEnumType(Role, {
  name: 'Role',
  description: 'The role of a participant in a trip',
});
