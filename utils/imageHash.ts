import { ImageMetadata } from '@/types'

// Simple perceptual hash implementation
export async function calculateImageHash(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 8 // 8x8 for hash
        canvas.width = size
        canvas.height = size
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve('')
          return
        }
        
        ctx.drawImage(img, 0, 0, size, size)
        const imageData = ctx.getImageData(0, 0, size, size)
        const pixels = imageData.data
        
        // Convert to grayscale and calculate average
        let sum = 0
        const grayscale: number[] = []
        for (let i = 0; i < pixels.length; i += 4) {
          const gray = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3
          grayscale.push(gray)
          sum += gray
        }
        const avg = sum / grayscale.length
        
        // Create hash
        let hash = ''
        for (const gray of grayscale) {
          hash += gray > avg ? '1' : '0'
        }
        
        resolve(hash)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function calculateHashDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return 64 // Max distance
  }
  
  let distance = 0
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++
    }
  }
  return distance
}

export function findSimilarImages(images: ImageMetadata[]): ImageMetadata[] {
  const imagesWithHashes = images.map(img => ({
    ...img,
    hash: img.hash || '',
  }))
  
  imagesWithHashes.forEach((img1, idx1) => {
    if (!img1.hash) return
    
    let closestMatch: string | null = null
    let closestDistance = 64
    const duplicateImages: string[] = []
    
    imagesWithHashes.forEach((img2, idx2) => {
      if (idx1 === idx2 || !img2.hash) return
      
      const distance = calculateHashDistance(img1.hash, img2.hash)
      
      if (distance === 0) {
        duplicateImages.push(img2.filename)
        if (closestMatch === null) {
          closestMatch = img2.filename
          closestDistance = 0
        }
      } else if (distance < closestDistance && distance <= 10) {
        closestMatch = img2.filename
        closestDistance = distance
      }
    })
    
    // Calculate similarity score (0-100)
    const similarityScore = closestDistance === 64 ? 0 : Math.max(0, 100 - (closestDistance / 64) * 100)
    
    img1.has_duplicate = duplicateImages.length > 0
    img1.closest_match = closestMatch || 'None'
    img1.similarity_score = Math.round(similarityScore)
    
    if (duplicateImages.length > 0) {
      img1.similarity_status = `🔴 Duplicate: ${duplicateImages.slice(0, 3).join(', ')}${duplicateImages.length > 3 ? ` (+${duplicateImages.length - 3} more)` : ''}`
    } else if (closestMatch && closestDistance <= 10) {
      img1.similarity_status = `🟡 Similar: ${closestMatch} (${Math.round(similarityScore)}% match, distance: ${closestDistance})`
    } else if (closestMatch) {
      img1.similarity_status = `🟢 Best Match: ${closestMatch} (${Math.round(similarityScore)}% match, distance: ${closestDistance})`
    } else {
      img1.similarity_status = '✅ Unique (no matches)'
    }
  })
  
  return imagesWithHashes
}



