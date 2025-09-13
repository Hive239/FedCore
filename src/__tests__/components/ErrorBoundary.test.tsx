/**
 * Error Boundary Component Tests
 * Tests error handling and recovery functionality
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Test component that throws errors
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('displays component level error UI when error occurs', () => {
    render(
      <ErrorBoundary level="component">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Component Error')).toBeInTheDocument()
    expect(screen.getByText(/This component encountered an error/)).toBeInTheDocument()
  })

  it('displays page level error UI when error occurs', () => {
    render(
      <ErrorBoundary level="page">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/This page encountered an error/)).toBeInTheDocument()
  })

  it('displays critical level error UI when error occurs', () => {
    render(
      <ErrorBoundary level="critical">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Critical System Error')).toBeInTheDocument()
    expect(screen.getByText(/A critical error has occurred/)).toBeInTheDocument()
  })

  it('shows retry button and allows retry for component errors', () => {
    const { rerender } = render(
      <ErrorBoundary level="component">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const retryButton = screen.getByText(/Retry/)
    expect(retryButton).toBeInTheDocument()

    fireEvent.click(retryButton)

    // After retry, should show the component again
    rerender(
      <ErrorBoundary level="component">
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    )
  })

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error fallback</div>

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument()
  })

  it('displays error ID for tracking', () => {
    render(
      <ErrorBoundary level="component">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Error ID:/)).toBeInTheDocument()
  })

  it('shows reload page button for page level errors', () => {
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: { reload: jest.fn() },
      writable: true,
    })

    render(
      <ErrorBoundary level="page">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByText('Reload Page')
    expect(reloadButton).toBeInTheDocument()

    fireEvent.click(reloadButton)
    expect(window.location.reload).toHaveBeenCalled()
  })

  it('shows go home button for critical errors', () => {
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })

    render(
      <ErrorBoundary level="critical">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const goHomeButton = screen.getByText('Go Home')
    expect(goHomeButton).toBeInTheDocument()

    fireEvent.click(goHomeButton)
    expect(window.location.href).toBe('/')
  })

  it('limits retry attempts', () => {
    let attemptCount = 0
    const TestComponent = () => {
      attemptCount++
      if (attemptCount <= 3) { // First 3 attempts throw error
        throw new Error('Test error')
      }
      return <div>Success after retries</div>
    }

    const { rerender } = render(
      <ErrorBoundary level="component">
        <TestComponent />
      </ErrorBoundary>
    )

    // First error - retry button should be available
    let retryButton = screen.queryByText(/Retry/)
    expect(retryButton).toBeInTheDocument()

    // Click retry 3 times (max retries)
    for (let i = 0; i < 3; i++) {
      fireEvent.click(retryButton!)
      rerender(
        <ErrorBoundary level="component">
          <TestComponent />
        </ErrorBoundary>
      )
      retryButton = screen.queryByText(/Retry/)
    }

    // After max retries, retry button should not be available
    expect(retryButton).not.toBeInTheDocument()
  })
})