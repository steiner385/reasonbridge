import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { BotDetectorService } from '../services/bot-detector.service.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

export interface CreateUserData {
  email: string;
  displayName: string;
  cognitoSub: string;
}

/**
 * Validates that a string is a valid UUID v4 format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly botDetector: BotDetectorService,
  ) {}

  /**
   * Create a new user in the local database
   * @param data - User creation data including Cognito sub
   * @returns Created user object
   */
  async createUser(data: CreateUserData) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { cognitoSub: data.cognitoSub }],
      },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        displayName: data.displayName,
        cognitoSub: data.cognitoSub,
        verificationLevel: 'BASIC',
        trustScoreAbility: 0.5,
        trustScoreBenevolence: 0.5,
        trustScoreIntegrity: 0.5,
        status: 'ACTIVE',
      },
    });

    return user;
  }

  /**
   * Find a user by their Cognito sub (subject identifier)
   * @param cognitoSub - The Cognito user ID from JWT token
   * @returns User object or null if not found
   */
  async findByCognitoSub(cognitoSub: string) {
    const user = await this.prisma.user.findUnique({
      where: { cognitoSub },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Find a user by their ID
   * @param id - The user's UUID
   * @returns User object or null if not found
   * @throws BadRequestException if id is not a valid UUID
   * @throws NotFoundException if user is not found
   */
  async findById(id: string) {
    // Validate UUID format before querying to prevent Prisma errors
    if (!isValidUUID(id)) {
      this.logger.error(
        `Invalid UUID passed to findById: "${id}" (length: ${id.length}, ` +
          `type: ${typeof id}, charCodes: [${id
            .substring(0, 20)
            .split('')
            .map((c) => c.charCodeAt(0))
            .join(', ')}])`,
      );
      throw new BadRequestException(
        `Invalid user ID format: expected UUID, received "${id.substring(0, 50)}${id.length > 50 ? '...' : ''}"`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update a user's profile by their Cognito sub
   * @param cognitoSub - The Cognito user ID from JWT token
   * @param updateProfileDto - The fields to update
   * @returns Updated user object
   */
  async updateProfile(cognitoSub: string, updateProfileDto: UpdateProfileDto) {
    // First verify the user exists
    await this.findByCognitoSub(cognitoSub);

    // Update the user
    const updatedUser = await this.prisma.user.update({
      where: { cognitoSub },
      data: updateProfileDto,
    });

    return updatedUser;
  }

  /**
   * Check if a user exhibits suspicious bot patterns
   * Updates verification level if patterns detected
   * @param userId - The user ID to check
   * @returns Bot detection result with risk assessment
   */
  async checkAndHandleBotPatterns(userId: string) {
    const detectionResult = await this.botDetector.detectNewAccountBotPatterns(userId);

    // If suspicious patterns detected, mark for manual review
    // User is notified that additional verification is required (part of verification flow)
    // TODO: integrate with moderation service for review queue when implemented

    return detectionResult;
  }
}
