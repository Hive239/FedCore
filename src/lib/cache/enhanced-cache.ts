export class EnhancedCache {
  private cache = new Map()
  
  async get(key: string) {
    return this.cache.get(key)
  }
  
  async set(key: string, value: any, ttl?: number) {
    this.cache.set(key, value)
  }
  
  async delete(key: string) {
    return this.cache.delete(key)
  }
  
  async clear() {
    this.cache.clear()
  }
}

export const enhancedCache = new EnhancedCache()
export const systemCache = new EnhancedCache()