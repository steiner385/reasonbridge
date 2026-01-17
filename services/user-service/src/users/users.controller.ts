import { Controller, Get, Put, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard, type JwtPayload } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UsersService } from './users.service.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/me - Get current authenticated user's profile
   * Requires Bearer token in Authorization header
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() jwtPayload: JwtPayload): Promise<UserResponseDto> {
    // Use the cognitoSub from the JWT token to find the user
    const user = await this.usersService.findByCognitoSub(jwtPayload.sub);
    return new UserResponseDto(user);
  }

  /**
   * PUT /users/me - Update current authenticated user's profile
   * Requires Bearer token in Authorization header
   */
  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateCurrentUser(
    @CurrentUser() jwtPayload: JwtPayload,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    // Update the user using cognitoSub from JWT token
    const updatedUser = await this.usersService.updateProfile(jwtPayload.sub, updateProfileDto);
    return new UserResponseDto(updatedUser);
  }
}
