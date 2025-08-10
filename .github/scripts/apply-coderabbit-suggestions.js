#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Parse CodeRabbit suggestions from PR comments
 * Handles AI Agent prompts, inline suggestions, and review table suggestions
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
    // Parse AI Agent prompts (primary format)
    this.parseAIAgentPrompts();
    
    // Parse inline code suggestions (```suggestion blocks)
    this.parseInlineSuggestions();
    
    // Parse review suggestions from tables
    this.parseTableSuggestions();
    
    // Parse diff suggestions
    this.parseDiffSuggestions();
  }

  /**
   * Parse AI Agent prompts from CodeRabbit comments
   * These are natural language instructions in "🤖 Prompt for AI Agents" sections
   */
  parseAIAgentPrompts() {
    // Look for AI Agent prompt sections
    const aiAgentRegex = /<summary>🤖 Prompt for AI Agents<\/summary>\s*```([\s\S]*?)```/g;
    let match;
    
    while ((match = aiAgentRegex.exec(this.commentBody)) !== null) {
      const promptContent = match[1].trim();
      
      if (promptContent) {
        this.suggestions.push({
          type: 'ai_agent',
          prompt: promptContent,
          instruction: this.extractInstructionFromPrompt(promptContent)
        });
      }
    }
    
    // Also handle simpler format without code blocks
    const simpleAIAgentRegex = /<summary>🤖 Prompt for AI Agents<\/summary>\s*([\s\S]*?)(?=<\/details>|$)/g;
    
    while ((match = simpleAIAgentRegex.exec(this.commentBody)) !== null) {
      let promptContent = match[1].trim();
      
      // Remove any markdown formatting
      promptContent = promptContent.replace(/```[\s\S]*?```/g, '').trim();
      
      if (promptContent && !promptContent.includes('```')) {
        this.suggestions.push({
          type: 'ai_agent',
          prompt: promptContent,
          instruction: this.extractInstructionFromPrompt(promptContent)
        });
      }
    }
  }
  
  /**
   * Extract key information from AI Agent prompts
   */
  extractInstructionFromPrompt(prompt) {
    // Extract file path if mentioned
    const fileMatch = prompt.match(/In ([^\s]+\.(?:ts|tsx|js|jsx|yml|yaml|json))/);
    const file = fileMatch ? fileMatch[1] : null;
    
    // Extract line numbers if mentioned
    const lineMatch = prompt.match(/around lines? (\d+)(?: to (\d+))?/);
    const lineStart = lineMatch ? parseInt(lineMatch[1]) : null;
    const lineEnd = lineMatch && lineMatch[2] ? parseInt(lineMatch[2]) : lineStart;
    
    return {
      file: file ? this.normalizeFilePath(file) : null,
      lineStart,
      lineEnd,
      description: prompt
    };
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
   * Apply a single suggestion to a file with retry logic
   */
  async applySuggestion(suggestion, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this._applySuggestionImpl(suggestion);
      } catch (error) {
        console.error(`Attempt ${attempt}/${retries} failed: ${error.message}`);
        if (attempt === retries) {
          throw error;
        }
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /**
   * Internal implementation of applying a suggestion
   */
  async _applySuggestionImpl(suggestion) {
    const startTime = Date.now();
    let backupPath = null;
    
    try {
      // Handle AI Agent prompts by delegating to Claude Code
      if (suggestion.type === 'ai_agent') {
        return await this.applyAIAgentPrompt(suggestion);
      }
      
      const filePath = path.resolve(suggestion.file);
      
      // Validate file exists
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
      
      // Create backup before modification
      backupPath = `${suggestion.file}.backup.${Date.now()}`;
      fs.copyFileSync(suggestion.file, backupPath);
      
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
          // Simple string replacement (no regex needed for exact matches)
          
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
            newContent = this.applyUseCallbackSuggestion(currentContent);
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
      
      // Validate the changes before applying
      if (!this.validateChanges(currentContent, newContent)) {
        throw new Error('Validation failed: Changes would break the file');
      }
      
      // Write the new content if changed
      if (newContent !== currentContent) {
        fs.writeFileSync(suggestion.file, newContent, 'utf-8');
        
        // Verify the file was written correctly
        const verifyContent = fs.readFileSync(suggestion.file, 'utf-8');
        if (verifyContent !== newContent) {
          // Restore from backup
          fs.copyFileSync(backupPath, suggestion.file);
          throw new Error('File write verification failed');
        }
        
        // Clean up backup on success
        if (backupPath) fs.unlinkSync(backupPath);
        
        const duration = Date.now() - startTime;
        
        this.results.push({
          file: suggestion.file,
          status: 'applied',
          message: 'Successfully applied suggestion',
          duration: duration,
          linesChanged: Math.abs(newContent.split('\n').length - currentContent.split('\n').length)
        });
        
        console.log(`✅ Applied suggestion to ${suggestion.file} (${duration}ms)`);
      } else {
        // Clean up backup
        if (backupPath) fs.unlinkSync(backupPath);
        
        this.results.push({
          file: suggestion.file,
          status: 'no_change',
          message: 'No changes needed'
        });
      }
      
    } catch (error) {
      // Restore from backup if it exists
      if (backupPath && fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, suggestion.file);
        fs.unlinkSync(backupPath);
      }
      
      console.error(`❌ Failed to apply suggestion to ${suggestion.file}: ${error.message}`);
      
      this.results.push({
        file: suggestion.file,
        status: 'failed',
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  /**
   * Validate changes before applying
   */
  validateChanges(originalContent, newContent) {
    // Basic validation checks
    
    // Check for balanced braces
    const countChar = (str, char) => (str.match(new RegExp('\\' + char, 'g')) || []).length;
    const braces = ['{', '}', '[', ']', '(', ')'];
    
    for (let i = 0; i < braces.length; i += 2) {
      const openCount = countChar(newContent, braces[i]);
      const closeCount = countChar(newContent, braces[i + 1]);
      if (openCount !== closeCount) {
        console.error(`Validation failed: Unbalanced ${braces[i]}${braces[i + 1]} - open: ${openCount}, close: ${closeCount}`);
        return false;
      }
    }
    
    // Check for syntax markers that shouldn't be in final code
    const invalidPatterns = [
      '<<<<<<< HEAD',
      '>>>>>>>',
      '======='
    ];
    
    for (const pattern of invalidPatterns) {
      if (newContent.includes(pattern)) {
        console.error(`Validation failed: Found merge conflict marker: ${pattern}`);
        return false;
      }
    }
    
    // Check file size isn't drastically different (potential corruption)
    const sizeDiff = Math.abs(newContent.length - originalContent.length);
    const sizeRatio = sizeDiff / originalContent.length;
    
    if (sizeRatio > 0.5 && sizeDiff > 1000) {
      console.error(`Validation failed: File size changed dramatically (${(sizeRatio * 100).toFixed(1)}%)`);
      return false;
    }
    
    return true;
  }

  /**
   * Apply AI Agent prompt by calling Claude Code
   */
  async applyAIAgentPrompt(suggestion) {
    const startTime = Date.now();
    
    try {
      console.log('Processing AI Agent prompt:', suggestion.prompt.substring(0, 100) + '...');
      
      // Check if Claude CLI is available
      try {
        execSync('claude --version', { stdio: 'ignore' });
      } catch {
        throw new Error('Claude CLI not found. Please install Claude Code first.');
      }
      
      // Create a temporary file with the prompt
      const promptFile = path.join(process.cwd(), `claude-prompt-${Date.now()}.txt`);
      fs.writeFileSync(promptFile, suggestion.prompt);
      
      try {
        // Execute Claude Code with the prompt (using --print for non-interactive and bypassing permissions)
        const claudeCommand = `claude --print --dangerously-skip-permissions < "${promptFile}"`;
        console.log('Executing Claude Code...');
        
        const result = execSync(claudeCommand, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 300000, // 5 minutes timeout
          cwd: process.cwd()
        });
        
        console.log('Claude Code execution completed');
        console.log('Output:', result.substring(0, 500) + (result.length > 500 ? '...' : ''));
        
        // Clean up temporary file
        fs.unlinkSync(promptFile);
        
        const duration = Date.now() - startTime;
        
        this.results.push({
          type: 'ai_agent',
          status: 'applied',
          message: 'Successfully applied AI Agent prompt via Claude Code',
          duration: duration,
          output: result.substring(0, 1000) // Limit stored output
        });
        
        console.log(`✅ Applied AI Agent prompt via Claude Code (${duration}ms)`);
        
      } catch (claudeError) {
        // Clean up temporary file on error
        if (fs.existsSync(promptFile)) {
          fs.unlinkSync(promptFile);
        }
        throw claudeError;
      }
      
    } catch (error) {
      console.error(`❌ Failed to apply AI Agent prompt: ${error.message}`);
      
      this.results.push({
        type: 'ai_agent',
        status: 'failed',
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  /**
   * Special handler for useCallback suggestions
   */
  applyUseCallbackSuggestion(content) {
    // This would need to be implemented based on specific patterns
    // For now, return unchanged content
    console.log('useCallback suggestion detected but not automatically applied');
    return content;
  }

  /**
   * Generate execution log
   */
  generateExecutionLog() {
    return {
      timestamp: new Date().toISOString(),
      commentBody: this.commentBody.substring(0, 500) + '...',
      suggestionsFound: this.suggestions.length,
      results: this.results,
      statistics: {
        applied: this.results.filter(r => r.status === 'applied').length,
        failed: this.results.filter(r => r.status === 'failed').length,
        reviewRequired: this.results.filter(r => r.status === 'review_required').length,
        noChange: this.results.filter(r => r.status === 'no_change').length,
        totalDuration: this.results.reduce((sum, r) => sum + (r.duration || 0), 0),
        totalLinesChanged: this.results.reduce((sum, r) => sum + (r.linesChanged || 0), 0)
      }
    };
  }
}

// Main execution
if (require.main === module) {
  const commentBody = process.env.COMMENT_BODY || fs.readFileSync(0, 'utf-8');
  
  const applier = new CodeRabbitSuggestionApplier(commentBody);
  
  applier.apply().then(result => {
    // Generate execution log
    const executionLog = applier.generateExecutionLog();
    
    // Write execution log to file for audit trail
    const logFile = `coderabbit-execution-${Date.now()}.json`;
    fs.writeFileSync(logFile, JSON.stringify(executionLog, null, 2));
    console.log(`Execution log saved to: ${logFile}`);
    
    // Output result for GitHub Actions
    console.log(JSON.stringify(result, null, 2));
    
    // Set exit code based on results
    if (result.applied > 0) {
      console.log(`\n✅ Successfully applied ${result.applied} suggestion(s)`);
      process.exit(0);
    } else if (result.failed > 0) {
      console.error(`\n⚠️ Failed to apply ${result.failed} suggestion(s)`);
      process.exit(1);
    } else {
      console.log('\n📝 No actionable suggestions found');
      process.exit(0);
    }
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = CodeRabbitSuggestionApplier;