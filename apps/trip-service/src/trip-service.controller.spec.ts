import { Test, TestingModule } from '@nestjs/testing';
import { TripServiceController } from './trip-service.controller';
import { TripServiceService } from './trip-service.service';

describe('TripServiceController', () => {
  let tripServiceController: TripServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [TripServiceController],
      providers: [TripServiceService],
    }).compile();

    tripServiceController = app.get<TripServiceController>(TripServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(tripServiceController.getHello()).toBe('Hello World!');
    });
  });
});
