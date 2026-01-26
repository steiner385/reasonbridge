/**
 * Select topics response DTOs
 */

import { ApiProperty } from '@nestjs/swagger';
import { SelectedTopicDto, OnboardingProgressDto } from '../../dto/common.dto';

/**
 * Response after successfully selecting topics
 */
export class SelectTopicsResponseDto {
  @ApiProperty({
    description: 'Successfully selected topics with priorities',
    type: [SelectedTopicDto],
  })
  selectedTopics: SelectedTopicDto[];

  @ApiProperty({
    description: 'Updated onboarding progress',
    type: OnboardingProgressDto,
  })
  onboardingProgress: OnboardingProgressDto;

  @ApiProperty({
    description: 'Optional warning if all selected topics have low activity',
    example: 'Consider selecting at least one high-activity topic for more engagement',
    required: false,
  })
  warning?: string;

  @ApiProperty({
    description: 'Alternative high-activity topic suggestions',
    type: [SelectedTopicDto],
    required: false,
  })
  suggestions?: SelectedTopicDto[];
}
