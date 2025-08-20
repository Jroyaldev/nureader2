import { SavedAnnotation } from './epub-renderer';

// Missing type definition for HighlightData
interface HighlightData {
  id: string;
  searchText: string;
  location: any;
  textContext?: string;
  color?: string;
  type?: string;
  annotation_type?: string;
}

// SOP Error Classification System
enum HighlightErrorType {
  TEXT_NOT_FOUND = 'TEXT_NOT_FOUND',
  DOM_STRUCTURE_CHANGED = 'DOM_STRUCTURE_CHANGED',
  CROSS_NODE_TEXT = 'CROSS_NODE_TEXT',
  FORMATTING_MISMATCH = 'FORMATTING_MISMATCH',
  ENCODING_ISSUE = 'ENCODING_ISSUE',
  INVALID_ANNOTATION = 'INVALID_ANNOTATION',
  TIMEOUT_EXCEEDED = 'TIMEOUT_EXCEEDED',
  RANGE_CREATION_FAILED = 'RANGE_CREATION_FAILED',
  DOM_MANIPULATION_FAILED = 'DOM_MANIPULATION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

interface HighlightError {
  type: HighlightErrorType;
  message: string;
  context?: any;
  timestamp: number;
  strategy?: string;
  recoverable: boolean;
}

interface HighlightAttempt {
  annotation: SavedAnnotation;
  attempts: number;
  lastAttempt: number;
  errors: HighlightError[];
  strategy: 'cfi' | 'text' | 'fuzzy' | 'cross-node' | 'partial' | 'context';
  fallbackStrategies?: string[];
  skipReason?: string;
}

interface HighlightState {
  id: string;
  applied: boolean;
  element?: HTMLElement;
  range?: Range;
  lastValidated: number;
}

interface DOMStabilityConfig {
  maxWaitTime: number;
  checkInterval: number;
  stabilityThreshold: number;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// SOP Performance and Timeout Configuration
interface SOPConfig {
  maxProcessingTime: number; // Maximum time to spend on a single highlight
  maxTotalProcessingTime: number; // Maximum time for batch processing
  enableFallbackStrategies: boolean;
  enableStructuredLogging: boolean;
  enableUserFeedback: boolean;
  gracefulDegradation: boolean;
}

// SOP Structured Logging System
class HighlightLogger {
  private logs: Array<{
    timestamp: number;
    level: 'info' | 'warn' | 'error';
    message: string;
    context?: any;
    annotationId?: string;
    strategy?: string;
  }> = [];

  private maxLogs = 1000;

  log(level: 'info' | 'warn' | 'error', message: string, context?: any, annotationId?: string, strategy?: string): void {
    const logEntry: any = {
      timestamp: Date.now(),
      level,
      message
    };
    
    if (context !== undefined) logEntry.context = context;
    if (annotationId !== undefined) logEntry.annotationId = annotationId;
    if (strategy !== undefined) logEntry.strategy = strategy;
    
    this.logs.push(logEntry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with structured format
    const logPrefix = `[HighlightSOP:${level.toUpperCase()}]`;
    const logMessage = annotationId ? `${logPrefix} [${annotationId}] ${message}` : `${logPrefix} ${message}`;
    
    if (level === 'error') {
      console.error(logMessage, context);
    } else if (level === 'warn') {
      console.warn(logMessage, context);
    } else {
      console.log(logMessage, context);
    }
  }

  getStats(): {
    total: number;
    byLevel: Record<string, number>;
    recentErrors: Array<any>;
    successRate: number;
  } {
    const byLevel = this.logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentErrors = this.logs
      .filter(log => log.level === 'error' && Date.now() - log.timestamp < 300000) // Last 5 minutes
      .slice(-10);

    const successRate = byLevel.info ? (byLevel.info / this.logs.length) * 100 : 0;

    return {
      total: this.logs.length,
      byLevel,
      recentErrors,
      successRate
    };
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// SOP Error Classification and Recovery System
class SOPErrorHandler {
  private logger: HighlightLogger;

  constructor(logger: HighlightLogger) {
    this.logger = logger;
  }

  classifyError(error: any, context: any): HighlightError {
    const timestamp = Date.now();
    let errorType = HighlightErrorType.UNKNOWN_ERROR;
    let recoverable = true;
    let message = 'Unknown error occurred';

    if (error instanceof Error) {
      message = error.message;
      
      // Classify based on error message patterns
      if (message.includes('Text not found')) {
        errorType = HighlightErrorType.TEXT_NOT_FOUND;
        recoverable = true;
      } else if (message.includes('Range') || message.includes('range')) {
        errorType = HighlightErrorType.RANGE_CREATION_FAILED;
        recoverable = true;
      } else if (message.includes('DOM') || message.includes('element')) {
        errorType = HighlightErrorType.DOM_MANIPULATION_FAILED;
        recoverable = false;
      } else if (message.includes('timeout') || message.includes('Timeout')) {
        errorType = HighlightErrorType.TIMEOUT_EXCEEDED;
        recoverable = false;
      }
    }

    // Additional context-based classification
    if (context?.searchText && typeof context.searchText !== 'string') {
      errorType = HighlightErrorType.INVALID_ANNOTATION;
      recoverable = false;
    }

    const highlightError: HighlightError = {
      type: errorType,
      message,
      context,
      timestamp,
      strategy: context?.strategy,
      recoverable
    };

    this.logger.log('error', `Error classified as ${errorType}`, highlightError, context?.annotationId, context?.strategy);
    
    return highlightError;
  }

  shouldRetry(error: HighlightError, attempts: number, maxAttempts: number): boolean {
    if (attempts >= maxAttempts) return false;
    if (!error.recoverable) return false;
    
    // Don't retry certain error types
    const nonRetryableErrors = [
      HighlightErrorType.INVALID_ANNOTATION,
      HighlightErrorType.DOM_MANIPULATION_FAILED
    ];
    
    return !nonRetryableErrors.includes(error.type);
  }

  suggestFallbackStrategy(error: HighlightError): string[] {
    const strategies: string[] = [];
    
    switch (error.type) {
      case HighlightErrorType.TEXT_NOT_FOUND:
        strategies.push('cross-node', 'fuzzy', 'partial', 'context');
        break;
      case HighlightErrorType.CROSS_NODE_TEXT:
        strategies.push('cross-node', 'partial');
        break;
      case HighlightErrorType.FORMATTING_MISMATCH:
        strategies.push('fuzzy', 'partial');
        break;
      case HighlightErrorType.RANGE_CREATION_FAILED:
        strategies.push('cross-node', 'context');
        break;
      default:
        strategies.push('fuzzy', 'context');
    }
    
    return strategies;
  }
}

interface TextMatchResult {
  range: Range;
  confidence: number;
  strategy: 'exact' | 'fuzzy' | 'context' | 'cross-node' | 'partial';
  context?: string;
}

/**
 * Enhanced text finder with fuzzy matching and context disambiguation
 */
export class EnhancedTextFinder {
  private document: Document;
  private chapterElement?: Element | undefined;

  constructor(document: Document, chapterElement?: Element | undefined) {
    this.document = document;
    this.chapterElement = chapterElement;
  }

  /**
   * Find text using multiple strategies with confidence scoring and SOP fallback
   */
  async findText(
    searchText: string,
    cfi?: string,
    context?: string,
    fallbackStrategies?: string[]
  ): Promise<TextMatchResult | null> {
    // Validate searchText
    if (!searchText || typeof searchText !== 'string' || searchText.trim().length === 0) {
      console.warn('Invalid searchText provided to findText:', searchText);
      return null;
    }

    // Strategy 1: Exact text match
    const exactMatch = this.findExactText(searchText);
    if (exactMatch) {
      return {
        range: exactMatch,
        confidence: 1.0,
        strategy: 'exact'
      };
    }

    // Strategy 2: CFI-based search with nearby text
    if (cfi) {
      const cfiMatch = await this.findTextNearCfi(searchText, cfi);
      if (cfiMatch) {
        return {
          range: cfiMatch,
          confidence: 0.9,
          strategy: 'exact'
        };
      }
    }

    // Strategy 3: Cross-node text search (SOP Enhancement)
    if (!fallbackStrategies || fallbackStrategies.includes('cross-node')) {
      const crossNodeMatch = this.findTextAcrossNodes(searchText);
      if (crossNodeMatch) {
        return {
          range: crossNodeMatch.range,
          confidence: crossNodeMatch.confidence,
          strategy: 'cross-node'
        };
      }
    }

    // Strategy 4: Fuzzy text matching
    if (!fallbackStrategies || fallbackStrategies.includes('fuzzy')) {
      const fuzzyMatch = this.findFuzzyText(searchText);
      if (fuzzyMatch) {
        return {
          range: fuzzyMatch.range,
          confidence: fuzzyMatch.confidence,
          strategy: 'fuzzy'
        };
      }
    }

    // Strategy 5: Partial text matching (SOP Enhancement)
    if (!fallbackStrategies || fallbackStrategies.includes('partial')) {
      const partialMatch = this.findPartialText(searchText);
      if (partialMatch) {
        return {
          range: partialMatch.range,
          confidence: partialMatch.confidence,
          strategy: 'partial'
        };
      }
    }

    // Strategy 6: Context-based disambiguation
    if (context && (!fallbackStrategies || fallbackStrategies.includes('context'))) {
      const contextMatch = this.findTextWithContext(searchText, context);
      if (contextMatch) {
        return {
          range: contextMatch,
          confidence: 0.7,
          strategy: 'context',
          context
        };
      }
    }

    return null;
  }

  private findExactText(searchText: string): Range | null {
    const walker = this.document.createTreeWalker(
      this.chapterElement || this.document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
      const index = node.textContent?.indexOf(searchText);
      if (index !== undefined && index >= 0) {
        const range = this.document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + searchText.length);
        return range;
      }
    }

    return null;
  }

  private async findTextNearCfi(searchText: string, cfi: string): Promise<Range | null> {
    try {
      const cfiRange = this.getRangeFromCfi(cfi);
      if (!cfiRange) return null;

      // Search within 1000 characters around the CFI position
      const container = cfiRange.commonAncestorContainer;
      const searchRadius = 1000;
      
      const walker = this.document.createTreeWalker(
        container.nodeType === Node.ELEMENT_NODE ? container as Element : container.parentElement!,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node: Text | null;
      while ((node = walker.nextNode() as Text)) {
        const index = node.textContent?.indexOf(searchText);
        if (index !== undefined && index >= 0) {
          const range = this.document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + searchText.length);
          
          // Check if this range is within reasonable distance of CFI
          if (this.isRangeNearCfi(range, cfiRange, searchRadius)) {
            return range;
          }
        }
      }
    } catch (error) {
      console.warn('CFI-based search failed:', error);
    }

    return null;
  }

  private findFuzzyText(searchText: string): { range: Range; confidence: number } | null {
    const words = searchText.toLowerCase().split(/\s+/);
    if (words.length === 0) return null;

    const walker = this.document.createTreeWalker(
      this.chapterElement || this.document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    let bestMatch: { range: Range; confidence: number } | null = null;
    let node: Text | null;

    while ((node = walker.nextNode() as Text)) {
      const text = node.textContent?.toLowerCase() || '';
      const textWords = text.split(/\s+/);
      
      // Find the best matching subsequence
      for (let i = 0; i <= textWords.length - words.length; i++) {
        const subsequence = textWords.slice(i, i + words.length);
        const confidence = this.calculateTextSimilarity(words, subsequence);
        
        if (confidence > 0.7 && (!bestMatch || confidence > bestMatch.confidence)) {
          // Create range for this match
          const firstWord = subsequence[0];
          const lastWord = subsequence[subsequence.length - 1];
          if (!firstWord || !lastWord) continue;
          
          const startIndex = text.indexOf(firstWord);
          const endIndex = text.indexOf(lastWord) + lastWord.length;
          
          if (startIndex >= 0 && endIndex > startIndex) {
            const range = this.document.createRange();
            range.setStart(node, startIndex);
            range.setEnd(node, endIndex);
            bestMatch = { range, confidence };
          }
        }
      }
    }

    return bestMatch;
  }

  private findTextWithContext(searchText: string, context: string): Range | null {
    const contextWords = context.toLowerCase().split(/\s+/).slice(0, 10); // Use first 10 words of context
    
    const walker = this.document.createTreeWalker(
      this.chapterElement || this.document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
      const text = node.textContent?.toLowerCase() || '';
      
      // Check if context words appear near the search text
      const searchIndex = text.indexOf(searchText.toLowerCase());
      if (searchIndex >= 0) {
        const surroundingText = text.substring(
          Math.max(0, searchIndex - 200),
          Math.min(text.length, searchIndex + searchText.length + 200)
        );
        
        const contextMatches = contextWords.filter(word => 
          surroundingText.includes(word)
        ).length;
        
        if (contextMatches >= Math.min(3, contextWords.length * 0.5)) {
          const range = this.document.createRange();
          range.setStart(node, searchIndex);
          range.setEnd(node, searchIndex + searchText.length);
          return range;
        }
      }
    }

    return null;
  }

  /**
   * SOP Enhancement: Get nearby text around a node for context analysis
   */
  // @ts-ignore - Method reserved for future SOP enhancements
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getNearbyText(_node: Text, _radius: number): string {
    const node = _node;
    const radius = _radius;
    const parent = node.parentElement;
    if (!parent) return node.textContent || '';
    
    const walker = this.document.createTreeWalker(
      parent,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const textNodes: Text[] = [];
    let currentNode: Text | null;
    
    while ((currentNode = walker.nextNode() as Text)) {
      textNodes.push(currentNode);
    }
    
    const nodeIndex = textNodes.indexOf(node);
    if (nodeIndex === -1) return node.textContent || '';
    
    let combinedText = '';
    let currentLength = 0;
    
    // Add text from current node
    combinedText = node.textContent || '';
    currentLength = combinedText.length;
    
    // Add text from previous nodes
    for (let i = nodeIndex - 1; i >= 0 && currentLength < radius; i--) {
      const prevText = textNodes[i]?.textContent || '';
      combinedText = prevText + ' ' + combinedText;
      currentLength += prevText.length + 1;
    }
    
    // Add text from next nodes
    currentLength = (node.textContent || '').length;
    for (let i = nodeIndex + 1; i < textNodes.length && currentLength < radius; i++) {
      const nextText = textNodes[i]?.textContent || '';
      combinedText = combinedText + ' ' + nextText;
      currentLength += nextText.length + 1;
    }
    
    return combinedText;
  }

  /**
   * SOP Enhancement: Create a range from nearby text analysis
   */
  // @ts-ignore - Method reserved for future SOP enhancements
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private createRangeFromNearbyText(_node: Text, _searchIndex: number, _length: number): Range | null {
    const node = _node;
    const searchIndex = _searchIndex;
    const length = _length;
    try {
      const nodeText = node.textContent || '';
      const range = this.document.createRange();
      
      // If the search index is within this node
      if (searchIndex < nodeText.length) {
        range.setStart(node, Math.max(0, searchIndex));
        range.setEnd(node, Math.min(nodeText.length, searchIndex + length));
        return range;
      }
      
      // Otherwise, we need to find the correct node and position
      const parent = node.parentElement;
      if (!parent) return null;
      
      const walker = this.document.createTreeWalker(
        parent,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let currentOffset = 0;
      let targetNode: Text | null = null;
      let targetOffset = 0;
      
      while ((targetNode = walker.nextNode() as Text)) {
        const nodeLength = targetNode.textContent?.length || 0;
        
        if (currentOffset + nodeLength > searchIndex) {
          targetOffset = searchIndex - currentOffset;
          break;
        }
        
        currentOffset += nodeLength + 1; // +1 for space between nodes
      }
      
      if (targetNode) {
        range.setStart(targetNode, Math.max(0, targetOffset));
        range.setEnd(targetNode, Math.min(targetNode.textContent?.length || 0, targetOffset + length));
        return range;
      }
      
    } catch (error) {
      console.warn('Failed to create range from nearby text:', error);
    }
    
    return null;
  }

  private calculateTextSimilarity(words1: string[], words2: string[]): number {
    if (words1.length !== words2.length) return 0;
    
    let matches = 0;
    for (let i = 0; i < words1.length; i++) {
      if (words1[i] === words2[i]) {
        matches++;
      } else if (words1[i] && words2[i] && this.levenshteinDistance(words1[i]!, words2[i]!) <= 2) {
        matches += 0.7; // Partial credit for similar words
      }
    }
    
    return matches / words1.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));
    
    for (let i = 0; i <= str1.length; i++) matrix[0]![i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j]![0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j]![i] = Math.min(
          matrix[j]![i - 1]! + 1,
          matrix[j - 1]![i]! + 1,
          matrix[j - 1]![i - 1]! + indicator
        );
      }
    }
    
    return matrix[str2.length]![str1.length]!;
  }

  private getRangeFromCfi(cfi: string): Range | null {
    try {
      // Parse custom CFI format: "chapter-X-Y" where X is chapter, Y is character offset
      const match = cfi.match(/chapter-(\d+)-(\d+)/);
      if (!match) return null;

      const chapterIndex = parseInt(match[1]!);
      const charOffset = parseInt(match[2]!);

      // Find the chapter element
      const chapterElement = this.document.querySelector(`[data-chapter="${chapterIndex}"]`);
      if (!chapterElement) return null;

      // Create range at the specified character offset
      const walker = this.document.createTreeWalker(
        chapterElement,
        NodeFilter.SHOW_TEXT,
        null
      );

      let currentOffset = 0;
      let node: Text | null;
      
      while ((node = walker.nextNode() as Text)) {
        const nodeLength = node.textContent?.length || 0;
        if (currentOffset + nodeLength >= charOffset) {
          const range = this.document.createRange();
          const localOffset = charOffset - currentOffset;
          range.setStart(node, localOffset);
          range.setEnd(node, localOffset);
          return range;
        }
        currentOffset += nodeLength;
      }
    } catch (error) {
      console.warn('Failed to parse CFI:', error);
    }
    
    return null;
  }

  private isRangeNearCfi(range: Range, cfiRange: Range, maxDistance: number): boolean {
    try {
      const rangeRect = range.getBoundingClientRect();
      const cfiRect = cfiRange.getBoundingClientRect();
      
      const distance = Math.sqrt(
        Math.pow(rangeRect.left - cfiRect.left, 2) + 
        Math.pow(rangeRect.top - cfiRect.top, 2)
      );
      
      return distance <= maxDistance;
    } catch {
      return false;
    }
  }

  /**
   * SOP Enhancement: Find text that spans across multiple DOM nodes
   */
  private findTextAcrossNodes(searchText: string): { range: Range; confidence: number } | null {
    const cleanSearchText = searchText.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!cleanSearchText) return null;

    const walker = this.document.createTreeWalker(
      this.chapterElement || this.document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node: Text | null;
    
    // Collect all text nodes
    while ((node = walker.nextNode() as Text)) {
      if (node.textContent && node.textContent.trim()) {
        textNodes.push(node);
      }
    }

    // Try to find text spanning multiple nodes
    for (let i = 0; i < textNodes.length; i++) {
      let combinedText = '';
      let nodeRange: Text[] = [];
      
      // Build combined text from consecutive nodes
      for (let j = i; j < Math.min(i + 10, textNodes.length); j++) {
        const currentNode = textNodes[j];
        if (!currentNode?.textContent) continue;
        
        combinedText += currentNode.textContent.toLowerCase().replace(/\s+/g, ' ');
        nodeRange.push(currentNode);
        
        // Check if we found the text
        const searchIndex = combinedText.indexOf(cleanSearchText);
        if (searchIndex >= 0) {
          try {
            const range = this.createCrossNodeRange(nodeRange, searchIndex, cleanSearchText.length, searchText);
            if (range) {
              const confidence = this.calculateCrossNodeConfidence(searchText, combinedText, searchIndex);
              return { range, confidence };
            }
          } catch (error) {
            console.warn('Failed to create cross-node range:', error);
            continue;
          }
        }
      }
    }

    return null;
  }

  /**
   * SOP Enhancement: Find partial text matches for truncated content
   */
  private findPartialText(searchText: string): { range: Range; confidence: number } | null {
    const words = searchText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return null;

    const walker = this.document.createTreeWalker(
      this.chapterElement || this.document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    let bestMatch: { range: Range; confidence: number } | null = null;
    let node: Text | null;

    while ((node = walker.nextNode() as Text)) {
      const text = node.textContent?.toLowerCase() || '';
      
      // Try different partial matching strategies
      const strategies = [
        // Strategy 1: Find longest consecutive word sequence
        () => this.findLongestWordSequence(words, text, node),
        // Strategy 2: Find text with missing words
        () => this.findTextWithMissingWords(words, text, node),
        // Strategy 3: Find text with word variations
        () => this.findTextWithVariations(words, text, node)
      ];

      for (const strategy of strategies) {
        const match = strategy();
        if (match && (!bestMatch || match.confidence > bestMatch.confidence)) {
          bestMatch = match;
        }
      }
    }

    return bestMatch;
  }

  private createCrossNodeRange(nodes: Text[], startIndex: number, length: number, _originalText: string): Range | null {
    let currentIndex = 0;
    let startNode: Text | null = null;
    let startOffset = 0;
    let endNode: Text | null = null;
    let endOffset = 0;
    
    // Find start position
    for (const node of nodes) {
      const nodeLength = node.textContent?.length || 0;
      if (currentIndex + nodeLength > startIndex) {
        startNode = node;
        startOffset = startIndex - currentIndex;
        break;
      }
      currentIndex += nodeLength;
    }
    
    if (!startNode) return null;
    
    // Find end position
    const endIndex = startIndex + length;
    currentIndex = 0;
    
    for (const node of nodes) {
      const nodeLength = node.textContent?.length || 0;
      if (currentIndex + nodeLength >= endIndex) {
        endNode = node;
        endOffset = endIndex - currentIndex;
        break;
      }
      currentIndex += nodeLength;
    }
    
    if (!endNode) return null;
    
    if (!startNode || !endNode) return null;
    
    try {
      const range = this.document.createRange();
      range.setStart(startNode, Math.max(0, startOffset));
      range.setEnd(endNode, Math.min(endNode.textContent?.length || 0, endOffset));
      return range;
    } catch (error) {
      console.warn('Failed to create range:', error);
      return null;
    }
  }

  private calculateCrossNodeConfidence(originalText: string, foundText: string, index: number): number {
    const extractedText = foundText.substring(index, index + originalText.length);
    const similarity = this.calculateTextSimilarity(
      originalText.toLowerCase().split(/\s+/),
      extractedText.split(/\s+/)
    );
    return Math.max(0.6, similarity); // Minimum confidence for cross-node matches
  }

  private findLongestWordSequence(words: string[], text: string, node: Text | null): { range: Range; confidence: number } | null {
    if (!node) return null;
    let bestMatch: { start: number; length: number; matchedWords: number } | null = null;
    
    for (let i = 0; i < words.length; i++) {
      let currentPos = 0;
      let matchedWords = 0;
      let startPos = -1;
      let endPos = -1;
      
      for (let j = i; j < words.length; j++) {
        const wordIndex = text.indexOf(words[j]!, currentPos);
        if (wordIndex >= 0) {
          if (startPos === -1) startPos = wordIndex;
          endPos = wordIndex + words[j]!.length;
          currentPos = endPos;
          matchedWords++;
        } else {
          break;
        }
      }
      
      if (matchedWords >= 2 && (!bestMatch || matchedWords > bestMatch.matchedWords)) {
        bestMatch = {
          start: startPos,
          length: endPos - startPos,
          matchedWords
        };
      }
    }
    
    if (bestMatch && bestMatch.start >= 0) {
      try {
        const range = this.document.createRange();
        range.setStart(node, bestMatch.start);
        range.setEnd(node, bestMatch.start + bestMatch.length);
        const confidence = (bestMatch.matchedWords / words.length) * 0.8;
        return { range, confidence };
      } catch {
        return null;
      }
    }
    
    return null;
  }

  private findTextWithMissingWords(words: string[], text: string, node: Text | null): { range: Range; confidence: number } | null {
    if (!node) return null;
    const foundWords: { word: string; index: number }[] = [];
    
    for (const word of words) {
      const index = text.indexOf(word);
      if (index >= 0) {
        foundWords.push({ word, index });
      }
    }
    
    if (foundWords.length >= Math.ceil(words.length * 0.6)) {
      foundWords.sort((a, b) => a.index - b.index);
      const start = foundWords[0]!.index;
      const end = foundWords[foundWords.length - 1]!.index + foundWords[foundWords.length - 1]!.word.length;
      
      try {
        const range = this.document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        const confidence = (foundWords.length / words.length) * 0.7;
        return { range, confidence };
      } catch {
        return null;
      }
    }
    
    return null;
  }

  private findTextWithVariations(words: string[], text: string, node: Text | null): { range: Range; confidence: number } | null {
    if (!node) return null;
    const textWords = text.split(/\s+/);
    let bestMatch: { start: number; end: number; confidence: number } | null = null;
    
    for (let i = 0; i <= textWords.length - words.length; i++) {
      const segment = textWords.slice(i, i + words.length);
      let matches = 0;
      
      for (let j = 0; j < words.length; j++) {
        const searchWord = words[j]!;
        const textWord = segment[j] || '';
        
        if (searchWord === textWord) {
          matches++;
        } else if (this.levenshteinDistance(searchWord, textWord) <= 2) {
          matches += 0.7;
        }
      }
      
      const confidence = (matches / words.length) * 0.6;
      if (confidence > 0.4 && (!bestMatch || confidence > bestMatch.confidence)) {
        const startIndex = text.indexOf(segment[0] || '');
        const endIndex = text.lastIndexOf(segment[segment.length - 1] || '') + (segment[segment.length - 1]?.length || 0);
        
        if (startIndex >= 0 && endIndex > startIndex) {
          bestMatch = { start: startIndex, end: endIndex, confidence };
        }
      }
    }
    
    if (bestMatch) {
      try {
        const range = this.document.createRange();
        range.setStart(node, bestMatch.start);
        range.setEnd(node, bestMatch.end);
        return { range, confidence: bestMatch.confidence };
      } catch {
        return null;
      }
    }
    
    return null;
  }
}

/**
 * Tracks the state and persistence of applied highlights
 */
export class HighlightTracker {
  private highlights = new Map<string, HighlightState>();
  private validationInterval?: number;

  constructor() {
    this.startValidation();
  }

  addHighlight(id: string, element: HTMLElement, range: Range): void {
    this.highlights.set(id, {
      id,
      applied: true,
      element,
      range,
      lastValidated: Date.now()
    });
  }

  removeHighlight(id: string): void {
    const state = this.highlights.get(id);
    if (state?.element && state.element.parentNode) {
      // Safely remove the highlight element
      const parent = state.element.parentNode;
      while (state.element.firstChild) {
        parent.insertBefore(state.element.firstChild, state.element);
      }
      parent.removeChild(state.element);
    }
    this.highlights.delete(id);
  }

  getHighlight(id: string): HighlightState | undefined {
    return this.highlights.get(id);
  }

  getAllHighlights(): HighlightState[] {
    return Array.from(this.highlights.values());
  }

  validateHighlights(): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];
    
    for (const [id, state] of Array.from(this.highlights)) {
      if (this.isHighlightValid(state)) {
        valid.push(id);
        state.lastValidated = Date.now();
      } else {
        invalid.push(id);
        state.applied = false;
      }
    }
    
    return { valid, invalid };
  }

  private isHighlightValid(state: HighlightState): boolean {
    if (!state.element) return false;
    
    // Check if element is still in DOM
    if (!document.contains(state.element)) return false;
    
    // Check if element still has highlight class
    if (!state.element.classList.contains('epub-highlight')) return false;
    
    return true;
  }

  private startValidation(): void {
    this.validationInterval = window.setInterval(() => {
      this.validateHighlights();
    }, 30000); // Validate every 30 seconds
  }

  destroy(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
    }
    this.highlights.clear();
  }
}

/**
 * Enhanced highlight manager with DOM stability detection and retry mechanisms
 */
export class HighlightManager {
  private document: Document;
  private textFinder: EnhancedTextFinder;
  private tracker: HighlightTracker;
  private pendingAttempts = new Map<string, HighlightAttempt>();
  private retryTimeouts = new Map<string, number>();
  private logger: HighlightLogger;
  private errorHandler: SOPErrorHandler;
  
  private domStabilityConfig: DOMStabilityConfig = {
    maxWaitTime: 5000,
    checkInterval: 100,
    stabilityThreshold: 3
  };
  
  private retryConfig: RetryConfig = {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  private sopConfig: SOPConfig = {
    maxProcessingTime: 5000,
    maxTotalProcessingTime: 30000,
    enableFallbackStrategies: true,
    enableStructuredLogging: true,
    enableUserFeedback: true,
    gracefulDegradation: true
  };

  constructor(document: Document, chapterElement?: Element) {
    this.document = document;
    this.textFinder = new EnhancedTextFinder(document, chapterElement);
    this.tracker = new HighlightTracker();
    this.logger = new HighlightLogger();
    this.errorHandler = new SOPErrorHandler(this.logger);
  }

  /**
   * Apply highlight with retry mechanism and DOM stability detection
   */
  async applyHighlight(annotation: SavedAnnotation): Promise<boolean> {
    const attemptId = `${annotation.id}-${Date.now()}`;
    
    // Check if already applied
    if (this.tracker.getHighlight(annotation.id)) {
      return true;
    }

    // Validate annotation content before processing
    const searchText = annotation.searchText || annotation.content;
    if (!searchText || typeof searchText !== 'string' || searchText.trim().length === 0) {
      console.warn(`Skipping annotation ${annotation.id} - invalid or empty content:`, searchText);
      return false;
    }

    // Wait for DOM stability
    await this.waitForDOMStability();

    // Initialize attempt tracking
    this.pendingAttempts.set(attemptId, {
      annotation,
      attempts: 0,
      lastAttempt: Date.now(),
      errors: [],
      strategy: 'cfi'
    });

    return this.attemptHighlight(attemptId);
  }

  /**
   * Apply multiple highlights with coordinated retry
   */
  async applyHighlights(annotations: SavedAnnotation[]): Promise<{ success: string[]; failed: string[] }> {
    // Filter out invalid annotations with detailed logging
    const validAnnotations = annotations.filter(annotation => {
      const searchText = annotation.searchText || annotation.content;
      
      if (!searchText) {
        console.warn(`⚠️ Skipping annotation ${annotation.id}: no searchText or content`);
        return false;
      }
      
      if (typeof searchText !== 'string') {
        console.warn(`⚠️ Skipping annotation ${annotation.id}: searchText is not a string:`, typeof searchText);
        return false;
      }
      
      if (searchText.trim().length < 3) {
        console.warn(`⚠️ Skipping annotation ${annotation.id}: searchText too short (${searchText.length} chars):`, searchText);
        return false;
      }
      
      return true;
    });

    const results = await Promise.allSettled(
      validAnnotations.map(annotation => this.applyHighlight(annotation))
    );

    const success: string[] = [];
    const failed: string[] = [];

    // Add invalid annotations to failed list
    const invalidAnnotations = annotations.filter(annotation => {
      const searchText = annotation.searchText || annotation.content;
      return !searchText || typeof searchText !== 'string' || searchText.trim().length === 0;
    });
    failed.push(...invalidAnnotations.map(a => a.id));

    // Process results for valid annotations
    results.forEach((result, index) => {
      const annotation = validAnnotations[index];
      if (!annotation) return;
      
      const annotationId = annotation.id;
      if (result.status === 'fulfilled' && result.value) {
        success.push(annotationId);
      } else {
        failed.push(annotationId);
      }
    });

    return { success, failed };
  }

  /**
   * Remove highlight and clean up tracking
   */
  removeHighlight(annotationId: string): void {
    this.tracker.removeHighlight(annotationId);
    
    // Cancel any pending retries
    const timeoutId = this.retryTimeouts.get(annotationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.retryTimeouts.delete(annotationId);
    }
    
    // Remove from pending attempts
    for (const [attemptId, attempt] of Array.from(this.pendingAttempts)) {
      if (attempt.annotation.id === annotationId) {
        this.pendingAttempts.delete(attemptId);
      }
    }
  }

  /**
   * Get highlight application statistics
   */
  getStats(): {
    applied: number;
    pending: number;
    failed: number;
    validationResults: { valid: string[]; invalid: string[] };
  } {
    const validationResults = this.tracker.validateHighlights();
    
    return {
      applied: this.tracker.getAllHighlights().length,
      pending: this.pendingAttempts.size,
      failed: validationResults.invalid.length,
      validationResults
    };
  }

  private async attemptHighlight(attemptId: string): Promise<boolean> {
    const attempt = this.pendingAttempts.get(attemptId);
    if (!attempt) return false;

    attempt.attempts++;
    attempt.lastAttempt = Date.now();
    const startTime = Date.now();

    // SOP: Log attempt start
    this.logger.log('info', 'Highlight attempt started', {
      annotationId: attempt.annotation.id,
      attemptId,
      searchText: (attempt.annotation.searchText || attempt.annotation.content || '').substring(0, 50) + '...'
    }, attempt.annotation.id, attempt.strategy);

    try {
      const { annotation } = attempt;
      
      // Validate annotation content
      const searchText = annotation.searchText || annotation.content;
      if (!searchText || typeof searchText !== 'string' || searchText.trim().length === 0) {
        const error = new Error(`Invalid searchText for annotation ${annotation.id}`);
        const highlightError = this.errorHandler.classifyError(error, {
          annotationId: annotation.id,
          searchText,
          strategy: attempt.strategy
        });
        
        attempt.errors.push(highlightError);
        this.pendingAttempts.delete(attemptId);
        return false;
      }
      
      // SOP: Check processing time limit
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Processing timeout after ${this.sopConfig.maxProcessingTime}ms`));
        }, this.sopConfig.maxProcessingTime);
      });

      // Find text using enhanced text finder with timeout
      const matchResult = await Promise.race([
        this.textFinder.findText(
          searchText,
          annotation.location,
          annotation.textContext || annotation.content,
          attempt.fallbackStrategies
        ),
        timeoutPromise
      ]);

      if (!matchResult) {
        throw new Error(`Text not found: "${searchText}"`);
      }

      // Create highlight element
      const highlightElement = this.createHighlightElement(annotation, matchResult.confidence);
      
      // Apply highlight to DOM
      this.applyHighlightToRange(matchResult.range, highlightElement);
      
      // Track successful highlight
      this.tracker.addHighlight(annotation.id, highlightElement, matchResult.range);
      
      // Clean up attempt tracking
      this.pendingAttempts.delete(attemptId);
      
      // SOP: Log successful completion
      this.logger.log('info', 'Highlight applied successfully', {
        annotationId: annotation.id,
        strategy: matchResult.strategy,
        confidence: matchResult.confidence,
        attempts: attempt.attempts,
        duration: Date.now() - startTime
      }, annotation.id, matchResult.strategy);
      
      return true;
      
    } catch (error) {
      // SOP: Classify and handle error
      const highlightError = this.errorHandler.classifyError(error, {
        annotationId: attempt.annotation.id,
        strategy: attempt.strategy,
        attempts: attempt.attempts
      });
      
      attempt.errors.push(highlightError);
      
      // SOP: Check if we should retry
      const shouldRetry = this.errorHandler.shouldRetry(
        highlightError,
        attempt.attempts,
        this.retryConfig.maxAttempts
      );
      
      if (shouldRetry) {
        // SOP: Get suggested fallback strategies
        const suggestedStrategies = this.errorHandler.suggestFallbackStrategy(highlightError);
        attempt.fallbackStrategies = suggestedStrategies;
        
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt.attempts - 1),
          this.retryConfig.maxDelay
        );
        
        const timeoutId = window.setTimeout(() => {
          this.retryTimeouts.delete(attempt.annotation.id);
          this.attemptHighlight(attemptId);
        }, delay);
        
        this.retryTimeouts.set(attempt.annotation.id, timeoutId);
        
        this.logger.log('warn', `Retrying highlight in ${delay}ms`, {
          annotationId: attempt.annotation.id,
          attempt: attempt.attempts + 1,
          maxAttempts: this.retryConfig.maxAttempts,
          errorType: highlightError.type,
          fallbackStrategies: suggestedStrategies
        }, attempt.annotation.id, attempt.strategy);
        
        return false;
      } else {
        // SOP: Handle graceful degradation
        if (this.sopConfig.gracefulDegradation && highlightError.recoverable) {
          attempt.skipReason = `Skipped due to ${highlightError.type}: ${highlightError.message}`;
          
          this.logger.log('warn', 'Highlight skipped with graceful degradation', {
            annotationId: attempt.annotation.id,
            reason: attempt.skipReason,
            errorType: highlightError.type,
            duration: Date.now() - startTime
          }, attempt.annotation.id, attempt.strategy);
        } else {
          this.logger.log('error', 'Highlight failed critically', {
            annotationId: attempt.annotation.id,
            errorType: highlightError.type,
            message: highlightError.message,
            attempts: attempt.attempts,
            duration: Date.now() - startTime
          }, attempt.annotation.id, attempt.strategy);
        }
        
        this.pendingAttempts.delete(attemptId);
        return false;
      }
    }
  }

  private async waitForDOMStability(): Promise<void> {
    return new Promise((resolve) => {
      let stableCount = 0;
      let lastMutationTime = Date.now();
      
      const observer = new MutationObserver(() => {
        lastMutationTime = Date.now();
        stableCount = 0;
      });
      
      observer.observe(this.document.body, {
        childList: true,
        subtree: true,
        attributes: false
      });
      
      const checkStability = () => {
        const now = Date.now();
        const timeSinceLastMutation = now - lastMutationTime;
        
        if (timeSinceLastMutation >= this.domStabilityConfig.checkInterval) {
          stableCount++;
          
          if (stableCount >= this.domStabilityConfig.stabilityThreshold) {
            observer.disconnect();
            resolve();
            return;
          }
        }
        
        if (now - lastMutationTime < this.domStabilityConfig.maxWaitTime) {
          setTimeout(checkStability, this.domStabilityConfig.checkInterval);
        } else {
          observer.disconnect();
          resolve(); // Timeout reached, proceed anyway
        }
      };
      
      setTimeout(checkStability, this.domStabilityConfig.checkInterval);
    });
  }

  private createHighlightElement(annotation: SavedAnnotation, confidence: number): HTMLSpanElement {
    const span = this.document.createElement('span');
    span.className = 'epub-highlight';
    span.dataset.annotationId = annotation.id;
    span.dataset.confidence = confidence.toString();
    
    // Apply styling based on annotation type
    const annotationType = annotation.type || annotation.annotation_type;
    if (annotationType === 'highlight') {
      span.style.backgroundColor = annotation.color || '#ffeb3b';
      span.style.color = '#000';
    } else if (annotationType === 'note') {
      span.style.backgroundColor = '#e3f2fd';
      span.style.borderBottom = '2px solid #2196f3';
      span.style.position = 'relative';
      
      // Add note indicator
      const indicator = this.document.createElement('span');
      indicator.textContent = '📝';
      indicator.style.position = 'absolute';
      indicator.style.top = '-10px';
      indicator.style.right = '-10px';
      indicator.style.fontSize = '12px';
      span.appendChild(indicator);
    }
    
    // Add click handler
    span.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleHighlightClick(annotation);
    });
    
    return span;
  }

  private applyHighlightToRange(range: Range, highlightElement: HTMLSpanElement): void {
    try {
      // Try surroundContents first
      highlightElement.appendChild(range.extractContents());
      range.insertNode(highlightElement);
    } catch (error) {
      // Fallback for complex ranges
      const contents = range.extractContents();
      highlightElement.appendChild(contents);
      range.insertNode(highlightElement);
    }
  }

  private handleHighlightClick(annotation: SavedAnnotation): void {
    // Emit custom event for highlight interaction
    const event = new CustomEvent('highlightClick', {
      detail: { annotation },
      bubbles: true
    });
    this.document.dispatchEvent(event);
  }

  /**
   * Load and apply multiple annotations
   */
  async loadAnnotations(annotations: SavedAnnotation[]): Promise<{ success: string[]; failed: string[] }> {
    return this.applyHighlights(annotations);
  }

  /**
   * Add a single annotation (alias for applyHighlight)
   */
  async addAnnotation(annotation: SavedAnnotation): Promise<boolean> {
    return this.applyHighlight(annotation);
  }

  /**
   * Get the text finder instance
   */
  getTextFinder(): EnhancedTextFinder {
    return this.textFinder;
  }

  /**
   * SOP Enhancement: Retry highlight with comprehensive error handling and fallback strategies
   */
  // @ts-ignore - Method reserved for future SOP enhancements
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async retryHighlightWithSOP(_highlight: HighlightData, _attempt: HighlightAttempt): Promise<void> {
    const highlight = _highlight;
    const attempt = _attempt;
    let lastError: Error | null = null;
    
    for (let attemptNum = 1; attemptNum <= this.retryConfig.maxAttempts; attemptNum++) {
      attempt.attempts = attemptNum;
      
      try {
        // Wait for DOM stability before each attempt
        await this.waitForDOMStability();
        
        // Determine which strategies to use for this attempt
        const strategies = this.getStrategiesForAttempt(attemptNum, attempt.fallbackStrategies || []);
        
        // Try to find and apply the highlight
        const matchResult = await this.textFinder.findText(
          highlight.searchText,
          highlight.location,
          highlight.textContext,
          strategies
        );
        
        if (matchResult && matchResult.range) {
          // Create highlight element
          const highlightElement = this.createHighlightElement({
            id: highlight.id,
            searchText: highlight.searchText,
            content: highlight.searchText,
            location: highlight.location,
            textContext: highlight.textContext,
            color: highlight.color,
            type: highlight.type || 'highlight'
          } as SavedAnnotation, matchResult.confidence || 1.0);
          
          // Apply the highlight
          this.applyHighlightToRange(matchResult.range, highlightElement);
          
          attempt.strategy = matchResult.strategy as any;
          this.tracker.addHighlight(highlight.id, highlightElement, matchResult.range);
          return; // Success!
        }
        
        // If we get here, the text wasn't found or couldn't be highlighted
        throw new Error(`Text not found using strategies: ${strategies.join(', ')}`);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Classify the error
        const classifiedError = this.errorHandler.classifyError(lastError, {
          annotationId: highlight.id,
          strategy: attempt.strategy,
          attempts: attemptNum
        });
        
        const highlightError: HighlightError = {
          type: classifiedError.type,
          message: classifiedError.message,
          timestamp: Date.now(),
          context: {
            highlightId: highlight.id,
            attempt: attemptNum,
            strategies: this.getStrategiesForAttempt(attemptNum, attempt.fallbackStrategies || [])
          },
          recoverable: classifiedError.recoverable
        };
        
        attempt.errors.push(highlightError);
        
        // Check if we should continue retrying
        const shouldRetry = this.errorHandler.shouldRetry(highlightError, attemptNum, this.retryConfig.maxAttempts);
        
        if (!shouldRetry || attemptNum >= this.retryConfig.maxAttempts) {
          throw lastError;
        }
        
        // Wait before next attempt with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attemptNum - 1),
          this.retryConfig.maxDelay
        );
        
        this.logger.log('warn', `Retrying highlight in ${delay}ms`, {
          highlightId: highlight.id,
          attempt: attemptNum + 1,
          maxAttempts: this.retryConfig.maxAttempts,
          errorType: classifiedError.type,
          delay
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we get here, all attempts failed
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * SOP Enhancement: Get appropriate strategies for each attempt
   */
  private getStrategiesForAttempt(attemptNum: number, fallbackStrategies: string[]): string[] {
    switch (attemptNum) {
      case 1:
        return ['exact']; // First attempt: exact match only
      case 2:
        return ['exact', 'cross-node']; // Second attempt: add cross-node search
      case 3:
        return ['exact', 'cross-node', 'partial', 'fuzzy']; // Third attempt: all strategies
      default:
        return fallbackStrategies.length > 0 ? fallbackStrategies : ['exact', 'cross-node', 'partial', 'fuzzy'];
    }
  }

  /**
   * SOP Enhancement: Get comprehensive statistics and user feedback
   */
  getSOPStats(): {
    performance: any;
    errors: HighlightError[];
    userFeedback: {
      successRate: number;
      averageProcessingTime: number;
      commonFailureReasons: string[];
      recommendations: string[];
    };
  } {
    const stats = this.logger.getStats();
    const allErrors: HighlightError[] = [];
    
    // Collect all errors from pending attempts
    for (const attempt of this.pendingAttempts.values()) {
      allErrors.push(...attempt.errors);
    }
    
    // Calculate success rate
    const totalAttempts = stats.total || 1;
    const successRate = ((stats.byLevel.info || 0) / totalAttempts) * 100;
    
    // Analyze common failure reasons
    const errorCounts = new Map<HighlightErrorType, number>();
    allErrors.forEach(error => {
      errorCounts.set(error.type, (errorCounts.get(error.type) || 0) + 1);
    });
    
    const commonFailureReasons = Array.from(errorCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (successRate < 80) {
      recommendations.push('Consider improving text preprocessing or DOM structure');
    }
    if (errorCounts.get(HighlightErrorType.CROSS_NODE_TEXT) || 0 > 0) {
      recommendations.push('Text spans multiple DOM elements - cross-node search is being used');
    }
    if (errorCounts.get(HighlightErrorType.DOM_STRUCTURE_CHANGED) || 0 > 0) {
      recommendations.push('DOM structure is changing frequently - consider waiting for stability');
    }
    
    return {
      performance: stats,
      errors: allErrors,
      userFeedback: {
        successRate,
        averageProcessingTime: 0,
        commonFailureReasons,
        recommendations
      }
    };
  }

  /**
   * SOP Enhancement: Get user-friendly status report
   */
  getStatusReport(): string {
    const sopStats = this.getSOPStats();
    const { performance, userFeedback } = sopStats;
    
    let report = `\n=== Highlight System Status Report ===\n`;
    report += `Success Rate: ${userFeedback.successRate.toFixed(1)}%\n`;
    report += `Total Attempts: ${performance.total || 0}\n`;
    report += `Successful: ${performance.byLevel.info || 0}\n`;
    report += `Failed: ${performance.byLevel.error || 0}\n`;
    report += `Warnings: ${performance.byLevel.warn || 0}\n`;
    
    if (userFeedback.averageProcessingTime > 0) {
      report += `Average Processing Time: ${userFeedback.averageProcessingTime.toFixed(0)}ms\n`;
    }
    
    if (userFeedback.commonFailureReasons.length > 0) {
      report += `\nCommon Issues:\n`;
      userFeedback.commonFailureReasons.forEach(reason => {
        report += `  - ${reason}\n`;
      });
    }
    
    if (userFeedback.recommendations.length > 0) {
      report += `\nRecommendations:\n`;
      userFeedback.recommendations.forEach(rec => {
        report += `  - ${rec}\n`;
      });
    }
    
    report += `\n=== End Report ===\n`;
    return report;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear all retry timeouts
    for (const timeoutId of Array.from(this.retryTimeouts.values())) {
      clearTimeout(timeoutId);
    }
    this.retryTimeouts.clear();
    
    // Clear pending attempts
    this.pendingAttempts.clear();
    
    // Destroy tracker
    this.tracker.destroy();
    
    // SOP: Log final statistics
    if (this.sopConfig.enableStructuredLogging) {
      console.log('Highlight Manager destroyed. Final statistics:', this.getSOPStats().performance);
    }
  }
}