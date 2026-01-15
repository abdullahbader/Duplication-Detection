'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { ImageMetadata } from '@/types'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// Dynamically import map component to avoid SSR issues
const MapComponent = dynamic(() => import('./MapComponent'), { 
  ssr: false,
  loading: () => <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: '8px' }}>Loading map...</div>
})

interface VisualizationsProps {
  data: ImageMetadata[]
  selectedImages?: Set<string>
  allData?: ImageMetadata[]
}

export default function Visualizations({ data, selectedImages = new Set(), allData }: VisualizationsProps) {
  const [mapKey, setMapKey] = useState(0)
  const [showOnlySelected, setShowOnlySelected] = useState(false)

  // Determine which data to use
  const displayData = showOnlySelected && selectedImages.size > 0
    ? data.filter(img => selectedImages.has(img.filename))
    : data

  // Filter images with GPS data
  const imagesWithGPS = displayData.filter(img => img.latitude !== undefined && img.longitude !== undefined && img.location !== 'No GPS')
  
  // Hide map completely if selection filtering is active and only non-GPS images are selected
  // Otherwise, show map (or message if no GPS images in current display)
  const shouldShowMap = imagesWithGPS.length > 0 || !showOnlySelected
  
  // Prepare timeline data
  const timelineData = useMemo(() => {
    const dateMap = new Map<string, number>()
    displayData.forEach(img => {
      if (img.datetime_obj) {
        const date = img.datetime_obj.toISOString().split('T')[0]
        dateMap.set(date, (dateMap.get(date) || 0) + 1)
      }
    })
    return Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [displayData])

  // Prepare camera distribution data
  const cameraData = useMemo(() => {
    const cameraMap = new Map<string, number>()
    displayData.forEach(img => {
      const camera = img.device_id || 'Unknown'
      cameraMap.set(camera, (cameraMap.get(camera) || 0) + 1)
    })
    return Array.from(cameraMap.entries())
      .map(([camera, count]) => ({ camera, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 cameras
  }, [displayData])

  // Re-render map when data changes
  useEffect(() => {
    setMapKey(prev => prev + 1)
  }, [imagesWithGPS.length])

  return (
    <div style={{ marginTop: '32px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px', 
        flexWrap: 'wrap', 
        gap: '16px' 
      }}>
        <h2 style={{ 
          fontSize: '1.75rem', 
          fontWeight: '700',
          background: 'linear-gradient(135deg, #6FDA44 0%, #37A000 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          📊 Visualizations
        </h2>
        {selectedImages.size > 0 && (
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            cursor: 'pointer',
            padding: '10px 16px',
            background: 'rgba(111, 218, 68, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(111, 218, 68, 0.2)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(111, 218, 68, 0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(111, 218, 68, 0.1)'
          }}
          >
            <input
              type="checkbox"
              checked={showOnlySelected}
              onChange={(e) => setShowOnlySelected(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#6FDA44' }}
            />
            <span style={{ fontSize: '0.95rem', color: '#494949', fontWeight: '600' }}>
              Show only selected ({selectedImages.size} images)
            </span>
          </label>
        )}
      </div>

      {/* Map Section */}
      {shouldShowMap && (
        <>
          {imagesWithGPS.length > 0 ? (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ 
                fontSize: '1.4rem', 
                fontWeight: '700', 
                marginBottom: '16px',
                color: '#494949'
              }}>
                🗺️ Photo Locations Map ({imagesWithGPS.length} {showOnlySelected ? 'selected' : ''} photos with GPS)
              </h3>
              <div style={{ 
                height: '500px', 
                borderRadius: '16px', 
                overflow: 'hidden',
                border: '1px solid rgba(111, 218, 68, 0.2)',
                background: 'rgba(242, 242, 242, 0.8)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
              }}>
                <MapComponent key={mapKey} images={imagesWithGPS} />
              </div>
            </div>
          ) : (
            <div style={{ 
              marginBottom: '32px', 
              padding: '32px', 
              background: 'rgba(111, 218, 68, 0.1)', 
              borderRadius: '16px',
              textAlign: 'center',
              color: '#494949',
              border: '1px solid rgba(111, 218, 68, 0.2)'
            }}>
              <p style={{ fontSize: '1rem', fontWeight: '500' }}>No photos with GPS data to display on map</p>
            </div>
          )}
        </>
      )}

      {/* Timeline Chart */}
      {timelineData.length > 0 && (
        <div style={{ 
          marginBottom: '32px', 
          padding: '24px', 
          background: 'rgba(242, 242, 242, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px', 
          border: '1px solid rgba(111, 218, 68, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px', color: '#494949' }}>
            📅 Photos Timeline
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={Math.floor(timelineData.length / 10)}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#6FDA44" strokeWidth={2} name="Photos" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Camera Distribution Chart */}
      {cameraData.length > 0 && (
        <div style={{ 
          marginBottom: '32px', 
          padding: '24px', 
          background: 'rgba(242, 242, 242, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px', 
          border: '1px solid rgba(111, 218, 68, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px', color: '#494949' }}>
            📷 Camera Distribution (Top 10)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cameraData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="camera" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#14BFF4" name="Photos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}



