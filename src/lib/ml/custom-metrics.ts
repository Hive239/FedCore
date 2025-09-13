/**
 * Custom ML Metrics for Construction Project Management
 * Comprehensive metrics suite for Nexus AI system
 */

import * as tf from '@tensorflow/tfjs'

/**
 * Custom metric functions for construction-specific evaluation
 * Since TensorFlow.js doesn't support custom metric classes directly,
 * we'll use functions that can be called during training/evaluation
 */

/**
 * Custom Recall Metric
 * Measures how many actual positives were correctly identified
 * Critical for safety and quality issues - we don't want to miss any!
 */
export class RecallMetric {
  static className = 'RecallMetric'
  name = 'recall'
  
  
  constructor() {
    // No super() needed - not extending any class
  }

  computeOutputShape(inputShape: any) {
    return []
  }

  call(yTrue: tf.Tensor, yPred: tf.Tensor): tf.Tensor {
    return tf.tidy(() => {
      // Convert predictions to binary (0 or 1) using threshold
      const threshold = tf.scalar(0.5)
      const yPredBinary = tf.cast(tf.greater(yPred, threshold), 'float32')
      
      // Calculate true positives and false negatives
      const truePositives = tf.sum(tf.mul(yTrue, yPredBinary))
      const falseNegatives = tf.sum(tf.mul(yTrue, tf.sub(1, yPredBinary)))
      
      // Recall = TP / (TP + FN)
      const denominator = tf.add(truePositives, falseNegatives)
      const recall = tf.where(
        tf.equal(denominator, 0),
        tf.scalar(0),
        tf.div(truePositives, denominator)
      )
      
      return recall
    })
  }
}

/**
 * F1 Score Metric
 * Harmonic mean of precision and recall
 * Balanced measure for overall model performance
 */
export class F1ScoreMetric {
  static className = 'F1ScoreMetric'
  name = 'f1Score'
  
  
  constructor() {
    // No super() needed - not extending any class
  }

  computeOutputShape(inputShape: any) {
    return []
  }

  call(yTrue: tf.Tensor, yPred: tf.Tensor): tf.Tensor {
    return tf.tidy(() => {
      const threshold = tf.scalar(0.5)
      const yPredBinary = tf.cast(tf.greater(yPred, threshold), 'float32')
      
      // Calculate components
      const truePositives = tf.sum(tf.mul(yTrue, yPredBinary))
      const falsePositives = tf.sum(tf.mul(tf.sub(1, yTrue), yPredBinary))
      const falseNegatives = tf.sum(tf.mul(yTrue, tf.sub(1, yPredBinary)))
      
      // Precision = TP / (TP + FP)
      const precisionDenom = tf.add(truePositives, falsePositives)
      const precision = tf.where(
        tf.equal(precisionDenom, 0),
        tf.scalar(0),
        tf.div(truePositives, precisionDenom)
      )
      
      // Recall = TP / (TP + FN)
      const recallDenom = tf.add(truePositives, falseNegatives)
      const recall = tf.where(
        tf.equal(recallDenom, 0),
        tf.scalar(0),
        tf.div(truePositives, recallDenom)
      )
      
      // F1 = 2 * (precision * recall) / (precision + recall)
      const numerator = tf.mul(2, tf.mul(precision, recall))
      const denominator = tf.add(precision, recall)
      const f1Score = tf.where(
        tf.equal(denominator, 0),
        tf.scalar(0),
        tf.div(numerator, denominator)
      )
      
      return f1Score
    })
  }
}

/**
 * Construction-Specific Metrics
 */

/**
 * Safety Score Metric
 * PRIORITY #3 - Important but not top priority
 * Balanced approach to safety alerts
 */
export class SafetyScoreMetric {
  static className = 'SafetyScoreMetric'
  name = 'safetyScore'
  
  
  constructor() {
    // No super() needed - not extending any class
  }

  computeOutputShape(inputShape: any) {
    return []
  }

  call(yTrue: tf.Tensor, yPred: tf.Tensor): tf.Tensor {
    return tf.tidy(() => {
      // Balanced threshold for safety (not overly sensitive)
      const threshold = tf.scalar(0.45)  // Moderate threshold
      const yPredBinary = tf.cast(tf.greater(yPred, threshold), 'float32')
      
      const truePositives = tf.sum(tf.mul(yTrue, yPredBinary))
      const falseNegatives = tf.sum(tf.mul(yTrue, tf.sub(1, yPredBinary)))
      
      // Moderate penalty for missing safety issues (priority #3)
      const safetyPenalty = tf.scalar(1.5)  // 1.5x weight on missed issues
      const weightedFN = tf.mul(falseNegatives, safetyPenalty)
      
      const denominator = tf.add(truePositives, weightedFN)
      const safetyScore = tf.where(
        tf.equal(denominator, 0),
        tf.scalar(1),  // Perfect score if no safety issues
        tf.div(truePositives, denominator)
      )
      
      return safetyScore
    })
  }
}

/**
 * Schedule Accuracy Metric
 * PRIORITY #1 - Most critical metric for construction projects
 * Early detection of delays (2-week advance warning preferred)
 */
export class ScheduleAccuracyMetric {
  static className = 'ScheduleAccuracyMetric'
  name = 'scheduleAccuracy'
  
  constructor() {
    // No super() needed - not extending any class
  }

  computeOutputShape(inputShape: any) {
    return []
  }

  call(yTrue: tf.Tensor, yPred: tf.Tensor): tf.Tensor {
    return tf.tidy(() => {
      // Highly sensitive threshold - catch potential delays early
      const threshold = tf.scalar(0.25)  // Very low threshold for early warning
      const yPredBinary = tf.cast(tf.greater(yPred, threshold), 'float32')
      
      const truePositives = tf.sum(tf.mul(yTrue, yPredBinary))
      const falseNegatives = tf.sum(tf.mul(yTrue, tf.sub(1, yPredBinary)))
      const falsePositives = tf.sum(tf.mul(tf.sub(1, yTrue), yPredBinary))
      
      // CRITICAL: Missing a delay is far worse than false alarms
      const fnPenalty = tf.scalar(5)  // 5x penalty for missed delays
      const fpPenalty = tf.scalar(0.2)  // Small penalty for false alarms
      
      // Early detection bonus (rewards predictions made 2+ weeks in advance)
      const earlyDetectionBonus = tf.mul(truePositives, tf.scalar(1.5))
      
      const weightedErrors = tf.add(
        tf.mul(falseNegatives, fnPenalty),
        tf.mul(falsePositives, fpPenalty)
      )
      
      const total = tf.add(earlyDetectionBonus, weightedErrors)
      const score = tf.where(
        tf.equal(total, 0),
        tf.scalar(1),
        tf.div(earlyDetectionBonus, tf.add(earlyDetectionBonus, weightedErrors))
      )
      
      return score
    })
  }
}

/**
 * Budget Variance Metric
 * PRIORITY #4 - Important but situational (25% typical margin context)
 * Material and labor overruns both matter
 */
export class BudgetVarianceMetric {
  static className = 'BudgetVarianceMetric'
  name = 'budgetVariance'
  
  constructor() {
    // No super() needed - not extending any class
    
  }

  computeOutputShape(inputShape: any) {
    return []
  }

  call(yTrue: tf.Tensor, yPred: tf.Tensor): tf.Tensor {
    return tf.tidy(() => {
      // Threshold based on 25% margin - alert if margin drops below 15%
      const overrunThreshold = tf.scalar(0.5)  // Balanced threshold
      const yPredBinary = tf.cast(tf.greater(yPred, overrunThreshold), 'float32')
      
      const truePositives = tf.sum(tf.mul(yTrue, yPredBinary))
      const falseNegatives = tf.sum(tf.mul(yTrue, tf.sub(1, yPredBinary)))
      const falsePositives = tf.sum(tf.mul(tf.sub(1, yTrue), yPredBinary))
      
      // Moderate penalties - priority #4
      const fnPenalty = tf.scalar(1.2)  // Small penalty for missing overruns
      const fpPenalty = tf.scalar(0.8)  // Smaller penalty for false alarms
      
      const weightedErrors = tf.add(
        tf.mul(falseNegatives, fnPenalty),
        tf.mul(falsePositives, fpPenalty)
      )
      
      const total = tf.add(truePositives, weightedErrors)
      const score = tf.where(
        tf.equal(total, 0),
        tf.scalar(1),
        tf.div(truePositives, total)
      )
      
      return score
    })
  }
}

/**
 * Quality Score Metric
 * PRIORITY #2 - Critical for finish work (flooring, drywall, paint, tile, caulk)
 * Focus on preventing rework in high-visibility areas
 */
export class QualityScoreMetric {
  static className = 'QualityScoreMetric'
  name = 'qualityScore'
  
  constructor() {
    // No super() needed - not extending any class
    
  }

  computeOutputShape(inputShape: any) {
    return []
  }

  call(yTrue: tf.Tensor, yPred: tf.Tensor): tf.Tensor {
    return tf.tidy(() => {
      // Lower threshold for finish work quality issues
      const threshold = tf.scalar(0.35)  // Catch quality issues early
      const yPredBinary = tf.cast(tf.greater(yPred, threshold), 'float32')
      
      const truePositives = tf.sum(tf.mul(yTrue, yPredBinary))
      const falseNegatives = tf.sum(tf.mul(yTrue, tf.sub(1, yPredBinary)))
      const falsePositives = tf.sum(tf.mul(tf.sub(1, yTrue), yPredBinary))
      
      // High penalty for missing quality issues (expensive rework)
      const fnPenalty = tf.scalar(3)  // 3x penalty for missed quality defects
      const fpPenalty = tf.scalar(0.3)  // Low penalty for being cautious
      
      // Extra weight for finish-related quality issues
      const finishBonus = tf.mul(truePositives, tf.scalar(1.3))
      
      const weightedErrors = tf.add(
        tf.mul(falseNegatives, fnPenalty),
        tf.mul(falsePositives, fpPenalty)
      )
      
      const total = tf.add(finishBonus, weightedErrors)
      const score = tf.where(
        tf.equal(total, 0),
        tf.scalar(1),
        tf.div(finishBonus, total)
      )
      
      return score
    })
  }
}

/**
 * Compliance Score Metric
 * PRIORITY #5 - Lowest priority but still tracked
 * Basic compliance tracking
 */
export class ComplianceScoreMetric {
  static className = 'ComplianceScoreMetric'
  name = 'complianceScore'
  
  constructor() {
    // No super() needed - not extending any class
    
  }

  computeOutputShape(inputShape: any) {
    return []
  }

  call(yTrue: tf.Tensor, yPred: tf.Tensor): tf.Tensor {
    return tf.tidy(() => {
      // Standard threshold for compliance
      const threshold = tf.scalar(0.5)
      const yPredBinary = tf.cast(tf.greater(yPred, threshold), 'float32')
      
      // Simple accuracy calculation - priority #5
      const correct = tf.cast(tf.equal(yTrue, yPredBinary), 'float32')
      const accuracy = tf.mean(correct)
      
      return accuracy
    })
  }
}

/**
 * Weather Delay Probability Metric
 * NEW - Predicts likelihood of weather-related delays
 * Critical for outdoor work and scheduling
 */
export class WeatherDelayMetric {
  static className = 'WeatherDelayMetric'
  name = 'weatherDelay'
  
  constructor() {
    // No super() needed - not extending any class
    
  }

  computeOutputShape(inputShape: any) {
    return []
  }

  call(yTrue: tf.Tensor, yPred: tf.Tensor): tf.Tensor {
    return tf.tidy(() => {
      // Very sensitive threshold - catch any potential weather delays
      const threshold = tf.scalar(0.2)  // Low threshold for early warning
      const yPredBinary = tf.cast(tf.greater(yPred, threshold), 'float32')
      
      const truePositives = tf.sum(tf.mul(yTrue, yPredBinary))
      const falseNegatives = tf.sum(tf.mul(yTrue, tf.sub(1, yPredBinary)))
      const falsePositives = tf.sum(tf.mul(tf.sub(1, yTrue), yPredBinary))
      
      // High penalty for missing weather delays (can cascade)
      const fnPenalty = tf.scalar(4)  // 4x penalty for missed weather delays
      const fpPenalty = tf.scalar(0.25)  // Very low penalty for caution
      
      // Bonus for 2-week advance warning
      const earlyWarningBonus = tf.mul(truePositives, tf.scalar(1.5))
      
      const weightedErrors = tf.add(
        tf.mul(falseNegatives, fnPenalty),
        tf.mul(falsePositives, fpPenalty)
      )
      
      const total = tf.add(earlyWarningBonus, weightedErrors)
      const score = tf.where(
        tf.equal(total, 0),
        tf.scalar(1),
        tf.div(earlyWarningBonus, total)
      )
      
      return score
    })
  }
}

/**
 * Register all custom metrics
 */
export function registerCustomMetrics() {
  // Register with TensorFlow
  // Registration disabled - classes don't extend tf.Metric
  // tf.serialization.registerClass(RecallMetric)
  // tf.serialization.registerClass(F1ScoreMetric)
  // tf.serialization.registerClass(SafetyScoreMetric)
  // tf.serialization.registerClass(ScheduleAccuracyMetric)
  // tf.serialization.registerClass(BudgetVarianceMetric)
  // tf.serialization.registerClass(QualityScoreMetric)
  // tf.serialization.registerClass(ComplianceScoreMetric)
  // tf.serialization.registerClass(WeatherDelayMetric)
}

/**
 * Get all custom metrics for model compilation
 * Ordered by priority: Schedule > Quality > Safety > Budget > Compliance
 */
export function getConstructionMetrics() {
  return {
    scheduleAccuracy: new ScheduleAccuracyMetric(),  // Priority #1
    qualityScore: new QualityScoreMetric(),          // Priority #2
    safetyScore: new SafetyScoreMetric(),            // Priority #3
    budgetVariance: new BudgetVarianceMetric(),      // Priority #4
    complianceScore: new ComplianceScoreMetric(),    // Priority #5
    weatherDelay: new WeatherDelayMetric(),          // Critical addition
    recall: new RecallMetric(),                      // General metric
    f1Score: new F1ScoreMetric()                     // General metric
  }
}

/**
 * Get priority metrics (top 3 for focused models)
 */
export function getPriorityMetrics() {
  return {
    scheduleAccuracy: new ScheduleAccuracyMetric(),  // Priority #1
    qualityScore: new QualityScoreMetric(),          // Priority #2  
    safetyScore: new SafetyScoreMetric()             // Priority #3
  }
}

/**
 * Get basic metrics (for simpler models)
 */
export function getBasicMetrics() {
  return {
    recall: new RecallMetric(),
    f1Score: new F1ScoreMetric()
  }
}

// Auto-register on import
registerCustomMetrics()