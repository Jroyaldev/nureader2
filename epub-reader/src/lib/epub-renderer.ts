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
  private currentTheme: 'light' | 'dark' | 'sepia' | 'night' = 'light';
  private onProgressCallback?: (progress: number) => void;
  private onChapterCallback?: (title: string) => void;
  private currentChapterIndex: number = 0;
  private onTextSelectCallback?: (text: string, cfi: string) => void;
  private _imageObjectUrls: Set<string> = new Set();
  private savedAnnotations: SavedAnnotation[] = [];
  private highlightedRanges: Map<string, Range> = new Map();
  private fontSize: number = 18;
  private _onScroll?: (e: Event) => void;
  private stylesApplied: boolean = false;

  constructor(container: HTMLElement, initialTheme?: 'light' | 'dark' | 'sepia' | 'night') {
    this.container = container;
    // Set initial theme immediately to prevent flash
    if (initialTheme) {
      this.currentTheme = initialTheme;
    } else {
      // Try to detect from document classes and data attributes
      const docEl = document.documentElement;
      if (docEl.classList.contains('night') || docEl.getAttribute('data-theme') === 'night') {
        this.currentTheme = 'night';
      } else if (docEl.classList.contains('sepia') || docEl.getAttribute('data-theme') === 'sepia') {
        this.currentTheme = 'sepia';
      } else if (docEl.classList.contains('dark') || docEl.getAttribute('data-theme') === 'dark') {
        this.currentTheme = 'dark';
      } else {
        this.currentTheme = 'light';
      }
    }
    this.setupScrollListener();
    this.setupTextSelectionListener();
  }

  async loadBook(file: File): Promise<{ title?: string; author?: string }> {
    console.log("📚 EpubRenderer: Loading book", file.name);
    
    try {
      // Use epub.js with proper resource handling
      const mod = await import("epubjs");
      const EpubCtor = mod?.default ?? mod;
      
      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      this.book = new (EpubCtor as any)(arrayBuffer, {
        replacements: "blobUrl", // Enable blob URL generation for images
        requestMethod: async (url: string) => {
          // Custom request method to handle resources
          console.log(`📥 Requesting resource: ${url}`);
          return url;
        }
      });

      // Wait for book to be ready
      await this.book.ready;
      
      // Debug: List all files in the archive
      try {
        if (this.book.archive) {
          console.log("📦 EPUB Archive contents:");
          
          // Try to get the file list from the archive
          if (this.book.archive.zip && this.book.archive.zip.files) {
            const files = Object.keys(this.book.archive.zip.files);
            console.log("📁 Files in EPUB:", files.filter(f => f.includes('image') || f.includes('Image') || f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg')));
          }
        }
        
        // Load resources safely
        try {
          await this.book.loaded.resources;
          console.log("✅ Resources loaded");
        } catch (resourceError: any) {
          console.log("⚠️ Resources loading skipped:", resourceError?.message || resourceError);
        }
      } catch (e) {
        console.warn("⚠️ Could not list archive contents:", e);
      }

      // Extract metadata
      const metadata = await this.book.loaded.metadata;
      const title = metadata?.title;
      const author = metadata?.creator || metadata?.author;

      // Extract table of contents
      await this.extractTableOfContents();
      
      // Extract all chapters as HTML
      await this.extractChapters();
      
      // Apply initial theme BEFORE rendering to prevent flash
      this.applyTheme(this.currentTheme);
      
      // Render as single continuous document
      await this.renderContinuousContent();

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
            id: item.id || item.href,
            index,
            href: item.href,
            content,
            title
          };
        } catch (error) {
          console.warn(`⚠️ EpubRenderer: Failed to load chapter ${index}:`, error);
          return {
            id: item.id || item.href,
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

  private async renderContinuousContent(): Promise<void> {
    console.log("🎨 EpubRenderer: Rendering continuous content...");
    
    // Create main content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'epub-continuous-content';
    contentWrapper.setAttribute('data-theme', this.currentTheme);
    
    // Process chapters in batches for better performance
    const batchSize = 3;
    const totalChapters = this.chapters.length;
    
    // Render first batch immediately for faster initial display
    for (let i = 0; i < Math.min(batchSize, totalChapters); i++) {
      const chapter = this.chapters[i];
      if (chapter) {
        await this.renderChapter(contentWrapper, chapter, i);
      }
    }
    
    // Clear container and add continuous content early
    this.container.innerHTML = '';
    this.container.appendChild(contentWrapper);

    // Re-apply current theme now that content exists to ensure consistent background/text
    try {
      this.applyTheme(this.currentTheme);
    } catch {}
    
    // Render remaining chapters progressively
    if (totalChapters > batchSize) {
      // Use requestIdleCallback for remaining chapters if available
      const renderRemaining = async () => {
        for (let i = batchSize; i < totalChapters; i++) {
          const chapter = this.chapters[i];
          if (chapter) {
            await this.renderChapter(contentWrapper, chapter, i);
          }
        }
        // Post-process images in DOM as a fallback
        await this.postProcessImagesInDOM();
      };
      
      await renderRemaining();
    } else {
      // Post-process images immediately for small books
      await this.postProcessImagesInDOM();
    }
    
    console.log("✅ EpubRenderer: Initial content rendered");
    
    // Check if container is now scrollable after content is added
    setTimeout(() => {
      console.log('📏 After render - Container dimensions:', {
        scrollHeight: this.container.scrollHeight,
        clientHeight: this.container.clientHeight,
        isScrollable: this.container.scrollHeight > this.container.clientHeight,
        computedOverflowY: window.getComputedStyle(this.container).overflowY
      });
    }, 100);
  }
  
  private async renderChapter(contentWrapper: HTMLElement, chapter: ChapterData, index: number): Promise<void> {
    const section = document.createElement('section');
    section.className = 'epub-chapter';
    section.setAttribute('data-chapter-id', chapter.id);
    section.setAttribute('data-chapter-index', String(index));
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
    
    // Check if content already has a chapter heading
    const hasH1 = /<h1[^>]*>/i.test(bodyContent);
    const hasH2 = /<h2[^>]*>/i.test(bodyContent);
    const firstHeadingMatch = bodyContent.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    const firstHeadingText = firstHeadingMatch && firstHeadingMatch[1] ? firstHeadingMatch[1].replace(/<[^>]*>/g, '').trim() : '';
    
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
    // Enhance charts/tables/dropcaps within this section
    this.enhanceRenderedContent(section);
    contentWrapper.appendChild(section);
    
    // Add separator between chapters (except last)
    if (index < this.chapters.length - 1) {
      const separator = document.createElement('div');
      separator.className = 'chapter-separator';
      contentWrapper.appendChild(separator);
    }
  }

  private async postProcessImagesInDOM(): Promise<void> {
    console.log("🔧 Post-processing images in DOM");
    
    const images = this.container.querySelectorAll('img');
    console.log(`📊 Found ${images.length} img elements in DOM`);
    
    const imagePromises: Promise<void>[] = [];
    
    for (const img of images) {
      const src = img.getAttribute('src');
      
      // Skip if already processed or is a valid URL
      if (!src || src.startsWith('blob:') || src.startsWith('data:') || 
          src.startsWith('http://') || src.startsWith('https://')) {
        continue;
      }
      
      console.log(`🔍 Found unprocessed image in DOM: ${src}`);
      
      // Find the chapter this image belongs to
      let chapterElement = img.closest('.epub-chapter');
      let chapterHref = '';
      if (chapterElement) {
        chapterHref = chapterElement.getAttribute('data-chapter-href') || '';
      }
      
      const promise = this.createImageUrl(src, chapterHref).then(blobUrl => {
        if (blobUrl) {
          img.setAttribute('src', blobUrl);
          console.log(`✅ Replaced DOM image ${src} with blob URL`);
        } else {
          // Use placeholder
          img.setAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
          img.style.opacity = '0';
          console.log(`⚠️ Using transparent placeholder for ${src}`);
        }
      }).catch(error => {
        console.error(`❌ Error processing DOM image ${src}:`, error);
        img.setAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        img.style.opacity = '0';
      });
      
      imagePromises.push(promise);
    }
    
    await Promise.all(imagePromises);
    console.log("✅ DOM image post-processing complete");
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
    // Process images using epub.js Resources API
    // More flexible regex to catch all image variations
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
    
    // Process all unique images
    for (const src of imageSrcs) {
      try {
        console.log(`🔄 Processing image: ${src}`);
        const imageUrl = await this.createImageUrl(src, chapterHref);
        
        if (imageUrl) {
          imageMap.set(src, imageUrl);
          console.log(`✅ Created blob URL for ${src}`);
        } else {
          console.log(`⚠️ Could not create blob URL for ${src}, will use placeholder`);
          // Use a transparent 1x1 placeholder
          imageMap.set(src, 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        }
      } catch (error) {
        console.error(`❌ Error processing ${src}:`, error);
        // Use placeholder on error
        imageMap.set(src, 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
      }
    }
    
    // Replace all image srcs in the HTML
    let processedHtml = html;
    
    // Replace img tags
    processedHtml = processedHtml.replace(/<img([^>]*?)src\s*=\s*["']([^"']+)["']([^>]*?)>/gi, 
      (fullMatch, attrs1, src, attrs2) => {
        const newSrc = imageMap.get(src);
        if (newSrc) {
          console.log(`🔄 Replacing ${src} with blob URL in HTML`);
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
          console.log(`🔄 Replacing unquoted ${src} with blob URL in HTML`);
          return `<img${attrs1}src="${newSrc}"${attrs2}>`;
        }
        return fullMatch;
      });
    
    console.log(`✅ Image processing complete for chapter ${chapterHref}`);
    return processedHtml;
  }
  
  private async createImageUrl(src: string, chapterHref: string): Promise<string | null> {
    try {
      // First try to get the image from resources
      if (this.book?.resources) {
        // Try multiple path resolution strategies
        let resolvedSrc = src;
        
        // Remove quotes if present
        resolvedSrc = resolvedSrc.replace(/^["']|["']$/g, '');
        
        // Strategy 1: Try the path as-is (but without quotes)
        let pathsToTry = [resolvedSrc];
        
        // Strategy 2: If it's a relative path, resolve it
        if (resolvedSrc.startsWith('../')) {
          // Remove the ../ and try direct path
          const withoutDotDot = resolvedSrc.replace(/^\.\.\//, '');
          pathsToTry.push(withoutDotDot);
          
          // Also try with images/ prefix removed if present
          if (withoutDotDot.startsWith('images/')) {
            pathsToTry.push(withoutDotDot.substring(7));
          }
        }
        
        // Strategy 3: If absolute path, remove leading slash
        if (resolvedSrc.startsWith('/')) {
          const withoutSlash = resolvedSrc.substring(1);
          pathsToTry.push(withoutSlash);
        }
        
        // Strategy 4: Try resolving with epub.js resolver
        if (this.book.resources.resolve) {
          try {
            const epubResolved = this.book.resources.resolve(resolvedSrc, chapterHref);
            if (epubResolved && !pathsToTry.includes(epubResolved)) {
              pathsToTry.push(epubResolved);
            }
          } catch (e) {
            console.log(`⚠️ epub.js resolver failed:`, e);
          }
        }
        
        // Strategy 5: Try common EPUB image paths
        const imageName = resolvedSrc.split('/').pop();
        if (imageName) {
          pathsToTry.push(`images/${imageName}`);
          pathsToTry.push(`Images/${imageName}`);
          pathsToTry.push(`image/${imageName}`);
          pathsToTry.push(imageName);
        }
        
        console.log(`🔍 Trying paths:`, pathsToTry);
        
        // Try each path with multiple methods
        for (const pathToTry of pathsToTry) {
          console.log(`🔄 Trying path: ${pathToTry}`);
          
          // Method 0: Direct ZIP file access (most reliable)
          if (this.book.archive?.zip?.files) {
            try {
              // Try to find the file in the ZIP
              const zipFiles = this.book.archive.zip.files;
              let foundFile = null;
              
              // Check exact match
              if (zipFiles[pathToTry]) {
                foundFile = zipFiles[pathToTry];
              } else {
                // Check all files for a match (case-insensitive)
                for (const [zipPath, file] of Object.entries(zipFiles)) {
                  if (zipPath.toLowerCase().endsWith(pathToTry.toLowerCase()) ||
                      zipPath.toLowerCase().endsWith(pathToTry.toLowerCase().replace(/^\.\.\//, ''))) {
                    foundFile = file;
                    console.log(`📍 Found image in ZIP at: ${zipPath}`);
                    break;
                  }
                }
              }
              
              if (foundFile) {
                // Get the file as blob
                const blob = await (foundFile as any).async('blob');
                const url = URL.createObjectURL(blob);
                console.log(`✅ Created blob URL directly from ZIP for: ${pathToTry}`);
                this._imageObjectUrls.add(url);
                return url;
              }
            } catch (e) {
              console.log(`⚠️ Direct ZIP access failed:`, e);
            }
          }
          
          // Method 1: Try resources.createUrl
          if (this.book.resources?.createUrl) {
            try {
              const url = await this.book.resources.createUrl(pathToTry);
              if (url) {
                console.log(`✅ Success with resources.createUrl for path: ${pathToTry}`);
                return url;
              }
            } catch (e) {
              // Silent fail, try next method
            }
          }
          
          // Method 2: Try resources.get
          if (this.book.resources.get) {
            try {
              const resource = this.book.resources.get(pathToTry);
              if (resource && resource.url) {
                console.log(`✅ Success with resources.get for path: ${pathToTry}`);
                return resource.url;
              }
            } catch (e) {
              // Silent fail, try next method
            }
          }
          
          // Method 3: Try archive.createUrl
          if (this.book.archive?.createUrl) {
            try {
              const url = await this.book.archive.createUrl(pathToTry);
              if (url) {
                console.log(`✅ Success with archive.createUrl for path: ${pathToTry}`);
                return url;
              }
            } catch (e) {
              // Silent fail, try next method
            }
          }
          
          // Method 4: Try archive.getBlob
          if (this.book.archive?.getBlob) {
            try {
              const blob = await this.book.archive.getBlob(pathToTry);
              if (blob) {
                const url = URL.createObjectURL(blob);
                console.log(`✅ Success with archive.getBlob for path: ${pathToTry}`);
                this._imageObjectUrls.add(url);
                return url;
              }
            } catch (e) {
              // Silent fail, try next path
            }
          }
        }
      }
      
      console.log(`❌ All paths and methods failed for: ${src}`);
      return null;
    } catch (error) {
      console.log(`❌ Error in createImageUrl:`, error);
      return null;
    }
  }

  // Legacy image processing methods removed - now using Resources API

  private setupScrollListener(): void {
    let ticking = false;
    let lastScrollTop = 0;
    console.log('🎯 Setting up scroll listener on container:', this.container);
    console.log('📊 Container dimensions:', {
      scrollHeight: this.container.scrollHeight,
      clientHeight: this.container.clientHeight,
      scrollTop: this.container.scrollTop,
      offsetHeight: this.container.offsetHeight,
      className: this.container.className,
      id: this.container.id,
      computedOverflow: window.getComputedStyle(this.container).overflow,
      computedOverflowY: window.getComputedStyle(this.container).overflowY
    });
    
    this._onScroll = () => {
      console.log('🔥 RAW SCROLL EVENT FIRED!', this.container.scrollTop);
      if (!ticking) {
        requestAnimationFrame(() => {
          // Only update if scroll position actually changed significantly
          const currentScrollTop = this.container.scrollTop;
          if (Math.abs(currentScrollTop - lastScrollTop) > 5) {
            console.log('📜 Scroll detected:', {
              scrollTop: currentScrollTop,
              scrollHeight: this.container.scrollHeight,
              clientHeight: this.container.clientHeight,
              progress: Math.round((currentScrollTop / (this.container.scrollHeight - this.container.clientHeight)) * 100)
            });
            this.updateProgress();
            this.updateCurrentChapter();
            lastScrollTop = currentScrollTop;
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    this.container.addEventListener('scroll', this._onScroll, { passive: true });
  }

  private updateProgress(): void {
    console.log('📊 updateProgress called, callback exists?', !!this.onProgressCallback);
    if (!this.onProgressCallback) return;

    const scrollTop = this.container.scrollTop;
    const scrollHeight = this.container.scrollHeight - this.container.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    
    console.log('📈 Progress calculated:', Math.round(progress) + '%');
    this.onProgressCallback(Math.round(progress));
  }

  private updateCurrentChapter(): void {
    console.log('📚 updateCurrentChapter called, callback exists?', !!this.onChapterCallback);
    if (!this.onChapterCallback) return;

    const scrollTop = this.container.scrollTop;
    const viewportHeight = this.container.clientHeight;
    // Use a reference point near the top of the viewport. This is more stable
    // for determining the "current" chapter than the viewport middle. A small,
    // fixed offset is used to prevent issues with chapters that are only
    // barely visible at the bottom of the screen.
    const referencePoint = scrollTop + 50;

    const chapters = this.container.querySelectorAll('.epub-chapter');
    let activeChapterFound = false;
    let currentChapter = '';
    let currentHref = '';

    // Iterate backwards to find the first chapter that starts before the reference point
    for (let i = chapters.length - 1; i >= 0; i--) {
      const chapter = chapters[i] as HTMLElement;
      const rect = chapter.getBoundingClientRect();
      const chapterTop = scrollTop + rect.top;

      if (chapterTop <= referencePoint) {
        const index = parseInt(chapter.getAttribute('data-chapter-index') || '0');
        currentHref = chapter.getAttribute('data-chapter-href') || '';
        currentChapter = this.chapters[index]?.title || '';
        this.currentChapterIndex = index;

        // Try to find matching TOC item for more accurate title
        const tocItem = this.toc.find(item => {
          const itemHref = item.href.split('#')[0];
          const chapterHref = currentHref.split('#')[0];
          return itemHref === chapterHref;
        });

        if (tocItem) {
          currentChapter = tocItem.label;
        }
        
        activeChapterFound = true;
        break; // Found the current chapter, stop searching
      }
    }

    // If no chapter was found (e.g. scrolled before the first chapter),
    // default to the first chapter's title if we are at the top.
    if (!activeChapterFound && scrollTop < 100 && this.chapters.length > 0) {
        currentChapter = this.chapters[0].title;
        // Also try to find a better title from TOC
        const tocItem = this.toc.find(item => {
          const itemHref = item.href.split('#')[0];
          const chapterHref = this.chapters[0].href.split('#')[0];
          return itemHref === chapterHref;
        });
        if (tocItem) {
            currentChapter = tocItem.label;
        }
    }

    this.onChapterCallback(currentChapter);
  }

  setTheme(theme: 'light' | 'dark' | 'sepia' | 'night'): void {
    if (this.currentTheme === theme) return; // Skip if same theme
    this.currentTheme = theme;
    this.applyTheme(theme);
  }

  private applyTheme(theme: 'light' | 'dark' | 'sepia' | 'night'): void {
    const colors: Record<'light' | 'dark' | 'sepia' | 'night', { bg: string; color: string; muted: string; border: string; highlight: string }> = {
      light: { 
        bg: '#ffffff', 
        color: '#1c2024',
        muted: '#6e7681',
        border: '#e5e7eb',
        highlight: 'rgba(0, 113, 227, 0.15)'
      },
      dark: { 
        bg: '#101215', 
        color: '#f5f5f7',
        muted: '#9ba0aa',
        border: '#2a2e35',
        highlight: 'rgba(64, 156, 255, 0.3)'
      },
      sepia: {
        bg: '#f6f0e1',  // Softer warm cream
        color: '#4a3628', // Rich coffee brown
        muted: '#7a6652',
        border: '#c4ad92',
        highlight: 'rgba(180, 130, 70, 0.25)'
      },
      night: {
        bg: '#000000',
        color: '#dcdcdc', // Softer white for less eye strain
        muted: '#8c8c8c',
        border: '#323232',
        highlight: 'rgba(100, 160, 255, 0.25)'
      }
    };

    const themeColors = colors[theme];

    // Always update CSS variables for fast background/text changes
    const root = document.documentElement;
    root.style.setProperty('--epub-bg', themeColors.bg);
    root.style.setProperty('--epub-color', themeColors.color);
    root.style.setProperty('--epub-muted', themeColors.muted);
    root.style.setProperty('--epub-border', themeColors.border);
    root.style.setProperty('--epub-highlight', themeColors.highlight);
    
    // Update content data attribute immediately
    const existingContent = this.container.querySelector('.epub-continuous-content');
    if (existingContent) {
      (existingContent as HTMLElement).setAttribute('data-theme', theme);
      (existingContent as HTMLElement).style.backgroundColor = themeColors.bg;
      (existingContent as HTMLElement).style.color = themeColors.color;
    }

    const styles = `
      :root {
        --epub-bg: ${themeColors.bg};
        --epub-color: ${themeColors.color};
        --epub-muted: ${themeColors.muted};
        --epub-border: ${themeColors.border};
      }
      
      .epub-continuous-content {
        background-color: var(--epub-bg, ${themeColors.bg});
        color: var(--epub-color, ${themeColors.color});
        font-family: "Crimson Text", "Georgia", "Times New Roman", serif;
        font-size: ${this.fontSize}px;
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

      /* Normalize text color across common inline elements to prevent dark text in dark mode */
      .epub-continuous-content p,
      .epub-continuous-content li,
      .epub-continuous-content span,
      .epub-continuous-content em,
      .epub-continuous-content strong,
      .epub-continuous-content small,
      .epub-continuous-content sub,
      .epub-continuous-content sup,
      .epub-continuous-content i,
      .epub-continuous-content b,
      .epub-continuous-content u,
      .epub-continuous-content mark,
      .epub-continuous-content dfn,
      .epub-continuous-content cite,
      .epub-continuous-content q,
      .epub-continuous-content figcaption {
        color: var(--epub-color) !important;
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
        color: ${themeColors.color} !important;
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
        color: ${themeColors.color} !important;
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

      /* Blockquotes (refined, Apple/Kindle-like) */
      .epub-continuous-content blockquote {
        color: ${themeColors.muted};
        font-style: italic;
        margin: 1.5em 0;
        padding: 0.25em 1em;
        border-left: 3px solid ${themeColors.border};
        background: transparent;
      }

      /* Drop caps neutralization (disable oversized first letters) */
      .epub-continuous-content p::first-letter {
        font-size: inherit !important;
        line-height: inherit !important;
        float: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .epub-continuous-content .dropcap,
      .epub-continuous-content .drop-cap,
      .epub-continuous-content .drop_cap,
      .epub-continuous-content [data-dropcap] {
        font-size: inherit !important;
        line-height: inherit !important;
        float: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* Figures, charts and media */
      .epub-continuous-content figure { 
        margin: 1.5em auto; 
        text-align: center; 
      }
      .epub-continuous-content img,
      .epub-continuous-content svg,
      .epub-continuous-content canvas {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 0.5em auto;
      }
      .epub-continuous-content .epub-graphic-wrapper,
      .epub-continuous-content .epub-table-wrapper {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        margin: 0.5em 0;
      }
      .epub-continuous-content .epub-graphic-wrapper > svg,
      .epub-continuous-content .epub-graphic-wrapper > canvas {
        display: block;
      }
      .epub-continuous-content table {
        width: max-content; /* allow horizontal scroll when too wide */
        max-width: 100%;
        border-collapse: collapse;
      }
      .epub-continuous-content th,
      .epub-continuous-content td {
        padding: 0.35em 0.5em;
        vertical-align: top;
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
        background: ${themeColors.highlight};
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
        color: ${
          theme === 'dark' ? '#d4af37' : 
          theme === 'night' ? '#6495ed' :
          theme === 'sepia' ? '#8b6f47' :
          '#8b4513'
        };
        font-family: "Crimson Text", "Georgia", serif;
        text-shadow: ${
          theme === 'dark' || theme === 'night' 
            ? '0 0 8px rgba(212, 175, 55, 0.3)' 
            : '0 2px 4px rgba(0, 0, 0, 0.1)'
        };
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
    this.stylesApplied = true;

    // Update theme attribute and colors immediately
    const content = this.container.querySelector('.epub-continuous-content') as HTMLElement;
    if (content) {
      content.setAttribute('data-theme', theme);
      content.style.backgroundColor = themeColors.bg;
      content.style.color = themeColors.color;
    }
  }

  // Enhance non-textual content (tables, SVGs) for better UX
  private enhanceRenderedContent(root?: HTMLElement): void {
    const scope: HTMLElement | Document = root ?? this.container;

    // Wrap wide tables with horizontal scroll container
    const tables = scope.querySelectorAll('table');
    tables.forEach((table) => {
      const parent = table.parentElement as HTMLElement | null;
      if (!parent) return;
      if (parent.classList.contains('epub-table-wrapper')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'epub-table-wrapper';
      parent.replaceChild(wrapper, table);
      wrapper.appendChild(table);
    });

    // Wrap SVG/canvas charts to allow scrolling if overflow
    const graphics = scope.querySelectorAll('svg, canvas');
    graphics.forEach((node) => {
      const parent = node.parentElement as HTMLElement | null;
      if (!parent) return;
      if (parent.classList.contains('epub-graphic-wrapper')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'epub-graphic-wrapper';
      parent.replaceChild(wrapper, node);
      wrapper.appendChild(node);

      // Accessibility for SVG charts
      if (node.tagName.toLowerCase() === 'svg') {
        const svg = node as SVGElement;
        if (!svg.getAttribute('role')) svg.setAttribute('role', 'img');
        if (!svg.getAttribute('aria-label')) {
          const title = svg.querySelector('title')?.textContent?.trim();
          const desc = svg.querySelector('desc')?.textContent?.trim();
          const label = title || desc;
          if (label) svg.setAttribute('aria-label', label);
        }
      }
    });

    // Neutralize dropcap classes embedded in content
    const dropcaps = scope.querySelectorAll('.dropcap, .drop-cap, .drop_cap, [data-dropcap]');
    dropcaps.forEach((el) => {
      el.classList.remove('dropcap', 'drop-cap', 'drop_cap');
      (el as HTMLElement).removeAttribute('data-dropcap');
      (el as HTMLElement).style.removeProperty('float');
      (el as HTMLElement).style.removeProperty('font-size');
      (el as HTMLElement).style.removeProperty('line-height');
      (el as HTMLElement).style.removeProperty('margin');
      (el as HTMLElement).style.removeProperty('padding');
    });
  }

  // Navigation methods
  jumpToChapter(href: string): void {
    // First try exact match
    let chapter = this.container.querySelector(`[data-chapter-href="${href}"]`);
    
    // If not found, try without fragment identifier
    if (!chapter && href.includes('#')) {
      const baseHref = href.split('#')[0];
      chapter = this.container.querySelector(`[data-chapter-href="${baseHref}"]`);
    }
    
    // If still not found, try finding by matching the href part
    if (!chapter) {
      const chapters = this.container.querySelectorAll('[data-chapter-href]');
      for (const ch of chapters) {
        const chapterHref = ch.getAttribute('data-chapter-href') || '';
        // Check if the hrefs match (ignoring fragments)
        if (chapterHref.split('#')[0] === href.split('#')[0]) {
          chapter = ch;
          break;
        }
      }
    }
    
    if (chapter) {
      chapter.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Update current chapter tracking
      const index = parseInt((chapter as HTMLElement).getAttribute('data-chapter-index') || '0');
      this.currentChapterIndex = index;
      const title = this.chapters[index]?.title || '';
      if (this.onChapterCallback) {
        this.onChapterCallback(title);
      }
    } else {
      console.warn(`Chapter not found for href: ${href}`);
    }
  }

  // Callbacks
  onProgress(callback: (progress: number) => void): void {
    console.log('✅ onProgress callback registered');
    this.onProgressCallback = callback;
    // Immediately call with current progress
    this.updateProgress();
  }

  onChapterChange(callback: (title: string) => void): void {
    console.log('✅ onChapterChange callback registered');
    this.onChapterCallback = callback;
    // Immediately call with current chapter
    this.updateCurrentChapter();
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
        const currentHref = (chapter as HTMLElement).getAttribute('data-chapter-href') || '';
        this.currentChapterIndex = index;
        
        // Try to find matching TOC item for more accurate title
        const tocItem = this.toc.find(item => {
          const itemHref = item.href.split('#')[0];
          const chapterHref = currentHref.split('#')[0];
          return itemHref === chapterHref;
        });
        
        if (tocItem) {
          return tocItem.label;
        }
        
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
    // Clean up style
    const styleEl = document.getElementById('epub-renderer-styles');
    if (styleEl) {
      styleEl.remove();
    }

    // Remove scroll listener
    if (this._onScroll) {
      this.container.removeEventListener('scroll', this._onScroll as EventListener);
      this._onScroll = undefined;
    }

    // Revoke any object URLs we created for images
    if (this._imageObjectUrls.size > 0) {
      for (const url of this._imageObjectUrls) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
      this._imageObjectUrls.clear();
    }
  }

  // Adjust base font size without re-applying entire theme
  setFontSize(size: number): void {
    const newSize = Math.max(12, Math.min(32, Math.round(size)));
    if (this.fontSize === newSize) return; // Skip if same size
    this.fontSize = newSize;
    
    // Just update font-size CSS variable for instant change
    const content = this.container.querySelector('.epub-continuous-content') as HTMLElement;
    if (content) {
      content.style.fontSize = `${this.fontSize}px`;
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

  // Restore to a percentage position (more reliable fallback)
  restoreToPercentage(percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      console.warn(`Invalid percentage: ${percentage}`);
      return;
    }
    
    // Calculate scroll position based on percentage
    const scrollHeight = this.container.scrollHeight - this.container.clientHeight;
    const targetScroll = scrollHeight * (percentage / 100);
    
    console.log(`📍 Restoring to ${percentage}% (scroll position: ${targetScroll})`);
    this.container.scrollTo({ top: targetScroll, behavior: 'auto' });
    
    // Update progress callback
    if (this.onProgressCallback) {
      this.onProgressCallback(Math.round(percentage));
    }
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
      if (!cfi || cfi.includes('undefined')) {
        console.warn('⚠️ Attempted to display an invalid or undefined CFI:', cfi);
        return false;
      }
      
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
        // Simple scroll position - use immediate scrolling for restoration
        const scrollTop = parseFloat(cfi.substring(1));
        if (!isNaN(scrollTop)) {
          console.log(`📍 Restoring to scroll position: ${scrollTop}`);
          this.container.scrollTo({ top: scrollTop, behavior: 'auto' }); // Use 'auto' for immediate scroll
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
            `[data-chapter-index="${chapterIndex}"]`
          ) as HTMLElement;
          
          if (!chapter) {
            console.warn(`⚠️ Chapter not found: index=${chapterIndex}, id=${chapterId}`);
            return false;
          }
          
          // Get the actual position of the chapter in the scrollable container
          const chapterTop = chapter.offsetTop;
          console.log(`📍 Found chapter at offsetTop: ${chapterTop}`);
          
          if (parts[1]) {
            // Has relative position within chapter
            const relativePosition = parseFloat(parts[1]);
            if (!isNaN(relativePosition)) {
              // Calculate target scroll position
              const chapterHeight = chapter.offsetHeight;
              const targetScroll = chapterTop + (chapterHeight * relativePosition) - (this.container.clientHeight / 2);
              console.log(`📍 Restoring to chapter ${chapterIndex} at ${(relativePosition * 100).toFixed(1)}% (scroll: ${targetScroll})`);
              this.container.scrollTo({ top: targetScroll, behavior: 'auto' }); // Use 'auto' for immediate scroll
              return true;
            }
          } else {
            // Just scroll to chapter start
            console.log(`📍 Restoring to chapter ${chapterIndex} start`);
            this.container.scrollTo({ top: chapterTop, behavior: 'auto' });
            return true;
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
      
      // Create highlight span with different styling for notes
      const highlightSpan = document.createElement('span');
      
      if (annotation.annotation_type === 'note') {
        // Special styling for notes - more subtle and digital
        highlightSpan.className = 'epub-note';
        highlightSpan.style.backgroundColor = 'transparent';
        highlightSpan.style.borderBottom = '2px dotted rgba(99, 102, 241, 0.4)';
        highlightSpan.style.position = 'relative';
        highlightSpan.style.paddingBottom = '1px';
        
        // Add a small note indicator after the text
        const noteIndicator = document.createElement('sup');
        noteIndicator.style.cssText = `
          color: rgb(99, 102, 241);
          font-size: 0.7em;
          margin-left: 2px;
          font-weight: 600;
          opacity: 0.7;
        `;
        noteIndicator.textContent = '✎';
        highlightSpan.dataset.hasIndicator = 'true';
      } else {
        // Regular highlight styling
        highlightSpan.className = 'epub-highlight';
        highlightSpan.style.backgroundColor = annotation.color || 'rgba(251, 191, 36, 0.3)';
      }
      
      highlightSpan.dataset.annotationId = annotation.id;
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
        
        // Add note indicator for notes
        if (annotation.annotation_type === 'note' && highlightSpan.dataset.hasIndicator === 'true') {
          const noteIndicator = document.createElement('sup');
          noteIndicator.style.cssText = `
            color: rgb(99, 102, 241);
            font-size: 0.7em;
            margin-left: 2px;
            font-weight: 600;
            opacity: 0.7;
            user-select: none;
          `;
          noteIndicator.textContent = '✎';
          highlightSpan.appendChild(noteIndicator);
        }
        
        this.highlightedRanges.set(annotation.id, range);
      } catch (e) {
        // If surroundContents fails (e.g., range spans multiple elements),
        // extract and wrap the contents manually
        const contents = range.extractContents();
        highlightSpan.appendChild(contents);
        
        // Add note indicator for notes
        if (annotation.annotation_type === 'note' && highlightSpan.dataset.hasIndicator === 'true') {
          const noteIndicator = document.createElement('sup');
          noteIndicator.style.cssText = `
            color: rgb(99, 102, 241);
            font-size: 0.7em;
            margin-left: 2px;
            font-weight: 600;
            opacity: 0.7;
            user-select: none;
          `;
          noteIndicator.textContent = '✎';
          highlightSpan.appendChild(noteIndicator);
        }
        
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
      
      // Priority 2: Try to find text near the CFI location if available
      if (cfi) {
        // Extract chapter info from CFI to narrow search
        const cfiParts = cfi.split('/');
        if (cfiParts.length >= 2) {
          const chapterIndex = cfiParts[0];
          const chapterId = cfiParts[1];
          
          // Find the chapter element to search within
          const chapter = this.container.querySelector(
            `[data-chapter-index="${chapterIndex}"][data-chapter-id="${chapterId}"]`
          );
          
          if (chapter) {
            // Search within the specific chapter first
            const range = this.searchTextInElement(searchText, chapter as Element);
            if (range) return range;
          }
        }
      }
      
      // Priority 3: Fallback to full document search with occurrence tracking
      const matches: { range: Range; context: string }[] = [];
      const walker = document.createTreeWalker(
        this.container,
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
          
          // Get surrounding context for disambiguation
          const contextStart = Math.max(0, index - 20);
          const contextEnd = Math.min(text.length, index + searchText.length + 20);
          const context = text.substring(contextStart, contextEnd);
          
          matches.push({ range, context });
          
          // Look for next occurrence in the same node
          index = text.indexOf(searchText, index + 1);
        }
      }
      
      // If we found matches, return the best one
      if (matches.length > 0) {
        // If only one match, return it
        if (matches.length === 1) {
          return matches[0].range;
        }
        
        // If multiple matches and we have CFI context, try to match based on position
        if (cfi && cfi.includes('@')) {
          // Extract position hint from CFI
          const positionMatch = cfi.match(/@([\d.]+)/);
          if (positionMatch) {
            const targetPosition = parseFloat(positionMatch[1]);
            // Return the match closest to the target position
            // For simplicity, return the match at the approximate position
            const matchIndex = Math.min(
              Math.floor(targetPosition * matches.length),
              matches.length - 1
            );
            return matches[matchIndex].range;
          }
        }
        
        // Default to first match if no better selection criteria
        return matches[0].range;
      }
      
      return null;
    } catch (error) {
      console.warn('Error finding text:', error);
      return null;
    }
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
