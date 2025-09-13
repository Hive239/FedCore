/**
 * Automated ML Training Pipeline
 * Handles model training, validation, and deployment
 */

import * as tf from '@tensorflow/tfjs'
import { createClient } from '@/lib/supabase/client'
import { BayesianOptimizer, createOptimizer } from './bayesian-optimizer'

export interface TrainingConfig {
  modelName: string
  epochs: number
  batchSize: number
  validationSplit: number
  learningRate: number
  patience: number
  minDelta: number
}

export interface TrainingResult {
  modelName: string
  finalAccuracy: number
  finalLoss: number
  trainingTime: number
  epochs: number
  improved: boolean
}

/**
 * Automated Training Pipeline
 */
export class MLTrainingPipeline {
  private supabase = createClient()
  private activeTraining: Map<string, boolean> = new Map()
  
  /**
   * Train a model with automated hyperparameter tuning
   */
  async trainModel(
    model: tf.Sequential,
    config: TrainingConfig,
    trainingData: tf.Tensor,
    labels: tf.Tensor
  ): Promise<TrainingResult> {
    console.log(`🚀 Starting training for ${config.modelName}`)
    
    const startTime = Date.now()
    
    // Set up early stopping
    const earlyStopping = tf.callbacks.earlyStopping({
      monitor: 'val_loss',
      patience: config.patience,
      minDelta: config.minDelta
    })
    
    // Custom callback to track progress
    const progressCallback = {
      onEpochEnd: async (epoch: number, logs: any) => {
        await this.logTrainingProgress(config.modelName, epoch, logs)
      }
    }
    
    // Train the model
    const history = await model.fit(trainingData, labels, {
      epochs: config.epochs,
      batchSize: config.batchSize,
      validationSplit: config.validationSplit,
      callbacks: [earlyStopping, progressCallback],
      verbose: 0
    })
    
    const trainingTime = Date.now() - startTime
    const finalAccuracy = history.history.acc[history.history.acc.length - 1] as number
    const finalLoss = history.history.loss[history.history.loss.length - 1] as number
    
    // Save training results
    const result: TrainingResult = {
      modelName: config.modelName,
      finalAccuracy,
      finalLoss,
      trainingTime,
      epochs: history.epoch.length,
      improved: await this.checkImprovement(config.modelName, finalAccuracy)
    }
    
    // Save model if improved
    if (result.improved) {
      await this.saveModel(model, config.modelName, finalAccuracy)
    }
    
    await this.logTrainingResult(result)
    
    return result
  }
  
  /**
   * Hyperparameter tuning using grid search
   */
  async hyperparameterTuning(
    modelBuilder: () => tf.Sequential,
    baseConfig: TrainingConfig,
    trainingData: tf.Tensor,
    labels: tf.Tensor
  ): Promise<TrainingConfig> {
    console.log(`🔍 Starting hyperparameter tuning for ${baseConfig.modelName}`)
    
    const hyperparamGrid = {
      learningRates: [0.001, 0.005, 0.01],
      batchSizes: [16, 32, 64],
      dropoutRates: [0.2, 0.3, 0.4]
    }
    
    let bestConfig = baseConfig
    let bestAccuracy = 0
    
    for (const lr of hyperparamGrid.learningRates) {
      for (const batchSize of hyperparamGrid.batchSizes) {
        const model = modelBuilder()
        
        // Compile with current hyperparameters
        model.compile({
          optimizer: tf.train.adam(lr),
          loss: 'categoricalCrossentropy',
          metrics: ['accuracy']
        })
        
        const config = {
          ...baseConfig,
          learningRate: lr,
          batchSize,
          epochs: 10 // Quick evaluation
        }
        
        const result = await this.trainModel(model, config, trainingData, labels)
        
        if (result.finalAccuracy > bestAccuracy) {
          bestAccuracy = result.finalAccuracy
          bestConfig = config
        }
        
        // Clean up
        model.dispose()
      }
    }
    
    console.log(`✅ Best hyperparameters found:`)
    console.log(`   Learning Rate: ${bestConfig.learningRate}`)
    console.log(`   Batch Size: ${bestConfig.batchSize}`)
    console.log(`   Best Accuracy: ${(bestAccuracy * 100).toFixed(2)}%`)
    
    return bestConfig
  }
  
  /**
   * Advanced hyperparameter tuning using Bayesian Optimization
   */
  async bayesianHyperparameterTuning(
    modelBuilder: (params: any) => tf.Sequential,
    baseConfig: TrainingConfig,
    trainingData: tf.Tensor,
    labels: tf.Tensor
  ): Promise<TrainingConfig> {
    console.log(`🧬 Starting Bayesian hyperparameter optimization for ${baseConfig.modelName}`)
    
    const optimizer = createOptimizer('neural_network')
    
    // Define objective function
    const objectiveFunction = async (params: Record<string, any>): Promise<number> => {
      const model = modelBuilder(params)
      
      model.compile({
        optimizer: tf.train.adam(params.learningRate),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      })
      
      const config = {
        ...baseConfig,
        learningRate: params.learningRate,
        batchSize: params.batchSize,
        epochs: 5 // Quick evaluation for optimization
      }
      
      const result = await this.trainModel(model, config, trainingData, labels)
      
      // Clean up
      model.dispose()
      
      return result.finalAccuracy
    }
    
    // Run optimization
    const optimizationResult = await optimizer.optimize(objectiveFunction, 30, 5)
    
    // Create optimized config
    const optimizedConfig = {
      ...baseConfig,
      learningRate: optimizationResult.bestParams.learningRate,
      batchSize: optimizationResult.bestParams.batchSize
    }
    
    console.log(`✅ Bayesian optimization complete:`)
    console.log(`   Best Accuracy: ${(optimizationResult.bestScore * 100).toFixed(2)}%`)
    console.log(`   Convergence Rate: ${(optimizationResult.convergenceRate * 100).toFixed(0)}%`)
    console.log(`   Optimal Parameters:`, optimizationResult.bestParams)
    
    // Log to database
    await this.supabase.from('ml_hyperparameter_tuning').insert({
      model_name: baseConfig.modelName,
      optimization_method: 'bayesian',
      best_params: optimizationResult.bestParams,
      best_score: optimizationResult.bestScore,
      convergence_rate: optimizationResult.convergenceRate,
      iterations: optimizationResult.history.length,
      timestamp: new Date().toISOString()
    })
    
    return optimizedConfig
  }
  
  /**
   * Continuous learning from feedback
   */
  async learnFromFeedback(modelName: string) {
    console.log(`📚 Learning from user feedback for ${modelName}`)
    
    // Get recent feedback
    const { data: feedback } = await this.supabase
      .from('ml_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (!feedback || feedback.length < 10) {
      console.log('Insufficient feedback for training')
      return
    }
    
    // Process feedback into training data
    const trainingData = this.processFeedback(feedback)
    
    // Retrain model with new data
    // This would be implemented based on specific model requirements
    console.log(`Processed ${feedback.length} feedback entries for training`)
    
    // Update model confidence based on feedback
    const acceptanceRate = feedback.filter(f => f.user_action === 'accepted').length / feedback.length
    
    await this.supabase
      .from('ml_models')
      .update({ 
        accuracy_score: acceptanceRate,
        updated_at: new Date().toISOString()
      })
      .eq('model_name', modelName)
    
    console.log(`✅ Model updated with ${(acceptanceRate * 100).toFixed(0)}% acceptance rate`)
  }
  
  /**
   * A/B Testing Framework
   */
  async runABTest(
    modelA: tf.Sequential,
    modelB: tf.Sequential,
    testName: string,
    testData: tf.Tensor,
    duration: number = 24 * 60 * 60 * 1000 // 24 hours default
  ) {
    console.log(`🧪 Starting A/B test: ${testName}`)
    
    const startTime = Date.now()
    const results = {
      modelA: { predictions: 0, accuracy: 0, confidence: 0 },
      modelB: { predictions: 0, accuracy: 0, confidence: 0 }
    }
    
    // Create test record
    await this.supabase.from('ab_tests').insert({
      test_name: testName,
      model_a_name: 'Model A',
      model_b_name: 'Model B',
      start_time: new Date().toISOString(),
      status: 'running'
    })
    
    // Simulate A/B testing (in production, this would route real traffic)
    const testInterval = setInterval(async () => {
      // Randomly assign to model A or B
      const useModelA = Math.random() < 0.5
      const model = useModelA ? modelA : modelB
      const resultKey = useModelA ? 'modelA' : 'modelB'
      
      // Make prediction
      const prediction = model.predict(testData) as tf.Tensor
      const confidence = await prediction.max().data()
      
      results[resultKey].predictions++
      results[resultKey].confidence += confidence[0]
      
      // Check if test duration completed
      if (Date.now() - startTime > duration) {
        clearInterval(testInterval)
        await this.concludeABTest(testName, results)
      }
    }, 1000) // Run every second for demo
    
    return results
  }
  
  /**
   * Automated retraining scheduler
   */
  async scheduleRetraining() {
    const models = await this.getActiveModels()
    
    for (const model of models) {
      // Check if retraining is needed
      const shouldRetrain = await this.shouldRetrain(model.model_name)
      
      if (shouldRetrain) {
        console.log(`📅 Scheduling retraining for ${model.model_name}`)
        
        // In production, this would trigger a background job
        await this.supabase.from('training_queue').insert({
          model_name: model.model_name,
          priority: this.calculatePriority(model),
          scheduled_at: new Date().toISOString(),
          status: 'pending'
        })
      }
    }
  }
  
  /**
   * Private helper methods
   */
  
  private async logTrainingProgress(modelName: string, epoch: number, logs: any) {
    await this.supabase.from('training_logs').insert({
      model_name: modelName,
      epoch,
      loss: logs.loss,
      accuracy: logs.acc,
      val_loss: logs.val_loss,
      val_accuracy: logs.val_acc,
      timestamp: new Date().toISOString()
    })
  }
  
  private async logTrainingResult(result: TrainingResult) {
    await this.supabase.from('training_results').insert({
      model_name: result.modelName,
      final_accuracy: result.finalAccuracy,
      final_loss: result.finalLoss,
      training_time: result.trainingTime,
      epochs: result.epochs,
      improved: result.improved,
      timestamp: new Date().toISOString()
    })
  }
  
  private async checkImprovement(modelName: string, newAccuracy: number): Promise<boolean> {
    const { data: currentModel } = await this.supabase
      .from('ml_models')
      .select('accuracy_score')
      .eq('model_name', modelName)
      .single()
    
    return !currentModel || newAccuracy > (currentModel.accuracy_score || 0)
  }
  
  private async saveModel(model: tf.Sequential, modelName: string, accuracy: number) {
    // Save to IndexedDB for browser storage
    await model.save(`indexeddb://${modelName}`)
    
    // Update database record
    await this.supabase
      .from('ml_models')
      .update({
        accuracy_score: accuracy,
        version: this.incrementVersion(await this.getModelVersion(modelName)),
        updated_at: new Date().toISOString()
      })
      .eq('model_name', modelName)
    
    console.log(`✅ Model ${modelName} saved with accuracy ${(accuracy * 100).toFixed(2)}%`)
  }
  
  private processFeedback(feedback: any[]): tf.Tensor {
    // Convert feedback to training data
    // This is a simplified version - real implementation would be model-specific
    const features = feedback.map(f => [
      f.confidence_before || 0,
      f.user_action === 'accepted' ? 1 : 0,
      // Add more features as needed
    ])
    
    return tf.tensor2d(features)
  }
  
  private async getActiveModels() {
    const { data } = await this.supabase
      .from('ml_models')
      .select('*')
      .eq('is_active', true)
    
    return data || []
  }
  
  private async shouldRetrain(modelName: string): Promise<boolean> {
    // Check various criteria for retraining
    const { data: metrics } = await this.supabase
      .from('ml_model_metrics')
      .select('*')
      .eq('model_name', modelName)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (!metrics || metrics.length === 0) return false
    
    // Retrain if accuracy dropping
    const recentAccuracy = metrics.reduce((sum, m) => sum + (m.accuracy || 0), 0) / metrics.length
    
    return recentAccuracy < 0.8 // Retrain if below 80% accuracy
  }
  
  private calculatePriority(model: any): number {
    // Higher priority for frequently used models with lower accuracy
    const usageWeight = 0.6
    const accuracyWeight = 0.4
    
    const usageScore = 1 // Would calculate based on prediction count
    const accuracyScore = 1 - (model.accuracy_score || 0)
    
    return usageScore * usageWeight + accuracyScore * accuracyWeight
  }
  
  private async concludeABTest(testName: string, results: any) {
    const modelAAvgConfidence = results.modelA.confidence / results.modelA.predictions
    const modelBAvgConfidence = results.modelB.confidence / results.modelB.predictions
    
    const winner = modelAAvgConfidence > modelBAvgConfidence ? 'Model A' : 'Model B'
    
    await this.supabase
      .from('ab_tests')
      .update({
        status: 'completed',
        winner,
        model_a_performance: modelAAvgConfidence,
        model_b_performance: modelBAvgConfidence,
        end_time: new Date().toISOString()
      })
      .eq('test_name', testName)
    
    console.log(`✅ A/B Test completed. Winner: ${winner}`)
  }
  
  private async getModelVersion(modelName: string): Promise<string> {
    const { data } = await this.supabase
      .from('ml_models')
      .select('version')
      .eq('model_name', modelName)
      .single()
    
    return data?.version || '1.0.0'
  }
  
  private incrementVersion(version: string): string {
    const parts = version.split('.')
    parts[2] = (parseInt(parts[2]) + 1).toString()
    return parts.join('.')
  }
}

// Export singleton instance
export const trainingPipeline = new MLTrainingPipeline()