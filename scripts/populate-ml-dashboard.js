#!/usr/bin/env node

/**
 * Populate ML Dashboard with Sample Data
 * Creates realistic data for all ML dashboard components
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function populateMLDashboard() {
  console.log('🚀 Populating ML Dashboard with Data\n');
  console.log('='.repeat(60));

  try {
    // 1. Create/Update ML Models with performance data
    console.log('\n📊 Updating ML Models...');
    const models = [
      { 
        model_name: 'nexus_top_tier', 
        version: '2.1.0', 
        accuracy_score: 0.923,
        is_active: true,
        model_type: 'construction_intelligence',
        description: 'TOP TIER construction intelligence system',
        last_training_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        total_predictions: 15432,
        avg_confidence: 0.876,
        feedback_score: 0.912,
        status: 'active'
      },
      { 
        model_name: 'weather_impact_analyzer', 
        version: '1.8.2',
        accuracy_score: 0.887,
        is_active: true,
        model_type: 'weather_prediction',
        description: 'Weather impact prediction for construction',
        last_training_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        total_predictions: 8234,
        avg_confidence: 0.834,
        feedback_score: 0.865,
        status: 'active'
      },
      { 
        model_name: 'schedule_optimizer', 
        version: '2.0.1',
        accuracy_score: 0.856,
        is_active: true,
        model_type: 'scheduling',
        description: 'Intelligent schedule optimization',
        last_training_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        total_predictions: 12876,
        avg_confidence: 0.812,
        feedback_score: 0.823,
        status: 'active'
      },
      { 
        model_name: 'resource_predictor', 
        version: '1.5.3',
        accuracy_score: 0.831,
        is_active: true,
        model_type: 'resource_management',
        description: 'Resource allocation predictor',
        last_training_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        total_predictions: 6543,
        avg_confidence: 0.798,
        feedback_score: 0.805,
        status: 'active'
      },
      { 
        model_name: 'predictive_maintenance', 
        version: '1.2.0',
        accuracy_score: 0.798,
        is_active: true,
        model_type: 'maintenance',
        description: 'Equipment maintenance predictor',
        last_training_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        total_predictions: 4321,
        avg_confidence: 0.765,
        feedback_score: 0.778,
        status: 'training'
      },
      { 
        model_name: 'worker_safety', 
        version: '2.3.1',
        accuracy_score: 0.942,
        is_active: true,
        model_type: 'safety',
        description: 'Worker safety risk analyzer',
        last_training_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        total_predictions: 9876,
        avg_confidence: 0.918,
        feedback_score: 0.935,
        status: 'active'
      },
      { 
        model_name: 'cost_prediction', 
        version: '1.9.0',
        accuracy_score: 0.825,
        is_active: true,
        model_type: 'financial',
        description: 'Cost overrun predictor',
        last_training_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        total_predictions: 7654,
        avg_confidence: 0.793,
        feedback_score: 0.812,
        status: 'active'
      },
      { 
        model_name: 'quality_control', 
        version: '1.7.2',
        accuracy_score: 0.913,
        is_active: true,
        model_type: 'quality',
        description: 'Quality inspection vision model',
        last_training_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        total_predictions: 5432,
        avg_confidence: 0.887,
        feedback_score: 0.901,
        status: 'active'
      },
      { 
        model_name: 'anomaly_detection', 
        version: '2.0.0',
        accuracy_score: 0.864,
        is_active: true,
        model_type: 'anomaly',
        description: 'Pattern anomaly detector',
        last_training_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        total_predictions: 3210,
        avg_confidence: 0.832,
        feedback_score: 0.845,
        status: 'active'
      }
    ];

    for (const model of models) {
      const { error } = await supabase
        .from('ml_models')
        .upsert(model, { onConflict: 'model_name' });
      
      if (!error) {
        console.log(`   ✅ ${model.model_name} - v${model.version} (${(model.accuracy_score * 100).toFixed(1)}% accuracy)`);
      } else {
        console.log(`   ⚠️ ${model.model_name} - ${error.message}`);
      }
    }

    // 2. Create A/B Tests
    console.log('\n🧪 Creating A/B Tests...');
    const abTests = [
      {
        test_name: 'Schedule vs Weather Priority',
        model_a_name: 'schedule_optimizer_v2.0',
        model_b_name: 'weather_adapted_scheduler_v1.0',
        status: 'running',
        start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        total_predictions_a: 5432,
        total_predictions_b: 5387,
        model_a_performance: 0.856,
        model_b_performance: 0.872,
        confidence_threshold: 0.95,
        significance_level: 0.05
      },
      {
        test_name: 'Resource Allocation Methods',
        model_a_name: 'resource_predictor_greedy',
        model_b_name: 'resource_predictor_balanced',
        status: 'completed',
        start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        winner: 'resource_predictor_balanced',
        total_predictions_a: 10234,
        total_predictions_b: 10456,
        model_a_performance: 0.798,
        model_b_performance: 0.831,
        confidence_threshold: 0.95,
        significance_level: 0.05
      },
      {
        test_name: 'Safety Model Comparison',
        model_a_name: 'worker_safety_v2.2',
        model_b_name: 'worker_safety_v2.3',
        status: 'running',
        start_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        total_predictions_a: 1234,
        total_predictions_b: 1198,
        model_a_performance: 0.923,
        model_b_performance: 0.942,
        confidence_threshold: 0.95,
        significance_level: 0.05
      }
    ];

    for (const test of abTests) {
      const { error } = await supabase
        .from('ab_tests')
        .insert(test);
      
      if (!error) {
        console.log(`   ✅ ${test.test_name} - ${test.status}`);
      } else {
        console.log(`   ⚠️ ${test.test_name} - ${error.message}`);
      }
    }

    // 3. Create Training Runs
    console.log('\n🎯 Creating Training Runs...');
    const trainingRuns = [
      {
        model_name: 'nexus_top_tier',
        status: 'running',
        current_epoch: 42,
        total_epochs: 100,
        best_accuracy: 0.923,
        best_loss: 0.198,
        current_loss: 0.234,
        learning_rate: 0.001,
        batch_size: 32,
        optimizer: 'adam',
        loss_function: 'categorical_crossentropy',
        start_time: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        model_name: 'weather_impact_analyzer',
        status: 'completed',
        current_epoch: 50,
        total_epochs: 50,
        best_accuracy: 0.887,
        best_loss: 0.276,
        current_loss: 0.312,
        learning_rate: 0.0005,
        batch_size: 64,
        optimizer: 'adam',
        loss_function: 'mse',
        start_time: new Date(Date.now() - 60 * 60 * 1000),
        end_time: new Date(Date.now() - 10 * 60 * 1000)
      },
      {
        model_name: 'schedule_optimizer',
        status: 'running',
        current_epoch: 18,
        total_epochs: 75,
        best_accuracy: 0.856,
        best_loss: 0.412,
        current_loss: 0.445,
        learning_rate: 0.002,
        batch_size: 16,
        optimizer: 'sgd',
        loss_function: 'binary_crossentropy',
        start_time: new Date(Date.now() - 15 * 60 * 1000)
      }
    ];

    for (const run of trainingRuns) {
      const { error } = await supabase
        .from('training_runs')
        .insert(run);
      
      if (!error) {
        console.log(`   ✅ ${run.model_name} - Epoch ${run.current_epoch}/${run.total_epochs} (${run.status})`);
      } else {
        console.log(`   ⚠️ ${run.model_name} - ${error.message}`);
      }
    }

    // 4. Generate Training Logs for active runs
    console.log('\n📈 Generating Training Logs...');
    const activeRuns = trainingRuns.filter(r => r.status === 'running');
    
    for (const run of activeRuns) {
      // Generate logs for completed epochs
      for (let epoch = 1; epoch <= run.current_epoch; epoch++) {
        const log = {
          model_name: run.model_name,
          epoch: epoch,
          loss: Math.max(0.1, 1.5 * Math.exp(-epoch * 0.05) + Math.random() * 0.1),
          accuracy: Math.min(0.99, 0.5 + 0.4 * (1 - Math.exp(-epoch * 0.08))),
          val_loss: Math.max(0.15, 1.6 * Math.exp(-epoch * 0.045) + Math.random() * 0.15),
          val_accuracy: Math.min(0.95, 0.45 + 0.4 * (1 - Math.exp(-epoch * 0.075))),
          learning_rate: run.learning_rate,
          time_taken: 30 + Math.random() * 20
        };

        await supabase.from('training_logs').insert(log);
      }
    }
    console.log(`   ✅ Generated training logs for ${activeRuns.length} active runs`);

    // 5. Create ML Events
    console.log('\n📢 Creating ML Events...');
    const events = [
      {
        event_type: 'prediction',
        event_name: 'Batch Prediction Completed',
        description: 'Processed 47 predictions for construction schedule optimization',
        severity: 'info',
        model_name: 'nexus_top_tier',
        metadata: { batch_size: 47, avg_confidence: 0.92 },
        created_at: new Date(Date.now() - 2 * 60 * 1000)
      },
      {
        event_type: 'experiment',
        event_name: 'A/B Test Completed',
        description: 'Schedule vs Weather test reached statistical significance',
        severity: 'info',
        model_name: null,
        metadata: { test_name: 'Schedule vs Weather Priority', winner: 'weather_adapted' },
        created_at: new Date(Date.now() - 15 * 60 * 1000)
      },
      {
        event_type: 'training',
        event_name: 'Auto-Retrain Triggered',
        description: 'Automatic retraining triggered for resource_predictor due to accuracy drop',
        severity: 'warning',
        model_name: 'resource_predictor',
        metadata: { current_accuracy: 0.78, threshold: 0.80 },
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000)
      },
      {
        event_type: 'optimization',
        event_name: 'Hyperparameter Tuning Completed',
        description: 'Bayesian optimization improved accuracy by 8%',
        severity: 'info',
        model_name: 'schedule_optimizer',
        metadata: { improvement: 0.08, best_params: { learning_rate: 0.0008, batch_size: 24 } },
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        event_type: 'alert',
        event_name: 'Anomaly Detected',
        description: 'Unusual pattern detected in construction schedule - possible delay',
        severity: 'high',
        model_name: 'anomaly_detection',
        metadata: { anomaly_score: 0.92, affected_tasks: 12 },
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000)
      }
    ];

    for (const event of events) {
      const { error } = await supabase
        .from('ml_events')
        .insert(event);
      
      if (!error) {
        console.log(`   ✅ ${event.event_name} (${event.event_type})`);
      } else {
        console.log(`   ⚠️ ${event.event_name} - ${error.message}`);
      }
    }

    // 6. Create Hyperparameter Tuning Results
    console.log('\n⚙️ Creating Hyperparameter Tuning Results...');
    const tuningResults = [
      {
        model_name: 'nexus_top_tier',
        optimization_method: 'bayesian',
        best_params: {
          learning_rate: 0.0008,
          batch_size: 32,
          dropout_rate: 0.3,
          hidden_units: 256,
          layers: 4
        },
        best_score: 0.923,
        convergence_rate: 0.87,
        iterations: 30,
        search_space: {
          learning_rate: { min: 0.0001, max: 0.01 },
          batch_size: [16, 32, 64, 128],
          dropout_rate: { min: 0.1, max: 0.5 }
        }
      },
      {
        model_name: 'schedule_optimizer',
        optimization_method: 'grid_search',
        best_params: {
          learning_rate: 0.002,
          batch_size: 16,
          optimizer: 'adam'
        },
        best_score: 0.856,
        convergence_rate: 0.72,
        iterations: 48,
        search_space: {
          learning_rate: [0.001, 0.002, 0.005],
          batch_size: [8, 16, 32],
          optimizer: ['adam', 'sgd', 'rmsprop']
        }
      }
    ];

    for (const result of tuningResults) {
      const { error } = await supabase
        .from('ml_hyperparameter_tuning')
        .insert(result);
      
      if (!error) {
        console.log(`   ✅ ${result.model_name} - ${result.optimization_method} (${(result.best_score * 100).toFixed(1)}%)`);
      } else {
        console.log(`   ⚠️ ${result.model_name} - ${error.message}`);
      }
    }

    // 7. Create Resource Usage Data
    console.log('\n💻 Creating Resource Usage Data...');
    const resourceData = {
      cpu_usage: 42.5,
      memory_usage: 3276.8,
      gpu_usage: 0, // No GPU yet
      gpu_memory: 0,
      model_storage: 1843.2,
      cache_size: 245.6,
      active_models: 9,
      running_experiments: 2
    };

    const { error: resourceError } = await supabase
      .from('ml_resource_usage')
      .insert(resourceData);
    
    if (!resourceError) {
      console.log(`   ✅ Resource usage: CPU ${resourceData.cpu_usage}%, Memory ${(resourceData.memory_usage/1024).toFixed(1)}GB`);
    } else {
      console.log(`   ⚠️ Resource usage - ${resourceError.message}`);
    }

    // 8. Generate Model Metrics Time Series
    console.log('\n📊 Generating Model Metrics Time Series...');
    const metricsCount = 24; // Last 24 hours of data
    
    for (const model of models) {
      for (let i = 0; i < metricsCount; i++) {
        const metric = {
          model_name: model.model_name,
          accuracy: model.accuracy_score + (Math.random() - 0.5) * 0.05,
          precision_score: model.accuracy_score - 0.02 + (Math.random() - 0.5) * 0.03,
          recall_score: model.accuracy_score - 0.03 + (Math.random() - 0.5) * 0.04,
          f1_score: model.accuracy_score - 0.01 + (Math.random() - 0.5) * 0.03,
          predictions_count: Math.floor(Math.random() * 500) + 100,
          avg_latency: 50 + Math.random() * 100,
          error_rate: (1 - model.accuracy_score) + (Math.random() - 0.5) * 0.02,
          created_at: new Date(Date.now() - (23 - i) * 60 * 60 * 1000)
        };

        await supabase.from('ml_model_metrics').insert(metric);
      }
    }
    console.log(`   ✅ Generated ${models.length * metricsCount} metric data points`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✨ ML DASHBOARD DATA POPULATION COMPLETE');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log(`  • ${models.length} ML Models configured`);
    console.log(`  • ${abTests.length} A/B Tests created`);
    console.log(`  • ${trainingRuns.length} Training Runs initiated`);
    console.log(`  • ${events.length} ML Events logged`);
    console.log(`  • ${tuningResults.length} Hyperparameter tuning results`);
    console.log(`  • ${models.length * metricsCount} Time-series metrics generated`);
    console.log('\n🎉 ML Dashboard is now fully populated with realistic data!');
    console.log('🚀 Access the dashboard at: /ml (Admin only)');

  } catch (error) {
    console.error('\n❌ Error populating ML Dashboard:', error);
    console.error('Details:', error.message);
  }
}

// Run the script
populateMLDashboard()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });