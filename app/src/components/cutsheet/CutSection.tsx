'use client'

import { SECTION_INFO, type CutOption } from '@/lib/cut-sheet-data'
import { Utensils, Package, Bone, Heart } from 'lucide-react'

// Section icons
const SECTION_ICONS: Record<string, React.ReactNode> = {
  steaks: <Utensils className="h-6 w-6 text-red-600" />,
  roasts: <Package className="h-6 w-6 text-amber-600" />,
  ribs: <Bone className="h-6 w-6 text-gray-600" />,
  bacon: <Package className="h-6 w-6 text-rose-600" />,
  sausage: <Package className="h-6 w-6 text-pink-600" />,
  ground: <Package className="h-6 w-6 text-amber-700" />,
  other: <Bone className="h-6 w-6 text-gray-600" />,
  organs: <Heart className="h-6 w-6 text-red-600" />,
}

interface CutSectionProps {
  sectionKey: string
  cuts?: CutOption[]
  children: React.ReactNode
}

export function CutSection({ sectionKey, cuts, children }: CutSectionProps) {
  if (!cuts || cuts.length === 0) return null

  const info = SECTION_INFO[sectionKey as keyof typeof SECTION_INFO]

  return (
    <div id={sectionKey} className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <span className="shrink-0">{SECTION_ICONS[sectionKey] || SECTION_ICONS.other}</span>
        <div>
          <h3 className="text-lg font-semibold">{info?.label || sectionKey}</h3>
          <p className="text-sm text-gray-500">{info?.description}</p>
        </div>
      </div>
      <div className="grid gap-3">
        {children}
      </div>
    </div>
  )
}
