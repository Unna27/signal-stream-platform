import { Controller, Get, Param, Query } from '@nestjs/common';
import { StorageServiceService } from './storage-service.service';

@Controller('storage')
export class StorageServiceController {
  constructor(private readonly storageServiceService: StorageServiceService) {}

  @Get('health')
  healthCheck(): { status: string } {
    return { status: 'Storage service is running' };
  }

  @Get('stats')
  getStats() {
    return this.storageServiceService.getStats();
  }

  @Get('signal/:id')
  async getSignal(
    @Param('id') signalId: string,
  ): Promise<{ error: string } | any> {
    const signal = await this.storageServiceService.getStoredSignal(signalId);
    return signal || { error: 'Signal not found' };
  }

  @Get('signals')
  async getSignalsByDateRange(
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ): Promise<{ error: string } | any> {
    const start = parseInt(startTime, 10);
    const end = parseInt(endTime, 10);

    if (isNaN(start) || isNaN(end)) {
      return { error: 'startTime and endTime must be valid timestamps' };
    }

    return await this.storageServiceService.getSignalsByDateRange(start, end);
  }
}
