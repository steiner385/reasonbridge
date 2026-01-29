/**
 * T051 [P] [US3] - Reply to Response DTO (Feature 009)
 *
 * Specialized DTO for replying to specific responses in threaded discussions
 * Extends CreateResponseDto but doesn't require discussionId (inherited from parent)
 */

import { OmitType } from '@nestjs/swagger';
import { CreateResponseDto } from './create-response.dto.js';

/**
 * Request body for replying to a specific response
 * Inherits validation from CreateResponseDto but discussionId is derived from parent
 */
export class ReplyToResponseDto extends OmitType(CreateResponseDto, [
  'discussionId',
  'parentResponseId',
] as const) {
  // All other fields inherited from CreateResponseDto:
  // - content (50-25000 chars, required)
  // - citations (optional, max 10)
  // - containsOpinion (optional boolean)
  // - containsFactualClaims (optional boolean)
  // - propositionIds (optional array)
}
