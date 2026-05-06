import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule, configuration } from 'my-shared/shared';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    SharedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
