import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User, Prisma } from '@prisma/client';
import { AuthMethod, AccountStatus } from '@prisma/client';

/**
 * User Repository
 *
 * Data access layer for User entity operations.
 * Provides methods to create, read, update, and delete users with Prisma.
 *
 * Handles:
 * - User CRUD operations
 * - Email/cognitoSub lookups
 * - Account status management
 * - Email verification tracking
 */
@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new user
   *
   * @param data - User creation data
   * @returns Created user
   */
  async create(data: {
    email: string;
    cognitoSub: string;
    authMethod: AuthMethod;
    passwordHash?: string;
    displayName?: string;
    emailVerified?: boolean;
  }): Promise<User> {
    try {
      this.logger.debug(`Creating user with email: ${data.email}`);

      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          cognitoSub: data.cognitoSub,
          authMethod: data.authMethod,
          passwordHash: data.passwordHash,
          displayName: data.displayName,
          emailVerified: data.emailVerified || false,
          accountStatus: AccountStatus.ACTIVE,
        },
      });

      this.logger.log(`User created successfully: ${user.id}`);
      return user;
    } catch (error: any) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find user by ID
   *
   * @param id - User ID
   * @returns User or null if not found
   */
  async findById(id: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
      });
    } catch (error: any) {
      this.logger.error(`Failed to find user by ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find user by email
   *
   * @param email - User email address
   * @returns User or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { email },
      });
    } catch (error: any) {
      this.logger.error(`Failed to find user by email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find user by Cognito sub
   *
   * @param cognitoSub - Cognito user sub (unique identifier)
   * @returns User or null if not found
   */
  async findByCognitoSub(cognitoSub: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { cognitoSub },
      });
    } catch (error: any) {
      this.logger.error(`Failed to find user by cognitoSub: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if user exists by email
   *
   * @param email - User email address
   * @returns True if user exists
   */
  async existsByEmail(email: string): Promise<boolean> {
    try {
      const count = await this.prisma.user.count({
        where: { email },
      });
      return count > 0;
    } catch (error: any) {
      this.logger.error(`Failed to check user existence: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user email verification status
   *
   * @param id - User ID
   * @param verified - Email verified status
   * @returns Updated user
   */
  async updateEmailVerified(id: string, verified: boolean): Promise<User> {
    try {
      this.logger.debug(`Updating email verification for user: ${id}`);

      const user = await this.prisma.user.update({
        where: { id },
        data: {
          emailVerified: verified,
        },
      });

      this.logger.log(`Email verification updated for user: ${id}`);
      return user;
    } catch (error: any) {
      this.logger.error(`Failed to update email verification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user last login timestamp
   *
   * @param id - User ID
   * @returns Updated user
   */
  async updateLastLogin(id: string): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          lastLoginAt: new Date(),
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to update last login: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user account status
   *
   * @param id - User ID
   * @param status - New account status
   * @returns Updated user
   */
  async updateAccountStatus(id: string, status: AccountStatus): Promise<User> {
    try {
      this.logger.debug(`Updating account status for user ${id} to: ${status}`);

      const user = await this.prisma.user.update({
        where: { id },
        data: {
          accountStatus: status,
        },
      });

      this.logger.log(`Account status updated for user: ${id}`);
      return user;
    } catch (error: any) {
      this.logger.error(`Failed to update account status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user display name
   *
   * @param id - User ID
   * @param displayName - New display name
   * @returns Updated user
   */
  async updateDisplayName(id: string, displayName: string): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          displayName,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to update display name: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user with custom data
   *
   * @param id - User ID
   * @param data - Update data
   * @returns Updated user
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    try {
      this.logger.debug(`Updating user: ${id}`);

      const user = await this.prisma.user.update({
        where: { id },
        data,
      });

      this.logger.log(`User updated successfully: ${id}`);
      return user;
    } catch (error: any) {
      this.logger.error(`Failed to update user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete user (soft delete via status change recommended)
   *
   * @param id - User ID
   * @returns Deleted user
   */
  async delete(id: string): Promise<User> {
    try {
      this.logger.debug(`Deleting user: ${id}`);

      // Soft delete by updating status
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          accountStatus: AccountStatus.DELETED,
        },
      });

      this.logger.log(`User deleted (soft): ${id}`);
      return user;
    } catch (error: any) {
      this.logger.error(`Failed to delete user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Permanently delete user (hard delete)
   * Use with caution - should only be used for GDPR/data deletion requests
   *
   * @param id - User ID
   */
  async hardDelete(id: string): Promise<void> {
    try {
      this.logger.warn(`Hard deleting user: ${id}`);

      await this.prisma.user.delete({
        where: { id },
      });

      this.logger.log(`User permanently deleted: ${id}`);
    } catch (error: any) {
      this.logger.error(`Failed to hard delete user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get user count by status
   *
   * @param status - Account status filter
   * @returns User count
   */
  async countByStatus(status?: AccountStatus): Promise<number> {
    try {
      return await this.prisma.user.count({
        where: status ? { accountStatus: status } : undefined,
      });
    } catch (error: any) {
      this.logger.error(`Failed to count users: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find users created within a date range
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of users
   */
  async findByCreatedAtRange(startDate: Date, endDate: Date): Promise<User[]> {
    try {
      return await this.prisma.user.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to find users by date range: ${error.message}`, error.stack);
      throw error;
    }
  }
}
