'use client'

import { 
  useState, 
  useEffect, 
  useRef, 
  useMemo, 
  useCallback,
  ReactNode,
  CSSProperties 
} from 'react'
import { cn } from '@/lib/utils'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode
  overscan?: number
  className?: string
  onScroll?: (scrollTop: number) => void
  scrollToIndex?: number
  scrollToAlignment?: 'auto' | 'start' | 'center' | 'end'
}

/**
 * Virtual scrolling component for efficiently rendering large lists
 * Only renders items that are currently visible in the viewport
 */
export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className,
  onScroll,
  scrollToIndex,
  scrollToAlignment = 'auto'
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const totalHeight = items.length * itemHeight
  
  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])
  
  // Get visible items
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index
    }))
  }, [items, visibleRange])
  
  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop
    setScrollTop(scrollTop)
    onScroll?.(scrollTop)
  }, [onScroll])
  
  // Scroll to specific index
  useEffect(() => {
    if (scrollToIndex !== undefined && containerRef.current) {
      const container = containerRef.current
      const targetScrollTop = scrollToIndex * itemHeight
      
      let scrollTo = targetScrollTop
      
      switch (scrollToAlignment) {
        case 'start':
          scrollTo = targetScrollTop
          break
        case 'center':
          scrollTo = targetScrollTop - containerHeight / 2 + itemHeight / 2
          break
        case 'end':
          scrollTo = targetScrollTop - containerHeight + itemHeight
          break
        case 'auto':
        default:
          // Only scroll if item is not visible
          if (targetScrollTop < scrollTop) {
            scrollTo = targetScrollTop
          } else if (targetScrollTop + itemHeight > scrollTop + containerHeight) {
            scrollTo = targetScrollTop - containerHeight + itemHeight
          } else {
            return // Item is already visible, no need to scroll
          }
          break
      }
      
      // Clamp scroll position
      scrollTo = Math.max(0, Math.min(totalHeight - containerHeight, scrollTo))
      
      container.scrollTo({
        top: scrollTo,
        behavior: 'smooth'
      })
    }
  }, [scrollToIndex, scrollToAlignment, itemHeight, containerHeight, scrollTop, totalHeight])
  
  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index }) => {
          const itemStyle: CSSProperties = {
            position: 'absolute',
            top: index * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight
          }
          
          return renderItem(item, index, itemStyle)
        })}
      </div>
    </div>
  )
}

// Hook for managing virtual list state
export function useVirtualList<T>(items: T[], itemHeight: number) {
  const [scrollToIndex, setScrollToIndex] = useState<number | undefined>()
  
  const scrollToItem = useCallback((index: number, alignment: 'auto' | 'start' | 'center' | 'end' = 'auto') => {
    setScrollToIndex(index)
    // Reset after a brief delay to allow for re-scrolling to the same index
    setTimeout(() => setScrollToIndex(undefined), 100)
  }, [])
  
  const scrollToTop = useCallback(() => scrollToItem(0, 'start'), [scrollToItem])
  const scrollToBottom = useCallback(() => scrollToItem(items.length - 1, 'end'), [scrollToItem, items.length])
  
  return {
    scrollToIndex,
    scrollToItem,
    scrollToTop,
    scrollToBottom
  }
}

// Grid virtual scrolling component for 2D layouts
interface VirtualGridProps<T> {
  items: T[]
  itemWidth: number
  itemHeight: number
  containerWidth: number
  containerHeight: number
  columns: number
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode
  overscan?: number
  className?: string
  gap?: number
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  columns,
  renderItem,
  overscan = 5,
  className,
  gap = 0
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const rows = Math.ceil(items.length / columns)
  const totalHeight = rows * (itemHeight + gap) - gap
  
  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan)
    const endRow = Math.min(
      rows - 1,
      Math.ceil((scrollTop + containerHeight) / (itemHeight + gap)) + overscan
    )
    
    return { startRow, endRow }
  }, [scrollTop, itemHeight, containerHeight, rows, overscan, gap])
  
  // Get visible items
  const visibleItems = useMemo(() => {
    const { startRow, endRow } = visibleRange
    const items_: Array<{ item: T; index: number; row: number; col: number }> = []
    
    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col
        if (index >= items.length) break
        
        items_.push({
          item: items[index],
          index,
          row,
          col
        })
      }
    }
    
    return items_
  }, [items, visibleRange, columns])
  
  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop
    setScrollTop(scrollTop)
  }, [])
  
  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, row, col }) => {
          const itemStyle: CSSProperties = {
            position: 'absolute',
            top: row * (itemHeight + gap),
            left: col * (itemWidth + gap),
            width: itemWidth,
            height: itemHeight
          }
          
          return renderItem(item, index, itemStyle)
        })}
      </div>
    </div>
  )
}

// Enhanced virtual list with dynamic heights
interface DynamicVirtualListProps<T> {
  items: T[]
  estimatedItemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode
  getItemHeight?: (index: number) => number
  overscan?: number
  className?: string
}

export function DynamicVirtualList<T>({
  items,
  estimatedItemHeight,
  containerHeight,
  renderItem,
  getItemHeight,
  overscan = 5,
  className
}: DynamicVirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Calculate item positions
  const itemPositions = useMemo(() => {
    const positions: Array<{ top: number; height: number }> = []
    let currentTop = 0
    
    for (let i = 0; i < items.length; i++) {
      const height = getItemHeight?.(i) || itemHeights.get(i) || estimatedItemHeight
      positions.push({ top: currentTop, height })
      currentTop += height
    }
    
    return positions
  }, [items.length, itemHeights, getItemHeight, estimatedItemHeight])
  
  const totalHeight = itemPositions[itemPositions.length - 1]?.top + 
                     itemPositions[itemPositions.length - 1]?.height || 0
  
  // Find visible range using binary search for better performance
  const visibleRange = useMemo(() => {
    if (itemPositions.length === 0) return { startIndex: 0, endIndex: 0 }
    
    // Binary search for start index
    let startIndex = 0
    let left = 0
    let right = itemPositions.length - 1
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const position = itemPositions[mid]
      
      if (position.top + position.height > scrollTop) {
        startIndex = mid
        right = mid - 1
      } else {
        left = mid + 1
      }
    }
    
    // Find end index
    let endIndex = startIndex
    for (let i = startIndex; i < itemPositions.length; i++) {
      if (itemPositions[i].top > scrollTop + containerHeight) {
        break
      }
      endIndex = i
    }
    
    // Apply overscan
    startIndex = Math.max(0, startIndex - overscan)
    endIndex = Math.min(itemPositions.length - 1, endIndex + overscan)
    
    return { startIndex, endIndex }
  }, [scrollTop, containerHeight, itemPositions, overscan])
  
  // Get visible items
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index
    }))
  }, [items, visibleRange])
  
  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop
    setScrollTop(scrollTop)
  }, [])
  
  // Update item height when measured
  const updateItemHeight = useCallback((index: number, height: number) => {
    setItemHeights(prev => {
      const next = new Map(prev)
      if (next.get(index) !== height) {
        next.set(index, height)
      }
      return next
    })
  }, [])
  
  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index }) => {
          const position = itemPositions[index]
          if (!position) return null
          
          const itemStyle: CSSProperties = {
            position: 'absolute',
            top: position.top,
            left: 0,
            right: 0,
            height: position.height
          }
          
          return (
            <div
              key={index}
              style={itemStyle}
              ref={(el) => {
                if (el && !getItemHeight) {
                  // Measure actual height if not provided
                  const height = el.getBoundingClientRect().height
                  if (height > 0) {
                    updateItemHeight(index, height)
                  }
                }
              }}
            >
              {renderItem(item, index, { width: '100%', height: '100%' })}
            </div>
          )
        })}
      </div>
    </div>
  )
}