import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiGatewayService } from './api-gateway.service';

@Controller()
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @Get()
  getHello(): string {
    console.info('Received request for hello message');
    return this.apiGatewayService.getHello();
  }

  @Get('signal/:id')
  async getSignal(
    @Param('id') signalId: string,
  ): Promise<{ success: boolean; data?: unknown; message: string }> {
    console.info(`Received request for signal with ID: ${signalId}`);
    const signal = await this.apiGatewayService.getSignal(signalId);
    return {
      success: signal !== null,
      data: signal,
      message: signal ? 'Signal retrieved successfully' : 'Signal not found',
    };
  }

  @Get('signals/range')
  async getSignalsByDateRange(
    @Query('start') startTimestamp: string,
    @Query('end') endTimestamp: string,
  ): Promise<{
    success: boolean;
    data?: unknown;
    count?: number;
    message: string;
  }> {
    console.info(
      `Received request for signals in range: start=${startTimestamp}, end=${endTimestamp}`,
    );
    const start = parseInt(startTimestamp, 10);
    const end = parseInt(endTimestamp, 10);

    if (isNaN(start) || isNaN(end)) {
      return {
        success: false,
        message:
          'Invalid timestamp format. Please provide start and end as Unix timestamps (milliseconds)',
      };
    }

    if (start > end) {
      return {
        success: false,
        message: 'Start timestamp must be less than or equal to end timestamp',
      };
    }

    const signals = await this.apiGatewayService.getSignalsByDateRange(
      start,
      end,
    );
    console.log(
      `Retrieved ${signals.length} signals for the specified date range`,
    );
    return {
      success: true,
      data: signals,
      count: signals.length,
      message: `Retrieved ${signals.length} signals`,
    };
  }

  @Get('statistics')
  async getStatistics(
    @Query('start') startTimestamp: string,
    @Query('end') endTimestamp: string,
  ): Promise<{
    success: boolean;
    data?: unknown;
    message: string;
  }> {
    console.info(
      `Received request for statistics in range: start=${startTimestamp}, end=${endTimestamp}`,
    );
    const start = parseInt(startTimestamp, 10);
    const end = parseInt(endTimestamp, 10);

    if (isNaN(start) || isNaN(end)) {
      return {
        success: false,
        message:
          'Invalid timestamp format. Please provide start and end as Unix timestamps (milliseconds)',
      };
    }

    if (start > end) {
      return {
        success: false,
        message: 'Start timestamp must be less than or equal to end timestamp',
      };
    }

    const statistics = await this.apiGatewayService.getStatistics(start, end);
    return {
      success: true,
      data: statistics,
      message: 'Statistics calculated successfully',
    };
  }
}
