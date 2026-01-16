'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  History,
  User,
  Building2,
  ArrowRight,
  Filter,
  Clock,
  Plus,
  Minus,
  Edit,
  Scale,
  Package,
  MessageSquare,
} from 'lucide-react'
import type { CutSheetHistoryEntry, CutSheetChangeCategory } from '@/types/database'
import { getCutSheetHistory } from '@/lib/actions/cut-sheet-history'
import { generateDiffFromEntry, type ChangeDiff } from '@/lib/actions/cut-sheet-history'

// ============================================
// Types
// ============================================

interface CutSheetHistoryTabProps {
  cutSheetId: string
}

type FilterType = 'all' | 'producer' | 'processor' | 'weights'

// ============================================
// Constants
// ============================================

const CATEGORY_ICONS: Record<CutSheetChangeCategory, React.ReactNode> = {
  initial_creation: <Plus className="h-4 w-4" />,
  cut_added: <Plus className="h-4 w-4 text-green-600" />,
  cut_removed: <Minus className="h-4 w-4 text-red-600" />,
  cut_modified: <Edit className="h-4 w-4 text-blue-600" />,
  weight_entered: <Scale className="h-4 w-4 text-purple-600" />,
  package_created: <Package className="h-4 w-4 text-amber-600" />,
  notes_updated: <MessageSquare className="h-4 w-4 text-gray-600" />,
  general: <History className="h-4 w-4 text-gray-400" />,
}

const CATEGORY_LABELS: Record<CutSheetChangeCategory, string> = {
  initial_creation: 'Created',
  cut_added: 'Cut Added',
  cut_removed: 'Cut Removed',
  cut_modified: 'Cut Modified',
  weight_entered: 'Weight Entered',
  package_created: 'Package Created',
  notes_updated: 'Notes Updated',
  general: 'Updated',
}

const CATEGORY_COLORS: Record<CutSheetChangeCategory, string> = {
  initial_creation: 'bg-gray-100 text-gray-700',
  cut_added: 'bg-green-100 text-green-700',
  cut_removed: 'bg-red-100 text-red-700',
  cut_modified: 'bg-blue-100 text-blue-700',
  weight_entered: 'bg-purple-100 text-purple-700',
  package_created: 'bg-amber-100 text-amber-700',
  notes_updated: 'bg-gray-100 text-gray-700',
  general: 'bg-gray-100 text-gray-700',
}

// ============================================
// Helper Functions
// ============================================

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function filterEntries(entries: CutSheetHistoryEntry[], filter: FilterType): CutSheetHistoryEntry[] {
  switch (filter) {
    case 'producer':
      return entries.filter(e => e.changed_by_role === 'producer')
    case 'processor':
      return entries.filter(e => e.changed_by_role === 'processor')
    case 'weights':
      return entries.filter(e =>
        e.change_category === 'weight_entered' || e.change_category === 'package_created'
      )
    default:
      return entries
  }
}

// ============================================
// Sub-Components
// ============================================

interface DiffDisplayProps {
  diffs: ChangeDiff[]
}

function DiffDisplay({ diffs }: DiffDisplayProps) {
  if (diffs.length === 0) return null

  return (
    <div className="mt-2 space-y-1">
      {diffs.map((diff, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <span className="text-gray-500 min-w-24">{diff.label}:</span>
          {diff.before !== null && (
            <>
              <span className="text-red-600 line-through">{diff.before}</span>
              <ArrowRight className="h-3 w-3 text-gray-400" />
            </>
          )}
          <span className="text-green-600 font-medium">{diff.after}</span>
        </div>
      ))}
    </div>
  )
}

interface HistoryEntryCardProps {
  entry: CutSheetHistoryEntry
  isFirst: boolean
}

function HistoryEntryCard({ entry, isFirst }: HistoryEntryCardProps) {
  const category = (entry.change_category || 'general') as CutSheetChangeCategory
  const diffs = generateDiffFromEntry(entry)

  return (
    <div className="relative pl-8 pb-6">
      {/* Timeline connector */}
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />

      {/* Timeline dot */}
      <div
        className={`absolute left-0 top-0 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${
          entry.changed_by_role === 'producer'
            ? 'bg-green-100'
            : 'bg-amber-100'
        }`}
      >
        {CATEGORY_ICONS[category]}
      </div>

      <Card className={`${isFirst ? 'border-primary' : ''}`}>
        <CardHeader className="py-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={CATEGORY_COLORS[category]}
                >
                  {CATEGORY_LABELS[category]}
                </Badge>
                {entry.affected_cut_id && (
                  <span className="text-sm text-gray-500">
                    • {entry.affected_cut_id}
                  </span>
                )}
              </div>
              {entry.change_summary && (
                <p className="text-sm font-medium">{entry.change_summary}</p>
              )}
            </div>
            <div className="text-right text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(entry.created_at)}
              </div>
              <div>{formatDate(entry.created_at)}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            {entry.changed_by_role === 'producer' ? (
              <>
                <User className="h-4 w-4" />
                <span className="font-medium text-green-700">Producer</span>
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4" />
                <span className="font-medium text-amber-700">Processor</span>
              </>
            )}
          </div>

          {/* Show diff if available */}
          <DiffDisplay diffs={diffs} />
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export function CutSheetHistoryTab({ cutSheetId }: CutSheetHistoryTabProps) {
  const [entries, setEntries] = useState<CutSheetHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => {
    async function loadHistory() {
      setLoading(true)
      const history = await getCutSheetHistory(cutSheetId)
      setEntries(history)
      setLoading(false)
    }
    loadHistory()
  }, [cutSheetId])

  const filteredEntries = filterEntries(entries, filter)

  const stats = {
    total: entries.length,
    producer: entries.filter(e => e.changed_by_role === 'producer').length,
    processor: entries.filter(e => e.changed_by_role === 'processor').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <History className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="font-medium text-gray-600">No History Yet</h3>
          <p className="text-sm text-gray-400 mt-1">
            Changes to this cut sheet will appear here
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats & Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-gray-500">Total Changes:</span>{' '}
                <span className="font-semibold">{stats.total}</span>
              </div>
              <div className="text-sm">
                <span className="text-green-600">Producer:</span>{' '}
                <span className="font-semibold">{stats.producer}</span>
              </div>
              <div className="text-sm">
                <span className="text-amber-600">Processor:</span>{' '}
                <span className="font-semibold">{stats.processor}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <div className="flex gap-1">
                {(['all', 'producer', 'processor', 'weights'] as FilterType[]).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className="capitalize"
                  >
                    {f === 'all' ? 'All' : f}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="relative">
        {filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No entries match the selected filter
            </CardContent>
          </Card>
        ) : (
          filteredEntries.map((entry, idx) => (
            <HistoryEntryCard key={entry.id} entry={entry} isFirst={idx === 0} />
          ))
        )}
      </div>
    </div>
  )
}
