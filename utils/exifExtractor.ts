import exifr from 'exifr'
import { ImageMetadata } from '@/types'

export async function extractImageMetadata(file: File): Promise<ImageMetadata | null> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    
    // Extract all EXIF data including GPS
    // Try parsing with translated keys first (standardized field names)
    let exifData: any = null
    let gpsData: any = null
    let translatedData: any = null
    
    try {
      // First parse with translated keys to get standardized field names
      translatedData = await exifr.parse(arrayBuffer, {
        gps: true,
        translateKeys: true,
      })
      
      if (translatedData) {
        // Check for GPS in translated format
        if (translatedData.latitude !== undefined && translatedData.longitude !== undefined) {
          gpsData = {
            latitude: translatedData.latitude,
            longitude: translatedData.longitude,
          }
        }
      }
    } catch (e) {
      console.warn('Error parsing with translated keys:', e)
    }

    // Now parse with original keys (as requested)
    try {
      exifData = await exifr.parse(arrayBuffer, {
        pick: [
          'Make',
          'Model',
          'DateTimeOriginal',
          'DateTime',
          'CreateDate',
          'ModifyDate',
          'GPSLatitude',
          'GPSLongitude',
          'latitude',
          'longitude',
          'ImageWidth',
          'ImageHeight',
          'Software',
          'FileSize',
        ],
        translateKeys: false,
        translateValues: false,
        gps: true,
      })
    } catch (parseError) {
      console.warn('Error parsing EXIF data:', parseError)
      // Continue with empty exifData - we'll use defaults
      exifData = {}
    }

    // Always return metadata, even if EXIF data is missing
    // Don't return null - images without EXIF should still be processed
    // Ensure exifData is an object to avoid errors
    if (!exifData || typeof exifData !== 'object') {
      exifData = {}
    }

    // Extract folder path from file path (if available in webkitRelativePath)
    let folderPath = ''
    if ('webkitRelativePath' in file && (file as any).webkitRelativePath) {
      const relativePath = (file as any).webkitRelativePath
      const pathParts = relativePath.split('/')
      if (pathParts.length > 1) {
        // Remove filename, keep folder path
        pathParts.pop()
        folderPath = pathParts.join('/')
      }
    }
    
    const metadata: ImageMetadata = {
      filename: file.name,
      filepath: ('webkitRelativePath' in file && (file as any).webkitRelativePath) ? (file as any).webkitRelativePath : file.name,
      folder: folderPath || 'Root',
      file: file,
      make: exifData.Make || 'Unknown',
      model: exifData.Model || 'Unknown',
      device_id: `${exifData.Make || ''} ${exifData.Model || ''}`.trim() || 'Unknown',
      width: exifData.ImageWidth || 0,
      height: exifData.ImageHeight || 0,
      size_mb: file.size / (1024 * 1024),
      format: file.type.split('/')[1]?.toUpperCase() || 'UNKNOWN',
      software: exifData.Software || 'Unknown',
    }

    // Parse datetime - try multiple field names
    let dateTimeValue: any = exifData.DateTimeOriginal || exifData.DateTime || exifData.CreateDate || exifData.ModifyDate
    
    // If no datetime found, try from translated data
    if (!dateTimeValue && translatedData) {
      dateTimeValue = translatedData.DateTimeOriginal || translatedData.DateTime || translatedData.CreateDate || translatedData.ModifyDate
    }
    
    if (dateTimeValue) {
      const date = new Date(dateTimeValue)
      if (!isNaN(date.getTime())) {
        metadata.datetime_obj = date
        metadata.datetime = date.toISOString().replace('T', ' ').substring(0, 19)
      } else {
        // Try parsing as string if Date constructor fails
        console.warn('Failed to parse date:', dateTimeValue)
      }
    } else {
      console.warn('No datetime found in EXIF data for:', file.name)
    }

    // Parse GPS coordinates - try multiple sources
    let latitude: number | undefined
    let longitude: number | undefined

    // Try from main exifData
    if (exifData.GPSLatitude && exifData.GPSLongitude) {
      latitude = typeof exifData.GPSLatitude === 'number' ? exifData.GPSLatitude : parseFloat(exifData.GPSLatitude)
      longitude = typeof exifData.GPSLongitude === 'number' ? exifData.GPSLongitude : parseFloat(exifData.GPSLongitude)
    } else if (exifData.latitude && exifData.longitude) {
      latitude = typeof exifData.latitude === 'number' ? exifData.latitude : parseFloat(exifData.latitude)
      longitude = typeof exifData.longitude === 'number' ? exifData.longitude : parseFloat(exifData.longitude)
    }
    
    // Try from separate GPS data (check for undefined, not falsy, since 0 is valid)
    if ((latitude === undefined || longitude === undefined) && gpsData) {
      if (gpsData.latitude !== undefined) latitude = gpsData.latitude
      if (gpsData.longitude !== undefined) longitude = gpsData.longitude
    }

    if (latitude !== undefined && longitude !== undefined && !isNaN(latitude) && !isNaN(longitude)) {
      metadata.latitude = latitude
      metadata.longitude = longitude
      metadata.location = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    } else {
      metadata.location = 'No GPS'
      console.warn('No GPS data found in EXIF for:', file.name, 'Available fields:', Object.keys(exifData))
    }

    // Create thumbnail
    metadata.thumbnail = await createThumbnail(file)

    return metadata
  } catch (error) {
    console.error('Error extracting metadata:', error)
    return null
  }
}

async function createThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader()
      reader.onerror = () => {
        console.warn('Error reading file for thumbnail:', file.name)
        resolve('')
      }
      reader.onload = (e) => {
        try {
          const img = new Image()
          img.onerror = () => {
            console.warn('Error loading image for thumbnail:', file.name)
            resolve('')
          }
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              const size = 200
              canvas.width = size
              canvas.height = size
              
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.drawImage(img, 0, 0, size, size)
                resolve(canvas.toDataURL('image/jpeg', 0.85))
              } else {
                resolve('')
              }
            } catch (error) {
              console.warn('Error creating thumbnail canvas:', error)
              resolve('')
            }
          }
          img.src = e.target?.result as string
        } catch (error) {
          console.warn('Error creating image for thumbnail:', error)
          resolve('')
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.warn('Error creating thumbnail:', error)
      resolve('')
    }
  })
}



