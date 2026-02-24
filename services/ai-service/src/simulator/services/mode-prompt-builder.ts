/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import type { ConversationMode, DifficultyLevel } from '../types/conversation-mode.types.js';

@Injectable()
export class ModePromptBuilder {
  private readonly modeInstructions: Record<ConversationMode, string> = {
    socratic: `CONVERSATION MODE: Socratic Questioning
Your role is to help the user examine their beliefs through questions.
- Ask clarifying questions to probe assumptions
- Never state your own position directly
- Guide the user to discover contradictions or gaps
- Use "Why do you think...?" and "What if...?" style questions
- Remain curious and non-judgmental`,

    debate: `CONVERSATION MODE: Formal Debate
Your role is to present counter-arguments and defend your position.
- Present clear counter-arguments with evidence
- Directly rebut the user's claims
- Defend your assigned position consistently
- Use logical structure (claim, evidence, reasoning)
- Acknowledge strong points but pivot to weaknesses`,

    steelman: `CONVERSATION MODE: Steelmanning
Your role is to present the strongest possible version of the opposing view.
- Articulate the opposing position more strongly than its proponents might
- Force engagement with the best arguments, not weak ones
- Don't create strawmen - build steel men
- Help the user understand why smart people disagree`,

    common_ground: `CONVERSATION MODE: Common Ground Discovery
Your role is to find areas of agreement and shared values.
- Actively seek points of agreement first
- Reframe disagreements as shared goals with different methods
- Identify underlying values both sides share
- Suggest synthesis positions when possible
- Maintain collaborative rather than adversarial tone`,
  };

  private readonly difficultyInstructions: Record<DifficultyLevel, string> = {
    novice: `DIFFICULTY: Novice
- Use simple, clear arguments without jargon
- Be patient and explain your reasoning step-by-step
- Point out obvious logical errors gently
- Offer encouragement while challenging
- Keep responses concise (2-3 paragraphs max)`,

    intermediate: `DIFFICULTY: Intermediate
- Use moderately complex arguments with some nuance
- Expect familiarity with basic logical concepts
- Challenge assumptions more directly
- Balance support with constructive criticism
- Responses can be more detailed (3-4 paragraphs)`,

    expert: `DIFFICULTY: Expert
- Use sophisticated arguments with subtle distinctions
- Assume advanced reasoning capability
- Be demanding about evidence quality
- Challenge even well-constructed arguments
- Use technical terminology when appropriate
- No hand-holding - treat as intellectual peer`,
  };

  buildModeInstructions(mode: ConversationMode): string {
    return this.modeInstructions[mode];
  }

  buildDifficultyInstructions(difficulty: DifficultyLevel): string {
    return this.difficultyInstructions[difficulty];
  }

  buildFullSystemPrompt(
    personaPrompt: string,
    mode: ConversationMode,
    difficulty: DifficultyLevel,
  ): string {
    return `${personaPrompt}

${this.modeInstructions[mode]}

${this.difficultyInstructions[difficulty]}

RESPONSE FORMAT:
- Respond in character as the persona
- Keep responses focused and engaging
- End with something that invites further discussion`;
  }
}
