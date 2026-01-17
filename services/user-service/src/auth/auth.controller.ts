import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { CognitoService } from './cognito.service.js';
import { LoginDto, LoginResponseDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly cognitoService: CognitoService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.cognitoService.authenticateUser(loginDto.email, loginDto.password);
  }
}
