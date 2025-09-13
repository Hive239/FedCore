"use client"

import React from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ChartData {
  name?: string
  value?: number
  timestamp?: string
  [key: string]: any
}

export const PerformanceTrendChart = ({ data }: { data: ChartData[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="pageLoad" 
              stroke="#8884d8" 
              fill="#8884d8" 
              fillOpacity={0.6}
              name="Page Load (ms)"
            />
            <Area 
              type="monotone" 
              dataKey="fcp" 
              stroke="#82ca9d" 
              fill="#82ca9d" 
              fillOpacity={0.6}
              name="First Contentful Paint"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export const ErrorFrequencyChart = ({ data }: { data: ChartData[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Frequency</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="errors" 
              stroke="#ff7300" 
              strokeWidth={2}
              name="Errors"
            />
            <Line 
              type="monotone" 
              dataKey="critical" 
              stroke="#ff0000" 
              strokeWidth={2}
              name="Critical"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export const CacheHitRateChart = ({ data }: { data: ChartData[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cache Hit Rate</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="hits" fill="#82ca9d" name="Cache Hits" />
            <Bar dataKey="misses" fill="#ff7300" name="Cache Misses" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export const MemoryUsageChart = ({ data }: { data: ChartData[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Memory Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="memory" 
              stroke="#8884d8" 
              strokeWidth={2}
              name="Memory (MB)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export const ErrorSeverityDistribution = ({ data }: { data: ChartData[] }) => {
  const COLORS = {
    critical: '#ff0000',
    high: '#ff7300',
    medium: '#ffc658',
    low: '#82ca9d'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Severity Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#8884d8'} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export const WebVitalsTrend = ({ data }: { data: ChartData[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Core Web Vitals Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="lcp" stroke="#8884d8" name="LCP (ms)" />
            <Line type="monotone" dataKey="fid" stroke="#82ca9d" name="FID (ms)" />
            <Line type="monotone" dataKey="cls" stroke="#ffc658" name="CLS" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}