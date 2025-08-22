# AI Assistant Implementation Context

## Requirements
- **GPT-5 Models**: gpt-5, gpt-5-mini, gpt-5-nano (latest generation models)
- **GPT-4.1**: Separate model with its own characteristics (not a reasoning model)
- **NO STREAMING**: API doesn't support streaming
- **Context Engineering**: Strong focus on context and prompt engineering
- **UI Features**: Glassmorphic design, dropdown menu for model selection
- **Context Integration**: Ability to add highlights, notes, and current book context

## Model Information

### GPT-5 Series (2025 Models)
- `gpt-5`: Most capable model with multimodal support
- `gpt-5-mini`: Smaller, faster variant
- `gpt-5-nano`: Lightweight model for quick responses

### GPT-4.1 
- `gpt-4.1`: Enhanced version of GPT-4 with improved capabilities
- Not a reasoning model (different from o1/o3 series)
- Supports standard chat completions

## OpenAI Provider Configuration
```typescript
// Models available through OpenAI API
const AVAILABLE_MODELS = {
  'gpt-5': 'GPT-5',
  'gpt-5-mini': 'GPT-5 Mini', 
  'gpt-5-nano': 'GPT-5 Nano',
  'gpt-4.1': 'GPT-4.1'
};
```

## Key Implementation Notes
1. Disable streaming completely - use standard request/response
2. Implement strong context management for book content
3. Create dropdown selector for all 4 models
4. Use Vercel AI SDK without streaming features
5. Focus on context and prompt engineering capabilities