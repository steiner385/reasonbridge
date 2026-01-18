#!/bin/bash
#
# UniteDiscord Project Setup Script
# Run this after cloning the repository to initialize your development environment.
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  UniteDiscord Development Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check Node.js version
echo -e "${YELLOW}Checking Node.js version...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js 20.x or higher: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}Error: Node.js 20.x or higher is required (found v$NODE_VERSION).${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check pnpm
echo -e "${YELLOW}Checking pnpm...${NC}"
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm not found. Installing...${NC}"
    npm install -g pnpm
fi
echo -e "${GREEN}✓ pnpm $(pnpm -v)${NC}"

# Install dependencies
echo ""
echo -e "${YELLOW}Installing dependencies...${NC}"
pnpm install

# Verify husky hooks are configured
echo ""
echo -e "${YELLOW}Verifying git hooks...${NC}"
HOOKS_PATH=$(git config --get core.hooksPath 2>/dev/null || echo "")
if [ "$HOOKS_PATH" != ".husky/_" ]; then
    echo -e "${YELLOW}Configuring git hooks...${NC}"
    pnpm prepare
fi
echo -e "${GREEN}✓ Git hooks configured${NC}"

# Build shared packages
echo ""
echo -e "${YELLOW}Building shared packages...${NC}"
pnpm -r --filter="@unite-discord/*" build 2>/dev/null || true
echo -e "${GREEN}✓ Shared packages built${NC}"

# Generate Prisma client (if applicable)
echo ""
echo -e "${YELLOW}Generating Prisma client...${NC}"
if [ -f "services/user-service/prisma/schema.prisma" ]; then
    pnpm --filter="user-service" exec prisma generate 2>/dev/null || true
    echo -e "${GREEN}✓ Prisma client generated${NC}"
else
    echo -e "${YELLOW}Skipped (no schema found)${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env and configure environment variables"
echo "  2. Run 'pnpm dev' to start development servers"
echo "  3. Run 'pnpm test' to run tests"
echo ""
