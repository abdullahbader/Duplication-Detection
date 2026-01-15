#!/bin/bash

# Deployment script for Contabo VPS
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project directory
cd /var/www/photo-extractor || {
    echo -e "${RED}❌ Error: Directory /var/www/photo-extractor not found${NC}"
    exit 1
}

echo -e "${YELLOW}📥 Pulling latest changes from GitHub...${NC}"
git pull origin main || {
    echo -e "${RED}❌ Error: Failed to pull from GitHub${NC}"
    exit 1
}

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --production || {
    echo -e "${RED}❌ Error: Failed to install dependencies${NC}"
    exit 1
}

echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build || {
    echo -e "${RED}❌ Error: Build failed${NC}"
    exit 1
}

echo -e "${YELLOW}🔄 Restarting application...${NC}"
pm2 restart photo-extractor || {
    echo -e "${RED}❌ Error: Failed to restart PM2 process${NC}"
    exit 1
}

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}📊 Application status:${NC}"
pm2 status photo-extractor
