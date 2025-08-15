// Mock AI API utilities for the premium chat panel

export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  context?: Array<{
    type: string;
    content: string;
    metadata?: any;
  }>;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  citations?: Array<{
    id: string;
    text: string;
    source: any;
  }>;
  suggestions?: string[];
}

// Mock response templates based on different types of queries
const responseTemplates = {
  summary: [
    "This chapter explores the central theme of {topic}, examining how the author uses {technique} to convey deeper meaning about {concept}. The narrative progression shows {character}'s transformation from {state1} to {state2}, highlighting the universal human experience of {theme}.",
    "The key points in this section revolve around {concept}, with particular emphasis on {detail}. The author establishes {argument} through careful use of {evidence}, building toward the conclusion that {insight}. This connects to earlier themes of {connection}.",
    "In this passage, we see a masterful exploration of {theme} through the lens of {perspective}. The author employs {technique} to create a sense of {mood}, while simultaneously developing the idea that {thesis}. This serves as a crucial turning point in understanding {broader_concept}."
  ],
  
  explanation: [
    "Let me break this down for you: The author is essentially saying that {core_idea}. Think of it like {analogy} - when {simple_example}, you get {result}. In this context, {character/concept} represents {meaning}, which helps us understand {bigger_picture}.",
    "This is a fascinating concept! Imagine {relatable_scenario} - that's similar to what's happening here. The author uses {technique} to show how {concept} affects {subject}. The underlying message is that {theme}, which becomes clearer when we consider {context}.",
    "To understand this better, consider {everyday_example}. The author is drawing a parallel between {concept1} and {concept2}, suggesting that {insight}. This technique of {method} helps readers grasp the complex idea that {conclusion}."
  ],
  
  analysis: [
    "From a literary perspective, this passage employs several sophisticated techniques. The use of {device1} creates {effect1}, while {device2} reinforces {theme}. The juxtaposition of {element1} and {element2} serves to highlight {contrast}, ultimately revealing {deeper_meaning}.",
    "The structural elements here are particularly noteworthy. The author's choice of {technique} at this point in the narrative serves multiple purposes: it {purpose1}, {purpose2}, and perhaps most importantly, {purpose3}. This multilayered approach enriches our understanding of {central_theme}.",
    "Analyzing the symbolic elements, we can see that {symbol} represents {meaning}, while {other_element} functions as {role}. The interplay between these creates a rich tapestry of meaning that speaks to {universal_theme}. The author's mastery is evident in how {specific_technique} enhances {overall_effect}."
  ],
  
  translation: [
    "Here's the translation to {language}: {translated_text}. Note that {cultural_note} in the original language carries additional connotations of {nuance}, which is challenging to fully capture in translation.",
    "In {language}, this would be: {translated_text}. The original phrase {original_phrase} has a particular {quality} that I've tried to preserve by using {translation_choice}.",
    "The {language} translation reads: {translated_text}. It's worth noting that {idiom/expression} doesn't have a direct equivalent, so I've rendered it as {alternative} to maintain the intended meaning of {concept}."
  ],
  
  definition: [
    "{term} refers to {definition}. In this context, the author uses it to mean {contextual_meaning}, which adds layers of significance to {related_concept}. This usage is particularly {adjective} because {reason}.",
    "The term {term} has multiple meanings, but here it signifies {specific_meaning}. Originating from {etymology}, it has evolved to encompass {modern_usage}. The author's employment of this term suggests {implication}.",
    "{term} is defined as {definition}. However, within the framework of this text, it takes on additional dimensions of {extended_meaning}. This enriched understanding helps us appreciate {broader_point}."
  ]
};

// Generate contextual filler content
const fillers = {
  topics: ['identity', 'transformation', 'human nature', 'society', 'morality', 'consciousness', 'freedom', 'power', 'love', 'death'],
  techniques: ['metaphor', 'symbolism', 'irony', 'foreshadowing', 'allegory', 'imagery', 'parallelism', 'juxtaposition'],
  concepts: ['redemption', 'isolation', 'belonging', 'sacrifice', 'ambition', 'integrity', 'resilience', 'truth', 'justice'],
  moods: ['tension', 'melancholy', 'anticipation', 'nostalgia', 'unease', 'wonder', 'contemplation', 'urgency'],
  devices: ['alliteration', 'personification', 'repetition', 'contrast', 'rhythm', 'tone shift', 'narrative voice'],
};

// Helper to randomly select from array
const randomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper to fill template with random values
const fillTemplate = (template: string): string => {
  return template.replace(/{(\w+)}/g, (match, key) => {
    if (fillers[key as keyof typeof fillers]) {
      return randomFrom(fillers[key as keyof typeof fillers] as string[]);
    }
    switch(key) {
      case 'topic': return randomFrom(fillers.topics);
      case 'technique': return randomFrom(fillers.techniques);
      case 'concept': return randomFrom(fillers.concepts);
      case 'mood': return randomFrom(fillers.moods);
      case 'device1':
      case 'device2': return randomFrom(fillers.devices);
      case 'theme':
      case 'central_theme':
      case 'broader_concept':
      case 'bigger_picture':
      case 'deeper_meaning':
      case 'universal_theme': return randomFrom(fillers.concepts);
      case 'character': return randomFrom(['the protagonist', 'the narrator', 'the author', 'the reader']);
      case 'state1': return randomFrom(['ignorance', 'innocence', 'certainty', 'isolation', 'complacency']);
      case 'state2': return randomFrom(['understanding', 'experience', 'doubt', 'connection', 'awareness']);
      case 'analogy':
      case 'simple_example':
      case 'everyday_example':
      case 'relatable_scenario': return randomFrom([
        'a river flowing toward the sea',
        'a seed growing into a tree',
        'learning to ride a bicycle',
        'solving a complex puzzle',
        'navigating through fog'
      ]);
      case 'language': return randomFrom(['Spanish', 'French', 'German', 'Japanese', 'Italian']);
      case 'term': return randomFrom(['paradigm', 'zeitgeist', 'hubris', 'catharsis', 'epiphany']);
      default: return match;
    }
  });
};

// Detect query type from message
const detectQueryType = (message: string): keyof typeof responseTemplates => {
  const lower = message.toLowerCase();
  
  if (lower.includes('summarize') || lower.includes('summary') || lower.includes('main points')) {
    return 'summary';
  }
  if (lower.includes('explain') || lower.includes('what does') || lower.includes('help me understand')) {
    return 'explanation';
  }
  if (lower.includes('analyze') || lower.includes('analysis') || lower.includes('deeper meaning')) {
    return 'analysis';
  }
  if (lower.includes('translate') || lower.includes('translation')) {
    return 'translation';
  }
  if (lower.includes('define') || lower.includes('definition') || lower.includes('what is')) {
    return 'definition';
  }
  
  // Default to explanation
  return 'explanation';
};

// Generate mock citations based on context
const generateCitations = (hasContext: boolean): ChatResponse['citations'] => {
  if (!hasContext || Math.random() > 0.6) return undefined;
  
  const numCitations = Math.floor(Math.random() * 3) + 1;
  const citations = [];
  
  for (let i = 0; i < numCitations; i++) {
    citations.push({
      id: `cite-${i + 1}`,
      text: `[${i + 1}]`,
      source: {
        type: randomFrom(['highlight', 'note', 'bookmark']),
        title: randomFrom([
          'Your highlighted passage',
          'Related note',
          'Bookmarked section',
          'Earlier annotation'
        ]),
        location: `Chapter ${Math.floor(Math.random() * 10) + 1}, Page ${Math.floor(Math.random() * 200) + 1}`,
        snippet: fillTemplate('This connects to your earlier observation about {concept} and how it relates to {theme}.')
      }
    });
  }
  
  return citations;
};

// Generate follow-up suggestions
const generateSuggestions = (): string[] => {
  const suggestions = [
    'Tell me more about ' + randomFrom(fillers.concepts),
    'How does this relate to ' + randomFrom(fillers.topics) + '?',
    'Can you explain the ' + randomFrom(fillers.techniques) + ' used here?',
    'What\'s the significance of this passage?',
    'Summarize the key themes',
    'Analyze the author\'s tone',
    'Compare this to earlier chapters',
    'What literary devices are being used?'
  ];
  
  // Return 2-4 random suggestions
  const num = Math.floor(Math.random() * 3) + 2;
  return suggestions.sort(() => Math.random() - 0.5).slice(0, num);
};

// Main mock chat function
export async function mockChatCompletion(request: ChatRequest): Promise<ChatResponse> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  // Get the last user message
  const lastMessage = request.messages[request.messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user') {
    throw new Error('Invalid request: missing user message');
  }
  
  // Detect query type and generate response
  const queryType = detectQueryType(lastMessage.content);
  const templates = responseTemplates[queryType];
  const template = randomFrom(templates);
  const content = fillTemplate(template);
  
  // Add citations if context is provided
  const hasContext = request.context && request.context.length > 0;
  const citations = generateCitations(hasContext);
  
  // Add suggestions
  const suggestions = Math.random() > 0.3 ? generateSuggestions() : undefined;
  
  return {
    content,
    citations,
    suggestions
  };
}

// Streaming version of the chat function
export async function* mockChatCompletionStream(request: ChatRequest) {
  // Get response first
  const response = await mockChatCompletion(request);
  
  // Split into words and stream them
  const words = response.content.split(' ');
  
  for (let i = 0; i < words.length; i++) {
    // Simulate token generation delay
    await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 60));
    
    // Yield word with space
    yield {
      content: words[i] + (i < words.length - 1 ? ' ' : ''),
      done: i === words.length - 1,
      citations: i === words.length - 1 ? response.citations : undefined,
      suggestions: i === words.length - 1 ? response.suggestions : undefined
    };
  }
}

// Mock function to get reader context (bookmarks, highlights, notes)
export async function mockGetReaderContext(bookId: string, userId: string) {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  
  return {
    highlights: Array.from({ length: Math.floor(Math.random() * 10) + 5 }, (_, i) => ({
      id: `highlight-${i}`,
      text: fillTemplate('This passage about {concept} demonstrates how {theme} intersects with {topic}.'),
      chapter: `Chapter ${Math.floor(Math.random() * 10) + 1}`,
      location: `Page ${Math.floor(Math.random() * 200) + 1}`,
      color: randomFrom(['yellow', 'green', 'blue', 'purple', 'pink']),
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    })),
    
    notes: Array.from({ length: Math.floor(Math.random() * 5) + 2 }, (_, i) => ({
      id: `note-${i}`,
      text: fillTemplate('Interesting connection to {concept}'),
      content: fillTemplate('This reminds me of {analogy}. The author\'s use of {technique} here creates a powerful {mood} that emphasizes {theme}.'),
      chapter: `Chapter ${Math.floor(Math.random() * 10) + 1}`,
      location: `Page ${Math.floor(Math.random() * 200) + 1}`,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    })),
    
    bookmarks: Array.from({ length: Math.floor(Math.random() * 8) + 3 }, (_, i) => ({
      id: `bookmark-${i}`,
      chapter: `Chapter ${Math.floor(Math.random() * 10) + 1}`,
      location: `Page ${Math.floor(Math.random() * 200) + 1}`,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    }))
  };
}

// Mock error scenarios for testing
export async function mockAPIError(type: 'network' | 'timeout' | 'server' | 'rate-limit' = 'network') {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  switch(type) {
    case 'network':
      throw new Error('Network error: Unable to connect to AI service');
    case 'timeout':
      throw new Error('Request timeout: The AI service took too long to respond');
    case 'server':
      throw new Error('Server error: The AI service encountered an error');
    case 'rate-limit':
      throw new Error('Rate limit exceeded: Please wait a moment before trying again');
    default:
      throw new Error('An unexpected error occurred');
  }
}