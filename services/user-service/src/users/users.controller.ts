import {
  Controller,
  Get,
  Put,
  Param,
  UseGuards,
  Body,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard, type JwtPayload } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UsersService } from './users.service.js';
import { UserResponseDto, PublicUserResponseDto } from './dto/user-response.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

/**
 * Validates that a string is a valid UUID v4 format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

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

  /**
   * GET /users/:id - Get a user's public profile by ID
   * Public endpoint - no authentication required
   */
  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<PublicUserResponseDto> {
    // Validate UUID format to prevent Prisma errors and aid debugging
    if (!isValidUUID(id)) {
      this.logger.warn(
        `Invalid UUID format in getUserById: "${id}" (length: ${id.length}, ` +
          `charCodes: [${id
            .substring(0, 10)
            .split('')
            .map((c) => c.charCodeAt(0))
            .join(', ')}])`,
      );
      throw new BadRequestException(
        `Invalid user ID format: expected UUID, received "${id.substring(0, 50)}${id.length > 50 ? '...' : ''}"`,
      );
    }

    this.logger.debug(`Fetching user by ID: ${id}`);
    const user = await this.usersService.findById(id);
    return new PublicUserResponseDto(user);
  }
}
