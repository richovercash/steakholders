'use client'

import { useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Beef,
  PiggyBank,
  Rabbit,
  ChevronDown,
  Printer,
  FileSpreadsheet,
  FileText,
  Check,
} from 'lucide-react'
import { GoatIcon } from '@/components/icons/AnimalIcons'
import type { AnimalType } from '@/types/database'
import { CUT_SHEET_SCHEMA } from '@/lib/cut-sheet-schema'

// Types for cut sheet data
interface CutSheetItem {
  id: string
  cut_id: string
  cut_name: string
  cut_category: string
  thickness: string | null
  weight_lbs: number | null
  pieces_per_package: number | null
  notes: string | null
}

interface CutSheetSausage {
  id: string
  flavor: string
  pounds: number
}

interface CutSheetData {
  id: string
  status: string
  animal_type: AnimalType
  hanging_weight_lbs: number | null
  ground_type: string | null
  ground_package_weight_lbs: number | null
  patty_size: string | null
  keep_liver: boolean
  keep_heart: boolean
  keep_tongue: boolean
  keep_kidneys: boolean
  keep_oxtail: boolean
  keep_bones: boolean
  special_instructions: string | null
  cut_sheet_items: CutSheetItem[]
  cut_sheet_sausages?: CutSheetSausage[]
}

interface OrderInfo {
  order_number: number
  producer_name: string
  livestock_tag?: string | null
  livestock_name?: string | null
}

interface CutSheetViewerProps {
  cutSheet: CutSheetData
  orderInfo: OrderInfo
}

const ANIMAL_ICONS: Record<AnimalType, React.ReactNode> = {
  beef: <Beef className="h-5 w-5 text-red-600" />,
  pork: <PiggyBank className="h-5 w-5 text-pink-600" />,
  lamb: <Rabbit className="h-5 w-5 text-purple-600" />,
  goat: <GoatIcon className="h-5 w-5 text-amber-600" size={20} />,
}

const ANIMAL_LABELS: Record<AnimalType, string> = {
  beef: 'Beef',
  pork: 'Pork',
  lamb: 'Lamb',
  goat: 'Goat',
}

// Group cuts by primal based on schema
function groupCutsByPrimal(items: CutSheetItem[], animalType: AnimalType) {
  const schema = CUT_SHEET_SCHEMA.animals[animalType]
  const grouped: Record<string, { primalName: string; cuts: CutSheetItem[] }> = {}
  const cutToPrimal: Record<string, string> = {}

  // Build lookup of cut ID to primal
  for (const [primalId, primal] of Object.entries(schema.primals)) {
    for (const cut of primal.choices) {
      cutToPrimal[cut.id] = primalId
    }
    if (primal.subSections) {
      for (const sub of Object.values(primal.subSections)) {
        for (const cut of sub.choices) {
          cutToPrimal[cut.id] = primalId
        }
      }
    }
  }

  // Group items
  for (const item of items) {
    const primalId = cutToPrimal[item.cut_id] || 'other'
    const primalName = schema.primals[primalId]?.displayName || 'Other Cuts'

    if (!grouped[primalId]) {
      grouped[primalId] = { primalName, cuts: [] }
    }
    grouped[primalId].cuts.push(item)
  }

  return grouped
}

// Get cut display name from schema
function getCutDisplayName(cutId: string, animalType: AnimalType): string {
  const schema = CUT_SHEET_SCHEMA.animals[animalType]

  for (const primal of Object.values(schema.primals)) {
    for (const cut of primal.choices) {
      if (cut.id === cutId) return cut.name
    }
    if (primal.subSections) {
      for (const sub of Object.values(primal.subSections)) {
        for (const cut of sub.choices) {
          if (cut.id === cutId) return cut.name
        }
      }
    }
  }

  // Fallback: convert cut_id to readable name
  return cutId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export function CutSheetViewer({ cutSheet, orderInfo }: CutSheetViewerProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const groupedCuts = useMemo(
    () => groupCutsByPrimal(cutSheet.cut_sheet_items, cutSheet.animal_type),
    [cutSheet.cut_sheet_items, cutSheet.animal_type]
  )

  const organs = useMemo(() => {
    const kept: string[] = []
    if (cutSheet.keep_liver) kept.push('Liver')
    if (cutSheet.keep_heart) kept.push('Heart')
    if (cutSheet.keep_tongue) kept.push('Tongue')
    if (cutSheet.keep_kidneys) kept.push('Kidneys')
    if (cutSheet.keep_oxtail) kept.push('Oxtail')
    if (cutSheet.keep_bones) kept.push('Bones')
    return kept
  }, [cutSheet])

  // Print function
  const handlePrint = () => {
    window.print()
  }

  // Export to CSV
  const handleExportCSV = () => {
    const rows: string[][] = [
      ['Cut Sheet - Order #' + orderInfo.order_number],
      ['Producer:', orderInfo.producer_name],
      ['Animal:', ANIMAL_LABELS[cutSheet.animal_type]],
      cutSheet.hanging_weight_lbs ? ['Hanging Weight:', cutSheet.hanging_weight_lbs + ' lbs'] : [],
      [],
      ['Primal', 'Cut', 'Thickness', 'Pieces/Pkg', 'Notes'],
    ]

    for (const [, group] of Object.entries(groupedCuts)) {
      for (const item of group.cuts) {
        rows.push([
          group.primalName,
          getCutDisplayName(item.cut_id, cutSheet.animal_type),
          item.thickness || '',
          item.pieces_per_package?.toString() || '',
          item.notes || '',
        ])
      }
    }

    if (cutSheet.ground_type) {
      rows.push([])
      rows.push(['Ground Meat'])
      rows.push(['Type:', cutSheet.ground_type])
      if (cutSheet.ground_package_weight_lbs) {
        rows.push(['Package Weight:', cutSheet.ground_package_weight_lbs + ' lbs'])
      }
      if (cutSheet.patty_size) {
        rows.push(['Patty Size:', cutSheet.patty_size + ' lb'])
      }
    }

    if (organs.length > 0) {
      rows.push([])
      rows.push(['Keep:', organs.join(', ')])
    }

    if (cutSheet.special_instructions) {
      rows.push([])
      rows.push(['Special Instructions:', cutSheet.special_instructions])
    }

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `cutsheet-order-${orderInfo.order_number}.csv`
    link.click()
  }

  // Export to text/printable format
  const handleExportText = () => {
    let text = `CUT SHEET - ORDER #${orderInfo.order_number}\n`
    text += `${'='.repeat(50)}\n\n`
    text += `Producer: ${orderInfo.producer_name}\n`
    text += `Animal: ${ANIMAL_LABELS[cutSheet.animal_type]}`
    if (orderInfo.livestock_tag) text += ` #${orderInfo.livestock_tag}`
    if (orderInfo.livestock_name) text += ` (${orderInfo.livestock_name})`
    text += '\n'
    if (cutSheet.hanging_weight_lbs) {
      text += `Hanging Weight: ${cutSheet.hanging_weight_lbs} lbs\n`
    }
    text += '\n'

    for (const [, group] of Object.entries(groupedCuts)) {
      text += `${group.primalName}\n`
      text += `${'-'.repeat(30)}\n`
      for (const item of group.cuts) {
        const cutName = getCutDisplayName(item.cut_id, cutSheet.animal_type)
        text += `  ☑ ${cutName}`
        if (item.thickness) text += ` - ${item.thickness}`
        if (item.pieces_per_package) text += ` - ${item.pieces_per_package}/pkg`
        text += '\n'
      }
      text += '\n'
    }

    if (cutSheet.ground_type) {
      text += `Ground Meat\n`
      text += `${'-'.repeat(30)}\n`
      text += `  Type: ${cutSheet.ground_type}\n`
      if (cutSheet.ground_package_weight_lbs) {
        text += `  Package Weight: ${cutSheet.ground_package_weight_lbs} lbs\n`
      }
      if (cutSheet.patty_size) {
        text += `  Patty Size: ${cutSheet.patty_size} lb\n`
      }
      text += '\n'
    }

    if (organs.length > 0) {
      text += `Keep: ${organs.join(', ')}\n\n`
    }

    if (cutSheet.special_instructions) {
      text += `Special Instructions\n`
      text += `${'-'.repeat(30)}\n`
      text += `${cutSheet.special_instructions}\n`
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `cutsheet-order-${orderInfo.order_number}.txt`
    link.click()
  }

  return (
    <div className="space-y-4">
      {/* Export Actions */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportText}>
          <FileText className="h-4 w-4 mr-2" />
          Export Text
        </Button>
      </div>

      {/* Printable Content */}
      <div ref={printRef} className="print:p-4">
        {/* Header */}
        <Card className="mb-4 print:shadow-none print:border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {ANIMAL_ICONS[cutSheet.animal_type]}
                <div>
                  <CardTitle className="text-lg">
                    Order #{orderInfo.order_number} - Cut Sheet
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    {orderInfo.producer_name}
                    {orderInfo.livestock_tag && ` • Tag #${orderInfo.livestock_tag}`}
                    {orderInfo.livestock_name && ` • "${orderInfo.livestock_name}"`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold capitalize">
                  {ANIMAL_LABELS[cutSheet.animal_type]}
                </div>
                {cutSheet.hanging_weight_lbs && (
                  <div className="text-sm text-gray-500">
                    {cutSheet.hanging_weight_lbs} lbs hanging
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Cuts by Primal */}
        <div className="space-y-3">
          {Object.entries(groupedCuts).map(([primalId, group]) => (
            <Collapsible key={primalId} defaultOpen>
              <Card className="print:shadow-none print:border">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ChevronDown className="h-4 w-4 print:hidden" />
                        {group.primalName}
                      </CardTitle>
                      <span className="text-sm text-gray-500">
                        {group.cuts.length} cut{group.cuts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-gray-500">
                          <th className="py-2 font-medium">Cut</th>
                          <th className="py-2 font-medium">Thickness</th>
                          <th className="py-2 font-medium">Pieces/Pkg</th>
                          <th className="py-2 font-medium print:hidden">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.cuts.map((item) => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-600 shrink-0" />
                                <span className="font-medium">
                                  {getCutDisplayName(item.cut_id, cutSheet.animal_type)}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 text-gray-600">
                              {item.thickness || '-'}
                            </td>
                            <td className="py-2 text-gray-600">
                              {item.pieces_per_package || '-'}
                            </td>
                            <td className="py-2 text-gray-500 print:hidden">
                              {item.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>

        {/* Ground Meat */}
        {cutSheet.ground_type && (
          <Card className="mt-4 print:shadow-none print:border">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Ground Meat</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Type:</span>
                  <span className="ml-2 font-medium capitalize">{cutSheet.ground_type}</span>
                </div>
                {cutSheet.ground_package_weight_lbs && (
                  <div>
                    <span className="text-gray-500">Package:</span>
                    <span className="ml-2 font-medium">{cutSheet.ground_package_weight_lbs} lbs</span>
                  </div>
                )}
                {cutSheet.patty_size && (
                  <div>
                    <span className="text-gray-500">Patty Size:</span>
                    <span className="ml-2 font-medium">{cutSheet.patty_size} lb</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sausages (Pork) */}
        {cutSheet.cut_sheet_sausages && cutSheet.cut_sheet_sausages.length > 0 && (
          <Card className="mt-4 print:shadow-none print:border">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Sausages</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {cutSheet.cut_sheet_sausages.map((sausage) => (
                  <div
                    key={sausage.id}
                    className="bg-pink-50 border border-pink-200 rounded px-3 py-1.5 text-sm"
                  >
                    <span className="font-medium capitalize">
                      {sausage.flavor.replace(/_/g, ' ')}
                    </span>
                    <span className="text-pink-600 ml-2">{sausage.pounds} lbs</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Organs/Keep */}
        {organs.length > 0 && (
          <Card className="mt-4 print:shadow-none print:border">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Keep</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {organs.map((organ) => (
                  <span
                    key={organ}
                    className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded text-sm"
                  >
                    {organ}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Special Instructions */}
        {cutSheet.special_instructions && (
          <Card className="mt-4 border-blue-200 print:shadow-none print:border">
            <CardHeader className="py-3">
              <CardTitle className="text-base text-blue-800">Special Instructions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-blue-900 whitespace-pre-wrap">
                {cutSheet.special_instructions}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #cut-sheet-print-area,
          #cut-sheet-print-area * {
            visibility: visible;
          }
          #cut-sheet-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
