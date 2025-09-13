/**
 * CDN and Static Asset Optimization
 * Implements intelligent asset delivery and optimization strategies
 */

interface CDNConfig {
  enabled: boolean
  baseUrl: string
  domains: string[]
  regions: string[]
}

interface AssetOptimization {
  images: {
    formats: string[]
    quality: number
    sizes: number[]
    lazy: boolean
    placeholder: 'blur' | 'empty'
  }
  fonts: {
    preload: string[]
    display: 'auto' | 'block' | 'swap' | 'fallback' | 'optional'
  }
  scripts: {
    defer: boolean
    async: boolean
    preload: string[]
  }
}

// CDN Configuration
const CDN_CONFIG: CDNConfig = {
  enabled: process.env.NODE_ENV === 'production',
  baseUrl: process.env.CDN_BASE_URL || '',
  domains: [
    'cdn1.projectpro.app',
    'cdn2.projectpro.app',
    'assets.projectpro.app'
  ],
  regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1']
}

// Asset Optimization Configuration
const ASSET_CONFIG: AssetOptimization = {
  images: {
    formats: ['avif', 'webp', 'png', 'jpg'],
    quality: 85,
    sizes: [320, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    lazy: true,
    placeholder: 'blur'
  },
  fonts: {
    preload: [
      '/fonts/inter-var.woff2',
      '/fonts/lato-regular.woff2'
    ],
    display: 'swap'
  },
  scripts: {
    defer: true,
    async: false,
    preload: [
      '/_next/static/chunks/pages/_app.js',
      '/_next/static/chunks/main.js'
    ]
  }
}

/**
 * CDN URL Generator
 */
export class CDNManager {
  private static instance: CDNManager
  private config: CDNConfig

  constructor(config: CDNConfig) {
    this.config = config
  }

  static getInstance(): CDNManager {
    if (!CDNManager.instance) {
      CDNManager.instance = new CDNManager(CDN_CONFIG)
    }
    return CDNManager.instance
  }

  // Get optimized asset URL
  getAssetUrl(path: string, options: {
    width?: number
    height?: number
    quality?: number
    format?: string
  } = {}): string {
    if (!this.config.enabled || !this.config.baseUrl) {
      return path
    }

    const url = new URL(path, this.config.baseUrl)
    
    // Add optimization parameters
    if (options.width) url.searchParams.set('w', options.width.toString())
    if (options.height) url.searchParams.set('h', options.height.toString())
    if (options.quality) url.searchParams.set('q', options.quality.toString())
    if (options.format) url.searchParams.set('f', options.format)

    return url.toString()
  }

  // Get image with responsive sizes
  getResponsiveImageUrl(path: string, options: {
    sizes: number[]
    quality?: number
    format?: string
  }): { src: string; srcSet: string } {
    const { sizes, quality = 85, format } = options
    
    const srcSet = sizes.map(width => {
      const url = this.getAssetUrl(path, { width, quality, format })
      return `${url} ${width}w`
    }).join(', ')

    return {
      src: this.getAssetUrl(path, { width: sizes[0], quality, format }),
      srcSet
    }
  }

  // Load balance across CDN domains
  getDomainForAsset(path: string): string {
    if (!this.config.enabled || this.config.domains.length === 0) {
      return ''
    }

    // Simple hash-based load balancing
    const hash = path.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const domainIndex = hash % this.config.domains.length
    
    return `https://${this.config.domains[domainIndex]}`
  }

  // Preload critical assets
  generatePreloadLinks(): string[] {
    const links: string[] = []

    // Preload fonts
    ASSET_CONFIG.fonts.preload.forEach(font => {
      const url = this.getAssetUrl(font)
      links.push(`<link rel="preload" href="${url}" as="font" type="font/woff2" crossorigin="anonymous">`)
    })

    // Preload critical scripts
    ASSET_CONFIG.scripts.preload.forEach(script => {
      const url = this.getAssetUrl(script)
      links.push(`<link rel="preload" href="${url}" as="script">`)
    })

    return links
  }

  // Generate resource hints
  generateResourceHints(): string[] {
    const hints: string[] = []

    // DNS prefetch for CDN domains
    this.config.domains.forEach(domain => {
      hints.push(`<link rel="dns-prefetch" href="//\${domain}">`)
    })

    // Preconnect to primary CDN
    if (this.config.domains.length > 0) {
      hints.push(`<link rel="preconnect" href="https://\${this.config.domains[0]}">`)
    }

    return hints
  }
}

/**
 * Image Optimization Component
 */
export interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  quality?: number
  priority?: boolean
  className?: string
  sizes?: string
  format?: 'avif' | 'webp' | 'auto'
}

export function generateOptimizedImageProps(props: OptimizedImageProps) {
  const cdnManager = CDNManager.getInstance()
  const { src, width, height, quality, format = 'auto', priority = false } = props

  // Generate responsive image URLs
  const responsiveUrls = cdnManager.getResponsiveImageUrl(src, {
    sizes: ASSET_CONFIG.images.sizes,
    quality: quality || ASSET_CONFIG.images.quality,
    format: format === 'auto' ? undefined : format
  })

  return {
    ...props,
    src: responsiveUrls.src,
    srcSet: responsiveUrls.srcSet,
    loading: priority ? 'eager' : 'lazy',
    decoding: 'async',
    sizes: props.sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
  }
}

/**
 * Asset Bundling and Optimization
 */
export class AssetBundler {
  private static criticalCss: string[] = []
  private static nonCriticalCss: string[] = []
  private static criticalJs: string[] = []
  private static nonCriticalJs: string[] = []

  // Register critical CSS that should be inlined
  static addCriticalCss(css: string): void {
    this.criticalCss.push(css)
  }

  // Register non-critical CSS for async loading
  static addNonCriticalCss(href: string): void {
    this.nonCriticalCss.push(href)
  }

  // Generate inline critical CSS
  static getCriticalCssInline(): string {
    return this.criticalCss.join('\n')
  }

  // Generate async CSS loading script
  static getAsyncCssLoader(): string {
    const loadCss = this.nonCriticalCss.map(href => 
      `loadCSS('${CDNManager.getInstance().getAssetUrl(href)}')`
    ).join(';')

    return `
      <script>
        function loadCSS(href) {
          var link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = href;
          link.media = 'print';
          link.onload = function() { this.media = 'all'; };
          document.head.appendChild(link);
        }
        ${loadCss}
      </script>
    `
  }

  // Service Worker cache strategy for assets
  static generateSwCacheConfig(): any {
    return {
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp|avif)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            },
            cacheKeyWillBeUsed: async ({ request }) => {
              // Remove query parameters for consistent caching
              const url = new URL(request.url)
              url.search = ''
              return url.href
            }
          },
        },
        {
          urlPattern: /^https:\/\/.*\.(woff|woff2|otf|ttf)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'fonts',
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
            },
          },
        },
        {
          urlPattern: /^https:\/\/.*\.(js|css)$/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-resources',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
            },
          },
        },
      ]
    }
  }
}

/**
 * Performance Monitoring for Assets
 */
export class AssetPerformanceMonitor {
  static measureAssetLoading(): void {
    if (typeof window === 'undefined') return

    // Measure largest contentful paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        console.log('[CDN] LCP:', entry)
      })
    }).observe({ entryTypes: ['largest-contentful-paint'] })

    // Measure resource timing
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        if (entry.name.includes('cdn') || entry.name.includes('assets')) {
          console.log('[CDN] Resource timing:', {
            name: entry.name,
            duration: entry.duration,
            transferSize: (entry as any).transferSize
          })
        }
      })
    }).observe({ entryTypes: ['resource'] })
  }

  static reportWebVitals(): void {
    if (typeof window === 'undefined') return

    // This would integrate with your analytics service
    console.log('[CDN] Web Vitals monitoring active')
  }
}

// Export singleton instance
export const cdnManager = CDNManager.getInstance()