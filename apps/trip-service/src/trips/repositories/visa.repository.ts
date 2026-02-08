import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisaCheckDto } from '../dto/visa-check.dto';
import { VisaCheckEntity } from '../entities/visa-check.entity';
import { NotFoundError } from 'rxjs';

@Injectable()
export class VisaRepository {
  constructor(
    @InjectRepository(VisaCheckEntity)
    private readonly visaRepo: Repository<VisaCheckEntity>,
  ) {}

  async checkVisaRequirements(input: VisaCheckDto): Promise<VisaCheckEntity> {
    try {
      const result = await this.visaRepo.findOne({
        where: {
          passport: input.passport,
          destination: input.destination,
        },
      });
      if (!result) {
        throw new NotFoundError('Visa check data not found');
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        'Failed to check visa requirements: ' + message,
      );
    }
  }
}
