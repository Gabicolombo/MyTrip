import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { TripDestination } from './trips-destinations.entity';
import { TripParticipant } from './trips-participants.entity';

@Entity()
export class Trips {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  title: string;

  @Column({
    type: 'enum',
    enum: ['Initiated', 'Planned', 'Ongoing', 'Completed', 'Cancelled'],
  })
  status: 'Initiated' | 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled';

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @OneToMany(() => TripDestination, (destination) => destination.trip, {
    cascade: true,
  })
  destinations: TripDestination[];

  @OneToMany(() => TripParticipant, (participant) => participant.trip)
  participants: TripParticipant[];

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ nullable: true })
  imagePublicId?: string;
}
