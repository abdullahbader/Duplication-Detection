#!/bin/bash

# Initial server setup script for Contabo VPS
# Run this script as root on a fresh Ubuntu server
# Usage: sudo bash server-setup.sh

set -e

echo "🔧 Setting up server for Photo Timestamp Extractor..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install Git
echo "📦 Installing Git..."
apt install git -y

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
apt install nginx -y
systemctl enable nginx
systemctl start nginx

# Install Certbot
echo "📦 Installing Certbot..."
apt install certbot python3-certbot-nginx -y

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /var/www/photo-extractor
chown -R $SUDO_USER:$SUDO_USER /var/www/photo-extractor

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "✅ Server setup completed!"
echo ""
echo "Next steps:"
echo "1. Clone your repository: cd /var/www/photo-extractor && git clone https://github.com/abdullahbader/Duplication-Detection.git ."
echo "2. Install dependencies: npm install --production"
echo "3. Build: npm run build"
echo "4. Start with PM2: pm2 start npm --name 'photo-extractor' -- start"
echo "5. Save PM2: pm2 save && pm2 startup"
echo "6. Configure Nginx (see DEPLOYMENT.md)"
echo "7. Set up SSL: certbot --nginx -d yourdomain.com"
