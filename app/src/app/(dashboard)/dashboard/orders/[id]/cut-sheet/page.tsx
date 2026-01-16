'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PrimalCutSheetBuilder, type PrimalCutSheetState, type CutSheetTemplate } from '@/components/cutsheet/PrimalCutSheetBuilder'
import { ArrowLeft } from 'lucide-react'
import {
  getTemplatesForOrganization,
  saveAsTemplate,
  loadTemplate
} from '@/lib/actions/cut-sheet-templates'
import { getProcessorCutConfigById } from '@/lib/actions/processor-cut-config'
import type { AnimalType, CutSheetItem, CutSheetSausage, ProcessorCutConfig, GroundType, PattySize, SausageFlavor } from '@/types/database'

interface OrderInfo {
  id: string
  order_number: number
  status: string
  processor_id: string
  livestock: {
    animal_type: AnimalType
  } | null
}

interface ExistingCutSheet {
  id: string
  animal_type: AnimalType
  hanging_weight_lbs: number | null
  ground_type: GroundType | null
  ground_package_weight_lbs: number | null
  patty_size: PattySize | null
  keep_liver: boolean
  keep_heart: boolean
  keep_tongue: boolean
  keep_kidneys: boolean
  keep_oxtail: boolean
  keep_bones: boolean
  special_instructions: string | null
  cut_sheet_items: {
    cut_id: string
    thickness: string | null
    weight_lbs: number | null
    pieces_per_package: number | null
  }[]
  cut_sheet_sausages: {
    flavor: SausageFlavor
    pounds: number
  }[]
}

interface PageProps {
  params: { id: string }
}

export default function OrderCutSheetPage({ params }: PageProps) {
  const orderId = params.id
  const [order, setOrder] = useState<OrderInfo | null>(null)
  const [existingCutSheet, setExistingCutSheet] = useState<ExistingCutSheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<CutSheetTemplate[]>([])
  const [processorConfig, setProcessorConfig] = useState<ProcessorCutConfig | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadOrder() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('auth_id', user.id)
        .single() as { data: { organization_id: string | null } | null }

      if (!profile?.organization_id) {
        router.push('/onboarding')
        return
      }

      setOrganizationId(profile.organization_id)

      const { data: orderData, error: orderError } = await supabase
        .from('processing_orders')
        .select(`
          id,
          order_number,
          status,
          processor_id,
          livestock:livestock_id (
            animal_type
          )
        `)
        .eq('id', orderId)
        .eq('producer_id', profile.organization_id)
        .single() as { data: OrderInfo | null; error: Error | null }

      if (orderError || !orderData) {
        setError('Order not found')
        setLoading(false)
        return
      }

      setOrder(orderData)

      // Load processor config for cut options
      if (orderData.processor_id) {
        const config = await getProcessorCutConfigById(orderData.processor_id)
        setProcessorConfig(config)
      }

      // Load existing cut sheet if one exists
      const { data: existingData } = await supabase
        .from('cut_sheets')
        .select(`
          id,
          animal_type,
          hanging_weight_lbs,
          ground_type,
          ground_package_weight_lbs,
          patty_size,
          keep_liver,
          keep_heart,
          keep_tongue,
          keep_kidneys,
          keep_oxtail,
          keep_bones,
          special_instructions,
          cut_sheet_items (
            cut_id,
            thickness,
            weight_lbs,
            pieces_per_package
          ),
          cut_sheet_sausages (
            flavor,
            pounds
          )
        `)
        .eq('processing_order_id', orderId)
        .single() as { data: ExistingCutSheet | null }

      if (existingData) {
        setExistingCutSheet(existingData)
      }

      // Load templates
      const loadedTemplates = await getTemplatesForOrganization()
      setTemplates(loadedTemplates)

      setLoading(false)
    }

    loadOrder()
  }, [orderId, router, supabase])

  const handleSave = async (state: PrimalCutSheetState) => {
    if (!organizationId || !order) return

    try {
      let cutSheetId: string

      // If existing cut sheet, delete old items and update
      if (existingCutSheet) {
        // Delete old items and sausages first
        await supabase
          .from('cut_sheet_items')
          .delete()
          .eq('cut_sheet_id', existingCutSheet.id)

        await supabase
          .from('cut_sheet_sausages')
          .delete()
          .eq('cut_sheet_id', existingCutSheet.id)

        // Update the cut sheet
        const { error: updateError } = await supabase
          .from('cut_sheets')
          .update({
            animal_type: state.animalType,
            hanging_weight_lbs: state.hangingWeight,
            ground_type: state.groundType,
            ground_package_weight_lbs: state.groundPackageWeight,
            patty_size: state.pattySize,
            keep_liver: state.organs.liver,
            keep_heart: state.organs.heart,
            keep_tongue: state.organs.tongue,
            keep_kidneys: state.organs.kidneys,
            keep_oxtail: state.organs.oxtail,
            keep_bones: state.organs.bones,
            special_instructions: state.specialInstructions || null,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', existingCutSheet.id)

        if (updateError) {
          throw new Error(updateError.message || 'Failed to update cut sheet')
        }

        cutSheetId = existingCutSheet.id
      } else {
        // Create new cut sheet
        const cutSheetData = {
          processing_order_id: order.id,
          producer_id: organizationId,
          animal_type: state.animalType,
          is_template: false,
          hanging_weight_lbs: state.hangingWeight,
          ground_type: state.groundType,
          ground_package_weight_lbs: state.groundPackageWeight,
          patty_size: state.pattySize,
          keep_liver: state.organs.liver,
          keep_heart: state.organs.heart,
          keep_tongue: state.organs.tongue,
          keep_kidneys: state.organs.kidneys,
          keep_oxtail: state.organs.oxtail,
          keep_bones: state.organs.bones,
          special_instructions: state.specialInstructions || null,
          status: 'draft',
        }

        const { data: cutSheet, error: cutSheetError } = await supabase
          .from('cut_sheets')
          .insert(cutSheetData as never)
          .select('id')
          .single() as { data: { id: string } | null; error: Error | null }

        if (cutSheetError || !cutSheet) {
          throw new Error(cutSheetError?.message || 'Failed to create cut sheet')
        }

        cutSheetId = cutSheet.id
      }

      // Insert cut sheet items from the new primal-based selections
      const cutItems: Omit<CutSheetItem, 'id' | 'created_at' | 'updated_at'>[] = state.selectedCuts.map((selection, index) => {
        const params = state.cutParameters[selection.cutId] || {}
        return {
          cut_sheet_id: cutSheetId,
          cut_category: 'other' as const, // Primal cuts stored with 'other' category for now
          cut_id: selection.cutId,
          cut_name: selection.cutId, // Will be looked up from schema later
          thickness: params.thickness as string || null,
          weight_lbs: params.weightLbs as number || null,
          pieces_per_package: params.piecesPerPackage as number || null,
          pounds: null,
          notes: null,
          sort_order: index,
        }
      })

      if (cutItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('cut_sheet_items')
          .insert(cutItems as never)

        if (itemsError) {
          console.error('Error inserting cut items:', itemsError)
        }
      }

      // Insert sausages (pork only)
      if (state.animalType === 'pork' && state.sausages.length > 0) {
        const sausageItems: Omit<CutSheetSausage, 'id' | 'created_at'>[] = state.sausages.map(s => ({
          cut_sheet_id: cutSheetId,
          flavor: s.flavor,
          pounds: s.pounds,
        }))

        const { error: sausageError } = await supabase
          .from('cut_sheet_sausages')
          .insert(sausageItems as never)

        if (sausageError) {
          console.error('Error inserting sausages:', sausageError)
        }
      }

      // Redirect back to order page
      router.push(`/dashboard/orders/${order.id}`)
      router.refresh()
    } catch (err) {
      console.error('Error saving cut sheet:', err)
      setError(err instanceof Error ? err.message : 'Failed to save cut sheet')
    }
  }

  const handleSaveAsTemplate = async (state: PrimalCutSheetState, name: string) => {
    // Note: Template system needs updates for full primal format compatibility
    // For now, cast to any to allow saving basic template data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await saveAsTemplate(state as any, name)
    if (result.success) {
      // Reload templates list
      const loadedTemplates = await getTemplatesForOrganization()
      setTemplates(loadedTemplates)
    } else {
      console.error('Error saving template:', result.error)
    }
  }

  const handleLoadTemplate = async (templateId: string): Promise<PrimalCutSheetState | null> => {
    // Note: Template system may need updates for full compatibility with new format
    return await loadTemplate(templateId) as PrimalCutSheetState | null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading order...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error || 'Order not found'}
        </div>
        <Link href="/dashboard/orders" className="text-green-700 hover:underline mt-4 inline-block">
          Back to Orders
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/orders/${order.id}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Order #{order.order_number}
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cut Sheet</h1>
        <p className="text-gray-500">
          Order #{order.order_number} - Specify how you want your meat cut and packaged
        </p>
      </div>

      <PrimalCutSheetBuilder
        initialAnimalType={order.livestock?.animal_type || 'beef'}
        initialState={existingCutSheet ? {
          animalType: existingCutSheet.animal_type,
          hangingWeight: existingCutSheet.hanging_weight_lbs,
          selectedCuts: existingCutSheet.cut_sheet_items.map(item => ({
            primalId: '', // Will be resolved by the builder
            cutId: item.cut_id,
          })),
          cutParameters: existingCutSheet.cut_sheet_items.reduce((acc, item) => {
            acc[item.cut_id] = {
              thickness: item.thickness || undefined,
              weightLbs: item.weight_lbs || undefined,
              piecesPerPackage: item.pieces_per_package || undefined,
            }
            return acc
          }, {} as Record<string, Record<string, unknown>>),
          groundType: existingCutSheet.ground_type || 'bulk',
          groundPackageWeight: existingCutSheet.ground_package_weight_lbs || 1,
          pattySize: existingCutSheet.patty_size || null,
          sausages: existingCutSheet.cut_sheet_sausages.map(s => ({
            flavor: s.flavor,
            pounds: s.pounds,
          })),
          organs: {
            liver: existingCutSheet.keep_liver,
            heart: existingCutSheet.keep_heart,
            tongue: existingCutSheet.keep_tongue,
            kidneys: existingCutSheet.keep_kidneys,
            oxtail: existingCutSheet.keep_oxtail,
            bones: existingCutSheet.keep_bones,
          },
          specialInstructions: existingCutSheet.special_instructions || '',
        } : undefined}
        templates={templates}
        processorConfig={processorConfig}
        onSave={handleSave}
        onSaveAsTemplate={handleSaveAsTemplate}
        onLoadTemplate={handleLoadTemplate}
        onCancel={() => router.push(`/dashboard/orders/${order.id}`)}
      />
    </div>
  )
}
