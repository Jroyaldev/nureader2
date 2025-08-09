# CodeRabbit Suggestion Automation

This repository includes automated workflows to apply CodeRabbit's code review suggestions automatically.

## How It Works

When CodeRabbit posts suggestions on a pull request, our GitHub Actions workflow automatically:

1. **Detects CodeRabbit comments** - Triggers when CodeRabbit posts a review
2. **Parses suggestions** - Extracts code suggestions from various formats:
   - Inline `suggestion` code blocks
   - Review tables with recommendations
   - Diff-style suggestions
3. **Applies changes** - Automatically applies code suggestions when possible
4. **Commits changes** - Pushes the changes back to the PR branch
5. **Reports status** - Comments on the PR with results

## Supported Suggestion Formats

### 1. Inline Suggestion Blocks
```markdown
```suggestion
// Your improved code here
```
```

### 2. Diff Suggestions
```diff
- old code
+ new code
```

### 3. Table Suggestions
These are parsed but typically require manual review as they're often descriptive.

## Files

- `.github/workflows/apply-coderabbit-suggestions.yml` - Main workflow
- `.github/scripts/apply-coderabbit-suggestions.js` - Node.js script for parsing

## Manual Trigger

You can also manually trigger the workflow by commenting on a PR with CodeRabbit suggestions.

## Limitations

- **Complex refactoring** - Suggestions that require understanding context beyond simple replacements need manual review
- **Descriptive suggestions** - When CodeRabbit provides guidance rather than exact code
- **Cross-file changes** - Suggestions that span multiple files may need manual coordination

## Configuration

The workflow runs automatically on CodeRabbit comments. No additional configuration needed.

## Security

- The workflow only runs on comments from `coderabbitai[bot]`
- Changes are committed with clear attribution
- All changes are visible in the PR for review

## Troubleshooting

If suggestions aren't being applied:

1. Check the Actions tab for workflow runs
2. Review the workflow logs for parsing errors
3. Ensure the suggestion format matches supported patterns
4. Some suggestions may intentionally require manual review

## Example

When CodeRabbit comments:
```markdown
**suggestion**: Use useCallback to memoize the function

```suggestion
const handleClick = useCallback(() => {
  // function body
}, [dependency]);
```
```

The workflow will:
1. Parse the suggestion
2. Find the relevant file
3. Apply the change
4. Commit with message: "Apply CodeRabbit suggestions"
5. Comment on the PR with the result