/**
 * Performance Monitoring System Test Suite
 * Tests all functionality to ensure everything is working properly
 */

import { performanceMonitor } from '@/lib/performance-monitor'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export class PerformanceSystemTester {
  private supabase = createClientComponentClient()
  private testResults: Array<{ test: string; status: 'pass' | 'fail'; message: string }> = []

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Performance Monitoring System Tests...')
    
    try {
      // Test 1: Error Logging
      await this.testErrorLogging()
      
      // Test 2: Performance Metrics
      await this.testPerformanceMetrics()
      
      // Test 3: Database Connectivity
      await this.testDatabaseConnectivity()
      
      // Test 4: Session Tracking
      await this.testSessionTracking()
      
      // Test 5: API Performance Tracking
      await this.testAPIPerformanceTracking()
      
      // Test 6: Admin Access
      await this.testAdminAccess()
      
      // Display Results
      this.displayResults()
      
    } catch (error) {
      console.error('❌ Test suite failed:', error)
    }
  }

  private async testErrorLogging(): Promise<void> {
    console.log('Testing error logging...')
    
    try {
      // Test JavaScript error tracking
      const testError = new Error('Test error for performance monitoring')
      performanceMonitor.trackError(testError, { severity: 'low' })
      
      // Wait a moment for async processing
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Check if error was logged to database
      const { data: errors, error } = await this.supabase
        .from('error_logs')
        .select('*')
        .eq('error_message', 'Test error for performance monitoring')
        .limit(1)
      
      if (error) {
        this.testResults.push({
          test: 'Error Logging',
          status: 'fail',
          message: `Database error: ${error.message}`
        })
        return
      }
      
      if (errors && errors.length > 0) {
        this.testResults.push({
          test: 'Error Logging',
          status: 'pass',
          message: 'Error successfully logged to database'
        })
      } else {
        this.testResults.push({
          test: 'Error Logging',
          status: 'fail',
          message: 'Error not found in database - check RLS policies'
        })
      }
      
    } catch (error) {
      this.testResults.push({
        test: 'Error Logging',
        status: 'fail',
        message: `Exception: ${(error as Error).message}`
      })
    }
  }

  private async testPerformanceMetrics(): Promise<void> {
    console.log('Testing performance metrics collection...')
    
    try {
      // Check if performance API is available
      if (typeof window === 'undefined' || !window.performance) {
        this.testResults.push({
          test: 'Performance Metrics',
          status: 'fail',
          message: 'Performance API not available (likely running on server)'
        })
        return
      }

      // Test performance metrics collection
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (navigation) {
        const mockMetrics = {
          page_load_time: Math.round(navigation.loadEventEnd - navigation.fetchStart),
          dom_content_loaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
          first_contentful_paint: 1200,
          largest_contentful_paint: 1800,
          cumulative_layout_shift: 0.1,
          first_input_delay: 50,
          memory_usage: { usedJSHeapSize: 10000000 },
          device_info: { userAgent: 'test-agent' },
          browser_info: { name: 'test-browser' }
        }

        // Try to record metrics
        const { error } = await this.supabase.rpc('record_performance_metrics', {
          p_session_id: performanceMonitor.getSessionId(),
          p_page_url: '/test-performance-page',
          p_metrics: mockMetrics
        })

        if (error) {
          this.testResults.push({
            test: 'Performance Metrics',
            status: 'fail',
            message: `Database function error: ${error.message}`
          })
        } else {
          this.testResults.push({
            test: 'Performance Metrics',
            status: 'pass',
            message: 'Performance metrics successfully recorded'
          })
        }
      } else {
        this.testResults.push({
          test: 'Performance Metrics',
          status: 'fail',
          message: 'Navigation timing not available'
        })
      }

    } catch (error) {
      this.testResults.push({
        test: 'Performance Metrics',
        status: 'fail',
        message: `Exception: ${(error as Error).message}`
      })
    }
  }

  private async testDatabaseConnectivity(): Promise<void> {
    console.log('Testing database connectivity...')
    
    try {
      // Test basic database connection
      const { data, error } = await this.supabase
        .from('error_logs')
        .select('count')
        .limit(1)
      
      if (error) {
        this.testResults.push({
          test: 'Database Connectivity',
          status: 'fail',
          message: `Database connection failed: ${error.message}`
        })
        return
      }
      
      // Test helper function
      const { error: funcError } = await this.supabase.rpc('log_error', {
        p_error_type: 'test',
        p_error_message: 'Database connectivity test',
        p_severity: 'low'
      })
      
      if (funcError) {
        this.testResults.push({
          test: 'Database Connectivity',
          status: 'fail',
          message: `Helper function failed: ${funcError.message}`
        })
      } else {
        this.testResults.push({
          test: 'Database Connectivity',
          status: 'pass',
          message: 'Database and helper functions working properly'
        })
      }
      
    } catch (error) {
      this.testResults.push({
        test: 'Database Connectivity',
        status: 'fail',
        message: `Exception: ${(error as Error).message}`
      })
    }
  }

  private async testSessionTracking(): Promise<void> {
    console.log('Testing session tracking...')
    
    try {
      const sessionId = performanceMonitor.getSessionId()
      
      if (sessionId && sessionId.startsWith('session_')) {
        // Test session creation
        const { error } = await this.supabase
          .from('user_sessions')
          .insert({
            session_id: `test_${sessionId}`,
            page_views: 1,
            actions_performed: [{ action: 'test', timestamp: new Date().toISOString() }]
          })
        
        if (error) {
          this.testResults.push({
            test: 'Session Tracking',
            status: 'fail',
            message: `Session insert failed: ${error.message}`
          })
        } else {
          this.testResults.push({
            test: 'Session Tracking',
            status: 'pass',
            message: 'Session tracking working properly'
          })
        }
      } else {
        this.testResults.push({
          test: 'Session Tracking',
          status: 'fail',
          message: 'Invalid session ID generated'
        })
      }
      
    } catch (error) {
      this.testResults.push({
        test: 'Session Tracking',
        status: 'fail',
        message: `Exception: ${(error as Error).message}`
      })
    }
  }

  private async testAPIPerformanceTracking(): Promise<void> {
    console.log('Testing API performance tracking...')
    
    try {
      // Test API performance logging
      const { error } = await this.supabase
        .from('api_performance')
        .insert({
          endpoint: '/api/test',
          method: 'GET',
          response_time: 150,
          status_code: 200,
          session_id: performanceMonitor.getSessionId()
        })
      
      if (error) {
        this.testResults.push({
          test: 'API Performance Tracking',
          status: 'fail',
          message: `API performance insert failed: ${error.message}`
        })
      } else {
        this.testResults.push({
          test: 'API Performance Tracking',
          status: 'pass',
          message: 'API performance tracking working properly'
        })
      }
      
    } catch (error) {
      this.testResults.push({
        test: 'API Performance Tracking',
        status: 'fail',
        message: `Exception: ${(error as Error).message}`
      })
    }
  }

  private async testAdminAccess(): Promise<void> {
    console.log('Testing admin access...')
    
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      
      if (!user) {
        this.testResults.push({
          test: 'Admin Access',
          status: 'fail',
          message: 'No authenticated user found'
        })
        return
      }
      
      // Check user profile and role
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (error) {
        this.testResults.push({
          test: 'Admin Access',
          status: 'fail',
          message: `Profile query failed: ${error.message}`
        })
        return
      }
      
      if (profile?.role === 'admin') {
        this.testResults.push({
          test: 'Admin Access',
          status: 'pass',
          message: 'Admin access confirmed - performance page accessible'
        })
      } else {
        this.testResults.push({
          test: 'Admin Access',
          status: 'pass',
          message: `User role: ${profile?.role || 'unknown'} - admin features will be restricted`
        })
      }
      
    } catch (error) {
      this.testResults.push({
        test: 'Admin Access',
        status: 'fail',
        message: `Exception: ${(error as Error).message}`
      })
    }
  }

  private displayResults(): void {
    console.log('\n📊 Test Results Summary:')
    console.log('========================')
    
    let passed = 0
    let failed = 0
    
    this.testResults.forEach(result => {
      const emoji = result.status === 'pass' ? '✅' : '❌'
      console.log(`${emoji} ${result.test}: ${result.message}`)
      
      if (result.status === 'pass') passed++
      else failed++
    })
    
    console.log('\n📈 Overall Results:')
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`🎯 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! Performance monitoring system is fully operational.')
    } else {
      console.log('\n⚠️  Some tests failed. Check the error messages above for details.')
    }
  }

  // Method to generate test data for demonstration
  async generateTestData(): Promise<void> {
    console.log('🎲 Generating test data for demonstration...')
    
    const sessionId = performanceMonitor.getSessionId()
    
    // Generate sample errors
    const sampleErrors = [
      { type: 'javascript', message: 'TypeError: Cannot read property of undefined', severity: 'high' },
      { type: 'network', message: 'Network request failed: 500 Internal Server Error', severity: 'medium' },
      { type: 'api', message: 'Authentication token expired', severity: 'low' }
    ]
    
    // Generate sample performance metrics
    const samplePages = ['/dashboard', '/projects', '/contacts', '/calendar']
    
    try {
      // Insert sample errors
      for (const error of sampleErrors) {
        await this.supabase.rpc('log_error', {
          p_error_type: error.type,
          p_error_message: error.message,
          p_page_url: samplePages[Math.floor(Math.random() * samplePages.length)],
          p_session_id: sessionId,
          p_severity: error.severity
        })
      }
      
      // Insert sample performance metrics
      for (const page of samplePages) {
        const mockMetrics = {
          page_load_time: Math.floor(Math.random() * 3000) + 500, // 500-3500ms
          dom_content_loaded: Math.floor(Math.random() * 2000) + 300,
          first_contentful_paint: Math.floor(Math.random() * 1500) + 800,
          largest_contentful_paint: Math.floor(Math.random() * 2000) + 1000,
          cumulative_layout_shift: Math.random() * 0.3,
          first_input_delay: Math.floor(Math.random() * 100) + 10,
          device_info: { userAgent: navigator.userAgent, platform: navigator.platform },
          browser_info: { name: 'Chrome', version: '120.0.0' }
        }
        
        await this.supabase.rpc('record_performance_metrics', {
          p_session_id: `demo_${sessionId}`,
          p_page_url: page,
          p_metrics: mockMetrics
        })
      }
      
      console.log('✅ Test data generated successfully!')
      console.log('🔍 Check Settings > Performance to see the data in action')
      
    } catch (error) {
      console.error('❌ Failed to generate test data:', error)
    }
  }
}

// Export for use in browser console or components
export const testPerformanceSystem = new PerformanceSystemTester()

// Auto-run tests if in development and in browser
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Add to window for easy access in dev tools
  ;(window as any).testPerformanceSystem = testPerformanceSystem
  
  console.log('🧪 Performance System Tester loaded!')
  console.log('💡 Run testPerformanceSystem.runAllTests() to test functionality')
  console.log('💡 Run testPerformanceSystem.generateTestData() to create sample data')
}