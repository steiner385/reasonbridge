/**
 * T007 - Phase 2 Migration Backfill Script (Feature 009)
 *
 * Purpose: Link existing responses to discussions
 *
 * Strategy:
 * 1. For each DiscussionTopic, create one Discussion with the topic's title
 * 2. Link all existing responses under that topic to the new Discussion
 * 3. Update Discussion metrics (responseCount, participantCount, lastActivityAt)
 *
 * Prerequisites:
 * - Phase 1 migration must be applied (nullable discussionId field exists)
 * - Database backup recommended before running
 *
 * Run with: npx tsx scripts/backfill-discussions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BackfillStats {
  topicsProcessed: number;
  discussionsCreated: number;
  responsesLinked: number;
  participantActivitiesCreated: number;
  errors: string[];
}

async function backfillDiscussions(): Promise<BackfillStats> {
  const stats: BackfillStats = {
    topicsProcessed: 0,
    discussionsCreated: 0,
    responsesLinked: 0,
    participantActivitiesCreated: 0,
    errors: [],
  };

  console.log('🚀 Starting Discussion backfill...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Fetch all topics with their responses
    const topics = await prisma.discussionTopic.findMany({
      include: {
        responses: {
          where: {
            discussionId: null, // Only backfill responses not yet linked
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        creator: true,
      },
    });

    console.log(`📊 Found ${topics.length} topics to process`);

    for (const topic of topics) {
      console.log(`\n📝 Processing topic: "${topic.title}" (${topic.id})`);

      if (topic.responses.length === 0) {
        console.log('   ⏭️  No responses to backfill, skipping...');
        stats.topicsProcessed++;
        continue;
      }

      try {
        // Create one Discussion per topic
        const discussion = await prisma.discussion.create({
          data: {
            topicId: topic.id,
            creatorId: topic.creatorId,
            title: topic.title,
            status: 'ACTIVE',
            responseCount: topic.responses.length,
            participantCount: 0, // Will calculate below
            lastActivityAt: topic.responses[topic.responses.length - 1]?.createdAt || new Date(),
          },
        });

        console.log(`   ✅ Created discussion ${discussion.id}`);
        stats.discussionsCreated++;

        // Link all responses to this discussion
        const responseIds = topic.responses.map((r) => r.id);
        const updateResult = await prisma.response.updateMany({
          where: {
            id: { in: responseIds },
          },
          data: {
            discussionId: discussion.id,
          },
        });

        console.log(`   📌 Linked ${updateResult.count} responses to discussion`);
        stats.responsesLinked += updateResult.count;

        // Calculate unique participants
        const participants = await prisma.response.groupBy({
          by: ['authorId'],
          where: {
            discussionId: discussion.id,
          },
          _count: {
            id: true,
          },
          _min: {
            createdAt: true,
          },
          _max: {
            createdAt: true,
          },
        });

        // Create ParticipantActivity records
        const participantActivities = participants.map((p) => ({
          discussionId: discussion.id,
          userId: p.authorId,
          firstContributionAt: p._min.createdAt!,
          lastContributionAt: p._max.createdAt!,
          responseCount: p._count.id,
        }));

        await prisma.participantActivity.createMany({
          data: participantActivities,
          skipDuplicates: true,
        });

        console.log(`   👥 Created ${participants.length} participant activity records`);
        stats.participantActivitiesCreated += participants.length;

        // Update discussion participant count
        await prisma.discussion.update({
          where: { id: discussion.id },
          data: {
            participantCount: participants.length,
          },
        });

        stats.topicsProcessed++;
        console.log(`   ✓ Topic processing complete`);
      } catch (error) {
        const errorMsg = `Failed to process topic ${topic.id}: ${error}`;
        console.error(`   ❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
        // Continue with next topic
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Backfill complete!');
    console.log('\n📊 Statistics:');
    console.log(`   Topics processed: ${stats.topicsProcessed}/${topics.length}`);
    console.log(`   Discussions created: ${stats.discussionsCreated}`);
    console.log(`   Responses linked: ${stats.responsesLinked}`);
    console.log(`   Participant activities created: ${stats.participantActivitiesCreated}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    return stats;
  } catch (error) {
    console.error('\n❌ Fatal error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Validation function to check backfill results
async function validateBackfill(): Promise<boolean> {
  console.log('\n🔍 Validating backfill results...');

  try {
    // Check for orphaned responses (responses without discussionId after backfill)
    const orphanedCount = await prisma.response.count({
      where: {
        discussionId: null,
      },
    });

    if (orphanedCount > 0) {
      console.error(`❌ Found ${orphanedCount} orphaned responses (null discussionId)`);
      return false;
    }

    // Check that discussion counts match actual response counts
    const discussions = await prisma.discussion.findMany({
      include: {
        _count: {
          select: {
            responses: true,
            participantActivities: true,
          },
        },
      },
    });

    let countMismatches = 0;
    for (const discussion of discussions) {
      if (discussion.responseCount !== discussion._count.responses) {
        console.error(
          `❌ Discussion ${discussion.id} count mismatch: ` +
            `stored=${discussion.responseCount}, actual=${discussion._count.responses}`,
        );
        countMismatches++;
      }
      if (discussion.participantCount !== discussion._count.participantActivities) {
        console.error(
          `❌ Discussion ${discussion.id} participant count mismatch: ` +
            `stored=${discussion.participantCount}, actual=${discussion._count.participantActivities}`,
        );
        countMismatches++;
      }
    }

    if (countMismatches > 0) {
      console.error(`❌ Found ${countMismatches} count mismatches`);
      return false;
    }

    console.log('✅ Validation passed! All responses linked, counts accurate.');
    return true;
  } catch (error) {
    console.error('❌ Validation error:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
if (require.main === module) {
  backfillDiscussions()
    .then((stats) => {
      if (stats.errors.length > 0) {
        console.log('\n⚠️  Backfill completed with errors. Review errors above.');
        process.exit(1);
      }

      // Run validation
      return validateBackfill();
    })
    .then((valid) => {
      if (!valid) {
        console.error('\n❌ Validation failed. Manual intervention required.');
        process.exit(1);
      }
      console.log('\n✨ Backfill and validation successful!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Backfill failed:', error);
      process.exit(1);
    });
}

export { backfillDiscussions, validateBackfill };
