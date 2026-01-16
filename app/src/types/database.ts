// Generated types from Supabase schema
// Run `supabase gen types typescript` to regenerate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type OrganizationType = 'producer' | 'processor'
export type UserRole = 'owner' | 'manager' | 'worker'
export type AnimalType = 'beef' | 'pork' | 'lamb' | 'goat'
export type LivestockStatus = 'on_farm' | 'scheduled' | 'in_transit' | 'processing' | 'complete' | 'sold'
export type ProcessingStage = 'pending' | 'received' | 'hanging' | 'cutting' | 'wrapping' | 'freezing' | 'ready' | 'picked_up'
export type OrderStatus = 'draft' | 'submitted' | 'confirmed' | 'in_progress' | 'ready' | 'complete' | 'cancelled'
export type CutSheetStatus = 'draft' | 'submitted' | 'confirmed' | 'in_progress' | 'complete'
export type CutCategory = 'steak' | 'roast' | 'ground' | 'ribs' | 'bacon' | 'sausage' | 'other'
export type SausageFlavor = 'mild' | 'medium' | 'hot' | 'sweet_italian' | 'hot_italian' | 'chorizo' | 'bratwurst' | 'polish' | 'breakfast' | 'maple_breakfast'
export type GroundType = 'bulk' | 'vacuum' | 'patties'
export type PattySize = '1/4' | '1/3' | '1/2'
export type NotificationType =
  | 'order_submitted'
  | 'order_confirmed'
  | 'order_status_update'
  | 'order_ready'
  | 'order_complete'
  | 'new_message'
  | 'slot_available'
  | 'system'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          type: OrganizationType
          email: string | null
          phone: string | null
          website: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          zip: string | null
          location: unknown | null
          license_number: string | null
          license_type: string | null
          certifications: Json
          services_offered: Json
          capacity_per_week: number | null
          lead_time_days: number | null
          farm_name: string | null
          is_active: boolean
          settings: Json
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          type: OrganizationType
          email?: string | null
          phone?: string | null
          website?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          location?: unknown | null
          license_number?: string | null
          license_type?: string | null
          certifications?: Json
          services_offered?: Json
          capacity_per_week?: number | null
          lead_time_days?: number | null
          farm_name?: string | null
          is_active?: boolean
          settings?: Json
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          type?: OrganizationType
          email?: string | null
          phone?: string | null
          website?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          location?: unknown | null
          license_number?: string | null
          license_type?: string | null
          certifications?: Json
          services_offered?: Json
          capacity_per_week?: number | null
          lead_time_days?: number | null
          farm_name?: string | null
          is_active?: boolean
          settings?: Json
        }
      }
      users: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          auth_id: string
          email: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          organization_id: string | null
          role: UserRole
          notification_preferences: Json
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          auth_id: string
          email: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          organization_id?: string | null
          role?: UserRole
          notification_preferences?: Json
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          auth_id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          organization_id?: string | null
          role?: UserRole
          notification_preferences?: Json
          is_active?: boolean
        }
      }
      livestock: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          producer_id: string
          animal_type: AnimalType
          tag_number: string | null
          name: string | null
          breed: string | null
          estimated_live_weight: number | null
          birth_date: string | null
          sex: string | null
          status: LivestockStatus
          notes: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          producer_id: string
          animal_type: AnimalType
          tag_number?: string | null
          name?: string | null
          breed?: string | null
          estimated_live_weight?: number | null
          birth_date?: string | null
          sex?: string | null
          status?: LivestockStatus
          notes?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          producer_id?: string
          animal_type?: AnimalType
          tag_number?: string | null
          name?: string | null
          breed?: string | null
          estimated_live_weight?: number | null
          birth_date?: string | null
          sex?: string | null
          status?: LivestockStatus
          notes?: string | null
          metadata?: Json
        }
      }
      calendar_slots: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          processor_id: string
          date: string
          animal_type: AnimalType
          capacity: number
          booked_count: number
          kill_fee: number | null
          is_available: boolean
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          processor_id: string
          date: string
          animal_type: AnimalType
          capacity?: number
          booked_count?: number
          kill_fee?: number | null
          is_available?: boolean
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          processor_id?: string
          date?: string
          animal_type?: AnimalType
          capacity?: number
          booked_count?: number
          kill_fee?: number | null
          is_available?: boolean
          notes?: string | null
        }
      }
      processing_orders: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          order_number: number
          producer_id: string
          processor_id: string
          livestock_id: string | null
          calendar_slot_id: string | null
          status: OrderStatus
          processing_stage: ProcessingStage
          scheduled_drop_off: string | null
          actual_drop_off: string | null
          estimated_ready_date: string | null
          actual_ready_date: string | null
          pickup_date: string | null
          live_weight: number | null
          hanging_weight: number | null
          final_weight: number | null
          kill_fee: number | null
          processing_fee: number | null
          storage_fee: number | null
          additional_charges: Json
          total_amount: number | null
          producer_notes: string | null
          processor_notes: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          order_number?: number
          producer_id: string
          processor_id: string
          livestock_id?: string | null
          calendar_slot_id?: string | null
          status?: OrderStatus
          processing_stage?: ProcessingStage
          scheduled_drop_off?: string | null
          actual_drop_off?: string | null
          estimated_ready_date?: string | null
          actual_ready_date?: string | null
          pickup_date?: string | null
          live_weight?: number | null
          hanging_weight?: number | null
          final_weight?: number | null
          kill_fee?: number | null
          processing_fee?: number | null
          storage_fee?: number | null
          additional_charges?: Json
          total_amount?: number | null
          producer_notes?: string | null
          processor_notes?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          order_number?: number
          producer_id?: string
          processor_id?: string
          livestock_id?: string | null
          calendar_slot_id?: string | null
          status?: OrderStatus
          processing_stage?: ProcessingStage
          scheduled_drop_off?: string | null
          actual_drop_off?: string | null
          estimated_ready_date?: string | null
          actual_ready_date?: string | null
          pickup_date?: string | null
          live_weight?: number | null
          hanging_weight?: number | null
          final_weight?: number | null
          kill_fee?: number | null
          processing_fee?: number | null
          storage_fee?: number | null
          additional_charges?: Json
          total_amount?: number | null
          producer_notes?: string | null
          processor_notes?: string | null
          metadata?: Json
        }
      }
      cut_sheets: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          processing_order_id: string | null
          producer_id: string
          animal_type: AnimalType
          is_template: boolean
          template_name: string | null
          hanging_weight_lbs: number | null
          ground_type: 'bulk' | 'vacuum' | 'patties' | null
          ground_package_weight_lbs: number | null
          patty_size: '1/4' | '1/3' | '1/2' | null
          keep_liver: boolean
          keep_heart: boolean
          keep_tongue: boolean
          keep_kidneys: boolean
          keep_oxtail: boolean
          keep_bones: boolean
          keep_stew_meat: boolean
          keep_short_ribs: boolean
          keep_soup_bones: boolean
          bacon_or_belly: 'bacon' | 'fresh_belly' | 'both' | 'none' | null
          ham_preference: 'sliced' | 'roast' | 'both' | 'none' | null
          shoulder_preference: 'sliced' | 'roast' | 'both' | 'none' | null
          keep_jowls: boolean
          keep_fat_back: boolean
          keep_lard_fat: boolean
          special_instructions: string | null
          status: 'draft' | 'submitted' | 'confirmed' | 'in_progress' | 'complete'
          submitted_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          processing_order_id?: string | null
          producer_id: string
          animal_type: AnimalType
          is_template?: boolean
          template_name?: string | null
          hanging_weight_lbs?: number | null
          ground_type?: 'bulk' | 'vacuum' | 'patties' | null
          ground_package_weight_lbs?: number | null
          patty_size?: '1/4' | '1/3' | '1/2' | null
          keep_liver?: boolean
          keep_heart?: boolean
          keep_tongue?: boolean
          keep_kidneys?: boolean
          keep_oxtail?: boolean
          keep_bones?: boolean
          keep_stew_meat?: boolean
          keep_short_ribs?: boolean
          keep_soup_bones?: boolean
          bacon_or_belly?: 'bacon' | 'fresh_belly' | 'both' | 'none' | null
          ham_preference?: 'sliced' | 'roast' | 'both' | 'none' | null
          shoulder_preference?: 'sliced' | 'roast' | 'both' | 'none' | null
          keep_jowls?: boolean
          keep_fat_back?: boolean
          keep_lard_fat?: boolean
          special_instructions?: string | null
          status?: 'draft' | 'submitted' | 'confirmed' | 'in_progress' | 'complete'
          submitted_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          processing_order_id?: string | null
          producer_id?: string
          animal_type?: AnimalType
          is_template?: boolean
          template_name?: string | null
          hanging_weight_lbs?: number | null
          ground_type?: 'bulk' | 'vacuum' | 'patties' | null
          ground_package_weight_lbs?: number | null
          patty_size?: '1/4' | '1/3' | '1/2' | null
          keep_liver?: boolean
          keep_heart?: boolean
          keep_tongue?: boolean
          keep_kidneys?: boolean
          keep_oxtail?: boolean
          keep_bones?: boolean
          keep_stew_meat?: boolean
          keep_short_ribs?: boolean
          keep_soup_bones?: boolean
          bacon_or_belly?: 'bacon' | 'fresh_belly' | 'both' | 'none' | null
          ham_preference?: 'sliced' | 'roast' | 'both' | 'none' | null
          shoulder_preference?: 'sliced' | 'roast' | 'both' | 'none' | null
          keep_jowls?: boolean
          keep_fat_back?: boolean
          keep_lard_fat?: boolean
          special_instructions?: string | null
          status?: 'draft' | 'submitted' | 'confirmed' | 'in_progress' | 'complete'
          submitted_at?: string | null
        }
      }
      cut_sheet_items: {
        Row: {
          id: string
          cut_sheet_id: string
          cut_category: 'steak' | 'roast' | 'ground' | 'ribs' | 'bacon' | 'sausage' | 'other'
          cut_id: string
          cut_name: string
          thickness: string | null
          weight_lbs: number | null
          pieces_per_package: number | null
          pounds: number | null
          notes: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cut_sheet_id: string
          cut_category: 'steak' | 'roast' | 'ground' | 'ribs' | 'bacon' | 'sausage' | 'other'
          cut_id: string
          cut_name: string
          thickness?: string | null
          weight_lbs?: number | null
          pieces_per_package?: number | null
          pounds?: number | null
          notes?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cut_sheet_id?: string
          cut_category?: 'steak' | 'roast' | 'ground' | 'ribs' | 'bacon' | 'sausage' | 'other'
          cut_id?: string
          cut_name?: string
          thickness?: string | null
          weight_lbs?: number | null
          pieces_per_package?: number | null
          pounds?: number | null
          notes?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      cut_sheet_sausages: {
        Row: {
          id: string
          cut_sheet_id: string
          flavor: SausageFlavor
          pounds: number
          created_at: string
        }
        Insert: {
          id?: string
          cut_sheet_id: string
          flavor: SausageFlavor
          pounds: number
          created_at?: string
        }
        Update: {
          id?: string
          cut_sheet_id?: string
          flavor?: SausageFlavor
          pounds?: number
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          created_at: string
          sender_id: string
          sender_org_id: string
          recipient_org_id: string
          processing_order_id: string | null
          content: string
          read_at: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          sender_id: string
          sender_org_id: string
          recipient_org_id: string
          processing_order_id?: string | null
          content: string
          read_at?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          created_at?: string
          sender_id?: string
          sender_org_id?: string
          recipient_org_id?: string
          processing_order_id?: string | null
          content?: string
          read_at?: string | null
          metadata?: Json
        }
      }
      notifications: {
        Row: {
          id: string
          created_at: string
          user_id: string
          type: string
          title: string
          body: string | null
          processing_order_id: string | null
          message_id: string | null
          read_at: string | null
          email_sent_at: string | null
          sms_sent_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          processing_order_id?: string | null
          message_id?: string | null
          read_at?: string | null
          email_sent_at?: string | null
          sms_sent_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          processing_order_id?: string | null
          message_id?: string | null
          read_at?: string | null
          email_sent_at?: string | null
          sms_sent_at?: string | null
        }
      }
      waitlist_entries: {
        Row: {
          id: string
          created_at: string
          producer_id: string
          processor_id: string
          preferred_date: string
          flexible_range_days: number
          animal_type: AnimalType
          livestock_id: string | null
          is_active: boolean
          notified_at: string | null
          converted_to_order_id: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          producer_id: string
          processor_id: string
          preferred_date: string
          flexible_range_days?: number
          animal_type: AnimalType
          livestock_id?: string | null
          is_active?: boolean
          notified_at?: string | null
          converted_to_order_id?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          producer_id?: string
          processor_id?: string
          preferred_date?: string
          flexible_range_days?: number
          animal_type?: AnimalType
          livestock_id?: string | null
          is_active?: boolean
          notified_at?: string | null
          converted_to_order_id?: string | null
          notes?: string | null
        }
      }
      processor_cut_config: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          processor_id: string
          enabled_animals: AnimalType[]
          disabled_cuts: string[]
          disabled_sausage_flavors: string[]
          custom_cuts: Json
          default_templates: Json
          processing_fees: Json
          min_hanging_weight: number | null
          max_hanging_weight: number | null
          producer_notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          processor_id: string
          enabled_animals?: AnimalType[]
          disabled_cuts?: string[]
          disabled_sausage_flavors?: string[]
          custom_cuts?: Json
          default_templates?: Json
          processing_fees?: Json
          min_hanging_weight?: number | null
          max_hanging_weight?: number | null
          producer_notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          processor_id?: string
          enabled_animals?: AnimalType[]
          disabled_cuts?: string[]
          disabled_sausage_flavors?: string[]
          custom_cuts?: Json
          default_templates?: Json
          processing_fees?: Json
          min_hanging_weight?: number | null
          max_hanging_weight?: number | null
          producer_notes?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      animal_type: AnimalType
      livestock_status: LivestockStatus
      order_status: OrderStatus
      organization_type: OrganizationType
      processing_stage: ProcessingStage
      user_role: UserRole
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export type Organization = Tables<'organizations'>
export type User = Tables<'users'>
export type Livestock = Tables<'livestock'>
export type CalendarSlot = Tables<'calendar_slots'>
export type ProcessingOrder = Tables<'processing_orders'>
export type CutSheet = Tables<'cut_sheets'>
export type CutSheetItem = Tables<'cut_sheet_items'>
export type CutSheetSausage = Tables<'cut_sheet_sausages'>
export type Message = Tables<'messages'>
export type Notification = Tables<'notifications'>
export type WaitlistEntry = Tables<'waitlist_entries'>
export type ProcessorCutConfig = Tables<'processor_cut_config'>

// Cut Sheet Helper Types
export interface CutDefinition {
  id: string
  name: string
  category: CutCategory
  hasThickness?: boolean
  hasWeight?: boolean
  conflictsWith?: string[]
  hint?: string
  animalTypes: AnimalType[]
}

export interface SelectedCut {
  cutId: string
  cutName: string
  category: CutCategory
  thickness?: string
  weightLbs?: number
  piecesPerPackage?: number
  pounds?: number
}

export interface CutSheetWithItems extends CutSheet {
  items: CutSheetItem[]
  sausages: CutSheetSausage[]
}

// Notification with related entities
export interface NotificationWithRelations extends Notification {
  processing_order?: ProcessingOrder | null
}

// ============================================
// Chain of Custody & Processor Edit Types
// ============================================

// Livestock with tracking ID
export interface LivestockWithTracking extends Livestock {
  tracking_id: string | null
}

// Change category for cut sheet history
export type CutSheetChangeCategory =
  | 'initial_creation'
  | 'cut_added'
  | 'cut_removed'
  | 'cut_modified'
  | 'weight_entered'
  | 'package_created'
  | 'notes_updated'
  | 'general'

// Cut sheet history entry
export interface CutSheetHistoryEntry {
  id: string
  cut_sheet_id: string
  processing_order_id: string | null
  changed_by_user_id: string | null
  changed_by_org_id: string | null
  changed_by_role: 'producer' | 'processor'
  change_type: 'created' | 'updated' | 'status_changed'
  change_category: CutSheetChangeCategory | null
  change_summary: string | null
  previous_state: Json | null
  new_state: Json | null
  changed_fields: string[] | null
  affected_cut_id: string | null
  affected_package_id: string | null
  created_at: string
}

// Produced package (actual cut produced with weight)
export interface ProducedPackage {
  id: string
  created_at: string
  updated_at: string
  cut_sheet_id: string
  processor_added: boolean
  cut_id: string
  cut_name: string
  primal_id: string | null
  package_number: number
  quantity_in_package: number
  actual_weight_lbs: number | null
  thickness: string | null
  processing_style: string | null
  label_printed: boolean
  label_printed_at: string | null
  livestock_tracking_id: string | null
  processor_notes: string | null
  metadata: Json
}

// Processor modification to a cut
export interface ProcessorCutModification {
  thickness?: string
  pieces_per_package?: number
  notes?: string
  modified_at?: string
}

// Removed cut record
export interface RemovedCut {
  cut_id: string
  cut_name: string
  reason: string
  removed_at: string
}

// Added cut record (by processor)
export interface AddedCut {
  cut_id: string
  cut_name: string
  primal_id?: string
  params: {
    thickness?: string
    pieces_per_package?: number
    weight_lbs?: number
  }
  notes?: string
  added_at: string
}

// Extended cut sheet with processor fields
export interface CutSheetWithProcessorFields extends CutSheet {
  processor_modifications: Record<string, ProcessorCutModification>
  removed_cuts: RemovedCut[]
  added_cuts: AddedCut[]
  processor_notes: string | null
  last_modified_by_role: 'producer' | 'processor' | null
  last_modified_by_user_id: string | null
  hanging_weight_lbs: number | null
  final_weight_lbs: number | null
}

// Cut sheet with items, sausages, and packages
export interface CutSheetComplete extends CutSheetWithProcessorFields {
  items: CutSheetItem[]
  sausages: CutSheetSausage[]
  produced_packages: ProducedPackage[]
}

// Order with full details for processor view
export interface ProcessingOrderWithDetails extends ProcessingOrder {
  producer: Organization
  processor: Organization
  livestock: LivestockWithTracking | null
  calendar_slot: CalendarSlot | null
  cut_sheet: CutSheetComplete | null
}
