/**
 * Shared CFI (Canonical Fragment Identifier) utilities
 * Prevents duplication across epub-renderer and position-restorer
 */

/**
 * Extract internal locator from EPUB CFI format
 * Removes the epubcfi() wrapper to get the internal format
 */
export function extractInternalLocator(cfi: string): string {
  const match = cfi.match(/^epubcfi\((.+)\)$/);
  return match?.[1] ?? cfi; // Fallback to original if not wrapped
}

/**
 * Wrap internal locator in EPUB CFI format
 */
export function wrapInternalLocator(locator: string): string {
  return `epubcfi(${locator})`;
}

/**
 * Validate CFI format
 */
export function isValidCfi(cfi: string): boolean {
  if (!cfi || typeof cfi !== 'string') return false;
  
  // Check for undefined or invalid markers
  if (cfi.includes('undefined') || cfi.trim() === '') return false;
  
  // Check for valid CFI patterns
  const internalLocator = extractInternalLocator(cfi);
  
  // Valid patterns: chapter-X-Y, X/CHAPTER_ID@relative, @scrollTop
  const patterns = [
    /^chapter-\d+-\d+$/,              // chapter-X-Y format
    /^\d+\/[^@]+@[0-9.]+$/,           // X/CHAPTER_ID@relative format
    /^@\d+(\.\d+)?$/                  // @scrollTop format
  ];
  
  return patterns.some(pattern => pattern.test(internalLocator));
}