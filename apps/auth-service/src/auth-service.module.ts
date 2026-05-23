import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from 'my-shared/shared/configuration';
import { SharedModule } from 'my-shared/shared';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthServiceService } from './auth-service.service';
import { AuthServiceController } from './auth-service.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    SharedModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AuthServiceController],
  providers: [AuthServiceService], //no business logic in root module, only imports other modules that contain business logic
})
export class AuthServiceModule {}
