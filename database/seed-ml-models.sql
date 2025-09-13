-- Seed ML Models with initial data for dashboard display
-- This creates sample ML models to populate the dashboard

-- Insert sample ML models if they don't exist
INSERT INTO ml_models (
  model_name,
  model_type,
  version,
  accuracy_score,
  training_status,
  last_trained_at,
  is_active,
  model_metadata
) VALUES
  -- Project Prediction Models
  (
    'Project Completion Predictor',
    'classification',
    '1.0.0',
    0.92,
    'trained',
    NOW() - INTERVAL '2 days',
    true,
    jsonb_build_object(
      'algorithm', 'RandomForestClassifier',
      'features', ARRAY['duration', 'team_size', 'budget', 'complexity'],
      'training_samples', 5000,
      'validation_score', 0.89
    )
  ),
  (
    'Budget Forecaster',
    'regression',
    '1.0.0',
    0.88,
    'trained',
    NOW() - INTERVAL '5 days',
    true,
    jsonb_build_object(
      'algorithm', 'XGBoostRegressor',
      'features', ARRAY['project_type', 'duration', 'resources', 'historical_costs'],
      'training_samples', 3500,
      'mae', 2500.00
    )
  ),
  -- Performance Analysis Models
  (
    'Performance Anomaly Detector',
    'anomaly_detection',
    '2.1.0',
    0.94,
    'trained',
    NOW() - INTERVAL '1 day',
    true,
    jsonb_build_object(
      'algorithm', 'IsolationForest',
      'features', ARRAY['cpu_usage', 'memory_usage', 'response_time', 'error_rate'],
      'contamination', 0.1,
      'training_samples', 10000
    )
  ),
  (
    'Resource Utilization Optimizer',
    'optimization',
    '1.2.0',
    0.85,
    'trained',
    NOW() - INTERVAL '7 days',
    true,
    jsonb_build_object(
      'algorithm', 'GeneticAlgorithm',
      'features', ARRAY['workload', 'team_capacity', 'deadlines', 'priorities'],
      'generations', 100,
      'population_size', 50
    )
  ),
  -- Task Management Models
  (
    'Task Priority Classifier',
    'classification',
    '1.0.0',
    0.90,
    'trained',
    NOW() - INTERVAL '3 days',
    true,
    jsonb_build_object(
      'algorithm', 'GradientBoostingClassifier',
      'features', ARRAY['urgency', 'impact', 'effort', 'dependencies'],
      'training_samples', 4000,
      'classes', ARRAY['critical', 'high', 'medium', 'low']
    )
  ),
  (
    'Deadline Risk Predictor',
    'classification',
    '1.1.0',
    0.87,
    'trained',
    NOW() - INTERVAL '4 days',
    true,
    jsonb_build_object(
      'algorithm', 'LogisticRegression',
      'features', ARRAY['progress_rate', 'remaining_tasks', 'team_velocity', 'blockers'],
      'training_samples', 2500,
      'risk_threshold', 0.7
    )
  ),
  -- Experimental Models
  (
    'Natural Language Task Parser',
    'nlp',
    '0.9.0',
    0.82,
    'training',
    NOW() - INTERVAL '6 hours',
    false,
    jsonb_build_object(
      'algorithm', 'BERT-base',
      'features', ARRAY['task_description', 'context', 'user_history'],
      'training_samples', 1500,
      'status', 'experimental'
    )
  ),
  (
    'Team Collaboration Scorer',
    'regression',
    '1.0.0',
    0.79,
    'trained',
    NOW() - INTERVAL '10 days',
    true,
    jsonb_build_object(
      'algorithm', 'NeuralNetwork',
      'features', ARRAY['communication_frequency', 'response_time', 'task_completion', 'feedback_quality'],
      'training_samples', 2000,
      'layers', ARRAY[64, 32, 16, 1]
    )
  )
ON CONFLICT (model_name) DO UPDATE SET
  accuracy_score = EXCLUDED.accuracy_score,
  training_status = EXCLUDED.training_status,
  last_trained_at = EXCLUDED.last_trained_at,
  is_active = EXCLUDED.is_active,
  model_metadata = EXCLUDED.model_metadata;

-- Insert sample training jobs for recent activity
INSERT INTO ml_training_jobs (
  model_id,
  model_type,
  status,
  progress_percentage,
  current_epoch,
  total_epochs,
  training_accuracy,
  validation_accuracy,
  final_accuracy,
  started_at,
  completed_at,
  training_params
)
SELECT 
  m.id,
  m.model_type,
  CASE 
    WHEN m.training_status = 'training' THEN 'in_progress'
    ELSE 'completed'
  END,
  CASE 
    WHEN m.training_status = 'training' THEN 75
    ELSE 100
  END,
  CASE 
    WHEN m.training_status = 'training' THEN 38
    ELSE 50
  END,
  50,
  m.accuracy_score - 0.05,
  m.accuracy_score - 0.02,
  m.accuracy_score,
  m.last_trained_at - INTERVAL '2 hours',
  CASE 
    WHEN m.training_status = 'training' THEN NULL
    ELSE m.last_trained_at
  END,
  jsonb_build_object(
    'batch_size', 32,
    'learning_rate', 0.001,
    'optimizer', 'adam',
    'epochs', 50
  )
FROM ml_models m
WHERE m.last_trained_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- Insert sample predictions cache for activity metrics
INSERT INTO predictions_cache (
  model_id,
  input_data,
  prediction_result,
  confidence_score,
  cache_key
)
SELECT 
  m.id,
  jsonb_build_object(
    'test_input', 'sample_data_' || generate_series,
    'timestamp', NOW() - (generate_series || ' hours')::INTERVAL
  ),
  jsonb_build_object(
    'prediction', CASE m.model_type 
      WHEN 'classification' THEN (ARRAY['class_A', 'class_B', 'class_C'])[1 + (generate_series % 3)]
      WHEN 'regression' THEN (random() * 10000)::numeric(10,2)
      ELSE 'result_' || generate_series
    END,
    'probability', (0.7 + random() * 0.3)::numeric(4,3)
  ),
  (0.7 + random() * 0.3)::numeric(4,3),
  md5(m.id::text || generate_series::text)
FROM ml_models m
CROSS JOIN generate_series(1, 20) AS generate_series
WHERE m.is_active = true
  AND generate_series <= 5
ON CONFLICT (cache_key) DO NOTHING;

-- Update tenant settings to enable ML features
UPDATE tenants 
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{ml_features_enabled}',
  'true'::jsonb
)
WHERE settings IS NULL 
   OR settings->>'ml_features_enabled' IS NULL;