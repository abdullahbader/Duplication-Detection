export interface ImageMetadata {
  filename: string
  filepath: string
  folder?: string
  file?: File
  device_id?: string
  make?: string
  model?: string
  datetime?: string
  datetime_obj?: Date
  location?: string
  latitude?: number
  longitude?: number
  width?: number
  height?: number
  size_mb?: number
  format?: string
  software?: string
  similarity_status?: string
  closest_match?: string
  has_duplicate?: boolean
  similarity_score?: number
  thumbnail?: string
  hash?: string
}

export interface FilterState {
  searchQuery: string
  sortColumn: string | null
  sortAscending: boolean
  currentPage: number
  itemsPerPage: number
  dateRangeStart: Date | null
  dateRangeEnd: Date | null
  groupBy: string | null
}

