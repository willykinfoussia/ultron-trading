import type { AnalysisMethod, AnalysisResult } from './types'
import type { ConsensusReport, AIReport } from './types'

const API_BASE = '/api'

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  console.log(`[API] ${init?.method || 'GET'} ${url}`)
  try {
    const res = await fetch(url, init)
    if (!res.ok) {
      const body = await res.text()
      console.error(`[API] ← ${res.status} ${url}: ${body}`)
      throw new Error(`HTTP ${res.status}: ${body}`)
    }
    const data = await res.json()
    console.log(`[API] ← ${res.status} ${url} ✓`)
    return data as T
  } catch (err) {
    console.error(`[API] ✖ ${url}:`, err)
    throw err
  }
}

export async function getAnalysisMethods(): Promise<AnalysisMethod[]> {
  return fetchJSON<AnalysisMethod[]>(`${API_BASE}/analysis/`)
}

export async function getAnalysisCategories(): Promise<{
  category: string
  methods_count: number
  methods: AnalysisMethod[]
}[]> {
  return fetchJSON(`${API_BASE}/analysis/categories`)
}

export async function runAnalysis(
  symbol: string,
  methodId: string,
  params?: Record<string, unknown>
): Promise<AnalysisResult> {
  const qs = params
    ? '?' + new URLSearchParams(params as Record<string, string>).toString()
    : ''
  return fetchJSON<AnalysisResult>(
    `${API_BASE}/analysis/${symbol}/run/${methodId}${qs}`
  )
}

export async function runAllAnalysis(
  symbol: string,
  category?: string,
  params?: Record<string, unknown>
): Promise<AnalysisResult[]> {
  if (category && category !== 'all') {
    return fetchJSON<AnalysisResult[]>(
      `${API_BASE}/analysis/${symbol}/run-all`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, params }),
      }
    )
  }
  return fetchJSON<AnalysisResult[]>(`${API_BASE}/analysis/${symbol}/all`)
}

export async function getAnalysisSummary(
  symbol: string
): Promise<AnalysisResult[]> {
  return fetchJSON<AnalysisResult[]>(`${API_BASE}/analysis/${symbol}/summary`)
}

export async function getConsensusReport(
  symbol: string,
): Promise<ConsensusReport> {
  return fetchJSON<ConsensusReport>(`${API_BASE}/analysis/${symbol}/consensus`);
}

export async function getConsensusAIReport(
  symbol: string,
): Promise<AIReport> {
  return fetchJSON<AIReport>(`${API_BASE}/analysis/${symbol}/consensus/ai`);
}

export async function exportConsensusPDF(
  symbol: string
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/analysis/${symbol}/consensus/export/pdf`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body}`)
  }
  return await res.blob()
}

export async function exportConsensusCSV(
  symbol: string
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/analysis/${symbol}/consensus/export/csv`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body}`)
  }
  return await res.blob()
}