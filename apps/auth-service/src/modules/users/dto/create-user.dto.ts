import { IsDate, IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name!: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;

  @IsEnum(['admin', 'user', 'guest'])
  role!: string;
}
