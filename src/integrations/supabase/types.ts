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
      brands: {
        Row: {
          archived: boolean
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
          short_desc: string | null
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          vehicle_categories: string[]
          warranty: string | null
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
          short_desc?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          vehicle_categories?: string[]
          warranty?: string | null
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
          short_desc?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          vehicle_categories?: string[]
          warranty?: string | null
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
      tyre_variants: {
        Row: {
          archived: boolean
          availability: Database["public"]["Enums"]["availability_status"]
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
          tubeless: boolean
          updated_at: string
          warranty: string | null
          width: number | null
          xl_reinforced: boolean
        }
        Insert: {
          archived?: boolean
          availability?: Database["public"]["Enums"]["availability_status"]
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
          tubeless?: boolean
          updated_at?: string
          warranty?: string | null
          width?: number | null
          xl_reinforced?: boolean
        }
        Update: {
          archived?: boolean
          availability?: Database["public"]["Enums"]["availability_status"]
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
    }
    Views: {
      [_ in never]: never
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
      price_mode:
        | "fixed"
        | "confirm_today"
        | "on_request"
        | "starting_from"
        | "hidden"
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
      price_mode: [
        "fixed",
        "confirm_today",
        "on_request",
        "starting_from",
        "hidden",
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
    },
  },
} as const
