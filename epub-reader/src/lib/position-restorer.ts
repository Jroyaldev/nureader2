import { PositionData, PositionManager } from './position-manager';
import { EnhancedTextFinder } from './highlight-manager';

/**
 * Types for position restoration
 */
interface RestorationAttempt {
  strategy: RestorationStrategy;
  success: boolean;
  confidence: number;
  error?: string | undefined;
  range?: Range | undefined;
  timestamp: number;
}

interface RestorationResult {
  success: boolean;
  finalStrategy: RestorationStrategy;
  confidence: number;
  attempts: RestorationAttempt[];
  position?: Range | undefined;
  error?: string | undefined;
}

interface RestorationConfig {
  enableSmoothing: boolean;
  smoothingDuration: number;
  fallbackToTop: boolean;
  logAttempts: boolean;
  maxRetries: number;
  retryDelay: number;
}

type RestorationStrategy = 
  | 'cfi-primary'
  | 'cfi-backup'
  | 'text-exact'
  | 'text-fuzzy'
  | 'paragraph-word'
  | 'chapter-percentage'
  | 'viewport-relative'
  | 'fallback-top';

/**
 * Coordinates position restoration with multiple fallback strategies
 */
export class PositionRestorer {
  private document: Document;
  private container: Element;
  private positionManager: PositionManager;
  private textFinder: EnhancedTextFinder;
  
  private config: RestorationConfig = {
    enableSmoothing: true,
    smoothingDuration: 800,
    fallbackToTop: true,
    logAttempts: true,
    maxRetries: 3,
    retryDelay: 500
  };

  constructor(
    document: Document, 
    container: Element, 
    positionManager: PositionManager
  ) {
    this.document = document;
    this.container = container;
    this.positionManager = positionManager;
    this.textFinder = new EnhancedTextFinder(document, container);
  }

  /**
   * Restore position using coordinated strategy sequence
   */
  async restorePosition(positionData: PositionData): Promise<RestorationResult> {
    const attempts: RestorationAttempt[] = [];
    
    // Validate position data first
    const validation = this.positionManager.validatePosition(positionData);
    if (!validation.isValid && validation.confidence < 0.3) {
      return {
        success: false,
        finalStrategy: 'fallback-top',
        confidence: 0,
        attempts,
        error: `Position validation failed: ${validation.errors.join(', ')}`
      };
    }

    // Define restoration strategy sequence based on validation
    const strategies = this.getRestorationStrategies(positionData, validation);
    
    // Attempt restoration with each strategy
    for (const strategy of strategies) {
      const attempt = await this.attemptRestoration(strategy, positionData);
      attempts.push(attempt);
      
      if (attempt.success && attempt.confidence > 0.5) {
        // Successful restoration
        if (attempt.range) {
          await this.scrollToRange(attempt.range);
          
          // Update position manager with successful restoration
          // Map strategy to allowed values
          let mappedStrategy: 'cfi' | 'text' | 'paragraph' | 'fallback';
          if (strategy.startsWith('cfi')) {
            mappedStrategy = 'cfi';
          } else if (strategy.startsWith('text')) {
            mappedStrategy = 'text';
          } else if (strategy.includes('paragraph')) {
            mappedStrategy = 'paragraph';
          } else {
            mappedStrategy = 'fallback';
          }
          
          this.positionManager.updatePosition({
            ...positionData,
            restorationStrategy: mappedStrategy,
            confidence: attempt.confidence,
            timestamp: Date.now()
          });
        }
        
        return {
          success: true,
          finalStrategy: strategy,
          confidence: attempt.confidence,
          attempts,
          position: attempt.range
        };
      }
      
      // Log attempt if enabled
      if (this.config.logAttempts) {
        console.log(`Restoration attempt failed: ${strategy} (confidence: ${attempt.confidence})`);
      }
      
      // Small delay between attempts
      if (this.config.retryDelay > 0) {
        await this.delay(this.config.retryDelay);
      }
    }
    
    // All strategies failed
    const fallbackResult = await this.performFallbackRestoration();
    attempts.push(fallbackResult);
    
    return {
      success: fallbackResult.success,
      finalStrategy: 'fallback-top',
      confidence: fallbackResult.confidence,
      attempts,
      position: fallbackResult.range,
      error: 'All restoration strategies failed'
    };
  }

  /**
   * Get ordered list of restoration strategies based on position data
   */
  private getRestorationStrategies(
    positionData: PositionData, 
    validation: ReturnType<PositionManager['validatePosition']>
  ): RestorationStrategy[] {
    const strategies: RestorationStrategy[] = [];
    
    // Primary CFI strategy
    if (validation.confidence > 0.7) {
      strategies.push('cfi-primary');
    }
    
    // Backup CFI strategy
    if (positionData.backupCfi) {
      strategies.push('cfi-backup');
    }
    
    // Text-based strategies
    if (positionData.textContext) {
      strategies.push('text-exact');
      strategies.push('text-fuzzy');
    }
    
    // Paragraph and word-based strategy
    if (positionData.paragraphIndex !== undefined && positionData.wordIndex !== undefined) {
      strategies.push('paragraph-word');
    }
    
    // Chapter percentage fallback
    strategies.push('chapter-percentage');
    
    // Viewport relative positioning
    strategies.push('viewport-relative');
    
    // Final fallback
    if (this.config.fallbackToTop) {
      strategies.push('fallback-top');
    }
    
    return strategies;
  }

  /**
   * Attempt restoration using a specific strategy
   */
  private async attemptRestoration(
    strategy: RestorationStrategy, 
    positionData: PositionData
  ): Promise<RestorationAttempt> {
    const startTime = Date.now();
    
    try {
      let range: Range | null = null;
      let confidence = 0;
      
      switch (strategy) {
        case 'cfi-primary':
          range = await this.restoreFromCFI(positionData.cfi);
          confidence = range ? 0.9 : 0;
          break;
          
        case 'cfi-backup':
          if (positionData.backupCfi) {
            range = await this.restoreFromCFI(positionData.backupCfi);
            confidence = range ? 0.8 : 0;
          }
          break;
          
        case 'text-exact':
          range = await this.restoreFromTextExact(positionData.textContext);
          confidence = range ? 0.85 : 0;
          break;
          
        case 'text-fuzzy':
          range = await this.restoreFromTextFuzzy(positionData.textContext);
          confidence = range ? 0.7 : 0;
          break;
          
        case 'paragraph-word':
          range = await this.restoreFromParagraphWord(positionData);
          confidence = range ? 0.6 : 0;
          break;
          
        case 'chapter-percentage':
          range = await this.restoreFromChapterPercentage(positionData);
          confidence = range ? 0.5 : 0;
          break;
          
        case 'viewport-relative':
          range = await this.restoreFromViewportRelative(positionData);
          confidence = range ? 0.4 : 0;
          break;
          
        case 'fallback-top':
          range = await this.restoreToChapterTop(positionData.chapterIndex);
          confidence = range ? 0.2 : 0;
          break;
      }
      
      return {
        strategy,
        success: range !== null,
        confidence,
        range: range || undefined,
        timestamp: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        strategy,
        success: false,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now() - startTime
      };
    }
  }

  /**
   * Restore position from CFI
   */
  private async restoreFromCFI(cfi: string): Promise<Range | null> {
    try {
      // Support both "chapter-X-Y" and "X/CHAPTER_ID@relative" formats
      const dashMatch = cfi.match(/chapter-(\d+)-(\d+)/);
      const slashRelMatch = cfi.match(/^(\d+)\/[^@]+@([0-9.]+)/);
      
      let chapterIndex = 0;
      let characterOffset: number | null = null;

      if (dashMatch) {
        chapterIndex = parseInt(dashMatch[1] || '0', 10);
        characterOffset = parseInt(dashMatch[2] || '0', 10);
      } else if (slashRelMatch) {
        chapterIndex = parseInt(slashRelMatch[1] || '0', 10);
      } else {
        return null;
      }
      
      const chapterElement = this.container.querySelector(`[data-chapter-index="${chapterIndex}"]`);
      if (!chapterElement) return null;

      if (characterOffset == null) {
        // Compute character offset from relative position across the chapter's text
        const chapterText = chapterElement.textContent || '';
        const rel = parseFloat(slashRelMatch![2] || '0');
        characterOffset = Math.max(0, Math.min(chapterText.length - 1, Math.floor(chapterText.length * rel)));
      }
      
      const walker = this.document.createTreeWalker(
        chapterElement,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let currentOffset = 0;
      let node: Text | null;
      
      while ((node = walker.nextNode() as Text)) {
        const nodeLength = node.textContent?.length || 0;
        if (currentOffset + nodeLength >= characterOffset) {
          const range = this.document.createRange();
          const localOffset = characterOffset - currentOffset;
          range.setStart(node, localOffset);
          range.setEnd(node, localOffset);
          return range;
        }
        currentOffset += nodeLength;
      }
    } catch (error) {
      console.warn('CFI restoration failed:', error);
    }
    
    return null;
  }

  /**
   * Restore position from exact text match
   */
  private async restoreFromTextExact(textContext: string): Promise<Range | null> {
    if (!textContext) return null;
    
    // Extract a smaller search phrase from the context
    const searchText = this.extractSearchPhrase(textContext);
    
    const walker = this.document.createTreeWalker(
      this.container,
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

  /**
   * Restore position using fuzzy text matching
   */
  private async restoreFromTextFuzzy(textContext: string): Promise<Range | null> {
    if (!textContext) return null;
    
    const searchText = this.extractSearchPhrase(textContext);
    const result = await this.textFinder.findText(searchText);
    
    return result?.range || null;
  }

  /**
   * Restore position from paragraph and word indices
   */
  private async restoreFromParagraphWord(positionData: PositionData): Promise<Range | null> {
    if (positionData.paragraphIndex === undefined || positionData.wordIndex === undefined) {
      return null;
    }
    
    const chapterElement = this.container.querySelector(`[data-chapter-index="${positionData.chapterIndex}"]`);
    if (!chapterElement) return null;
    
    const paragraphs = chapterElement.querySelectorAll('p, div, section');
    const paragraph = paragraphs[positionData.paragraphIndex];
    if (!paragraph) return null;
    
    const text = paragraph.textContent || '';
    
    // Use regex to find the nth word occurrence instead of simple indexOf
    const wordMatches = Array.from(text.matchAll(/\S+/g));
    
    if (positionData.wordIndex >= wordMatches.length) return null;
    
    const targetMatch = wordMatches[positionData.wordIndex];
    if (!targetMatch) return null;
    
    const wordToFind = targetMatch[0];
    const wordStart = targetMatch.index;
    
    if (wordStart === undefined) return null;
    
    // Find the text node containing this word
    const walker = this.document.createTreeWalker(
      paragraph,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentOffset = 0;
    let node: Text | null;
    
    while ((node = walker.nextNode() as Text)) {
      const nodeLength = node.textContent?.length || 0;
      if (currentOffset + nodeLength > wordStart) {
        const range = this.document.createRange();
        const localOffset = wordStart - currentOffset;
        range.setStart(node, localOffset);
        range.setEnd(node, localOffset + wordToFind.length);
        return range;
      }
      currentOffset += nodeLength;
    }
    
    return null;
  }

  /**
   * Restore position based on chapter percentage
   */
  private async restoreFromChapterPercentage(positionData: PositionData): Promise<Range | null> {
    const chapterElement = this.container.querySelector(`[data-chapter-index="${positionData.chapterIndex}"]`);
    if (!chapterElement) return null;
    
    // Calculate approximate position based on character offset
    const chapterText = chapterElement.textContent || '';
    
    // Guard against empty chapters
    if (chapterText.length === 0) {
      return null;
    }
    
    const percentage = positionData.characterOffset / chapterText.length;
    const targetOffset = Math.max(0, Math.min(chapterText.length, Math.floor(chapterText.length * percentage)));
    
    const walker = this.document.createTreeWalker(
      chapterElement,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentOffset = 0;
    let node: Text | null;
    
    while ((node = walker.nextNode() as Text)) {
      const nodeLength = node.textContent?.length || 0;
      if (currentOffset + nodeLength >= targetOffset) {
        const range = this.document.createRange();
        const localOffset = targetOffset - currentOffset;
        range.setStart(node, Math.max(0, localOffset));
        range.setEnd(node, Math.max(0, localOffset));
        return range;
      }
      currentOffset += nodeLength;
    }
    
    return null;
  }

  /**
   * Restore position relative to viewport
   */
  private async restoreFromViewportRelative(positionData: PositionData): Promise<Range | null> {
    const chapterElement = this.container.querySelector(`[data-chapter-index="${positionData.chapterIndex}"]`);
    if (!chapterElement) return null;
    
    // Calculate position based on chapter-relative percentage approach
    const chapterRect = chapterElement.getBoundingClientRect();
    const chapterText = chapterElement.textContent || '';
    
    // Guard against empty chapters and invalid viewport data
    if (chapterText.length === 0 || !positionData.viewport || chapterRect.height <= 0) {
      return null;
    }
    
    // Calculate percentage position within the chapter
    const percentage = Math.max(0, Math.min(1, positionData.viewport.scrollTop / chapterRect.height));
    
    // Get character index based on percentage
    const characterIndex = Math.floor(chapterText.length * percentage);
    
    // Walk text nodes to find the corresponding position
    const walker = this.document.createTreeWalker(
      chapterElement,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentIndex = 0;
    let node: Text | null;
    
    while ((node = walker.nextNode() as Text)) {
      const nodeLength = node.textContent?.length || 0;
      if (currentIndex + nodeLength >= characterIndex) {
        const range = this.document.createRange();
        const localOffset = Math.max(0, Math.min(nodeLength, characterIndex - currentIndex));
        range.setStart(node, localOffset);
        range.setEnd(node, localOffset);
        return range;
      }
      currentIndex += nodeLength;
    }
    
    // Fallback: return null if no suitable text node found
    return null;
  }

  /**
   * Fallback to chapter top
   */
  private async restoreToChapterTop(chapterIndex: number): Promise<Range | null> {
    const chapterElement = this.container.querySelector(`[data-chapter-index="${chapterIndex}"]`);
    if (!chapterElement) {
      // Fallback to first available chapter
      const firstChapter = this.container.querySelector('[data-chapter-index]');
      if (!firstChapter) return null;
      return this.createRangeAtElementStart(firstChapter);
    }
    
    return this.createRangeAtElementStart(chapterElement);
  }

  /**
   * Perform final fallback restoration
   */
  private async performFallbackRestoration(): Promise<RestorationAttempt> {
    try {
      // Try to restore to the beginning of the document
      const firstTextNode = this.findFirstTextNode();
      if (firstTextNode) {
        const range = this.document.createRange();
        range.setStart(firstTextNode, 0);
        range.setEnd(firstTextNode, 0);
        
        await this.scrollToRange(range);
        
        return {
          strategy: 'fallback-top',
          success: true,
          confidence: 0.1,
          range,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.error('Fallback restoration failed:', error);
    }
    
    return {
      strategy: 'fallback-top',
      success: false,
      confidence: 0,
      error: 'Complete restoration failure',
      timestamp: Date.now()
    };
  }

  /**
   * Scroll to a range with optional smooth animation
   */
  private async scrollToRange(range: Range): Promise<void> {
    try {
      const rect = range.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      
      // Align restored range to top of viewport for consistency
      const targetScrollTop = this.container.scrollTop + rect.top - containerRect.top;
      
      if (this.config.enableSmoothing) {
        await this.smoothScrollTo(targetScrollTop);
      } else {
        this.container.scrollTop = targetScrollTop;
      }
      
      // Highlight the restored position briefly
      this.highlightRestoredPosition(range);
      
    } catch (error) {
      console.warn('Failed to scroll to range:', error);
    }
  }

  /**
   * Smooth scroll to target position
   */
  private async smoothScrollTo(targetScrollTop: number): Promise<void> {
    return new Promise((resolve) => {
      const startScrollTop = this.container.scrollTop;
      const distance = targetScrollTop - startScrollTop;
      const duration = this.config.smoothingDuration;
      const startTime = Date.now();
      
      const animateScroll = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        this.container.scrollTop = startScrollTop + (distance * easeOut);
        
        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animateScroll);
    });
  }

  /**
   * Highlight restored position briefly
   */
  private highlightRestoredPosition(range: Range): void {
    try {
      const span = this.document.createElement('span');
      span.style.backgroundColor = '#ffeb3b';
      span.style.transition = 'background-color 2s ease-out';
      span.className = 'position-restoration-highlight';
      
      // Wrap the range content
      span.appendChild(range.extractContents());
      range.insertNode(span);
      
      // Fade out the highlight
      setTimeout(() => {
        span.style.backgroundColor = 'transparent';
        
        // Remove highlight after fade
        setTimeout(() => {
          if (span.parentNode) {
            while (span.firstChild) {
              span.parentNode.insertBefore(span.firstChild, span);
            }
            span.parentNode.removeChild(span);
          }
        }, 2000);
      }, 100);
      
    } catch (error) {
      console.warn('Failed to highlight restored position:', error);
    }
  }

  /**
   * Extract search phrase from text context
   */
  private extractSearchPhrase(textContext: string): string {
    // Extract a meaningful phrase (10-30 characters) from the middle of the context
    const words = textContext.split(/\s+/);
    const middleIndex = Math.floor(words.length / 2);
    const startIndex = Math.max(0, middleIndex - 2);
    const endIndex = Math.min(words.length, middleIndex + 3);
    
    return words.slice(startIndex, endIndex).join(' ');
  }

  /**
   * Create range at element start
   */
  private createRangeAtElementStart(element: Element): Range | null {
    const walker = this.document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const firstTextNode = walker.nextNode() as Text;
    if (!firstTextNode) return null;
    
    const range = this.document.createRange();
    range.setStart(firstTextNode, 0);
    range.setEnd(firstTextNode, 0);
    
    return range;
  }

  /**
   * Find first text node in container
   */
  private findFirstTextNode(): Text | null {
    const walker = this.document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    return walker.nextNode() as Text;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update restoration configuration
   */
  updateConfig(config: Partial<RestorationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RestorationConfig {
    return { ...this.config };
  }
}