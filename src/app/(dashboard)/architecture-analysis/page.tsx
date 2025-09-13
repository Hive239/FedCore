/**
 * Architecture Analysis Page - Server Side Rendered for Better Performance
 * Uses Server Components for improved SSR and SEO
 */

import ServerDataFetcher from '@/components/architecture/ServerDataFetcher'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Architecture Analysis | ProjectPro',
  description: 'Comprehensive enterprise architecture analysis with ML-powered insights and real-time monitoring.',
  keywords: ['architecture', 'analysis', 'performance', 'security', 'monitoring']
}

// Enable ISR (Incremental Static Regeneration) for better performance
export const revalidate = 300 // 5 minutes

export default function ArchitectureAnalysisPage() {
  return <ServerDataFetcher />
}