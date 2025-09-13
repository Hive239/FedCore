'use client'

/**
 * Comprehensive Error Boundary Component
 * Provides graceful error handling and recovery mechanisms
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, RefreshCw, Bug, Home, Mail } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  level?: 'page' | 'component' | 'critical'
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Update state with error info
    this.setState({ errorInfo })
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Send error to monitoring service
    this.reportError(error, errorInfo)
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In a real app, this would send to your error tracking service
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        level: this.props.level || 'component'
      }

      // Log to console for development
      console.log('Error Report:', errorReport)
      
      // In production, send to error tracking service:
      // await fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorReport) })
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++
      this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private renderErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state
    
    if (!error || process.env.NODE_ENV !== 'development') {
      return null
    }

    return (
      <details className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <summary className="cursor-pointer font-semibold text-sm">
          Technical Details (Development Only)
        </summary>
        <div className="mt-2 space-y-2 text-xs font-mono">
          <div>
            <strong>Error ID:</strong> {errorId}
          </div>
          <div>
            <strong>Message:</strong> {error.message}
          </div>
          {error.stack && (
            <div>
              <strong>Stack Trace:</strong>
              <pre className="mt-1 whitespace-pre-wrap text-xs overflow-auto max-h-32">
                {error.stack}
              </pre>
            </div>
          )}
          {errorInfo?.componentStack && (
            <div>
              <strong>Component Stack:</strong>
              <pre className="mt-1 whitespace-pre-wrap text-xs overflow-auto max-h-32">
                {errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      </details>
    )
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI based on error level
      const { level = 'component' } = this.props
      const { error, errorId } = this.state

      if (level === 'critical') {
        return (
          <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <CardTitle className="text-red-600">Critical System Error</CardTitle>
                <CardDescription>
                  A critical error has occurred that requires immediate attention.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-red-200 bg-red-50 dark:bg-red-950">
                  <Bug className="h-4 w-4" />
                  <AlertTitle>Error ID: {errorId}</AlertTitle>
                  <AlertDescription className="text-sm">
                    {error?.message || 'An unexpected error occurred'}
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2">
                  <Button onClick={this.handleReload} className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Page
                  </Button>
                  <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>

                <div className="text-center">
                  <Button variant="link" size="sm" asChild>
                    <a href="mailto:support@projectpro.com?subject=Critical%20Error%20Report&body=Error%20ID:%20{errorId}">
                      <Mail className="h-4 w-4 mr-2" />
                      Report Error
                    </a>
                  </Button>
                </div>

                {this.renderErrorDetails()}
              </CardContent>
            </Card>
          </div>
        )
      }

      if (level === 'page') {
        return (
          <div className="container mx-auto p-6">
            <Card>
              <CardHeader className="text-center">
                <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <CardTitle>Something went wrong</CardTitle>
                <CardDescription>
                  This page encountered an error and couldn't be displayed properly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
                  <Bug className="h-4 w-4" />
                  <AlertTitle>Error ID: {errorId}</AlertTitle>
                  <AlertDescription>
                    {error?.message || 'An unexpected error occurred while loading this page'}
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2 justify-center">
                  {this.retryCount < this.maxRetries && (
                    <Button onClick={this.handleRetry}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again ({this.maxRetries - this.retryCount} left)
                    </Button>
                  )}
                  <Button onClick={this.handleReload} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Page
                  </Button>
                  <Button onClick={this.handleGoHome} variant="outline">
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>

                {this.renderErrorDetails()}
              </CardContent>
            </Card>
          </div>
        )
      }

      // Component level error (default)
      return (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-950 my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Component Error</AlertTitle>
          <AlertDescription className="space-y-2">
            <div>This component encountered an error: {error?.message || 'Unknown error'}</div>
            {this.retryCount < this.maxRetries && (
              <Button size="sm" onClick={this.handleRetry} className="mt-2">
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry ({this.maxRetries - this.retryCount} left)
              </Button>
            )}
            {this.renderErrorDetails()}
          </AlertDescription>
        </Alert>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return WithErrorBoundaryComponent
}

export default ErrorBoundary