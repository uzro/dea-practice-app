#!/bin/bash

# Setup script for git hooks configuration
# This script configures git to use the .githooks directory for hooks

echo "🔧 Setting up git hooks..."
echo "=================================="

# Configure git to use .githooks directory
git config core.hooksPath .githooks

# Make all hook scripts executable
chmod +x .githooks/pre-push 2>/dev/null || true

echo "✅ Git hooks setup completed successfully!"
echo "=================================="
echo ""
echo "📝 Now every 'git push' will run a build check before pushing."
echo "   If build fails, push will be blocked."
echo ""
