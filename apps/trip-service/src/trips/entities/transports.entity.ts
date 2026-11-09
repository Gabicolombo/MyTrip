import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Trips } from './trips.entity';
import { TripDestination } from './trips-destinations.entity';
import { Transports as TransportType } from '../enums/transports.enum';

@Entity('transports')
export class Transports {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Trips, (trips) => trips.transports, {
    onDelete: 'CASCADE',
  })
  trip!: Trips;

  @Column()
  tripId!: number;

  @Column({ type: 'varchar', length: 100 })
  mode!: TransportType;

  @ManyToOne(() => TripDestination, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fromDestinationId' })
  fromDestination!: TripDestination;

  @Column({ type: 'uuid' })
  fromDestinationId!: string;

  @ManyToOne(() => TripDestination, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toDestinationId' })
  toDestination!: TripDestination;

  @Column({ type: 'uuid' })
  toDestinationId!: string;

  @Column({ type: 'date' })
  departureDate!: string;

  @Column({ type: 'time' })
  departureTime!: string;

  @Column({ type: 'date' })
  arrivalDate!: string;

  @Column({ type: 'time' })
  arrivalTime!: string;

  @Column({ type: 'varchar', length: 100 })
  carrier!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference?: string;

  @Column({ type: 'numeric', nullable: true })
  amount?: string;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currency?: string;
}
