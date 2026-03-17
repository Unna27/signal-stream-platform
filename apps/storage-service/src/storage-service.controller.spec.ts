import { Test, TestingModule } from '@nestjs/testing';
import { StorageServiceController } from './storage-service.controller';
import { StorageServiceService } from './storage-service.service';

describe('StorageServiceController', () => {
  let storageServiceController: StorageServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [StorageServiceController],
      providers: [StorageServiceService],
    }).compile();

    storageServiceController = app.get<StorageServiceController>(StorageServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(storageServiceController.getHello()).toBe('Hello World!');
    });
  });
});
