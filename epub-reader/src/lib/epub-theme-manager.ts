 /**
 * EPUB Theme Manager
 * Handles all theme-related operations for epub.js with robust error handling
 * and chapter transition management
 */

export type Theme = "light" | "dark";

interface ThemeConfig {
  light: {
    background: string;
    color: string;
    selectionBg: string;
    linkColor: string;
  };
  dark: {
    background: string;
    color: string;
    selectionBg: string;
    linkColor: string;
  };
}

const THEME_CONFIG: ThemeConfig = {
  light: {
    background: "#fcfcfd",
    color: "#1c2024",
    selectionBg: "rgba(0, 113, 227, 0.15)",
    linkColor: "#0071e3"
  },
  dark: {
    background: "#101215",
    color: "#f5f5f7",
    selectionBg: "rgba(64, 156, 255, 0.3)",
    linkColor: "#409cff"
  }
};

interface RenditionType {
  themes: {
    register: (name: string, styles: Record<string, any>) => void;
    select: (name: string) => void;
    default: (styles: Record<string, any>) => void;
  };
  hooks?: {
    content: {
      register: (callback: (contents: any) => Promise<any> | any) => void;
    };
    render: {
      register: (callback: (view: any) => void) => void;
    };
  };
  manager?: {
    container?: HTMLElement;
    updateLayout?: () => void;
  };
  on: (event: string, callback: (...args: any[]) => void) => void;
}

export class EpubThemeManager {
  private rendition: RenditionType;
  private currentTheme: Theme;
  private fontSize: number;
  private debug: boolean;
  private themeAppliedCallbacks: Set<() => void> = new Set();
  private initialized = false;
  private destroyed = false;

  constructor(rendition: RenditionType, initialTheme: Theme, fontSize = 17, debug = false) {
    this.rendition = rendition;
    this.currentTheme = initialTheme;
    this.fontSize = fontSize;
    this.debug = debug;
    this.initialize();
  }

  private log(...args: any[]) {
    if (this.debug) {
      console.log("[EpubThemeManager]", ...args);
    }
  }

  private initialize() {
    if (this.initialized || this.destroyed) return;
    
    this.log("Initializing theme manager");
    this.initialized = true;
    
    // Register content hooks FIRST - critical for FOUC prevention
    this.setupContentHooks();
    
    // Register themes immediately
    this.registerThemes();
    
    // Hook into all relevant events
    this.setupEventListeners();
    
    // Apply initial theme
    this.applyTheme(this.currentTheme, true);
  }

  private setupContentHooks() {
    if (!this.rendition.hooks?.content) {
      this.log("Content hooks not available");
      return;
    }

    this.log("Setting up content hooks for FOUC prevention");
    
    // Mobile detection
    const isMobile = window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Register content hook for immediate style injection
    this.rendition.hooks.content.register((contents: any) => {
      this.log("Content hook fired - injecting mobile-optimized styles");
      
      const theme = THEME_CONFIG[this.currentTheme];
      
      // CRITICAL: Hide content immediately on mobile until styles are ready
      if (isMobile && contents.document) {
        contents.document.documentElement.style.visibility = 'hidden';
        contents.document.body.style.visibility = 'hidden';
        this.log("Mobile detected - hiding content until styles load");
      }
      
      // Inline critical CSS immediately (most aggressive approach for mobile)
      const criticalCSS = `
        <style id="critical-fouc-prevention">
        html, body, *, a, a:link, a:visited, a:hover, a:active, a:focus {
          background-color: ${theme.background} !important;
          color: ${theme.color} !important;
          text-decoration: none !important;
          border: none !important;
          outline: none !important;
          cursor: default !important;
          transition: none !important;
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none !important;
        }
        html {
          -webkit-text-size-adjust: 100% !important;
          text-size-adjust: 100% !important;
        }
        body {
          font-family: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-size: ${isMobile ? Math.max(this.fontSize - 1, 14) : this.fontSize}px !important;
          line-height: 1.7 !important;
          letter-spacing: -0.003em !important;
          margin: 0 !important;
          padding: ${isMobile ? '16px' : '20px'} !important;
          -webkit-font-smoothing: antialiased !important;
          overflow-x: hidden !important;
        }
        </style>
      `;
      
      // Inject critical CSS inline before any other content
      if (contents.document && contents.document.head) {
        contents.document.head.insertAdjacentHTML('afterbegin', criticalCSS);
      }
      
      // Comprehensive mobile-specific critical styles via addStylesheetRules
      const criticalStyles = {
        'html, body, *, a, a:link, a:visited, a:hover, a:active, a:focus': {
          'background-color': `${theme.background} !important`,
          'color': `${theme.color} !important`,
          'text-decoration': 'none !important`,
          'border': 'none !important`,
          'outline': 'none !important`,
          'cursor': 'default !important`,
          'transition': 'none !important'
        },
        'body': {
          'font-family': 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
          'font-size': `${isMobile ? Math.max(this.fontSize - 1, 14) : this.fontSize}px !important`,
          'line-height': '1.7 !important`,
          'letter-spacing': '-0.003em !important`,
          'margin': '0 !important`,
          'padding': `${isMobile ? '16px' : '20px'} !important`,
          'visibility': 'visible !important`,
          '-webkit-font-smoothing': 'antialiased !important',
          'overflow-x': 'hidden !important'
        }
      };

      // Check if addStylesheetRules is available
      if (typeof contents.addStylesheetRules === 'function') {
        // Apply critical styles immediately and return promise to block rendering
        return contents.addStylesheetRules(criticalStyles).then(() => {
          this.log("Critical styles applied successfully");
          
          // Add comprehensive typography styles
          const fullStyles = this.generateContentHookCSS();
          return contents.addStylesheetRules(fullStyles);
        }).then(() => {
          this.log("Full typography styles applied");
          
          // Mobile-specific: Only show content AFTER all styles are applied
          if (isMobile && contents.document) {
            // Wait additional frame for mobile to ensure styles are processed
            return new Promise(resolve => {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  if (contents.document) {
                    contents.document.documentElement.style.visibility = 'visible';
                    contents.document.body.style.visibility = 'visible';
                    this.log("Mobile content revealed after style application");
                  }
                  resolve(undefined);
                });
              });
            });
          }
        }).catch((error: any) => {
          this.log("Error applying content hook styles:", error);
          // Ensure content is visible even if styles fail
          if (isMobile && contents.document) {
            contents.document.documentElement.style.visibility = 'visible';
            contents.document.body.style.visibility = 'visible';
          }
        });
      } else {
        this.log("addStylesheetRules not available, using direct DOM styling");
        
        // Fallback: direct DOM styling
        if (contents.document) {
          const theme = THEME_CONFIG[this.currentTheme];
          
          // Apply styles directly to DOM elements
          if (contents.document.documentElement) {
            contents.document.documentElement.style.backgroundColor = theme.background;
            contents.document.documentElement.style.color = theme.color;
            // CRITICAL: Ensure content is never hidden
            contents.document.documentElement.style.overflow = 'visible';
            contents.document.documentElement.style.position = 'relative';
            contents.document.documentElement.style.visibility = 'visible';
            contents.document.documentElement.style.display = 'block';
          }
          
          if (contents.document.body) {
            contents.document.body.style.backgroundColor = theme.background;
            contents.document.body.style.color = theme.color;
            contents.document.body.style.fontFamily = 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            contents.document.body.style.fontSize = `${isMobile ? Math.max(this.fontSize - 1, 14) : this.fontSize}px`;
            // CRITICAL: Ensure content is scrollable and visible
            contents.document.body.style.overflow = 'visible';
            contents.document.body.style.position = 'relative';
            contents.document.body.style.visibility = 'visible';
            contents.document.body.style.display = 'block';
            contents.document.body.style.width = '100%';
            contents.document.body.style.height = 'auto';
            contents.document.body.style.minHeight = 'unset';
            // Mobile scrolling optimization
            contents.document.body.style.webkitOverflowScrolling = 'touch';
            contents.document.body.style.scrollBehavior = 'smooth';
          }
          
          // Style all links immediately
          const links = contents.document.querySelectorAll('a');
          links.forEach((link: HTMLElement) => {
            link.style.color = theme.color;
            link.style.textDecoration = 'none';
            link.style.cursor = 'default';
          });
          
          if (isMobile) {
            contents.document.documentElement.style.visibility = 'visible';
            contents.document.body.style.visibility = 'visible';
          }
        }
        
        return Promise.resolve();
      }
    });

    // Additional render hook for immediate DOM manipulation with iOS fixes
    if (this.rendition.hooks?.render) {
      this.rendition.hooks.render.register((view: any) => {
        this.log("Render hook fired - applying mobile-optimized DOM styles");
        
        if (view.document && view.document.body) {
          const theme = THEME_CONFIG[this.currentTheme];
          const isMobile = window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
          
          // Mobile-specific viewport setup
          const viewport = view.document.querySelector('meta[name="viewport"]');
          if (viewport && isMobile) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover');
          }
          
          // Immediate DOM styling to prevent any flash
          view.document.documentElement.style.backgroundColor = theme.background;
          view.document.documentElement.style.color = theme.color;
          view.document.documentElement.style.webkitTextSizeAdjust = '100%';
          view.document.documentElement.style.textSizeAdjust = '100%';
          
          view.document.body.style.backgroundColor = theme.background;
          view.document.body.style.color = theme.color;
          view.document.body.style.webkitFontSmoothing = 'antialiased';
          view.document.body.style.mozOsxFontSmoothing = 'grayscale';
          view.document.body.style.overflow = 'visible';
          view.document.body.style.webkitOverflowScrolling = 'touch';
          view.document.body.style.scrollBehavior = 'smooth';
          
          // iOS-specific iframe fixes based on research
          if (isIOS) {
            // Fix iOS iframe content going blank during scrolling
            view.document.body.style.webkitTransform = 'translate3d(0, 0, 0)';
            view.document.body.style.webkitOverflowScrolling = 'touch';
            // Prevent iOS memory issues with aggressive GPU usage
            view.document.body.style.webkitBackfaceVisibility = 'hidden';
          } else if (isMobile) {
            // Android - avoid hardware acceleration which can cause problems
            view.document.body.style.transform = 'none';
            view.document.body.style.webkitTransform = 'none';
          }
          
          // Mobile touch optimizations
          if (isMobile) {
            view.document.body.style.webkitTapHighlightColor = 'transparent';
            view.document.body.style.webkitTouchCallout = 'none';
            view.document.body.style.webkitUserSelect = 'text';
            view.document.body.style.userSelect = 'text';
            
            // Mobile font size (16px minimum to prevent iOS zoom)
            const mobileSize = Math.max(this.fontSize - 1, 16);
            view.document.body.style.fontSize = `${mobileSize}px`;
            view.document.body.style.padding = '16px';
          }
          
          // Remove blue from all links immediately
          const links = view.document.querySelectorAll('a');
          links.forEach((link: HTMLElement) => {
            link.style.color = theme.color;
            link.style.textDecoration = 'none';
            link.style.cursor = 'default';
            if (isMobile) {
              link.style.webkitTapHighlightColor = 'transparent';
              link.style.webkitTouchCallout = 'none';
              // Ensure link font size is 16px+ on iOS to prevent zoom
              if (isIOS) {
                link.style.fontSize = 'inherit';
              }
            }
          });
          
          // Comprehensive mobile style injection
          const mobileStyle = view.document.createElement('style');
          mobileStyle.id = 'mobile-fouc-prevention';
          mobileStyle.textContent = `
            html, body {
              -webkit-text-size-adjust: 100% !important;
              text-size-adjust: 100% !important;
              overflow-x: hidden !important;
            }
            ${isIOS ? `
            body {
              -webkit-transform: translate3d(0, 0, 0) !important;
              -webkit-overflow-scrolling: touch !important;
              -webkit-backface-visibility: hidden !important;
            }
            ` : ''}
            ${isMobile && !isIOS ? `
            body {
              transform: none !important;
              -webkit-transform: none !important;
            }
            ` : ''}
            /* Prevent any remaining FOUC on mobile */
            * {
              -webkit-tap-highlight-color: transparent !important;
              color: ${theme.color} !important;
            }
            a, a:link, a:visited, a:hover, a:active, a:focus {
              color: ${theme.color} !important;
              text-decoration: none !important;
              cursor: default !important;
            }
          `;
          
          if (view.document.head) {
            view.document.head.appendChild(mobileStyle);
          }
        }
      });
    }
  }

  private generateContentHookCSS(): Record<string, Record<string, string>> {
    const theme = THEME_CONFIG[this.currentTheme];
    
    return {
      // Typography hierarchy
      'h1, h2, h3, h4, h5, h6': {
        'font-family': 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
        'font-weight': '600 !important',
        'letter-spacing': '-0.025em !important',
        'color': `${theme.color} !important`,
        'background-color': 'transparent !important'
      },
      'p': {
        'text-align': 'justify !important',
        'text-justify': 'inter-word !important',
        'margin': '0 0 1.2em 0 !important',
        'color': `${theme.color} !important`,
        'background-color': 'transparent !important'
      },
      // Comprehensive link styling
      'a, a:link, a:visited, a:hover, a:active, a:focus': {
        'color': `${theme.color} !important`,
        'text-decoration': 'none !important',
        'cursor': 'default !important',
        'background-color': 'transparent !important',
        'border': 'none !important',
        'outline': 'none !important'
      },
      // Footnote specific styling
      'sup a, .footnote, .fn, [role="doc-noteref"], [epub\\:type="noteref"]': {
        'color': `${theme.color} !important`,
        'text-decoration': 'none !important',
        'font-weight': 'inherit !important',
        'cursor': 'default !important'
      },
      // Block elements
      'div, span, li, td, th': {
        'color': `${theme.color} !important`,
        'background-color': 'transparent !important'
      }
    };
  }

  private registerThemes() {
    this.log("Registering themes");
    
    // Register light theme
    this.rendition.themes.register("light", {
      body: {
        background: `${THEME_CONFIG.light.background} !important`,
        color: `${THEME_CONFIG.light.color} !important`,
        fontFamily: "var(--font-geist-sans), -apple-system, system-ui, sans-serif",
        fontSize: `${this.fontSize}px`,
        lineHeight: "1.7",
        letterSpacing: "-0.003em",
        margin: "0 !important",
        padding: "40px 60px !important",
        boxSizing: "border-box !important",
        maxWidth: "100% !important",
        overflow: "hidden !important",
        transition: "background-color 0.3s ease, color 0.3s ease !important"
      },
      "*": {
        backgroundColor: "transparent !important",
        color: "inherit !important",
        transition: "background-color 0.3s ease, color 0.3s ease !important"
      },
      "p, div, span, li, td, th": {
        backgroundColor: "transparent !important",
        color: "inherit !important",
        transition: "background-color 0.3s ease, color 0.3s ease !important"
      },
      "::selection": { 
        background: `${THEME_CONFIG.light.selectionBg} !important` 
      },
      a: { 
        color: `${THEME_CONFIG.light.linkColor} !important`, 
        textDecoration: "none",
        transition: "color 0.3s ease !important"
      },
      "a:hover": { 
        textDecoration: "underline" 
      }
    });

    // Register dark theme
    this.rendition.themes.register("dark", {
      body: {
        background: `${THEME_CONFIG.dark.background} !important`,
        color: `${THEME_CONFIG.dark.color} !important`,
        fontFamily: "var(--font-geist-sans), -apple-system, system-ui, sans-serif",
        fontSize: `${this.fontSize}px`,
        lineHeight: "1.7",
        letterSpacing: "-0.003em",
        margin: "0 !important",
        padding: "40px 60px !important",
        boxSizing: "border-box !important",
        maxWidth: "100% !important",
        overflow: "hidden !important",
        transition: "background-color 0.3s ease, color 0.3s ease !important"
      },
      "*": {
        backgroundColor: "transparent !important",
        color: "inherit !important",
        transition: "background-color 0.3s ease, color 0.3s ease !important"
      },
      "p, div, span, li, td, th": {
        backgroundColor: "transparent !important",
        color: "inherit !important",
        transition: "background-color 0.3s ease, color 0.3s ease !important"
      },
      "::selection": { 
        background: `${THEME_CONFIG.dark.selectionBg} !important` 
      },
      a: { 
        color: `${THEME_CONFIG.dark.linkColor} !important`, 
        textDecoration: "none",
        transition: "color 0.3s ease !important"
      },
      "a:hover": { 
        textDecoration: "underline" 
      }
    });

    // Register default styles that apply to both themes
    this.rendition.themes.default({
      body: {
        margin: "0 !important",
        padding: "40px 60px !important",
        boxSizing: "border-box !important",
        maxWidth: "100% !important",
        overflow: "hidden !important"
      }
    });
  }

  private setupEventListeners() {
    this.log("Setting up event listeners");
    
    // Before rendering a new page/chapter
    this.rendition.on("started", () => {
      this.log("Render started - prepping theme");
      this.prepareForRender();
    });

    // Early hook - before content loads
    this.rendition.on("loading", () => {
      this.log("Content loading - early theme prep");
      this.prepareForRender();
    });

    // After content is rendered
    this.rendition.on("rendered", (section: unknown, view?: { iframe?: HTMLIFrameElement }) => {
      this.log("Content rendered - applying theme and adjusting height");
      this.onContentRendered(view);
    });

    // After relocating (page turn)
    this.rendition.on("relocated", () => {
      this.log("Relocated - ensuring theme and adjusting heights");
      this.ensureThemeApplied();
      // Critical for scrolled mode: adjust heights after navigation
      setTimeout(() => this.adjustAllIframeHeights(), 100);
    });

    // Layout changes
    this.rendition.on("layout", () => {
      this.log("Layout changed - reapplying theme and adjusting heights");
      this.applyTheme(this.currentTheme);
      // Height adjustment after layout changes
      setTimeout(() => this.adjustAllIframeHeights(), 150);
    });

    // View changes
    this.rendition.on("displayed", () => {
      this.log("View displayed - final theme check and height adjustment");
      this.ensureThemeApplied();
      // Final height adjustment
      setTimeout(() => this.adjustAllIframeHeights(), 200);
    });

    // Additional early hooks
    this.rendition.on("markClicked", () => {
      this.ensureThemeApplied();
    });
  }

  private prepareForRender() {
    // Set container background to prevent flashes
    if (this.rendition.manager?.container) {
      const bg = THEME_CONFIG[this.currentTheme].background;
      this.rendition.manager.container.style.backgroundColor = bg;
      
      // Mobile-specific container optimizations based on research
      const isMobile = window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      if (isMobile) {
        this.rendition.manager.container.style.overflow = 'hidden';
        
        if (isIOS) {
          // iOS benefits from hardware acceleration for smooth scrolling
          this.rendition.manager.container.style.webkitOverflowScrolling = 'touch';
          this.rendition.manager.container.style.webkitTransform = 'translateZ(0)';
        } else {
          // Android - avoid hardware acceleration which can cause problems
          this.rendition.manager.container.style.webkitTransform = 'none';
          this.rendition.manager.container.style.transform = 'none';
        }
      }
    }

    // Pre-style iframes with immediate styles
    const iframes = this.getIframes();
    iframes.forEach(iframe => {
      this.styleIframe(iframe, true);
      this.injectThemeStyles(iframe);
    });
  }

  private onContentRendered(view?: { iframe?: HTMLIFrameElement }) {
    // Apply theme to the specific view if provided
    if (view?.iframe) {
      this.styleIframe(view.iframe);
      this.injectThemeStyles(view.iframe);
      // CRITICAL: Adjust height for scrolled mode
      this.adjustIframeHeight(view.iframe);
    }

    // Ensure all iframes are styled and properly sized
    this.ensureThemeApplied();
    this.adjustAllIframeHeights();
  }

  private getIframes(): HTMLIFrameElement[] {
    if (!this.rendition.manager?.container) return [];
    return Array.from(this.rendition.manager.container.querySelectorAll("iframe"));
  }

  private styleIframe(iframe: HTMLIFrameElement, immediate = false) {
    const theme = THEME_CONFIG[this.currentTheme];
    
    // Style the iframe element itself
    iframe.style.backgroundColor = theme.background;
    
    // Always start with opacity 0 to prevent FOUC
    iframe.style.opacity = "0";
    iframe.style.transition = "opacity 0.15s ease-in-out";
    
    // Try to access iframe content immediately
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        // Inject styles before content is visible
        this.injectThemeStyles(iframe);
        
        // Style the document elements immediately
        if (doc.documentElement) {
          doc.documentElement.style.backgroundColor = theme.background;
          doc.documentElement.style.color = theme.color;
          doc.documentElement.style.visibility = "hidden";
        }
        if (doc.body) {
          doc.body.style.backgroundColor = theme.background;
          doc.body.style.color = theme.color;
          doc.body.style.visibility = "hidden";
        }
        
        // Show content after styles are applied
        requestAnimationFrame(() => {
          if (doc.documentElement) doc.documentElement.style.visibility = "visible";
          if (doc.body) doc.body.style.visibility = "visible";
          iframe.style.opacity = "1";
        });
      }
    } catch (e) {
      this.log("Cannot access iframe content:", e);
      // Fallback: show iframe after short delay
      setTimeout(() => {
        iframe.style.opacity = "1";
      }, 50);
    }
  }

  private injectThemeStyles(iframe: HTMLIFrameElement) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      // Remove any existing theme style
      const existingStyle = doc.getElementById("epub-theme-styles");
      if (existingStyle) {
        existingStyle.remove();
      }

      // Create immediate base style for FOUC prevention
      const theme = THEME_CONFIG[this.currentTheme];
      const immediateStyle = doc.createElement("style");
      immediateStyle.id = "epub-immediate-styles";
      immediateStyle.textContent = `
        html, body, * {
          background-color: ${theme.background} !important;
          color: ${theme.color} !important;
          transition: none !important;
        }
        a, a:hover, a:visited, a:active, a:focus {
          color: ${theme.color} !important;
          text-decoration: none !important;
          cursor: default !important;
        }
      `;
      
      // Inject immediately at document start
      if (doc.head) {
        doc.head.insertBefore(immediateStyle, doc.head.firstChild);
      } else if (doc.documentElement) {
        doc.documentElement.insertBefore(immediateStyle, doc.documentElement.firstChild);
      }

      // Create comprehensive style element
      const style = doc.createElement("style");
      style.id = "epub-theme-styles";
      style.textContent = this.generateThemeCSS();
      
      if (doc.head) {
        doc.head.appendChild(style);
      } else if (doc.documentElement) {
        doc.documentElement.appendChild(style);
      }
    } catch (e) {
      this.log("Cannot inject styles into iframe:", e);
    }
  }

  private generateThemeCSS(): string {
    const theme = THEME_CONFIG[this.currentTheme];
    
    return `
      /* Immediate FOUC prevention */
      html, body {
        visibility: visible !important;
        background-color: ${theme.background} !important;
        color: ${theme.color} !important;
        transition: background-color 0.3s ease, color 0.3s ease !important;
      }
      
      /* Base styling and theme colors */
      * {
        transition: background-color 0.3s ease, color 0.3s ease !important;
      }
      
      html {
        background-color: ${theme.background} !important;
        color: ${theme.color} !important;
        transition: background-color 0.3s ease, color 0.3s ease !important;
      }
      
      body {
        background-color: ${theme.background} !important;
        color: ${theme.color} !important;
        margin: 0 !important;
        padding: 40px 60px !important;
        font-family: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        font-size: ${this.fontSize}px !important;
        line-height: 1.7 !important;
        letter-spacing: -0.003em !important;
        font-weight: 400 !important;
        text-rendering: optimizeLegibility !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        font-feature-settings: "kern" 1, "liga" 1, "calt" 1 !important;
        hyphens: auto !important;
        word-break: normal !important;
        overflow-wrap: break-word !important;
        /* CRITICAL: Ensure content is scrollable and visible */
        overflow: visible !important;
        visibility: visible !important;
        display: block !important;
        position: relative !important;
        width: 100% !important;
        height: auto !important;
        /* Remove min-height constraint for proper content flow */
        min-height: unset !important;
        /* Mobile scrolling optimization */
        -webkit-overflow-scrolling: touch !important;
        scroll-behavior: smooth !important;
        transition: background-color 0.3s ease, color 0.3s ease !important;
      }

      /* Typography hierarchy - Apple/Kindle inspired */
      h1, h2, h3, h4, h5, h6 {
        background-color: transparent !important;
        color: ${theme.color} !important;
        font-family: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        font-weight: 600 !important;
        letter-spacing: -0.025em !important;
        margin: 1.5em 0 0.75em 0 !important;
        text-rendering: optimizeLegibility !important;
        transition: color 0.3s ease !important;
      }

      h1 {
        font-size: 2rem !important;
        line-height: 1.2 !important;
        margin-top: 0 !important;
      }

      h2 {
        font-size: 1.5rem !important;
        line-height: 1.3 !important;
      }

      h3 {
        font-size: 1.25rem !important;
        line-height: 1.4 !important;
      }

      h4, h5, h6 {
        font-size: 1.1rem !important;
        line-height: 1.5 !important;
        font-weight: 500 !important;
      }

      /* Paragraph and text styling */
      p {
        background-color: transparent !important;
        color: ${theme.color} !important;
        margin: 0 0 1.2em 0 !important;
        text-align: justify !important;
        text-justify: inter-word !important;
        orphans: 2 !important;
        widows: 2 !important;
        transition: color 0.3s ease !important;
      }

      p:last-child {
        margin-bottom: 0 !important;
      }

      /* Block elements */
      div, span, li, td, th {
        background-color: transparent !important;
        color: ${theme.color} !important;
        transition: color 0.3s ease !important;
      }

      /* Lists */
      ul, ol {
        margin: 1em 0 !important;
        padding-left: 1.5em !important;
      }

      li {
        margin-bottom: 0.5em !important;
        line-height: 1.6 !important;
      }

      /* Blockquotes */
      blockquote {
        background-color: transparent !important;
        color: ${this.currentTheme === "dark" ? "#a1a1aa" : "#6b7280"} !important;
        font-style: italic !important;
        margin: 1.5em 0 !important;
        padding: 0 1.5em !important;
        border-left: 3px solid ${this.currentTheme === "dark" ? "#374151" : "#d1d5db"} !important;
        transition: color 0.3s ease, border-color 0.3s ease !important;
      }

      /* Code and preformatted text */
      code, pre {
        font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace !important;
        background-color: ${this.currentTheme === "dark" ? "#1f2937" : "#f3f4f6"} !important;
        color: ${this.currentTheme === "dark" ? "#e5e7eb" : "#374151"} !important;
        transition: background-color 0.3s ease, color 0.3s ease !important;
      }

      code {
        font-size: 0.9em !important;
        padding: 0.2em 0.4em !important;
        border-radius: 3px !important;
      }

      pre {
        padding: 1em !important;
        border-radius: 6px !important;
        overflow-x: auto !important;
        margin: 1em 0 !important;
      }

      /* Make all links appear as plain text */
      a {
        color: ${theme.color} !important;
        text-decoration: none !important;
        cursor: default !important;
        font-weight: inherit !important;
        font-style: inherit !important;
        background-color: transparent !important;
        transition: color 0.3s ease !important;
      }

      a:hover, a:visited, a:active, a:focus {
        color: ${theme.color} !important;
        text-decoration: none !important;
        cursor: default !important;
        background-color: transparent !important;
        transition: color 0.3s ease !important;
      }

      /* Make footnotes appear as plain text */
      a[href*="#fn"], a[href*="footnote"], a[href*="note"], 
      .footnote, .footnote *, [class*="footnote"], [class*="footnote"] *,
      .fn, .fn *, [class*="fn"], [class*="fn"] *,
      sup a, sup a *, .sup a, .sup a *,
      [role="doc-noteref"], [role="doc-noteref"] *,
      [epub\\:type="noteref"], [epub\\:type="noteref"] * {
        color: ${theme.color} !important;
        background-color: transparent !important;
        text-decoration: none !important;
        cursor: default !important;
        font-weight: inherit !important;
        font-style: inherit !important;
        transition: color 0.3s ease !important;
      }

      /* Remove superscript styling from footnotes to make them truly plain */
      sup a {
        font-size: inherit !important;
        vertical-align: baseline !important;
        line-height: inherit !important;
      }

      /* Footnote content areas */
      .footnotes, [class*="footnote"], #footnotes, [role="doc-endnotes"],
      [epub\\:type="footnotes"], [epub\\:type="endnotes"] {
        border-top: 1px solid ${this.currentTheme === "dark" ? "#374151" : "#e5e7eb"} !important;
        margin-top: 2em !important;
        padding-top: 1em !important;
        font-size: 0.9em !important;
        transition: border-color 0.3s ease !important;
      }

      /* Superscript and subscript */
      sup, sub {
        font-size: 0.8em !important;
        line-height: 1 !important;
        color: ${theme.color} !important;
        transition: color 0.3s ease !important;
      }

      /* Emphasis and strong */
      em, i {
        font-style: italic !important;
        color: ${theme.color} !important;
        transition: color 0.3s ease !important;
      }

      strong, b {
        font-weight: 600 !important;
        color: ${theme.color} !important;
        transition: color 0.3s ease !important;
      }

      /* Tables */
      table {
        border-collapse: collapse !important;
        width: 100% !important;
        margin: 1.5em 0 !important;
      }

      th, td {
        border: 1px solid ${this.currentTheme === "dark" ? "#374151" : "#e5e7eb"} !important;
        padding: 0.75em !important;
        text-align: left !important;
        transition: border-color 0.3s ease !important;
      }

      th {
        background-color: ${this.currentTheme === "dark" ? "#1f2937" : "#f9fafb"} !important;
        font-weight: 600 !important;
        transition: background-color 0.3s ease !important;
      }

      /* Images */
      img {
        max-width: 100% !important;
        height: auto !important;
        opacity: ${this.currentTheme === "dark" ? "0.9" : "1"} !important;
        border-radius: 4px !important;
        margin: 1em 0 !important;
        transition: opacity 0.3s ease !important;
      }

      /* Selection styling */
      ::selection {
        background: ${theme.selectionBg} !important;
        color: ${theme.color} !important;
      }

      ::-moz-selection {
        background: ${theme.selectionBg} !important;
        color: ${theme.color} !important;
      }

      /* Fix for any remaining blue text - nuclear option */
      * {
        color: ${theme.color} !important;
        transition: color 0.3s ease !important;
      }

      /* Remove all hover text decorations for static text */
      *:hover {
        text-decoration: none !important;
      }

      /* All links should appear as plain text - no special colors */

      /* Ensure no hover effects on any elements */
      p:hover, span:hover, div:hover, li:hover, td:hover, th:hover, 
      h1:hover, h2:hover, h3:hover, h4:hover, h5:hover, h6:hover,
      em:hover, strong:hover, i:hover, b:hover {
        text-decoration: none !important;
        cursor: default !important;
      }

      /* Horizontal rules */
      hr {
        border: none !important;
        border-top: 1px solid ${this.currentTheme === "dark" ? "#374151" : "#e5e7eb"} !important;
        margin: 2em 0 !important;
        transition: border-color 0.3s ease !important;
      }

      /* Drop caps for elegant typography */
      p:first-child:first-letter {
        font-size: 3.5em !important;
        float: left !important;
        line-height: 0.8 !important;
        margin: 0.1em 0.1em 0 0 !important;
        font-weight: 400 !important;
        color: ${theme.color} !important;
        transition: color 0.3s ease !important;
      }
    `;
  }

  private ensureThemeApplied() {
    // Apply to all iframes
    const iframes = this.getIframes();
    iframes.forEach(iframe => {
      this.styleIframe(iframe, true);
      this.injectThemeStyles(iframe);
    });

    // Notify callbacks
    this.themeAppliedCallbacks.forEach(cb => cb());
  }

  public applyTheme(theme: Theme, force = false) {
    if (theme === this.currentTheme && !force) {
      this.log("Theme already applied:", theme);
      return;
    }

    this.log("Applying theme:", theme);
    this.currentTheme = theme;

    // Update rendition theme
    try {
      this.rendition.themes.select(theme);
    } catch (e) {
      this.log("Error selecting theme:", e);
    }

    // Ensure immediate application
    this.ensureThemeApplied();

    // Force a re-render if needed
    if (force && this.rendition.manager) {
      this.rendition.manager.updateLayout();
    }
  }

  public setTheme(theme: Theme) {
    this.applyTheme(theme, true);
  }

  public getTheme(): Theme {
    return this.currentTheme;
  }

  public forceContentRefresh() {
    this.log("Force content refresh requested");
    
    // Immediate iframe check and styling
    const iframes = this.getIframes();
    if (iframes.length === 0) {
      this.log("No iframes found for content refresh");
      return;
    }
    
    iframes.forEach(iframe => {
      // Ensure iframe is visible and styled
      this.styleIframe(iframe, true);
      this.injectThemeStyles(iframe);
      
      // CRITICAL: Fix iframe height for scrolled mode
      this.adjustIframeHeight(iframe);
      
      // Force theme reapplication
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          const theme = THEME_CONFIG[this.currentTheme];
          
          // Force background and text color immediately
          doc.documentElement.style.backgroundColor = theme.background;
          doc.documentElement.style.color = theme.color;
          doc.body.style.backgroundColor = theme.background;
          doc.body.style.color = theme.color;
          
          // Ensure all links are styled correctly
          const links = doc.querySelectorAll('a');
          links.forEach((link: HTMLElement) => {
            link.style.color = theme.color;
            link.style.textDecoration = 'none';
            link.style.cursor = 'default';
          });
          
          this.log("Content refresh applied to iframe");
        }
      } catch (e) {
        this.log("Cannot access iframe for content refresh:", e);
      }
    });
    
    // Ensure themes are reapplied
    this.ensureThemeApplied();
  }

  private adjustIframeHeight(iframe: HTMLIFrameElement) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc && doc.body) {
        // Wait for content to load and fonts to render
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const contentHeight = Math.max(
              doc.body.scrollHeight,
              doc.body.offsetHeight,
              doc.documentElement.clientHeight,
              doc.documentElement.scrollHeight,
              doc.documentElement.offsetHeight
            );
            
            if (contentHeight > 0) {
              iframe.style.height = contentHeight + 'px';
              this.log(`Adjusted iframe height to ${contentHeight}px`);
              
              // Also ensure the container adapts
              if (this.rendition.manager?.container) {
                this.rendition.manager.container.style.height = 'auto';
              }
            }
          });
        });
      }
    } catch (e) {
      this.log("Cannot adjust iframe height:", e);
    }
  }

  public adjustAllIframeHeights() {
    this.log("Adjusting all iframe heights for scrolled mode");
    const iframes = this.getIframes();
    iframes.forEach(iframe => this.adjustIframeHeight(iframe));
  }

  public setFontSize(fontSize: number) {
    if (fontSize === this.fontSize) return;
    
    this.log("Updating font size:", fontSize);
    this.fontSize = fontSize;
    
    // Re-register themes with new font size
    this.registerThemes();
    
    // Reapply current theme
    this.applyTheme(this.currentTheme, true);
  }

  public getFontSize(): number {
    return this.fontSize;
  }

  public onThemeApplied(callback: () => void) {
    this.themeAppliedCallbacks.add(callback);
    return () => this.themeAppliedCallbacks.delete(callback);
  }

  public destroy() {
    this.log("Destroying theme manager");
    this.destroyed = true;
    this.themeAppliedCallbacks.clear();
  }
}
