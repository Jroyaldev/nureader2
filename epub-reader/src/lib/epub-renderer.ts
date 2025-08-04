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
  private onTextSelectCallback?: (text: string, cfi: string) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupScrollListener();
    this.setupTextSelectionListener();
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
      
      // Process images to fix relative URLs
      bodyContent = this.processImages(bodyContent, chapter.href);
      
      // Check if content already has a chapter heading
      const hasH1 = /<h1[^>]*>/i.test(bodyContent);
      const hasH2 = /<h2[^>]*>/i.test(bodyContent);
      const firstHeadingMatch = bodyContent.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
      const firstHeadingText = firstHeadingMatch ? firstHeadingMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      
      // Only add chapter title if:
      // 1. There's no h1 or h2, OR
      // 2. The existing heading doesn't match the chapter title
      if (chapter.title && !hasH1 && !hasH2) {
        bodyContent = `<h2 class="chapter-title">${chapter.title}</h2>${bodyContent}`;
      } else if (chapter.title && firstHeadingText && 
                 firstHeadingText.toLowerCase() !== chapter.title.toLowerCase() &&
                 !chapter.title.toLowerCase().includes(firstHeadingText.toLowerCase()) &&
                 !firstHeadingText.toLowerCase().includes(chapter.title.toLowerCase())) {
        // If the heading exists but doesn't match the TOC title, prepend the TOC title
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
    
    // Process all images after rendering
    this.processAllImages();
    
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

  private processImages(html: string, chapterHref: string): string {
    // Mark images that need processing with chapter href
    return html.replace(/<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi, (match, attrs1, src, attrs2) => {
      // If it's already a data URL or absolute URL, leave it as is
      if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
        return match;
      }
      
      // Add data attributes for later processing
      return `<img${attrs1} src="${src}" data-chapter-href="${chapterHref}" data-needs-processing="true"${attrs2}>`;
    });
  }

  private async processAllImages(): Promise<void> {
    const images = this.container.querySelectorAll('img[data-needs-processing="true"]');
    console.log(`🖼️ Processing ${images.length} images...`);
    
    for (const img of images) {
      const imgElement = img as HTMLImageElement;
      const src = imgElement.getAttribute('src');
      const chapterHref = imgElement.getAttribute('data-chapter-href');
      
      if (!src || !chapterHref) continue;
      
      try {
        // Resolve the image path relative to the chapter
        const resolvedSrc = this.book.resolve(src, chapterHref);
        
        // Get the blob URL from the EPUB archive
        const blobUrl = await this.book.archive.getUrl(resolvedSrc);
        
        // Update the image src
        imgElement.src = blobUrl;
        imgElement.removeAttribute('data-needs-processing');
        
        // Add loading and error handlers
        imgElement.onload = () => {
          console.log(`✅ Image loaded: ${src}`);
        };
        
        imgElement.onerror = () => {
          console.warn(`❌ Failed to load image: ${src}`);
          // Try alternative approaches
          this.tryAlternativeImageLoad(imgElement, src, chapterHref);
        };
      } catch (error) {
        console.warn(`Failed to process image: ${src}`, error);
        // Try alternative approaches
        this.tryAlternativeImageLoad(imgElement, src, chapterHref);
      }
    }
  }

  private async tryAlternativeImageLoad(img: HTMLImageElement, src: string, chapterHref: string): Promise<void> {
    try {
      // Try to get the image as a data URL
      const resolvedSrc = this.book.resolve(src, chapterHref);
      const blob = await this.book.archive.getBlob(resolvedSrc);
      
      if (blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            img.src = e.target.result as string;
            console.log(`✅ Image loaded as data URL: ${src}`);
          }
        };
        reader.readAsDataURL(blob);
      }
    } catch (error) {
      console.error(`Failed alternative image load: ${src}`, error);
      // Set a placeholder or hide the image
      img.style.display = 'none';
    }
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
        margin: 2em auto;
        display: block;
        border-radius: 4px;
        opacity: ${theme === 'dark' ? '0.9' : '1'};
        box-shadow: ${theme === 'dark' 
          ? '0 4px 12px rgba(0, 0, 0, 0.4)' 
          : '0 4px 12px rgba(0, 0, 0, 0.1)'};
      }
      
      .epub-continuous-content figure {
        margin: 2em 0;
        text-align: center;
      }
      
      .epub-continuous-content figure img {
        margin: 0 auto 1em;
      }
      
      .epub-continuous-content figcaption {
        font-size: 0.9em;
        color: ${themeColors.muted};
        font-style: italic;
        margin-top: 0.5em;
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

  // Generate CFI-like identifier for current position or selection
  generateCfi(range?: Range): string {
    try {
      const scrollTop = this.container.scrollTop;
      const viewportHeight = this.container.clientHeight;
      
      if (range) {
        // Generate CFI for a specific text selection
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;
        const startOffset = range.startOffset;
        const endOffset = range.endOffset;
        
        // Find the chapter element
        let chapterElement = startContainer.parentElement;
        while (chapterElement && !chapterElement.classList.contains('epub-chapter')) {
          chapterElement = chapterElement.parentElement;
        }
        
        if (!chapterElement) return '';
        
        const chapterIndex = chapterElement.getAttribute('data-chapter-index') || '0';
        const chapterId = chapterElement.getAttribute('data-chapter-id') || '';
        
        // Create a unique path to the text node
        const path = this.getNodePath(startContainer, chapterElement);
        const endPath = startContainer === endContainer ? path : this.getNodePath(endContainer, chapterElement);
        
        // Format: chapterIndex/chapterId/path:startOffset-endPath:endOffset@scrollTop
        return `${chapterIndex}/${chapterId}/${path}:${startOffset}-${endPath}:${endOffset}@${scrollTop}`;
      } else {
        // Generate CFI for current reading position
        const midPoint = scrollTop + viewportHeight / 2;
        const chapters = this.container.querySelectorAll('.epub-chapter');
        
        for (const chapter of chapters) {
          const rect = (chapter as HTMLElement).getBoundingClientRect();
          const chapterTop = scrollTop + rect.top;
          const chapterBottom = chapterTop + rect.height;
          
          if (midPoint >= chapterTop && midPoint <= chapterBottom) {
            const chapterIndex = (chapter as HTMLElement).getAttribute('data-chapter-index') || '0';
            const chapterId = (chapter as HTMLElement).getAttribute('data-chapter-id') || '';
            const relativePosition = (midPoint - chapterTop) / rect.height;
            
            // Format: chapterIndex/chapterId@relativePosition
            return `${chapterIndex}/${chapterId}@${relativePosition.toFixed(4)}`;
          }
        }
      }
      
      // Fallback to simple scroll position
      return `@${scrollTop}`;
    } catch (error) {
      console.error('Error generating CFI:', error);
      return '';
    }
  }

  // Navigate to a CFI location
  displayCfi(cfi: string): boolean {
    try {
      if (!cfi) return false;
      
      // Parse CFI format
      if (cfi.startsWith('@')) {
        // Simple scroll position
        const scrollTop = parseFloat(cfi.substring(1));
        if (!isNaN(scrollTop)) {
          this.container.scrollTo({ top: scrollTop, behavior: 'smooth' });
          return true;
        }
      } else {
        // Parse chapter-based CFI
        const parts = cfi.split('@');
        const locationParts = parts[0].split('/');
        
        if (locationParts.length >= 2) {
          const chapterIndex = locationParts[0];
          const chapterId = locationParts[1];
          
          // Find the chapter
          const chapter = this.container.querySelector(
            `[data-chapter-index="${chapterIndex}"][data-chapter-id="${chapterId}"]`
          ) as HTMLElement;
          
          if (chapter) {
            const rect = chapter.getBoundingClientRect();
            const chapterTop = this.container.scrollTop + rect.top;
            
            if (parts[1]) {
              // Has relative position
              const relativePosition = parseFloat(parts[1]);
              if (!isNaN(relativePosition)) {
                const targetScroll = chapterTop + (rect.height * relativePosition) - (this.container.clientHeight / 2);
                this.container.scrollTo({ top: targetScroll, behavior: 'smooth' });
                return true;
              }
            } else {
              // Just scroll to chapter
              chapter.scrollIntoView({ behavior: 'smooth', block: 'start' });
              return true;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error displaying CFI:', error);
    }
    
    return false;
  }

  // Get node path for CFI generation
  private getNodePath(node: Node, root: Element): string {
    const path: number[] = [];
    let current: Node | null = node;
    
    while (current && current !== root) {
      const parent = current.parentNode;
      if (parent) {
        const siblings = Array.from(parent.childNodes);
        const index = siblings.indexOf(current as ChildNode);
        path.unshift(index);
      }
      current = parent;
    }
    
    return path.join('/');
  }

  // Setup text selection listener
  private setupTextSelectionListener(): void {
    let selectionTimeout: NodeJS.Timeout | null = null;
    
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        return;
      }
      
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString().trim();
      
      // Check if selection is within our container
      if (!this.container.contains(range.commonAncestorContainer)) {
        return;
      }
      
      // Generate CFI for the selection
      const cfi = this.generateCfi(range);
      
      if (this.onTextSelectCallback && selectedText && cfi) {
        this.onTextSelectCallback(selectedText, cfi);
      }
    };
    
    // Listen for selection changes
    document.addEventListener('selectionchange', () => {
      if (selectionTimeout) {
        clearTimeout(selectionTimeout);
      }
      
      selectionTimeout = setTimeout(handleSelection, 500);
    });
    
    // Also handle mouseup for immediate selection
    this.container.addEventListener('mouseup', () => {
      setTimeout(handleSelection, 100);
    });
  }

  // Callback for text selection
  onTextSelect(callback: (text: string, cfi: string) => void): void {
    this.onTextSelectCallback = callback;
  }

  // Get current CFI
  getCurrentCfi(): string {
    return this.generateCfi();
  }
}