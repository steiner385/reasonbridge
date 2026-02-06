import { Controller, Get, Post, Patch, Body, Param, Res, Headers, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

/**
 * Validates that a string is a valid UUID v4 format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * VerificationProxyController routes verification requests to user-service
 *
 * Routes:
 * - POST   /verification/request - Request verification (phone or video)
 * - POST   /verification/phone/request - Request phone OTP
 * - POST   /verification/phone/verify - Verify phone OTP
 * - POST   /verification/video-upload-complete - Mark video upload complete
 * - GET    /verification/:verificationId - Get verification record
 * - GET    /verification/user/pending - Get user's pending verifications
 * - GET    /verification/user/history - Get user's verification history
 * - PATCH  /verification/:verificationId/complete - Mark verification complete
 * - POST   /verification/:verificationId/re-verify - Request re-verification
 *
 * Authentication is enforced by user-service, not at the gateway level.
 */
@Controller('verification')
export class VerificationProxyController {
  private readonly logger = new Logger(VerificationProxyController.name);

  constructor(private readonly proxyService: ProxyService) {}

  @Post('request')
  async requestVerification(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToUserService({
      method: 'POST',
      path: '/verification/request',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Post('phone/request')
  async requestPhoneVerification(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToUserService({
      method: 'POST',
      path: '/verification/phone/request',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Post('phone/verify')
  async verifyPhoneOTP(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToUserService({
      method: 'POST',
      path: '/verification/phone/verify',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Post('video-upload-complete')
  async markVideoUploadComplete(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToUserService({
      method: 'POST',
      path: '/verification/video-upload-complete',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Get('user/pending')
  async getPendingVerifications(
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToUserService({
      method: 'GET',
      path: '/verification/user/pending',
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Get('user/history')
  async getVerificationHistory(
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToUserService({
      method: 'GET',
      path: '/verification/user/history',
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Get(':verificationId')
  async getVerificationById(
    @Param('verificationId') verificationId: string,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    // Validate UUID format before proxying
    if (!isValidUUID(verificationId)) {
      this.logger.warn(
        `Invalid UUID format received for verification lookup: "${verificationId}" (length: ${verificationId.length})`,
      );
      res.status(400).send({
        statusCode: 400,
        message: `Invalid verification ID format: expected UUID, received "${verificationId.substring(0, 50)}${verificationId.length > 50 ? '...' : ''}"`,
        error: 'Bad Request',
      });
      return;
    }

    const response = await this.proxyService.proxyToUserService({
      method: 'GET',
      path: `/verification/${verificationId}`,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Patch(':verificationId/complete')
  async completeVerification(
    @Param('verificationId') verificationId: string,
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    // Validate UUID format before proxying
    if (!isValidUUID(verificationId)) {
      this.logger.warn(
        `Invalid UUID format received for verification completion: "${verificationId}" (length: ${verificationId.length})`,
      );
      res.status(400).send({
        statusCode: 400,
        message: `Invalid verification ID format: expected UUID, received "${verificationId.substring(0, 50)}${verificationId.length > 50 ? '...' : ''}"`,
        error: 'Bad Request',
      });
      return;
    }

    const response = await this.proxyService.proxyToUserService({
      method: 'PATCH',
      path: `/verification/${verificationId}/complete`,
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Post(':verificationId/re-verify')
  async requestReVerification(
    @Param('verificationId') verificationId: string,
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    // Validate UUID format before proxying
    if (!isValidUUID(verificationId)) {
      this.logger.warn(
        `Invalid UUID format received for re-verification request: "${verificationId}" (length: ${verificationId.length})`,
      );
      res.status(400).send({
        statusCode: 400,
        message: `Invalid verification ID format: expected UUID, received "${verificationId.substring(0, 50)}${verificationId.length > 50 ? '...' : ''}"`,
        error: 'Bad Request',
      });
      return;
    }

    const response = await this.proxyService.proxyToUserService({
      method: 'POST',
      path: `/verification/${verificationId}/re-verify`,
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }
}
