import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('app.jwt_secret');

        if (!secret) {
          throw new Error('JWT secret is not defined');
        }

        return {
          secret,
          signOptions: {
            expiresIn: '3600s',
          },
        };
      },
    }),
    PassportModule.register({ defaultStrategy: 'jwt', session: false }), // default authguard strategy is set to JWT
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
