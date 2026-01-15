'use client'

import { useEffect, useRef } from 'react'
import { ImageMetadata } from '@/types'
import L from 'leaflet'

// Fix for default marker icons in Next.js
import 'leaflet/dist/leaflet.css'

// Set default icon for Leaflet markers
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

interface MapComponentProps {
  images: ImageMetadata[]
}

export default function MapComponent({ images }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!mapRef.current) return

    // Initialize map if it doesn't exist
    if (!mapInstanceRef.current) {
      // Default center if no images
      const defaultCenter: [number, number] = [0, 0]
      const defaultZoom = 2

      if (images.length > 0) {
        // Calculate center only from images with valid GPS data
        const imagesWithGPS = images.filter(img => 
          img.latitude !== undefined && 
          img.longitude !== undefined && 
          !isNaN(img.latitude) && 
          !isNaN(img.longitude)
        )
        
        if (imagesWithGPS.length > 0) {
          const avgLat = imagesWithGPS.reduce((sum, img) => sum + (img.latitude || 0), 0) / imagesWithGPS.length
          const avgLng = imagesWithGPS.reduce((sum, img) => sum + (img.longitude || 0), 0) / imagesWithGPS.length
          mapInstanceRef.current = L.map(mapRef.current).setView([avgLat, avgLng], defaultZoom)
        } else {
          // No GPS data, use default center
          mapInstanceRef.current = L.map(mapRef.current).setView(defaultCenter, defaultZoom)
        }
      } else {
        mapInstanceRef.current = L.map(mapRef.current).setView(defaultCenter, defaultZoom)
      }

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current)
    }

    const map = mapInstanceRef.current

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Add markers for each image
    if (images.length > 0) {
      images.forEach((image) => {
        if (image.latitude !== undefined && image.longitude !== undefined && 
            !isNaN(image.latitude) && !isNaN(image.longitude)) {
          // Create popup content with thumbnail
          const thumbnailHtml = image.thumbnail 
            ? `<img src="${image.thumbnail}" alt="${image.filename}" style="max-width: 200px; max-height: 200px; border-radius: 4px; margin-bottom: 8px; display: block;" />`
            : ''
          
          const popupContent = `
            <div style="min-width: 200px; text-align: center;">
              ${thumbnailHtml}
              <strong style="display: block; margin-bottom: 4px;">${image.filename}</strong>
              <div style="font-size: 0.85em; color: #666;">
                ${image.datetime || 'No date'}<br/>
                ${image.location || 'No GPS'}<br/>
                ${image.make || 'Unknown'} ${image.model || ''}
              </div>
            </div>
          `
          
          const marker = L.marker([image.latitude, image.longitude])
            .addTo(map)
            .bindPopup(popupContent, {
              maxWidth: 250,
              className: 'custom-popup',
              autoPan: true
            })
          
          markersRef.current.push(marker)
        }
      })

      // Fit map to show all markers
      if (markersRef.current.length > 0) {
        const group = new L.FeatureGroup(markersRef.current)
        map.fitBounds(group.getBounds().pad(0.1))
      }
    }

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
    }
  }, [images])

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
}

