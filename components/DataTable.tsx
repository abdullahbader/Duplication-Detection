'use client'

import { useState, useMemo, useEffect } from 'react'
import { ImageMetadata, FilterState } from '@/types'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

interface DataTableProps {
  data: ImageMetadata[]
  onFilteredDataChange?: (filteredData: ImageMetadata[]) => void
  selectedImages?: Set<string>
  onSelectionChange?: (selectedImages: Set<string>) => void
}

export default function DataTable({ data, onFilteredDataChange, selectedImages, onSelectionChange }: DataTableProps) {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    sortColumn: null,
    sortAscending: true,
    currentPage: 0,
    itemsPerPage: 50,
    dateRangeStart: null,
    dateRangeEnd: null,
    groupBy: null,
  })

  const [hoveredImage, setHoveredImage] = useState<string | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null)
  const [hoveredRelatedImages, setHoveredRelatedImages] = useState<ImageMetadata[]>([])
  const [localSelectedImages, setLocalSelectedImages] = useState<Set<string>>(new Set())
  const [hoveredCellRef, setHoveredCellRef] = useState<HTMLElement | null>(null)

  // Use prop selectedImages if provided, otherwise use local state
  const currentSelectedImages = selectedImages || localSelectedImages
  const handleSelectionChange = onSelectionChange || setLocalSelectedImages

  // Create a map of filename to image for quick lookup
  const imageMap = useMemo(() => {
    const map = new Map<string, ImageMetadata>()
    data.forEach(img => map.set(img.filename, img))
    return map
  }, [data])

  const filteredData = useMemo(() => {
    let result = [...data]

    // Group by folder filter
    if (filters.groupBy && filters.groupBy !== 'all') {
      result = result.filter(item => item.folder === filters.groupBy)
    }

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      result = result.filter(item =>
        Object.values(item).some(val =>
          val?.toString().toLowerCase().includes(query)
        )
      )
    }

    // Date range filter
    if (filters.dateRangeStart || filters.dateRangeEnd) {
      result = result.filter(item => {
        if (!item.datetime_obj) return false
        const date = item.datetime_obj
        if (filters.dateRangeStart && date < filters.dateRangeStart) return false
        if (filters.dateRangeEnd && date > filters.dateRangeEnd) return false
        return true
      })
    }

    // Sort
    if (filters.sortColumn) {
      result.sort((a, b) => {
        const aVal = (a as any)[filters.sortColumn!]
        const bVal = (b as any)[filters.sortColumn!]
        if (aVal === bVal) return 0
        const comparison = aVal > bVal ? 1 : -1
        return filters.sortAscending ? comparison : -comparison
      })
    }

    return result
  }, [data, filters])

  // Find images with identical datetime or location (must be after filteredData)
  const duplicateDatetimeImages = useMemo(() => {
    const datetimeMap = new Map<string, string[]>()
    filteredData.forEach(img => {
      if (img.datetime) {
        const key = img.datetime
        if (!datetimeMap.has(key)) {
          datetimeMap.set(key, [])
        }
        datetimeMap.get(key)!.push(img.filename)
      }
    })
    const duplicates = new Set<string>()
    datetimeMap.forEach((filenames) => {
      if (filenames.length > 1) {
        filenames.forEach(f => duplicates.add(f))
      }
    })
    return duplicates
  }, [filteredData])

  const duplicateLocationImages = useMemo(() => {
    const locationMap = new Map<string, string[]>()
    filteredData.forEach(img => {
      if (img.location && img.location !== 'No GPS') {
        const key = img.location
        if (!locationMap.has(key)) {
          locationMap.set(key, [])
        }
        locationMap.get(key)!.push(img.filename)
      }
    })
    const duplicates = new Set<string>()
    locationMap.forEach((filenames) => {
      if (filenames.length > 1) {
        filenames.forEach(f => duplicates.add(f))
      }
    })
    return duplicates
  }, [filteredData])

  // Notify parent of filtered data changes
  useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredData)
    }
  }, [filteredData, onFilteredDataChange])

  const paginatedData = useMemo(() => {
    const start = filters.currentPage * filters.itemsPerPage
    return filteredData.slice(start, start + filters.itemsPerPage)
  }, [filteredData, filters.currentPage, filters.itemsPerPage])

  const totalPages = Math.ceil(filteredData.length / filters.itemsPerPage)

  const columns = [
    'folder', 'filename', 'device_id', 'make', 'model', 'datetime',
    'location', 'similarity_score', 'similarity_status', 'closest_match',
    'width', 'height', 'size_mb', 'format', 'software'
  ]
  
  // Get unique folders for group by filter
  const uniqueFolders = useMemo(() => {
    const folders = new Set<string>()
    data.forEach(img => {
      if (img.folder) {
        folders.add(img.folder)
      }
    })
    return Array.from(folders).sort()
  }, [data])

  const calculateTooltipPosition = (element: HTMLElement, tooltipWidth: number = 300, tooltipHeight: number = 300) => {
    const rect = element.getBoundingClientRect()
    const offset = 15 // Distance from element
    
    // For position: fixed, use viewport coordinates (no scroll offset)
    // Position to the right of the element by default, aligned with top
    let x = rect.right + offset
    let y = rect.top
    
    // Adjust if tooltip would go off right edge
    if (x + tooltipWidth > window.innerWidth - 20) {
      x = rect.left - tooltipWidth - offset // Show on left side
    }
    
    // Adjust if tooltip would go off bottom edge
    if (y + tooltipHeight > window.innerHeight - 20) {
      y = rect.bottom - tooltipHeight // Show above
    }
    
    // Ensure tooltip doesn't go off left or top edges
    x = Math.max(20, Math.min(x, window.innerWidth - tooltipWidth - 20))
    y = Math.max(20, Math.min(y, window.innerHeight - tooltipHeight - 20))
    
    return { x, y }
  }

  const handleMouseEnter = (e: React.MouseEvent, image: ImageMetadata) => {
    e.stopPropagation()
    if (image.thumbnail) {
      // Get the cell element and store reference
      const cellElement = e.currentTarget as HTMLElement
      setHoveredCellRef(cellElement)
      
      // Try to get cell bounds
      const rect = cellElement.getBoundingClientRect()
      const tooltipWidth = 300
      const tooltipHeight = 300
      const offset = 15
      const mouseX = e.clientX
      const mouseY = e.clientY
      
      let x: number
      let y: number
      
      // Check if cell rect is valid (visible and has size)
      if (rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth) {
        // Position relative to cell - to the right, aligned with top
        x = rect.right + offset
        y = rect.top
        
        // If right side doesn't fit, try left side
        if (x + tooltipWidth > window.innerWidth - 20) {
          x = rect.left - tooltipWidth - offset
        }
      } else {
        // Fallback: use mouse coordinates
        x = mouseX + offset
        y = mouseY - tooltipHeight / 2
        
        if (x + tooltipWidth > window.innerWidth - 20) {
          x = mouseX - tooltipWidth - offset
        }
      }
      
      // Ensure tooltip stays within viewport bounds
      x = Math.max(20, Math.min(x, window.innerWidth - tooltipWidth - 20))
      y = Math.max(20, Math.min(y, window.innerHeight - tooltipHeight - 20))
      
      setHoveredImage(image.thumbnail)
      setHoverPosition({ x, y })
      // Clear related images when showing single image
      setHoveredRelatedImages([])
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    // Only update position if we have a tooltip to show
    if ((hoveredImage || hoveredRelatedImages.length > 0) && hoveredCellRef) {
      const rect = hoveredCellRef.getBoundingClientRect()
      const tooltipWidth = hoveredRelatedImages.length > 0 ? 400 : 300
      const tooltipHeight = hoveredRelatedImages.length > 0 ? 400 : 300
      const offset = 15
      const mouseX = e.clientX
      const mouseY = e.clientY
      
      let x: number
      let y: number
      
      // Check if cell rect is valid
      if (rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth) {
        // Position relative to cell - to the right, aligned with top
        x = rect.right + offset
        y = rect.top
        
        // If right side doesn't fit, try left side
        if (x + tooltipWidth > window.innerWidth - 20) {
          x = rect.left - tooltipWidth - offset
        }
      } else {
        // Fallback: use mouse coordinates
        x = mouseX + offset
        y = mouseY - tooltipHeight / 2
        
        if (x + tooltipWidth > window.innerWidth - 20) {
          x = mouseX - tooltipWidth - offset
        }
      }
      
      // Ensure tooltip stays within viewport bounds
      x = Math.max(20, Math.min(x, window.innerWidth - tooltipWidth - 20))
      y = Math.max(20, Math.min(y, window.innerHeight - tooltipHeight - 20))
      
      setHoverPosition({ x, y })
    }
  }

  const handleMouseLeave = () => {
    setHoveredImage(null)
    setHoverPosition(null)
    setHoveredRelatedImages([])
    setHoveredCellRef(null)
  }

  const handleRelatedImageHover = (e: React.MouseEvent, image: ImageMetadata, relatedFilenames: string[]) => {
    e.stopPropagation()
    const relatedImages: ImageMetadata[] = []
    relatedFilenames.forEach(filename => {
      const relatedImg = imageMap.get(filename)
      if (relatedImg && relatedImg.thumbnail) {
        relatedImages.push(relatedImg)
      }
    })
    if (relatedImages.length > 0) {
      // Get the cell element and store reference
      const cellElement = e.currentTarget as HTMLElement
      setHoveredCellRef(cellElement)
      
      // Try to get cell bounds
      const rect = cellElement.getBoundingClientRect()
      const tooltipWidth = 400
      const tooltipHeight = 400
      const offset = 15
      const mouseX = e.clientX
      const mouseY = e.clientY
      
      let x: number
      let y: number
      
      // Check if cell rect is valid
      if (rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth) {
        // Position relative to cell - to the right, aligned with top
        x = rect.right + offset
        y = rect.top
        
        // If right side doesn't fit, try left side
        if (x + tooltipWidth > window.innerWidth - 20) {
          x = rect.left - tooltipWidth - offset
        }
      } else {
        // Fallback: use mouse coordinates
        x = mouseX + offset
        y = mouseY - tooltipHeight / 2
        
        if (x + tooltipWidth > window.innerWidth - 20) {
          x = mouseX - tooltipWidth - offset
        }
      }
      
      // Ensure tooltip stays within viewport bounds
      x = Math.max(20, Math.min(x, window.innerWidth - tooltipWidth - 20))
      y = Math.max(20, Math.min(y, window.innerHeight - tooltipHeight - 20))
      
      setHoveredRelatedImages(relatedImages)
      setHoverPosition({ x, y })
    }
  }

  const handleRelatedImageLeave = () => {
    setHoveredRelatedImages([])
    setHoverPosition(null)
    setHoveredCellRef(null)
  }

  const handleSelectImage = (filename: string, checked: boolean) => {
    const newSelection = new Set(currentSelectedImages)
    if (checked) {
      newSelection.add(filename)
    } else {
      newSelection.delete(filename)
    }
    handleSelectionChange(newSelection)
  }

  const handleSelectAll = (checked: boolean) => {
    const newSelection = checked ? new Set(filteredData.map(img => img.filename)) : new Set<string>()
    handleSelectionChange(newSelection)
  }

  const allSelected = filteredData.length > 0 && filteredData.every(img => currentSelectedImages.has(img.filename))
  const someSelected = filteredData.some(img => currentSelectedImages.has(img.filename))

  const handleExportToExcel = () => {
    if (filteredData.length === 0) {
      alert('No data to export')
      return
    }

    // Prepare data for export - format dates and handle undefined/null values
    const exportData = filteredData.map(item => {
      const row: any = {}
      columns.forEach(col => {
        const value = (item as any)[col]
        if (col === 'datetime' && item.datetime_obj) {
          // Format date for Excel
          row[col.replace('_', ' ')] = item.datetime_obj.toLocaleString()
        } else if (col === 'similarity_score' && typeof value === 'number') {
          row[col.replace('_', ' ')] = `${value}%`
        } else {
          row[col.replace('_', ' ')] = value !== undefined && value !== null ? String(value) : '-'
        }
      })
      return row
    })

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Image Metadata')

    // Set column widths for better readability
    const columnWidths = columns.map(col => ({
      wch: Math.max(col.length, 15)
    }))
    worksheet['!cols'] = columnWidths

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    // Generate filename with current date
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `image-metadata-export-${dateStr}.xlsx`
    
    saveAs(blob, filename)
  }

  const inputStyle = {
    padding: '10px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(111, 218, 68, 0.2)',
    fontSize: '0.9rem',
    background: 'rgba(242, 242, 242, 0.8)',
    transition: 'all 0.2s ease',
    outline: 'none',
    fontWeight: '400' as const
  }

  const buttonStyle = {
    padding: '10px 16px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer' as const,
    fontSize: '0.9rem',
    fontWeight: '600' as const,
    transition: 'all 0.2s ease'
  }

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
          📋 Image Metadata Table
        </h2>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Search..."
            value={filters.searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value, currentPage: 0 })}
            style={{
              ...inputStyle,
              minWidth: '200px'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(111, 218, 68, 0.5)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(111, 218, 68, 0.1)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(111, 218, 68, 0.2)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          <input
            type="date"
            placeholder="Start Date"
            value={filters.dateRangeStart ? filters.dateRangeStart.toISOString().split('T')[0] : ''}
            onChange={(e) => setFilters({ 
              ...filters, 
              dateRangeStart: e.target.value ? new Date(e.target.value) : null,
              currentPage: 0 
            })}
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(111, 218, 68, 0.5)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(111, 218, 68, 0.1)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(111, 218, 68, 0.2)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          <input
            type="date"
            placeholder="End Date"
            value={filters.dateRangeEnd ? filters.dateRangeEnd.toISOString().split('T')[0] : ''}
            onChange={(e) => setFilters({ 
              ...filters, 
              dateRangeEnd: e.target.value ? new Date(e.target.value) : null,
              currentPage: 0 
            })}
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(111, 218, 68, 0.5)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(111, 218, 68, 0.1)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(111, 218, 68, 0.2)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          {(filters.dateRangeStart || filters.dateRangeEnd) && (
            <button
              onClick={() => setFilters({ ...filters, dateRangeStart: null, dateRangeEnd: null, currentPage: 0 })}
              style={{
                ...buttonStyle,
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}
            >
              Clear Dates
            </button>
          )}
          <select
            value={filters.groupBy || 'all'}
            onChange={(e) => setFilters({ ...filters, groupBy: e.target.value === 'all' ? null : e.target.value, currentPage: 0 })}
            style={inputStyle}
            title="Group by folder"
          >
            <option value="all">All Folders</option>
            {uniqueFolders.map(folder => (
              <option key={folder} value={folder}>{folder}</option>
            ))}
          </select>
          <select
            value={filters.sortColumn || ''}
            onChange={(e) => setFilters({ ...filters, sortColumn: e.target.value || null })}
            style={inputStyle}
          >
            <option value="">Sort by...</option>
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
          <button
            onClick={() => setFilters({ ...filters, sortAscending: !filters.sortAscending })}
            style={{
              ...buttonStyle,
              background: filters.sortAscending 
                ? 'linear-gradient(135deg, #6FDA44 0%, #37A000 100%)'
                : 'linear-gradient(135deg, #37A000 0%, #6FDA44 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(111, 218, 68, 0.3)',
              opacity: !filters.sortColumn ? 0.5 : 1,
              cursor: !filters.sortColumn ? 'not-allowed' : 'pointer'
            }}
            disabled={!filters.sortColumn}
            onMouseEnter={(e) => {
              if (filters.sortColumn) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(111, 218, 68, 0.4)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(111, 218, 68, 0.3)'
            }}
          >
            {filters.sortAscending ? '↑' : '↓'}
          </button>
          <select
            value={filters.itemsPerPage}
            onChange={(e) => setFilters({ ...filters, itemsPerPage: Number(e.target.value), currentPage: 0 })}
            style={inputStyle}
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
          <button
            onClick={handleExportToExcel}
            style={{
              ...buttonStyle,
              background: 'linear-gradient(135deg, #6FDA44 0%, #37A000 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(111, 218, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(111, 218, 68, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(111, 218, 68, 0.3)'
            }}
          >
            📊 Export to Excel
          </button>
        </div>
      </div>

      {/* Selection controls */}
      {filteredData.length > 0 && (
        <div style={{ 
          marginBottom: '16px', 
          display: 'flex', 
          gap: '12px', 
          alignItems: 'center',
          padding: '12px 16px',
          background: 'rgba(111, 218, 68, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(111, 218, 68, 0.2)'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) input.indeterminate = someSelected && !allSelected
              }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              style={{ 
                width: '20px', 
                height: '20px', 
                cursor: 'pointer',
                accentColor: '#6FDA44'
              }}
            />
            <span style={{ fontSize: '0.95rem', color: '#494949', fontWeight: '600' }}>
              Select {allSelected ? 'None' : 'All'} ({currentSelectedImages.size} selected)
            </span>
          </label>
          {uniqueFolders.length > 0 && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  const folder = e.target.value
                  const newSelection = new Set(currentSelectedImages)
                  filteredData.forEach(img => {
                    if (img.folder === folder) {
                      newSelection.add(img.filename)
                    }
                  })
                  handleSelectionChange(newSelection)
                  e.target.value = ''
                }
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(111, 218, 68, 0.3)',
                background: '#F2F2F2',
                color: '#494949',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
            >
              <option value="">Select by folder...</option>
              {uniqueFolders.map(folder => (
                <option key={folder} value={folder}>{folder}</option>
              ))}
            </select>
          )}
          {currentSelectedImages.size > 0 && (
            <button
              onClick={() => handleSelectionChange(new Set())}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)'
              }}
            >
              Clear Selection
            </button>
          )}
        </div>
      )}

      <div style={{ 
        overflowX: 'auto', 
        background: 'rgba(242, 242, 242, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px', 
        border: '1px solid rgba(111, 218, 68, 0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ 
              background: 'linear-gradient(135deg, rgba(111, 218, 68, 0.1) 0%, rgba(55, 160, 0, 0.1) 100%)',
              borderBottom: '2px solid rgba(111, 218, 68, 0.2)'
            }}>
              <th style={{ padding: '12px', width: '40px' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected && !allSelected
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </th>
              {columns.map(col => (
                <th
                  key={col}
                  style={{
                    padding: '16px 12px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '0.875rem',
                    textTransform: 'capitalize',
                    color: '#494949',
                    letterSpacing: '0.01em'
                  }}
                >
                  {col.replace('_', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, idx) => {
              const isSelected = currentSelectedImages.has(item.filename)
              const hasDuplicateDatetime = duplicateDatetimeImages.has(item.filename)
              const hasDuplicateLocation = duplicateLocationImages.has(item.filename)
              const hasDuplicate = hasDuplicateDatetime || hasDuplicateLocation
              
              return (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid rgba(229, 231, 235, 0.5)',
                    transition: 'all 0.2s ease',
                    background: isSelected 
                      ? 'linear-gradient(135deg, rgba(111, 218, 68, 0.1) 0%, rgba(55, 160, 0, 0.1) 100%)'
                      : hasDuplicate 
                        ? 'rgba(254, 226, 226, 0.5)' 
                        : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    // Handle row background hover
                    if (!isSelected && !hasDuplicate) {
                      e.currentTarget.style.background = 'rgba(111, 218, 68, 0.1)'
                    }
                  }}
                  onMouseMove={(e) => {
                    // Row-level mouse move - only update if not on filename cell
                    const target = e.target as HTMLElement
                    const isFilenameCell = target.closest('td')?.textContent === item.filename || 
                                          target.closest('td')?.getAttribute('data-col') === 'filename'
                    if (!isFilenameCell && item.thumbnail && hoveredImage) {
                      handleMouseMove(e)
                    }
                  }}
                  onMouseLeave={(e) => {
                    // Only clear if leaving the entire row
                    const relatedTarget = e.relatedTarget as HTMLElement
                    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
                      handleMouseLeave()
                    }
                    if (!isSelected && !hasDuplicate) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <td style={{ padding: '12px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectImage(item.filename, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </td>
                  {columns.map(col => {
                  const value = (item as any)[col]
                  const displayValue = value !== undefined && value !== null ? String(value) : '-'
                  
                  // Check if this cell should be clickable/hoverable for related images
                  let relatedFilenames: string[] = []
                  if (col === 'closest_match' && value && value !== 'None') {
                    relatedFilenames = [value]
                    // Also find duplicates if this is a duplicate - search in all data, not just filtered
                    if (item.has_duplicate) {
                      data.forEach(img => {
                        if (img.filename !== item.filename && img.closest_match === item.filename) {
                          relatedFilenames.push(img.filename)
                        }
                      })
                    }
                  } else if (col === 'similarity_status' && item.closest_match && item.closest_match !== 'None') {
                    relatedFilenames = [item.closest_match]
                    // Find all images that match this one - search in all data, not just filtered
                    data.forEach(img => {
                      if (img.filename !== item.filename && 
                          (img.closest_match === item.filename || item.closest_match === img.filename)) {
                        relatedFilenames.push(img.filename)
                      }
                    })
                  }
                  
                  const isHoverable = relatedFilenames.length > 0
                  
                  return (
                    <td
                      key={col}
                      data-col={col}
                      style={{
                        padding: '12px',
                        fontSize: '0.875rem',
                        color: '#494949',
                        ...(col === 'filename' && {
                          cursor: item.thumbnail ? 'pointer' : 'default',
                          fontWeight: '500',
                          color: '#6FDA44'
                        }),
                        ...(isHoverable && {
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          color: '#14BFF4'
                        }),
                        ...((col === 'datetime' && hasDuplicateDatetime) && {
                          background: '#fee2e2',
                          fontWeight: '600'
                        }),
                        ...((col === 'location' && hasDuplicateLocation) && {
                          background: '#fee2e2',
                          fontWeight: '600'
                        })
                      }}
                      onMouseEnter={
                        col === 'filename' && item.thumbnail
                          ? (e) => {
                              e.stopPropagation()
                              handleMouseEnter(e, item)
                            }
                          : isHoverable
                          ? (e) => {
                              e.stopPropagation()
                              handleRelatedImageHover(e, item, relatedFilenames)
                            }
                          : undefined
                      }
                      onMouseMove={
                        col === 'filename' && item.thumbnail
                          ? (e) => {
                              e.stopPropagation()
                              handleMouseMove(e)
                            }
                          : isHoverable
                          ? (e) => {
                              e.stopPropagation()
                              handleMouseMove(e)
                            }
                          : undefined
                      }
                      onMouseLeave={
                        col === 'filename' && item.thumbnail
                          ? (e) => {
                              e.stopPropagation()
                              handleMouseLeave()
                            }
                          : isHoverable
                          ? (e) => {
                              e.stopPropagation()
                              handleRelatedImageLeave()
                            }
                          : undefined
                      }
                    >
                      {col === 'similarity_score' && typeof value === 'number' ? `${value}%` : displayValue}
                    </td>
                  )
                })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ color: '#494949' }}>
          Showing {filters.currentPage * filters.itemsPerPage + 1} to {Math.min((filters.currentPage + 1) * filters.itemsPerPage, filteredData.length)} of {filteredData.length} images
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setFilters({ ...filters, currentPage: Math.max(0, filters.currentPage - 1) })}
            disabled={filters.currentPage === 0}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: filters.currentPage === 0 ? '#f3f4f6' : 'white',
              cursor: filters.currentPage === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
          <span style={{ padding: '8px 16px', alignSelf: 'center' }}>
            Page {filters.currentPage + 1} of {totalPages || 1}
          </span>
          <button
            onClick={() => setFilters({ ...filters, currentPage: Math.min(totalPages - 1, filters.currentPage + 1) })}
            disabled={filters.currentPage >= totalPages - 1}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: filters.currentPage >= totalPages - 1 ? '#f3f4f6' : 'white',
              cursor: filters.currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Hover Preview Tooltip */}
      {hoveredImage && hoverPosition && (
        <div
          style={{
            position: 'fixed',
            left: `${hoverPosition.x}px`,
            top: `${hoverPosition.y}px`,
            zIndex: 10000,
            background: '#F2F2F2',
            border: '2px solid #6FDA44',
            borderRadius: '8px',
            padding: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            maxWidth: '300px',
            transform: 'none',
            willChange: 'auto'
          }}
        >
          <img
            src={hoveredImage}
            alt="Preview"
            style={{
              maxWidth: '280px',
              maxHeight: '280px',
              display: 'block',
              borderRadius: '4px'
            }}
          />
        </div>
      )}

      {/* Related Images Preview Tooltip */}
      {hoveredRelatedImages.length > 0 && hoverPosition && (
        <div
          style={{
            position: 'fixed',
            left: `${hoverPosition.x}px`,
            top: `${hoverPosition.y}px`,
            zIndex: 10000,
            background: '#F2F2F2',
            border: '2px solid #6FDA44',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            maxWidth: '400px',
            transform: 'none',
            willChange: 'auto'
          }}
        >
          <div style={{ 
            fontSize: '0.85rem', 
            fontWeight: '600', 
            marginBottom: '8px',
            color: '#14BFF4'
          }}>
            Related Images ({hoveredRelatedImages.length}):
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: hoveredRelatedImages.length > 1 ? 'repeat(2, 1fr)' : '1fr',
            gap: '8px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {hoveredRelatedImages.map((relatedImg, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                {relatedImg.thumbnail && (
                  <img
                    src={relatedImg.thumbnail}
                    alt={relatedImg.filename}
                    style={{
                      maxWidth: '150px',
                      maxHeight: '150px',
                      display: 'block',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      margin: '0 auto 4px'
                    }}
                  />
                )}
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#666',
                  wordBreak: 'break-word'
                }}>
                  {relatedImg.filename}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}



