import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Activity } from '../enums/activity.enum';
import { TripDestination } from './trips-destinations.entity';

@Entity('itineraries')
export class ItineraryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @ManyToOne(() => TripDestination, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tripDestinationId' })
  tripDestination!: TripDestination;

  @Column({ type: 'date' })
  day!: Date;

  @Column({ type: 'time' })
  time!: string;

  @Column({ type: 'varchar', length: 50 })
  activity!: Activity;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes?: string;

  @Column({ type: 'varchar', nullable: true })
  link?: string;

  @Column({ type: 'float' })
  latitude!: number;

  @Column({ type: 'float' })
  longitude!: number;
}
