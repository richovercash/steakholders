'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Package } from 'lucide-react'
import { SAUSAGE_FLAVORS } from '@/lib/cut-sheet-data'
import type { SausageFlavor } from '@/types/database'

interface SausageSelection {
  flavor: SausageFlavor
  pounds: number
}

interface SausageSectionProps {
  sausages: SausageSelection[]
  onToggle: (flavor: SausageFlavor) => void
  onUpdatePounds: (flavor: SausageFlavor, pounds: number) => void
}

export function SausageSection({ sausages, onToggle, onUpdatePounds }: SausageSectionProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-rose-600" /> Sausage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">Select sausage flavors and specify pounds for each</p>
        <div className="grid gap-3">
          {SAUSAGE_FLAVORS.map(sausage => {
            const selection = sausages.find(s => s.flavor === sausage.id)
            const isSelected = !!selection

            return (
              <div
                key={sausage.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => onToggle(sausage.id)}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <div className="font-medium">{sausage.name}</div>
                      <div className="text-sm text-gray-500">{sausage.hint}</div>
                    </div>
                  </div>
                  {isSelected && selection && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={selection.pounds}
                        onChange={e => onUpdatePounds(sausage.id, Number(e.target.value))}
                        className="w-20 border rounded px-2 py-1 text-sm"
                      />
                      <span className="text-sm text-gray-500">lbs</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export type { SausageSelection }
