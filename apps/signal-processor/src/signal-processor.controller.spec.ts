import { Test, TestingModule } from '@nestjs/testing';
import { SignalProcessorController } from './signal-processor.controller';
import { SignalProcessorService } from './signal-processor.service';

describe('SignalProcessorController', () => {
  let signalProcessorController: SignalProcessorController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SignalProcessorController],
      providers: [SignalProcessorService],
    }).compile();

    signalProcessorController = app.get<SignalProcessorController>(SignalProcessorController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(signalProcessorController.getHello()).toBe('Hello World!');
    });
  });
});
