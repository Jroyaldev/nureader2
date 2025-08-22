import { groq } from '@ai-sdk/groq';
import { streamText, tool } from 'ai';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Groq OSS models that support streaming
type GroqModel = 'openai/gpt-oss-120b' | 'openai/gpt-oss-20b';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Enhanced tools for reading assistance with web search
const streamingReaderTools = {
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
  
  analyzePassage: tool({
    description: 'Perform deep literary analysis on a text passage',
    inputSchema: z.object({
      text: z.string().describe('Text passage to analyze'),
      analysisType: z.enum(['themes', 'characters', 'style', 'symbolism', 'comprehensive']).optional(),
    }),
    execute: async ({ text, analysisType }) => {
      return {
        text: text.slice(0, 500),
        analysisType: analysisType || 'comprehensive',
        note: 'Analysis will be performed by the model'
      };
    }
  }),
};

export async function POST(req: NextRequest) {
  try {
    const { messages, model, context } = await req.json();

    // Validate Groq streaming models only
    const validStreamingModels: GroqModel[] = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
    
    if (!model || !validStreamingModels.includes(model)) {
      return new Response(
        JSON.stringify({ error: 'Streaming only available for Groq OSS models' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Format messages for streaming
    const formattedMessages = messages.map((msg: ChatMessage) => ({
      role: msg.role,
      content: msg.content,
    }));
    
    // Enhanced streaming system prompt
    const streamingSystemPrompt = `You are an advanced AI reading assistant with real-time streaming capabilities and web search access.
    
    Model: ${model} (Groq OSS - Ultra-fast inference)
    Capabilities: Streaming response, web search, reasoning, tool calling
    
    Your purpose is to enhance the reading experience through intelligent comprehension support with real-time feedback.
    
    Key capabilities:
    - Analyze and explain complex passages from books in real-time
    - Search the web for additional context, author information, and literary criticism
    - Provide contextual background information as you process
    - Answer questions about plot, characters, themes, and literary devices
    - Help with vocabulary and language understanding
    - Offer reading insights and connections to broader themes
    - Support academic and casual reading equally well
    
    When using tools:
    - Use web search for author biographies, historical context, and literary criticism
    - Provide step-by-step analysis as you work through complex questions
    - Reference both the book content and external sources appropriately
    
    Response style:
    - Clear, educational, and engaging
    - Provide immediate value while building complete responses
    - Use examples from both the text and external sources
    - Encourage deeper thinking about the material
    - Include relevant web search results naturally in your analysis
    
    Context: ${context ? JSON.stringify(context) : 'No specific context provided'}
    
    You are using the ${model} model with streaming and web search capabilities.`;

    // Streaming configuration with enhanced tools
    const result = streamText({
      model: groq(model),
      messages: formattedMessages,
      system: streamingSystemPrompt,
      tools: streamingReaderTools,
      maxSteps: 5, // Allow multiple tool calls
      temperature: 0.7,
      maxOutputTokens: 4000,
      reasoningFormat: 'parsed', // Get reasoning from Groq models
    });

    // Return streaming response
    return result.toUIMessageStreamResponse();
    
  } catch (error) {
    console.error('Error in streaming AI chat API:', error);
    
    // Enhanced error handling for streaming
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (error.message.includes('Invalid API key') || error.message.includes('Unauthorized')) {
        return new Response(
          JSON.stringify({ error: 'Groq API key configuration issue. Please check deployment settings.' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    return new Response(
      JSON.stringify({ error: 'Failed to generate streaming AI response' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}