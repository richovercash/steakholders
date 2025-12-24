'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Heart } from 'lucide-react'
import { ORGAN_OPTIONS } from '@/lib/cut-sheet-data'
import type { AnimalType } from '@/types/database'

interface OrganSelections {
  liver: boolean
  heart: boolean
  tongue: boolean
  kidneys: boolean
  oxtail: boolean
  bones: boolean
}

interface OrgansSectionProps {
  animalType: AnimalType
  organs: OrganSelections
  onToggle: (organId: keyof OrganSelections) => void
}

export function OrgansSection({ animalType, organs, onToggle }: OrgansSectionProps) {
  const organOptions = ORGAN_OPTIONS[animalType]

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-600" /> Organs & Extras
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">Would you like to keep any of the following?</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {organOptions.map(organ => {
            const isSelected = organs[organ.id as keyof OrganSelections]

            return (
              <button
                key={organ.id}
                onClick={() => onToggle(organ.id as keyof OrganSelections)}
                className={`p-3 rounded-lg border-2 flex items-center gap-3 transition-all ${
                  isSelected ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="font-medium">{organ.name}</span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export type { OrganSelections }
