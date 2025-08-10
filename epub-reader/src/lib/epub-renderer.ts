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

interface SavedAnnotation {
  id: string;
  location: string;
  content: string;
  color: string;
  annotation_type: 'highlight' | 'note' | 'bookmark';
  note?: string;
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
  private _imageObjectUrls: Set<string> = new Set();
  private savedAnnotations: SavedAnnotation[] = [];
  private highlightedRanges: Map<string, Range> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupScrollListener();
    this.setupTextSelectionListener();
  }

  async loadBook(file: File): Promise<{ title?: string; author?: string }> {
    try {
      // Use epub.js with proper resource handling
      const mod = await import("epubjs");
      const EpubCtor = mod?.default ?? mod;
      
      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      this.book = new (EpubCtor as any)(arrayBuffer, {
        replacements: "blobUrl" // Enable blob URL generation for images
      });

      // Wait for book to be ready
      await this.book.ready;
      
      // Load resources safely
      try {
        await this.book.loaded.resources;
      } catch (resourceError: any) {
        // Resources loading is optional, continue without them
      }

      // Extract metadata
      const metadata = await this.book.loaded.metadata;
      const title = metadata?.title;
      const author = metadata?.creator || metadata?.author;

      // Extract table of contents
      await this.extractTableOfContents();
      
      // Extract all chapters as HTML
      await this.extractChapters();
      
      // Render as single continuous document
      await this.renderContinuousContent();
      
      // Apply initial theme
      this.applyTheme(this.currentTheme);
      
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
    } catch (error) {
      this.toc = [];
    }
  }

  private async extractChapters(): Promise<void> {
    const spine = this.book.spine;
    
    this.chapters = await Promise.all(
      spine.spineItems.map(async (item: any, index: number) => {
        try {
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

  private async renderContinuousContent(): Promise<void> {
    // Create main content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'epub-continuous-content';
    contentWrapper.setAttribute('data-theme', this.currentTheme);
    
    for (const [index, chapter] of this.chapters.entries()) {
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
      bodyContent = await this.processImages(bodyContent, chapter.href);
      
      // Check for existing chapter headings
      const firstHeadingMatch = bodyContent.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
      const firstHeadingText = firstHeadingMatch && firstHeadingMatch[1] ? 
        firstHeadingMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      
      // Normalize titles for comparison
      const normalizeTitle = (title: string) => {
        return title.toLowerCase()
          .replace(/chapter\s+\d+[:.\s-]*/i, '') // Remove "Chapter X:" prefixes
          .replace(/^\d+[:.\s-]+/, '') // Remove number prefixes like "1. " or "01 - "
          .replace(/[^\w\s]/g, '') // Remove punctuation
          .trim();
      };
      
      const chapterTitleNorm = chapter.title ? normalizeTitle(chapter.title) : '';
      const headingTextNorm = normalizeTitle(firstHeadingText);
      
      // Only add chapter title if:
      // 1. There's no heading at all, OR
      // 2. The existing heading is substantially different
      const shouldAddTitle = chapter.title && (
        !firstHeadingMatch || // No heading found
        (headingTextNorm && // There is a heading but...
         headingTextNorm !== chapterTitleNorm && // It's different
         !headingTextNorm.includes(chapterTitleNorm) && // Doesn't contain chapter title
         !chapterTitleNorm.includes(headingTextNorm) && // Chapter title doesn't contain it
         headingTextNorm.length < 3) // Or it's too short (like just a number)
      );
      
      if (shouldAddTitle) {
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
    }

    // Clear container and add continuous content
    this.container.innerHTML = '';
    this.container.appendChild(contentWrapper);
    
    // Post-process images in DOM as a fallback
    await this.postProcessImagesInDOM();
  }

  private async postProcessImagesInDOM(): Promise<void> {
    const images = this.container.querySelectorAll('img');
    const imagePromises: Promise<void>[] = [];
    
    for (const img of images) {
      const src = img.getAttribute('src');
      
      // Skip if already processed or is a valid URL
      if (!src || src.startsWith('blob:') || src.startsWith('data:') || 
          src.startsWith('http://') || src.startsWith('https://')) {
        continue;
      }
      
      // Find the chapter this image belongs to
      let chapterElement = img.closest('.epub-chapter');
      let chapterHref = '';
      if (chapterElement) {
        chapterHref = chapterElement.getAttribute('data-chapter-href') || '';
      }
      
      const promise = this.createImageUrl(src, chapterHref).then(blobUrl => {
        if (blobUrl) {
          img.setAttribute('src', blobUrl);
        } else {
          // Use placeholder
          img.setAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
          img.style.opacity = '0';
        }
      }).catch(error => {
        img.setAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        img.style.opacity = '0';
      });
      
      imagePromises.push(promise);
    }
    
    await Promise.all(imagePromises);
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

  private async processImages(html: string, chapterHref: string): Promise<string> {
    // Process images using improved path resolution
    const imgPatterns = [
      /<img([^>]*?)src\s*=\s*["']([^"']+)["']([^>]*?)>/gi,
      /<img([^>]*?)src\s*=\s*([^\s>]+)([^>]*?)>/gi,
      /<image([^>]*?)xlink:href\s*=\s*["']([^"']+)["']([^>]*?)>/gi
    ];
    
    const imageSrcs = new Set<string>();
    
    // Find all images with all patterns
    for (const pattern of imgPatterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex
      while ((match = pattern.exec(html)) !== null) {
        const src = match[2];
        if (src && !src.startsWith('data:') && !src.startsWith('http://') && 
            !src.startsWith('https://') && !src.startsWith('blob:')) {
          imageSrcs.add(src);
        }
      }
    }
    
    if (imageSrcs.size === 0) {
      return html;
    }
    
    // Create a map of original src to blob URL
    const imageMap = new Map<string, string>();
    
    // Process all unique images in parallel for better performance
    const imagePromises = Array.from(imageSrcs).map(async (src) => {
      try {
        const imageUrl = await this.createImageUrl(src, chapterHref);
        if (imageUrl) {
          imageMap.set(src, imageUrl);
        } else {
          // Use a transparent 1x1 placeholder
          imageMap.set(src, 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        }
      } catch (error) {
        // Use placeholder on error
        imageMap.set(src, 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
      }
    });
    
    await Promise.all(imagePromises);
    
    // Replace all image srcs in the HTML
    let processedHtml = html;
    
    // Replace img tags with quotes
    processedHtml = processedHtml.replace(/<img([^>]*?)src\s*=\s*["']([^"']+)["']([^>]*?)>/gi, 
      (fullMatch, attrs1, src, attrs2) => {
        const newSrc = imageMap.get(src);
        if (newSrc) {
          return `<img${attrs1}src="${newSrc}"${attrs2}>`;
        }
        return fullMatch;
      });
    
    // Also handle img tags without quotes
    processedHtml = processedHtml.replace(/<img([^>]*?)src\s*=\s*([^\s>]+)([^>]*?)>/gi, 
      (fullMatch, attrs1, src, attrs2) => {
        // Skip if already a blob/data URL
        if (src.startsWith('data:') || src.startsWith('blob:') || 
            src.startsWith('http://') || src.startsWith('https://')) {
          return fullMatch;
        }
        const newSrc = imageMap.get(src);
        if (newSrc) {
          return `<img${attrs1}src="${newSrc}"${attrs2}>`;
        }
        return fullMatch;
      });
    
    return processedHtml;
  }
  
  private async createImageUrl(src: string, chapterHref: string): Promise<string | null> {
    try {
      if (!this.book?.archive?.zip?.files) {
        return null;
      }

      // Clean and normalize the source path
      let resolvedSrc = src.replace(/^["']|["']$/g, '').trim();
      
      // Build comprehensive list of paths to try
      const pathsToTry = new Set<string>();
      
      // Add original path
      pathsToTry.add(resolvedSrc);
      
      // Handle relative paths
      if (resolvedSrc.startsWith('../')) {
        // Resolve relative to chapter location
        const chapterDir = chapterHref.substring(0, chapterHref.lastIndexOf('/'));
        const parentDir = chapterDir.substring(0, chapterDir.lastIndexOf('/'));
        const resolved = resolvedSrc.replace(/^\.\.\//, '');
        
        pathsToTry.add(resolved);
        if (parentDir) {
          pathsToTry.add(`${parentDir}/${resolved}`);
        }
      }
      
      // Handle absolute paths
      if (resolvedSrc.startsWith('/')) {
        pathsToTry.add(resolvedSrc.substring(1));
      }
      
      // Try common EPUB directory structures
      const filename = resolvedSrc.split('/').pop();
      if (filename) {
        // Common image directories
        const imageDirectories = ['images', 'Images', 'image', 'Image', 'assets', 'Assets', 'media', 'Media', 'OEBPS/images', 'OEBPS/Images'];
        for (const dir of imageDirectories) {
          pathsToTry.add(`${dir}/${filename}`);
        }
        // Also try just the filename
        pathsToTry.add(filename);
      }
      
      // Search for the image in the ZIP archive
      const zipFiles = this.book.archive.zip.files;
      const zipFilePaths = Object.keys(zipFiles);
      
      // Try exact matches first
      for (const pathToTry of pathsToTry) {
        if (zipFiles[pathToTry]) {
          try {
            const blob = await zipFiles[pathToTry].async('blob');
            const url = URL.createObjectURL(blob);
            this._imageObjectUrls.add(url);
            return url;
          } catch (e) {
            // Continue to next path
          }
        }
      }
      
      // Try case-insensitive and partial matches
      for (const pathToTry of pathsToTry) {
        const lowerPath = pathToTry.toLowerCase();
        for (const zipPath of zipFilePaths) {
          if (zipPath.toLowerCase() === lowerPath || 
              zipPath.toLowerCase().endsWith('/' + lowerPath) ||
              (filename && zipPath.toLowerCase().endsWith('/' + filename.toLowerCase()))) {
            try {
              const blob = await zipFiles[zipPath].async('blob');
              const url = URL.createObjectURL(blob);
              this._imageObjectUrls.add(url);
              return url;
            } catch (e) {
              // Continue to next match
            }
          }
        }
      }
      
      // Fallback to epub.js resource methods if available
      if (this.book.resources) {
        try {
          // Try epub.js built-in resolution
          if (this.book.resources.createUrl) {
            const url = await this.book.resources.createUrl(resolvedSrc);
            if (url) return url;
          }
          
          // Try getting from resources
          if (this.book.resources.get) {
            const resource = this.book.resources.get(resolvedSrc);
            if (resource?.url) return resource.url;
          }
        } catch (e) {
          // Fallback failed
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // Legacy image processing methods removed - now using Resources API

  private setupScrollListener(): void {
    let ticking = false;
    
    this.handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.updateProgress();
          this.updateCurrentChapter();
          ticking = false;
        });
        ticking = true;
      }
    };

    this.container.addEventListener('scroll', this.handleScroll as EventListener, { passive: true });
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

      /* Highlight styles */
      .epub-highlight {
        transition: all 0.3s ease;
        border-radius: 2px;
        padding: 0 2px;
      }

      .epub-highlight:hover {
        filter: brightness(1.2);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      /* Pulse animation for navigation */
      @keyframes highlightPulse {
        0%, 100% {
          box-shadow: 0 0 0 0 rgba(251, 191, 36, 0);
          transform: scale(1);
        }
        25% {
          box-shadow: 0 0 0 6px rgba(251, 191, 36, 0.3);
          transform: scale(1.02);
        }
        50% {
          box-shadow: 0 0 0 12px rgba(251, 191, 36, 0);
          transform: scale(1);
        }
      }

      .epub-highlight-pulse {
        animation: highlightPulse 2s ease-in-out;
        position: relative;
        z-index: 10;
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
    // Clean up all event listeners
    this.container.removeEventListener('scroll', this.handleScroll);
    this.container.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('selectionchange', this.handleSelectionChange);
    
    // Clean up style
    const styleEl = document.getElementById('epub-renderer-styles');
    if (styleEl) {
      styleEl.remove();
    }

    // Revoke ALL object URLs we created
    if (this._imageObjectUrls.size > 0) {
      for (const url of this._imageObjectUrls) {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // Silent fail for already revoked URLs
        }
      }
      this._imageObjectUrls.clear();
    }
    
    // Also clean up any blob URLs that might be in the DOM
    const images = this.container.querySelectorAll('img[src^="blob:"]');
    for (const img of images) {
      const src = img.getAttribute('src');
      if (src && src.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(src);
        } catch (e) {
          // Silent fail for already revoked URLs
        }
      }
    }
    
    // Clear references to prevent memory leaks
    this.book = null;
    this.chapters = [];
    this.toc = [];
    this.savedAnnotations = [];
    this.highlightedRanges.clear();
    this.onProgressCallback = undefined;
    this.onChapterCallback = undefined;
    this.onTextSelectCallback = undefined;
    
    // Clear container content
    this.container.innerHTML = '';
  }
  
  // Store references to event handlers for cleanup
  private handleScroll?: EventListener;
  private handleMouseUp?: EventListener;
  private handleSelectionChange?: EventListener;

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

  // Navigate to a CFI location with highlighting
  displayCfi(cfi: string, highlightId?: string): boolean {
    try {
      if (!cfi) return false;
      
      // First, try to find and highlight the annotation if ID provided
      if (highlightId) {
        const highlightEl = this.container.querySelector(`[data-annotation-id="${highlightId}"]`) as HTMLElement;
        if (highlightEl) {
          // Scroll to highlight
          highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Add pulse animation
          highlightEl.classList.add('epub-highlight-pulse');
          setTimeout(() => {
            highlightEl.classList.remove('epub-highlight-pulse');
          }, 2000);
          
          return true;
        }
      }
      
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
        const locationParts = parts[0] ? parts[0].split('/') : [];
        
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

  // Navigate to an annotation
  navigateToAnnotation(annotationId: string): boolean {
    const annotation = this.savedAnnotations.find(a => a.id === annotationId);
    if (!annotation) return false;
    
    // First try to find the highlight element
    const highlightEl = this.container.querySelector(`[data-annotation-id="${annotationId}"]`) as HTMLElement;
    if (highlightEl) {
      highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add pulse animation
      highlightEl.classList.add('epub-highlight-pulse');
      setTimeout(() => {
        highlightEl.classList.remove('epub-highlight-pulse');
      }, 2000);
      
      return true;
    }
    
    // Fallback to CFI navigation
    return this.displayCfi(annotation.location, annotationId);
  }

  // Get node path for CFI generation
  private getNodePath(node: Node, root: Element): string {
    const path: number[] = [];
    let current: Node | null = node;
    
    while (current && current !== root) {
      const parentNode = (current as Node).parentNode as (Node & ParentNode) | null;
      if (parentNode) {
        const siblings = Array.from(parentNode.childNodes);
        const index = siblings.indexOf(current as ChildNode);
        path.unshift(index);
      }
      current = parentNode;
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
    
    // Store selection change handler
    this.handleSelectionChange = () => {
      if (selectionTimeout) {
        clearTimeout(selectionTimeout);
      }
      
      selectionTimeout = setTimeout(handleSelection, 500);
    };
    
    // Store mouseup handler
    this.handleMouseUp = () => {
      setTimeout(handleSelection, 100);
    };
    
    // Listen for selection changes
    document.addEventListener('selectionchange', this.handleSelectionChange as EventListener);
    
    // Also handle mouseup for immediate selection
    this.container.addEventListener('mouseup', this.handleMouseUp as EventListener);
  }

  // Callback for text selection
  onTextSelect(callback: (text: string, cfi: string) => void): void {
    this.onTextSelectCallback = callback;
  }

  // Get current CFI
  getCurrentCfi(): string {
    return this.generateCfi();
  }

  // Load saved annotations
  loadAnnotations(annotations: SavedAnnotation[]): void {
    this.savedAnnotations = annotations;
    this.applyHighlights();
  }

  // Apply highlights to the rendered content
  private applyHighlights(): void {
    // Clear existing highlights first
    this.clearHighlights();
    
    // Filter for highlights and notes (not bookmarks)
    const highlightAnnotations = this.savedAnnotations.filter(
      a => a.annotation_type === 'highlight' || a.annotation_type === 'note'
    );
    
    for (const annotation of highlightAnnotations) {
      this.applyHighlight(annotation);
    }
  }

  // Clear all highlights
  private clearHighlights(): void {
    // Remove all highlight spans
    const highlights = this.container.querySelectorAll('.epub-highlight');
    highlights.forEach(el => {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent?.insertBefore(el.firstChild, el);
      }
      parent?.removeChild(el);
    });
    
    this.highlightedRanges.clear();
  }

  // Apply a single highlight
  private applyHighlight(annotation: SavedAnnotation): void {
    try {
      // Try to find the text in the document
      const searchText = annotation.content;
      if (!searchText) return;
      
      // Use the CFI if available to narrow down search
      const range = this.findTextInDocument(searchText, annotation.location);
      if (!range) return;
      
      // Create highlight span
      const highlightSpan = document.createElement('span');
      highlightSpan.className = 'epub-highlight';
      highlightSpan.dataset.annotationId = annotation.id;
      highlightSpan.style.backgroundColor = annotation.color || 'rgba(251, 191, 36, 0.3)';
      highlightSpan.style.cursor = 'pointer';
      highlightSpan.title = annotation.note || 'Click to view annotation';
      
      // Add click handler
      highlightSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onHighlightClick(annotation);
      });
      
      // Wrap the range content in highlight span
      try {
        range.surroundContents(highlightSpan);
        this.highlightedRanges.set(annotation.id, range);
      } catch (e) {
        // If surroundContents fails (e.g., range spans multiple elements),
        // extract and wrap the contents manually
        const contents = range.extractContents();
        highlightSpan.appendChild(contents);
        range.insertNode(highlightSpan);
        this.highlightedRanges.set(annotation.id, range);
      }
    } catch (error) {
      console.warn('Failed to apply highlight:', error);
    }
  }

  // Find text in document with better duplicate handling
  private findTextInDocument(searchText: string, cfi?: string): Range | null {
    try {
      // Priority 1: If we have a valid CFI, try to use it first
      if (cfi && cfi.includes('/')) {
        const range = this.getRangeFromCfi(cfi);
        if (range) {
          const rangeText = range.toString().trim();
          // Check if the range text matches or contains our search text
          if (rangeText === searchText.trim() || rangeText.includes(searchText.trim())) {
            return range;
          }
        }
      }
      
      // Priority 2: Try to find text in the specific chapter from CFI
      if (cfi) {
        // Extract chapter info from CFI to narrow search
        const cfiParts = cfi.split('/');
        if (cfiParts.length >= 2) {
          const chapterIndex = cfiParts[0];
          const chapterId = cfiParts[1].split('@')[0]; // Remove position part if present
          
          // Find the chapter element to search within
          const chapter = this.container.querySelector(
            `[data-chapter-index="${chapterIndex}"][data-chapter-id="${chapterId}"]`
          );
          
          if (chapter) {
            // Extract position information if available
            let targetPosition = 0;
            if (cfi.includes('@')) {
              const posMatch = cfi.match(/@([\d.]+)/);
              if (posMatch) {
                targetPosition = parseFloat(posMatch[1]);
              }
            }
            
            // Search within the specific chapter with position awareness
            const matches = this.findAllTextInElement(searchText, chapter as Element);
            
            if (matches.length === 1) {
              return matches[0];
            } else if (matches.length > 1) {
              // Use position to determine which match to use
              if (targetPosition > 0) {
                // Calculate which match based on relative position
                const chapterHeight = (chapter as HTMLElement).offsetHeight;
                for (const match of matches) {
                  const rangeRect = match.getBoundingClientRect();
                  const chapterRect = (chapter as HTMLElement).getBoundingClientRect();
                  const relativeTop = rangeRect.top - chapterRect.top;
                  const relativePosition = relativeTop / chapterHeight;
                  
                  // Check if this match is close to the target position
                  if (Math.abs(relativePosition - targetPosition) < 0.1) {
                    return match;
                  }
                }
              }
              // If no position match, return the first one in this chapter
              return matches[0];
            }
          }
        }
      }
      
      // Priority 3: Fallback to searching in all chapters, but track which chapter each match is in
      const matches: { range: Range; chapterIndex: number; relativePosition: number }[] = [];
      const chapters = this.container.querySelectorAll('.epub-chapter');
      
      for (const chapter of chapters) {
        const chapterIndex = parseInt((chapter as HTMLElement).getAttribute('data-chapter-index') || '0');
        const chapterMatches = this.findAllTextInElement(searchText, chapter as Element);
        
        for (const range of chapterMatches) {
          const rangeRect = range.getBoundingClientRect();
          const chapterRect = (chapter as HTMLElement).getBoundingClientRect();
          const relativePosition = (rangeRect.top - chapterRect.top) / (chapter as HTMLElement).offsetHeight;
          
          matches.push({ range, chapterIndex, relativePosition });
        }
      }
      
      // Return the best match based on available information
      if (matches.length === 1) {
        return matches[0].range;
      } else if (matches.length > 1 && cfi) {
        // Try to use any available position information from CFI
        if (cfi.includes('@')) {
          const posMatch = cfi.match(/@([\d.]+)/);
          if (posMatch) {
            const targetPos = parseFloat(posMatch[1]);
            // Find the match closest to the target position
            let bestMatch = matches[0];
            let bestDiff = Math.abs(matches[0].relativePosition - targetPos);
            
            for (const match of matches) {
              const diff = Math.abs(match.relativePosition - targetPos);
              if (diff < bestDiff) {
                bestMatch = match;
                bestDiff = diff;
              }
            }
            return bestMatch.range;
          }
        }
        
        // Try to extract chapter index from CFI
        const cfiParts = cfi.split('/');
        if (cfiParts.length > 0) {
          const targetChapter = parseInt(cfiParts[0]);
          if (!isNaN(targetChapter)) {
            // Find matches in the target chapter
            const chapterMatches = matches.filter(m => m.chapterIndex === targetChapter);
            if (chapterMatches.length > 0) {
              return chapterMatches[0].range;
            }
          }
        }
      }
      
      // Default to first match if we have any
      return matches.length > 0 ? matches[0].range : null;
    } catch (error) {
      return null;
    }
  }
  
  // Helper method to find all text occurrences in an element
  private findAllTextInElement(searchText: string, element: Element): Range[] {
    const matches: Range[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node: Node | null;
    while (node = walker.nextNode()) {
      const text = node.textContent || '';
      let index = text.indexOf(searchText);
      
      while (index !== -1) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + searchText.length);
        matches.push(range);
        
        // Look for next occurrence in the same node
        index = text.indexOf(searchText, index + 1);
      }
    }
    
    return matches;
  }

  // Helper method to search within a specific element
  private searchTextInElement(searchText: string, element: Element): Range | null {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node: Node | null;
    while (node = walker.nextNode()) {
      const text = node.textContent || '';
      const index = text.indexOf(searchText);
      
      if (index !== -1) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + searchText.length);
        return range;
      }
    }
    
    return null;
  }

  // Get range from CFI
  private getRangeFromCfi(cfi: string): Range | null {
    try {
      // Parse our custom CFI format
      if (cfi.includes('/')) {
        const parts = cfi.split('@')[0].split('/');
        if (parts.length >= 3) {
          const chapterIndex = parts[0];
          const chapterId = parts[1];
          const pathAndOffsets = parts.slice(2).join('/');
          
          // Find the chapter element
          const chapter = this.container.querySelector(
            `[data-chapter-index="${chapterIndex}"][data-chapter-id="${chapterId}"]`
          );
          
          if (chapter && pathAndOffsets.includes(':')) {
            // Parse path and offsets
            const [startPath, endPath] = pathAndOffsets.split('-');
            const [startNodePath, startOffset] = startPath.split(':');
            const [endNodePath, endOffset] = endPath ? endPath.split(':') : [startNodePath, startOffset];
            
            // Navigate to the text nodes
            const startNode = this.getNodeFromPath(startNodePath, chapter as Element);
            const endNode = this.getNodeFromPath(endNodePath, chapter as Element);
            
            if (startNode && endNode) {
              const range = document.createRange();
              range.setStart(startNode, parseInt(startOffset));
              range.setEnd(endNode, parseInt(endOffset));
              return range;
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error parsing CFI:', error);
    }
    return null;
  }

  // Get node from path string
  private getNodeFromPath(path: string, root: Element): Node | null {
    try {
      const indices = path.split('/').map(n => parseInt(n));
      let current: Node = root;
      
      for (const index of indices) {
        if (current.childNodes[index]) {
          current = current.childNodes[index];
        } else {
          return null;
        }
      }
      
      return current;
    } catch {
      return null;
    }
  }

  // Handle highlight click
  private onHighlightClick(annotation: SavedAnnotation): void {
    // Dispatch custom event that the reader page can listen to
    const event = new CustomEvent('annotationClick', {
      detail: annotation,
      bubbles: true
    });
    this.container.dispatchEvent(event);
  }

  // Add new annotation (for when user creates one)
  addAnnotation(annotation: SavedAnnotation): void {
    this.savedAnnotations.push(annotation);
    this.applyHighlight(annotation);
  }

  // Remove annotation
  removeAnnotation(annotationId: string): void {
    this.savedAnnotations = this.savedAnnotations.filter(a => a.id !== annotationId);
    
    // Remove the highlight span
    const highlightEl = this.container.querySelector(`[data-annotation-id="${annotationId}"]`);
    if (highlightEl) {
      const parent = highlightEl.parentNode;
      while (highlightEl.firstChild) {
        parent?.insertBefore(highlightEl.firstChild, highlightEl);
      }
      parent?.removeChild(highlightEl);
    }
    
    this.highlightedRanges.delete(annotationId);
  }
}
