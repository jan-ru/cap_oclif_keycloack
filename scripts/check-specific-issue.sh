#!/bin/bash

# Check specific issue status
# Usage: ./scripts/check-specific-issue.sh <issue-name>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <issue-name>"
    echo "Example: $0 feature-05-yaml-parsing"
    echo ""
    echo "Available issues:"
    ls .github/issues/ | sed 's/.md$//' | sed 's/^/  - /'
    exit 1
fi

ISSUE_NAME="$1"
ISSUE_FILE=".github/issues/${ISSUE_NAME}.md"

if [ ! -f "$ISSUE_FILE" ]; then
    echo "❌ Issue file not found: $ISSUE_FILE"
    echo ""
    echo "Available issues:"
    ls .github/issues/ | sed 's/.md$//' | sed 's/^/  - /'
    exit 1
fi

echo "🔍 Checking Issue: $ISSUE_NAME"
echo "================================"
echo ""

# Check if mentioned in commits
echo "📝 Commit History:"
COMMITS=$(git log --oneline --grep="$ISSUE_NAME" --grep="Closes: $ISSUE_NAME")
if [ -n "$COMMITS" ]; then
    echo "✅ Found in commits:"
    echo "$COMMITS"
else
    echo "❌ Not mentioned in any commits"
fi
echo ""

# Show issue content
echo "📋 Issue Details:"
echo "-----------------"
head -20 "$ISSUE_FILE"
echo ""
echo "... (see full file at $ISSUE_FILE)"
echo ""

# Check acceptance criteria if present
if grep -q "Acceptance Criteria" "$ISSUE_FILE"; then
    echo "✅ Has acceptance criteria defined"
else
    echo "⚠️  No acceptance criteria found"
fi

# Check if it's referenced in tasks
if grep -q "$ISSUE_NAME" .kiro/specs/financial-reports-cli/tasks.md; then
    echo "✅ Referenced in implementation tasks"
else
    echo "❌ Not referenced in implementation tasks"
fi

echo ""
echo "💡 To see full issue details: cat $ISSUE_FILE"