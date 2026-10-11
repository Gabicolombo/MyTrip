import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { InviteStatus } from '../enums/invite-status.enum';
import type { RoleInvitation } from '../repositories/tripsInvites.repository';

@Entity('trips_invites')
@Unique('UQ_trips_invites_trip_email', ['tripId', 'email'])
export class TripsInvites {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  tripId!: number;

  @Column({ length: 100 })
  email!: string;

  @Column({ type: 'varchar', length: 6 })
  role!: RoleInvitation;

  @Column({ length: 64, unique: true, select: false })
  tokenHash!: string;

  @Column({ type: 'varchar', default: InviteStatus.PENDING })
  status!: InviteStatus;

  @Column({ type: 'timestamptz' })
  expiredAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
