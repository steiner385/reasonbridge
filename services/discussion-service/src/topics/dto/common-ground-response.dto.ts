export interface AgreementZoneDto {
  description: string;
  confidence: number;
  propositionIds: string[];
  participantPercentage: number;
}

export interface MisunderstandingDefinitionDto {
  definition: string;
  userCount: number;
}

export interface MisunderstandingDto {
  description: string;
  term: string;
  definitions: MisunderstandingDefinitionDto[];
  affectedPropositions: string[];
}

export type MoralFoundation =
  | 'care'
  | 'fairness'
  | 'loyalty'
  | 'authority'
  | 'sanctity'
  | 'liberty';

export interface GenuineDisagreementDto {
  description: string;
  underlyingValues: string[];
  moralFoundations: MoralFoundation[];
  propositionIds: string[];
}

export interface CommonGroundResponseDto {
  id: string;
  version: number;
  agreementZones: AgreementZoneDto[];
  misunderstandings: MisunderstandingDto[];
  genuineDisagreements: GenuineDisagreementDto[];
  overallConsensusScore: number;
  participantCountAtGeneration: number;
  responseCountAtGeneration: number;
  generatedAt: Date;
}
