import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Trips } from './trips.entity';

@Entity('trip_destinations')
export class TripDestination {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Trips, (trip) => trip.destinations)
  @JoinColumn({ name: 'tripId' })
  trip: Trips;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 100 })
  country: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column()
  orderIndex: number;
}
