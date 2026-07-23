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
      articles: {
        Row: {
          body_md: string
          cover_image_path: string | null
          created_at: string
          created_by: string | null
          display_order: number
          excerpt: string | null
          id: string
          published: boolean
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          body_md?: string
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      brand_merges: {
        Row: {
          from_brand_id: string
          id: string
          moved_product_count: number
          moved_tyre_model_count: number
          notes: string | null
          performed_at: string
          performed_by: string | null
          to_brand_id: string
        }
        Insert: {
          from_brand_id: string
          id?: string
          moved_product_count?: number
          moved_tyre_model_count?: number
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          to_brand_id: string
        }
        Update: {
          from_brand_id?: string
          id?: string
          moved_product_count?: number
          moved_tyre_model_count?: number
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          to_brand_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_merges_to_brand_id_fkey"
            columns: ["to_brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
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
      catalogue_settings: {
        Row: {
          availability_stale_days: number
          booking_enabled: boolean
          catalogue_phone: string | null
          category_order: string[]
          default_availability: string
          default_calendly_url: string | null
          default_import_status: string
          empty_catalogue_message: string
          id: number
          nav_categories: string[]
          price_confirm_text: string
          products_per_page: number
          service_calendly_links: Json
          updated_at: string
          updated_by: string | null
          whatsapp_cta_text: string
        }
        Insert: {
          availability_stale_days?: number
          booking_enabled?: boolean
          catalogue_phone?: string | null
          category_order?: string[]
          default_availability?: string
          default_calendly_url?: string | null
          default_import_status?: string
          empty_catalogue_message?: string
          id?: number
          nav_categories?: string[]
          price_confirm_text?: string
          products_per_page?: number
          service_calendly_links?: Json
          updated_at?: string
          updated_by?: string | null
          whatsapp_cta_text?: string
        }
        Update: {
          availability_stale_days?: number
          booking_enabled?: boolean
          catalogue_phone?: string | null
          category_order?: string[]
          default_availability?: string
          default_calendly_url?: string | null
          default_import_status?: string
          empty_catalogue_message?: string
          id?: number
          nav_categories?: string[]
          price_confirm_text?: string
          products_per_page?: number
          service_calendly_links?: Json
          updated_at?: string
          updated_by?: string | null
          whatsapp_cta_text?: string
        }
        Relationships: []
      }
      homepage_catalogue_sections: {
        Row: {
          brand_ids: string[]
          category_slugs: string[]
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_link: string | null
          description: string | null
          display_order: number
          heading: string | null
          id: string
          is_visible: boolean
          kind: Database["public"]["Enums"]["homepage_catalogue_section_kind"]
          product_ids: string[]
          updated_at: string
        }
        Insert: {
          brand_ids?: string[]
          category_slugs?: string[]
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_link?: string | null
          description?: string | null
          display_order?: number
          heading?: string | null
          id?: string
          is_visible?: boolean
          kind: Database["public"]["Enums"]["homepage_catalogue_section_kind"]
          product_ids?: string[]
          updated_at?: string
        }
        Update: {
          brand_ids?: string[]
          category_slugs?: string[]
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_link?: string | null
          description?: string | null
          display_order?: number
          heading?: string | null
          id?: string
          is_visible?: boolean
          kind?: Database["public"]["Enums"]["homepage_catalogue_section_kind"]
          product_ids?: string[]
          updated_at?: string
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
      import_batch_rows: {
        Row: {
          action: Database["public"]["Enums"]["import_row_action"] | null
          after_snapshot: Json | null
          batch_id: string
          before_snapshot: Json | null
          created_at: string
          error_message: string | null
          id: string
          row_number: number
          source_payload: Json | null
          source_payload_purged_at: string | null
          status: Database["public"]["Enums"]["import_row_status"]
          target_id: string | null
          target_table: string | null
          target_updated_at_after_import: string | null
          updated_at: string
        }
        Insert: {
          action?: Database["public"]["Enums"]["import_row_action"] | null
          after_snapshot?: Json | null
          batch_id: string
          before_snapshot?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          row_number: number
          source_payload?: Json | null
          source_payload_purged_at?: string | null
          status?: Database["public"]["Enums"]["import_row_status"]
          target_id?: string | null
          target_table?: string | null
          target_updated_at_after_import?: string | null
          updated_at?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["import_row_action"] | null
          after_snapshot?: Json | null
          batch_id?: string
          before_snapshot?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          row_number?: number
          source_payload?: Json | null
          source_payload_purged_at?: string | null
          status?: Database["public"]["Enums"]["import_row_status"]
          target_id?: string | null
          target_table?: string | null
          target_updated_at_after_import?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batch_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          allow_partial: boolean
          committed_at: string | null
          conflict_strategy: Database["public"]["Enums"]["import_conflict_strategy"]
          created_at: string
          error_summary: string | null
          filename: string | null
          id: string
          kind: Database["public"]["Enums"]["import_kind"]
          rollback_expires_at: string | null
          rolled_back_at: string | null
          status: Database["public"]["Enums"]["import_batch_status"]
          totals: Json
          updated_at: string
          uploader: string | null
        }
        Insert: {
          allow_partial?: boolean
          committed_at?: string | null
          conflict_strategy?: Database["public"]["Enums"]["import_conflict_strategy"]
          created_at?: string
          error_summary?: string | null
          filename?: string | null
          id?: string
          kind: Database["public"]["Enums"]["import_kind"]
          rollback_expires_at?: string | null
          rolled_back_at?: string | null
          status?: Database["public"]["Enums"]["import_batch_status"]
          totals?: Json
          updated_at?: string
          uploader?: string | null
        }
        Update: {
          allow_partial?: boolean
          committed_at?: string | null
          conflict_strategy?: Database["public"]["Enums"]["import_conflict_strategy"]
          created_at?: string
          error_summary?: string | null
          filename?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["import_kind"]
          rollback_expires_at?: string | null
          rolled_back_at?: string | null
          status?: Database["public"]["Enums"]["import_batch_status"]
          totals?: Json
          updated_at?: string
          uploader?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          lead_type: string
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
          lead_type?: string
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
          lead_type?: string
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
      packaging_presets: {
        Row: {
          created_at: string
          display_label: string | null
          display_order: number
          id: string
          is_active: boolean
          unit_code: string
          updated_at: string
          value_numeric: number
        }
        Insert: {
          created_at?: string
          display_label?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          unit_code: string
          updated_at?: string
          value_numeric: number
        }
        Update: {
          created_at?: string
          display_label?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          unit_code?: string
          updated_at?: string
          value_numeric?: number
        }
        Relationships: [
          {
            foreignKeyName: "packaging_presets_unit_code_fkey"
            columns: ["unit_code"]
            isOneToOne: false
            referencedRelation: "packaging_units"
            referencedColumns: ["code"]
          },
        ]
      }
      packaging_units: {
        Row: {
          base_code: string
          code: string
          display_label: string
          display_order: number
          factor_to_base: number
          is_visible: boolean
          kind: Database["public"]["Enums"]["packaging_unit_kind"]
          system_locked: boolean
          updated_at: string
        }
        Insert: {
          base_code: string
          code: string
          display_label: string
          display_order?: number
          factor_to_base: number
          is_visible?: boolean
          kind: Database["public"]["Enums"]["packaging_unit_kind"]
          system_locked?: boolean
          updated_at?: string
        }
        Update: {
          base_code?: string
          code?: string
          display_label?: string
          display_order?: number
          factor_to_base?: number
          is_visible?: boolean
          kind?: Database["public"]["Enums"]["packaging_unit_kind"]
          system_locked?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      product_tags: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          confidence: number | null
          created_at: string
          created_by: string | null
          product_id: string
          source: Database["public"]["Enums"]["tag_source"]
          tag_id: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          product_id: string
          source?: Database["public"]["Enums"]["tag_source"]
          tag_id: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          product_id?: string
          source?: Database["public"]["Enums"]["tag_source"]
          tag_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      product_type_labels: {
        Row: {
          archived: boolean
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          label: string
          slug: string
          type_id: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          label: string
          slug: string
          type_id?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_type_labels_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
        ]
      }
      product_types: {
        Row: {
          archived: boolean
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          parent_category: Database["public"]["Enums"]["product_category"]
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
          name: string
          parent_category: Database["public"]["Enums"]["product_category"]
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
          name?: string
          parent_category?: Database["public"]["Enums"]["product_category"]
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_variant_tags: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          confidence: number | null
          created_at: string
          created_by: string | null
          override_mode: string
          source: Database["public"]["Enums"]["tag_source"]
          tag_id: string
          updated_at: string
          variant_id: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          override_mode?: string
          source?: Database["public"]["Enums"]["tag_source"]
          tag_id: string
          updated_at?: string
          variant_id: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          override_mode?: string
          source?: Database["public"]["Enums"]["tag_source"]
          tag_id?: string
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_tags_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          archived: boolean
          availability: string
          compare_at_price: number | null
          created_at: string
          created_by: string | null
          display_order: number
          erp_stock_id: string | null
          id: string
          image_path: string | null
          is_default: boolean
          is_packless: boolean
          normalized_base_qty: number | null
          normalized_kind:
            | Database["public"]["Enums"]["packaging_unit_kind"]
            | null
          pack_label: string | null
          pack_unit_code: string | null
          pack_value: number | null
          price: number | null
          private_notes: string | null
          product_id: string
          status: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          availability?: string
          compare_at_price?: number | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          erp_stock_id?: string | null
          id?: string
          image_path?: string | null
          is_default?: boolean
          is_packless?: boolean
          normalized_base_qty?: number | null
          normalized_kind?:
            | Database["public"]["Enums"]["packaging_unit_kind"]
            | null
          pack_label?: string | null
          pack_unit_code?: string | null
          pack_value?: number | null
          price?: number | null
          private_notes?: string | null
          product_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          availability?: string
          compare_at_price?: number | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          erp_stock_id?: string | null
          id?: string
          image_path?: string | null
          is_default?: boolean
          is_packless?: boolean
          normalized_base_qty?: number | null
          normalized_kind?:
            | Database["public"]["Enums"]["packaging_unit_kind"]
            | null
          pack_label?: string | null
          pack_unit_code?: string | null
          pack_value?: number | null
          price?: number | null
          private_notes?: string | null
          product_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_pack_unit_code_fkey"
            columns: ["pack_unit_code"]
            isOneToOne: false
            referencedRelation: "packaging_units"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
          erp_description: string | null
          full_desc: string | null
          id: string
          images: Json
          internal_notes: string | null
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
          product_type_id: string | null
          public_notes: string | null
          purpose_label_ids: string[]
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
          erp_description?: string | null
          full_desc?: string | null
          id?: string
          images?: Json
          internal_notes?: string | null
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
          product_type_id?: string | null
          public_notes?: string | null
          purpose_label_ids?: string[]
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
          erp_description?: string | null
          full_desc?: string | null
          id?: string
          images?: Json
          internal_notes?: string | null
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
          product_type_id?: string | null
          public_notes?: string | null
          purpose_label_ids?: string[]
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
          {
            foreignKeyName: "products_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
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
      reviews: {
        Row: {
          author_name: string
          body: string
          created_at: string
          created_by: string | null
          display_order: number
          external_id: string | null
          external_url: string | null
          id: string
          published: boolean
          rating: number
          review_date: string | null
          source: string
          updated_at: string
        }
        Insert: {
          author_name: string
          body: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          external_id?: string | null
          external_url?: string | null
          id?: string
          published?: boolean
          rating: number
          review_date?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          external_id?: string | null
          external_url?: string | null
          id?: string
          published?: boolean
          rating?: number
          review_date?: string | null
          source?: string
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
      tag_aliases: {
        Row: {
          alias_normalized: string
          alias_text: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          alias_normalized: string
          alias_text: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          alias_normalized?: string
          alias_text?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_aliases_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          group_name: Database["public"]["Enums"]["tag_group"]
          id: string
          is_active: boolean
          is_public: boolean
          key: string
          label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_name: Database["public"]["Enums"]["tag_group"]
          id?: string
          is_active?: boolean
          is_public?: boolean
          key: string
          label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_name?: Database["public"]["Enums"]["tag_group"]
          id?: string
          is_active?: boolean
          is_public?: boolean
          key?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
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
      vehicle_configurations: {
        Row: {
          admin_notes: string | null
          archived: boolean
          body_type: string | null
          chassis_code: string | null
          created_at: string
          created_by: string | null
          drivetrain: string | null
          engine_capacity_cc: number | null
          engine_code: string | null
          engine_name: string | null
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          id: string
          market: Database["public"]["Enums"]["market_type"]
          model_id: string
          pk_year_from: number | null
          pk_year_to: number | null
          production_year_from: number | null
          production_year_to: number | null
          source_notes: string | null
          source_type: Database["public"]["Enums"]["spec_source_type"] | null
          source_url: string | null
          transmission: string | null
          trim_name: string | null
          updated_at: string
          updated_by: string | null
          verification_status: Database["public"]["Enums"]["spec_verification_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          archived?: boolean
          body_type?: string | null
          chassis_code?: string | null
          created_at?: string
          created_by?: string | null
          drivetrain?: string | null
          engine_capacity_cc?: number | null
          engine_code?: string | null
          engine_name?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          market?: Database["public"]["Enums"]["market_type"]
          model_id: string
          pk_year_from?: number | null
          pk_year_to?: number | null
          production_year_from?: number | null
          production_year_to?: number | null
          source_notes?: string | null
          source_type?: Database["public"]["Enums"]["spec_source_type"] | null
          source_url?: string | null
          transmission?: string | null
          trim_name?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_status?: Database["public"]["Enums"]["spec_verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          archived?: boolean
          body_type?: string | null
          chassis_code?: string | null
          created_at?: string
          created_by?: string | null
          drivetrain?: string | null
          engine_capacity_cc?: number | null
          engine_code?: string | null
          engine_name?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          market?: Database["public"]["Enums"]["market_type"]
          model_id?: string
          pk_year_from?: number | null
          pk_year_to?: number | null
          production_year_from?: number | null
          production_year_to?: number | null
          source_notes?: string | null
          source_type?: Database["public"]["Enums"]["spec_source_type"] | null
          source_url?: string | null
          transmission?: string | null
          trim_name?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_status?: Database["public"]["Enums"]["spec_verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_configurations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_fitments: {
        Row: {
          approved: boolean
          created_at: string
          created_by: string | null
          engine: string | null
          id: string
          make_id: string
          market: string
          model_id: string
          notes: string | null
          product_id: string | null
          source: Database["public"]["Enums"]["vehicle_fitment_source"]
          status: Database["public"]["Enums"]["vehicle_fitment_status"]
          trim: string | null
          updated_at: string
          updated_by: string | null
          variant_id: string | null
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          approved?: boolean
          created_at?: string
          created_by?: string | null
          engine?: string | null
          id?: string
          make_id: string
          market?: string
          model_id: string
          notes?: string | null
          product_id?: string | null
          source?: Database["public"]["Enums"]["vehicle_fitment_source"]
          status?: Database["public"]["Enums"]["vehicle_fitment_status"]
          trim?: string | null
          updated_at?: string
          updated_by?: string | null
          variant_id?: string | null
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          approved?: boolean
          created_at?: string
          created_by?: string | null
          engine?: string | null
          id?: string
          make_id?: string
          market?: string
          model_id?: string
          notes?: string | null
          product_id?: string | null
          source?: Database["public"]["Enums"]["vehicle_fitment_source"]
          status?: Database["public"]["Enums"]["vehicle_fitment_status"]
          trim?: string | null
          updated_at?: string
          updated_by?: string | null
          variant_id?: string | null
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_fitments_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "vehicle_makes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_fitments_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_fitments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_fitments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_lubricant_matches: {
        Row: {
          admin_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          match_quality: string
          oil_spec_id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          match_quality?: string
          oil_spec_id: string
          product_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          match_quality?: string
          oil_spec_id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_lubricant_matches_oil_spec_id_fkey"
            columns: ["oil_spec_id"]
            isOneToOne: false
            referencedRelation: "vehicle_oem_oil_specs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_lubricant_matches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      vehicle_oem_oil_specs: {
        Row: {
          acea_standard: string | null
          admin_notes: string | null
          api_standard: string | null
          archived: boolean
          capacity_with_filter_l: number | null
          capacity_without_filter_l: number | null
          change_interval_km: number | null
          change_interval_months: number | null
          configuration_id: string
          created_at: string
          created_by: string | null
          id: string
          ilsac_standard: string | null
          is_primary: boolean
          jaso_standard: string | null
          oem_approvals: string[] | null
          sae_grade: string
          source_notes: string | null
          source_type: Database["public"]["Enums"]["spec_source_type"] | null
          source_url: string | null
          updated_at: string
          updated_by: string | null
          verification_status: Database["public"]["Enums"]["spec_verification_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          acea_standard?: string | null
          admin_notes?: string | null
          api_standard?: string | null
          archived?: boolean
          capacity_with_filter_l?: number | null
          capacity_without_filter_l?: number | null
          change_interval_km?: number | null
          change_interval_months?: number | null
          configuration_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          ilsac_standard?: string | null
          is_primary?: boolean
          jaso_standard?: string | null
          oem_approvals?: string[] | null
          sae_grade: string
          source_notes?: string | null
          source_type?: Database["public"]["Enums"]["spec_source_type"] | null
          source_url?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_status?: Database["public"]["Enums"]["spec_verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          acea_standard?: string | null
          admin_notes?: string | null
          api_standard?: string | null
          archived?: boolean
          capacity_with_filter_l?: number | null
          capacity_without_filter_l?: number | null
          change_interval_km?: number | null
          change_interval_months?: number | null
          configuration_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          ilsac_standard?: string | null
          is_primary?: boolean
          jaso_standard?: string | null
          oem_approvals?: string[] | null
          sae_grade?: string
          source_notes?: string | null
          source_type?: Database["public"]["Enums"]["spec_source_type"] | null
          source_url?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_status?: Database["public"]["Enums"]["spec_verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_oem_oil_specs_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "vehicle_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_oem_tyre_specs: {
        Row: {
          admin_notes: string | null
          archived: boolean
          configuration_id: string
          created_at: string
          created_by: string | null
          front_load_index: number | null
          front_profile: number
          front_rim: number
          front_size_label: string | null
          front_speed_rating: string | null
          front_width: number
          id: string
          is_primary: boolean
          layout: Database["public"]["Enums"]["tyre_layout_type"]
          rear_load_index: number | null
          rear_profile: number | null
          rear_rim: number | null
          rear_size_label: string | null
          rear_speed_rating: string | null
          rear_width: number | null
          source_notes: string | null
          source_type: Database["public"]["Enums"]["spec_source_type"] | null
          source_url: string | null
          updated_at: string
          updated_by: string | null
          verification_status: Database["public"]["Enums"]["spec_verification_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          archived?: boolean
          configuration_id: string
          created_at?: string
          created_by?: string | null
          front_load_index?: number | null
          front_profile: number
          front_rim: number
          front_size_label?: string | null
          front_speed_rating?: string | null
          front_width: number
          id?: string
          is_primary?: boolean
          layout?: Database["public"]["Enums"]["tyre_layout_type"]
          rear_load_index?: number | null
          rear_profile?: number | null
          rear_rim?: number | null
          rear_size_label?: string | null
          rear_speed_rating?: string | null
          rear_width?: number | null
          source_notes?: string | null
          source_type?: Database["public"]["Enums"]["spec_source_type"] | null
          source_url?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_status?: Database["public"]["Enums"]["spec_verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          archived?: boolean
          configuration_id?: string
          created_at?: string
          created_by?: string | null
          front_load_index?: number | null
          front_profile?: number
          front_rim?: number
          front_size_label?: string | null
          front_speed_rating?: string | null
          front_width?: number
          id?: string
          is_primary?: boolean
          layout?: Database["public"]["Enums"]["tyre_layout_type"]
          rear_load_index?: number | null
          rear_profile?: number | null
          rear_rim?: number | null
          rear_size_label?: string | null
          rear_speed_rating?: string | null
          rear_width?: number | null
          source_notes?: string | null
          source_type?: Database["public"]["Enums"]["spec_source_type"] | null
          source_url?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_status?: Database["public"]["Enums"]["spec_verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_oem_tyre_specs_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "vehicle_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_recommendations: {
        Row: {
          brand_id: string
          category: Database["public"]["Enums"]["product_category"]
          configuration_id: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          label: string | null
          make_id: string
          model_id: string
          notes: string | null
          product_family_id: string
          product_type_id: string | null
          rec_group: Database["public"]["Enums"]["recommendation_group"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_id: string
          category: Database["public"]["Enums"]["product_category"]
          configuration_id?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string | null
          make_id: string
          model_id: string
          notes?: string | null
          product_family_id: string
          product_type_id?: string | null
          rec_group?: Database["public"]["Enums"]["recommendation_group"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_id?: string
          category?: Database["public"]["Enums"]["product_category"]
          configuration_id?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string | null
          make_id?: string
          model_id?: string
          notes?: string | null
          product_family_id?: string
          product_type_id?: string | null
          rec_group?: Database["public"]["Enums"]["recommendation_group"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_recommendations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_recommendations_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "vehicle_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_recommendations_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "vehicle_makes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_recommendations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_recommendations_product_family_id_fkey"
            columns: ["product_family_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_recommendations_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
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
      videos: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          provider: string
          published: boolean
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_ref: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          provider?: string
          published?: boolean
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_ref: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          provider?: string
          published?: boolean
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_ref?: string
        }
        Relationships: []
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
      apply_catalogue_import_batch: {
        Args: { _batch_id: string }
        Returns: Json
      }
      apply_vehicle_import_batch: { Args: { _batch_id: string }; Returns: Json }
      effective_variant_tag_ids: {
        Args: { _variant_id: string }
        Returns: {
          tag_id: string
        }[]
      }
      get_family_completeness: { Args: { _family_id: string }; Returns: Json }
      get_public_product_family: { Args: { _slug: string }; Returns: Json }
      get_public_tyre_profiles: {
        Args: { _width: number }
        Returns: {
          profile: number
        }[]
      }
      get_public_tyre_rims: {
        Args: { _profile: number; _width: number }
        Returns: {
          rim: number
        }[]
      }
      get_public_tyre_widths: {
        Args: never
        Returns: {
          width: number
        }[]
      }
      get_public_vehicle_configurations: {
        Args: { _model_id: string; _year?: number }
        Returns: {
          body_type: string
          drivetrain: string
          engine_capacity_cc: number
          engine_name: string
          fuel_type: string
          id: string
          market: string
          pk_year_from: number
          pk_year_to: number
          production_year_from: number
          production_year_to: number
          transmission: string
          trim_name: string
          verification_status: string
        }[]
      }
      get_public_vehicle_makes: {
        Args: never
        Returns: {
          display_order: number
          id: string
          logo_url: string
          name: string
          slug: string
        }[]
      }
      get_public_vehicle_models: {
        Args: { _make_id: string }
        Returns: {
          body_type: string
          id: string
          is_popular: boolean
          name: string
          slug: string
        }[]
      }
      get_public_vehicle_oem_tyre_sizes: {
        Args: { _configuration_id: string }
        Returns: {
          front_load_index: number
          front_profile: number
          front_rim: number
          front_speed_rating: string
          front_width: number
          id: string
          is_primary: boolean
          layout: string
          rear_load_index: number
          rear_profile: number
          rear_rim: number
          rear_speed_rating: string
          rear_width: number
          verification_status: string
        }[]
      }
      get_public_vehicle_recommendations: {
        Args: { _configuration_id?: string; _model_id: string }
        Returns: {
          active_variant_count: number
          brand_id: string
          brand_logo_url: string
          brand_name: string
          category: string
          display_order: number
          family_availability: string
          family_availability_verified_at: string
          family_id: string
          family_images: Json
          family_name: string
          family_previous_price: number
          family_price: number
          family_price_mode: string
          family_short_desc: string
          family_slug: string
          id: string
          label: string
          product_type_id: string
          product_type_name: string
          rec_group: string
        }[]
      }
      get_public_vehicle_years: {
        Args: { _model_id: string }
        Returns: {
          id: string
          variant_note: string
          year_from: number
          year_to: number
        }[]
      }
      get_vehicle_configurations: {
        Args: { _model_id: string }
        Returns: {
          body_type: string
          chassis_code: string
          drivetrain: string
          engine_capacity_cc: number
          engine_code: string
          engine_name: string
          fuel_type: string
          id: string
          market: string
          pk_year_from: number
          pk_year_to: number
          production_year_from: number
          production_year_to: number
          transmission: string
          trim_name: string
          verification_status: string
        }[]
      }
      get_vehicle_oem_oil_specs: {
        Args: { _configuration_id: string }
        Returns: {
          acea_standard: string
          api_standard: string
          capacity_with_filter_l: number
          capacity_without_filter_l: number
          change_interval_km: number
          change_interval_months: number
          id: string
          ilsac_standard: string
          is_primary: boolean
          jaso_standard: string
          oem_approvals: string[]
          sae_grade: string
          verification_status: string
        }[]
      }
      get_vehicle_oem_tyre_specs: {
        Args: { _configuration_id: string }
        Returns: {
          front_load_index: number
          front_profile: number
          front_rim: number
          front_size_label: string
          front_speed_rating: string
          front_width: number
          id: string
          is_primary: boolean
          layout: string
          rear_load_index: number
          rear_profile: number
          rear_rim: number
          rear_size_label: string
          rear_speed_rating: string
          rear_width: number
          verification_status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      list_family_completeness_flags: {
        Args: never
        Returns: {
          family_id: string
          missing_image: boolean
          missing_price: boolean
          missing_specs: boolean
          missing_variant: boolean
          stale_availability: boolean
        }[]
      }
      merge_brand: {
        Args: { _from: string; _notes?: string; _to: string }
        Returns: Json
      }
      normalize_tag_key: { Args: { _raw: string }; Returns: string }
      purge_import_payloads: { Args: never; Returns: number }
      rank_products_for_vehicle: {
        Args: { _engine?: string; _model_id: string; _year?: number }
        Returns: {
          best_rank: number
          matched_fitment_id: string
          needs_year_confirmation: boolean
          product_id: string
          verified: boolean
        }[]
      }
      resolve_tag_by_alias: { Args: { _raw: string }; Returns: string }
      rollback_catalogue_import_batch: {
        Args: { _batch_id: string }
        Returns: Json
      }
      rollback_vehicle_import_batch: {
        Args: { _batch_id: string }
        Returns: Json
      }
      search_public_catalogue: {
        Args: {
          _brand_id?: string
          _category?: string
          _limit?: number
          _offset?: number
          _product_type_id?: string
          _q: string
        }
        Returns: {
          active_variant_count: number
          availability: string
          availability_verified_at: string
          brand_id: string
          brand_logo_url: string
          brand_name: string
          category: string
          id: string
          images: Json
          name: string
          previous_price: number
          price: number
          price_mode: string
          product_type_id: string
          product_type_name: string
          short_desc: string
          slug: string
          total_count: number
        }[]
      }
      search_public_tyres: {
        Args: {
          _availability?: string
          _brand_id?: string
          _page?: number
          _page_size?: number
          _profile?: number
          _rim?: number
          _run_flat?: boolean
          _sort?: string
          _tyre_type?: string
          _width?: number
        }
        Returns: {
          availability: string
          brand_id: string
          brand_logo_url: string
          brand_name: string
          images: Json
          load_index: string
          model_id: string
          model_name: string
          model_slug: string
          normalized_size: string
          previous_price: number
          price: number
          price_mode: string
          profile: number
          rim: number
          run_flat: boolean
          short_desc: string
          speed_rating: string
          total_count: number
          tubeless: boolean
          tyre_type: string
          variant_id: string
          width: number
          xl_reinforced: boolean
        }[]
      }
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
      fuel_type: "petrol" | "diesel" | "hybrid" | "phev" | "ev" | "cng" | "lpg"
      homepage_catalogue_section_kind:
        | "heading"
        | "product_grid"
        | "brand_grid"
        | "category_cards"
        | "cta"
      import_batch_status:
        | "draft"
        | "validating"
        | "previewed"
        | "committing"
        | "succeeded"
        | "failed"
        | "cancelled"
        | "rollback_in_progress"
        | "rolled_back"
        | "partially_rolled_back"
        | "rollback_failed"
      import_conflict_strategy: "skip" | "update" | "error"
      import_kind: "vehicle_spec" | "catalogue"
      import_row_action: "insert" | "update" | "skip" | "error"
      import_row_status:
        | "pending"
        | "ok"
        | "skipped"
        | "error"
        | "rolled_back"
        | "rollback_skipped"
        | "rollback_failed"
        | "rollback_skipped_modified"
      lead_contact_method: "whatsapp" | "call" | "either"
      lead_status: "new" | "contacted" | "qualified" | "closed" | "lost"
      market_type: "PK" | "GLOBAL" | "JP_IMPORT" | "OTHER_IMPORT"
      packaging_unit_kind: "volume" | "mass" | "count"
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
      recommendation_group: "best_match" | "premium" | "value" | "alternative"
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
      spec_source_type:
        | "manufacturer"
        | "owner_manual"
        | "official_dealer"
        | "trusted_publication"
        | "community"
        | "other"
      spec_verification_status:
        | "needs_verification"
        | "partial"
        | "verified"
        | "disputed"
      tag_group:
        | "use_case"
        | "customer_segment"
        | "vehicle_class"
        | "benefit"
        | "product_tier"
        | "related_service"
      tag_source: "seed" | "admin" | "import"
      tube_type: "tubeless" | "tube_type" | "unspecified"
      tyre_layout_type: "same" | "staggered"
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
      vehicle_fitment_source: "admin" | "import"
      vehicle_fitment_status:
        | "verified"
        | "commonly_used"
        | "needs_confirmation"
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
      fuel_type: ["petrol", "diesel", "hybrid", "phev", "ev", "cng", "lpg"],
      homepage_catalogue_section_kind: [
        "heading",
        "product_grid",
        "brand_grid",
        "category_cards",
        "cta",
      ],
      import_batch_status: [
        "draft",
        "validating",
        "previewed",
        "committing",
        "succeeded",
        "failed",
        "cancelled",
        "rollback_in_progress",
        "rolled_back",
        "partially_rolled_back",
        "rollback_failed",
      ],
      import_conflict_strategy: ["skip", "update", "error"],
      import_kind: ["vehicle_spec", "catalogue"],
      import_row_action: ["insert", "update", "skip", "error"],
      import_row_status: [
        "pending",
        "ok",
        "skipped",
        "error",
        "rolled_back",
        "rollback_skipped",
        "rollback_failed",
        "rollback_skipped_modified",
      ],
      lead_contact_method: ["whatsapp", "call", "either"],
      lead_status: ["new", "contacted", "qualified", "closed", "lost"],
      market_type: ["PK", "GLOBAL", "JP_IMPORT", "OTHER_IMPORT"],
      packaging_unit_kind: ["volume", "mass", "count"],
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
      recommendation_group: ["best_match", "premium", "value", "alternative"],
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
      spec_source_type: [
        "manufacturer",
        "owner_manual",
        "official_dealer",
        "trusted_publication",
        "community",
        "other",
      ],
      spec_verification_status: [
        "needs_verification",
        "partial",
        "verified",
        "disputed",
      ],
      tag_group: [
        "use_case",
        "customer_segment",
        "vehicle_class",
        "benefit",
        "product_tier",
        "related_service",
      ],
      tag_source: ["seed", "admin", "import"],
      tube_type: ["tubeless", "tube_type", "unspecified"],
      tyre_layout_type: ["same", "staggered"],
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
      vehicle_fitment_source: ["admin", "import"],
      vehicle_fitment_status: [
        "verified",
        "commonly_used",
        "needs_confirmation",
      ],
    },
  },
} as const
