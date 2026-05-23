import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from '../users/dto/login-dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: CreateUserDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    console.log('Login attempt:', dto); // Debug log to check incoming login data
    return this.authService.login(dto);
  }

  @UseGuards(AuthGuard('jwt')) //protecting this route with JWT authentication guard, only authenticated users can access it or simply AuthGuard() will work as we set default strategy to JWT in auth.module.ts
  @Get('profile')
  getProfile(@Request() req) {
    console.log('Retrieving profile for user:', req.user); // user object holds userId, email and role as we validate and attach it to the request in jwt.strategy.ts
    return req.user;
  }
}
