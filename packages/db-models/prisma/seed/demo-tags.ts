/**
 * Demo Tag Definitions
 *
 * Defines 10 tags for categorizing demo topics.
 * Tags enable topic discovery and filtering during demos.
 */

import { DEMO_TAG_IDS } from './demo-ids';

export interface DemoTag {
  id: string;
  name: string;
  slug: string;
  aiSynonyms: string[];
  description: string; // For demo display purposes (not in DB)
  color: string; // For demo display purposes (not in DB)
}

export const DEMO_TAGS: DemoTag[] = [
  {
    id: DEMO_TAG_IDS.ENVIRONMENT,
    name: 'Environment',
    slug: 'environment',
    aiSynonyms: ['climate', 'sustainability', 'ecology', 'green'],
    description: 'Climate, sustainability, and environmental policy',
    color: '#22c55e', // green-500
  },
  {
    id: DEMO_TAG_IDS.TECHNOLOGY,
    name: 'Technology',
    slug: 'technology',
    aiSynonyms: ['tech', 'AI', 'digital', 'software', 'computing'],
    description: 'AI, digital transformation, and tech policy',
    color: '#3b82f6', // blue-500
  },
  {
    id: DEMO_TAG_IDS.EDUCATION,
    name: 'Education',
    slug: 'education',
    aiSynonyms: ['schools', 'learning', 'teaching', 'academia'],
    description: 'Schools, learning, and educational policy',
    color: '#f59e0b', // amber-500
  },
  {
    id: DEMO_TAG_IDS.ECONOMY,
    name: 'Economy',
    slug: 'economy',
    aiSynonyms: ['economics', 'finance', 'markets', 'jobs', 'work'],
    description: 'Jobs, markets, and economic policy',
    color: '#8b5cf6', // violet-500
  },
  {
    id: DEMO_TAG_IDS.HEALTHCARE,
    name: 'Healthcare',
    slug: 'healthcare',
    aiSynonyms: ['health', 'medical', 'medicine', 'hospitals'],
    description: 'Medical care, public health, and health policy',
    color: '#ef4444', // red-500
  },
  {
    id: DEMO_TAG_IDS.ETHICS,
    name: 'Ethics',
    slug: 'ethics',
    aiSynonyms: ['morality', 'values', 'principles', 'integrity'],
    description: 'Moral questions and ethical frameworks',
    color: '#ec4899', // pink-500
  },
  {
    id: DEMO_TAG_IDS.GOVERNMENT,
    name: 'Government',
    slug: 'government',
    aiSynonyms: ['politics', 'policy', 'civic', 'democracy', 'legislation'],
    description: 'Governance, democracy, and political systems',
    color: '#6366f1', // indigo-500
  },
  {
    id: DEMO_TAG_IDS.BUSINESS,
    name: 'Business',
    slug: 'business',
    aiSynonyms: ['corporate', 'enterprise', 'commerce', 'industry'],
    description: 'Corporate practices and business policy',
    color: '#14b8a6', // teal-500
  },
  {
    id: DEMO_TAG_IDS.SCIENCE,
    name: 'Science',
    slug: 'science',
    aiSynonyms: ['research', 'scientific', 'laboratory', 'discovery'],
    description: 'Research, scientific method, and science policy',
    color: '#06b6d4', // cyan-500
  },
  {
    id: DEMO_TAG_IDS.SOCIETY,
    name: 'Society',
    slug: 'society',
    aiSynonyms: ['social', 'community', 'culture', 'people'],
    description: 'Social issues, culture, and community',
    color: '#f97316', // orange-500
  },
];

/**
 * Get a tag by its ID
 */
export function getTagById(id: string): DemoTag | undefined {
  return DEMO_TAGS.find((t) => t.id === id);
}

/**
 * Get a tag by its name
 */
export function getTagByName(name: string): DemoTag | undefined {
  return DEMO_TAGS.find((t) => t.name.toLowerCase() === name.toLowerCase());
}

export default DEMO_TAGS;
