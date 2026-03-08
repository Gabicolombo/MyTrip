import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItineraryEntity } from '../entities/itinerary.entity';

@Injectable()
export class ItineraryRepository {
  constructor(
    @InjectRepository(ItineraryEntity)
    private readonly itineraryRepo: Repository<ItineraryEntity>,
  ) {}

  async findById(itineraryId: string): Promise<ItineraryEntity | null> {
    return this.itineraryRepo.findOne({
      where: { id: itineraryId },
    });
  }

  async create(
    itineraryData: Partial<ItineraryEntity>,
  ): Promise<ItineraryEntity> {
    return await this.itineraryRepo.save(itineraryData);
  }
}
