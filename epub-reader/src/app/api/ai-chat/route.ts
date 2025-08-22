import { openai } from '@ai-sdk/openai';
import { groq } from '@ai-sdk/groq';
import { generateText, tool } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Enhanced model types including Groq OSS models
type AIModel = 
  | 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-4.1'  // OpenAI
  | 'openai/gpt-oss-120b' | 'openai/gpt-oss-20b';      // Groq OSS

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Provider and capability detection
const getProvider = (model: AIModel) => {
  if (model.startsWith('openai/gpt-oss-')) {
    return groq(model);
  }
  return openai(model);
};

const supportsStreaming = (model: AIModel): boolean => {
  return model.startsWith('openai/gpt-oss-');
};

const supportsWebSearch = (model: AIModel): boolean => {
  return model === 'openai/gpt-oss-120b' || model === 'openai/gpt-oss-20b';
};

// Enhanced tools for reading assistance with web search
const readerTools = {
  searchBookContext: tool({
    description: 'Search the web for background information about the book, author, historical context, or literary criticism',
    inputSchema: z.object({
      query: z.string().describe('Specific search query about the book or context'),
      focus: z.enum(['author_biography', 'historical_context', 'literary_criticism', 'book_analysis', 'cultural_background']).optional(),
    }),
    execute: async ({ query, focus }) => {
      // This will be handled by Groq's built-in browser search
      return { 
        query: query,
        focus: focus || 'general',
        note: 'Web search executed for enhanced context'
      };
    }
  }),
};

export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json();

    // Validate model
    const validModels: AIModel[] = [
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
    const canStream = supportsStreaming(model);
    const hasWebSearch = supportsWebSearch(model);
    
    // Format messages for the AI SDK
    const formattedMessages = messages.map((msg: ChatMessage) => ({
      role: msg.role,
      content: msg.content,
    }));
    
    // Enhanced system prompt with model-specific capabilities
    const systemPrompt = `You are an advanced AI reading assistant integrated into an EPUB reader application. 
    Your purpose is to enhance the reading experience through intelligent comprehension support.
    
    Model: ${model}
    Capabilities: ${hasWebSearch ? 'Web search enabled, ' : ''}${canStream ? 'streaming response, ' : ''}reasoning, tool calling
    
    Key capabilities:
    - Analyze and explain complex passages from books
    - Provide context and background information
    - Answer questions about plot, characters, themes, and literary devices
    - Help with vocabulary and language understanding
    - Offer reading insights and connections to broader themes
    - Support academic and casual reading equally well
    ${hasWebSearch ? '- Search the web for additional context, author information, historical background, and literary criticism' : ''}
    
    When context is provided (book title, chapter, selected text, or annotations):
    - Reference the specific content in your responses
    - Maintain awareness of the book's narrative and themes
    - Connect concepts across different parts of the text
    - Build upon previous annotations and highlights
    ${hasWebSearch ? '- Use web search to provide enriched context and background information when relevant' : ''}
    
    Response style:
    - Clear, educational, and engaging
    - Adapt complexity to match the reader's needs
    - Use examples from the text when relevant
    - Encourage deeper thinking about the material
    ${hasWebSearch ? '- Include relevant external sources and connections when helpful' : ''}
    
    You are using the ${model} model for this conversation.`;
    
    // Base configuration for generateText
    const baseConfig: any = {
      model: provider,
      messages: formattedMessages,
      system: systemPrompt,
      temperature: 0.7,
      maxOutputTokens: model.includes('gpt-oss') ? 4000 : 2000,
    };
    
    // Add tools and steps for web search models
    if (hasWebSearch) {
      baseConfig.tools = {
        ...readerTools,
        // Groq automatically provides browser_search tool
      };
      baseConfig.maxSteps = 5; // Allow multiple tool calls for web search
    }
    
    // Add Groq-specific options directly (not in providerOptions for Groq)
    if (model.includes('gpt-oss')) {
      baseConfig.reasoningFormat = 'parsed';
    }
    
    const result = await generateText(baseConfig);

    // Return enhanced response with reasoning and tool calls
    return NextResponse.json({
      content: result.text,
      model: model,
      usage: result.usage,
      reasoning: result.reasoning, // Available for Groq models
      toolCalls: result.steps?.flatMap(s => s.toolCalls || []) || [],
      capabilities: {
        streaming: canStream,
        webSearch: hasWebSearch,
        reasoning: true,
      },
    });
  } catch (error) {
    console.error('Error in AI chat API:', error);
    
    // Enhanced error handling with specific error types
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
      if (error.message.includes('model_not_found') || error.message.includes('model not found')) {
        return NextResponse.json(
          { error: 'Model not available. Please try a different model.' },
          { status: 400 }
        );
      }
      if (error.message.includes('Invalid API key') || error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'API key configuration issue. Please check deployment settings.' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    );
  }
}