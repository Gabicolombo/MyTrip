import { Injectable } from '@nestjs/common';

@Injectable()
export class TripServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
