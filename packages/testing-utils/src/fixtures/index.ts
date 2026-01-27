/**
 * Test fixture factories for common domain objects
 */

import { generateId } from '@reason-bridge/common';
import type {
  User,
  UserProfile,
  UserId,
  DiscordId,
  UserRole,
  Discussion,
  DiscussionId,
  DiscussionStatus,
  DiscussionTopic,
  Contribution,
  ContributionId,
} from '@reason-bridge/common';

/**
 * Counter for generating sequential IDs in tests
 */
let fixtureCounter = 0;

/**
 * Reset the fixture counter (useful between test suites)
 */
export function resetFixtureCounter(): void {
  fixtureCounter = 0;
}

/**
 * Get next sequential number for fixtures
 */
export function nextSequence(): number {
  return ++fixtureCounter;
}

/**
 * Create a test user with default or custom values
 */
export function createUser(overrides: Partial<User> = {}): User {
  const seq = nextSequence();
  const now = new Date();
  return {
    id: overrides.id ?? generateId('usr'),
    discordId: overrides.discordId ?? `discord_${seq}`,
    username: overrides.username ?? `testuser${seq}`,
    role: overrides.role ?? 'participant',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

/**
 * Create a test user profile with default or custom values
 */
export function createUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  const user = createUser(overrides);
  return {
    ...user,
    displayName: overrides.displayName ?? null,
    avatarUrl: overrides.avatarUrl ?? null,
    bio: overrides.bio ?? null,
    participationScore: overrides.participationScore ?? 0,
  };
}

/**
 * Create a batch of test users
 */
export function createUsers(count: number, overrides: Partial<User> = {}): User[] {
  return Array.from({ length: count }, () => createUser(overrides));
}

/**
 * Create a test discussion topic
 */
export function createDiscussionTopic(overrides: Partial<DiscussionTopic> = {}): DiscussionTopic {
  const seq = nextSequence();
  return {
    id: overrides.id ?? generateId('topic'),
    name: overrides.name ?? `Test Topic ${seq}`,
    description: overrides.description ?? `Description for test topic ${seq}`,
  };
}

/**
 * Create a test discussion with default or custom values
 */
export function createDiscussion(overrides: Partial<Discussion> = {}): Discussion {
  const seq = nextSequence();
  const now = new Date();
  return {
    id: overrides.id ?? generateId('disc'),
    title: overrides.title ?? `Test Discussion ${seq}`,
    description: overrides.description ?? `Description for test discussion ${seq}`,
    topic: overrides.topic ?? createDiscussionTopic(),
    status: overrides.status ?? 'active',
    createdBy: overrides.createdBy ?? generateId('usr'),
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

/**
 * Create a batch of test discussions
 */
export function createDiscussions(
  count: number,
  overrides: Partial<Discussion> = {},
): Discussion[] {
  return Array.from({ length: count }, () => createDiscussion(overrides));
}

/**
 * Create a test contribution with default or custom values
 */
export function createContribution(overrides: Partial<Contribution> = {}): Contribution {
  const seq = nextSequence();
  const now = new Date();
  return {
    id: overrides.id ?? generateId('contrib'),
    discussionId: overrides.discussionId ?? generateId('disc'),
    authorId: overrides.authorId ?? generateId('usr'),
    content: overrides.content ?? `Test contribution content ${seq}`,
    parentId: overrides.parentId ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

/**
 * Create a batch of test contributions
 */
export function createContributions(
  count: number,
  overrides: Partial<Contribution> = {},
): Contribution[] {
  return Array.from({ length: count }, () => createContribution(overrides));
}

/**
 * Create a threaded conversation structure for testing
 */
export function createThreadedContributions(
  discussionId: DiscussionId,
  structure: { depth: number; breadth: number },
): Contribution[] {
  const contributions: Contribution[] = [];

  function createThread(parentId: ContributionId | null, depth: number): void {
    if (depth <= 0) return;

    for (let i = 0; i < structure.breadth; i++) {
      const contribution = createContribution({
        discussionId,
        parentId,
      });
      contributions.push(contribution);
      createThread(contribution.id, depth - 1);
    }
  }

  createThread(null, structure.depth);
  return contributions;
}

/**
 * Fixture builder for complex test scenarios
 */
export class FixtureBuilder {
  private users: User[] = [];
  private discussions: Discussion[] = [];
  private contributions: Contribution[] = [];

  withUser(overrides: Partial<User> = {}): this {
    this.users.push(createUser(overrides));
    return this;
  }

  withUsers(count: number, overrides: Partial<User> = {}): this {
    this.users.push(...createUsers(count, overrides));
    return this;
  }

  withDiscussion(overrides: Partial<Discussion> = {}): this {
    const createdBy = this.users[0]?.id ?? generateId('usr');
    this.discussions.push(createDiscussion({ createdBy, ...overrides }));
    return this;
  }

  withContribution(overrides: Partial<Contribution> = {}): this {
    const discussionId = this.discussions[0]?.id ?? generateId('disc');
    const authorId = this.users[0]?.id ?? generateId('usr');
    this.contributions.push(createContribution({ discussionId, authorId, ...overrides }));
    return this;
  }

  build(): {
    users: User[];
    discussions: Discussion[];
    contributions: Contribution[];
  } {
    return {
      users: this.users,
      discussions: this.discussions,
      contributions: this.contributions,
    };
  }
}

/**
 * Create a new fixture builder
 */
export function fixtures(): FixtureBuilder {
  return new FixtureBuilder();
}
