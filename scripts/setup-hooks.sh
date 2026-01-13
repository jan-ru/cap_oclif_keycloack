#!/bin/bash

echo "🚀 Setting up development environment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "🔧 Initializing git repository..."
    git init
fi

# Initialize husky (modern way)
echo "🐕 Setting up Husky git hooks..."
npx husky init 2>/dev/null || echo "Husky already initialized"

# Make hooks executable
chmod +x .husky/pre-commit .husky/commit-msg 2>/dev/null || true

echo "✅ Development environment setup complete!"
echo ""
echo "📋 Available commands:"
echo "  npm test              - Run all tests"
echo "  npm run lint          - Run linting"
echo "  npm run lint:fix      - Fix linting issues"
echo "  npm run format        - Format code with Prettier"
echo "  npm run format:check  - Check code formatting"
echo "  npm run build         - Build the project"
echo "  npm run test:watch    - Run tests in watch mode"
echo "  npm run validate      - Run all checks (lint + test + build)"
echo ""
echo "🔧 Git hooks are now active:"
echo "  - Pre-commit: Runs linting, formatting, tests, and build"
echo "  - All checks must pass before commits are allowed"
echo ""
echo "🚀 GitHub Actions workflows configured:"
echo "  - CI/CD: Runs on push/PR (test on Node 18.x, 20.x, 22.x)"
echo "  - Security: Dependency auditing"
echo "  - Quality: Code formatting and advanced checks"
echo "  - Release: Automated releases on version tags"