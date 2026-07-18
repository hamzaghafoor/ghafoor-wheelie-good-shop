export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          page: string | null
          payload: Json | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          page?: string | null
          payload?: Json | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          page?: string | null
          payload?: Json | null
          session_id?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          archived: boolean
          categories: Database["public"]["Enums"]["product_category"][]
          country: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_featured: boolean
          logo_url: string | null
          name: string
          name_normalized: string | null
          slug: string | null
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          archived?: boolean
          categories?: Database["public"]["Enums"]["product_category"][]
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          logo_url?: string | null
          name: string
          name_normalized?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          archived?: boolean
          categories?: Database["public"]["Enums"]["product_category"][]
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          logo_url?: string | null
          name?: string
          name_normalized?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: []
      }
      business_info: {
        Row: {
          address: string | null
          currency: string
          email: string | null
          facebook: string | null
          google_review_url: string | null
          holiday_hours: Json
          hours: Json
          id: string
          instagram: string | null
          logo_url: string | null
          maps_url: string | null
          name: string
          phone: string | null
          temp_closure: string | null
          timezone: string
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          currency?: string
          email?: string | null
          facebook?: string | null
          google_review_url?: string | null
          holiday_hours?: Json
          hours?: Json
          id?: string
          instagram?: string | null
          logo_url?: string | null
          maps_url?: string | null
          name?: string
          phone?: string | null
          temp_closure?: string | null
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          currency?: string
          email?: string | null
          facebook?: string | null
          google_review_url?: string | null
          holiday_hours?: Json
          hours?: Json
          id?: string
          instagram?: string | null
          logo_url?: string | null
          maps_url?: string | null
          name?: string
          phone?: string | null
          temp_closure?: string | null
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          archived: boolean
          config: Json
          created_at: string
          display_order: number
          end_at: string | null
          id: string
          is_visible: boolean
          name: string
          start_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          type: Database["public"]["Enums"]["section_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived?: boolean
          config?: Json
          created_at?: string
          display_order?: number
          end_at?: string | null
          id?: string
          is_visible?: boolean
          name: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          type: Database["public"]["Enums"]["section_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived?: boolean
          config?: Json
          created_at?: string
          display_order?: number
          end_at?: string | null
          id?: string
          is_visible?: boolean
          name?: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          type?: Database["public"]["Enums"]["section_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          message: string | null
          model_id: string | null
          name: string
          phone: string
          preferred_contact: Database["public"]["Enums"]["lead_contact_method"]
          search_context: Json | null
          source_page: string | null
          status: Database["public"]["Enums"]["lead_status"]
          tyre_size: string | null
          updated_at: string
          variant_id: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_year: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message?: string | null
          model_id?: string | null
          name: string
          phone: string
          preferred_contact?: Database["public"]["Enums"]["lead_contact_method"]
          search_context?: Json | null
          source_page?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tyre_size?: string | null
          updated_at?: string
          variant_id?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message?: string | null
          model_id?: string | null
          name?: string
          phone?: string
          preferred_contact?: Database["public"]["Enums"]["lead_contact_method"]
          search_context?: Json | null
          source_page?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tyre_size?: string | null
          updated_at?: string
          variant_id?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "tyre_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "tyre_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string | null
          archived: boolean
          bucket: string
          category: string | null
          created_at: string
          filename: string | null
          id: string
          mime: string | null
          path: string
          size_bytes: number | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          alt_text?: string | null
          archived?: boolean
          bucket?: string
          category?: string | null
          created_at?: string
          filename?: string | null
          id?: string
          mime?: string | null
          path: string
          size_bytes?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          alt_text?: string | null
          archived?: boolean
          bucket?: string
          category?: string | null
          created_at?: string
          filename?: string | null
          id?: string
          mime?: string | null
          path?: string
          size_bytes?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      product_vehicle_compat: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          product_id: string
          vehicle_model_id: string
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id: string
          vehicle_model_id: string
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          vehicle_model_id?: string
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_vehicle_compat_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_vehicle_compat_vehicle_model_id_fkey"
            columns: ["vehicle_model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived: boolean
          availability: Database["public"]["Enums"]["availability_status"]
          availability_verified_at: string | null
          availability_verified_by: string | null
          brand_id: string | null
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          created_by: string | null
          full_desc: string | null
          id: string
          images: Json
          is_featured: boolean
          name: string
          part_number: string | null
          previous_price: number | null
          price: number | null
          price_mode: Database["public"]["Enums"]["price_mode"]
          price_note: string | null
          price_verified_at: string | null
          price_verified_by: string | null
          private_notes: string | null
          public_notes: string | null
          short_desc: string | null
          sku: string | null
          slug: string
          specs: Json
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          archived?: boolean
          availability?: Database["public"]["Enums"]["availability_status"]
          availability_verified_at?: string | null
          availability_verified_by?: string | null
          brand_id?: string | null
          category: Database["public"]["Enums"]["product_category"]
          created_at?: string
          created_by?: string | null
          full_desc?: string | null
          id?: string
          images?: Json
          is_featured?: boolean
          name: string
          part_number?: string | null
          previous_price?: number | null
          price?: number | null
          price_mode?: Database["public"]["Enums"]["price_mode"]
          price_note?: string | null
          price_verified_at?: string | null
          price_verified_by?: string | null
          private_notes?: string | null
          public_notes?: string | null
          short_desc?: string | null
          sku?: string | null
          slug: string
          specs?: Json
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          archived?: boolean
          availability?: Database["public"]["Enums"]["availability_status"]
          availability_verified_at?: string | null
          availability_verified_by?: string | null
          brand_id?: string | null
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          created_by?: string | null
          full_desc?: string | null
          id?: string
          images?: Json
          is_featured?: boolean
          name?: string
          part_number?: string | null
          previous_price?: number | null
          price?: number | null
          price_mode?: Database["public"]["Enums"]["price_mode"]
          price_note?: string | null
          price_verified_at?: string | null
          price_verified_by?: string | null
          private_notes?: string | null
          public_notes?: string | null
          short_desc?: string | null
          sku?: string | null
          slug?: string
          specs?: Json
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          must_change_password: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          must_change_password?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          must_change_password?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      section_revisions: {
        Row: {
          config: Json
          created_at: string
          id: string
          saved_by: string | null
          section_id: string
          status: Database["public"]["Enums"]["content_status"]
        }
        Insert: {
          config: Json
          created_at?: string
          id?: string
          saved_by?: string | null
          section_id: string
          status: Database["public"]["Enums"]["content_status"]
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          saved_by?: string | null
          section_id?: string
          status?: Database["public"]["Enums"]["content_status"]
        }
        Relationships: [
          {
            foreignKeyName: "section_revisions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "homepage_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      tyre_model_vehicle_compat: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          tyre_model_id: string
          vehicle_model_id: string
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          tyre_model_id: string
          vehicle_model_id: string
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          tyre_model_id?: string
          vehicle_model_id?: string
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tyre_model_vehicle_compat_tyre_model_id_fkey"
            columns: ["tyre_model_id"]
            isOneToOne: false
            referencedRelation: "tyre_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tyre_model_vehicle_compat_vehicle_model_id_fkey"
            columns: ["vehicle_model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
        ]
      }
      tyre_models: {
        Row: {
          archived: boolean
          brand_id: string
          code: string | null
          created_at: string
          created_by: string | null
          driving_characteristics: string[]
          full_desc: string | null
          id: string
          images: Json
          internal_notes: string | null
          is_featured: boolean
          name: string
          origin_country: string | null
          pattern_name: string | null
          recommended_use: string[] | null
          short_desc: string | null
          slug: string | null
          status: Database["public"]["Enums"]["content_status"]
          tyre_type: Database["public"]["Enums"]["tyre_type"] | null
          updated_at: string
          vehicle_categories: string[]
          warranty: string | null
          warranty_text: string | null
        }
        Insert: {
          archived?: boolean
          brand_id: string
          code?: string | null
          created_at?: string
          created_by?: string | null
          driving_characteristics?: string[]
          full_desc?: string | null
          id?: string
          images?: Json
          internal_notes?: string | null
          is_featured?: boolean
          name: string
          origin_country?: string | null
          pattern_name?: string | null
          recommended_use?: string[] | null
          short_desc?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          tyre_type?: Database["public"]["Enums"]["tyre_type"] | null
          updated_at?: string
          vehicle_categories?: string[]
          warranty?: string | null
          warranty_text?: string | null
        }
        Update: {
          archived?: boolean
          brand_id?: string
          code?: string | null
          created_at?: string
          created_by?: string | null
          driving_characteristics?: string[]
          full_desc?: string | null
          id?: string
          images?: Json
          internal_notes?: string | null
          is_featured?: boolean
          name?: string
          origin_country?: string | null
          pattern_name?: string | null
          recommended_use?: string[] | null
          short_desc?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          tyre_type?: Database["public"]["Enums"]["tyre_type"] | null
          updated_at?: string
          vehicle_categories?: string[]
          warranty?: string | null
          warranty_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tyre_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      tyre_products: {
        Row: {
          brand: string
          category: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          features: string[]
          id: string
          image_url: string | null
          in_stock: boolean
          model: string
          price: number | null
          size: string
          status: Database["public"]["Enums"]["product_status"]
          updated_at: string
          vehicles: string[]
        }
        Insert: {
          brand: string
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          features?: string[]
          id?: string
          image_url?: string | null
          in_stock?: boolean
          model: string
          price?: number | null
          size: string
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
          vehicles?: string[]
        }
        Update: {
          brand?: string
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          features?: string[]
          id?: string
          image_url?: string | null
          in_stock?: boolean
          model?: string
          price?: number | null
          size?: string
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
          vehicles?: string[]
        }
        Relationships: []
      }
      tyre_size_options: {
        Row: {
          archived: boolean
          created_at: string
          dimension: Database["public"]["Enums"]["tyre_size_dimension"]
          id: string
          label: string | null
          updated_at: string
          value: number
        }
        Insert: {
          archived?: boolean
          created_at?: string
          dimension: Database["public"]["Enums"]["tyre_size_dimension"]
          id?: string
          label?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          archived?: boolean
          created_at?: string
          dimension?: Database["public"]["Enums"]["tyre_size_dimension"]
          id?: string
          label?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      tyre_variant_vehicle_compat: {
        Row: {
          created_at: string
          id: string
          make_id: string | null
          model_id: string | null
          note: string | null
          updated_at: string
          variant_id: string
          year_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          make_id?: string | null
          model_id?: string | null
          note?: string | null
          updated_at?: string
          variant_id: string
          year_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          make_id?: string | null
          model_id?: string | null
          note?: string | null
          updated_at?: string
          variant_id?: string
          year_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tyre_variant_vehicle_compat_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "vehicle_makes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tyre_variant_vehicle_compat_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tyre_variant_vehicle_compat_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "tyre_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tyre_variant_vehicle_compat_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "vehicle_years"
            referencedColumns: ["id"]
          },
        ]
      }
      tyre_variants: {
        Row: {
          archived: boolean
          availability: Database["public"]["Enums"]["availability_status"]
          availability_note: string | null
          availability_verified_at: string | null
          availability_verified_by: string | null
          created_at: string
          created_by: string | null
          id: string
          load_index: string | null
          manufacturing_country: string | null
          model_id: string
          normalized_size: string
          ply_rating: string | null
          previous_price: number | null
          price: number | null
          price_mode: Database["public"]["Enums"]["price_mode"]
          price_note: string | null
          price_verified_at: string | null
          price_verified_by: string | null
          private_notes: string | null
          profile: number | null
          public_notes: string | null
          rim: number | null
          run_flat: boolean
          size_format: string
          speed_rating: string | null
          status: Database["public"]["Enums"]["content_status"]
          tube_type: Database["public"]["Enums"]["tube_type"]
          tubeless: boolean
          updated_at: string
          warranty: string | null
          width: number | null
          xl_reinforced: boolean
        }
        Insert: {
          archived?: boolean
          availability?: Database["public"]["Enums"]["availability_status"]
          availability_note?: string | null
          availability_verified_at?: string | null
          availability_verified_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          load_index?: string | null
          manufacturing_country?: string | null
          model_id: string
          normalized_size: string
          ply_rating?: string | null
          previous_price?: number | null
          price?: number | null
          price_mode?: Database["public"]["Enums"]["price_mode"]
          price_note?: string | null
          price_verified_at?: string | null
          price_verified_by?: string | null
          private_notes?: string | null
          profile?: number | null
          public_notes?: string | null
          rim?: number | null
          run_flat?: boolean
          size_format?: string
          speed_rating?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          tube_type?: Database["public"]["Enums"]["tube_type"]
          tubeless?: boolean
          updated_at?: string
          warranty?: string | null
          width?: number | null
          xl_reinforced?: boolean
        }
        Update: {
          archived?: boolean
          availability?: Database["public"]["Enums"]["availability_status"]
          availability_note?: string | null
          availability_verified_at?: string | null
          availability_verified_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          load_index?: string | null
          manufacturing_country?: string | null
          model_id?: string
          normalized_size?: string
          ply_rating?: string | null
          previous_price?: number | null
          price?: number | null
          price_mode?: Database["public"]["Enums"]["price_mode"]
          price_note?: string | null
          price_verified_at?: string | null
          price_verified_by?: string | null
          private_notes?: string | null
          profile?: number | null
          public_notes?: string | null
          rim?: number | null
          run_flat?: boolean
          size_format?: string
          speed_rating?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          tube_type?: Database["public"]["Enums"]["tube_type"]
          tubeless?: boolean
          updated_at?: string
          warranty?: string | null
          width?: number | null
          xl_reinforced?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tyre_variants_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "tyre_models"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_makes: {
        Row: {
          archived: boolean
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_models: {
        Row: {
          archived: boolean
          body_type: Database["public"]["Enums"]["vehicle_body_type"]
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_popular: boolean
          make_id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          body_type?: Database["public"]["Enums"]["vehicle_body_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          make_id: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          body_type?: Database["public"]["Enums"]["vehicle_body_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          make_id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_models_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "vehicle_makes"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_years: {
        Row: {
          archived: boolean
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          model_id: string
          updated_at: string
          variant_note: string | null
          year_from: number
          year_to: number | null
        }
        Insert: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          model_id: string
          updated_at?: string
          variant_note?: string | null
          year_from: number
          year_to?: number | null
        }
        Update: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          model_id?: string
          updated_at?: string
          variant_note?: string | null
          year_from?: number
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_years_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      catalogue_search: {
        Row: {
          archived: boolean | null
          brand_id: string | null
          brand_name: string | null
          category: Database["public"]["Enums"]["product_category"] | null
          id: string | null
          images: Json | null
          kind: string | null
          part_number: string | null
          short_desc: string | null
          size_or_spec: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          title: string | null
          tsv: unknown
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "admin" | "staff"
      availability_status:
        | "in_stock"
        | "limited"
        | "check"
        | "out_of_stock"
        | "on_order"
        | "discontinued"
      content_status: "draft" | "published" | "scheduled" | "archived"
      lead_contact_method: "whatsapp" | "call" | "either"
      lead_status: "new" | "contacted" | "qualified" | "closed" | "lost"
      price_mode:
        | "fixed"
        | "confirm_today"
        | "on_request"
        | "starting_from"
        | "hidden"
      product_category:
        | "tyres"
        | "lubricants"
        | "filters"
        | "maintenance_parts"
        | "car_care"
        | "additives"
        | "accessories"
        | "services"
      product_status: "draft" | "published" | "archived"
      section_type:
        | "hero"
        | "announcement"
        | "trust_strip"
        | "tyre_finder"
        | "featured_brands"
        | "featured_tyres"
        | "vehicle_categories"
        | "services_grid"
        | "promo_banner"
        | "image_text"
        | "why_us"
        | "reviews"
        | "articles"
        | "faq"
        | "location"
        | "contact_cta"
        | "whatsapp_cta"
        | "custom_text"
      tube_type: "tubeless" | "tube_type" | "unspecified"
      tyre_size_dimension: "width" | "profile" | "rim"
      tyre_type: "passenger" | "suv_4x4" | "commercial" | "other"
      vehicle_body_type:
        | "hatchback"
        | "sedan"
        | "suv"
        | "crossover"
        | "pickup"
        | "van"
        | "commercial"
        | "motorcycle"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "staff"],
      availability_status: [
        "in_stock",
        "limited",
        "check",
        "out_of_stock",
        "on_order",
        "discontinued",
      ],
      content_status: ["draft", "published", "scheduled", "archived"],
      lead_contact_method: ["whatsapp", "call", "either"],
      lead_status: ["new", "contacted", "qualified", "closed", "lost"],
      price_mode: [
        "fixed",
        "confirm_today",
        "on_request",
        "starting_from",
        "hidden",
      ],
      product_category: [
        "tyres",
        "lubricants",
        "filters",
        "maintenance_parts",
        "car_care",
        "additives",
        "accessories",
        "services",
      ],
      product_status: ["draft", "published", "archived"],
      section_type: [
        "hero",
        "announcement",
        "trust_strip",
        "tyre_finder",
        "featured_brands",
        "featured_tyres",
        "vehicle_categories",
        "services_grid",
        "promo_banner",
        "image_text",
        "why_us",
        "reviews",
        "articles",
        "faq",
        "location",
        "contact_cta",
        "whatsapp_cta",
        "custom_text",
      ],
      tube_type: ["tubeless", "tube_type", "unspecified"],
      tyre_size_dimension: ["width", "profile", "rim"],
      tyre_type: ["passenger", "suv_4x4", "commercial", "other"],
      vehicle_body_type: [
        "hatchback",
        "sedan",
        "suv",
        "crossover",
        "pickup",
        "van",
        "commercial",
        "motorcycle",
        "other",
      ],
    },
  },
} as const
