import { ConflictException } from '@nestjs/common';
import { TripsService } from './trips.service';

describe('Destination dates within a trip', () => {
  const trips = { findById: jest.fn() };
  const participants = { findParticipant: jest.fn() };
  const destinations = { addDestination: jest.fn() };
  let service: TripsService;
  const destination = (startDate: string, endDate: string) => ({
    tripId: 1,
    city: 'Paris',
    country: 'France',
    startDate,
    endDate,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    service = Object.assign(
      Object.create(TripsService.prototype) as TripsService,
      {
        tripsRepository: trips,
        tripsParticipantsRepository: participants,
        tripsDestinationsRepository: destinations,
      },
    );
    trips.findById.mockResolvedValue({
      startDate: '2030-06-10',
      endDate: '2030-06-20',
    });
    participants.findParticipant.mockResolvedValue({ role: 'OWNER' });
    destinations.addDestination.mockImplementation((items) =>
      Promise.resolve(items),
    );
  });

  it('accepts multiple destinations including the trip boundaries', async () => {
    const items = [
      destination('2030-06-10', '2030-06-15'),
      destination('2030-06-15', '2030-06-20'),
    ];
    await expect(service.addDestination(items, 7)).resolves.toEqual(items);
    expect(destinations.addDestination).toHaveBeenCalledWith(items);
  });

  it.each([
    ['2030-06-09', '2030-06-15'],
    ['2030-06-15', '2030-06-21'],
    ['2030-06-16', '2030-06-14'],
    ['2030-06-15', '2030-06-15'],
    ['invalid', '2030-06-15'],
  ])('rejects an invalid destination interval %s to %s', async (start, end) => {
    await expect(
      service.addDestination([destination(start, end)], 7),
    ).rejects.toThrow(ConflictException);
    expect(destinations.addDestination).not.toHaveBeenCalled();
  });

  it('rejects the entire batch if a later destination is outside the trip', async () => {
    await expect(
      service.addDestination(
        [
          destination('2030-06-10', '2030-06-15'),
          destination('2030-06-18', '2030-06-21'),
        ],
        7,
      ),
    ).rejects.toThrow(ConflictException);
    expect(destinations.addDestination).not.toHaveBeenCalled();
  });

  it('also accepts Date objects for the trip', async () => {
    trips.findById.mockResolvedValue({
      startDate: new Date(2030, 5, 10),
      endDate: new Date(2030, 5, 20),
    });
    await expect(
      service.addDestination([destination('2030-06-10', '2030-06-20')], 7),
    ).resolves.toHaveLength(1);
  });
});
