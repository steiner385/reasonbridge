# Discussion Simulator: Manual Response Mode & Visual Feedback Design

**Date:** 2026-02-21
**Issues:** #784 (Manual Response Mode), #788 (Visual Feedback)
**Branch:** `feat/discussion-simulator-persona-mode-784-788`
**Approach:** Stateless Client-Driven

---

## Overview

Transform the discussion simulator from a passive observation tool into an active learning environment where users practice argumentation skills through interactive debates with AI-powered personas.

**Core Goals:**
1. Argumentation practice in low-stakes environment
2. Perspective-taking through engaging with counter-arguments
3. Argument stress testing (fallacy detection, weak evidence identification)
4. Safe exploration of controversial topics
5. Cognitive bias detection and feedback

---

## Architecture

### Approach: Stateless Client-Driven

- Frontend manages conversation state, persona configs, and mode selection
- Backend provides stateless endpoints for AI generation and analysis
- Optional persistence via localStorage (pause/resume)
- No database migrations required for core functionality

### Data Flow

```
User Message → Frontend State → Parallel API Calls
                                    ├─ /ai/simulator/chat (persona response)
                                    └─ /ai/simulator/analyze (argument analysis)
                                           ↓
                              UI Update (message + feedback)
```

---

## Frontend Architecture

### New Components

```
frontend/src/components/simulator/
├── SimulatorChatInterface.tsx      # Main chat UI (user right, AI left)
├── PersonaSelector.tsx             # Modal with preset + custom personas
├── ConversationModeSelector.tsx    # Socratic/Debate/Steelman/CommonGround
├── ArgumentFeedbackPanel.tsx       # Real-time analysis sidebar
├── SimulationSettingsModal.tsx     # Difficulty, length, constraints
├── TranscriptViewer.tsx            # Post-simulation review
├── LearningInsightsPanel.tsx       # Summary, fallacies, recommendations
├── CitationInput.tsx               # Inline citation [claim](url) support
└── PersonaAvatar.tsx               # Visual persona representation
```

### Enhanced UI Components (Issue #788)

```
frontend/src/components/ui/
├── AIOperationsBanner.tsx          # (enhance existing)
├── ProgressTracker.tsx             # Multi-step progress
├── OperationQueue.tsx              # Shows pending AI operations
└── skeletons/
    ├── ChatMessageSkeleton.tsx
    └── ArgumentAnalysisSkeleton.tsx
```

### State Structure

```typescript
interface SimulationState {
  // Configuration
  persona: PresetPersona | CustomPersona;
  mode: 'socratic' | 'debate' | 'steelman' | 'common_ground';
  difficulty: 'novice' | 'intermediate' | 'expert';
  maxExchanges: 5 | 10 | 20;

  // Conversation
  messages: ConversationMessage[];
  currentExchange: number;
  status: 'configuring' | 'active' | 'paused' | 'completed';

  // Analysis (accumulated)
  analysisResults: ArgumentAnalysis[];
  overallMetrics: SimulationMetrics;

  // Operations
  pendingOperations: AIOperation[];
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'persona';
  content: string;
  timestamp: string;
  analysis?: ArgumentAnalysis;  // For user messages
}

interface ArgumentAnalysis {
  fallacies: Fallacy[];
  unsupportedClaims: string[];
  toneScore: number;        // 0-10
  evidenceScore: number;    // 0-10
  coherenceScore: number;   // 0-10
  suggestions: string[];
}
```

---

## Backend Architecture

### New Endpoints (ai-service)

| Endpoint | Purpose |
|----------|---------|
| `POST /ai/simulator/personas` | List preset personas |
| `POST /ai/simulator/personas/custom` | Create custom persona prompt |
| `POST /ai/simulator/chat` | Generate persona response (mode-aware) |
| `POST /ai/simulator/analyze` | Analyze user argument |
| `POST /ai/simulator/verify-citation` | Verify claim + source |
| `POST /ai/simulator/insights` | Generate learning insights from transcript |

### Key DTOs

```typescript
interface ChatRequestDto {
  persona: PersonaConfig;
  mode: ConversationMode;
  difficulty: DifficultyLevel;
  userMessage: string;
  conversationHistory: Message[];
  topicContext?: string;
}

interface AnalyzeArgumentDto {
  userMessage: string;
  conversationContext: Message[];
}

interface ArgumentAnalysisResult {
  fallacies: Fallacy[];
  unsupportedClaims: string[];
  toneScore: number;
  evidenceScore: number;
  coherenceScore: number;
  suggestions: string[];
}

interface VerifyCitationDto {
  claim: string;
  sourceUrl: string;
}

interface CitationVerificationResult {
  status: 'supported' | 'partial' | 'contradicted' | 'unverifiable';
  explanation: string;
  confidence: number;
}

interface GenerateInsightsDto {
  transcript: ConversationMessage[];
  mode: ConversationMode;
  persona: PersonaConfig;
}

interface LearningInsights {
  strengths: string[];
  improvements: string[];
  fallaciesCommitted: { type: string; exchange: number; excerpt: string }[];
  recommendedReadings: { title: string; reason: string }[];
  overallAssessment: string;
}
```

### Conversation Modes

| Mode | AI Behavior |
|------|-------------|
| **Socratic** | Ask clarifying questions, challenge assumptions, never state own position |
| **Debate** | Present counter-arguments with evidence, defend persona position, rebut claims |
| **Steelman** | Present strongest version of opposing view, force engagement with best arguments |
| **Common Ground** | Seek points of agreement, reframe disagreements as shared goals |

### Difficulty Levels

| Level | AI Behavior |
|-------|-------------|
| **Novice** | Simple arguments, obvious fallacies, patient explanations |
| **Intermediate** | Nuanced arguments, moderate complexity, balanced challenge |
| **Expert** | Sophisticated rhetoric, subtle fallacies, demanding evidence standards |

---

## Visual Feedback System (Issue #788)

### Operation States

```typescript
type AIOperationStatus = 'pending' | 'active' | 'completed' | 'failed';

interface AIOperation {
  id: string;
  type: 'persona_response' | 'argument_analysis' | 'citation_verify' | 'insights';
  status: AIOperationStatus;
  label: string;
  startedAt: number;
  estimatedMs?: number;
  error?: string;
}
```

### Loading Components

**Chat Message Loading:**
- Typing indicator with animated dots
- Skeleton shimmer for message content
- Persona avatar visible during loading

**Analysis Panel Loading:**
- Progress bar with step indicators
- Checkmarks for completed analysis steps
- Estimated time remaining

**Operations Queue Banner:**
- Shows count of active operations
- Individual operation status with estimated time
- Collapsible for minimal distraction

### Error States

- Clear error message with explanation
- Retry button for failed operations
- "Continue without AI" fallback option
- Graceful degradation (partial results shown)

### Accessibility

- `aria-live="polite"` for operation status changes
- `aria-busy` on containers during loading
- Screen reader announcements for state changes
- Focus management after AI responds
- `prefers-reduced-motion` support

---

## Preset Personas

| Persona | Position | Tone | Mode Affinity |
|---------|----------|------|---------------|
| **The Skeptic** | Questions all claims, demands evidence | Analytical | Socratic |
| **The Advocate** | Passionately defends a position | Passionate | Debate |
| **Devil's Advocate** | Argues opposite of user's position | Confrontational | Steelman |
| **The Mediator** | Seeks compromise and shared values | Measured | Common Ground |
| **The Expert** | Cites research, technical depth | Analytical | Debate |
| **The Idealist** | Appeals to values and principles | Passionate | Common Ground |

### Custom Persona Builder

```typescript
interface CustomPersonaConfig {
  name: string;
  position: string;
  background: string;
  tone: PersonaTone;
  receptiveness: number;  // 0.1-1.0
  argumentation: {
    usesEmotionalAppeals: boolean;
    citesData: boolean;
    asksQuestions: boolean;
  };
  exampleArguments?: string[];
}
```

---

## Learning Insights

### Post-Simulation Summary

Generated via `/ai/simulator/insights` endpoint:

- **Metrics:** Exchange count, fallacy count, evidence/tone/coherence scores
- **Strengths:** What user did well
- **Areas for Improvement:** Specific fallacies with excerpts
- **Recommended Readings:** Contextual book/article suggestions

### Transcript Export

Formats:
- **JSON:** Full data for programmatic use
- **PDF:** Formatted transcript with annotations
- **Markdown:** Shareable text format

---

## Session Management

### localStorage Schema

```typescript
// Key: 'rb_simulation_draft'
interface SavedSimulation {
  savedAt: string;
  state: SimulationState;
  canResume: boolean;
}
```

### Session Controls

| Action | Behavior |
|--------|----------|
| **Pause** | Saves state to localStorage |
| **Resume** | Restores conversation from localStorage |
| **Reset** | Clears state, returns to configuration |
| **End Early** | Triggers insights generation with partial transcript |

---

## Fallacy Detection Categories

### Logical Fallacies
- Ad hominem
- Strawman
- Slippery slope
- False dichotomy
- Appeal to authority

### Evidential Issues
- Unsupported claims
- Cherry-picking
- Anecdotal evidence

### Rhetorical Issues
- Emotional manipulation
- Loaded language
- False equivalence

### Cognitive Biases
- Confirmation bias
- Anchoring
- Availability heuristic

---

## Rate Limiting (Frontend)

```typescript
const RATE_LIMITS = {
  free: { simulationsPerDay: 5, exchangesPerSimulation: 10 },
  paid: { simulationsPerDay: Infinity, exchangesPerSimulation: 50 }
};
```

---

## Future Integration Points

1. **Topic Integration:** "Practice before posting" button on topic creation
2. **Draft Import:** Import simulation insights as draft response
3. **Analytics:** Track simulation metrics for product insights

---

## Testing Strategy

### Unit Tests
- Persona prompt generation
- Fallacy detection accuracy
- Mode-specific behavior
- State management hooks

### Integration Tests
- Full simulation flow (start → exchanges → complete)
- Parallel API calls (chat + analyze)
- Error handling and fallbacks

### E2E Tests
- Complete user journey through simulation
- Pause/resume functionality
- Export functionality
- Accessibility compliance
