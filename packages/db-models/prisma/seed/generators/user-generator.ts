/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * User Persona Generator
 *
 * Generates diverse user personas with realistic attributes.
 */

import { generateEnhancedUserId } from '../demo-ids.js';
import { ActivityTier, ScaleConfig, CATEGORIES } from '../config/distribution.js';
import type { AIClient } from './ai-client.js';

export interface GeneratedUserPersona {
  id: string;
  index: number;
  email: string;
  displayName: string;
  bio: string;
  cognitoSub: string;
  activityTier: ActivityTier;
  writingStyle: 'formal' | 'conversational' | 'academic' | 'passionate';
  argumentationStyle: 'evidence-based' | 'principle-driven' | 'pragmatic';
  topicInterests: string[];
  registrationOffset: number;
  activityPattern: 'consistent' | 'burst' | 'declining' | 'growing';
  passwordHash: string;
}

const WRITING_STYLES = ['formal', 'conversational', 'academic', 'passionate'] as const;
const ARGUMENTATION_STYLES = ['evidence-based', 'principle-driven', 'pragmatic'] as const;
const ACTIVITY_PATTERNS = ['consistent', 'burst', 'declining', 'growing'] as const;

// Pre-computed bcrypt hash for "DemoUser2026!"
const DEFAULT_PASSWORD_HASH = '$2b$10$dJPE1gjx.bzf1x4qtXlukOnOARg60n9eTYdpYTnXxwA/3v6EKP9wC';

export interface UserGeneratorOptions {
  aiClient?: AIClient;
  useMockData?: boolean;
}

/**
 * Generate user personas based on scale config
 */
export async function generateUserPersonas(
  config: ScaleConfig,
  options: UserGeneratorOptions = {},
): Promise<GeneratedUserPersona[]> {
  const personas: GeneratedUserPersona[] = [];
  let userIndex = 1;

  // Generate power users
  for (let i = 0; i < config.users.power; i++) {
    personas.push(createPersona(userIndex++, 'power', options));
  }

  // Generate regular users
  for (let i = 0; i < config.users.regular; i++) {
    personas.push(createPersona(userIndex++, 'regular', options));
  }

  // Generate casual users
  for (let i = 0; i < config.users.casual; i++) {
    personas.push(createPersona(userIndex++, 'casual', options));
  }

  // If AI client provided, generate richer bios
  if (options.aiClient && !options.useMockData) {
    await enrichPersonasWithAI(personas, options.aiClient);
  }

  return personas;
}

function createPersona(
  index: number,
  tier: ActivityTier,
  _options: UserGeneratorOptions,
): GeneratedUserPersona {
  const id = generateEnhancedUserId(index);
  const displayName = generateDisplayName(index);

  // Deterministic but varied selections based on index
  const writingStyle = WRITING_STYLES[index % WRITING_STYLES.length];
  const argumentationStyle = ARGUMENTATION_STYLES[index % ARGUMENTATION_STYLES.length];
  const activityPattern = ACTIVITY_PATTERNS[index % ACTIVITY_PATTERNS.length];

  // Select 2-4 topic interests based on index
  const numInterests = 2 + (index % 3);
  const topicInterests: string[] = [];
  for (let i = 0; i < numInterests; i++) {
    const catIndex = (index + i * 3) % CATEGORIES.length;
    topicInterests.push(CATEGORIES[catIndex]);
  }

  // Registration offset: power users joined earlier
  const maxOffset = 180; // 6 months
  let registrationOffset: number;
  switch (tier) {
    case 'power':
      registrationOffset = Math.floor((index / 20) * 150) + 30; // 30-180 days ago
      break;
    case 'regular':
      registrationOffset = Math.floor((index / 60) * 120) + 14; // 14-134 days ago
      break;
    case 'casual':
      registrationOffset = Math.floor((index / 120) * 90); // 0-90 days ago
      break;
  }

  return {
    id,
    index,
    email: `demo-user-${index.toString().padStart(3, '0')}@reasonbridge.demo`,
    displayName,
    bio: generateDefaultBio(displayName, tier, topicInterests),
    cognitoSub: `demo-enhanced-${index}`,
    activityTier: tier,
    writingStyle,
    argumentationStyle,
    topicInterests,
    registrationOffset: Math.min(registrationOffset, maxOffset),
    activityPattern,
    passwordHash: DEFAULT_PASSWORD_HASH,
  };
}

function generateDisplayName(index: number): string {
  // Diverse name pool
  const firstNames = [
    'Alex',
    'Jordan',
    'Taylor',
    'Morgan',
    'Casey',
    'Riley',
    'Quinn',
    'Avery',
    'Skyler',
    'Dakota',
    'Reese',
    'Finley',
    'Rowan',
    'Sage',
    'Emerson',
    'Blake',
    'Cameron',
    'Drew',
    'Jamie',
    'Kendall',
    'Logan',
    'Parker',
    'Peyton',
    'Sydney',
    'Aiden',
    'Amara',
    'Chen',
    'Davi',
    'Elena',
    'Fatima',
    'Gia',
    'Hiroshi',
    'Imani',
    'Javier',
    'Kai',
    'Leila',
    'Marco',
    'Nadia',
    'Omar',
    'Priya',
    'Raj',
    'Sana',
    'Tariq',
    'Uma',
    'Viktor',
    'Wei',
    'Xena',
    'Yuki',
    'Zara',
  ];

  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
    'Hernandez',
    'Lopez',
    'Gonzalez',
    'Wilson',
    'Anderson',
    'Thomas',
    'Taylor',
    'Moore',
    'Jackson',
    'Martin',
    'Lee',
    'Perez',
    'Thompson',
    'White',
    'Harris',
    'Sanchez',
    'Clark',
    'Ramirez',
    'Lewis',
    'Robinson',
    'Chen',
    'Kim',
    'Patel',
    'Singh',
    'Kumar',
    'Tanaka',
    'Nakamura',
    'Sato',
    'Müller',
    'Schmidt',
    'Schneider',
    'Fischer',
    'Weber',
    'Meyer',
    'Wagner',
  ];

  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];

  return `${firstName} ${lastName}`;
}

function generateDefaultBio(name: string, tier: ActivityTier, interests: string[]): string {
  const tierDescriptions = {
    power: 'Active community contributor passionate about',
    regular: 'Engaged participant interested in',
    casual: 'Curious learner exploring',
  };

  const interestList = interests.slice(0, 2).join(' and ');
  return `${tierDescriptions[tier]} ${interestList}. Believes in evidence-based discourse.`;
}

async function enrichPersonasWithAI(
  personas: GeneratedUserPersona[],
  aiClient: AIClient,
): Promise<void> {
  console.log('🤖 Enriching user bios with AI...');

  // Batch process to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < personas.length; i += batchSize) {
    const batch = personas.slice(i, i + batchSize);
    const prompts = batch.map(
      (p) =>
        `Generate a 1-2 sentence bio for a discussion platform user named "${p.displayName}". ` +
        `They are ${p.activityTier === 'power' ? 'very active' : p.activityTier === 'regular' ? 'moderately active' : 'occasionally active'}. ` +
        `Their interests include: ${p.topicInterests.join(', ')}. ` +
        `Writing style: ${p.writingStyle}. Keep it natural and brief.`,
    );

    const bios = await aiClient.generateBatch(prompts);
    batch.forEach((p, j) => {
      p.bio = bios[j];
    });

    console.log(`  Processed ${Math.min(i + batchSize, personas.length)}/${personas.length} users`);
  }
}

export default generateUserPersonas;
