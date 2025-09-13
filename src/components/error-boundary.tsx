'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
  isolate?: boolean
  level?: 'page' | 'section' | 'component'
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCount: number
}

/**
 * Enterprise-grade Error Boundary with recovery options
 * Implements error isolation, logging, and recovery strategies
 */
export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null
  private previousResetKeys: Array<string | number> = []

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorCount: 0,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary Caught:', error, errorInfo)
    }

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo)
    }

    // Log to monitoring service (Sentry, etc.)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      })
    }

    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }))

    // Auto-retry after 5 seconds for transient errors
    if (this.state.errorCount < 3) {
      this.resetTimeoutId = window.setTimeout(() => {
        this.resetErrorBoundary()
      }, 5000)
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props
    
    // Reset on prop changes if enabled
    if (resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary()
    }
    
    // Reset if resetKeys changed
    if (
      resetKeys &&
      this.previousResetKeys &&
      resetKeys.some((key, idx) => key !== this.previousResetKeys[idx])
    ) {
      this.resetErrorBoundary()
      this.previousResetKeys = [...resetKeys]
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
      this.resetTimeoutId = null
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    })
  }

  render() {
    const { hasError, error, errorCount } = this.state
    const { children, fallback, isolate, level = 'component' } = this.props

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>
      }

      // Different error UIs based on level
      if (level === 'page') {
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <CardTitle className="text-2xl">Something went wrong</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  We encountered an unexpected error. Our team has been notified.
                </p>
                
                {process.env.NODE_ENV === 'development' && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-mono text-sm text-red-600">{error.message}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-muted-foreground">
                        Stack trace
                      </summary>
                      <pre className="mt-2 text-xs overflow-auto">
                        {error.stack}
                      </pre>
                    </details>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <Button onClick={this.resetErrorBoundary}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = '/'}>
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>
                
                {errorCount > 1 && (
                  <p className="text-sm text-muted-foreground">
                    Retry attempt {errorCount} of 3
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )
      }

      if (level === 'section') {
        return (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <h3 className="font-semibold">This section couldn't load</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {isolate
                ? 'This section encountered an error but the rest of the page should work fine.'
                : 'Please try refreshing the page.'}
            </p>
            <Button size="sm" onClick={this.resetErrorBoundary}>
              <RefreshCw className="h-3 w-3 mr-2" />
              Retry
            </Button>
          </Card>
        )
      }

      // Component level error
      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Component Error</span>
          </div>
          <button
            onClick={this.resetErrorBoundary}
            className="mt-2 text-xs text-red-600 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )
    }

    return children
  }
}

/**
 * Hook for using error boundary programmatically
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return setError
}