import type { SavedAnnotation } from './types';

// Missing type definition for HighlightData
interface HighlightData {
  id: string;
  searchText: string;
  location: string | null;
  textContext?: string;
  color?: string;
  type?: string;
  annotation_type?: string;
}

// Enhanced SOP Error Classification System
enum HighlightErrorType {
  // Text Search Errors
  TEXT_NOT_FOUND = 'TEXT_NOT_FOUND',
  TEXT_TOO_SHORT = 'TEXT_TOO_SHORT',
  TEXT_AMBIGUOUS = 'TEXT_AMBIGUOUS',
  
  // Position & Location Errors
  CFI_PARSE_ERROR = 'CFI_PARSE_ERROR',
  CFI_NOT_FOUND = 'CFI_NOT_FOUND',
  CHAPTER_NOT_FOUND = 'CHAPTER_NOT_FOUND',
  POSITION_OUT_OF_BOUNDS = 'POSITION_OUT_OF_BOUNDS',
  
  // DOM & Structure Errors
  DOM_STRUCTURE_CHANGED = 'DOM_STRUCTURE_CHANGED',
  CROSS_NODE_TEXT = 'CROSS_NODE_TEXT',
  RANGE_CREATION_FAILED = 'RANGE_CREATION_FAILED',
  DOM_MANIPULATION_FAILED = 'DOM_MANIPULATION_FAILED',
  
  // Content & Format Errors
  FORMATTING_MISMATCH = 'FORMATTING_MISMATCH',
  ENCODING_ISSUE = 'ENCODING_ISSUE',
  WHITESPACE_NORMALIZATION_FAILED = 'WHITESPACE_NORMALIZATION_FAILED',
  
  // System & Configuration Errors
  INVALID_ANNOTATION = 'INVALID_ANNOTATION',
  TIMEOUT_EXCEEDED = 'TIMEOUT_EXCEEDED',
  CONTEXT_INSUFFICIENT = 'CONTEXT_INSUFFICIENT',
  STRATEGY_EXHAUSTED = 'STRATEGY_EXHAUSTED',
  
  // Fallback
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

interface HighlightError {
  type: HighlightErrorType;
  message: string;
  context?: Record<string, unknown>;
  timestamp: number;
  strategy?: string | undefined;
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
    context?: Record<string, unknown>;
    annotationId?: string;
    strategy?: string;
  }> = [];

  private maxLogs = 1000;

  log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>, annotationId?: string, strategy?: string): void {
    const logEntry: {
      timestamp: number;
      level: 'info' | 'warn' | 'error';
      message: string;
      context?: Record<string, unknown>;
      annotationId?: string;
      strategy?: string;
    } = {
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
      console.warn(logMessage, context);
    }
  }

  getStats(): {
    total: number;
    byLevel: Record<string, number>;
    recentErrors: Array<{
      timestamp: number;
      level: 'info' | 'warn' | 'error';
      message: string;
      context?: Record<string, unknown>;
      annotationId?: string;
      strategy?: string;
    }>;
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

  classifyError(error: unknown, context: Record<string, unknown>): HighlightError {
    const timestamp = Date.now();
    let errorType = HighlightErrorType.UNKNOWN_ERROR;
    let recoverable = true;
    let message = 'Unknown error occurred';

    if (error instanceof Error) {
      message = error.message;
      
      // Enhanced error classification based on message patterns
      if (message.includes('Text not found')) {
        errorType = HighlightErrorType.TEXT_NOT_FOUND;
        recoverable = true;
      } else if (message.includes('searchText too short')) {
        errorType = HighlightErrorType.TEXT_TOO_SHORT;
        recoverable = true;
      } else if (message.includes('CFI') || message.includes('cfi')) {
        errorType = HighlightErrorType.CFI_PARSE_ERROR;
        recoverable = true;
      } else if (message.includes('Chapter') && message.includes('not found')) {
        errorType = HighlightErrorType.CHAPTER_NOT_FOUND;
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
      } else if (message.includes('normalize') || message.includes('encoding')) {
        errorType = HighlightErrorType.ENCODING_ISSUE;
        recoverable = true;
      } else if (message.includes('cross-node') || message.includes('spans multiple')) {
        errorType = HighlightErrorType.CROSS_NODE_TEXT;
        recoverable = true;
      }
    }

    // Enhanced context-based classification
    if (context?.searchText) {
      if (typeof context.searchText !== 'string') {
        errorType = HighlightErrorType.INVALID_ANNOTATION;
        recoverable = false;
      } else if (context.searchText.trim().length < 1) {
        errorType = HighlightErrorType.TEXT_TOO_SHORT;
        recoverable = false;
      } else if (context.searchText.trim().length < 3 && !context.location && !context.textContext) {
        errorType = HighlightErrorType.CONTEXT_INSUFFICIENT;
        recoverable = true;
      }
    }
    
    // Check for strategy exhaustion
    if (typeof context === 'object' && context && 'attempts' in context && 'fallbackStrategies' in context) {
      const attempts = context.attempts;
      const fallbackStrategies = context.fallbackStrategies;
      if (typeof attempts === 'number' && attempts >= 5 && 
          Array.isArray(fallbackStrategies) && fallbackStrategies.length === 0) {
        errorType = HighlightErrorType.STRATEGY_EXHAUSTED;
        recoverable = false;
      }
    }

    const annotationId = context && typeof context === 'object' && 'annotationId' in context ? String(context.annotationId) : undefined;
    const strategy = context && typeof context === 'object' && 'strategy' in context ? String(context.strategy) : undefined;

    const highlightError: HighlightError = {
      type: errorType,
      message,
      context,
      timestamp,
      strategy,
      recoverable
    };
    this.logger.log('error', `Error classified as ${errorType}`, context, annotationId, strategy);
    
    return highlightError;
  }

  shouldRetry(error: HighlightError, attempts: number, maxAttempts: number): boolean {
    if (attempts >= maxAttempts) return false;
    if (!error.recoverable) return false;
    
    // Enhanced non-retryable error types
    const nonRetryableErrors = [
      HighlightErrorType.INVALID_ANNOTATION,
      HighlightErrorType.DOM_MANIPULATION_FAILED,
      HighlightErrorType.TIMEOUT_EXCEEDED,
      HighlightErrorType.STRATEGY_EXHAUSTED
    ];
    
    // Special handling for specific error types
    if (error.type === HighlightErrorType.TEXT_TOO_SHORT && attempts > 2) {
      return false; // Give up on very short text after few attempts
    }
    
    if (error.type === HighlightErrorType.CONTEXT_INSUFFICIENT && attempts > 1) {
      return false; // Quick fail for insufficient context
    }
    
    if (error.type === HighlightErrorType.CHAPTER_NOT_FOUND && attempts > 1) {
      return false; // Chapter missing is usually permanent
    }
    
    return !nonRetryableErrors.includes(error.type);
  }

  suggestFallbackStrategy(error: HighlightError): string[] {
    const strategies: string[] = [];
    
    switch (error.type) {
      case HighlightErrorType.TEXT_NOT_FOUND:
        strategies.push('cross-node', 'fuzzy', 'partial', 'context');
        break;
        
      case HighlightErrorType.TEXT_TOO_SHORT:
      case HighlightErrorType.TEXT_AMBIGUOUS:
        strategies.push('context', 'cross-node'); // Prioritize context for short/ambiguous text
        break;
        
      case HighlightErrorType.CFI_PARSE_ERROR:
      case HighlightErrorType.CFI_NOT_FOUND:
        strategies.push('context', 'fuzzy', 'partial'); // Fall back to text-based strategies
        break;
        
      case HighlightErrorType.CHAPTER_NOT_FOUND:
      case HighlightErrorType.POSITION_OUT_OF_BOUNDS:
        strategies.push('fuzzy', 'partial', 'context'); // Broad search strategies
        break;
        
      case HighlightErrorType.CROSS_NODE_TEXT:
        strategies.push('cross-node', 'partial'); // Specialized for spanning elements
        break;
        
      case HighlightErrorType.FORMATTING_MISMATCH:
      case HighlightErrorType.ENCODING_ISSUE:
      case HighlightErrorType.WHITESPACE_NORMALIZATION_FAILED:
        strategies.push('fuzzy', 'partial', 'cross-node'); // Flexible text matching
        break;
        
      case HighlightErrorType.RANGE_CREATION_FAILED:
        strategies.push('cross-node', 'context', 'partial'); // Alternative range creation
        break;
        
      case HighlightErrorType.CONTEXT_INSUFFICIENT:
        strategies.push('fuzzy', 'partial'); // Lower precision strategies
        break;
        
      case HighlightErrorType.DOM_STRUCTURE_CHANGED:
        strategies.push('cross-node', 'fuzzy', 'context'); // Adaptive strategies
        break;
        
      default:
        strategies.push('fuzzy', 'context', 'partial'); // General fallbacks
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

    // Normalize search text to handle common variations
    const normalizedSearchText = this.normalizeSearchText(searchText);
    const isShortWord = normalizedSearchText.trim().length < 3;
    
    // For short words, prioritize location-based strategies to avoid false matches
    if (isShortWord) {
      // Strategy 1 (short words): CFI-based search first - most precise for short words
      if (cfi) {
        const cfiMatch = await this.findTextNearCfi(normalizedSearchText, cfi);
        if (cfiMatch) {
          return {
            range: cfiMatch,
            confidence: 0.95,
            strategy: 'exact'
          };
        }
      }
      
      // Strategy 2 (short words): Context-based search with word boundaries
      if (context) {
        const contextMatch = this.findTextWithContext(normalizedSearchText, context, true);
        if (contextMatch) {
          return {
            range: contextMatch,
            confidence: 0.9,
            strategy: 'context',
            context
          };
        }
      }
      
      // Strategy 3 (short words): Word-boundary exact match to avoid partial matches
      const exactWordMatch = this.findExactWordMatch(normalizedSearchText);
      if (exactWordMatch) {
        return {
          range: exactWordMatch,
          confidence: 0.85,
          strategy: 'exact'
        };
      }
    } else {
      // Strategy 1 (normal words): Exact text match first
      const exactMatch = this.findExactText(normalizedSearchText);
      if (exactMatch) {
        return {
          range: exactMatch,
          confidence: 1.0,
          strategy: 'exact'
        };
      }

      // Strategy 2 (normal words): CFI-based search
      if (cfi) {
        const cfiMatch = await this.findTextNearCfi(normalizedSearchText, cfi);
        if (cfiMatch) {
          return {
            range: cfiMatch,
            confidence: 0.9,
            strategy: 'exact'
          };
        }
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

    // Strategy 6: Context-based disambiguation (only for normal words, already tried for short words)
    if (!isShortWord && context && (!fallbackStrategies || fallbackStrategies.includes('context'))) {
      const contextMatch = this.findTextWithContext(normalizedSearchText, context);
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

    const normalizedSearchText = searchText.toLowerCase();

    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
      const originalText = node.textContent || '';
      const normalizedNodeText = this.normalizeSearchText(originalText).toLowerCase();
      
      const index = normalizedNodeText.indexOf(normalizedSearchText);
      if (index >= 0) {
        // Convert normalized index back to original text position
        const actualIndex = this.findActualIndex(originalText, this.normalizeSearchText(originalText), index);
        
        if (actualIndex >= 0 && actualIndex + searchText.length <= originalText.length) {
          const range = this.document.createRange();
          range.setStart(node, actualIndex);
          range.setEnd(node, actualIndex + searchText.length);
          return range;
        }
      }
    }

    return null;
  }

  private async findTextNearCfi(searchText: string, cfi: string): Promise<Range | null> {
    try {
      const cfiRange = this.getRangeFromCfi(cfi);
      if (!cfiRange) return null;

      const normalizedSearchText = searchText.toLowerCase();
      const container = cfiRange.commonAncestorContainer;
      const searchRadius = 2000; // Increased search radius for better coverage
      
      // Collect potential matches with their distances from CFI
      const potentialMatches: Array<{ range: Range; distance: number; confidence: number }> = [];
      
      const walker = this.document.createTreeWalker(
        container.nodeType === Node.ELEMENT_NODE ? container as Element : (container.parentElement || document.body),
        NodeFilter.SHOW_TEXT,
        null
      );

      let node: Text | null;
      while ((node = walker.nextNode() as Text)) {
        const originalText = node.textContent || '';
        const normalizedNodeText = this.normalizeSearchText(originalText).toLowerCase();
        
        let searchIndex = 0;
        // Find all occurrences in this node
        while ((searchIndex = normalizedNodeText.indexOf(normalizedSearchText, searchIndex)) >= 0) {
          // Convert normalized index back to original text position
          const actualIndex = this.findActualIndex(originalText, this.normalizeSearchText(originalText), searchIndex);
          
          if (actualIndex >= 0 && actualIndex + searchText.length <= originalText.length) {
            const range = this.document.createRange();
            range.setStart(node, actualIndex);
            range.setEnd(node, actualIndex + searchText.length);
            
            // Calculate distance and confidence
            const distance = this.calculateRangeDistance(range, cfiRange);
            const confidence = this.calculateCFIMatchConfidence(distance, searchRadius, searchText.length);
            
            if (distance <= searchRadius) {
              potentialMatches.push({ range, distance, confidence });
            }
          }
          
          searchIndex++; // Move to next potential match
        }
      }
      
      // Return the best match (closest to CFI with highest confidence)
      if (potentialMatches.length > 0) {
        potentialMatches.sort((a, b) => {
          // First sort by confidence (higher is better)
          if (Math.abs(a.confidence - b.confidence) > 0.1) {
            return b.confidence - a.confidence;
          }
          // Then by distance (closer is better)
          return a.distance - b.distance;
        });
        
        const bestMatch = potentialMatches[0];
        if (bestMatch) {
          console.warn(`Found ${potentialMatches.length} CFI matches, selected best with confidence ${bestMatch.confidence.toFixed(2)}`);
          return bestMatch.range;
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

  /**
   * Normalize search text to handle encoding and whitespace variations
   */
  private normalizeSearchText(searchText: string): string {
    return searchText
      // Normalize whitespace (multiple spaces/tabs/newlines to single space)
      .replace(/\s+/g, ' ')
      // Normalize common quote variations
      .replace(/[‘’]/g, "'") // Smart single quotes to straight
      .replace(/[“”]/g, '"') // Smart double quotes to straight
      // Normalize dashes
      .replace(/[–—]/g, '-') // En/em dash to hyphen
      // Normalize ellipsis
      .replace(/…/g, '...')
      .trim();
  }

  /**
   * Find exact word match with word boundaries to avoid partial matches for short words
   */
  private findExactWordMatch(searchText: string): Range | null {
    const walker = this.document.createTreeWalker(
      this.chapterElement || this.document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    // Create regex with word boundaries
    const searchPattern = new RegExp(`\\b${this.escapeRegExp(searchText)}\\b`, 'i');

    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
      const nodeText = node.textContent || '';
      const normalizedNodeText = this.normalizeSearchText(nodeText);
      const match = normalizedNodeText.match(searchPattern);
      
      if (match && match.index !== undefined) {
        // Find the actual position in the original text
        const actualIndex = this.findActualIndex(nodeText, normalizedNodeText, match.index);
        if (actualIndex >= 0) {
          const range = this.document.createRange();
          range.setStart(node, actualIndex);
          range.setEnd(node, actualIndex + searchText.length);
          return range;
        }
      }
    }

    return null;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Find the actual character position in original text from normalized text position
   */
  private findActualIndex(originalText: string, normalizedText: string, normalizedIndex: number): number {
    let originalIndex = 0;
    let normalizedCount = 0;
    
    while (originalIndex < originalText.length && normalizedCount < normalizedIndex) {
      const originalChar = originalText[originalIndex];
      
      if (originalChar && /\s/.test(originalChar)) {
        // Skip extra whitespace in original
        while (originalIndex < originalText.length && /\s/.test(originalText[originalIndex] || '')) {
          originalIndex++;
        }
        if (normalizedCount < normalizedText.length && normalizedText[normalizedCount] === ' ') {
          normalizedCount++;
        }
      } else {
        originalIndex++;
        normalizedCount++;
      }
    }
    
    return originalIndex;
  }

  private findTextWithContext(searchText: string, context: string, useWordBoundaries: boolean = false): Range | null {
    const normalizedContext = this.normalizeSearchText(context);
    const contextWords = normalizedContext.toLowerCase().split(/\s+/).slice(0, 10);
    
    const walker = this.document.createTreeWalker(
      this.chapterElement || this.document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    let bestMatch: { node: Text; index: number; score: number } | null = null;
    let node: Text | null;
    
    while ((node = walker.nextNode() as Text)) {
      const originalText = node.textContent || '';
      const normalizedText = this.normalizeSearchText(originalText).toLowerCase();
      
      // Use word boundaries for short words to avoid partial matches
      const searchPattern = useWordBoundaries 
        ? new RegExp(`\\b${this.escapeRegExp(searchText.toLowerCase())}\\b`)
        : searchText.toLowerCase();
        
      let searchIndex = -1;
      if (useWordBoundaries && searchPattern instanceof RegExp) {
        const match = normalizedText.match(searchPattern);
        searchIndex = match ? match.index || -1 : -1;
      } else {
        searchIndex = normalizedText.indexOf(searchText.toLowerCase());
      }
      
      if (searchIndex >= 0) {
        // Expand search area around the found text
        const expandedStart = Math.max(0, searchIndex - 300);
        const expandedEnd = Math.min(normalizedText.length, searchIndex + searchText.length + 300);
        const surroundingText = normalizedText.substring(expandedStart, expandedEnd);
        
        // Calculate context match score
        let contextScore = 0;
        let exactMatches = 0;
        
        for (const contextWord of contextWords) {
          if (contextWord.length > 2) { // Skip very short context words
            const wordPattern = new RegExp(`\\b${this.escapeRegExp(contextWord)}\\b`);
            if (wordPattern.test(surroundingText)) {
              exactMatches++;
              contextScore += 2; // Exact word match gets higher score
            } else if (surroundingText.includes(contextWord)) {
              contextScore += 1; // Partial match gets lower score
            }
          }
        }
        
        // Require higher context match threshold for better precision
        const requiredMatches = Math.max(2, Math.ceil(contextWords.length * 0.4));
        const requiredScore = Math.max(3, contextWords.length * 0.8);
        
        if (exactMatches >= requiredMatches && contextScore >= requiredScore) {
          if (!bestMatch || contextScore > bestMatch.score) {
            // Convert normalized index back to original text index
            const actualIndex = this.findActualIndex(originalText, this.normalizeSearchText(originalText), searchIndex);
            bestMatch = { node, index: actualIndex, score: contextScore };
          }
        }
      }
    }

    if (bestMatch) {
      try {
        const range = this.document.createRange();
        range.setStart(bestMatch.node, bestMatch.index);
        range.setEnd(bestMatch.node, bestMatch.index + searchText.length);
        return range;
      } catch (error) {
        console.warn('Failed to create range from context match:', error);
      }
    }

    return null;
  }

  /**
   * SOP Enhancement: Get nearby text around a node for context analysis
   */
  // @ts-expect-error - Method reserved for future SOP enhancements
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
  // @ts-expect-error - Method reserved for future SOP enhancements
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
      } else if (words1[i] && words2[i] && this.levenshteinDistance(words1[i] || '', words2[i] || '') <= 2) {
        matches += 0.7; // Partial credit for similar words
      }
    }
    
    return matches / words1.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));
    
    for (let i = 0; i <= str1.length; i++) {
      const row = matrix[0];
      if (row) row[i] = i;
    }
    for (let j = 0; j <= str2.length; j++) {
      const row = matrix[j];
      if (row) row[0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        const currentRow = matrix[j];
        const prevRow = matrix[j - 1];
        if (currentRow && prevRow) {
          currentRow[i] = Math.min(
            (currentRow[i - 1] || 0) + 1,
            (prevRow[i] || 0) + 1,
            (prevRow[i - 1] || 0) + indicator
          );
        }
      }
    }
    
    const finalRow = matrix[str2.length];
    return finalRow?.[str1.length] || str1.length + str2.length;
  }


  private getRangeFromCfi(cfi: string): Range | null {
    try {
      // Also support shared CFI utilities
      // Extract internal locator from EPUB CFI wrapper if present
      const extractInternalLocator = (cfiString: string): string => {
        const match = cfiString.match(/^epubcfi\((.+)\)$/);
        return match?.[1] ?? cfiString;
      };
      
      const internalLocator = extractInternalLocator(cfi);
      
      // Enhanced CFI format support - try parsing with both original CFI and internal locator
      // Format 1: "chapter-X-Y" (chapter index, character offset)
      const dashMatch = internalLocator.match(/chapter-(\d+)-(\d+)/) || cfi.match(/chapter-(\d+)-(\d+)/);
      // Format 2: "X/CHAPTER_ID@relative" (chapter index, relative position 0-1)
      const slashRelMatch = internalLocator.match(/^(\d+)\/[^@]+@([0-9.]+)/) || cfi.match(/^(\d+)\/[^@]+@([0-9.]+)/);
      // Format 3: Standard EPUB CFI format "/6/4[chapter01]!/4/2/2:15" 
      const epubCfiMatch = cfi.match(/\/\d+\/\d+\[[^\]]*\]!\/.*:(\d+)/);
      // Format 4: Simple position "pos-X" or "offset-X"
      const posMatch = cfi.match(/(?:pos|offset)-(\d+)/);
      // Format 5: Percentage "percent-X.X"
      const percentMatch = cfi.match(/percent-([0-9.]+)/);
      
      let chapterIndex: number = 0;
      let charOffset: number | null = null;
      let relativePosition: number | null = null;

      if (dashMatch && dashMatch[1] && dashMatch[2]) {
        // Format 1: Direct chapter and character offset
        chapterIndex = parseInt(dashMatch[1], 10);
        charOffset = parseInt(dashMatch[2], 10);
      } else if (slashRelMatch && slashRelMatch[1] && slashRelMatch[2]) {
        // Format 2: Chapter with relative position
        chapterIndex = parseInt(slashRelMatch[1], 10);
        relativePosition = parseFloat(slashRelMatch[2]);
      } else if (epubCfiMatch && epubCfiMatch[1]) {
        // Format 3: Standard EPUB CFI - extract character offset
        charOffset = parseInt(epubCfiMatch[1], 10);
        // Try to find chapter from CFI path
        const chapterMatch = cfi.match(/\[(chapter\d+|ch\d+|\d+)\]/);
        if (chapterMatch && chapterMatch[1]) {
          const chapterStr = chapterMatch[1];
          const chNum = chapterStr.match(/\d+/);
          if (chNum && chNum[0]) chapterIndex = parseInt(chNum[0], 10);
        }
      } else if (posMatch && posMatch[1]) {
        // Format 4: Simple position offset
        charOffset = parseInt(posMatch[1], 10);
      } else if (percentMatch && percentMatch[1]) {
        // Format 5: Percentage position
        relativePosition = parseFloat(percentMatch[1]) / 100;
      } else {
        console.warn('Unsupported CFI format:', cfi);
        return null;
      }

      // Enhanced chapter element finding with multiple selector strategies
      let chapterElement: Element | null = null;
      
      // Strategy 1: Try data-chapter-index attribute
      chapterElement = this.document.querySelector(`[data-chapter-index="${chapterIndex}"]`);
      
      // Strategy 2: Try data-chapter attribute  
      if (!chapterElement) {
        chapterElement = this.document.querySelector(`[data-chapter="${chapterIndex}"]`);
      }
      
      // Strategy 3: Try id-based selectors
      if (!chapterElement) {
        chapterElement = this.document.querySelector(`#chapter-${chapterIndex}, #chapter${chapterIndex}, #ch${chapterIndex}`);
      }
      
      // Strategy 4: Try class-based selectors
      if (!chapterElement) {
        chapterElement = this.document.querySelector(`.chapter-${chapterIndex}, .chapter${chapterIndex}`);
      }
      
      // Strategy 5: Fall back to nth-child selection
      if (!chapterElement) {
        const chapterElements = this.document.querySelectorAll('[data-chapter-index], [data-chapter], .chapter, section, div.chapter');
        if (chapterIndex < chapterElements.length) {
          chapterElement = chapterElements[chapterIndex] || null;
        }
      }
      
      // Strategy 6: Use entire document if no chapter found (for single-chapter documents)
      if (!chapterElement) {
        console.warn(`Chapter ${chapterIndex} not found, using document body`);
        chapterElement = this.document.body;
      }

      // Calculate character offset from relative position if needed
      if (charOffset === null && relativePosition !== null) {
        const chapterText = chapterElement.textContent || '';
        const normalizedChapterText = this.normalizeSearchText(chapterText);
        charOffset = Math.max(0, Math.min(normalizedChapterText.length - 1, Math.floor(normalizedChapterText.length * relativePosition)));
      }

      // Ensure we have a valid character offset
      if (charOffset === null || charOffset < 0) {
        console.warn('Invalid character offset calculated from CFI:', cfi);
        return null;
      }

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

  /**
   * Calculate pixel distance between two ranges
   */
  private calculateRangeDistance(range1: Range, range2: Range): number {
    try {
      const rect1 = range1.getBoundingClientRect();
      const rect2 = range2.getBoundingClientRect();
      
      // Calculate center points
      const center1 = { x: rect1.left + rect1.width / 2, y: rect1.top + rect1.height / 2 };
      const center2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };
      
      // Euclidean distance
      return Math.sqrt(
        Math.pow(center1.x - center2.x, 2) + 
        Math.pow(center1.y - center2.y, 2)
      );
    } catch {
      return Infinity;
    }
  }
  
  /**
   * Calculate confidence score for CFI match based on distance and text length
   */
  private calculateCFIMatchConfidence(distance: number, maxDistance: number, textLength: number): number {
    if (distance === 0) return 1.0;
    if (distance >= maxDistance) return 0.0;
    
    // Base confidence from distance (closer is better)
    const distanceConfidence = 1 - (distance / maxDistance);
    
    // Longer text gets higher confidence (more specific)
    const lengthBonus = Math.min(0.2, textLength / 50);
    
    return Math.min(1.0, distanceConfidence + lengthBonus);
  }
  

  /**
   * SOP Enhancement: Find text that spans across multiple DOM nodes
   */
  private findTextAcrossNodes(searchText: string): { range: Range; confidence: number } | null {
    const normalizedSearchText = this.normalizeSearchText(searchText).toLowerCase();
    if (!normalizedSearchText) return null;

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
      const nodeRange: Text[] = [];
      const indexMap: number[] = []; // Maps normalized index to original global index
      let originalGlobalIndex = 0;
      
      // Build combined text from consecutive nodes with index mapping
      for (let j = i; j < Math.min(i + 10, textNodes.length); j++) {
        const currentNode = textNodes[j];
        if (!currentNode?.textContent) continue;
        
        const originalNodeText = currentNode.textContent.toLowerCase();
        const normalizedNodeText = this.normalizeSearchText(originalNodeText);
        
        // Build index map for this node - mapping normalized positions to original positions
        let originalNodeIndex = 0;
        for (let k = 0; k < normalizedNodeText.length; k++) {
          // Find corresponding position in original text
          while (originalNodeIndex < originalNodeText.length) {
            const originalChar = originalNodeText[originalNodeIndex];
            const normalizedChar = normalizedNodeText[k];
            
            if (originalChar && /\s/.test(originalChar)) {
              // Handle whitespace normalization
              if (normalizedChar === ' ') {
                indexMap.push(originalGlobalIndex + originalNodeIndex);
                // Skip any additional whitespace in original
                while (originalNodeIndex < originalNodeText.length && /\s/.test(originalNodeText[originalNodeIndex] || '')) {
                  originalNodeIndex++;
                }
                break;
              }
              originalNodeIndex++;
            } else {
              // Non-whitespace character - direct mapping
              indexMap.push(originalGlobalIndex + originalNodeIndex);
              originalNodeIndex++;
              break;
            }
          }
        }
        
        combinedText += normalizedNodeText;
        nodeRange.push(currentNode);
        originalGlobalIndex += originalNodeText.length;
        
        // Check if we found the text
        const searchIndex = combinedText.indexOf(normalizedSearchText);
        if (searchIndex >= 0) {
          try {
            // Convert normalized indices back to original indices
            const originalStart = indexMap[searchIndex] || 0;
            const originalEndIndex = searchIndex + normalizedSearchText.length - 1;
            const originalEnd = originalEndIndex < indexMap.length ? (indexMap[originalEndIndex] || originalGlobalIndex - 1) : originalGlobalIndex - 1;
            const originalLength = originalEnd - originalStart + 1;
            
            const range = this.createCrossNodeRange(nodeRange, originalStart, originalLength, searchText);
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
    // Normalize and filter words - allow single characters if they're meaningful
    const normalizedText = this.normalizeSearchText(searchText);
    const words = normalizedText.toLowerCase().split(/\s+/).filter(w => {
      // Allow single letters that are likely meaningful (I, A) or numbers
      if (w.length === 1) {
        return /[iauIAU0-9]/.test(w);
      }
      // Allow all words of 2+ characters (reduced from 3+)
      return w.length > 1;
    });
    
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
        const word = words[j];
        if (!word) break;
        const wordIndex = text.indexOf(word, currentPos);
        if (wordIndex >= 0) {
          if (startPos === -1) startPos = wordIndex;
          endPos = wordIndex + word.length;
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
      const firstWord = foundWords[0];
      const lastWord = foundWords[foundWords.length - 1];
      if (!firstWord || !lastWord) return null;
      const start = firstWord.index;
      const end = lastWord.index + lastWord.word.length;
      
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
        const searchWord = words[j];
        const textWord = segment[j] || '';
        if (!searchWord) continue;
        
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
      
      // Allow short words only if we have location (CFI) or context data for precise matching
      if (searchText.trim().length < 3) {
        const hasLocation = annotation.location && annotation.location.trim().length > 0;
        const hasContext = annotation.textContext && annotation.textContext.trim().length > 10;
        
        if (!hasLocation && !hasContext) {
          console.warn(`⚠️ Skipping annotation ${annotation.id}: searchText too short (${searchText.length} chars) without location/context data:`, searchText);
          return false;
        }
        
        console.warn(`✅ Allowing short word "${searchText}" with ${hasLocation ? 'location' : ''} ${hasContext ? 'context' : ''} data`);
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
    const annotationType = annotation.annotation_type;
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
      const event = new CustomEvent('annotationClick', { detail: annotation, bubbles: true, composed: true });
      span.dispatchEvent(event);
    });
    
    return span;
  }

  private applyHighlightToRange(range: Range, highlightElement: HTMLSpanElement): void {
    try {
      // Try surroundContents first for simple ranges - preserves text node structure better
      range.surroundContents(highlightElement);
    } catch {
      // Fallback for complex ranges that cross multiple elements
      try {
        const contents = range.extractContents();
        highlightElement.appendChild(contents);
        range.insertNode(highlightElement);
      } catch (fallbackError) {
        // Final fallback - insert the highlight element and move content manually
        console.warn('Range highlighting failed with both surroundContents and extractContents:', fallbackError);
        range.insertNode(highlightElement);
      }
    }
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
  // @ts-expect-error - Method reserved for future SOP enhancements
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
          highlight.location || undefined,
          highlight.textContext,
          strategies
        );
        
        if (matchResult && matchResult.range) {
          // Create highlight element
          const highlightElement = this.createHighlightElement({
            id: highlight.id,
            searchText: highlight.searchText,
            content: highlight.searchText,
            location: highlight.location || '',
            textContext: highlight.textContext,
            color: highlight.color,
            annotation_type: (highlight.type || 'highlight') as 'highlight' | 'note' | 'bookmark'
          } as SavedAnnotation, matchResult.confidence || 1.0);
          
          // Apply the highlight
          this.applyHighlightToRange(matchResult.range, highlightElement);
          
          attempt.strategy = matchResult.strategy as HighlightAttempt['strategy'];
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
    performance: {
      total: number;
      byLevel: Record<string, number>;
      recentErrors: Array<{
        timestamp: number;
        level: 'info' | 'warn' | 'error';
        message: string;
        context?: Record<string, unknown>;
        annotationId?: string;
        strategy?: string;
      }>;
      successRate: number;
    };
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
    if ((errorCounts.get(HighlightErrorType.CROSS_NODE_TEXT) ?? 0) > 0) {
      recommendations.push('Text spans multiple DOM elements - cross-node search is being used');
    }
    if ((errorCounts.get(HighlightErrorType.DOM_STRUCTURE_CHANGED) ?? 0) > 0) {
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
      console.warn('Highlight Manager destroyed. Final statistics:', this.getSOPStats().performance);
    }
  }
}