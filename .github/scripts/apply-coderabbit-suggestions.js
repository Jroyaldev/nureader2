#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Parse CodeRabbit suggestions from PR comments
 * Handles both inline suggestions and review table suggestions
 */
class CodeRabbitSuggestionApplier {
  constructor(commentBody) {
    this.commentBody = commentBody;
    this.suggestions = [];
    this.results = [];
  }

  /**
   * Main entry point to parse and apply suggestions
   */
  async apply() {
    this.parseSuggestions();
    
    if (this.suggestions.length === 0) {
      console.log('No suggestions found in comment');
      return {
        success: false,
        message: 'No suggestions found',
        suggestions: []
      };
    }

    console.log(`Found ${this.suggestions.length} suggestion(s)`);
    
    for (const suggestion of this.suggestions) {
      await this.applySuggestion(suggestion);
    }

    return {
      success: true,
      total: this.suggestions.length,
      applied: this.results.filter(r => r.status === 'applied').length,
      failed: this.results.filter(r => r.status === 'failed').length,
      results: this.results
    };
  }

  /**
   * Parse suggestions from CodeRabbit comment
   */
  parseSuggestions() {
    // Parse inline code suggestions (```suggestion blocks)
    this.parseInlineSuggestions();
    
    // Parse review suggestions from tables
    this.parseTableSuggestions();
    
    // Parse diff suggestions
    this.parseDiffSuggestions();
  }

  /**
   * Parse inline suggestions with ```suggestion blocks
   */
  parseInlineSuggestions() {
    const lines = this.commentBody.split('\n');
    let currentFile = null;
    let currentLineStart = null;
    let currentLineEnd = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for file references
      const fileMatch = line.match(/(?:epub-reader\/)?src\/[^\s`]+\.(tsx?|jsx?)/);
      if (fileMatch) {
        currentFile = fileMatch[0];
      }
      
      // Look for line number references
      const lineMatch = line.match(/(?:Line|Lines?) (\d+)(?:-(\d+))?/);
      if (lineMatch) {
        currentLineStart = parseInt(lineMatch[1]);
        currentLineEnd = lineMatch[2] ? parseInt(lineMatch[2]) : currentLineStart;
      }
      
      // Look for suggestion blocks
      if (line.trim() === '```suggestion') {
        let suggestionContent = '';
        let originalContent = '';
        
        // Check if there was an original code block before this
        if (i > 0) {
          let j = i - 1;
          while (j >= 0 && !lines[j].includes('```')) {
            j--;
          }
          if (j >= 0 && lines[j].includes('```')) {
            j++;
            while (j < i && !lines[j].includes('```')) {
              if (!lines[j].startsWith('```suggestion')) {
                originalContent += lines[j] + '\n';
              }
              j++;
            }
          }
        }
        
        // Get suggestion content
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          suggestionContent += lines[i] + '\n';
          i++;
        }
        
        if (currentFile && suggestionContent) {
          this.suggestions.push({
            file: this.normalizeFilePath(currentFile),
            lineStart: currentLineStart,
            lineEnd: currentLineEnd,
            original: originalContent.trim(),
            suggestion: suggestionContent.trim(),
            type: 'inline'
          });
        }
      }
    }
  }

  /**
   * Parse suggestions from review tables
   */
  parseTableSuggestions() {
    // Look for tables with suggestions
    const tableRegex = /\|[^\n]+\|\n\|[-:\s|]+\|\n((?:\|[^\n]+\|\n?)+)/g;
    let match;
    
    while ((match = tableRegex.exec(this.commentBody)) !== null) {
      const tableContent = match[0];
      const rows = tableContent.split('\n')
        .filter(row => row.trim() && !row.includes('---'))
        .slice(1); // Skip header
      
      for (const row of rows) {
        const cells = row.split('|').filter(cell => cell.trim());
        
        if (cells.length >= 2) {
          // Extract file path
          const fileMatch = cells[0].match(/`([^`]+\.(tsx?|jsx?))`/);
          if (fileMatch) {
            const file = fileMatch[1];
            const suggestion = cells[cells.length - 1].trim();
            
            // Extract line numbers if present
            const lineMatch = cells[0].match(/(?:line|Line) (\d+)(?:-(\d+))?/);
            const lineStart = lineMatch ? parseInt(lineMatch[1]) : null;
            const lineEnd = lineMatch && lineMatch[2] ? parseInt(lineMatch[2]) : lineStart;
            
            this.suggestions.push({
              file: this.normalizeFilePath(file),
              lineStart,
              lineEnd,
              suggestion: suggestion,
              type: 'table'
            });
          }
        }
      }
    }
  }

  /**
   * Parse diff-style suggestions
   */
  parseDiffSuggestions() {
    const diffRegex = /```diff\n([\s\S]*?)```/g;
    let match;
    
    while ((match = diffRegex.exec(this.commentBody)) !== null) {
      const diffContent = match[1];
      const lines = diffContent.split('\n');
      
      let currentFile = null;
      let removals = [];
      let additions = [];
      
      for (const line of lines) {
        // Check for file reference
        if (line.startsWith('---') || line.startsWith('+++')) {
          const fileMatch = line.match(/[ab]\/(.+\.(tsx?|jsx?))/);
          if (fileMatch) {
            currentFile = fileMatch[1];
          }
        }
        // Collect removals and additions
        else if (line.startsWith('-') && !line.startsWith('---')) {
          removals.push(line.substring(1));
        } else if (line.startsWith('+') && !line.startsWith('+++')) {
          additions.push(line.substring(1));
        }
      }
      
      if (currentFile && (removals.length > 0 || additions.length > 0)) {
        this.suggestions.push({
          file: this.normalizeFilePath(currentFile),
          original: removals.join('\n'),
          suggestion: additions.join('\n'),
          type: 'diff'
        });
      }
    }
  }

  /**
   * Normalize file paths
   */
  normalizeFilePath(file) {
    // Remove leading slash if present
    file = file.replace(/^\//, '');
    
    // Add epub-reader prefix if not present and file is in src/
    if (file.startsWith('src/') && !file.startsWith('epub-reader/')) {
      file = `epub-reader/${file}`;
    }
    
    return file;
  }

  /**
   * Apply a single suggestion to a file
   */
  async applySuggestion(suggestion) {
    try {
      const filePath = path.resolve(suggestion.file);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        // Try to find the file
        const basename = path.basename(suggestion.file);
        const findCmd = `find . -name "${basename}" -type f 2>/dev/null | head -1`;
        const foundFile = execSync(findCmd, { encoding: 'utf-8' }).trim();
        
        if (foundFile) {
          suggestion.file = foundFile.replace('./', '');
        } else {
          throw new Error(`File not found: ${suggestion.file}`);
        }
      }
      
      // Read current file content
      const currentContent = fs.readFileSync(suggestion.file, 'utf-8');
      const lines = currentContent.split('\n');
      
      let newContent = currentContent;
      
      // Apply based on suggestion type
      if (suggestion.type === 'inline' && suggestion.lineStart) {
        // Replace specific lines
        const startIdx = suggestion.lineStart - 1;
        const endIdx = suggestion.lineEnd ? suggestion.lineEnd : suggestion.lineStart;
        
        const newLines = [...lines];
        const suggestionLines = suggestion.suggestion.split('\n');
        
        // Replace the lines
        newLines.splice(startIdx, endIdx - startIdx, ...suggestionLines);
        newContent = newLines.join('\n');
      }
      else if (suggestion.type === 'diff' || (suggestion.type === 'inline' && suggestion.original)) {
        // Find and replace based on original content
        if (suggestion.original) {
          // Escape special regex characters
          const escapedOriginal = suggestion.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedOriginal, 'g');
          
          if (currentContent.includes(suggestion.original)) {
            newContent = currentContent.replace(suggestion.original, suggestion.suggestion);
          } else {
            // Try fuzzy matching (remove extra whitespace)
            const normalizedOriginal = suggestion.original.replace(/\s+/g, ' ').trim();
            const normalizedContent = currentContent.replace(/\s+/g, ' ');
            
            if (normalizedContent.includes(normalizedOriginal)) {
              console.log('Using fuzzy matching for replacement');
              // This is more complex and would need better implementation
              throw new Error('Fuzzy matching not fully implemented');
            } else {
              throw new Error('Original content not found in file');
            }
          }
        } else {
          // For simple replacements, try to find the pattern
          if (suggestion.suggestion.includes('useCallback')) {
            // Special handling for useCallback suggestions
            newContent = this.applyUseCallbackSuggestion(currentContent, suggestion);
          } else {
            throw new Error('Cannot apply suggestion without original content or line numbers');
          }
        }
      }
      else if (suggestion.type === 'table') {
        // Table suggestions often describe what to do rather than provide exact code
        console.log(`Table suggestion for ${suggestion.file}: ${suggestion.suggestion}`);
        console.log('Manual review required for this suggestion');
        
        this.results.push({
          file: suggestion.file,
          status: 'review_required',
          message: suggestion.suggestion
        });
        return;
      }
      
      // Write the new content if changed
      if (newContent !== currentContent) {
        fs.writeFileSync(suggestion.file, newContent, 'utf-8');
        
        this.results.push({
          file: suggestion.file,
          status: 'applied',
          message: 'Successfully applied suggestion'
        });
        
        console.log(`✅ Applied suggestion to ${suggestion.file}`);
      } else {
        this.results.push({
          file: suggestion.file,
          status: 'no_change',
          message: 'No changes needed'
        });
      }
      
    } catch (error) {
      console.error(`❌ Failed to apply suggestion to ${suggestion.file}: ${error.message}`);
      
      this.results.push({
        file: suggestion.file,
        status: 'failed',
        error: error.message
      });
    }
  }

  /**
   * Special handler for useCallback suggestions
   */
  applyUseCallbackSuggestion(content, suggestion) {
    // This would need to be implemented based on specific patterns
    // For now, return unchanged content
    console.log('useCallback suggestion detected but not automatically applied');
    return content;
  }
}

// Main execution
if (require.main === module) {
  const commentBody = process.env.COMMENT_BODY || fs.readFileSync(0, 'utf-8');
  
  const applier = new CodeRabbitSuggestionApplier(commentBody);
  
  applier.apply().then(result => {
    console.log(JSON.stringify(result, null, 2));
    
    if (result.applied > 0) {
      process.exit(0);
    } else if (result.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = CodeRabbitSuggestionApplier;