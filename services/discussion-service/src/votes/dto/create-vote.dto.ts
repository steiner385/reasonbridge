import { IsEnum } from 'class-validator';

export class CreateVoteDto {
  @IsEnum(['UPVOTE', 'DOWNVOTE'])
  voteType!: 'UPVOTE' | 'DOWNVOTE';
}
