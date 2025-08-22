import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

// Model type matching the frontend
type AIModel = 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-4.1';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json();

    // Validate model
    if (!model || !['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1'].includes(model)) {
      return NextResponse.json(
        { error: 'Invalid model specified' },
        { status: 400 }
      );
    }

    // Format messages for the AI SDK
    const formattedMessages = messages.map((msg: ChatMessage) => ({
      role: msg.role,
      content: msg.content,
    }));
    const result = await generateText({
      model: openai(model),
      messages: formattedMessages,
      // Enhanced system prompt for context-aware reading assistance
      system: `You are an advanced AI reading assistant integrated into an EPUB reader application. 
      Your purpose is to enhance the reading experience through intelligent comprehension support.
      
      Key capabilities:
      - Analyze and explain complex passages from books
      - Provide context and background information
      - Answer questions about plot, characters, themes, and literary devices
      - Help with vocabulary and language understanding
      - Offer reading insights and connections to broader themes
      - Support academic and casual reading equally well
      
      When context is provided (book title, chapter, selected text, or annotations):
      - Reference the specific content in your responses
      - Maintain awareness of the book's narrative and themes
      - Connect concepts across different parts of the text
      - Build upon previous annotations and highlights
      
      Response style:
      - Clear, educational, and engaging
      - Adapt complexity to match the reader's needs
      - Use examples from the text when relevant
      - Encourage deeper thinking about the material
      
      You are using the ${model} model for this conversation.`,
      temperature: 0.7,
      maxOutputTokens: 2000,
    });

    // Return the generated text as JSON
    return NextResponse.json({
      content: result.text,
      model: model,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Error in AI chat API:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    );
  }
}