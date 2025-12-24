'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Check } from 'lucide-react'

type BaconOption = 'bacon' | 'fresh_belly' | 'both' | 'none'
type PreferenceOption = 'sliced' | 'roast' | 'both' | 'none'

interface PorkOptions {
  baconOrBelly: BaconOption
  hamPreference: PreferenceOption
  shoulderPreference: PreferenceOption
  keepJowls: boolean
  keepFatBack: boolean
  keepLardFat: boolean
}

interface PorkOptionsSectionProps {
  options: PorkOptions
  onChange: <K extends keyof PorkOptions>(key: K, value: PorkOptions[K]) => void
}

export function PorkOptionsSection({ options, onChange }: PorkOptionsSectionProps) {
  const checkboxOptions = [
    { key: 'keepJowls' as const, label: 'Keep Jowls' },
    { key: 'keepFatBack' as const, label: 'Keep Fat Back' },
    { key: 'keepLardFat' as const, label: 'Keep Lard Fat' },
  ]

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Pork Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bacon / Belly */}
        <div>
          <Label className="mb-2 block">Bacon / Belly</Label>
          <div className="flex gap-2">
            {(['bacon', 'fresh_belly', 'both', 'none'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => onChange('baconOrBelly', opt)}
                className={`px-3 py-2 rounded border-2 text-sm capitalize ${
                  options.baconOrBelly === opt ? 'border-green-600 bg-green-50' : 'border-gray-200'
                }`}
              >
                {opt.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Ham */}
        <div>
          <Label className="mb-2 block">Ham</Label>
          <div className="flex gap-2">
            {(['sliced', 'roast', 'both', 'none'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => onChange('hamPreference', opt)}
                className={`px-3 py-2 rounded border-2 text-sm capitalize ${
                  options.hamPreference === opt ? 'border-green-600 bg-green-50' : 'border-gray-200'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Shoulder */}
        <div>
          <Label className="mb-2 block">Shoulder</Label>
          <div className="flex gap-2">
            {(['sliced', 'roast', 'both', 'none'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => onChange('shoulderPreference', opt)}
                className={`px-3 py-2 rounded border-2 text-sm capitalize ${
                  options.shoulderPreference === opt ? 'border-green-600 bg-green-50' : 'border-gray-200'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Checkboxes */}
        <div className="flex flex-wrap gap-4">
          {checkboxOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onChange(key, !options[key])}
              className={`px-3 py-2 rounded border-2 flex items-center gap-2 ${
                options[key] ? 'border-green-600 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  options[key] ? 'bg-green-600 border-green-600' : 'border-gray-300'
                }`}
              >
                {options[key] && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export type { PorkOptions }
