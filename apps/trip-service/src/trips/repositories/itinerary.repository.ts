import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ItineraryEntity } from '../entities/itinerary.entity';

@Injectable()
export class ItineraryRepository {
  constructor(
    @InjectRepository(ItineraryEntity)
    private readonly itineraryRepo: Repository<ItineraryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(itineraryId: string): Promise<ItineraryEntity | null> {
    const itinerary = await this.dataSource
      .getRepository(ItineraryEntity)
      .createQueryBuilder('itinerary')
      .innerJoinAndSelect('itinerary.tripDestination', 'tripDestination')
      .where('itinerary.id = :id', { id: itineraryId })
      .getOne();
    return itinerary;
  }

  async getByTripDestinationId(
    tripDestinationId: string,
  ): Promise<ItineraryEntity[]> {
    const itineraries = await this.dataSource
      .getRepository(ItineraryEntity)
      .createQueryBuilder('itinerary')
      .innerJoinAndSelect('itinerary.tripDestination', 'tripDestination')
      .where('tripDestination.id = :id', { id: tripDestinationId })
      .orderBy('itinerary.day', 'ASC')
      .addOrderBy('itinerary.time', 'ASC')
      .getMany();
    return itineraries;
  }

  async create(
    itineraryData: Partial<ItineraryEntity>,
  ): Promise<ItineraryEntity> {
    return await this.itineraryRepo.save(itineraryData);
  }

  async update(
    itineraryData: Partial<ItineraryEntity>,
    itineraryId: string,
  ): Promise<ItineraryEntity | null> {
    await this.itineraryRepo.update({ id: itineraryId }, itineraryData);
    return this.findById(itineraryId);
  }

  async delete(itinerary: string): Promise<void> {
    await this.itineraryRepo.delete({ id: itinerary });
  }
}
