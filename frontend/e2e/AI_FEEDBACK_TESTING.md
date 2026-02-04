# AI Feedback Accuracy Testing

Manual smoke tests for verifying Bedrock-powered AI feedback quality.

## Overview

These tests verify that the AI-powered feedback endpoint catches nuanced issues that regex patterns miss, such as:

- Subtle dismissiveness and condescension
- Sarcasm and passive-aggressiveness
- Logical fallacies (strawman, false dichotomy)
- Unsourced statistical claims
- Context-dependent tone problems

**Important:** These tests are **NOT** meant for CI. They:

- Call AWS Bedrock (costs money)
- Take 2-10 seconds per test
- Require AWS credentials
- Are marked with `@ai` tag

## Prerequisites

1. **E2E environment running** with AWS Bedrock access:

   ```bash
   cd /mnt/ssk-ssd/tony/GitHub/reasonbridge2
   docker compose -f docker-compose.e2e.yml up -d
   ```

2. **AWS credentials** configured in `~/.aws/credentials`

3. **AI service** using cross-region inference profile:
   ```yaml
   # docker-compose.e2e.yml
   ai-service:
     environment:
       BEDROCK_MODEL_ID: us.anthropic.claude-3-5-sonnet-20241022-v2:0
       AWS_REGION: us-east-1
   ```

## Running Tests

### Run All AI Accuracy Tests

```bash
cd frontend
E2E_DOCKER=true PLAYWRIGHT_BASE_URL=http://localhost:9080 \
  npx playwright test ai-feedback-accuracy.spec.ts --project=chromium
```

### Run Specific Test Suite

```bash
# Nuanced tone detection
npx playwright test ai-feedback-accuracy.spec.ts:11 --project=chromium

# Performance comparison (regex vs AI)
npx playwright test ai-feedback-accuracy.spec.ts:100 --project=chromium

# Edge cases
npx playwright test ai-feedback-accuracy.spec.ts:150 --project=chromium
```

### Run with UI (Debug Mode)

```bash
E2E_DOCKER=true PLAYWRIGHT_BASE_URL=http://localhost:9080 \
  npx playwright test ai-feedback-accuracy.spec.ts --project=chromium --ui
```

## Test Categories

### 1. Nuanced Tone Detection

Tests that verify AI catches subtle issues:

| Test                    | Input                                                | Expected Detection   |
| ----------------------- | ---------------------------------------------------- | -------------------- |
| Dismissiveness          | "Clearly you don't understand basic economics..."    | INFLAMMATORY/HOSTILE |
| Condescension           | "Let me explain this to you in simple terms..."      | Condescending tone   |
| Third-person attacks    | "These people are really stupid..."                  | INFLAMMATORY         |
| Respectful disagreement | "I respectfully disagree..."                         | AFFIRMATION or Ready |
| Strawman fallacy        | "So you're saying we should just give free money..." | FALLACY (strawman)   |
| Unsourced claims        | "75% of economists agree..."                         | UNSOURCED            |

### 2. Performance Comparison

Tests that verify hybrid approach works correctly:

| Metric                  | Regex  | AI    |
| ----------------------- | ------ | ----- |
| Response time           | <500ms | 2-10s |
| Catches obvious attacks | ✅     | ✅    |
| Catches nuanced tone    | ❌     | ✅    |
| Catches fallacies       | ❌     | ✅    |

### 3. Edge Cases

- Sarcasm and passive-aggressiveness
- Long, well-reasoned arguments (should NOT flag)
- False dichotomy fallacies
- Consistency across identical content

## Expected Results

### Should Flag (INFLAMMATORY/FALLACY/UNSOURCED):

- "Clearly you don't understand basic economics"
- "Anyone with half a brain can see..."
- "These people are really stupid"
- "So you're saying..." (strawman)
- "75% of economists agree" (no source)

### Should NOT Flag (AFFIRMATION or Ready):

- "I respectfully disagree with this perspective..."
- "While I understand the concerns raised..."
- "I believe there are alternative approaches..."
- Well-sourced arguments with citations

## Debugging Failed Tests

### AI not flagging obvious issues

1. Check AI service logs:

   ```bash
   docker logs reasonbridge2-ai-service-1 --tail 50
   ```

2. Test AI endpoint directly:

   ```bash
   curl -X POST http://localhost:3002/feedback/preview/ai \
     -H "Content-Type: application/json" \
     -d '{"content": "these people are really stupid"}' | jq
   ```

3. Verify Bedrock model ID:
   ```bash
   docker exec reasonbridge2-ai-service-1 env | grep BEDROCK_MODEL_ID
   # Should show: us.anthropic.claude-3-5-sonnet-20241022-v2:0
   ```

### AI flagging false positives

If AI flags respectful content as problematic:

1. Review the confidence score (should be high for true issues)
2. Check the reasoning provided
3. Consider adjusting sensitivity level
4. May need prompt tuning in `feedback.service.ts`

### Timeout errors

If tests timeout waiting for AI:

1. Increase test timeout: `test.slow()` gives 5x default timeout
2. Check AWS credentials are valid
3. Verify Bedrock access in us-east-1 region
4. Check network latency to AWS

## Performance Benchmarks

Typical response times:

| Analysis Type    | Time        | Use Case                      |
| ---------------- | ----------- | ----------------------------- |
| Regex (cached)   | 1-10ms      | Instant feedback while typing |
| Regex (uncached) | 1-5ms       | First-time analysis           |
| AI (cached)      | 10-50ms     | Repeat content                |
| AI (uncached)    | 2000-5000ms | New content, nuanced analysis |

## Cost Considerations

Each AI test makes a Bedrock API call:

- Input: ~100-300 tokens
- Output: ~200-500 tokens
- Cost: ~$0.003 per test (Claude 3.5 Sonnet pricing)
- Full suite: ~$0.05-0.10

**DO NOT run in CI** - use for manual verification only.

## Maintenance

### When to Run

- After changing AI prompts in `feedback.service.ts`
- After updating regex patterns in `tone-analyzer.service.ts`
- Before major releases
- When investigating user reports of incorrect feedback

### Updating Tests

If feedback behavior changes (e.g., new prompt engineering):

1. Update expected assertions
2. Document reasoning in test comments
3. Keep examples realistic (real user inputs)

## Related Files

- `/services/ai-service/src/feedback/feedback.service.ts` - AI analysis logic
- `/services/ai-service/src/services/tone-analyzer.service.ts` - Regex patterns
- `/frontend/src/hooks/useHybridPreviewFeedback.ts` - Frontend hybrid hook
- `/docker-compose.e2e.yml` - E2E environment config
