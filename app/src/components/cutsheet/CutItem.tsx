'use client'

import { Check } from 'lucide-react'
import { THICKNESS_OPTIONS, PIECES_OPTIONS, WEIGHT_OPTIONS, type CutOption } from '@/lib/cut-sheet-data'
import type { CutCategory } from '@/types/database'

interface CutSelection {
  cutId: string
  cutName: string
  category: CutCategory
  thickness?: string
  weightLbs?: number
  piecesPerPackage: number
}

interface CutItemProps {
  cut: CutOption
  selection?: CutSelection
  hasConflict: boolean
  onToggle: (cut: CutOption) => void
  onUpdateParam: (cutId: string, param: keyof CutSelection, value: string | number) => void
}

export function CutItem({
  cut,
  selection,
  hasConflict,
  onToggle,
  onUpdateParam,
}: CutItemProps) {
  const isSelected = !!selection
  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
        hasConflict
          ? 'border-amber-400 bg-amber-50'
          : isSelected
          ? 'border-green-600 bg-green-50'
          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
      }`}
      onClick={() => onToggle(cut)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
              isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300 bg-white'
            }`}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </div>
          <div>
            <div className="font-medium">{cut.name}</div>
            {cut.hint && <div className="text-sm text-gray-500">{cut.hint}</div>}
          </div>
        </div>

        {isSelected && (
          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
            {cut.hasThickness && (
              <select
                className="text-sm border rounded px-2 py-1"
                value={selection?.thickness || '1"'}
                onChange={e => onUpdateParam(cut.id, 'thickness', e.target.value)}
              >
                {THICKNESS_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
            {cut.hasWeight && (
              <select
                className="text-sm border rounded px-2 py-1"
                value={selection?.weightLbs || 3}
                onChange={e => onUpdateParam(cut.id, 'weightLbs', Number(e.target.value))}
              >
                {WEIGHT_OPTIONS.map(w => (
                  <option key={w} value={w}>{w} lbs</option>
                ))}
              </select>
            )}
            <select
              className="text-sm border rounded px-2 py-1"
              value={selection?.piecesPerPackage || 2}
              onChange={e => onUpdateParam(cut.id, 'piecesPerPackage', Number(e.target.value))}
            >
              {PIECES_OPTIONS.map(p => (
                <option key={p} value={p}>{p}/pkg</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}

export type { CutSelection }
