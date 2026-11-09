import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transports } from '../entities/transports.entity';
import type { AmountByCurrency } from './itinerary.repository';

@Injectable()
export class TransportsRepository {
  constructor(
    @InjectRepository(Transports)
    private readonly transportsRepository: Repository<Transports>,
  ) {}

  create(transport: Partial<Transports>) {
    return this.transportsRepository.create(transport);
  }

  async findAllByTrip(tripId: number) {
    return await this.transportsRepository
      .createQueryBuilder('transport')
      .innerJoinAndSelect('transport.fromDestination', 'fromDestination')
      .innerJoinAndSelect('transport.toDestination', 'toDestination')
      .where('transport.tripId = :tripId', { tripId })
      .orderBy('transport.departureDate', 'ASC')
      .addOrderBy('transport.departureTime', 'ASC')
      .getMany();
  }

  async getBudgetByTrip(tripId: number) {
    return await this.transportsRepository
      .createQueryBuilder('transport')
      .select('transport.currency', 'currency')
      .addSelect('SUM(transport.amount)', 'amount')
      .where('transport.tripId = :tripId', { tripId })
      .andWhere('transport.amount IS NOT NULL')
      .andWhere('transport.currency IS NOT NULL')
      .groupBy('transport.currency')
      .getRawMany<AmountByCurrency>();
  }

  remove(transport: Transports) {
    return this.transportsRepository.remove(transport);
  }

  async save(transport: Partial<Transports>) {
    return await this.transportsRepository.save(transport);
  }

  async findByIdAndTrip(id: string, tripId: number) {
    return await this.transportsRepository
      .createQueryBuilder('transport')
      .innerJoinAndSelect('transport.fromDestination', 'fromDestination')
      .innerJoinAndSelect('transport.toDestination', 'toDestination')
      .where('transport.id = :id', { id })
      .andWhere('transport.tripId = :tripId', { tripId })
      .getOne();
  }
}
