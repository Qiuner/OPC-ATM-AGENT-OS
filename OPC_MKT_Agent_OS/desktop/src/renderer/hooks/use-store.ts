/**
 * useStore — React hooks for IPC data fetching
 *
 * 替代 web/ 中的 fetch('/api/xxx') 模式。
 * 提供 loading / error / data 状态管理。
 */

import { useState, useEffect, useCallback } from 'react'
import { getApi } from '@/lib/ipc'
import type {
  Task,
  Content,
  ContextAsset,
  MetricRecord,
  AgentRun,
  Campaign,
  ApprovalRecord,
} from '@/types'

export interface StoreState<T> {
  data: T
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// ── Tasks ──

export function useTasks(filter?: Record<string, string>): StoreState<Task[]> {
  const [data, setData] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const filterKey = filter ? JSON.stringify(filter) : ''

  const refetch = useCallback(async () => {
    const api = getApi()
    if (!api) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await api.tasks.list(filter)
      if (res.success && res.data) {
        setData(res.data)
        setError(null)
      } else {
        setError(res.error ?? 'Failed to load tasks')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

// ── Contents ──

export function useContents(filter?: Record<string, string>): StoreState<Content[]> {
  const [data, setData] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const filterKey = filter ? JSON.stringify(filter) : ''

  const refetch = useCallback(async () => {
    const api = getApi()
    if (!api) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await api.contents.list(filter)
      if (res.success && res.data) {
        setData(res.data)
        setError(null)
      } else {
        setError(res.error ?? 'Failed to load contents')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

// ── Approvals ──

export function useApprovals(filter?: Record<string, string>): StoreState<ApprovalRecord[]> {
  const [data, setData] = useState<ApprovalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const filterKey = filter ? JSON.stringify(filter) : ''

  const refetch = useCallback(async () => {
    const api = getApi()
    if (!api) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await api.approvals.list(filter)
      if (res.success && res.data) {
        setData(res.data as ApprovalRecord[])
        setError(null)
      } else {
        setError(res.error ?? 'Failed to load approvals')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

// ── Context Assets ──

export function useContextAssets(filter?: Record<string, string>): StoreState<ContextAsset[]> {
  const [data, setData] = useState<ContextAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const filterKey = filter ? JSON.stringify(filter) : ''

  const refetch = useCallback(async () => {
    const api = getApi()
    if (!api) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await api.context.list(filter)
      if (res.success && res.data) {
        setData(res.data)
        setError(null)
      } else {
        setError(res.error ?? 'Failed to load context assets')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

// ── Metrics ──

export function useMetrics(filter?: Record<string, string>): StoreState<MetricRecord[]> {
  const [data, setData] = useState<MetricRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const filterKey = filter ? JSON.stringify(filter) : ''

  const refetch = useCallback(async () => {
    const api = getApi()
    if (!api) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await api.metrics.list(filter)
      if (res.success && res.data) {
        setData(res.data)
        setError(null)
      } else {
        setError(res.error ?? 'Failed to load metrics')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

// ── Agent Runs ──

export function useAgentRuns(): StoreState<AgentRun[]> {
  const [data, setData] = useState<AgentRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    const api = getApi()
    if (!api) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await api.agentRuns.list()
      if (res.success && res.data) {
        setData(res.data)
        setError(null)
      } else {
        setError(res.error ?? 'Failed to load agent runs')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

// ── Campaigns ──

export function useCampaigns(): StoreState<Campaign[]> {
  const [data, setData] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    const api = getApi()
    if (!api) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await api.campaigns.list()
      if (res.success && res.data) {
        setData(res.data)
        setError(null)
      } else {
        setError(res.error ?? 'Failed to load campaigns')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

// ── Dashboard Metrics ──

export interface DashboardMetrics {
  totalTasks: number
  reviewContents: number
  publishedContents: number
  activeCampaigns: number
}

export function useDashboardMetrics(): StoreState<DashboardMetrics> {
  const [data, setData] = useState<DashboardMetrics>({
    totalTasks: 0,
    reviewContents: 0,
    publishedContents: 0,
    activeCampaigns: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    const api = getApi()
    if (!api) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const [tasksRes, contentsRes, campaignsRes] = await Promise.all([
        api.tasks.list(),
        api.contents.list(),
        api.campaigns.list(),
      ])

      const tasks = tasksRes.success && tasksRes.data ? tasksRes.data : []
      const contents = contentsRes.success && contentsRes.data ? contentsRes.data : []
      const campaigns = campaignsRes.success && campaignsRes.data ? campaignsRes.data : []

      setData({
        totalTasks: tasks.length,
        reviewContents: contents.filter((c) => c.status === 'review').length,
        publishedContents: contents.filter((c) => c.status === 'published').length,
        activeCampaigns: campaigns.filter((c) => c.status === 'active').length,
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
