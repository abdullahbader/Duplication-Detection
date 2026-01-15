'use client'

import { useState, useCallback } from 'react'
import ImageUpload from '@/components/ImageUpload'
import DataTable from '@/components/DataTable'
import Statistics from '@/components/Statistics'
import Visualizations from '@/components/Visualizations'
import { ImageMetadata } from '@/types'

export default function Home() {
  const [imageData, setImageData] = useState<ImageMetadata[]>([])
  const [filteredData, setFilteredData] = useState<ImageMetadata[]>([])
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const handleImagesProcessed = useCallback((images: ImageMetadata[]) => {
    setImageData(images)
    setFilteredData(images)
    setSelectedImages(new Set()) // Clear selection when new images are uploaded
  }, [])

  return (
    <main style={{
      maxWidth: '1400px',
      margin: '0 auto',
      background: 'rgba(242, 242, 242, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '24px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
      padding: '40px',
      minHeight: 'calc(100vh - 40px)',
      position: 'relative',
      zIndex: 1
    }}>
      <div style={{
        marginBottom: '40px',
        padding: '32px',
        background: 'linear-gradient(135deg, rgba(111, 218, 68, 0.05) 0%, rgba(55, 160, 0, 0.05) 100%)',
        borderRadius: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
              <defs>
                <linearGradient id="pageLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6FDA44" stopOpacity="1" />
                  <stop offset="100%" stopColor="#37A000" stopOpacity="1" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="45" fill="url(#pageLogoGrad)"/>
              <path d="M30 50 L45 65 L70 35" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #6FDA44 0%, #37A000 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
            letterSpacing: '-0.02em',
            flex: 1
          }}>
            🔍 Uncover Hidden Photo Secrets & Detect Fraud Instantly
          </h1>
        </div>
        <div style={{ 
          color: '#494949', 
          fontSize: '1rem',
          lineHeight: '1.7',
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          <p style={{ marginBottom: '16px' }}>
            Professional-grade photo analysis that reveals the truth behind every image. Instantly extract timestamps, GPS locations, 
            camera details, and device information. Our advanced duplicate detection system identifies manipulated or fraudulent images, 
            giving you the confidence to verify authenticity and protect your business.
          </p>
          <div style={{
            background: '#FFFFFF',
            padding: '20px',
            borderRadius: '12px',
            marginTop: '20px',
            border: '1px solid rgba(111, 218, 68, 0.2)'
          }}>
            <p style={{ marginBottom: '12px', fontWeight: '600', color: '#37A000' }}>
              ⚠️ Important Notes:
            </p>
            <ul style={{ 
              marginLeft: '20px', 
              listStyleType: 'disc',
              color: '#494949'
            }}>
              <li style={{ marginBottom: '8px' }}>
                <strong>Do not use images downloaded from social media:</strong> Photos downloaded from platforms like 
                Facebook, Instagram, Twitter, or WhatsApp often have their original information removed for privacy reasons. 
                Use original photos directly from your camera or device.
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Location information requires permission:</strong> For photos to include location data, your camera 
                must have had location access permission enabled when the photo was taken. If location services were disabled 
                or denied, the photos will not contain location information.
              </li>
              <li>
                <strong>Original photos work best:</strong> The most accurate information comes from photos taken directly 
                with your camera or smartphone, before any editing or sharing.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <ImageUpload 
        onImagesProcessed={handleImagesProcessed}
        loading={loading}
        setLoading={setLoading}
      />

      {imageData.length > 0 && (
        <>
          <Statistics data={imageData} />
          <DataTable 
            data={imageData} 
            onFilteredDataChange={setFilteredData}
            selectedImages={selectedImages}
            onSelectionChange={setSelectedImages}
          />
          <Visualizations 
            data={filteredData}
            selectedImages={selectedImages}
            allData={imageData}
          />
        </>
      )}

      {imageData.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          color: '#494949',
          background: 'linear-gradient(135deg, rgba(111, 218, 68, 0.05) 0%, rgba(55, 160, 0, 0.05) 100%)',
          borderRadius: '20px',
          border: '2px dashed rgba(111, 218, 68, 0.2)'
        }}>
          <p style={{ fontSize: '1.25rem', marginBottom: '12px', fontWeight: '500', color: '#494949' }}>
            👆 Upload images to get started!
          </p>
          <p style={{ fontSize: '0.95rem' }}>Supports: JPG, PNG, TIFF, BMP, HEIC</p>
        </div>
      )}
    </main>
  )
}



