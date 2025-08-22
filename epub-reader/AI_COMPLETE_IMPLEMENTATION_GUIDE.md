# Complete AI Assistant Implementation Guide

## Vercel AI SDK Core Documentation

### Overview
The Vercel AI SDK is a TypeScript toolkit for building AI-powered applications across multiple frameworks (React, Next.js, Vue, Svelte, Node.js). It provides:
- **AI SDK Core**: Unified API for text generation, structured objects, tool calls, and agents
- **AI SDK UI**: Framework-agnostic hooks for chat interfaces and generative UI
- **15+ Model Providers**: Including OpenAI, Anthropic, Google, Azure, Mistral, Groq, and more

### Key Capabilities
- Text generation (streaming and non-streaming)
- Multi-modal interactions (text, images, files)
- Tool calling and function execution
- Structured data generation with validation
- Agent development with multi-step workflows
- Cross-platform compatibility

## Project Requirements
- **FLEXIBLE STREAMING**: Support both streaming (streamText) and non-streaming (generateText) based on use case
- **GPT-5 Models**: gpt-5, gpt-5-mini, gpt-5-nano (latest generation models)
- **GPT-4.1**: Enhanced version of GPT-4 (not a reasoning model)
- **Context Engineering**: Strong focus on context and prompt engineering
- **UI Features**: Glassmorphic design, dropdown menu for model selection
- **Context Integration**: Ability to add highlights, notes, and current book context
- **Tool Calling**: Display tool invocations in UI with nice formatting
- **Agent Support**: Build multi-step AI workflows for complex tasks

## Models Configuration

```typescript
// Available models through OpenAI API
type AIModel = 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-4.1';

const MODEL_DISPLAY_NAMES: Record<AIModel, string> = {
  'gpt-5': 'GPT-5',
  'gpt-5-mini': 'GPT-5 Mini',
  'gpt-5-nano': 'GPT-5 Nano',
  'gpt-4.1': 'GPT-4.1',
};

const MODEL_DESCRIPTIONS: Record<AIModel, string> = {
  'gpt-5': 'Most capable, multimodal understanding',
  'gpt-5-mini': 'Fast and efficient, balanced performance',
  'gpt-5-nano': 'Lightweight, quick responses',
  'gpt-4.1': 'Enhanced GPT-4 with improved capabilities',
};
```

## Provider Setup

### Installation
```bash
# Core packages
pnpm add ai @ai-sdk/openai @ai-sdk/react zod

# Additional providers (optional)
pnpm add @ai-sdk/anthropic @ai-sdk/google @ai-sdk/mistral

# UI components for React
pnpm add @ai-sdk/react-ui
```

### Provider Configuration
```typescript
import { openai } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';

// Non-streaming (complete response)
const result = await generateText({
  model: openai('gpt-5'),
  prompt: 'Your prompt here',
  system: 'System prompt for context',
  temperature: 0.7,
  maxOutputTokens: 2000,
});

// Streaming (real-time response)
const stream = streamText({
  model: openai('gpt-5'),
  prompt: 'Your prompt here',
  system: 'System prompt for context',
  temperature: 0.7,
  maxOutputTokens: 2000,
});

// Process stream
for await (const chunk of stream.textStream) {
  console.log(chunk);
}
```

## Model Capabilities

| Model         | Image Input | Audio Input | Object Generation | Tool Usage | PDF Support |
|--------------|-------------|-------------|------------------|------------|-------------|
| `gpt-5`      | ✓ | ✗ | ✓ | ✓ | ✓ |
| `gpt-5-mini` | ✓ | ✗ | ✓ | ✓ | ✓ |
| `gpt-5-nano` | ✓ | ✗ | ✓ | ✓ | ✓ |
| `gpt-4.1`    | ✓ | ✗ | ✓ | ✓ | ✓ |

## Prompts and Context Engineering

### System Prompts
```typescript
const result = await generateText({
  model: openai('gpt-5'),
  system: `You are an advanced AI reading assistant integrated into an EPUB reader.
    Key capabilities:
    - Analyze and explain complex passages
    - Provide context and background information
    - Answer questions about plot, characters, themes
    - Help with vocabulary and language understanding
    - Offer reading insights and connections`,
  prompt: userMessage,
});
```

### Message Prompts with Context
```typescript
const result = await generateText({
  model: openai('gpt-5'),
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
    { 
      role: 'user', 
      content: `Current context:\nBook: ${bookTitle}\nChapter: ${chapter}\nSelected text: ${selectedText}` 
    }
  ],
});
```

### Multi-Modal Support
```typescript
// Image support
const result = await generateText({
  model: openai('gpt-5'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Describe this illustration' },
        { type: 'image', image: imageBuffer }
      ]
    }
  ]
});

// PDF support
const result = await generateText({
  model: openai('gpt-5'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Summarize this document' },
        { 
          type: 'file',
          mediaType: 'application/pdf',
          data: pdfBuffer,
          filename: 'document.pdf'
        }
      ]
    }
  ]
});
```

## Tool Implementation

### Tool Definition
```typescript
import { tool } from 'ai';
import { z } from 'zod';

const tools = {
  searchBook: tool({
    description: 'Search for text within the current book',
    inputSchema: z.object({
      query: z.string().describe('Search query'),
      chapterOnly: z.boolean().optional()
    }),
    execute: async ({ query, chapterOnly }) => {
      // Implementation
      return searchResults;
    }
  }),
  
  getDefinition: tool({
    description: 'Get definition of a word or term',
    inputSchema: z.object({
      term: z.string()
    }),
    execute: async ({ term }) => {
      // Implementation
      return definition;
    }
  }),
  
  getBookMetadata: tool({
    description: 'Get metadata about the current book',
    inputSchema: z.object({
      bookId: z.string()
    }),
    execute: async ({ bookId }) => {
      const { data } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();
      return data;
    }
  }),
  
  searchAnnotations: tool({
    description: 'Search user annotations and highlights',
    inputSchema: z.object({
      query: z.string(),
      type: z.enum(['highlight', 'note', 'bookmark']).optional()
    }),
    execute: async ({ query, type }) => {
      let builder = supabase
        .from('annotations')
        .select('*')
        .ilike('text', `%${query}%`);
      
      if (type) builder = builder.eq('type', type);
      
      const { data } = await builder;
      return data;
    }
  })
};
```

### Multi-Step Tool Calls
```typescript
const result = await generateText({
  model: openai('gpt-5'),
  tools,
  toolChoice: 'auto', // or 'required', 'none', { type: 'tool', toolName: 'searchBook' }
  maxSteps: 5, // Allow multiple tool calls
  stopWhen: 'text-generated', // Stop after generating final text
  messages: [{ role: 'user', content: prompt }]
});

// Access tool calls and results
for (const step of result.steps) {
  if (step.toolCalls) {
    for (const toolCall of step.toolCalls) {
      console.log('Tool:', toolCall.toolName);
      console.log('Args:', toolCall.args);
      console.log('Result:', toolCall.result);
    }
  }
}
```

### Tool UI Display
```typescript
// Component to display tool calls in UI
interface ToolCallDisplayProps {
  toolCall: {
    toolName: string;
    args: any;
    result?: any;
    isLoading?: boolean;
  };
}

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  return (
    <div className="rounded-lg border border-sage-200/20 bg-sage-50/5 p-3 my-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-sage-600">🔧</span>
        <span className="font-medium text-sage-700">
          {toolCall.toolName}
        </span>
        {toolCall.isLoading && (
          <span className="animate-pulse text-sage-500">...</span>
        )}
      </div>
      {toolCall.args && (
        <div className="mt-1 text-xs text-sage-600">
          <code className="bg-sage-100/10 px-1 rounded">
            {JSON.stringify(toolCall.args, null, 2)}
          </code>
        </div>
      )}
      {toolCall.result && (
        <div className="mt-2 text-sm text-sage-700">
          {typeof toolCall.result === 'string' 
            ? toolCall.result 
            : JSON.stringify(toolCall.result, null, 2)}
        </div>
      )}
    </div>
  );
}
```

## Agent Implementation

### Agent Patterns
```typescript
// Sequential Agent (Chain)
const sequentialAgent = async (input: string) => {
  // Step 1: Analyze input
  const analysis = await generateText({
    model: openai('gpt-5-mini'),
    prompt: `Analyze this text: ${input}`,
  });
  
  // Step 2: Generate response based on analysis
  const response = await generateText({
    model: openai('gpt-5'),
    prompt: `Based on this analysis: ${analysis.text}, generate a response`,
  });
  
  return response.text;
};

// Routing Agent
const routingAgent = async (input: string) => {
  // Determine task type
  const taskType = await generateText({
    model: openai('gpt-5-nano'),
    prompt: `Classify this task: ${input}`,
    system: 'Classify as: simple, complex, or research',
  });
  
  // Route to appropriate model
  const model = taskType.text.includes('complex') 
    ? openai('gpt-5')
    : openai('gpt-5-mini');
  
  return generateText({ model, prompt: input });
};

// Multi-Agent System
const multiAgentSystem = async (bookContent: string) => {
  // Parallel analysis by specialized agents
  const [themeAnalysis, characterAnalysis, styleAnalysis] = await Promise.all([
    generateText({
      model: openai('gpt-5'),
      prompt: `Analyze themes in: ${bookContent}`,
      system: 'You are a literary theme expert',
    }),
    generateText({
      model: openai('gpt-5'),
      prompt: `Analyze characters in: ${bookContent}`,
      system: 'You are a character analysis expert',
    }),
    generateText({
      model: openai('gpt-5-mini'),
      prompt: `Analyze writing style in: ${bookContent}`,
      system: 'You are a writing style expert',
    }),
  ]);
  
  // Synthesize results
  const synthesis = await generateText({
    model: openai('gpt-5'),
    prompt: `Synthesize these analyses: 
      Themes: ${themeAnalysis.text}
      Characters: ${characterAnalysis.text}
      Style: ${styleAnalysis.text}`,
  });
  
  return synthesis.text;
};
```

## UI Implementation (Streaming & Non-Streaming)

### Chat Component with useChat Hook
```typescript
import { useChat } from '@ai-sdk/react';
import { Message } from 'ai';

interface ExtendedMessage extends Message {
  model?: AIModel;
  context?: string;
  toolInvocations?: Array<{
    toolCallId: string;
    toolName: string;
    args: any;
    result?: any;
  }>;
}

export function EnhancedChatComponent() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
  } = useChat({
    api: '/api/ai-chat',
    initialMessages: [],
    body: {
      model: selectedModel,
      context: bookContext,
      includeAnnotations: true,
    },
    onFinish: (message) => {
      // Save to database
      saveChat({ messages });
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });
  
  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.map((message) => (
          <div key={message.id}>
            {/* Message content */}
            <div className="p-4">{message.content}</div>
            
            {/* Tool invocations display */}
            {message.toolInvocations?.map((invocation) => (
              <ToolCallDisplay 
                key={invocation.toolCallId}
                toolCall={invocation}
              />
            ))}
          </div>
        ))}
      </div>
      
      {/* Input */}
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
```

### Standard Request/Response Pattern (Non-Streaming)
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: AIModel;
  context?: string;
  toolCalls?: any[];
}

// Non-streaming implementation
const handleSubmit = async (input: string) => {
  const response = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: conversationHistory,
      model: selectedModel,
      context: bookContext,
      stream: false, // Explicitly disable streaming
    })
  });
  
  const data = await response.json();
  setMessages(prev => [...prev, data.message]);
};
```

### API Routes (Streaming & Non-Streaming)
```typescript
// app/api/ai-chat/route.ts - Streaming with useChat
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { createDataStreamResponse } from '@ai-sdk/react';

export async function POST(req: Request) {
  const { messages, model, context, includeAnnotations } = await req.json();
  
  // Get annotations if requested
  let annotations = [];
  if (includeAnnotations) {
    const { data } = await supabase
      .from('annotations')
      .select('*')
      .eq('book_id', context.bookId)
      .order('created_at', { ascending: false })
      .limit(10);
    annotations = data || [];
  }
  
  // Build system prompt with context
  const systemPrompt = buildSystemPrompt(context, annotations);
  
  // Stream response with tools
  const result = streamText({
    model: openai(model),
    messages,
    system: systemPrompt,
    tools,
    maxSteps: 3,
    temperature: 0.7,
    maxOutputTokens: 2000,
  });
  
  // Return streaming response
  return createDataStreamResponse(result);
}

// Alternative: Non-streaming endpoint
export async function POST(req: Request) {
  const { messages, model, context, stream = true } = await req.json();
  
  if (!stream) {
    // Use generateText for complete response
    const result = await generateText({
      model: openai(model),
      messages,
      system: getSystemPrompt(context),
      tools,
      maxSteps: 3,
      temperature: 0.7,
      maxOutputTokens: 2000,
    });
    
    return NextResponse.json({
      content: result.text,
      model,
      usage: result.usage,
      toolCalls: result.steps.flatMap(s => s.toolCalls || []),
    });
  }
  
  // Streaming response
  const result = streamText({
    model: openai(model),
    messages,
    system: getSystemPrompt(context),
    temperature: 0.7,
  });
  
  return result.toDataStreamResponse();
}
```

## Context Management

### Enhanced AI Context Provider
```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import { useSupabase } from '@/utils/supabase/client';

interface BookContext {
  bookId?: string;
  bookTitle?: string;
  currentChapter?: string;
  currentCFI?: string;
  currentText?: string;
  currentPage?: number;
  totalPages?: number;
}

interface Annotation {
  id: string;
  type: 'highlight' | 'note' | 'bookmark';
  text?: string;
  note?: string;
  cfi_range?: string;
  color?: string;
  created_at?: Date;
}

interface AIContextValue {
  bookContext: BookContext;
  annotations: Annotation[];
  selectedAnnotations: string[];
  setSelectedAnnotations: (ids: string[]) => void;
  getFormattedContext: () => string;
  refreshAnnotations: () => Promise<void>;
}

const AIContext = createContext<AIContextValue | null>(null);

export function AIContextProvider({ children, bookContext }: {
  children: React.ReactNode;
  bookContext: BookContext;
}) {
  const supabase = useSupabase();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotations, setSelectedAnnotations] = useState<string[]>([]);
  
  // Fetch annotations when book changes
  useEffect(() => {
    if (bookContext.bookId) {
      refreshAnnotations();
    }
  }, [bookContext.bookId]);
  
  const refreshAnnotations = async () => {
    if (!bookContext.bookId) return;
    
    const { data } = await supabase
      .from('annotations')
      .select('*')
      .eq('book_id', bookContext.bookId)
      .order('created_at', { ascending: false });
    
    if (data) setAnnotations(data);
  };
  
  const getFormattedContext = () => {
    const parts: string[] = [];
    
    // Book context
    if (bookContext.bookTitle) {
      parts.push(`📚 Book: "${bookContext.bookTitle}"`);
    }
    if (bookContext.currentChapter) {
      parts.push(`📖 Chapter: "${bookContext.currentChapter}"`);
    }
    if (bookContext.currentPage && bookContext.totalPages) {
      parts.push(`📄 Page: ${bookContext.currentPage} of ${bookContext.totalPages}`);
    }
    
    // Selected annotations
    const selected = annotations.filter(a => selectedAnnotations.includes(a.id));
    if (selected.length > 0) {
      parts.push('\n📝 Selected Annotations:');
      selected.forEach(annotation => {
        const icon = annotation.type === 'highlight' ? '🖍️' : 
                     annotation.type === 'note' ? '📌' : '🔖';
        parts.push(`${icon} ${annotation.type}: "${annotation.text || ''}"`);
        if (annotation.note) {
          parts.push(`   💭 Note: "${annotation.note}"`);
        }
      });
    }
    
    // Current text selection
    if (bookContext.currentText) {
      parts.push(`\n📝 Selected Text: "${bookContext.currentText.slice(0, 500)}..."`);
    }
    
    return parts.join('\n');
  };
  
  return (
    <AIContext.Provider value={{
      bookContext,
      annotations,
      selectedAnnotations,
      setSelectedAnnotations,
      getFormattedContext,
      refreshAnnotations,
    }}>
      {children}
    </AIContext.Provider>
  );
}

export const useAIContext = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAIContext must be used within AIContextProvider');
  }
  return context;
};
```

## Message Persistence

### Storage Functions
```typescript
// Save chat messages
export async function saveChat({
  chatId,
  messages,
}: {
  chatId: string;
  messages: Message[];
}): Promise<void> {
  // Save to database/storage
  await supabase
    .from('chats')
    .upsert({ id: chatId, messages: JSON.stringify(messages) });
}

// Load chat messages
export async function loadChat(chatId: string): Promise<Message[]> {
  const { data } = await supabase
    .from('chats')
    .select('messages')
    .eq('id', chatId)
    .single();
  
  return data ? JSON.parse(data.messages) : [];
}
```

## Error Handling

```typescript
try {
  const result = await generateText({
    model: openai(selectedModel),
    messages: messages,
  });
  
  return { success: true, content: result.text };
} catch (error) {
  console.error('AI generation error:', error);
  
  // Handle specific error types
  if (error instanceof Error) {
    if (error.message.includes('rate limit')) {
      return { error: 'Rate limit exceeded. Please try again later.' };
    }
    if (error.message.includes('context length')) {
      return { error: 'Message too long. Please shorten your input.' };
    }
  }
  
  return { error: 'An error occurred. Please try again.' };
}
```

## Provider Options

### GPT-5 Specific Options
```typescript
const result = await generateText({
  model: openai('gpt-5'),
  providerOptions: {
    openai: {
      // GPT-5 supports these options
      maxCompletionTokens: 4000,
      temperature: 0.7,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
      user: userId, // For tracking
      
      // Multimodal options
      imageDetail: 'high', // for image inputs
      
      // Advanced features
      structuredOutputs: true,
      parallelToolCalls: true,
    }
  }
});
```

### GPT-4.1 Specific Options
```typescript
const result = await generateText({
  model: openai('gpt-4.1'),
  providerOptions: {
    openai: {
      // GPT-4.1 enhanced capabilities
      logprobs: true, // Get token probabilities
      topLogprobs: 5,
      
      // Context caching for repeated prompts
      promptCacheKey: `book-${bookId}`,
      
      // Safety and monitoring
      safetyIdentifier: userId,
      
      // Response control
      textVerbosity: 'medium', // 'low', 'medium', 'high'
    }
  }
});
```

## Implementation Checklist

### Core Components
- [x] AI Context Provider (`/lib/ai-context.tsx`)
- [x] AI Assistant Component (`/components/ai-assistant.tsx`)
- [x] Annotation Selector (`/components/annotation-selector.tsx`)
- [x] API Route Handler (`/app/api/ai-chat/route.ts`)
- [x] Enhanced AI Assistant Wrapper (`/components/reader/EnhancedAIAssistant.tsx`)

### Features
- [x] Model selector dropdown (GPT-5, GPT-5 Mini, GPT-5 Nano, GPT-4.1)
- [x] Context injection from book/chapter/page
- [x] Highlight and note selection for context
- [x] Non-streaming implementation
- [x] Glassmorphic UI design
- [x] Message persistence
- [x] Error handling

### Integration Points
- [x] Reader page integration
- [x] Supabase database integration
- [x] Authentication handling
- [x] Theme compatibility (dark/light mode)

## SDK Core Settings Reference

### Common Settings
```typescript
interface GenerationSettings {
  // Token control
  maxOutputTokens?: number;        // Max tokens to generate
  maxSteps?: number;               // Max tool call steps (default: 1)
  
  // Sampling parameters
  temperature?: number;            // Randomness (0 = deterministic)
  topP?: number;                  // Nucleus sampling (0-1)
  topK?: number;                  // Top-K sampling
  presencePenalty?: number;       // Reduce repetition from prompt
  frequencyPenalty?: number;      // Reduce repeated words
  
  // Control
  stopSequences?: string[];       // Stop generation triggers
  seed?: number;                  // Deterministic generation
  
  // Tool control
  toolChoice?: 'auto' | 'required' | 'none' | {
    type: 'tool';
    toolName: string;
  };
  
  // Error handling
  maxRetries?: number;            // Retry attempts (default: 2)
  abortSignal?: AbortSignal;     // Cancel generation
  
  // HTTP
  headers?: Record<string, string>;
}
```

### Structured Output
```typescript
import { generateObject, streamObject } from 'ai';
import { z } from 'zod';

// Generate structured data
const { object } = await generateObject({
  model: openai('gpt-5'),
  schema: z.object({
    summary: z.string(),
    themes: z.array(z.string()),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    keyPoints: z.array(z.object({
      point: z.string(),
      importance: z.number().min(1).max(10),
    })),
  }),
  prompt: 'Analyze this chapter',
});

// Stream structured data
const stream = streamObject({
  model: openai('gpt-5'),
  schema: bookAnalysisSchema,
  prompt: 'Analyze this book',
});

for await (const partialObject of stream.partialObjectStream) {
  console.log(partialObject); // Incrementally builds object
}
```

## Best Practices

1. **Context Management**
   - Keep context concise and relevant
   - Truncate long text selections (500-1000 chars)
   - Include structured metadata
   - Use annotations effectively

2. **Performance**
   - Use streaming for interactive features
   - Use non-streaming for background tasks
   - Cache frequently used responses
   - Implement request debouncing
   - Choose appropriate model sizes

3. **User Experience**
   - Display tool calls visually
   - Show loading states clearly
   - Provide helpful error messages
   - Allow context preview
   - Support message editing/regeneration

4. **Security**
   - Validate and sanitize all inputs
   - Never expose API keys client-side
   - Implement rate limiting
   - Use Row Level Security (RLS)
   - Sanitize tool outputs

5. **Cost Optimization**
   - Use GPT-5-Nano for simple tasks
   - Use GPT-5-Mini for most interactions
   - Reserve GPT-5 for complex analysis
   - Implement token counting
   - Set appropriate maxOutputTokens
   - Cache responses where possible

6. **Agent Design**
   - Start with simple single-step agents
   - Add complexity incrementally
   - Use routing for efficiency
   - Implement error recovery
   - Monitor agent performance

## Testing Considerations

```typescript
// Test different models
const testModels = async () => {
  const models: AIModel[] = ['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1'];
  
  for (const model of models) {
    const result = await generateText({
      model: openai(model),
      prompt: 'Test prompt',
    });
    console.log(`${model}: ${result.text}`);
  }
};

// Test context injection
const testContext = async () => {
  const context = {
    bookTitle: 'Test Book',
    chapter: 'Chapter 1',
    selectedText: 'Sample text'
  };
  
  const result = await generateText({
    model: openai('gpt-5'),
    system: 'You are a reading assistant',
    prompt: `Analyze this text: ${context.selectedText}`,
  });
};
```

## UI Components for AI Features

### Message Component with Tool Display
```typescript
export function AIMessage({ message }: { message: Message }) {
  return (
    <div className="group relative">
      {/* Message header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-sage-600">
          {message.role === 'user' ? '👤' : '🤖'}
        </span>
        <span className="text-xs text-sage-500">
          {message.model || 'GPT-5'}
        </span>
      </div>
      
      {/* Message content */}
      <div className="prose prose-sage max-w-none">
        {message.content}
      </div>
      
      {/* Tool invocations */}
      {message.toolInvocations?.map((tool, idx) => (
        <div key={idx} className="mt-2">
          <ToolCallDisplay toolCall={tool} />
        </div>
      ))}
    </div>
  );
}
```

### Loading States
```typescript
export function AILoadingState({ type = 'thinking' }: { type?: string }) {
  const messages = {
    thinking: 'Thinking...',
    searching: 'Searching book...',
    analyzing: 'Analyzing text...',
    tool: 'Using tools...',
  };
  
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-sage-50/50">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-sage-600 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <span className="text-sm text-sage-600">
        {messages[type] || messages.thinking}
      </span>
    </div>
  );
}
```

## Environment Variables

```env
# Required
OPENAI_API_KEY=your-api-key

# Optional
OPENAI_ORG_ID=your-org-id
OPENAI_PROJECT_ID=your-project-id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Feature Flags
NEXT_PUBLIC_AI_STREAMING_ENABLED=true
NEXT_PUBLIC_AI_TOOLS_ENABLED=true
NEXT_PUBLIC_AI_AGENTS_ENABLED=false
```

## Implementation Roadmap

### Phase 1: Core Chat Functionality ✅
- [x] Basic chat interface
- [x] Model selection dropdown
- [x] Context injection from book
- [x] Message persistence
- [x] Error handling

### Phase 2: Enhanced Context (Current)
- [ ] Fix annotation visibility in AI
- [ ] Implement annotation selector UI
- [ ] Add current page/chapter context
- [ ] Support text selection context
- [ ] Context preview before sending

### Phase 3: Tool Integration
- [ ] Implement book search tool
- [ ] Add definition lookup tool
- [ ] Create annotation search tool
- [ ] Display tool calls in UI
- [ ] Tool result formatting

### Phase 4: Streaming Support
- [ ] Implement streaming endpoints
- [ ] Add streaming UI components
- [ ] Token-by-token display
- [ ] Streaming tool calls
- [ ] Abort/stop functionality

### Phase 5: Agent Capabilities
- [ ] Build reading comprehension agent
- [ ] Create study guide generator
- [ ] Implement quote finder agent
- [ ] Add theme analysis agent
- [ ] Multi-step workflows

### Phase 6: Advanced Features
- [ ] Structured output for summaries
- [ ] Multi-modal support (book images)
- [ ] Voice input/output
- [ ] Export conversations
- [ ] Conversation branching

## Deployment Notes

1. **Environment Setup**
   - Set all required environment variables
   - Configure API keys securely
   - Set up rate limiting

2. **Testing**
   - Test all model endpoints
   - Verify tool execution
   - Check streaming functionality
   - Test error recovery

3. **Monitoring**
   - Track API usage and costs
   - Monitor response times
   - Log errors properly
   - Set up alerts

4. **Performance**
   - Implement caching strategy
   - Optimize context size
   - Use CDN for static assets
   - Enable compression

5. **Security**
   - Validate all inputs
   - Implement CORS properly
   - Use secure headers
   - Regular security audits

6. **UX Polish**
   - Test mobile responsiveness
   - Verify theme compatibility
   - Ensure accessibility
   - Optimize loading states