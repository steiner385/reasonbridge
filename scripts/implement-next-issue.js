#!/usr/bin/env node

/**
 * Enhanced Implement Next Issue Command
 *
 * This script implements the next highest priority GitHub issue using a refined
 * multi-factor prioritization strategy. It integrates with the granular prioritization
 * system to ensure the most critical issues are addressed first.
 *
 * Features:
 * - Multi-factor priority scoring (P0 system, labels, age, engagement)
 * - Automatic branch creation and checkout
 * - Issue assignment
 * - Progress tracking
 * - Integration with custom prioritization weights
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import priority calculation logic
const PRIORITY_WEIGHTS = {
  labels: {
    P0: 1000,
    critical: 500,
    'high-priority': 300,
    bug: 200,
    security: 400,
    performance: 150,
    accessibility: 180,
    'test-failure': 250,
    regression: 350,
    blocker: 600,
    'needs-attention': 100,
    'quick-win': 50,
    documentation: 30,
    enhancement: 40,
    'good-first-issue': 20,
  },
  age: {
    factor: 2,
    max: 200,
  },
  comments: {
    factor: 10,
    max: 100,
  },
  milestone: {
    overdue: 300,
    upcoming: 150,
    none: -50,
  },
  p0Priority: {
    multiplier: 10,
  },
};

function extractP0Priority(issue) {
  const p0Pattern = /\[?P0\.(\d+)\]?/i;
  const titleMatch = issue.title.match(p0Pattern);
  if (titleMatch) return parseFloat(titleMatch[1]);
  const bodyMatch = issue.body?.match(p0Pattern);
  if (bodyMatch) return parseFloat(bodyMatch[1]);
  return null;
}

function calculatePriorityScore(issue) {
  let score = 0;

  // P0.X priority
  const p0Priority = extractP0Priority(issue);
  if (p0Priority !== null) {
    score += (100 - p0Priority) * PRIORITY_WEIGHTS.p0Priority.multiplier;
  }

  // Label scoring
  issue.labels.forEach((label) => {
    const labelName = typeof label === 'string' ? label : label.name;
    score += PRIORITY_WEIGHTS.labels[labelName.toLowerCase()] || 0;
  });

  // Age scoring
  const ageInDays = Math.floor((Date.now() - new Date(issue.createdAt)) / (1000 * 60 * 60 * 24));
  score += Math.min(ageInDays * PRIORITY_WEIGHTS.age.factor, PRIORITY_WEIGHTS.age.max);

  // Comment scoring
  score += Math.min(
    issue.comments * PRIORITY_WEIGHTS.comments.factor,
    PRIORITY_WEIGHTS.comments.max,
  );

  // Unassigned bonus
  if (!issue.assignees || issue.assignees.length === 0) {
    score += 50;
  }

  return score;
}

function getCurrentUser() {
  try {
    const result = execSync('gh api user --jq .login', { encoding: 'utf-8' });
    return result.trim();
  } catch (error) {
    console.error('Failed to get current user:', error.message);
    return null;
  }
}

function findNextIssue() {
  try {
    console.log('🔍 Fetching unassigned issues...');

    // Fetch all open, unassigned issues
    const result = execSync(
      'gh issue list --state open --assignee "" --limit 200 --json number,title,labels,assignees,createdAt,updatedAt,comments,milestone,body',
      { encoding: 'utf-8' },
    );

    const issues = JSON.parse(result);

    if (issues.length === 0) {
      console.log('❌ No unassigned issues found.');
      return null;
    }

    console.log(`📊 Found ${issues.length} unassigned issues. Calculating priorities...`);

    // Calculate priority for each issue
    const prioritized = issues
      .map((issue) => ({
        ...issue,
        priorityScore: calculatePriorityScore(issue),
        p0Priority: extractP0Priority(issue),
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore);

    // Show top 10 candidates
    console.log('\n📈 Top 10 Priority Issues:');
    console.log('─'.repeat(80));

    prioritized.slice(0, 10).forEach((issue, index) => {
      const p0 = issue.p0Priority !== null ? `[P0.${issue.p0Priority}] ` : '';
      const labels = issue.labels.map((l) => (typeof l === 'string' ? l : l.name)).join(', ');
      console.log(`${index + 1}. ${p0}#${issue.number}: ${issue.title}`);
      console.log(`   Score: ${issue.priorityScore.toFixed(0)} | Labels: ${labels}`);
      console.log('');
    });

    console.log('─'.repeat(80));

    // Return the highest priority issue
    return prioritized[0];
  } catch (error) {
    console.error('❌ Failed to fetch issues:', error.message);
    return null;
  }
}

function createBranch(issueNumber, issueTitle) {
  // Create a branch name from the issue
  const cleanTitle = issueTitle
    .toLowerCase()
    .replace(/\[p0\.\d+\]/gi, '') // Remove P0 tags
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);

  const branchName = `fix/issue-${issueNumber}-${cleanTitle}`;

  try {
    // Check if we're on main/master
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    if (currentBranch !== 'main' && currentBranch !== 'master') {
      console.log(`⚠️  Not on main branch. Current branch: ${currentBranch}`);
      console.log('Switching to main...');
      execSync('git checkout main');
    }

    // Pull latest changes
    console.log('🔄 Pulling latest changes...');
    execSync('git pull origin main');

    // Create and checkout new branch
    console.log(`🌿 Creating branch: ${branchName}`);
    execSync(`git checkout -b ${branchName}`);

    return branchName;
  } catch (error) {
    console.error('❌ Failed to create branch:', error.message);
    return null;
  }
}

function assignIssue(issueNumber, username) {
  try {
    console.log(`👤 Assigning issue #${issueNumber} to @${username}...`);
    execSync(`gh issue edit ${issueNumber} --add-assignee ${username}`);
    console.log('✅ Issue assigned successfully');
    return true;
  } catch (error) {
    console.error('⚠️  Failed to assign issue:', error.message);
    return false;
  }
}

function generateImplementationPlan(issue) {
  const p0 = extractP0Priority(issue);
  const labels = issue.labels.map((l) => (typeof l === 'string' ? l : l.name));

  console.log('\n📝 Implementation Plan:');
  console.log('─'.repeat(80));

  if (p0 !== null) {
    console.log(`🎯 P0.${p0} Priority Issue`);

    if (p0 <= 5) {
      console.log('⚠️  CRITICAL: Test Infrastructure Issue');
      console.log('   This must be fixed before implementing new features!');
    } else if (p0 <= 10) {
      console.log('🔧 Core Module Implementation');
      console.log('   This blocks feature development.');
    } else if (p0 <= 15) {
      console.log('✨ Feature Completion');
    } else {
      console.log('🏗️  Architecture & Polish');
    }
  }

  console.log('\n📋 Issue Details:');
  console.log(`   Number: #${issue.number}`);
  console.log(`   Title: ${issue.title}`);
  console.log(`   Labels: ${labels.join(', ')}`);
  console.log(`   Priority Score: ${issue.priorityScore.toFixed(0)}`);

  if (issue.body) {
    console.log('\n📄 Description:');
    console.log(
      issue.body
        .split('\n')
        .slice(0, 10)
        .map((line) => '   ' + line)
        .join('\n'),
    );
    if (issue.body.split('\n').length > 10) {
      console.log('   [... truncated ...]');
    }
  }

  console.log('\n🔨 Next Steps:');
  console.log('1. Analyze the issue requirements');
  console.log('2. Search for related code using semantic search');
  console.log('3. Implement the solution');
  console.log('4. Write/update tests');
  console.log('5. Run tests to verify');
  console.log('6. Commit and create PR');
  console.log('7. Merge PR to complete');

  console.log('─'.repeat(80));
}

async function main() {
  console.log('🚀 Enhanced Implement Next Issue Command');
  console.log('======================================\n');

  // Get current user
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.error('❌ Could not determine current GitHub user');
    return;
  }

  // Find next issue
  const nextIssue = findNextIssue();
  if (!nextIssue) {
    console.log('✅ No issues to implement!');
    return;
  }

  // Confirm selection
  console.log(`\n🎯 Selected Issue #${nextIssue.number}: ${nextIssue.title}`);
  console.log(`Priority Score: ${nextIssue.priorityScore.toFixed(0)}`);

  // Create branch
  const branchName = createBranch(nextIssue.number, nextIssue.title);
  if (!branchName) {
    console.error('❌ Failed to create branch');
    return;
  }

  // Assign issue
  assignIssue(nextIssue.number, currentUser);

  // Generate implementation plan
  generateImplementationPlan(nextIssue);

  // Save issue context for reference
  const contextPath = path.join(__dirname, '..', '.current-issue.json');
  fs.writeFileSync(
    contextPath,
    JSON.stringify(
      {
        number: nextIssue.number,
        title: nextIssue.title,
        branch: branchName,
        startedAt: new Date().toISOString(),
        priority: nextIssue.priorityScore,
        p0Priority: nextIssue.p0Priority,
      },
      null,
      2,
    ),
  );

  console.log('\n✅ Ready to implement! Issue context saved to .current-issue.json');
  console.log(`\n💡 Tip: Use 'gh issue view ${nextIssue.number}' to see full issue details`);
}

// Run the script
main().catch(console.error);
