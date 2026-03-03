export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          name: string
          contact_number: string
          email: string | null
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          name: string
          contact_number: string
          email?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          contact_number?: string
          email?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
      }
      journeys: {
        Row: {
          id: string
          customer_id: string
          journey_name: string
          start_date: string
          end_date: string
          duration_days: number
          status: 'draft' | 'planning' | 'confirmed' | 'partially_paid' | 'fully_paid' | 'live' | 'completed' | 'canceled'
          created_at: string
          updated_at: string
          is_driver_copy?: boolean
          original_journey_id?: string | null
          created_by?: string | null
          description?: string | null
          is_archived?: boolean
          passenger_count?: number
          client_phone?: string
          pinned?: boolean
          pinned_at?: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          journey_name: string
          start_date: string
          end_date: string
          duration_days: number
          status?: 'draft' | 'planning' | 'confirmed' | 'partially_paid' | 'fully_paid' | 'live' | 'completed' | 'canceled'
          created_at?: string
          updated_at?: string
          is_driver_copy?: boolean
          original_journey_id?: string | null
          created_by?: string | null
          description?: string | null
          is_archived?: boolean
          passenger_count?: number
          client_phone?: string
          pinned?: boolean
          pinned_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          journey_name?: string
          start_date?: string
          end_date?: string
          duration_days?: number
          status?: 'draft' | 'planning' | 'confirmed' | 'partially_paid' | 'fully_paid' | 'live' | 'completed' | 'canceled'
          created_at?: string
          updated_at?: string
          is_driver_copy?: boolean
          original_journey_id?: string | null
          created_by?: string | null
          description?: string | null
          is_archived?: boolean
          passenger_count?: number
          client_phone?: string
          pinned?: boolean
          pinned_at?: string | null
        }
      }
      itinerary_days: {
        Row: {
          id: string
          journey_id: string
          day_number: number
          date: string
          city_destination: string
          start_time: string | null
          end_time: string | null
          notes: string | null
          created_at: string
          early_morning_section_enabled: boolean
          night_section_enabled: boolean
          breakfast_section_enabled: boolean
          lunch_section_enabled: boolean
          dinner_section_enabled: boolean
          show_transportation: boolean
          show_breakfast: boolean
          show_morning_activity: boolean
          show_lunch: boolean
          show_afternoon_activity: boolean
          show_dinner: boolean
          show_accommodation: boolean
          show_early_morning_activity: boolean
          show_evening_activity: boolean
          show_night_activity: boolean
          is_completed: boolean
        }
        Insert: {
          id?: string
          journey_id: string
          day_number: number
          date: string
          city_destination: string
          start_time?: string | null
          end_time?: string | null
          notes?: string | null
          created_at?: string
          early_morning_section_enabled?: boolean
          night_section_enabled?: boolean
          breakfast_section_enabled?: boolean
          lunch_section_enabled?: boolean
          dinner_section_enabled?: boolean
          show_transportation?: boolean
          show_breakfast?: boolean
          show_morning_activity?: boolean
          show_lunch?: boolean
          show_afternoon_activity?: boolean
          show_dinner?: boolean
          show_accommodation?: boolean
          show_early_morning_activity?: boolean
          show_evening_activity?: boolean
          show_night_activity?: boolean
          is_completed?: boolean
        }
        Update: {
          id?: string
          journey_id?: string
          day_number?: number
          date?: string
          city_destination?: string
          start_time?: string | null
          end_time?: string | null
          notes?: string | null
          created_at?: string
          early_morning_section_enabled?: boolean
          night_section_enabled?: boolean
          breakfast_section_enabled?: boolean
          lunch_section_enabled?: boolean
          dinner_section_enabled?: boolean
          show_transportation?: boolean
          show_breakfast?: boolean
          show_morning_activity?: boolean
          show_lunch?: boolean
          show_afternoon_activity?: boolean
          show_dinner?: boolean
          show_accommodation?: boolean
          show_early_morning_activity?: boolean
          show_evening_activity?: boolean
          show_night_activity?: boolean
          is_completed?: boolean
        }
      }
      accommodations: {
        Row: {
          id: string
          day_id: string
          hotel_name: string
          location_address: string
          map_link: string | null
          check_in_time: string | null
          check_out_time: string | null
          booking_status: 'confirmed' | 'pending'
          payment_status: 'paid' | 'pending'
          payment_type: 'full' | 'half_deposit' | 'custom_installment'
          payment_amount: number | null
          breakfast_included: boolean
          breakfast_location: 'in_hotel' | 'external' | null
          lunch_included: boolean
          lunch_location: 'in_hotel' | 'external' | null
          dinner_included: boolean
          dinner_location: 'in_hotel' | 'external' | null
          access_method: 'pdf_voucher' | 'barcode' | 'eticket' | 'front_desk' | 'n_a'
          confirmation_number: string | null
          guide_notes: string | null
          images: any[] | null
          created_at: string
          updated_at: string
          accommodation_type: ('guest' | 'staff')[]
        }
        Insert: {
          id?: string
          day_id: string
          hotel_name: string
          location_address: string
          map_link?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          booking_status?: 'confirmed' | 'pending'
          payment_status?: 'paid' | 'pending'
          payment_type?: 'full' | 'half_deposit' | 'custom_installment'
          payment_amount?: number | null
          breakfast_included?: boolean
          breakfast_location?: 'in_hotel' | 'external' | null
          lunch_included?: boolean
          lunch_location?: 'in_hotel' | 'external' | null
          dinner_included?: boolean
          dinner_location?: 'in_hotel' | 'external' | null
          access_method?: 'pdf_voucher' | 'barcode' | 'eticket' | 'front_desk' | 'n_a'
          confirmation_number?: string | null
          guide_notes?: string | null
          images?: any[] | null
          created_at?: string
          updated_at?: string
          accommodation_type?: ('guest' | 'staff')[]
        }
        Update: {
          id?: string
          day_id?: string
          hotel_name?: string
          location_address?: string
          map_link?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          booking_status?: 'confirmed' | 'pending'
          payment_status?: 'paid' | 'pending'
          payment_type?: 'full' | 'half_deposit' | 'custom_installment'
          payment_amount?: number | null
          breakfast_included?: boolean
          breakfast_location?: 'in_hotel' | 'external' | null
          lunch_included?: boolean
          lunch_location?: 'in_hotel' | 'external' | null
          dinner_included?: boolean
          dinner_location?: 'in_hotel' | 'external' | null
          access_method?: 'pdf_voucher' | 'barcode' | 'eticket' | 'front_desk' | 'n_a'
          confirmation_number?: string | null
          guide_notes?: string | null
          images?: any[] | null
          created_at?: string
          updated_at?: string
          accommodation_type?: ('guest' | 'staff')[]
        }
      }
      activities: {
        Row: {
          id: string
          day_id: string
          activity_name: string
          location: string
          map_link: string | null
          activity_time: string
          duration_minutes: number | null
          guide_notes: string | null
          booking_status: 'confirmed' | 'pending'
          payment_status: 'prepaid' | 'pay_onsite' | 'pending'
          access_method: 'pdf_ticket' | 'barcode' | 'qr_code' | 'evoucher' | 'physical_ticket' | 'n_a' | 'not_included_in_invoice' | 'paid_by_client'
          is_completed: boolean
          display_order: number
          images: any[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          day_id: string
          activity_name: string
          location: string
          map_link?: string | null
          activity_time: string
          duration_minutes?: number | null
          guide_notes?: string | null
          booking_status?: 'confirmed' | 'pending'
          payment_status?: 'prepaid' | 'pay_onsite' | 'pending'
          access_method?: 'pdf_ticket' | 'barcode' | 'qr_code' | 'evoucher' | 'physical_ticket' | 'n_a' | 'not_included_in_invoice' | 'paid_by_client'
          is_completed?: boolean
          display_order?: number
          images?: any[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          day_id?: string
          activity_name?: string
          location?: string
          map_link?: string | null
          activity_time?: string
          duration_minutes?: number | null
          guide_notes?: string | null
          booking_status?: 'confirmed' | 'pending'
          payment_status?: 'prepaid' | 'pay_onsite' | 'pending'
          access_method?: 'pdf_ticket' | 'barcode' | 'qr_code' | 'evoucher' | 'physical_ticket' | 'n_a' | 'not_included_in_invoice' | 'paid_by_client'
          is_completed?: boolean
          display_order?: number
          images?: any[] | null
          created_at?: string
          updated_at?: string
        }
      }
      dining: {
        Row: {
          id: string
          day_id: string
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          restaurant_name: string
          cuisine_type: string | null
          location_address: string
          location_type: 'hotel' | 'external'
          map_link: string | null
          reservation_time: string
          confirmation_status: 'confirmed' | 'not_booked' | 'pending' | 'n/a'
          payment_amount: number | null
          payment_status: 'pending' | 'pre_paid' | 'paid_on_site' | 'n_a' | null
          paid_by: 'desert_paths' | 'client' | null
          dietary_restrictions: string | null
          guide_notes: string | null
          display_order: number
          is_completed: boolean
          images: any[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          day_id: string
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          restaurant_name: string
          cuisine_type?: string | null
          location_address: string
          location_type?: 'hotel' | 'external'
          map_link?: string | null
          reservation_time: string
          confirmation_status?: 'confirmed' | 'not_booked' | 'pending' | 'n/a'
          payment_amount?: number | null
          payment_status?: 'pending' | 'pre_paid' | 'paid_on_site' | 'n_a' | null
          paid_by?: 'desert_paths' | 'client' | null
          dietary_restrictions?: string | null
          guide_notes?: string | null
          display_order?: number
          is_completed?: boolean
          images?: any[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          day_id?: string
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          restaurant_name?: string
          cuisine_type?: string | null
          location_address?: string
          location_type?: 'hotel' | 'external'
          map_link?: string | null
          reservation_time?: string
          confirmation_status?: 'confirmed' | 'not_booked' | 'pending' | 'n/a'
          payment_amount?: number | null
          payment_status?: 'pending' | 'pre_paid' | 'paid_on_site' | 'n_a' | null
          paid_by?: 'desert_paths' | 'client' | null
          dietary_restrictions?: string | null
          guide_notes?: string | null
          display_order?: number
          is_completed?: boolean
          images?: any[] | null
          created_at?: string
          updated_at?: string
        }
      }
      transportation: {
        Row: {
          id: string
          day_id: string
          contact_details: string | null
          car_type: string | null
          notes: string | null
          pickup_time: string | null
          dropoff_time: string | null
          pickup_location: string | null
          dropoff_location: string | null
          pickup_location_link: string | null
          dropoff_location_link: string | null
          images: any[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          day_id: string
          contact_details?: string | null
          car_type?: string | null
          notes?: string | null
          pickup_time?: string | null
          dropoff_time?: string | null
          pickup_location?: string | null
          dropoff_location?: string | null
          pickup_location_link?: string | null
          dropoff_location_link?: string | null
          images?: any[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          day_id?: string
          contact_details?: string | null
          car_type?: string | null
          notes?: string | null
          pickup_time?: string | null
          dropoff_time?: string | null
          pickup_location?: string | null
          dropoff_location?: string | null
          pickup_location_link?: string | null
          dropoff_location_link?: string | null
          images?: any[] | null
          created_at?: string
          updated_at?: string
        }
      }
      transportation_booking_fees: {
        Row: {
          id: string
          transportation_id: string
          fee_name: string
          fee_amount: number
          currency: string
          fee_type: 'booking' | 'service' | 'processing' | 'other'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transportation_id: string
          fee_name: string
          fee_amount?: number
          currency?: string
          fee_type?: 'booking' | 'service' | 'processing' | 'other'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transportation_id?: string
          fee_name?: string
          fee_amount?: number
          currency?: string
          fee_type?: 'booking' | 'service' | 'processing' | 'other'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          related_type: 'accommodation' | 'activity' | 'dining'
          related_id: string
          document_type: 'voucher' | 'ticket' | 'barcode' | 'confirmation' | 'other'
          file_name: string
          file_path: string
          file_url: string | null
          notes: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          related_type: 'accommodation' | 'activity' | 'dining'
          related_id: string
          document_type: 'voucher' | 'ticket' | 'barcode' | 'confirmation' | 'other'
          file_name: string
          file_path: string
          file_url?: string | null
          notes?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          related_type?: 'accommodation' | 'activity' | 'dining'
          related_id?: string
          document_type?: 'voucher' | 'ticket' | 'barcode' | 'confirmation' | 'other'
          file_name?: string
          file_path?: string
          file_url?: string | null
          notes?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          name: string
          email: string
          role: 'admin' | 'guide' | 'client' | 'manager'
          status: 'pending' | 'approved' | 'active' | 'rejected' | 'inactive' | 'deleted'
          approved_by: string | null
          approved_at: string | null
          rejected_at: string | null
          rejection_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          phone_number: string | null
          job_title: string | null
          bio: string | null
          profile_picture_url: string | null
          tour_license_url: string | null
          tour_license_expiry: string | null
          is_staff_member: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          role?: 'admin' | 'guide' | 'client' | 'manager'
          status?: 'pending' | 'approved' | 'active' | 'rejected' | 'inactive' | 'deleted'
          approved_by?: string | null
          approved_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          phone_number?: string | null
          job_title?: string | null
          bio?: string | null
          profile_picture_url?: string | null
          tour_license_url?: string | null
          tour_license_expiry?: string | null
          is_staff_member?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'admin' | 'guide' | 'client' | 'manager'
          status?: 'pending' | 'approved' | 'active' | 'rejected' | 'inactive' | 'deleted'
          approved_by?: string | null
          approved_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          phone_number?: string | null
          job_title?: string | null
          bio?: string | null
          profile_picture_url?: string | null
          tour_license_url?: string | null
          tour_license_expiry?: string | null
          is_staff_member?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      journey_assignments: {
        Row: {
          id: string
          journey_id: string
          user_id: string
          assigned_at: string
        }
        Insert: {
          id?: string
          journey_id: string
          user_id: string
          assigned_at?: string
        }
        Update: {
          id?: string
          journey_id?: string
          user_id?: string
          assigned_at?: string
        }
      }
      shared_links: {
        Row: {
          id: string
          journey_id: string
          share_token: string
          link_type: 'guide' | 'customer'
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          journey_id: string
          share_token?: string
          link_type: 'guide' | 'customer'
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          journey_id?: string
          share_token?: string
          link_type?: 'guide' | 'customer'
          expires_at?: string | null
          created_at?: string
        }
      }
      journey_shares: {
        Row: {
          id: string
          journey_id: string
          shared_with: string
          permission_level: 'view' | 'edit'
          is_active: boolean
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          journey_id: string
          shared_with: string
          permission_level?: 'view' | 'edit'
          is_active?: boolean
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          journey_id?: string
          shared_with?: string
          permission_level?: 'view' | 'edit'
          is_active?: boolean
          created_at?: string
          created_by?: string
        }
      }
      uploaded_documents: {
        Row: {
          id: string
          journey_id: string
          file_name: string
          file_path: string
          file_size: number
          mime_type: string
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          journey_id: string
          file_name: string
          file_path: string
          file_size: number
          mime_type: string
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          journey_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          mime_type?: string
          uploaded_by?: string
          created_at?: string
        }
      }
      ocr_extractions: {
        Row: {
          id: string
          journey_id: string
          document_id: string
          extracted_text: string
          confidence_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          journey_id: string
          document_id: string
          extracted_text: string
          confidence_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          journey_id?: string
          document_id?: string
          extracted_text?: string
          confidence_score?: number | null
          created_at?: string
        }
      }
      itinerary_entries: {
        Row: {
          id: string
          journey_id: string
          entry_type: string
          entry_data: Json
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          journey_id: string
          entry_type: string
          entry_data: Json
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          journey_id?: string
          entry_type?: string
          entry_data?: Json
          display_order?: number
          created_at?: string
        }
      }
      activity_log: {
        Row: {
          id: string
          journey_id: string
          user_id: string
          action: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          journey_id: string
          user_id: string
          action: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          journey_id?: string
          user_id?: string
          action?: string
          details?: Json | null
          created_at?: string
        }
      }
      journey_documents: {
        Row: {
          id: string
          journey_id: string
          title: string
          file_path: string
          file_type: string
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          journey_id: string
          title: string
          file_path: string
          file_type: string
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          journey_id?: string
          title?: string
          file_path?: string
          file_type?: string
          uploaded_by?: string
          created_at?: string
        }
      }
      journey_templates: {
        Row: {
          id: string
          template_name: string
          journey_id: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          template_name: string
          journey_id: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          template_name?: string
          journey_id?: string
          created_by?: string
          created_at?: string
        }
      }
      journey_staff: {
        Row: {
          id: string
          journey_id: string
          master_staff_id: string | null
          name: string
          role: string
          role_custom: string | null
          staff_type: string
          email: string | null
          phone: string | null
          emergency_contact: string | null
          status: string
          availability: string
          availability_notes: string
          payment_status: string
          payment_method: string | null
          payment_amount: number | null
          payment_date: string | null
          payment_notes: string
          id_verified: boolean
          contract_signed: boolean
          documents_notes: string
          internal_notes: string
          profile_photo_url: string | null
          document_attachment_url: string | null
          has_vehicle: boolean
          vehicle_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          journey_id: string
          master_staff_id?: string | null
          name: string
          role: string
          role_custom?: string | null
          staff_type?: string
          email?: string | null
          phone?: string | null
          emergency_contact?: string | null
          status?: string
          availability?: string
          availability_notes?: string
          payment_status?: string
          payment_method?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_notes?: string
          id_verified?: boolean
          contract_signed?: boolean
          documents_notes?: string
          internal_notes?: string
          profile_photo_url?: string | null
          document_attachment_url?: string | null
          has_vehicle?: boolean
          vehicle_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          journey_id?: string
          master_staff_id?: string | null
          name?: string
          role?: string
          role_custom?: string | null
          staff_type?: string
          email?: string | null
          phone?: string | null
          emergency_contact?: string | null
          status?: string
          availability?: string
          availability_notes?: string
          payment_status?: string
          payment_method?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_notes?: string
          id_verified?: boolean
          contract_signed?: boolean
          documents_notes?: string
          internal_notes?: string
          profile_photo_url?: string | null
          document_attachment_url?: string | null
          has_vehicle?: boolean
          vehicle_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      journey_vehicles: {
        Row: {
          id: string
          journey_id: string
          vehicle_name: string
          vehicle_type: string
          created_at: string
        }
        Insert: {
          id?: string
          journey_id: string
          vehicle_name: string
          vehicle_type: string
          created_at?: string
        }
        Update: {
          id?: string
          journey_id?: string
          vehicle_name?: string
          vehicle_type?: string
          created_at?: string
        }
      }
      journey_gear: {
        Row: {
          id: string
          journey_id: string
          item_name: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          journey_id: string
          item_name: string
          quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          journey_id?: string
          item_name?: string
          quantity?: number
          created_at?: string
        }
      }
      master_staff: {
        Row: {
          id: string
          user_id: string | null
          name: string
          role: string
          role_custom: string | null
          category: string
          subcategory: string | null
          staff_type: string
          email: string | null
          phone: string | null
          emergency_contact: string | null
          availability: string
          availability_notes: string
          payment_method: string | null
          id_verified: boolean
          contract_signed: boolean
          documents_notes: string
          profile_photo_url: string | null
          document_attachment_url: string | null
          has_vehicle: boolean
          vehicle_type: string | null
          internal_notes: string
          status: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          role?: string
          role_custom?: string | null
          category?: string
          subcategory?: string | null
          staff_type?: string
          email?: string | null
          phone?: string | null
          emergency_contact?: string | null
          availability?: string
          availability_notes?: string
          payment_method?: string | null
          id_verified?: boolean
          contract_signed?: boolean
          documents_notes?: string
          profile_photo_url?: string | null
          document_attachment_url?: string | null
          has_vehicle?: boolean
          vehicle_type?: string | null
          internal_notes?: string
          status?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          role?: string
          role_custom?: string | null
          category?: string
          subcategory?: string | null
          staff_type?: string
          email?: string | null
          phone?: string | null
          emergency_contact?: string | null
          availability?: string
          availability_notes?: string
          payment_method?: string | null
          id_verified?: boolean
          contract_signed?: boolean
          documents_notes?: string
          profile_photo_url?: string | null
          document_attachment_url?: string | null
          has_vehicle?: boolean
          vehicle_type?: string | null
          internal_notes?: string
          status?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      staff_documents: {
        Row: {
          id: string
          master_staff_id: string
          document_type: string
          document_name: string
          file_url: string
          file_size: number | null
          uploaded_by: string | null
          uploaded_at: string
          notes: string
        }
        Insert: {
          id?: string
          master_staff_id: string
          document_type: string
          document_name: string
          file_url: string
          file_size?: number | null
          uploaded_by?: string | null
          uploaded_at?: string
          notes?: string
        }
        Update: {
          id?: string
          master_staff_id?: string
          document_type?: string
          document_name?: string
          file_url?: string
          file_size?: number | null
          uploaded_by?: string | null
          uploaded_at?: string
          notes?: string
        }
      }
      staff_images: {
        Row: {
          id: string
          master_staff_id: string
          image_type: string
          image_name: string
          file_url: string
          is_primary: boolean
          uploaded_by: string | null
          uploaded_at: string
          notes: string
        }
        Insert: {
          id?: string
          master_staff_id: string
          image_type?: string
          image_name: string
          file_url: string
          is_primary?: boolean
          uploaded_by?: string | null
          uploaded_at?: string
          notes?: string
        }
        Update: {
          id?: string
          master_staff_id?: string
          image_type?: string
          image_name?: string
          file_url?: string
          is_primary?: boolean
          uploaded_by?: string | null
          uploaded_at?: string
          notes?: string
        }
      }
    }
  }
}

export type Customer = Database['public']['Tables']['customers']['Row'];
export type Journey = Database['public']['Tables']['journeys']['Row'];
export type ItineraryDay = Database['public']['Tables']['itinerary_days']['Row'];
export type Accommodation = Database['public']['Tables']['accommodations']['Row'];
export type Activity = Database['public']['Tables']['activities']['Row'];
export type Dining = Database['public']['Tables']['dining']['Row'];
export type Transportation = Database['public']['Tables']['transportation']['Row'];
export type TransportationBookingFee = Database['public']['Tables']['transportation_booking_fees']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type User = Database['public']['Tables']['users']['Row'];
export type JourneyAssignment = Database['public']['Tables']['journey_assignments']['Row'];
export type SharedLink = Database['public']['Tables']['shared_links']['Row'];
export type JourneyShare = Database['public']['Tables']['journey_shares']['Row'];
export type UploadedDocument = Database['public']['Tables']['uploaded_documents']['Row'];
export type OcrExtraction = Database['public']['Tables']['ocr_extractions']['Row'];
export type ItineraryEntry = Database['public']['Tables']['itinerary_entries']['Row'];
export type ActivityLog = Database['public']['Tables']['activity_log']['Row'];
export type JourneyDocument = Database['public']['Tables']['journey_documents']['Row'];
export type JourneyTemplate = Database['public']['Tables']['journey_templates']['Row'];
export type JourneyStaff = Database['public']['Tables']['journey_staff']['Row'];
export type JourneyVehicle = Database['public']['Tables']['journey_vehicles']['Row'];
export type JourneyGear = Database['public']['Tables']['journey_gear']['Row'];
export type MasterStaff = Database['public']['Tables']['master_staff']['Row'];
export type StaffDocument = Database['public']['Tables']['staff_documents']['Row'];
export type StaffImage = Database['public']['Tables']['staff_images']['Row'];
