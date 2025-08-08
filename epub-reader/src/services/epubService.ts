import { BookMetadata } from '@/types'
import { EpubService, ValidationResult, EpubBook } from '@/types/services'
import JSZip from 'jszip'

interface EpubManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties?: string;
}

interface EpubSpineItem {
  idref: string;
  linear?: boolean;
}

export class EpubServiceImpl implements EpubService {
  private readonly ALLOWED_CONTENT_TYPES = [
    'application/xhtml+xml',
    'text/html',
    'text/css',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'application/javascript',
    'application/x-font-ttf',
    'application/font-woff',
    'application/font-woff2',
  ];

  private readonly SUSPICIOUS_PATTERNS = [
    /<script[\s>]/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
    /eval\s*\(/gi,
    /new\s+Function/gi,
  ];

  /**
   * Validates EPUB file structure and security
   */
  async validateEpubFile(file: File): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check file type
      if (!file.type.includes('epub') && !file.name.endsWith('.epub')) {
        errors.push('File must be an EPUB');
      }

      // Check file size (50MB limit)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        errors.push('File size must be less than 50MB');
      }

      // Load ZIP structure
      const zip = await JSZip.loadAsync(file);

      // Check for required files
      const mimetypeFile = zip.file('mimetype');
      if (!mimetypeFile) {
        errors.push('Missing mimetype file');
      } else {
        const mimetype = await mimetypeFile.async('string');
        if (mimetype.trim() !== 'application/epub+zip') {
          errors.push('Invalid mimetype');
        }
      }

      // Check for container.xml
      const containerFile = zip.file('META-INF/container.xml');
      if (!containerFile) {
        errors.push('Missing META-INF/container.xml');
      }

      // Security scan: Check for suspicious content
      const contentFiles = Object.keys(zip.files).filter(
        path => path.endsWith('.html') || path.endsWith('.xhtml')
      );

      for (const path of contentFiles) {
        const file = zip.file(path);
        if (file) {
          const content = await file.async('string');
          
          // Check for suspicious patterns
          for (const pattern of this.SUSPICIOUS_PATTERNS) {
            if (pattern.test(content)) {
              warnings.push(`Suspicious content in ${path}: ${pattern.source}`);
            }
          }

          // Check for external URLs (potential privacy/security risk)
          const externalUrlPattern = /https?:\/\/[^\s"']+/gi;
          const matches = content.match(externalUrlPattern);
          if (matches && matches.length > 0) {
            warnings.push(`External URLs found in ${path}`);
          }
        }
      }

      // Check for executable files
      const executableExtensions = ['.exe', '.dll', '.bat', '.sh', '.command'];
      for (const path of Object.keys(zip.files)) {
        if (executableExtensions.some(ext => path.toLowerCase().endsWith(ext))) {
          errors.push(`Executable file found: ${path}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: {
          fileSize: file.size,
          fileName: file.name,
          lastModified: new Date(file.lastModified),
        },
      };
    } catch (error) {
      errors.push(`Failed to validate EPUB: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * Extracts metadata from EPUB file with fallback strategies
   */
  async extractMetadata(file: File): Promise<BookMetadata> {
    try {
      const zip = await JSZip.loadAsync(file);
      
      // Find OPF file from container.xml
      const containerFile = zip.file('META-INF/container.xml');
      if (!containerFile) {
        throw new Error('Invalid EPUB: Missing container.xml');
      }

      const containerXml = await containerFile.async('string');
      const opfPath = this.extractOpfPath(containerXml);

      const opfFile = zip.file(opfPath);
      if (!opfFile) {
        throw new Error(`OPF file not found at ${opfPath}`);
      }

      const opfContent = await opfFile.async('string');
      const metadata = this.parseOpfMetadata(opfContent);

      // Fallback strategies
      if (!metadata.title) {
        metadata.title = file.name.replace('.epub', '');
      }

      if (!metadata.language) {
        metadata.language = 'en'; // Default to English
      }

      // Try to extract page count from spine
      const pageCount = this.extractPageCount(opfContent);
      if (pageCount > 0) {
        metadata.pageCount = pageCount;
      }

      // Extract subjects/categories
      const subjects = this.extractSubjects(opfContent);
      if (subjects.length > 0) {
        metadata.subjects = subjects.join(', ');
      }

      return metadata;
    } catch (error) {
      console.error('Failed to extract metadata:', error);
      
      // Return minimal metadata as fallback
      return {
        title: file.name.replace('.epub', ''),
        author: null,
        description: null,
        isbn: null,
        publisher: null,
        publishedDate: null,
        pageCount: null,
        language: 'en',
        subjects: null,
      };
    }
  }

  /**
   * Extracts OPF path from container.xml
   */
  private extractOpfPath(containerXml: string): string {
    const match = containerXml.match(/full-path="([^"]+)"/);
    if (!match) {
      // Fallback to common locations
      const commonPaths = ['OEBPS/content.opf', 'content.opf', 'OPS/content.opf'];
      return commonPaths[0];
    }
    return match[1];
  }

  /**
   * Parses OPF metadata
   */
  private parseOpfMetadata(opfContent: string): BookMetadata {
    const metadata: BookMetadata = {
      title: null,
      author: null,
      description: null,
      isbn: null,
      publisher: null,
      publishedDate: null,
      pageCount: null,
      language: null,
      subjects: null,
    };

    // Extract title
    const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
    if (titleMatch) {
      metadata.title = this.decodeHtmlEntities(titleMatch[1].trim());
    }

    // Extract author
    const authorMatch = opfContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
    if (authorMatch) {
      metadata.author = this.decodeHtmlEntities(authorMatch[1].trim());
    }

    // Extract description
    const descMatch = opfContent.match(/<dc:description[^>]*>([^<]+)<\/dc:description>/i);
    if (descMatch) {
      metadata.description = this.decodeHtmlEntities(descMatch[1].trim());
    }

    // Extract ISBN
    const isbnMatch = opfContent.match(/<dc:identifier[^>]*opf:scheme="ISBN"[^>]*>([^<]+)<\/dc:identifier>/i) ||
                     opfContent.match(/<dc:identifier[^>]*>(?:urn:isbn:)?(\d{10}|\d{13})<\/dc:identifier>/i);
    if (isbnMatch) {
      metadata.isbn = isbnMatch[1].trim();
    }

    // Extract publisher
    const publisherMatch = opfContent.match(/<dc:publisher[^>]*>([^<]+)<\/dc:publisher>/i);
    if (publisherMatch) {
      metadata.publisher = this.decodeHtmlEntities(publisherMatch[1].trim());
    }

    // Extract published date
    const dateMatch = opfContent.match(/<dc:date[^>]*>([^<]+)<\/dc:date>/i);
    if (dateMatch) {
      try {
        const date = new Date(dateMatch[1].trim());
        if (!isNaN(date.getTime())) {
          metadata.publishedDate = date.toISOString();
        }
      } catch {
        // Invalid date format
      }
    }

    // Extract language
    const langMatch = opfContent.match(/<dc:language[^>]*>([^<]+)<\/dc:language>/i);
    if (langMatch) {
      metadata.language = langMatch[1].trim().toLowerCase();
    }

    return metadata;
  }

  /**
   * Extracts page count from spine
   */
  private extractPageCount(opfContent: string): number {
    const spineMatches = opfContent.match(/<spine[^>]*>([\s\S]*?)<\/spine>/i);
    if (spineMatches) {
      const itemrefs = spineMatches[1].match(/<itemref[^>]*>/gi);
      return itemrefs ? itemrefs.length : 0;
    }
    return 0;
  }

  /**
   * Extracts subjects/categories
   */
  private extractSubjects(opfContent: string): string[] {
    const subjects: string[] = [];
    const subjectMatches = opfContent.matchAll(/<dc:subject[^>]*>([^<]+)<\/dc:subject>/gi);
    
    for (const match of subjectMatches) {
      subjects.push(this.decodeHtmlEntities(match[1].trim()));
    }
    
    return subjects;
  }

  /**
   * Decodes HTML entities
   */
  private decodeHtmlEntities(text: string): string {
    const entities: { [key: string]: string } = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
    };
    
    return text.replace(/&[^;]+;/g, match => entities[match] || match);
  }

  /**
   * Generates thumbnail from EPUB cover
   */
  async generateThumbnail(file: File): Promise<Blob> {
    try {
      const zip = await JSZip.loadAsync(file);
      
      // Find OPF file
      const containerFile = zip.file('META-INF/container.xml');
      if (!containerFile) {
        throw new Error('Invalid EPUB: Missing container.xml');
      }

      const containerXml = await containerFile.async('string');
      const opfPath = this.extractOpfPath(containerXml);
      const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/'));

      const opfFile = zip.file(opfPath);
      if (!opfFile) {
        throw new Error(`OPF file not found at ${opfPath}`);
      }

      const opfContent = await opfFile.async('string');
      
      // Find cover image in manifest
      const coverImageId = this.findCoverImageId(opfContent);
      if (!coverImageId) {
        throw new Error('No cover image found');
      }

      const coverImagePath = this.findImagePath(opfContent, coverImageId, opfDir);
      if (!coverImagePath) {
        throw new Error('Cover image path not found');
      }

      const imageFile = zip.file(coverImagePath);
      if (!imageFile) {
        throw new Error(`Cover image file not found at ${coverImagePath}`);
      }

      const imageBlob = await imageFile.async('blob');
      
      // Optimize image size
      return await this.optimizeImage(imageBlob);
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      
      // Return placeholder image
      return this.createPlaceholderImage();
    }
  }

  /**
   * Finds cover image ID in OPF
   */
  private findCoverImageId(opfContent: string): string | null {
    // Look for cover in metadata
    const metaCoverMatch = opfContent.match(/<meta[^>]*name="cover"[^>]*content="([^"]+)"/i);
    if (metaCoverMatch) {
      return metaCoverMatch[1];
    }

    // Look for item with properties="cover-image"
    const itemMatch = opfContent.match(/<item[^>]*properties="[^"]*cover-image[^"]*"[^>]*id="([^"]+)"/i);
    if (itemMatch) {
      return itemMatch[1];
    }

    // Look for common cover patterns
    const manifestMatch = opfContent.match(/<item[^>]*id="(cover[^"]*)"[^>]*media-type="image\//i);
    if (manifestMatch) {
      return manifestMatch[1];
    }

    return null;
  }

  /**
   * Finds image path from manifest
   */
  private findImagePath(opfContent: string, imageId: string, opfDir: string): string | null {
    const itemMatch = opfContent.match(new RegExp(`<item[^>]*id="${imageId}"[^>]*href="([^"]+)"`, 'i'));
    if (itemMatch) {
      const href = itemMatch[1];
      return opfDir ? `${opfDir}/${href}` : href;
    }
    return null;
  }

  /**
   * Optimizes image for thumbnail
   */
  private async optimizeImage(blob: Blob): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Set thumbnail dimensions (max 300x400)
        const maxWidth = 300;
        const maxHeight = 400;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (optimizedBlob) => {
              resolve(optimizedBlob || blob);
            },
            'image/jpeg',
            0.85
          );
        } else {
          resolve(blob);
        }
      };

      img.onerror = () => resolve(blob);
      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * Creates a placeholder image
   */
  private createPlaceholderImage(): Blob {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, 300, 400);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 300, 400);
      
      // Add text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No Cover', 150, 200);
    }
    
    return new Blob([canvas.toDataURL('image/jpeg', 0.85)], { type: 'image/jpeg' });
  }

  /**
   * Loads and preprocesses EPUB for rendering
   */
  async loadBook(file: File): Promise<EpubBook> {
    try {
      // Validate file first
      const validation = await this.validateEpubFile(file);
      if (!validation.isValid) {
        throw new Error(`Invalid EPUB: ${validation.errors.join(', ')}`);
      }

      // Extract metadata
      const metadata = await this.extractMetadata(file);

      // Create object URL for epub.js
      const url = URL.createObjectURL(file);

      // Dynamic import of epub.js
      const ePub = (await import('epubjs')).default;
      const book = ePub(url);

      // Wait for book to be ready
      await book.ready;

      // Get navigation
      const navigation = await book.loaded.navigation;
      const toc = navigation.toc;

      // Get spine for chapter information
      const spine = book.spine;

      return {
        book,
        metadata,
        url,
        toc,
        spine,
        cleanup: () => URL.revokeObjectURL(url),
      };
    } catch (error) {
      console.error('Failed to load book:', error);
      throw error;
    }
  }

  /**
   * Preprocesses content for better rendering performance
   */
  async preprocessContent(content: string): Promise<string> {
    // Remove unnecessary whitespace
    let processed = content.replace(/\s+/g, ' ').trim();
    
    // Optimize images for lazy loading
    processed = processed.replace(
      /<img([^>]*)src=/gi,
      '<img$1loading="lazy" src='
    );
    
    // Add viewport meta if missing
    if (!processed.includes('viewport')) {
      processed = processed.replace(
        '<head>',
        '<head><meta name="viewport" content="width=device-width, initial-scale=1.0">'
      );
    }
    
    return processed;
  }
}

export const epubService = new EpubServiceImpl()