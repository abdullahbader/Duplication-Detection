# Setup Instructions

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Installation Steps

1. **Navigate to the project directory:**
   ```bash
   cd photo-extractor
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Building for Production

```bash
npm run build
npm start
```

## Features Implemented

✅ Image upload (single, multiple, folder)
✅ EXIF metadata extraction
✅ Image similarity detection using hashing
✅ **Hover preview functionality** (works perfectly in React!)
✅ Search and filter
✅ Sort and pagination
✅ Statistics dashboard
✅ Responsive design

## Next Steps (Optional)

- Add export to Excel/JSON functionality
- Add visualizations (timeline, maps, charts)
- Add more advanced filtering options
- Add batch operations

## Troubleshooting

If you encounter issues:

1. Make sure Node.js version is 18 or higher:
   ```bash
   node --version
   ```

2. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Check for TypeScript errors:
   ```bash
   npm run lint
   ```



