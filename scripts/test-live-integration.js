#!/usr/bin/env node

/**
 * Test Script for NEXUS Live Integration System
 * Verifies all systems are connected and functioning
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testLiveIntegration() {
  console.log('🧪 Testing NEXUS Live Integration System...\n')
  
  const results = {
    database: false,
    realtime: false,
    mlModels: false,
    caching: false,
    architecture: false
  }

  try {
    // Test 1: Database Connection
    console.log('1️⃣  Testing Database Connection...')
    const { data: tenants, error: dbError } = await supabase
      .from('tenants')
      .select('id, name')
      .limit(1)
    
    if (!dbError && tenants) {
      results.database = true
      console.log('   ✅ Database connected successfully')
      console.log(`   📊 Found ${tenants.length} tenant(s)\n`)
    } else {
      console.log('   ❌ Database connection failed:', dbError?.message)
    }

    // Test 2: Real-time Subscriptions
    console.log('2️⃣  Testing Real-time Subscriptions...')
    let realtimeWorking = false
    
    const channel = supabase
      .channel('test-channel')
      .on('broadcast', { event: 'test' }, (payload) => {
        realtimeWorking = true
      })
      .subscribe()

    // Send a test broadcast
    await channel.send({
      type: 'broadcast',
      event: 'test',
      payload: { message: 'Integration test' }
    })

    // Wait a moment for the broadcast
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (channel.state === 'joined') {
      results.realtime = true
      console.log('   ✅ Real-time subscriptions working')
    } else {
      console.log('   ⚠️  Real-time subscriptions not fully connected')
    }
    
    await supabase.removeChannel(channel)
    console.log()

    // Test 3: ML Models & Predictions
    console.log('3️⃣  Testing ML Models & Predictions...')
    
    // Check if predictions cache exists
    const { data: predictions, error: predError } = await supabase
      .from('predictions_cache')
      .select('id, model_type, confidence_score')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (!predError) {
      results.mlModels = true
      console.log('   ✅ ML predictions table accessible')
      console.log(`   🤖 Found ${predictions?.length || 0} recent predictions`)
      
      if (predictions && predictions.length > 0) {
        const avgConfidence = predictions.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / predictions.length
        console.log(`   📈 Average confidence: ${(avgConfidence * 100).toFixed(1)}%`)
      }
    } else {
      console.log('   ⚠️  ML predictions table not accessible:', predError.message)
    }
    console.log()

    // Test 4: Construction Principles
    console.log('4️⃣  Testing Construction Intelligence...')
    const { data: principles, error: princError } = await supabase
      .from('construction_principles')
      .select('category, confidence_score')
      .limit(10)
    
    if (!princError && principles) {
      console.log('   ✅ Construction principles loaded')
      console.log(`   🏗️  Found ${principles.length} construction principles`)
      
      const categories = [...new Set(principles.map(p => p.category))]
      console.log(`   📋 Categories: ${categories.join(', ')}`)
    } else {
      console.log('   ⚠️  Construction principles not accessible')
    }
    console.log()

    // Test 5: Calendar & Weather Integration
    console.log('5️⃣  Testing Calendar & Weather Integration...')
    const { data: events, error: eventError } = await supabase
      .from('calendar_events')
      .select('id, title, work_location')
      .not('work_location', 'is', null)
      .limit(5)
    
    if (!eventError && events) {
      console.log('   ✅ Calendar events with work locations found')
      console.log(`   📅 ${events.length} events have location data`)
      
      const locations = [...new Set(events.map(e => e.work_location))]
      console.log(`   🌍 Work locations: ${locations.join(', ')}`)
    } else {
      console.log('   ⚠️  No events with work locations found')
    }
    console.log()

    // Test 6: Architecture Analysis
    console.log('6️⃣  Testing Enterprise Architecture Analysis...')
    const { data: reports, error: reportError } = await supabase
      .from('architecture_analysis_reports')
      .select('production_readiness_score, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (!reportError && reports && reports.length > 0) {
      results.architecture = true
      console.log('   ✅ Architecture analysis accessible')
      console.log(`   🏢 Latest score: ${reports[0].production_readiness_score}/100`)
      console.log(`   📅 Last analysis: ${new Date(reports[0].created_at).toLocaleDateString()}`)
    } else {
      console.log('   ⚠️  No architecture analysis reports found')
    }
    console.log()

    // Test 7: Performance Metrics
    console.log('7️⃣  Testing Performance Monitoring...')
    const { data: metrics, error: metricsError } = await supabase
      .from('performance_metrics')
      .select('metric_type, metrics_data')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (!metricsError && metrics) {
      console.log('   ✅ Performance metrics accessible')
      console.log(`   📊 Found ${metrics.length} recent metrics`)
      
      const types = [...new Set(metrics.map(m => m.metric_type))]
      console.log(`   📈 Metric types: ${types.join(', ')}`)
    } else {
      console.log('   ⚠️  Performance metrics not accessible')
    }
    console.log()

    // Test 8: ML Feedback Loop
    console.log('8️⃣  Testing ML Feedback Loop...')
    const { data: feedback, error: feedbackError } = await supabase
      .from('ml_feedback')
      .select('user_action, confidence_before')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (!feedbackError) {
      console.log('   ✅ ML feedback loop accessible')
      console.log(`   🔄 Found ${feedback?.length || 0} feedback entries`)
      
      if (feedback && feedback.length > 0) {
        const accepted = feedback.filter(f => f.user_action === 'accepted').length
        const acceptance = (accepted / feedback.length * 100).toFixed(1)
        console.log(`   ✅ Acceptance rate: ${acceptance}%`)
      }
    } else {
      console.log('   ⚠️  ML feedback loop not accessible')
    }
    console.log()

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 NEXUS Live Integration Test Summary:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    const totalTests = Object.keys(results).length
    const passed = Object.values(results).filter(r => r).length
    const percentage = (passed / totalTests * 100).toFixed(0)
    
    console.log(`✅ Database Connection: ${results.database ? '✓' : '✗'}`)
    console.log(`✅ Real-time Subscriptions: ${results.realtime ? '✓' : '✗'}`)
    console.log(`✅ ML Models: ${results.mlModels ? '✓' : '✗'}`)
    console.log(`✅ Architecture Analysis: ${results.architecture ? '✓' : '✗'}`)
    console.log()
    console.log(`Overall Integration Score: ${percentage}% (${passed}/${totalTests} systems connected)`)
    
    if (percentage === '100') {
      console.log('\n🎉 NEXUS Live Integration is FULLY OPERATIONAL! 🚀')
    } else if (percentage >= '75') {
      console.log('\n✨ NEXUS Live Integration is mostly operational')
    } else if (percentage >= '50') {
      console.log('\n⚠️  NEXUS Live Integration is partially operational')
    } else {
      console.log('\n❌ NEXUS Live Integration needs attention')
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error)
  }
}

// Run the test
testLiveIntegration()
  .then(() => {
    console.log('\n✅ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })