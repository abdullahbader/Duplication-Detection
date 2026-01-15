# Installation Guide

## Step 1: Install Node.js

**npm is not installed on your system.** You need to install Node.js first, which includes npm.

### Download Node.js:

1. Go to: https://nodejs.org/
2. Download the **LTS version** (recommended)
3. Run the installer
4. Follow the installation wizard (accept all defaults)
5. **Restart your terminal/command prompt** after installation

### Verify Installation:

After installing Node.js, open a **NEW** terminal/command prompt and run:

```bash
node --version
npm --version
```

You should see version numbers (e.g., v18.17.0 and 9.6.7)

## Step 2: Install Project Dependencies

Once Node.js is installed, navigate to the project folder and run:

```bash
cd "c:\Users\DP\OneDrive\Desktop\find the ball\photo-extractor"
npm install
```

This will install all required packages (may take a few minutes).

## Step 3: Run the Development Server

```bash
npm run dev
```

Then open your browser to: **http://localhost:3000**

## Troubleshooting

### If npm is still not recognized:

1. **Restart your computer** after installing Node.js
2. Or manually add Node.js to PATH:
   - Find where Node.js was installed (usually `C:\Program Files\nodejs\`)
   - Add it to your system PATH environment variable

### Alternative: Use nvm-windows

If you prefer a Node.js version manager:
1. Download nvm-windows from: https://github.com/coreybutler/nvm-windows/releases
2. Install it
3. Run: `nvm install lts` then `nvm use lts`

## Quick Start (After Node.js is installed)

```bash
# Navigate to project
cd "c:\Users\DP\OneDrive\Desktop\find the ball\photo-extractor"

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at http://localhost:3000



