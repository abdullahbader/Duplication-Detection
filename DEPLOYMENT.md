# Deployment Guide for Contabo VPS

This guide will help you deploy your Next.js application to a Contabo VPS server.

## Prerequisites

- A Contabo VPS instance (Ubuntu 20.04/22.04 recommended)
- SSH access to your server
- A domain name (optional but recommended)
- Git installed on your local machine

## Step 1: Set Up Your Contabo VPS

### 1.1 Create VPS Instance
1. Log in to your Contabo account
2. Create a new VPS (minimum 2GB RAM recommended)
3. Choose Ubuntu 22.04 LTS
4. Note your server IP address and root password

### 1.2 Connect to Your Server
```bash
ssh root@YOUR_SERVER_IP
```

## Step 2: Initial Server Setup

### 2.1 Update System
```bash
apt update && apt upgrade -y
```

### 2.2 Install Node.js (v18 or higher)
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2.3 Install Git
```bash
apt install git -y
```

### 2.4 Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### 2.5 Install Nginx (Reverse Proxy)
```bash
apt install nginx -y
systemctl enable nginx
systemctl start nginx
```

### 2.6 Install Certbot (for SSL)
```bash
apt install certbot python3-certbot-nginx -y
```

## Step 3: Deploy Your Application

### 3.1 Create Application Directory
```bash
mkdir -p /var/www/photo-extractor
cd /var/www/photo-extractor
```

### 3.2 Clone Your Repository
```bash
git clone https://github.com/abdullahbader/Duplication-Detection.git .
```

### 3.3 Install Dependencies
```bash
npm install --production
```

### 3.4 Build the Application
```bash
npm run build
```

### 3.5 Start with PM2
```bash
pm2 start npm --name "photo-extractor" -- start
pm2 save
pm2 startup
```

## Step 4: Configure Nginx

### 4.1 Create Nginx Configuration
```bash
nano /etc/nginx/sites-available/photo-extractor
```

Paste the following configuration (replace `yourdomain.com` with your domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4.2 Enable the Site
```bash
ln -s /etc/nginx/sites-available/photo-extractor /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## Step 5: Set Up SSL Certificate (Optional but Recommended)

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts to complete SSL setup.

## Step 6: Configure Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## Step 7: Set Up Auto-Deployment (Optional)

Create a deployment script:

```bash
nano /var/www/photo-extractor/deploy.sh
```

Add:
```bash
#!/bin/bash
cd /var/www/photo-extractor
git pull origin main
npm install --production
npm run build
pm2 restart photo-extractor
```

Make it executable:
```bash
chmod +x /var/www/photo-extractor/deploy.sh
```

## Troubleshooting

### Check PM2 Status
```bash
pm2 status
pm2 logs photo-extractor
```

### Check Nginx Status
```bash
systemctl status nginx
nginx -t
```

### Restart Services
```bash
pm2 restart photo-extractor
systemctl restart nginx
```

### View Logs
```bash
pm2 logs photo-extractor --lines 50
tail -f /var/log/nginx/error.log
```

## Updating Your Application

When you push changes to GitHub:

```bash
cd /var/www/photo-extractor
git pull origin main
npm install --production
npm run build
pm2 restart photo-extractor
```

Or use the deploy script:
```bash
/var/www/photo-extractor/deploy.sh
```

## Performance Optimization

### Enable PM2 Cluster Mode (for better performance)
```bash
pm2 delete photo-extractor
pm2 start npm --name "photo-extractor" -i max -- start
pm2 save
```

### Set Up Nginx Caching (Optional)
Add to your Nginx config:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m use_temp_path=off;

server {
    # ... existing config ...
    
    location / {
        proxy_cache my_cache;
        proxy_cache_valid 200 60m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        # ... rest of proxy settings ...
    }
}
```

## Security Checklist

- [ ] Change default SSH port (optional)
- [ ] Set up SSH key authentication
- [ ] Configure firewall (UFW)
- [ ] Install SSL certificate
- [ ] Keep system updated: `apt update && apt upgrade`
- [ ] Set up automatic security updates
- [ ] Configure fail2ban (optional)

## Monitoring

### PM2 Monitoring Dashboard
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Set Up Uptime Monitoring
Consider using services like:
- UptimeRobot (free)
- Pingdom
- StatusCake

## Backup Strategy

1. **Code**: Already backed up on GitHub
2. **Database**: If you add one later
3. **Files**: Set up regular backups of `/var/www/photo-extractor`

Example backup script:
```bash
#!/bin/bash
tar -czf /backup/photo-extractor-$(date +%Y%m%d).tar.gz /var/www/photo-extractor
```
