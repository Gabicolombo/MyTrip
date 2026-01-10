import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Trips } from './trips.entity';

@Entity('trip_participants')
export class TripParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Trips, (trips) => trips.participants)
  trip: Trips;

  @Column()
  tripId: number;

  @Column()
  userId: number;

  @Column({
    type: 'enum',
    enum: ['OWNER', 'EDITOR', 'VIEWER'],
    default: 'VIEWER',
  })
  role: 'OWNER' | 'EDITOR' | 'VIEWER';

  @CreateDateColumn()
  joinedAt: Date;
}
