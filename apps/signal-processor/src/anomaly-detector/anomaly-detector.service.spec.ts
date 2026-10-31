import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from 'my-db/database';
import { AnomalyDetectorService } from './anomaly-detector.service';

describe('AnomalyDetectorService', () => {
  let service: AnomalyDetectorService;
  let databaseService: {
    getLatestProcessedSignalValues: jest.Mock;
  };

  beforeEach(async () => {
    databaseService = {
      getLatestProcessedSignalValues: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnomalyDetectorService,
        { provide: DatabaseService, useValue: databaseService },
      ],
    }).compile();

    service = module.get<AnomalyDetectorService>(AnomalyDetectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('loads the latest ten readings for the device before detecting', async () => {
    databaseService.getLatestProcessedSignalValues.mockResolvedValue([
      10, 10, 10, 10, 10,
    ]);

    const result = await service.detect('device-1', 35);

    expect(databaseService.getLatestProcessedSignalValues).toHaveBeenCalledWith(
      'device-1',
      10,
    );
    expect(result).toEqual({
      status: 'ANOMALY',
      anomalyType: 'SPIKE',
      historyCount: 5,
    });
  });

  it('reports insufficient history when fewer than five readings are available', async () => {
    databaseService.getLatestProcessedSignalValues.mockResolvedValue([
      10, 11, 12, 13,
    ]);

    await expect(service.detect('device-1', 14)).resolves.toEqual({
      status: 'INSUFFICIENT_DATA',
      anomalyType: null,
      historyCount: 4,
    });
  });
});
