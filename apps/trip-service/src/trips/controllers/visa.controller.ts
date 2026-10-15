import { Controller, UseGuards, Post, Body } from '@nestjs/common';
import { AuthGuard } from 'apps/auth-service/src/auth/auth.guard';
import { VisaService } from '../services/visa.service';
import { VisaCheckDto } from '../dto/visa-check.dto';

@UseGuards(AuthGuard)
@Controller('trips')
export class VisaController {
  constructor(private readonly visaService: VisaService) {}

  @Post('visa-check')
  async checkVisaRequirements(@Body() input: VisaCheckDto) {
    return await this.visaService.visaCheck(input);
  }
}
