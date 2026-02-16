import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Trips } from './trips.entity';
import { User } from 'apps/auth-service/src/users/entities/user.entity';

@Entity('trip_participants')
export class TripParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Trips, (trips) => trips.participants)
  trip!: Trips;

  @Column()
  tripId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: number;

  @Column({
    type: 'enum',
    enum: ['OWNER', 'EDITOR', 'VIEWER'],
    default: 'VIEWER',
  })
  role!: 'OWNER' | 'EDITOR' | 'VIEWER';

  @CreateDateColumn()
  joinedAt!: Date;
}
