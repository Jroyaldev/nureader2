/**
 * Enhanced position management with multi-strategy position saving
 */

// Types for position management
interface ViewportInfo {
  width: number;
  height: number;
  scrollTop: number;
  scrollLeft: number;
  devicePixelRatio: number;
}

interface FontSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
}

interface DisplaySettings {
  theme: string;
  margin: number;
  columnCount: number;
  columnGap: number;
  textAlign: string;
}

export interface PositionData {
  // Primary position identifiers
  cfi: string;
  chapterIndex: number;
  characterOffset: number;
  
  // Backup position strategies
  backupCfi?: string;
  textContext: string;
  paragraphIndex?: number;
  sentenceIndex?: number;
  wordIndex?: number;
  
  // Environmental context
  viewport: ViewportInfo;
  fontSettings: FontSettings;
  displaySettings: DisplaySettings;
  settingsHash: string;
  
  // Metadata
  timestamp: number;
  restorationStrategy: 'cfi' | 'text' | 'paragraph' | 'fallback';
  confidence: number;
}

// Legacy compatibility alias
export type SavedPosition = PositionData;

// Position restoration result interface
export interface PositionRestoreResult {
  success: boolean;
  method?: string;
  accuracy?: number;
  error?: string;
}

export interface PositionDataLegacy {
  // Primary position identifiers
  cfi: string;
  chapterIndex: number;
  characterOffset: number;
  
  // Backup position strategies
  backupCfi?: string;
  textContext: string;
  paragraphIndex?: number;
  sentenceIndex?: number;
  wordIndex?: number;
  
  // Environmental context
  viewport: ViewportInfo;
  fontSettings: FontSettings;
  displaySettings: DisplaySettings;
  settingsHash: string;
  
  // Metadata
  timestamp: number;
  restorationStrategy: 'cfi' | 'text' | 'paragraph' | 'fallback';
  confidence: number;
}

interface PositionValidationResult {
  isValid: boolean;
  confidence: number;
  strategy: string;
  errors: string[];
}

interface TextContextOptions {
  beforeLength: number;
  afterLength: number;
  includePunctuation: boolean;
  normalizeWhitespace: boolean;
}

/**
 * Manages reading position with multiple backup strategies
 */
export class PositionManager {
  private document: Document;
  private container: HTMLElement;
  private currentPosition?: PositionData;
  
  private textContextOptions: TextContextOptions = {
    beforeLength: 100,
    afterLength: 100,
    includePunctuation: true,
    normalizeWhitespace: false
  };

  constructor(document: Document, container: HTMLElement) {
    this.document = document;
    this.container = container;
  }

  /**
   * Capture current reading position with multiple strategies
   */
  capturePosition(): PositionData {
    const selection = this.document.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : this.getVisibleRange();
    
    if (!range) {
      throw new Error('Unable to determine current reading position');
    }

    const cfi = this.generateCFI(range);
    const backupCfi = this.generateBackupCFI(range);
    const textContext = this.extractTextContext(range);
    const chapterIndex = this.getChapterIndex(range);
    const characterOffset = this.getCharacterOffset(range);
    
    const viewport = this.captureViewportInfo();
    const fontSettings = this.captureFontSettings();
    const displaySettings = this.captureDisplaySettings();
    const settingsHash = this.calculateSettingsHash(viewport, fontSettings, displaySettings);
    
    const position: PositionData = {
      cfi,
      backupCfi,
      chapterIndex,
      characterOffset,
      textContext,
      paragraphIndex: this.getParagraphIndex(range),
      sentenceIndex: this.getSentenceIndex(range),
      wordIndex: this.getWordIndex(range),
      viewport,
      fontSettings,
      displaySettings,
      settingsHash,
      timestamp: Date.now(),
      restorationStrategy: 'cfi',
      confidence: 1.0
    };

    this.currentPosition = position;
    return position;
  }

  /**
   * Validate a position for restoration feasibility
   */
  validatePosition(position: PositionData): PositionValidationResult {
    const errors: string[] = [];
    let confidence = 1.0;
    let strategy = 'cfi';

    // Check if CFI is valid
    try {
      const range = this.getRangeFromCFI(position.cfi);
      if (!range) {
        errors.push('Primary CFI invalid');
        confidence -= 0.3;
        strategy = 'text';
      }
    } catch (error) {
      errors.push(`CFI parsing error: ${error}`);
      confidence -= 0.3;
      strategy = 'text';
    }

    // Check if backup CFI is valid
    if (position.backupCfi) {
      try {
        const backupRange = this.getRangeFromCFI(position.backupCfi);
        if (!backupRange) {
          errors.push('Backup CFI invalid');
          confidence -= 0.1;
        }
      } catch (error) {
        errors.push(`Backup CFI error: ${error}`);
        confidence -= 0.1;
      }
    }

    // Check if text context can be found
    if (position.textContext) {
      const textFound = this.findTextInDocument(position.textContext);
      if (!textFound) {
        errors.push('Text context not found');
        confidence -= 0.2;
        if (strategy === 'text') {
          strategy = 'paragraph';
        }
      }
    }

    // Check chapter availability
    const chapterElement = this.getChapterElement(position.chapterIndex);
    if (!chapterElement) {
      errors.push('Chapter not available');
      confidence -= 0.4;
      strategy = 'fallback';
    }

    // Check settings compatibility
    const currentSettings = this.captureDisplaySettings();
    const settingsChanged = this.calculateSettingsHash(
      this.captureViewportInfo(),
      this.captureFontSettings(),
      currentSettings
    ) !== position.settingsHash;
    
    if (settingsChanged) {
      errors.push('Display settings changed');
      confidence -= 0.1;
    }

    return {
      isValid: confidence > 0.3,
      confidence,
      strategy,
      errors
    };
  }

  /**
   * Get current position data
   */
  getCurrentPosition(): PositionData | undefined {
    return this.currentPosition;
  }

  /**
   * Update position with new data
   */
  updatePosition(position: PositionData): void {
    this.currentPosition = position;
  }

  /**
   * Generate primary CFI for a range
   * Wraps internal locator format in EPUB CFI format for database compatibility
   */
  private generateCFI(range: Range): string {
    const chapterIndex = this.getChapterIndex(range);
    const characterOffset = this.getCharacterOffset(range);
    const internalLocator = `chapter-${chapterIndex}-${characterOffset}`;
    return `epubcfi(${internalLocator})`;
  }

  /**
   * Generate backup CFI using different strategy
   * Wraps internal locator format in EPUB CFI format for database compatibility
   */
  private generateBackupCFI(range: Range): string {
    const chapterIndex = this.getChapterIndex(range);
    const paragraphIndex = this.getParagraphIndex(range);
    const wordIndex = this.getWordIndex(range);
    const internalLocator = `chapter-${chapterIndex}-p${paragraphIndex}-w${wordIndex}`;
    return `epubcfi(${internalLocator})`;
  }

  /**
   * Extract internal locator from EPUB CFI format
   * Removes the epubcfi() wrapper to get the internal format
   */
  private extractInternalLocator(cfi: string): string {
    const match = cfi.match(/^epubcfi\((.+)\)$/);
    return match?.[1] ?? cfi; // Fallback to original if not wrapped
  }

  /**
   * Check if a CFI is using our internal locator format
   */
  private isInternalLocator(locator: string): boolean {
    return locator.startsWith('chapter-') && (
      locator.includes('-p') || /chapter-\d+-\d+$/.test(locator)
    );
  }

  /**
   * Extract text context around the current position
   */
  private extractTextContext(range: Range): string {
    const startContainer = range.startContainer;
    const startOffset = range.startOffset;
    
    // Get the text node or find the nearest text node
    let textNode = startContainer.nodeType === Node.TEXT_NODE 
      ? startContainer as Text
      : this.findNearestTextNode(startContainer);
    
    if (!textNode) {
      return '';
    }

    // Extract context before and after the position
    const fullText = this.getFullChapterText(textNode);
    const globalOffset = this.getGlobalTextOffset(textNode, startOffset);
    
    const beforeStart = Math.max(0, globalOffset - this.textContextOptions.beforeLength);
    const afterEnd = Math.min(fullText.length, globalOffset + this.textContextOptions.afterLength);
    
    let context = fullText.substring(beforeStart, afterEnd);
    
    if (this.textContextOptions.normalizeWhitespace) {
      context = context.replace(/\s+/g, ' ').trim();
    }
    
    return context;
  }

  /**
   * Get the chapter index for a range
   */
  private getChapterIndex(range: Range): number {
    let element = range.startContainer.nodeType === Node.ELEMENT_NODE 
      ? range.startContainer as Element
      : range.startContainer.parentElement;
    
    while (element && element !== this.container) {
      const chapterAttr = element.getAttribute('data-chapter') ?? 
                         element.getAttribute('data-chapter-index');
      if (chapterAttr) {
        return parseInt(chapterAttr, 10);
      }
      element = element.parentElement;
    }
    
    return 0;
  }

  /**
   * Get character offset within the chapter
   */
  private getCharacterOffset(range: Range): number {
    const chapterElement = this.getChapterElement(this.getChapterIndex(range));
    if (!chapterElement) return 0;
    
    const walker = this.document.createTreeWalker(
      chapterElement,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let offset = 0;
    let node: Text | null;
    
    // Resolve range.startContainer to the nearest text node if it's an Element
    let targetNode: Node = range.startContainer;
    let targetOffset = range.startOffset;
    
    if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
      // Compute base offset from all child nodes before range.startOffset
      const element = range.startContainer as Element;
      let baseOffset = 0;
      
      // Sum text content lengths of all child nodes before startOffset
      for (let i = 0; i < range.startOffset && i < element.childNodes.length; i++) {
        const childNode = element.childNodes[i];
        baseOffset += childNode.textContent?.length || 0;
      }
      
      // Find the first descendant text node at or after the child index
      const childAtOffset = element.childNodes[range.startOffset];
      
      if (childAtOffset && childAtOffset.nodeType === Node.TEXT_NODE) {
        targetNode = childAtOffset;
        targetOffset = 0; // Start at beginning of the text node
      } else {
        // Find the first descendant text node from the current position
        const startElement = childAtOffset as Element || element;
        const textWalker = this.document.createTreeWalker(
          startElement,
          NodeFilter.SHOW_TEXT,
          null
        );
        const firstTextNode = textWalker.nextNode() as Text;
        if (firstTextNode) {
          targetNode = firstTextNode;
          targetOffset = 0; // Start at beginning of the text node
        } else {
          // No text node found, return end-of-chapter including baseOffset
          return baseOffset + (chapterElement.textContent?.length || 0);
        }
      }
      
      // Adjust the loop to account for base offset when element is the startContainer
      const hasBaseOffset = range.startContainer.nodeType === Node.ELEMENT_NODE;
      const elementBaseOffset = hasBaseOffset ? baseOffset : 0;
      
      while ((node = walker.nextNode() as Text)) {
        if (node === targetNode) {
          return offset + targetOffset + elementBaseOffset;
        }
        offset += node.textContent?.length || 0;
      }
    } else {
      // Normal text node case - no base offset needed
      while ((node = walker.nextNode() as Text)) {
        if (node === targetNode) {
          return offset + targetOffset;
        }
        offset += node.textContent?.length || 0;
      }
    }
    
    return chapterElement.textContent?.length || 0;
  }

  /**
   * Get paragraph index within the chapter
   */
  private getParagraphIndex(range: Range): number {
    let element = range.startContainer.nodeType === Node.ELEMENT_NODE 
      ? range.startContainer as Element
      : range.startContainer.parentElement;
    
    // Find the paragraph element
    while (element && !['P', 'DIV', 'SECTION'].includes(element.tagName)) {
      element = element.parentElement;
    }
    
    if (!element) return 0;
    
    // Count paragraphs before this one in the chapter
    const chapterElement = this.getChapterElement(this.getChapterIndex(range));
    if (!chapterElement) return 0;
    
    const paragraphs = chapterElement.querySelectorAll('p, div, section');
    const index = Array.from(paragraphs).indexOf(element);
    return index < 0 ? 0 : index;
  }

  /**
   * Get sentence index within the paragraph
   */
  private getSentenceIndex(range: Range): number {
    const paragraphElement = this.getParagraphElement(range);
    if (!paragraphElement) return 0;
    
    const text = paragraphElement.textContent || '';
    const sentences = text.split(/[.!?]+/);
    const rangeText = range.toString();
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (sentence && sentence.includes(rangeText)) {
        return i;
      }
    }
    
    return 0;
  }

  /**
   * Get word index within the sentence
   */
  private getWordIndex(range: Range): number {
    const textNode = range.startContainer.nodeType === Node.TEXT_NODE 
      ? range.startContainer as Text
      : this.findNearestTextNode(range.startContainer);
    
    if (!textNode) return 0;
    
    const text = textNode.textContent || '';
    const beforeText = text.substring(0, range.startOffset);
    const words = beforeText.split(/\s+/);
    
    return Math.max(0, words.length - 1);
  }

  /**
   * Capture current viewport information
   */
  private captureViewportInfo(): ViewportInfo {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollTop: this.container.scrollTop,
      scrollLeft: this.container.scrollLeft,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  }

  /**
   * Capture current font settings
   */
  private captureFontSettings(): FontSettings {
    const computedStyle = window.getComputedStyle(this.container);
    
    return {
      fontSize: parseFloat(computedStyle.fontSize),
      fontFamily: computedStyle.fontFamily,
      lineHeight: parseFloat(computedStyle.lineHeight) || 1.4,
      letterSpacing: parseFloat(computedStyle.letterSpacing) || 0,
      wordSpacing: parseFloat(computedStyle.wordSpacing) || 0
    };
  }

  /**
   * Capture current display settings
   */
  private captureDisplaySettings(): DisplaySettings {
    const computedStyle = window.getComputedStyle(this.container);
    
    return {
      theme: this.container.getAttribute('data-theme') || 'default',
      margin: parseFloat(computedStyle.margin) || 0,
      columnCount: parseInt(computedStyle.columnCount) || 1,
      columnGap: parseFloat(computedStyle.columnGap) || 0,
      textAlign: computedStyle.textAlign
    };
  }

  /**
   * Calculate hash of current settings for change detection
   */
  private calculateSettingsHash(viewport: ViewportInfo, font: FontSettings, display: DisplaySettings): string {
    const settingsString = JSON.stringify({
      viewport: {
        width: viewport.width,
        height: viewport.height,
        devicePixelRatio: viewport.devicePixelRatio
      },
      font,
      display
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < settingsString.length; i++) {
      const char = settingsString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Get visible range in the viewport
   */
  private getVisibleRange(): Range | null {
    const rect = this.container.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    // Anchor near the top for viewport-consistent restoration
    const y = rect.top + Math.min(40, rect.height * 0.1);
    const stack = (this.document as any).elementsFromPoint
      ? (this.document as any).elementsFromPoint(x, y) as Element[]
      : [this.document.elementFromPoint(x, y)].filter(Boolean) as Element[];
    const elementAtAnchor = stack.find(el => this.container.contains(el));
    if (!elementAtAnchor) return null;
    
    // Find the first text node in this element
    const walker = this.document.createTreeWalker(
      elementAtAnchor,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const textNode = walker.nextNode() as Text;
    if (!textNode) return null;
    
    const range = this.document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, Math.min(10, textNode.textContent?.length || 0));
    
    return range;
  }

  /**
   * Convert CFI to DOM range
   */
  private getRangeFromCFI(cfi: string): Range | null {
    try {
      // Extract internal locator from EPUB CFI wrapper
      const internalLocator = this.extractInternalLocator(cfi);
      
      // Parse internal locator format: "chapter-X-Y" or "chapter-X-pY-wZ"
      const chapterMatch = internalLocator.match(/chapter-(\d+)-(\d+)/);
      const paragraphMatch = internalLocator.match(/chapter-(\d+)-p(\d+)-w(\d+)/);
      
      if (paragraphMatch) {
        const chapterIndex = parseInt(paragraphMatch[1] || '0');
        const paragraphIndex = parseInt(paragraphMatch[2] || '0');
        const wordIndex = parseInt(paragraphMatch[3] || '0');
        
        return this.getRangeFromParagraphWord(chapterIndex, paragraphIndex, wordIndex);
      } else if (chapterMatch) {
        const chapterIndex = parseInt(chapterMatch[1] || '0');
        const characterOffset = parseInt(chapterMatch[2] || '0');
        
        return this.getRangeFromCharacterOffset(chapterIndex, characterOffset);
      }
    } catch (error) {
      console.warn('Failed to parse CFI:', error);
    }
    
    return null;
  }

  /**
   * Get range from character offset
   */
  private getRangeFromCharacterOffset(chapterIndex: number, characterOffset: number): Range | null {
    const chapterElement = this.getChapterElement(chapterIndex);
    if (!chapterElement) return null;
    
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
    
    return null;
  }

  /**
   * Get range from paragraph and word indices
   */
  private getRangeFromParagraphWord(chapterIndex: number, paragraphIndex: number, wordIndex: number): Range | null {
    const chapterElement = this.getChapterElement(chapterIndex);
    if (!chapterElement) return null;
    
    const paragraphs = chapterElement.querySelectorAll('p, div, section');
    const paragraph = paragraphs[paragraphIndex];
    if (!paragraph) return null;
    
    const text = paragraph.textContent || '';
    const words = text.split(/\s+/);
    
    if (wordIndex >= words.length) return null;
    
    // Find the start index of the nth word
    const wordMatches = [...text.matchAll(/\S+/g)];
    if (wordIndex >= wordMatches.length) return null;
    const wordMatch = wordMatches[wordIndex];
    if (!wordMatch || wordMatch.index === undefined) return null;
    const wordStart = wordMatch.index;
    const wordLength = wordMatch[0].length;
    
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
        range.setEnd(node, localOffset + wordLength);
        return range;
      }
      currentOffset += nodeLength;
    }
    
    return null;
  }

  /**
   * Find text in document
   */
  private findTextInDocument(text: string): Range | null {
    const walker = this.document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
      const hay = this.textContextOptions.normalizeWhitespace
        ? (node.textContent || '').replace(/\s+/g, ' ')
        : (node.textContent || '');
      const needle = this.textContextOptions.normalizeWhitespace
        ? text.replace(/\s+/g, ' ')
        : text;
      const index = hay.toLowerCase().indexOf(needle.toLowerCase());
      if (index !== undefined && index >= 0) {
        const range = this.document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + needle.length);
        return range;
      }
    }
    
    return null;
  }

  /**
   * Get chapter element by index
   */
  private getChapterElement(chapterIndex: number): Element | null {
    return this.container.querySelector(`[data-chapter="${chapterIndex}"], [data-chapter-index="${chapterIndex}"]`);
  }

  /**
   * Get paragraph element for a range
   */
  private getParagraphElement(range: Range): Element | null {
    let element = range.startContainer.nodeType === Node.ELEMENT_NODE 
      ? range.startContainer as Element
      : range.startContainer.parentElement;
    
    while (element && !['P', 'DIV', 'SECTION'].includes(element.tagName)) {
      element = element.parentElement;
    }
    
    return element;
  }

  /**
   * Find nearest text node
   */
  private findNearestTextNode(node: Node): Text | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return node as Text;
    }
    
    const walker = this.document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    return walker.nextNode() as Text;
  }

  /**
   * Get full chapter text
   */
  private getFullChapterText(textNode: Text): string {
    // Find chapter element by traversing up the DOM tree
    let element: Element | null = textNode.parentElement;
    while (element && !element.hasAttribute('data-chapter') && !element.hasAttribute('data-chapter-index')) {
      element = element.parentElement;
    }
    const chapterElement = element;
    
    return chapterElement?.textContent || '';
  }

  /**
   * Get global text offset within chapter
   */
  private getGlobalTextOffset(textNode: Text, localOffset: number): number {
    // Find chapter element by traversing up the DOM tree
    let element: Element | null = textNode.parentElement;
    while (element && !element.hasAttribute('data-chapter') && !element.hasAttribute('data-chapter-index')) {
      element = element.parentElement;
    }
    const chapterElement = element;
    
    if (!chapterElement) return localOffset;
    
    const walker = this.document.createTreeWalker(
      chapterElement,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let globalOffset = 0;
    let node: Text | null;
    
    while ((node = walker.nextNode() as Text)) {
      if (node === textNode) {
        return globalOffset + localOffset;
      }
      globalOffset += node.textContent?.length || 0;
    }
    
    return globalOffset + localOffset;
  }
}