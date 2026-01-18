# Feedback Components

This directory contains components for displaying AI-generated feedback to users during response composition and review.

## ToneIndicator

The `ToneIndicator` component visualizes tone-related feedback from the AI service, helping users improve communication quality while maintaining autonomy.

### Features

- **Visual Feedback Display**: Color-coded indicators for different tone issues (hostile, dismissive, sarcastic, etc.)
- **Positive Affirmations**: Shows encouraging feedback for quality contributions (FR-014d)
- **"Curious Peer" Voice**: Uses collaborative, non-corrective language (FR-010, FR-026)
- **Non-blocking Suggestions**: Users can acknowledge and continue (FR-014)
- **Transparency**: Labels all feedback as "AI Assistant" with reasoning (FR-014b)
- **Educational Resources**: Links to learning materials about communication
- **Helpfulness Ratings**: Users can rate feedback to improve the system
- **Confidence Threshold**: Only displays feedback with ≥80% confidence (FR-014c)

### Usage

```tsx
import { ToneIndicator } from '@/components/feedback';
import { Feedback } from '@/types/feedback';

function ResponseComposer() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);

  const handleAcknowledge = (feedbackId: string) => {
    // Mark feedback as acknowledged via API
    console.log('Acknowledged:', feedbackId);
  };

  const handleRateHelpful = (feedbackId: string, rating: HelpfulRating) => {
    // Submit helpfulness rating via API
    console.log('Rated:', feedbackId, rating);
  };

  return (
    <div>
      {feedback.map((item) => (
        <ToneIndicator
          key={item.id}
          feedback={item}
          onAcknowledge={handleAcknowledge}
          onRateHelpful={handleRateHelpful}
        />
      ))}
    </div>
  );
}
```

### Compact Mode

For inline display (e.g., in response previews):

```tsx
<ToneIndicator feedback={feedback} compact />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `feedback` | `Feedback` | required | Feedback object from AI service |
| `onAcknowledge` | `(id: string) => void` | optional | Callback when user acknowledges feedback |
| `onRateHelpful` | `(id: string, rating: HelpfulRating) => void` | optional | Callback when user rates feedback |
| `compact` | `boolean` | `false` | Show minimal inline version |

### Tone Variants

The component handles different tone subtypes with appropriate styling and messaging:

- **Hostile Tone** (`hostile_tone`): Red styling, "Tone suggestion" label
- **Personal Attack** (`personal_attack`): Red styling, "Consider rephrasing" label
- **Dismissive** (`dismissive`): Orange styling, "Consider openness" label
- **Sarcastic** (`sarcastic`): Orange styling, "Clarity suggestion" label
- **Positive Affirmation** (`AFFIRMATION` type): Green styling, "Quality contribution" label

### Integration Points

The `ToneIndicator` is designed to be integrated into:

1. **ResponseComposer** (T121): Real-time feedback during composition
2. **FeedbackPanel** (T118): Dedicated feedback review interface
3. **FeedbackCard** (T119): Individual feedback item display
4. **Response Preview**: Pre-submission feedback display

### Backend Integration

Feedback data comes from the AI service's `/feedback` endpoints:

- `POST /feedback/request` - Request feedback for a response
- `GET /feedback/:id` - Retrieve specific feedback

The component expects the `Feedback` type which matches the Prisma schema in `packages/db-models`.

### Design Principles

1. **Collaborative Tone**: Uses phrases like "I noticed..." and "Have you considered..." rather than commands
2. **User Autonomy**: All feedback is acknowledgeable but not blocking
3. **Transparency**: Always labeled as "AI Assistant" with visible confidence scores
4. **Education Focus**: Provides reasoning and educational resources
5. **Positive Reinforcement**: Affirmations are displayed as prominently as corrections

### Accessibility

- Semantic HTML with proper ARIA labels
- Keyboard navigation support
- Color contrast meeting WCAG AA standards
- Screen reader friendly text

### Testing

See `__tests__/components/feedback/ToneIndicator.test.tsx` for comprehensive test coverage including:
- Rendering variants
- User interactions
- Confidence threshold enforcement
- Accessibility compliance
- Educational resources display

### Related Components

- **FeedbackPanel**: Container for multiple feedback items (T118)
- **FeedbackCard**: General-purpose feedback display (T119)
- **EducationalTooltip**: Detailed explanations of feedback types (T120)

### Specification References

- **FR-010**: Kahneman dual-process framework (bias detection)
- **FR-014**: AI feedback mechanism (non-blocking, transparent, confidence threshold)
- **FR-014a**: Fogg Behavior Model (maintain motivation)
- **FR-014b**: Transparency requirement (AI labeling)
- **FR-014c**: Confidence threshold (≥0.80 to display)
- **FR-014d**: Positive affirmations (balance corrective feedback)
- **FR-026**: "Curious peer" voice (collaborative tone)
