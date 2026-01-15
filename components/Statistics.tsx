'use client'

import { ImageMetadata } from '@/types'

interface StatisticsProps {
  data: ImageMetadata[]
}

export default function Statistics({ data }: StatisticsProps) {
  const totalImages = data.length
  const uniqueDevices = new Set(data.map(img => img.device_id).filter(Boolean)).size
  const totalSize = data.reduce((sum, img) => sum + (img.size_mb || 0), 0)
  
  // GPS statistics
  const imagesWithGPS = data.filter(img => 
    img.latitude !== undefined && 
    img.longitude !== undefined && 
    img.location && 
    img.location !== 'No GPS'
  ).length
  const imagesWithoutGPS = totalImages - imagesWithGPS
  
  const dateRange = data
    .map(img => img.datetime_obj)
    .filter(Boolean) as Date[]
  const timeSpan = dateRange.length > 0
    ? Math.ceil((Math.max(...dateRange.map(d => d.getTime())) - Math.min(...dateRange.map(d => d.getTime()))) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #6FDA44 0%, #37A000 100%)',
        borderRadius: '12px',
        padding: '24px',
        color: 'white',
        boxShadow: '0 4px 20px rgba(111, 218, 68, 0.3)'
      }}>
        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>Total Images</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{totalImages}</div>
      </div>
      
      <div style={{
        background: 'linear-gradient(135deg, #6FDA44 0%, #37A000 100%)',
        borderRadius: '8px',
        padding: '20px',
        color: 'white'
      }}>
        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '5px' }}>Unique Devices</div>
        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{uniqueDevices}</div>
      </div>
      
      <div style={{
        background: 'linear-gradient(135deg, #6FDA44 0%, #37A000 100%)',
        borderRadius: '8px',
        padding: '20px',
        color: 'white'
      }}>
        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '5px' }}>Time Span</div>
        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{timeSpan} days</div>
      </div>
      
      <div style={{
        background: 'linear-gradient(135deg, #37A000 0%, #6FDA44 100%)',
        borderRadius: '8px',
        padding: '20px',
        color: 'white'
      }}>
        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '5px' }}>Total Size</div>
        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{totalSize.toFixed(1)} MB</div>
      </div>
      
      <div style={{
        background: 'linear-gradient(135deg, #6FDA44 0%, #37A000 100%)',
        borderRadius: '8px',
        padding: '20px',
        color: 'white'
      }}>
        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '5px' }}>With GPS</div>
        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
          {imagesWithGPS}
          {totalImages > 0 && (
            <span style={{ fontSize: '1.2rem', fontWeight: '500', marginLeft: '8px', opacity: 0.9 }}>
              ({Math.round((imagesWithGPS / totalImages) * 100)}%)
            </span>
          )}
        </div>
      </div>
      
      {imagesWithoutGPS > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #37A000 0%, #6FDA44 100%)',
          borderRadius: '8px',
          padding: '20px',
          color: 'white'
        }}>
          <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '5px' }}>Without GPS</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {imagesWithoutGPS}
            {totalImages > 0 && (
              <span style={{ fontSize: '1.2rem', fontWeight: '500', marginLeft: '8px', opacity: 0.9 }}>
                ({Math.round((imagesWithoutGPS / totalImages) * 100)}%)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}



