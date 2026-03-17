import { Controller, Get } from '@nestjs/common';
import { SignalProcessorService } from './signal-processor.service';

@Controller()
export class SignalProcessorController {
  constructor(
    private readonly signalProcessorService: SignalProcessorService,
  ) {}

  /* @Get()
  getHello(): string {
    return this.signalProcessorService.getHello();
  } */
}
