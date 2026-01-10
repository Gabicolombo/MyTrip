import { Controller, Get } from '@nestjs/common';
import { TripServiceService } from './trip-service.service';

@Controller()
export class TripServiceController {
  constructor(private readonly tripServiceService: TripServiceService) {}

  @Get()
  getHello(): string {
    return this.tripServiceService.getHello();
  }
}
