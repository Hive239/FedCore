/**
 * Bayesian Optimization for Hyperparameter Tuning
 * Advanced optimization using Gaussian Process surrogate models
 */

import * as tf from '@tensorflow/tfjs'

interface HyperparameterSpace {
  learningRate: { min: number; max: number; type: 'continuous' }
  batchSize: { values: number[]; type: 'discrete' }
  dropoutRate: { min: number; max: number; type: 'continuous' }
  hiddenUnits: { min: number; max: number; type: 'integer' }
  layers: { min: number; max: number; type: 'integer' }
}

interface OptimizationResult {
  bestParams: Record<string, any>
  bestScore: number
  history: Array<{
    params: Record<string, any>
    score: number
    iteration: number
  }>
  convergenceRate: number
}

export class BayesianOptimizer {
  private space: HyperparameterSpace
  private observedParams: Array<Record<string, any>> = []
  private observedScores: number[] = []
  private surrogateMean: number[] = []
  private surrogateStd: number[] = []
  
  constructor(space: HyperparameterSpace) {
    this.space = space
  }

  /**
   * Run Bayesian optimization to find best hyperparameters
   */
  async optimize(
    objectiveFunction: (params: Record<string, any>) => Promise<number>,
    nIterations: number = 50,
    nInitialPoints: number = 10
  ): Promise<OptimizationResult> {
    console.log('🎯 Starting Bayesian Optimization')
    
    const history: OptimizationResult['history'] = []
    
    // Initial random exploration
    console.log('📊 Initial exploration phase...')
    for (let i = 0; i < nInitialPoints; i++) {
      const params = this.sampleRandom()
      const score = await objectiveFunction(params)
      
      this.observedParams.push(params)
      this.observedScores.push(score)
      
      history.push({
        params,
        score,
        iteration: i
      })
      
      console.log(`   Iteration ${i + 1}: Score = ${score.toFixed(4)}`)
    }
    
    // Bayesian optimization loop
    console.log('🔍 Optimization phase...')
    for (let i = nInitialPoints; i < nIterations; i++) {
      // Fit Gaussian Process surrogate model
      this.fitSurrogate()
      
      // Find next point using acquisition function
      const nextParams = this.acquisitionFunction()
      const score = await objectiveFunction(nextParams)
      
      this.observedParams.push(nextParams)
      this.observedScores.push(score)
      
      history.push({
        params: nextParams,
        score,
        iteration: i
      })
      
      console.log(`   Iteration ${i + 1}: Score = ${score.toFixed(4)}`)
      
      // Check for convergence
      if (this.hasConverged(history, i)) {
        console.log('✅ Converged early!')
        break
      }
    }
    
    // Find best parameters
    const bestIdx = this.observedScores.indexOf(Math.max(...this.observedScores))
    const bestParams = this.observedParams[bestIdx]
    const bestScore = this.observedScores[bestIdx]
    
    console.log('🏆 Best parameters found:')
    console.log(`   Score: ${bestScore.toFixed(4)}`)
    console.log(`   Parameters:`, bestParams)
    
    return {
      bestParams,
      bestScore,
      history,
      convergenceRate: this.calculateConvergenceRate(history)
    }
  }

  /**
   * Sample random parameters from the search space
   */
  private sampleRandom(): Record<string, any> {
    const params: Record<string, any> = {}
    
    for (const [key, config] of Object.entries(this.space)) {
      if (config.type === 'continuous') {
        params[key] = Math.random() * (config.max - config.min) + config.min
      } else if (config.type === 'discrete') {
        params[key] = config.values[Math.floor(Math.random() * config.values.length)]
      } else if (config.type === 'integer') {
        params[key] = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min
      }
    }
    
    return params
  }

  /**
   * Fit Gaussian Process surrogate model
   */
  private fitSurrogate() {
    if (this.observedParams.length < 2) return
    
    // Simplified GP fitting (in production, use proper GP library)
    const n = this.observedParams.length
    
    // Calculate mean and std
    const mean = this.observedScores.reduce((a, b) => a + b, 0) / n
    const variance = this.observedScores.reduce((sum, score) => 
      sum + Math.pow(score - mean, 2), 0) / n
    const std = Math.sqrt(variance)
    
    // Update surrogate predictions
    this.surrogateMean = new Array(n).fill(mean)
    this.surrogateStd = new Array(n).fill(std)
  }

  /**
   * Acquisition function (Expected Improvement)
   */
  private acquisitionFunction(): Record<string, any> {
    const nCandidates = 1000
    let bestCandidate = this.sampleRandom()
    let bestEI = -Infinity
    
    const currentBest = Math.max(...this.observedScores)
    
    for (let i = 0; i < nCandidates; i++) {
      const candidate = this.sampleRandom()
      
      // Calculate Expected Improvement
      const { mean, std } = this.predictSurrogate(candidate)
      const improvement = mean - currentBest
      
      let ei = 0
      if (std > 0) {
        const z = improvement / std
        const phi = this.normalCDF(z)
        const pdf = this.normalPDF(z)
        ei = improvement * phi + std * pdf
      }
      
      if (ei > bestEI) {
        bestEI = ei
        bestCandidate = candidate
      }
    }
    
    return bestCandidate
  }

  /**
   * Predict using surrogate model
   */
  private predictSurrogate(params: Record<string, any>): { mean: number; std: number } {
    // Simplified prediction (in production, use proper GP prediction)
    if (this.observedScores.length === 0) {
      return { mean: 0, std: 1 }
    }
    
    // Find most similar observed point
    let minDistance = Infinity
    let closestIdx = 0
    
    for (let i = 0; i < this.observedParams.length; i++) {
      const distance = this.parameterDistance(params, this.observedParams[i])
      if (distance < minDistance) {
        minDistance = distance
        closestIdx = i
      }
    }
    
    // Return prediction based on closest point
    const mean = this.observedScores[closestIdx]
    const std = Math.max(0.01, minDistance) // Uncertainty increases with distance
    
    return { mean, std }
  }

  /**
   * Calculate distance between parameter sets
   */
  private parameterDistance(p1: Record<string, any>, p2: Record<string, any>): number {
    let distance = 0
    
    for (const key of Object.keys(this.space)) {
      const config = this.space[key]
      const v1 = p1[key]
      const v2 = p2[key]
      
      if (config.type === 'continuous' || config.type === 'integer') {
        const range = config.max - config.min
        distance += Math.pow((v1 - v2) / range, 2)
      } else if (config.type === 'discrete') {
        distance += v1 !== v2 ? 1 : 0
      }
    }
    
    return Math.sqrt(distance)
  }

  /**
   * Check for convergence
   */
  private hasConverged(history: OptimizationResult['history'], currentIteration: number): boolean {
    if (currentIteration < 10) return false
    
    // Check if best score hasn't improved in last 5 iterations
    const recentScores = history.slice(-5).map(h => h.score)
    const maxRecent = Math.max(...recentScores)
    const previousBest = Math.max(...history.slice(0, -5).map(h => h.score))
    
    return maxRecent <= previousBest * 1.001 // Less than 0.1% improvement
  }

  /**
   * Calculate convergence rate
   */
  private calculateConvergenceRate(history: OptimizationResult['history']): number {
    if (history.length < 2) return 0
    
    const scores = history.map(h => h.score)
    const bestScore = Math.max(...scores)
    const firstScore = scores[0]
    
    // Calculate how quickly we reached 95% of best score
    let iterationsTo95 = history.length
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] >= bestScore * 0.95) {
        iterationsTo95 = i + 1
        break
      }
    }
    
    return 1 - (iterationsTo95 / history.length)
  }

  /**
   * Normal distribution CDF
   */
  private normalCDF(x: number): number {
    const a1 = 0.254829592
    const a2 = -0.284496736
    const a3 = 1.421413741
    const a4 = -1.453152027
    const a5 = 1.061405429
    const p = 0.3275911
    
    const sign = x < 0 ? -1 : 1
    x = Math.abs(x) / Math.sqrt(2)
    
    const t = 1 / (1 + p * x)
    const t2 = t * t
    const t3 = t2 * t
    const t4 = t3 * t
    const t5 = t4 * t
    
    const y = 1 - ((a1 * t + a2 * t2 + a3 * t3 + a4 * t4 + a5 * t5) * Math.exp(-x * x))
    
    return 0.5 * (1 + sign * y)
  }

  /**
   * Normal distribution PDF
   */
  private normalPDF(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
  }
}

/**
 * Factory function for common optimization scenarios
 */
export function createOptimizer(scenario: 'neural_network' | 'gradient_boosting' | 'svm'): BayesianOptimizer {
  let space: HyperparameterSpace
  
  switch (scenario) {
    case 'neural_network':
      space = {
        learningRate: { min: 0.0001, max: 0.01, type: 'continuous' },
        batchSize: { values: [16, 32, 64, 128], type: 'discrete' },
        dropoutRate: { min: 0.1, max: 0.5, type: 'continuous' },
        hiddenUnits: { min: 32, max: 512, type: 'integer' },
        layers: { min: 2, max: 6, type: 'integer' }
      }
      break
      
    case 'gradient_boosting':
      space = {
        learningRate: { min: 0.01, max: 0.3, type: 'continuous' },
        batchSize: { values: [100, 200, 500], type: 'discrete' },
        dropoutRate: { min: 0, max: 0.2, type: 'continuous' },
        hiddenUnits: { min: 50, max: 200, type: 'integer' },
        layers: { min: 3, max: 10, type: 'integer' }
      }
      break
      
    case 'svm':
      space = {
        learningRate: { min: 0.001, max: 1.0, type: 'continuous' },
        batchSize: { values: [32, 64, 128], type: 'discrete' },
        dropoutRate: { min: 0, max: 0.1, type: 'continuous' },
        hiddenUnits: { min: 10, max: 100, type: 'integer' },
        layers: { min: 1, max: 3, type: 'integer' }
      }
      break
  }
  
  return new BayesianOptimizer(space)
}