import { Injectable } from '@nestjs/common';
import { VisaRepository } from '../repositories/visa.repository';
import { VisaCheckDto } from '../dto/visa-check.dto';

@Injectable()
export class VisaService {
  constructor(private readonly visaRepository: VisaRepository) {}

  async visaCheck(input: VisaCheckDto) {
    return await this.visaRepository.checkVisaRequirements(input);
  }
}
