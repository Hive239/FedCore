'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddressAutocompleteProps {
  value?: string
  onChange?: (address: string, coordinates?: { lat: number; lng: number }) => void
  onPlaceSelect?: (place: any) => void
  placeholder?: string
  label?: string
  className?: string
  required?: boolean
  disabled?: boolean
  id?: string
}

interface AddressSuggestion {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

// Fallback using OpenStreetMap Nominatim API for address suggestions
const fetchAddressSuggestions = async (query: string): Promise<AddressSuggestion[]> => {
  if (!query || query.length < 3) return []
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=us,ca`
    )
    const data = await response.json()
    
    return data.map((item: any, index: number) => ({
      place_id: item.place_id || `fallback_${index}`,
      description: item.display_name,
      structured_formatting: {
        main_text: item.name || item.display_name.split(',')[0],
        secondary_text: item.display_name.split(',').slice(1).join(',').trim()
      },
      coordinates: {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }
    }))
  } catch (error) {
    console.error('Error fetching address suggestions:', error)
    return []
  }
}

export function AddressAutocomplete({
  value = '',
  onChange,
  onPlaceSelect,
  placeholder = 'Enter address...',
  label,
  className,
  required = false,
  disabled = false,
  id
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Update input value when external value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Debounced address lookup
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (inputValue.trim() && inputValue.length >= 3) {
        setIsLoading(true)
        try {
          const results = await fetchAddressSuggestions(inputValue)
          setSuggestions(results)
          setShowSuggestions(results.length > 0)
        } catch (error) {
          console.error('Address lookup error:', error)
          setSuggestions([])
          setShowSuggestions(false)
        } finally {
          setIsLoading(false)
        }
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [inputValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setSelectedIndex(-1)
    onChange?.(newValue)
  }

  const handleSuggestionClick = (suggestion: AddressSuggestion, coordinates?: { lat: number; lng: number }) => {
    setInputValue(suggestion.description)
    setShowSuggestions(false)
    setSuggestions([])
    setSelectedIndex(-1)
    
    onChange?.(suggestion.description, coordinates)
    onPlaceSelect?.({
      formatted_address: suggestion.description,
      place_id: suggestion.place_id,
      geometry: coordinates ? {
        location: {
          lat: () => coordinates.lat,
          lng: () => coordinates.lng
        } as any
      } : undefined
    } as any)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          const suggestion = suggestions[selectedIndex]
          handleSuggestionClick(suggestion, (suggestion as any).coordinates)
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        suggestionsRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn("relative w-full", className)}>
      {label && (
        <Label htmlFor={id} className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn(
            "pr-8",
            showSuggestions && "rounded-b-none"
          )}
        />
        {isLoading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && inputValue && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 w-full bg-white border border-gray-200 border-t-0 rounded-b-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.place_id}
              className={cn(
                "px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0",
                selectedIndex === index && "bg-blue-50 hover:bg-blue-100"
              )}
              onClick={() => handleSuggestionClick(suggestion, (suggestion as any).coordinates)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {suggestion.structured_formatting.main_text}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {suggestion.structured_formatting.secondary_text}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AddressAutocomplete