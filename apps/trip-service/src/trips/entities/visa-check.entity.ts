import { Entity, Column } from 'typeorm';

@Entity('visa_checks')
export class VisaCheckEntity {
  @Column({ type: 'varchar', length: 100, primary: true })
  passport!: string;

  @Column({ type: 'varchar', length: 100, primary: true })
  destination!: string;

  @Column({ type: 'varchar', length: 50 })
  requirement!: string;
}
