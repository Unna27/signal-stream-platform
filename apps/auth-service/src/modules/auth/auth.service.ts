import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from '../users/dto/login-dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService, //injecting user service to auth service to use its methods for authentication
    private jwtService: JwtService, //injecting jwt service to auth service to use its methods for generating and verifying JWT tokens
  ) {}

  async signup(dto: CreateUserDto) {
    const existingUser = await this.userService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.userService.create({
      name: dto.name,
      email: dto.email,
      role: dto.role,
      password: hashedPassword,
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    console.log('User found:', user); // Debug log to check if user is found in the database
    const passwordMatch = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
