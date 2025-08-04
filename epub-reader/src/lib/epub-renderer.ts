/**
 * Clean EPUB Renderer - Manual Chapter Stitching with Native Scrolling
 * Uses epub.js only for parsing, renders content directly to DOM for smooth scrolling
 */

interface ChapterData {
  id: string;
  index: number;
  href: string;
  content: string;
  title: string;
}

interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
}

export class EpubRenderer {
  private book: any;
  private container: HTMLElement;
  private chapters: ChapterData[] = [];
  private toc: TocItem[] = [];
  private currentTheme: 'light' | 'dark' = 'light';
  private onProgressCallback?: (progress: number) => void;
  private onChapterCallback?: (title: string) => void;
  private currentChapterIndex: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupScrollListener();
  }

  async loadBook(file: File): Promise<{ title?: string; author?: string }> {
    console.log("📚 EpubRenderer: Loading book", file.name);
    
    try {
      // Use epub.js only for parsing
      const mod = await import("epubjs");
      const EpubCtor = mod?.default ?? mod;
      this.book = new (EpubCtor as any)(await file.arrayBuffer());

      // Wait for book to be ready
      await this.book.ready;

      // Extract metadata
      const metadata = await this.book.loaded.metadata;
      const title = metadata?.title;
      const author = metadata?.creator || metadata?.author;

      // Extract table of contents
      await this.extractTableOfContents();
      
      // Extract all chapters as HTML
      await this.extractChapters();
      
      // Render as single continuous document
      this.renderContinuousContent();
      
      // Apply initial theme
      this.applyTheme(this.currentTheme);

      console.log("✅ EpubRenderer: Book loaded successfully", { title, author, chapters: this.chapters.length });
      
      return { title, author };
    } catch (error) {
      console.error("❌ EpubRenderer: Failed to load book", error);
      throw error;
    }
  }

  private async extractTableOfContents(): Promise<void> {
    try {
      const nav = await this.book.loaded.navigation;
      const flat: TocItem[] = [];
      
      const walk = (items: TocItem[]) => {
        for (const item of items || []) {
          if (item?.label && item?.href) {
            flat.push({ label: item.label, href: item.href });
          }
          if (item?.subitems?.length) {
            walk(item.subitems);
          }
        }
      };
      
      walk(nav?.toc || []);
      this.toc = flat;
      console.log("📚 EpubRenderer: TOC extracted", flat.length, "items");
    } catch (error) {
      console.warn("⚠️ EpubRenderer: Failed to extract TOC", error);
      this.toc = [];
    }
  }

  private async extractChapters(): Promise<void> {
    console.log("📖 EpubRenderer: Extracting chapters...");
    
    const spine = this.book.spine;
    
    this.chapters = await Promise.all(
      spine.spineItems.map(async (item: any, index: number) => {
        try {
          console.log(`📄 EpubRenderer: Loading chapter ${index + 1}/${spine.spineItems.length}: ${item.href}`);
          
          // Load the section content
          const section = await this.book.load(item.href);
          
          // Extract title from TOC or content
          const title = this.findChapterTitle(item.href, section);
          
          // Get the HTML content
          let content = '';
          if (section.documentElement) {
            content = section.documentElement.outerHTML;
          } else if (typeof section === 'string') {
            content = section;
          } else {
            content = section.innerHTML || '';
          }

          return {
            id: item.id,
            index,
            href: item.href,
            content,
            title
          };
        } catch (error) {
          console.warn(`⚠️ EpubRenderer: Failed to load chapter ${index}:`, error);
          return {
            id: item.id,
            index,
            href: item.href,
            content: '<p>Failed to load chapter content</p>',
            title: `Chapter ${index + 1}`
          };
        }
      })
    );

    console.log("✅ EpubRenderer: All chapters extracted", this.chapters.length);
  }

  private findChapterTitle(href: string, section: any): string {
    // Try to find title in TOC first
    const tocItem = this.toc.find(item => {
      const itemHref = item.href.split('#')[0];
      const sectionHref = href.split('#')[0];
      return itemHref === sectionHref;
    });
    
    if (tocItem) {
      return tocItem.label;
    }

    // Try to extract from content
    try {
      const firstH1 = section.querySelector('h1');
      const firstH2 = section.querySelector('h2');
      const title = section.querySelector('title');
      
      if (firstH1?.textContent) {
        return firstH1.textContent.trim();
      } else if (firstH2?.textContent) {
        return firstH2.textContent.trim();
      } else if (title?.textContent) {
        return title.textContent.trim();
      }
    } catch (error) {
      // Ignore parsing errors
    }

    // Fallback to filename
    return href.split('/').pop()?.split('.')[0] || `Chapter ${this.chapters.length + 1}`;
  }

  private renderContinuousContent(): void {
    console.log("🎨 EpubRenderer: Rendering continuous content...");
    
    // Create main content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'epub-continuous-content';
    contentWrapper.setAttribute('data-theme', this.currentTheme);
    
    this.chapters.forEach((chapter, index) => {
      const section = document.createElement('section');
      section.className = 'epub-chapter';
      section.setAttribute('data-chapter-id', chapter.id);
      section.setAttribute('data-chapter-index', chapter.index.toString());
      section.setAttribute('data-chapter-href', chapter.href);
      
      // Extract body content only to avoid head elements
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = chapter.content;
      
      let bodyContent = '';
      const bodyElement = tempDiv.querySelector('body');
      if (bodyElement) {
        bodyContent = bodyElement.innerHTML;
      } else {
        // If no body tag, use the content as-is but clean it
        bodyContent = this.cleanHtmlContent(chapter.content);
      }
      
      // Add chapter title if not already present
      if (chapter.title && !bodyContent.includes('<h1>') && !bodyContent.includes('<h2>')) {
        bodyContent = `<h2 class="chapter-title">${chapter.title}</h2>${bodyContent}`;
      }
      
      section.innerHTML = bodyContent;
      contentWrapper.appendChild(section);
      
      // Add separator between chapters (except last)
      if (index < this.chapters.length - 1) {
        const separator = document.createElement('div');
        separator.className = 'chapter-separator';
        contentWrapper.appendChild(separator);
      }
    });

    // Clear container and add continuous content
    this.container.innerHTML = '';
    this.container.appendChild(contentWrapper);
    
    console.log("✅ EpubRenderer: Continuous content rendered");
  }

  private cleanHtmlContent(html: string): string {
    // Remove script tags and other potentially problematic elements
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<link[^>]*>/gi, '')
      .replace(/<meta[^>]*>/gi, '')
      .replace(/<title[^>]*>.*?<\/title>/gi, '');
  }

  private setupScrollListener(): void {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.updateProgress();
          this.updateCurrentChapter();
          ticking = false;
        });
        ticking = true;
      }
    };

    this.container.addEventListener('scroll', handleScroll, { passive: true });
  }

  private updateProgress(): void {
    if (!this.onProgressCallback) return;

    const scrollTop = this.container.scrollTop;
    const scrollHeight = this.container.scrollHeight - this.container.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    
    this.onProgressCallback(Math.round(progress));
  }

  private updateCurrentChapter(): void {
    if (!this.onChapterCallback) return;

    const scrollTop = this.container.scrollTop;
    const viewportHeight = this.container.clientHeight;
    const midPoint = scrollTop + viewportHeight / 2;

    const chapters = this.container.querySelectorAll('.epub-chapter');
    let currentChapter = '';

    for (const chapter of chapters) {
      const rect = (chapter as HTMLElement).getBoundingClientRect();
      const chapterTop = scrollTop + rect.top;
      const chapterBottom = chapterTop + rect.height;

      if (midPoint >= chapterTop && midPoint <= chapterBottom) {
        const index = parseInt((chapter as HTMLElement).getAttribute('data-chapter-index') || '0');
        currentChapter = this.chapters[index]?.title || '';
        break;
      }
    }

    this.onChapterCallback(currentChapter);
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.currentTheme = theme;
    this.applyTheme(theme);
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    const colors = {
      light: { 
        bg: '#fcfcfd', 
        color: '#1c2024',
        muted: '#6b7280',
        border: '#e5e7eb'
      },
      dark: { 
        bg: '#101215', 
        color: '#f5f5f7',
        muted: '#a1a1aa',
        border: '#374151'
      }
    };

    const themeColors = colors[theme];

    const styles = `
      .epub-continuous-content {
        background-color: ${themeColors.bg};
        color: ${themeColors.color};
        font-family: "Crimson Text", "Georgia", "Times New Roman", serif;
        font-size: 18px;
        line-height: 1.8;
        letter-spacing: 0.01em;
        max-width: 70ch;
        margin: 0 auto;
        padding: 60px 40px 80px 40px;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        hyphens: auto;
        word-spacing: 0.05em;
      }

      .epub-chapter {
        margin-bottom: 6em;
        page-break-inside: avoid;
      }
      
      .epub-chapter:first-child {
        margin-top: 2em;
      }

      .chapter-separator {
        height: 1px;
        background: linear-gradient(to right, transparent, ${themeColors.border}, transparent);
        margin: 4em 0;
        opacity: 0.4;
        position: relative;
      }
      
      .chapter-separator::after {
        content: '***';
        position: absolute;
        top: -0.75em;
        left: 50%;
        transform: translateX(-50%);
        background-color: ${themeColors.bg};
        padding: 0 1em;
        font-size: 1.2em;
        letter-spacing: 0.5em;
        color: ${themeColors.muted};
      }

      .chapter-title {
        font-size: 1.75em;
        font-weight: 400;
        margin: 0 0 2em 0;
        color: ${themeColors.color};
        text-align: center;
        position: relative;
        padding-bottom: 1em;
        font-variant: small-caps;
        letter-spacing: 0.1em;
      }
      
      .chapter-title::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 60px;
        height: 2px;
        background: linear-gradient(to right, transparent, ${themeColors.border}, transparent);
      }

      /* Typography hierarchy */
      .epub-continuous-content h1,
      .epub-continuous-content h2,
      .epub-continuous-content h3,
      .epub-continuous-content h4,
      .epub-continuous-content h5,
      .epub-continuous-content h6 {
        color: ${themeColors.color};
        font-family: "Crimson Text", "Georgia", serif;
        font-weight: 600;
        letter-spacing: -0.01em;
        margin: 2em 0 1em 0;
        text-rendering: optimizeLegibility;
        line-height: 1.3;
      }

      .epub-continuous-content h1 {
        font-size: 2.25em;
        line-height: 1.2;
        margin-top: 0;
        text-align: center;
        font-variant: small-caps;
        letter-spacing: 0.05em;
      }

      .epub-continuous-content h2 {
        font-size: 1.75em;
        line-height: 1.3;
        margin-top: 1.5em;
        text-align: center;
      }

      .epub-continuous-content h3 {
        font-size: 1.4em;
        line-height: 1.4;
        margin-top: 1.75em;
      }

      .epub-continuous-content h4,
      .epub-continuous-content h5,
      .epub-continuous-content h6 {
        font-size: 1.2em;
        line-height: 1.5;
        font-weight: 500;
        margin-top: 1.5em;
      }

      /* Paragraphs and text */
      .epub-continuous-content p {
        margin: 0 0 1.4em 0;
        text-align: justify;
        text-justify: inter-word;
        orphans: 3;
        widows: 3;
        text-indent: 1.5em;
      }
      
      .epub-continuous-content p:first-of-type,
      .epub-continuous-content h1 + p,
      .epub-continuous-content h2 + p,
      .epub-continuous-content h3 + p,
      .epub-continuous-content h4 + p,
      .epub-continuous-content h5 + p,
      .epub-continuous-content h6 + p {
        text-indent: 0;
      }

      .epub-continuous-content p:last-child {
        margin-bottom: 0;
      }

      /* Lists */
      .epub-continuous-content ul,
      .epub-continuous-content ol {
        margin: 1em 0;
        padding-left: 1.5em;
      }

      .epub-continuous-content li {
        margin-bottom: 0.5em;
        line-height: 1.6;
      }

      /* Blockquotes */
      .epub-continuous-content blockquote {
        color: ${themeColors.muted};
        font-style: italic;
        margin: 2em 0;
        padding: 1.5em 2em;
        border-left: 4px solid ${theme === 'dark' ? '#d4af37' : '#8b4513'};
        background-color: ${theme === 'dark' ? 'rgba(212, 175, 55, 0.05)' : 'rgba(139, 69, 19, 0.03)'};
        border-radius: 0 8px 8px 0;
        position: relative;
        font-size: 0.95em;
        line-height: 1.7;
      }
      
      .epub-continuous-content blockquote::before {
        content: '"';
        font-size: 3em;
        position: absolute;
        left: 0.3em;
        top: 0.1em;
        color: ${theme === 'dark' ? '#d4af37' : '#8b4513'};
        opacity: 0.3;
        font-family: "Crimson Text", "Georgia", serif;
      }

      /* Code */
      .epub-continuous-content code,
      .epub-continuous-content pre {
        font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace;
        background-color: ${theme === 'dark' ? '#1f2937' : '#f3f4f6'};
        color: ${theme === 'dark' ? '#e5e7eb' : '#374151'};
      }

      .epub-continuous-content code {
        font-size: 0.9em;
        padding: 0.2em 0.4em;
        border-radius: 3px;
      }

      .epub-continuous-content pre {
        padding: 1em;
        border-radius: 6px;
        overflow-x: auto;
        margin: 1em 0;
      }

      /* Remove ALL link styling - make everything plain text */
      .epub-continuous-content a,
      .epub-continuous-content a:link,
      .epub-continuous-content a:visited,
      .epub-continuous-content a:hover,
      .epub-continuous-content a:active,
      .epub-continuous-content a:focus {
        color: ${themeColors.color} !important;
        text-decoration: none !important;
        cursor: default !important;
        font-weight: inherit !important;
        font-style: inherit !important;
        background-color: transparent !important;
      }

      /* Footnotes as plain text */
      .epub-continuous-content sup a,
      .epub-continuous-content .footnote,
      .epub-continuous-content [role="doc-noteref"],
      .epub-continuous-content [epub\\:type="noteref"] {
        color: ${themeColors.color} !important;
        text-decoration: none !important;
        cursor: default !important;
        font-size: inherit !important;
        vertical-align: baseline !important;
      }

      /* Images */
      .epub-continuous-content img {
        max-width: 100%;
        height: auto;
        margin: 1em 0;
        border-radius: 4px;
        opacity: ${theme === 'dark' ? '0.9' : '1'};
      }

      /* Tables */
      .epub-continuous-content table {
        border-collapse: collapse;
        width: 100%;
        margin: 1.5em 0;
      }

      .epub-continuous-content th,
      .epub-continuous-content td {
        border: 1px solid ${themeColors.border};
        padding: 0.75em;
        text-align: left;
      }

      .epub-continuous-content th {
        background-color: ${theme === 'dark' ? '#1f2937' : '#f9fafb'};
        font-weight: 600;
      }

      /* Selection */
      .epub-continuous-content ::selection {
        background: ${theme === 'dark' ? 'rgba(64, 156, 255, 0.3)' : 'rgba(0, 113, 227, 0.15)'};
        color: ${themeColors.color};
      }

      /* Horizontal rules */
      .epub-continuous-content hr {
        border: none;
        border-top: 1px solid ${themeColors.border};
        margin: 2em 0;
      }

      /* Drop caps for elegant typography */
      .epub-chapter p:first-of-type:first-letter {
        font-size: 4em;
        float: left;
        line-height: 0.75;
        margin: 0.05em 0.15em 0 0;
        font-weight: 400;
        color: ${theme === 'dark' ? '#d4af37' : '#8b4513'};
        font-family: "Crimson Text", "Georgia", serif;
        text-shadow: ${theme === 'dark' ? '0 0 8px rgba(212, 175, 55, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'};
      }
    `;

    // Apply or update styles
    let styleEl = document.getElementById('epub-renderer-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'epub-renderer-styles';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = styles;

    // Update theme attribute
    const content = this.container.querySelector('.epub-continuous-content');
    if (content) {
      content.setAttribute('data-theme', theme);
    }
  }

  // Navigation methods
  jumpToChapter(href: string): void {
    const chapter = this.container.querySelector(`[data-chapter-href="${href}"]`);
    if (chapter) {
      chapter.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Callbacks
  onProgress(callback: (progress: number) => void): void {
    this.onProgressCallback = callback;
  }

  onChapterChange(callback: (title: string) => void): void {
    this.onChapterCallback = callback;
  }

  // Getters
  getTableOfContents(): TocItem[] {
    return this.toc;
  }

  getCurrentChapter(): string {
    // Return current chapter based on scroll position
    const scrollTop = this.container.scrollTop;
    const viewportHeight = this.container.clientHeight;
    const midPoint = scrollTop + viewportHeight / 2;

    const chapters = this.container.querySelectorAll('.epub-chapter');
    
    for (const chapter of chapters) {
      const rect = (chapter as HTMLElement).getBoundingClientRect();
      const chapterTop = scrollTop + rect.top;
      const chapterBottom = chapterTop + rect.height;

      if (midPoint >= chapterTop && midPoint <= chapterBottom) {
        const index = parseInt((chapter as HTMLElement).getAttribute('data-chapter-index') || '0');
        this.currentChapterIndex = index;
        return this.chapters[index]?.title || '';
      }
    }

    return '';
  }

  // Navigation methods
  nextPage(): void {
    const container = this.container;
    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    const newScrollTop = Math.min(scrollTop + viewportHeight * 0.9, container.scrollHeight - viewportHeight);
    
    container.scrollTo({ top: newScrollTop, behavior: 'smooth' });
  }

  previousPage(): void {
    const container = this.container;
    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    const newScrollTop = Math.max(scrollTop - viewportHeight * 0.9, 0);
    
    container.scrollTo({ top: newScrollTop, behavior: 'smooth' });
  }

  nextChapter(): void {
    if (this.currentChapterIndex < this.chapters.length - 1) {
      const nextChapter = this.chapters[this.currentChapterIndex + 1];
      if (nextChapter) {
        this.jumpToChapter(nextChapter.href);
      }
    }
  }

  previousChapter(): void {
    if (this.currentChapterIndex > 0) {
      const prevChapter = this.chapters[this.currentChapterIndex - 1];
      if (prevChapter) {
        this.jumpToChapter(prevChapter.href);
      }
    }
  }

  destroy(): void {
    // Clean up
    const styleEl = document.getElementById('epub-renderer-styles');
    if (styleEl) {
      styleEl.remove();
    }
  }

  // Get current position info
  getCurrentPosition(): { chapterIndex: number; totalChapters: number; canGoNext: boolean; canGoPrev: boolean } {
    return {
      chapterIndex: this.currentChapterIndex,
      totalChapters: this.chapters.length,
      canGoNext: this.currentChapterIndex < this.chapters.length - 1,
      canGoPrev: this.currentChapterIndex > 0
    };
  }
}