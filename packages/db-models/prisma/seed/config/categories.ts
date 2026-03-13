/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Category definitions for enhanced demo seed data
 */

export interface CategoryDefinition {
  name: string;
  slug: string;
  description: string;
  topicPrompts: {
    evergreen: string[];
    current: string[];
    emerging: string[];
  };
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    name: 'Technology & Innovation',
    slug: 'technology-innovation',
    description: 'Digital transformation, AI, software, hardware, and emerging tech',
    topicPrompts: {
      evergreen: ['privacy vs convenience', 'open source vs proprietary', 'automation and jobs'],
      current: ['AI regulation', 'social media algorithms', 'cryptocurrency adoption'],
      emerging: ['brain-computer interfaces', 'quantum computing ethics', 'AGI safety'],
    },
  },
  {
    name: 'Environment & Climate',
    slug: 'environment-climate',
    description: 'Climate change, sustainability, conservation, and environmental policy',
    topicPrompts: {
      evergreen: [
        'economic growth vs environment',
        'individual vs systemic change',
        'nuclear energy',
      ],
      current: ['carbon pricing', 'EV mandates', 'renewable energy subsidies'],
      emerging: ['geoengineering ethics', 'climate migration rights', 'ocean farming'],
    },
  },
  {
    name: 'Healthcare & Medicine',
    slug: 'healthcare-medicine',
    description: 'Medical ethics, healthcare systems, public health, and medical technology',
    topicPrompts: {
      evergreen: ['universal healthcare', 'end-of-life decisions', 'organ donation'],
      current: ['vaccine mandates', 'telehealth expansion', 'drug pricing'],
      emerging: ['genetic enhancement', 'AI diagnostics liability', 'longevity treatments'],
    },
  },
  {
    name: 'Education & Learning',
    slug: 'education-learning',
    description: 'Educational systems, pedagogy, academic freedom, and lifelong learning',
    topicPrompts: {
      evergreen: ['standardized testing', 'school choice', 'liberal arts value'],
      current: ['student debt', 'remote learning', 'curriculum debates'],
      emerging: ['AI tutoring', 'micro-credentials', 'VR classrooms'],
    },
  },
  {
    name: 'Economics & Business',
    slug: 'economics-business',
    description: 'Economic policy, labor markets, corporate governance, and trade',
    topicPrompts: {
      evergreen: ['minimum wage', 'wealth inequality', 'free trade'],
      current: ['remote work policies', 'gig economy', 'antitrust enforcement'],
      emerging: ['four-day workweek', 'UBI pilots', 'stakeholder capitalism'],
    },
  },
  {
    name: 'Politics & Governance',
    slug: 'politics-governance',
    description: 'Political systems, voting, representation, and civic engagement',
    topicPrompts: {
      evergreen: ['electoral reform', 'term limits', 'federalism'],
      current: ['voting access', 'campaign finance', 'partisan gerrymandering'],
      emerging: ['digital democracy', 'AI in governance', 'citizen assemblies'],
    },
  },
  {
    name: 'Science & Research',
    slug: 'science-research',
    description: 'Scientific method, research ethics, funding, and science communication',
    topicPrompts: {
      evergreen: ['peer review', 'research funding', 'science communication'],
      current: ['gain-of-function research', 'reproducibility crisis', 'preprints'],
      emerging: ['AI-assisted research', 'open science mandates', 'citizen science'],
    },
  },
  {
    name: 'Ethics & Society',
    slug: 'ethics-society',
    description: 'Moral philosophy, social norms, cultural values, and ethical dilemmas',
    topicPrompts: {
      evergreen: ['free speech limits', 'privacy rights', 'moral relativism'],
      current: ['cancel culture', 'content moderation', 'algorithmic fairness'],
      emerging: ['AI rights', 'digital afterlife', 'synthetic media ethics'],
    },
  },
  {
    name: 'Law & Justice',
    slug: 'law-justice',
    description: 'Legal systems, criminal justice, rights, and legal reform',
    topicPrompts: {
      evergreen: ['death penalty', 'drug legalization', 'judicial independence'],
      current: ['police reform', 'prison reform', 'surveillance law'],
      emerging: ['AI judges', 'algorithmic sentencing', 'digital evidence standards'],
    },
  },
  {
    name: 'Media & Communication',
    slug: 'media-communication',
    description: 'Journalism, social media, information quality, and media ethics',
    topicPrompts: {
      evergreen: ['media bias', 'press freedom', 'advertising ethics'],
      current: ['misinformation', 'platform liability', 'local news decline'],
      emerging: ['AI-generated news', 'deepfake regulation', 'attention economy'],
    },
  },
  {
    name: 'Arts & Culture',
    slug: 'arts-culture',
    description: 'Creative expression, cultural heritage, arts funding, and cultural policy',
    topicPrompts: {
      evergreen: ['arts funding', 'cultural appropriation', 'censorship in art'],
      current: ['AI art copyright', 'museum repatriation', 'streaming economics'],
      emerging: ['NFT art', 'virtual museums', 'AI creativity'],
    },
  },
  {
    name: 'International Relations',
    slug: 'international-relations',
    description: 'Diplomacy, global governance, international law, and geopolitics',
    topicPrompts: {
      evergreen: ['humanitarian intervention', 'UN reform', 'sovereignty'],
      current: ['sanctions effectiveness', 'alliance systems', 'trade wars'],
      emerging: ['space governance', 'cyber warfare rules', 'climate refugees'],
    },
  },
  {
    name: 'Philosophy & Logic',
    slug: 'philosophy-logic',
    description: 'Philosophical inquiry, logical reasoning, epistemology, and metaphysics',
    topicPrompts: {
      evergreen: ['free will', 'consciousness', 'moral realism'],
      current: ['epistemic humility', 'tribal epistemology', 'expertise trust'],
      emerging: ['machine consciousness', 'simulation hypothesis', 'post-truth'],
    },
  },
  {
    name: 'Personal Finance',
    slug: 'personal-finance',
    description: 'Financial literacy, investing, retirement, and economic security',
    topicPrompts: {
      evergreen: ['debt vs investing', 'home ownership', 'retirement age'],
      current: ['inflation strategies', 'crypto investing', 'financial education'],
      emerging: ['AI financial advisors', 'programmable money', 'wealth taxes'],
    },
  },
  {
    name: 'Sports & Recreation',
    slug: 'sports-recreation',
    description: 'Athletics, leisure, competition, and sports policy',
    topicPrompts: {
      evergreen: ['youth sports', 'performance enhancement', 'amateur vs pro'],
      current: ['athlete compensation', 'esports recognition', 'sports betting'],
      emerging: ['genetic advantages', 'AI coaching', 'virtual sports'],
    },
  },
];

export function getCategoryBySlug(slug: string): CategoryDefinition | undefined {
  return CATEGORY_DEFINITIONS.find((c) => c.slug === slug);
}

export function getCategoryIndex(name: string): number {
  return CATEGORY_DEFINITIONS.findIndex((c) => c.name === name);
}
