import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule, configuration } from 'my-shared/shared';
import { AnalyticsServiceController } from './analytics-service.controller';
import { AnalyticsServiceService } from './analytics-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    SharedModule,
  ],
  controllers: [AnalyticsServiceController],
  providers: [AnalyticsServiceService],
})
export class AnalyticsServiceModule {}
