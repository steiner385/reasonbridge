/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, CredentialType, CredentialStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ExpertiseService } from '../expertise/expertise.service.js';
import { CredentialDto, SubmitCredentialDto } from './dto/credential.dto.js';

/**
 * Database credential record shape
 */
interface DbCredential {
  id: string;
  userId: string;
  tagId: string;
  type: CredentialType;
  title: string;
  institution: string | null;
  documentUrl: string | null;
  verificationUrl: string | null;
  status: CredentialStatus;
  reviewedById: string | null;
  reviewNotes: string | null;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  boostValue: Prisma.Decimal | { toNumber: () => number };
  createdAt: Date;
  updatedAt: Date;
  tag?: { name: string } | null;
}

/**
 * CredentialService - Manages domain credentials for expertise verification
 *
 * Handles submission, verification, rejection, and deletion of user credentials
 * that provide expertise score boosts in specific topic categories.
 *
 * @remarks
 * - Credentials must be verified by an admin before they provide boosts
 * - Verification triggers expertise score recalculation
 * - Users can only delete their own credentials
 * - Different credential types have different boost values
 *
 * Boost values by credential type:
 * - ACADEMIC_DOCTORATE: +0.30 (PhD, MD, JD)
 * - ACADEMIC_MASTERS: +0.20 (MA, MS, MBA)
 * - ACADEMIC_BACHELORS: +0.10 (BA, BS)
 * - PROFESSIONAL_LICENSE: +0.25 (Medical, Legal, Engineering)
 * - INDUSTRY_CERTIFICATION: +0.15 (AWS, PMP, CPA)
 * - PUBLICATION: +0.10 (Journal article, book, max +0.30 total)
 */
@Injectable()
export class CredentialService {
  private readonly logger = new Logger(CredentialService.name);

  /**
   * Boost values for each credential type
   */
  private readonly BOOST_VALUES: Record<CredentialType, number> = {
    ACADEMIC_DOCTORATE: 0.3,
    ACADEMIC_MASTERS: 0.2,
    ACADEMIC_BACHELORS: 0.1,
    PROFESSIONAL_LICENSE: 0.25,
    INDUSTRY_CERTIFICATION: 0.15,
    PUBLICATION: 0.1,
  };

  /**
   * Human-readable names for credential types
   */
  private readonly TYPE_NAMES: Record<CredentialType, string> = {
    ACADEMIC_DOCTORATE: 'Academic Doctorate',
    ACADEMIC_MASTERS: "Academic Master's",
    ACADEMIC_BACHELORS: "Academic Bachelor's",
    PROFESSIONAL_LICENSE: 'Professional License',
    INDUSTRY_CERTIFICATION: 'Industry Certification',
    PUBLICATION: 'Publication',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly expertiseService: ExpertiseService,
  ) {}

  /**
   * Submit a new credential for verification
   *
   * @param userId - The user submitting the credential
   * @param data - The credential submission data
   * @returns The created credential with PENDING status
   * @throws NotFoundException if the tag does not exist
   */
  async submitCredential(userId: string, data: SubmitCredentialDto): Promise<CredentialDto> {
    // Verify the tag exists
    const tag = await this.prisma.tag.findUnique({
      where: { id: data.tagId },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${data.tagId} not found`);
    }

    // Calculate boost value based on credential type
    const boostValue = this.getBoostValue(data.type);

    // Create the credential with PENDING status
    const credential = await this.prisma.domainCredential.create({
      data: {
        userId,
        tagId: data.tagId,
        type: data.type,
        title: data.title,
        institution: data.institution,
        documentUrl: data.documentUrl,
        verificationUrl: data.verificationUrl,
        expiresAt: data.expiresAt,
        status: CredentialStatus.PENDING,
        boostValue: new Prisma.Decimal(boostValue),
      },
      include: { tag: true },
    });

    this.logger.log(`Credential submitted: ${credential.id} by user ${userId} for tag ${tag.name}`);

    return this.toCredentialDto(credential);
  }

  /**
   * Get all credentials for a user
   *
   * @param userId - The user's unique identifier
   * @returns Array of CredentialDto for all user credentials
   */
  async getUserCredentials(userId: string): Promise<CredentialDto[]> {
    const credentials = await this.prisma.domainCredential.findMany({
      where: { userId },
      include: { tag: true },
      orderBy: { createdAt: 'desc' },
    });

    return credentials.map((cred) => this.toCredentialDto(cred));
  }

  /**
   * Get a specific credential by ID
   *
   * @param id - The credential's unique identifier
   * @returns CredentialDto
   * @throws NotFoundException if the credential does not exist
   */
  async getCredential(id: string): Promise<CredentialDto> {
    const credential = await this.prisma.domainCredential.findUnique({
      where: { id },
      include: { tag: true },
    });

    if (!credential) {
      throw new NotFoundException(`Credential with ID ${id} not found`);
    }

    return this.toCredentialDto(credential);
  }

  /**
   * Get all pending credentials for admin review
   *
   * @returns Array of CredentialDto with PENDING status, oldest first
   */
  async getPendingCredentials(): Promise<CredentialDto[]> {
    const credentials = await this.prisma.domainCredential.findMany({
      where: { status: CredentialStatus.PENDING },
      include: { tag: true },
      orderBy: { createdAt: 'asc' },
    });

    return credentials.map((cred) => this.toCredentialDto(cred));
  }

  /**
   * Verify a credential (admin action)
   *
   * Marks the credential as VERIFIED and triggers expertise recalculation.
   *
   * @param id - The credential's unique identifier
   * @param adminId - The admin performing the verification
   * @param notes - Optional notes about the verification
   * @returns The updated CredentialDto
   * @throws NotFoundException if the credential does not exist
   * @throws BadRequestException if the credential is not pending
   */
  async verifyCredential(id: string, adminId: string, notes?: string): Promise<CredentialDto> {
    // Get the credential
    const credential = await this.prisma.domainCredential.findUnique({
      where: { id },
      include: { tag: true },
    });

    if (!credential) {
      throw new NotFoundException(`Credential with ID ${id} not found`);
    }

    if (credential.status !== CredentialStatus.PENDING) {
      throw new BadRequestException(
        `Credential is not pending review (current status: ${credential.status})`,
      );
    }

    // Update the credential
    const now = new Date();
    const updatedCredential = await this.prisma.domainCredential.update({
      where: { id },
      data: {
        status: CredentialStatus.VERIFIED,
        reviewedById: adminId,
        reviewNotes: notes,
        verifiedAt: now,
      },
      include: { tag: true },
    });

    this.logger.log(`Credential verified: ${id} by admin ${adminId} for user ${credential.userId}`);

    // Trigger expertise recalculation
    await this.expertiseService.recalculateExpertise(credential.userId, credential.tagId);

    return this.toCredentialDto(updatedCredential);
  }

  /**
   * Reject a credential (admin action)
   *
   * Marks the credential as REJECTED with a reason.
   *
   * @param id - The credential's unique identifier
   * @param adminId - The admin performing the rejection
   * @param reason - The reason for rejection
   * @returns The updated CredentialDto
   * @throws NotFoundException if the credential does not exist
   * @throws BadRequestException if the credential is not pending
   */
  async rejectCredential(id: string, adminId: string, reason: string): Promise<CredentialDto> {
    // Get the credential
    const credential = await this.prisma.domainCredential.findUnique({
      where: { id },
      include: { tag: true },
    });

    if (!credential) {
      throw new NotFoundException(`Credential with ID ${id} not found`);
    }

    if (credential.status !== CredentialStatus.PENDING) {
      throw new BadRequestException(
        `Credential is not pending review (current status: ${credential.status})`,
      );
    }

    // Update the credential
    const updatedCredential = await this.prisma.domainCredential.update({
      where: { id },
      data: {
        status: CredentialStatus.REJECTED,
        reviewedById: adminId,
        reviewNotes: reason,
      },
      include: { tag: true },
    });

    this.logger.log(`Credential rejected: ${id} by admin ${adminId} for user ${credential.userId}`);

    // No expertise recalculation needed for rejection

    return this.toCredentialDto(updatedCredential);
  }

  /**
   * Delete a credential (user action)
   *
   * Only the credential owner can delete their credential.
   * If the credential was verified, triggers expertise recalculation.
   *
   * @param id - The credential's unique identifier
   * @param userId - The user attempting to delete
   * @throws NotFoundException if the credential does not exist
   * @throws ForbiddenException if the user does not own the credential
   */
  async deleteCredential(id: string, userId: string): Promise<void> {
    // Get the credential
    const credential = await this.prisma.domainCredential.findUnique({
      where: { id },
      include: { tag: true },
    });

    if (!credential) {
      throw new NotFoundException(`Credential with ID ${id} not found`);
    }

    if (credential.userId !== userId) {
      throw new ForbiddenException('You can only delete your own credentials');
    }

    const wasVerified = credential.status === CredentialStatus.VERIFIED;
    const { tagId } = credential;

    // Delete the credential
    await this.prisma.domainCredential.delete({
      where: { id },
    });

    this.logger.log(`Credential deleted: ${id} by user ${userId}`);

    // Recalculate expertise if the credential was verified
    if (wasVerified) {
      await this.expertiseService.recalculateExpertise(userId, tagId);
    }
  }

  /**
   * Get the boost value for a credential type
   *
   * @param type - The credential type
   * @returns The boost value (0-1 scale)
   */
  getBoostValue(type: CredentialType): number {
    return this.BOOST_VALUES[type];
  }

  /**
   * Get the human-readable name for a credential type
   *
   * @param type - The credential type
   * @returns The display name
   */
  getCredentialTypeName(type: CredentialType): string {
    return this.TYPE_NAMES[type];
  }

  /**
   * Convert a database credential to CredentialDto
   */
  private toCredentialDto(credential: DbCredential): CredentialDto {
    const boostValue = this.decimalToNumber(credential.boostValue);

    return new CredentialDto({
      id: credential.id,
      userId: credential.userId,
      tagId: credential.tagId,
      tagName: credential.tag?.name ?? 'Unknown',
      type: credential.type,
      typeName: this.getCredentialTypeName(credential.type),
      title: credential.title,
      institution: credential.institution ?? '',
      documentUrl: credential.documentUrl ?? undefined,
      verificationUrl: credential.verificationUrl ?? undefined,
      status: credential.status,
      boostValue,
      reviewedBy: credential.reviewedById ?? undefined,
      reviewNotes: credential.reviewNotes ?? undefined,
      verifiedAt: credential.verifiedAt ?? undefined,
      expiresAt: credential.expiresAt ?? undefined,
      createdAt: credential.createdAt,
    });
  }

  /**
   * Convert Prisma Decimal to number
   */
  private decimalToNumber(value: Prisma.Decimal | { toNumber: () => number } | number): number {
    if (typeof value === 'number') {
      return value;
    }
    if ('toNumber' in value && typeof value.toNumber === 'function') {
      return value.toNumber();
    }
    return 0;
  }
}
