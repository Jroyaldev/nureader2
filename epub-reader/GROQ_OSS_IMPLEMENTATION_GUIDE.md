# Groq OSS Models Implementation Guide

## Overview

Groq provides ultra-fast inference for OpenAI's open-source models with streaming support, advanced tool calling, and structured outputs. Perfect for cost-effective, high-performance AI features in our EPUB reader.

## Available Models

### OpenAI OSS Models on Groq
- **`openai/gpt-oss-120b`**: Flagship model with 120B parameters (5.1B active)
- **`openai/gpt-oss-20b`**: Compact model with 20B parameters (3.6B active)

### Model Performance Metrics

| Model | MMLU | SWE-Bench | AIME 2025 | Context | Input Cost | Output Cost |
|-------|------|-----------|-----------|---------|------------|-------------|
| `gpt-oss-120b` | 90.0% | 62.4% | - | 131K | $0.15/1M | $0.75/1M |
| `gpt-oss-20b` | 85.3% | 60.7% | 98.7% | 131K | $0.10/1M | $0.50/1M |

## Vercel AI SDK Integration

### Installation
```bash
# Add Groq provider to existing AI SDK setup
npm install @ai-sdk/groq
```

### Provider Setup
```typescript
import { groq } from '@ai-sdk/groq';
import { generateText, streamText } from 'ai';

// Non-streaming (complete response)
const result = await generateText({
  model: groq('openai/gpt-oss-20b'),
  messages: formattedMessages,
  system: systemPrompt,
  temperature: 0.7,
  maxOutputTokens: 2000,
});

// Streaming (real-time response) - SUPPORTED by Groq
const stream = streamText({
  model: groq('openai/gpt-oss-120b'),
  messages: formattedMessages,
  system: systemPrompt,
  temperature: 0.7,
  maxOutputTokens: 2000,
});

// Process stream
for await (const chunk of stream.textStream) {
  console.log(chunk);
}
```

## Model Capabilities Matrix

| Feature | gpt-oss-120b | gpt-oss-20b | Notes |
|---------|--------------|-------------|-------|
| Streaming | ✓ | ✓ | Ultra-fast inference |
| Tool Calling | ✓ | ✓ | Advanced tool use |
| Structured Outputs | ✓ | ✓ | JSON schema compliance |
| Browser Search | ✓ | ✓ | Web browsing capability |
| Reasoning Modes | ✓ | ✓ | Variable effort levels |
| Long Context | ✓ | ✓ | 131K token window |
| Multilingual | ✓ | ✓ | 81+ languages |
| Image Input | ✗ | ✗ | Text-only models |

## Extended Model Configuration

```typescript
// Enhanced model types including Groq OSS models
type AIModel = 
  | 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-4.1'  // OpenAI
  | 'openai/gpt-oss-120b' | 'openai/gpt-oss-20b';      // Groq OSS

const MODEL_DISPLAY_NAMES: Record<AIModel, string> = {
  // OpenAI Models
  'gpt-5': 'GPT-5',
  'gpt-5-mini': 'GPT-5 Mini',
  'gpt-5-nano': 'GPT-5 Nano',
  'gpt-4.1': 'GPT-4.1',
  // Groq OSS Models
  'openai/gpt-oss-120b': 'GPT-OSS 120B (Fast)',
  'openai/gpt-oss-20b': 'GPT-OSS 20B (Efficient)',
};

const MODEL_DESCRIPTIONS: Record<AIModel, string> = {
  // OpenAI Models
  'gpt-5': 'Most capable, multimodal understanding',
  'gpt-5-mini': 'Fast and efficient, balanced performance',
  'gpt-5-nano': 'Lightweight, quick responses',
  'gpt-4.1': 'Enhanced GPT-4 with improved capabilities',
  // Groq OSS Models
  'openai/gpt-oss-120b': 'Frontier-grade reasoning, matches proprietary models',
  'openai/gpt-oss-20b': 'Cost-efficient, excellent for agentic workflows',
};

const MODEL_PROVIDERS: Record<AIModel, 'openai' | 'groq'> = {
  'gpt-5': 'openai',
  'gpt-5-mini': 'openai',
  'gpt-5-nano': 'openai',
  'gpt-4.1': 'openai',
  'openai/gpt-oss-120b': 'groq',
  'openai/gpt-oss-20b': 'groq',
};
```

## Reasoning Capabilities

### Reasoning Parameters
```typescript
// Groq-specific reasoning options
const result = await generateText({
  model: groq('openai/gpt-oss-120b'),
  messages: formattedMessages,
  providerOptions: {
    groq: {
      reasoning_format: 'parsed', // 'raw', 'parsed', 'hidden'
      reasoning_effort: 'medium',  // 'low', 'medium', 'high'
    }
  },
  temperature: 0.6, // Recommended 0.5-0.7 for reasoning
  maxOutputTokens: 4000, // Higher for complex reasoning
});

// Access reasoning in parsed format
if (result.reasoning) {
  console.log('Model reasoning:', result.reasoning);
}
```

### Use Cases by Reasoning Effort
- **Low**: Quick definitions, simple Q&A
- **Medium**: Literary analysis, theme exploration (default)
- **High**: Complex academic analysis, multi-layered interpretation

## Tool Use Implementation

### Enhanced Tool Definitions for Reading App
```typescript
import { tool } from 'ai';
import { z } from 'zod';

const readerTools = {
  searchBook: tool({
    description: 'Search for specific text, quotes, or concepts within the current book',
    inputSchema: z.object({
      query: z.string().describe('Search term or phrase'),
      searchType: z.enum(['exact', 'semantic', 'fuzzy']).optional(),
      chapterOnly: z.boolean().optional().describe('Limit search to current chapter'),
    }),
    execute: async ({ query, searchType = 'semantic', chapterOnly }) => {
      // Implementation with EPUB search
      return { results: searchResults, count: results.length };
    }
  }),
  
  analyzeThemes: tool({
    description: 'Analyze literary themes in a text passage or entire work',
    inputSchema: z.object({
      text: z.string().describe('Text passage to analyze'),
      analysisDepth: z.enum(['surface', 'detailed', 'academic']).optional(),
    }),
    execute: async ({ text, analysisDepth = 'detailed' }) => {
      // Deep theme analysis implementation
      return { themes: [], connections: [], significance: '' };
    }
  }),
  
  defineTerms: tool({
    description: 'Get definitions for literary terms, historical references, or vocabulary',
    inputSchema: z.object({
      terms: z.array(z.string()).describe('Terms to define'),
      context: z.string().optional().describe('Book/chapter context for better definitions'),
    }),
    execute: async ({ terms, context }) => {
      // Multi-term definition with context
      return { definitions: termsWithDefinitions };
    }
  }),
  
  findConnections: tool({
    description: 'Find thematic or narrative connections between different parts of the book',
    inputSchema: z.object({
      passage1: z.string(),
      passage2: z.string().optional(),
      connectionType: z.enum(['thematic', 'character', 'plot', 'symbolic']).optional(),
    }),
    execute: async ({ passage1, passage2, connectionType }) => {
      // Cross-reference analysis
      return { connections: [], analysis: '' };
    }
  }),
  
  browserSearch: tool({
    description: 'Search the web for background information about the book, author, or historical context',
    inputSchema: z.object({
      query: z.string().describe('Search query'),
      focus: z.enum(['author', 'historical', 'critical', 'background']).optional(),
    }),
    execute: async ({ query, focus }) => {
      // Groq browser search implementation
      return { sources: [], summary: '' };
    }
  }),
};
```

### Parallel Tool Calling
```typescript
// Groq supports parallel tool execution
const result = await generateText({
  model: groq('openai/gpt-oss-120b'),
  tools: readerTools,
  maxSteps: 5,
  parallelToolCalls: true, // Enable parallel execution
  messages: [
    {
      role: 'user',
      content: 'Analyze the themes in this chapter and also search for historical context about the setting'
    }
  ]
});

// Process multiple tool results
result.steps.forEach(step => {
  if (step.toolCalls) {
    step.toolCalls.forEach(toolCall => {
      console.log(`Tool: ${toolCall.toolName}`);
      console.log(`Result: ${toolCall.result}`);
    });
  }
});
```

## Structured Outputs

### Schema-Based Analysis
```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

// Literary analysis schema
const literaryAnalysisSchema = z.object({
  summary: z.string().describe('Brief summary of the passage'),
  themes: z.array(z.object({
    theme: z.string(),
    evidence: z.array(z.string()),
    significance: z.string(),
  })),
  characters: z.array(z.object({
    name: z.string(),
    role: z.string(),
    development: z.string(),
  })),
  literaryDevices: z.array(z.object({
    device: z.string(),
    examples: z.array(z.string()),
    effect: z.string(),
  })),
  difficulty: z.enum(['elementary', 'middle', 'high', 'college']),
  readingTime: z.number().describe('Estimated reading time in minutes'),
});

// Generate structured analysis
const analysis = await generateObject({
  model: groq('openai/gpt-oss-120b'),
  schema: literaryAnalysisSchema,
  prompt: `Analyze this passage: "${selectedText}"`,
  system: 'You are a literature professor providing comprehensive analysis',
});

// Type-safe access to structured data
console.log(analysis.object.themes); // Array<{theme: string, evidence: string[], significance: string}>
```

### Reading Progress Schema
```typescript
const readingProgressSchema = z.object({
  comprehensionLevel: z.enum(['basic', 'good', 'excellent']),
  suggestedActions: z.array(z.enum([
    'reread_section', 'look_up_terms', 'research_context', 
    'make_notes', 'discuss_themes', 'continue_reading'
  ])),
  keyQuestions: z.array(z.string()),
  nextSteps: z.string(),
});

const progressAssessment = await generateObject({
  model: groq('openai/gpt-oss-20b'),
  schema: readingProgressSchema,
  prompt: `Assess reading progress based on user annotations and questions`,
});
```

## Provider Integration with Existing Code

### Multi-Provider API Route
```typescript
// app/api/ai-chat/route.ts - Enhanced with Groq support
import { openai } from '@ai-sdk/openai';
import { groq } from '@ai-sdk/groq';
import { generateText, streamText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

// Enhanced model types
type AIModel = 
  | 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-4.1'
  | 'openai/gpt-oss-120b' | 'openai/gpt-oss-20b';

const getProvider = (model: AIModel) => {
  if (model.startsWith('openai/gpt-oss-')) {
    return groq(model);
  }
  return openai(model);
};

const supportsStreaming = (model: AIModel): boolean => {
  return model.startsWith('openai/gpt-oss-'); // Groq models support streaming
};

export async function POST(req: NextRequest) {
  try {
    const { messages, model, stream = true } = await req.json();

    // Validate model
    const validModels = [
      'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1',
      'openai/gpt-oss-120b', 'openai/gpt-oss-20b'
    ];
    
    if (!model || !validModels.includes(model)) {
      return NextResponse.json(
        { error: 'Invalid model specified' },
        { status: 400 }
      );
    }

    const provider = getProvider(model);
    const canStream = supportsStreaming(model) && stream;

    // Enhanced system prompt with model-specific optimizations
    const systemPrompt = `You are an advanced AI reading assistant integrated into an EPUB reader application.
    
    Model: ${model}
    Capabilities: ${model.includes('gpt-oss') ? 'Fast inference, tool calling, reasoning' : 'Multimodal, reasoning effort control'}
    
    Your purpose is to enhance the reading experience through intelligent comprehension support.
    
    Key capabilities:
    - Analyze and explain complex passages from books
    - Provide context and background information
    - Answer questions about plot, characters, themes, and literary devices
    - Help with vocabulary and language understanding
    - Offer reading insights and connections to broader themes
    - Use tools for research and analysis when needed
    
    Response style: Clear, educational, and engaging. Use the full context window effectively.`;

    const baseConfig = {
      model: provider,
      messages: messages,
      system: systemPrompt,
      temperature: 0.7,
      maxOutputTokens: model.includes('gpt-oss') ? 4000 : 2000,
    };

    // Add model-specific provider options
    if (model.includes('gpt-oss')) {
      baseConfig.providerOptions = {
        groq: {
          reasoning_format: 'parsed',
          reasoning_effort: 'medium',
        }
      };
    } else if (model === 'gpt-5') {
      baseConfig.providerOptions = {
        openai: {
          reasoning_effort: 'medium',
          verbosity: 'medium',
        }
      };
    }

    if (canStream) {
      // Use streaming for Groq models
      const result = streamText(baseConfig);
      return result.toDataStreamResponse();
    } else {
      // Use non-streaming for OpenAI models
      const result = await generateText(baseConfig);
      return NextResponse.json({
        content: result.text,
        model: model,
        usage: result.usage,
        reasoning: result.reasoning, // Available for Groq models
      });
    }

  } catch (error) {
    console.error('Error in AI chat API:', error);
    
    // Enhanced error handling
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        );
      }
      if (error.message.includes('context_length_exceeded')) {
        return NextResponse.json(
          { error: 'Message too long. Please shorten your input.' },
          { status: 400 }
        );
      }
      if (error.message.includes('model_not_found')) {
        return NextResponse.json(
          { error: 'Model not available. Please try a different model.' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    );
  }
}
```

## Advanced Tool Use with Browser Search

### Browser Search Integration
```typescript
const browserSearchTool = tool({
  description: 'Search the web for information about books, authors, historical context, or literary analysis',
  inputSchema: z.object({
    query: z.string().describe('Specific search query'),
    focus: z.enum(['author_biography', 'historical_context', 'literary_criticism', 'book_analysis']).optional(),
  }),
  execute: async ({ query, focus }) => {
    // This will be handled by Groq's built-in browser search
    // No implementation needed - just return placeholder
    return { 
      query: query,
      focus: focus,
      note: 'Browser search will be executed by Groq' 
    };
  }
});

// Use with Groq models that support browser search
const result = await generateText({
  model: groq('openai/gpt-oss-120b'),
  tools: {
    ...readerTools,
    browserSearch: browserSearchTool,
    // Groq provides browser_search automatically
  },
  providerOptions: {
    groq: {
      reasoning_effort: 'low', // Recommended for browser search
    }
  },
  messages: [
    {
      role: 'user',
      content: 'Tell me about the historical context of this novel and search for recent literary criticism'
    }
  ]
});
```

## Structured Output for Reading Analytics

### Reading Session Analysis
```typescript
const readingSessionSchema = z.object({
  session: z.object({
    duration: z.number().describe('Reading session length in minutes'),
    pagesRead: z.number(),
    comprehensionScore: z.number().min(1).max(10),
  }),
  insights: z.object({
    keyThemes: z.array(z.string()),
    characterDevelopment: z.array(z.string()),
    plotProgression: z.string(),
    emotionalTone: z.enum(['light', 'neutral', 'heavy', 'complex']),
  }),
  recommendations: z.object({
    nextActions: z.array(z.enum([
      'continue_reading', 'review_notes', 'research_context',
      'discuss_themes', 'take_break', 'reread_section'
    ])),
    studyQuestions: z.array(z.string()),
    relatedTopics: z.array(z.string()),
  }),
});

// Generate session analytics
const sessionAnalysis = await generateObject({
  model: groq('openai/gpt-oss-120b'),
  schema: readingSessionSchema,
  prompt: `Analyze this reading session: ${sessionData}`,
  system: 'You are a reading comprehension expert providing structured insights',
});
```

## Performance Optimizations

### Model Selection Strategy
```typescript
const selectOptimalModel = (taskType: string, complexity: string): AIModel => {
  // Use Groq for speed and streaming
  if (taskType === 'quick_lookup' || taskType === 'definition') {
    return 'openai/gpt-oss-20b'; // Fast, cost-effective
  }
  
  // Use Groq for complex analysis with tools
  if (taskType === 'analysis' && complexity === 'high') {
    return 'openai/gpt-oss-120b'; // Frontier capabilities
  }
  
  // Use OpenAI for multimodal or latest features
  if (taskType === 'multimodal' || taskType === 'creative') {
    return 'gpt-5'; // Advanced capabilities
  }
  
  // Default balanced option
  return 'openai/gpt-oss-20b';
};

// Dynamic model routing
const getResponseWithOptimalModel = async (input: string, context: any) => {
  const taskType = classifyTask(input);
  const complexity = assessComplexity(input, context);
  const optimalModel = selectOptimalModel(taskType, complexity);
  
  return await generateText({
    model: getProvider(optimalModel),
    messages: [{ role: 'user', content: input }],
    system: getSystemPrompt(context),
  });
};
```

### Streaming UI Enhancement
```typescript
// Enhanced streaming component for Groq models
import { useChat } from '@ai-sdk/react';

export function StreamingAIAssistant() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
  } = useChat({
    api: '/api/ai-chat-stream', // Separate streaming endpoint
    body: {
      model: 'openai/gpt-oss-120b', // Groq streaming model
      stream: true,
    },
    onFinish: (message) => {
      // Handle completion
      if (message.reasoning) {
        console.log('Model reasoning:', message.reasoning);
      }
    }
  });

  return (
    <div className="chat-container">
      {/* Messages with real-time streaming */}
      {messages.map(message => (
        <div key={message.id}>
          <div className="message-content">{message.content}</div>
          
          {/* Show reasoning for Groq models */}
          {message.reasoning && (
            <details className="mt-2 text-sm text-zinc-500">
              <summary>Model Reasoning</summary>
              <pre className="mt-1 whitespace-pre-wrap">{message.reasoning}</pre>
            </details>
          )}
          
          {/* Tool calls display */}
          {message.toolInvocations?.map(tool => (
            <ToolCallDisplay key={tool.toolCallId} toolCall={tool} />
          ))}
        </div>
      ))}
      
      {/* Stop button for streaming */}
      {isLoading && (
        <button onClick={stop} className="stop-button">
          Stop Generation
        </button>
      )}
      
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about the book..."
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}
```

## Cost and Performance Comparison

### Model Selection Guide
```typescript
const modelUsageGuide = {
  'openai/gpt-oss-20b': {
    bestFor: ['Quick questions', 'Definitions', 'Simple analysis', 'Tool-heavy workflows'],
    cost: 'Lowest ($0.10/$0.50 per 1M tokens)',
    speed: 'Ultra-fast with Groq inference',
    streaming: true,
    tools: true,
    reasoning: true,
  },
  'openai/gpt-oss-120b': {
    bestFor: ['Complex analysis', 'Academic research', 'Deep reasoning', 'Frontier tasks'],
    cost: 'Low-medium ($0.15/$0.75 per 1M tokens)',
    speed: 'Very fast with Groq inference',
    streaming: true,
    tools: true,
    reasoning: true,
  },
  'gpt-5': {
    bestFor: ['Multimodal tasks', 'Latest features', 'Creative writing', 'Premium analysis'],
    cost: 'High ($1.25/$10 per 1M tokens)',
    speed: 'Standard',
    streaming: false,
    tools: true,
    reasoning: true,
    multimodal: true,
  },
};
```

## Environment Configuration

```env
# Groq Configuration
GROQ_API_KEY=your-groq-api-key

# OpenAI Configuration  
OPENAI_API_KEY=your-openai-api-key

# Feature Flags
NEXT_PUBLIC_GROQ_STREAMING_ENABLED=true
NEXT_PUBLIC_GROQ_TOOLS_ENABLED=true
NEXT_PUBLIC_GROQ_BROWSER_SEARCH_ENABLED=true
NEXT_PUBLIC_GROQ_REASONING_ENABLED=true
```

## Implementation Checklist

### Phase 1: Basic Groq Integration
- [ ] Install @ai-sdk/groq
- [ ] Add Groq models to model selector
- [ ] Update API route with provider detection
- [ ] Test basic text generation

### Phase 2: Streaming Support
- [ ] Implement streaming endpoint for Groq models
- [ ] Update frontend to handle streaming responses
- [ ] Add stop/abort functionality
- [ ] Test streaming performance

### Phase 3: Advanced Features
- [ ] Implement structured outputs for analysis
- [ ] Add reasoning display in UI
- [ ] Integrate browser search tool
- [ ] Add parallel tool calling

### Phase 4: Optimization
- [ ] Implement dynamic model selection
- [ ] Add performance monitoring
- [ ] Optimize cost vs quality
- [ ] A/B test model performance

## Best Practices for Groq OSS Models

1. **Speed Optimization**
   - Use Groq models for real-time interactions
   - Leverage streaming for immediate feedback
   - Implement proper abort controls

2. **Cost Efficiency**
   - Start with gpt-oss-20b for most tasks
   - Use gpt-oss-120b for complex analysis only
   - Monitor token usage carefully

3. **Tool Integration**
   - Define tools with detailed descriptions
   - Use parallel tool calling for efficiency
   - Implement proper error handling

4. **Reasoning Modes**
   - Use 'low' effort for quick responses
   - Use 'medium' for standard analysis (default)
   - Use 'high' for academic-level reasoning

5. **Context Management**
   - Take advantage of 131K context window
   - Structure context hierarchically
   - Use structured outputs for complex data

## Migration from Current Implementation

### Step 1: Update Model Types
```typescript
// Before
type AIModel = 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-4.1';

// After
type AIModel = 
  | 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-4.1'  // OpenAI
  | 'openai/gpt-oss-120b' | 'openai/gpt-oss-20b';      // Groq OSS
```

### Step 2: Update Provider Logic
```typescript
// Add provider detection
const getModelProvider = (model: AIModel) => {
  return model.startsWith('openai/gpt-oss-') ? 'groq' : 'openai';
};
```

### Step 3: Add Streaming Support
```typescript
// Detect streaming capability
const supportsStreaming = (model: AIModel) => {
  return model.startsWith('openai/gpt-oss-');
};
```

This implementation maintains full compatibility with your existing OpenAI models while adding the high-performance Groq OSS models with streaming support.