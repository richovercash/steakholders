'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CutSheetBuilder, type CutSheetState, type CutSheetTemplate } from '@/components/cutsheet/CutSheetBuilder'
import { ArrowLeft } from 'lucide-react'
import {
  getTemplatesForOrganization,
  saveAsTemplate,
  loadTemplate
} from '@/lib/actions/cut-sheet-templates'
import type { AnimalType, CutSheetItem, CutSheetSausage } from '@/types/database'

interface OrderInfo {
  id: string
  order_number: number
  status: string
  livestock: {
    animal_type: AnimalType
  } | null
}

interface PageProps {
  params: { id: string }
}

export default function OrderCutSheetPage({ params }: PageProps) {
  const orderId = params.id
  const [order, setOrder] = useState<OrderInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<CutSheetTemplate[]>([])
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

      // Load templates
      const loadedTemplates = await getTemplatesForOrganization()
      setTemplates(loadedTemplates)

      setLoading(false)
    }

    loadOrder()
  }, [orderId, router, supabase])

  const handleSave = async (state: CutSheetState) => {
    if (!organizationId || !order) return

    try {
      // Create the cut sheet
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
        keep_stew_meat: state.keepStewMeat,
        keep_short_ribs: state.keepShortRibs,
        keep_soup_bones: state.keepSoupBones,
        bacon_or_belly: state.animalType === 'pork' ? state.baconOrBelly : null,
        ham_preference: state.animalType === 'pork' ? state.hamPreference : null,
        shoulder_preference: state.animalType === 'pork' ? state.shoulderPreference : null,
        keep_jowls: state.keepJowls,
        keep_fat_back: state.keepFatBack,
        keep_lard_fat: state.keepLardFat,
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

      // Insert cut sheet items
      const cutItems: Omit<CutSheetItem, 'id' | 'created_at' | 'updated_at'>[] = Object.values(state.selectedCuts).map((cut, index) => ({
        cut_sheet_id: cutSheet.id,
        cut_category: cut.category,
        cut_id: cut.cutId,
        cut_name: cut.cutName,
        thickness: cut.thickness || null,
        weight_lbs: cut.weightLbs || null,
        pieces_per_package: cut.piecesPerPackage,
        pounds: null,
        notes: null,
        sort_order: index,
      }))

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
          cut_sheet_id: cutSheet.id,
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

  const handleSaveAsTemplate = async (state: CutSheetState, name: string) => {
    const result = await saveAsTemplate(state, name)
    if (result.success) {
      // Reload templates list
      const loadedTemplates = await getTemplatesForOrganization()
      setTemplates(loadedTemplates)
    } else {
      console.error('Error saving template:', result.error)
    }
  }

  const handleLoadTemplate = async (templateId: string): Promise<CutSheetState | null> => {
    return await loadTemplate(templateId)
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

      <CutSheetBuilder
        initialAnimalType={order.livestock?.animal_type || 'beef'}
        templates={templates}
        onSave={handleSave}
        onSaveAsTemplate={handleSaveAsTemplate}
        onLoadTemplate={handleLoadTemplate}
        onCancel={() => router.push(`/dashboard/orders/${order.id}`)}
      />
    </div>
  )
}
