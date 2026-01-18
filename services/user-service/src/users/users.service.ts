import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
   */
  async findById(id: string) {
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
}
