/**
 * Select topics response DTOs
 */

import { SelectedTopicDto, OnboardingProgressDto } from '../../dto/common.dto';

/**
 * Response after successfully selecting topics
 */
export class SelectTopicsResponseDto {
  selectedTopics!: SelectedTopicDto[];

  onboardingProgress!: OnboardingProgressDto;

  warning?: string;

  suggestions?: SelectedTopicDto[];
}
