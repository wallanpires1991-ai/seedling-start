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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          establishment_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          establishment_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          establishment_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          address: string | null
          ai_name: string
          ai_personality: string
          automation_active: boolean
          cnpj: string | null
          created_at: string
          created_by: string
          delivery_fee: number
          id: string
          legal_name: string | null
          min_order: number
          name: string
          phone: string | null
          prep_minutes: number
          welcome_message: string
          whatsapp_instance_id: string | null
          whatsapp_phone: string | null
          whatsapp_status: string
        }
        Insert: {
          address?: string | null
          ai_name?: string
          ai_personality?: string
          automation_active?: boolean
          cnpj?: string | null
          created_at?: string
          created_by: string
          delivery_fee?: number
          id?: string
          legal_name?: string | null
          min_order?: number
          name: string
          phone?: string | null
          prep_minutes?: number
          welcome_message?: string
          whatsapp_instance_id?: string | null
          whatsapp_phone?: string | null
          whatsapp_status?: string
        }
        Update: {
          address?: string | null
          ai_name?: string
          ai_personality?: string
          automation_active?: boolean
          cnpj?: string | null
          created_at?: string
          created_by?: string
          delivery_fee?: number
          id?: string
          legal_name?: string | null
          min_order?: number
          name?: string
          phone?: string | null
          prep_minutes?: number
          welcome_message?: string
          whatsapp_instance_id?: string | null
          whatsapp_phone?: string | null
          whatsapp_status?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      modifiers: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          name: string
          price: number
          product_id: string
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          name: string
          price?: number
          product_id: string
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          name?: string
          price?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modifiers_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modifiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          establishment_id: string
          id: string
          line_total: number
          modifiers: Json
          name: string
          notes: string | null
          order_id: string
          product_id: string | null
          qty: number
          unit_price: number
        }
        Insert: {
          establishment_id: string
          id?: string
          line_total: number
          modifiers?: Json
          name: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          qty: number
          unit_price: number
        }
        Update: {
          establishment_id?: string
          id?: string
          line_total?: number
          modifiers?: Json
          name?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          qty?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          code: number
          created_at: string
          customer_name: string
          customer_phone: string | null
          delivery_fee: number
          establishment_id: string
          fulfillment: string
          id: string
          idempotency_key: string | null
          is_test: boolean
          notes: string | null
          payment_method: string
          payment_status: string
          request_key: string | null
          source: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: number
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          delivery_fee?: number
          establishment_id: string
          fulfillment?: string
          id?: string
          idempotency_key?: string | null
          is_test?: boolean
          notes?: string | null
          payment_method?: string
          payment_status?: string
          request_key?: string | null
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: number
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          delivery_fee?: number
          establishment_id?: string
          fulfillment?: string
          id?: string
          idempotency_key?: string | null
          is_test?: boolean
          notes?: string | null
          payment_method?: string
          payment_status?: string
          request_key?: string | null
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allergens: string
          available: boolean
          category_id: string | null
          created_at: string
          description: string
          establishment_id: string
          id: string
          ingredients: string
          is_demo: boolean
          name: string
          prep_minutes: number
          price: number
        }
        Insert: {
          allergens?: string
          available?: boolean
          category_id?: string | null
          created_at?: string
          description?: string
          establishment_id: string
          id?: string
          ingredients?: string
          is_demo?: boolean
          name: string
          prep_minutes?: number
          price: number
        }
        Update: {
          allergens?: string
          available?: boolean
          category_id?: string | null
          created_at?: string
          description?: string
          establishment_id?: string
          id?: string
          ingredients?: string
          is_demo?: boolean
          name?: string
          prep_minutes?: number
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          customer_name: string | null
          establishment_id: string
          handoff: boolean
          id: string
          last_order_id: string | null
          messages: Json
          phone: string
          session: number
          updated_at: string
        }
        Insert: {
          customer_name?: string | null
          establishment_id: string
          handoff?: boolean
          id?: string
          last_order_id?: string | null
          messages?: Json
          phone: string
          session?: number
          updated_at?: string
        }
        Update: {
          customer_name?: string | null
          establishment_id?: string
          handoff?: boolean
          id?: string
          last_order_id?: string | null
          messages?: Json
          phone?: string
          session?: number
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_webhook_events: {
        Row: {
          attempts: number
          checkpoint: Json
          claim_token: string | null
          establishment_id: string | null
          id: string
          lease_until: string | null
          message_id: string
          next_attempt_at: string
          payload: Json
          phone: string | null
          processed_at: string | null
          processing_error: string | null
          processing_state: string
          provider_message_id: string | null
          received_at: string
        }
        Insert: {
          attempts?: number
          checkpoint?: Json
          claim_token?: string | null
          establishment_id?: string | null
          id?: string
          lease_until?: string | null
          message_id: string
          next_attempt_at?: string
          payload: Json
          phone?: string | null
          processed_at?: string | null
          processing_error?: string | null
          processing_state?: string
          provider_message_id?: string | null
          received_at?: string
        }
        Update: {
          attempts?: number
          checkpoint?: Json
          claim_token?: string | null
          establishment_id?: string | null
          id?: string
          lease_until?: string | null
          message_id?: string
          next_attempt_at?: string
          payload?: Json
          phone?: string | null
          processed_at?: string | null
          processing_error?: string | null
          processing_state?: string
          provider_message_id?: string | null
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_zapi_events: {
        Args: { _limit?: number }
        Returns: {
          attempts: number
          checkpoint: Json
          claim_token: string | null
          establishment_id: string | null
          id: string
          lease_until: string | null
          message_id: string
          next_attempt_at: string
          payload: Json
          phone: string | null
          processed_at: string | null
          processing_error: string | null
          processing_state: string
          provider_message_id: string | null
          received_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "whatsapp_webhook_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_zapi_event: {
        Args: {
          _conversation: string
          _event: string
          _handoff: boolean
          _messages: Json
          _name: string
          _order: string
          _session: number
        }
        Returns: undefined
      }
      create_establishment: { Args: { _name: string }; Returns: string }
      finish_zapi_event: {
        Args: {
          _claim: string
          _conversation: string
          _event: string
          _handoff: boolean
          _messages: Json
          _name: string
          _order: string
          _session: number
        }
        Returns: undefined
      }
      has_est_role: {
        Args: {
          _est: string
          _roles: Database["public"]["Enums"]["member_role"][]
          _user: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: { Args: { _est: string; _user: string }; Returns: boolean }
      place_order: {
        Args: {
          _address: string
          _customer_name: string
          _customer_phone: string
          _est: string
          _fulfillment: string
          _idempotency_key: string
          _is_test: boolean
          _items: Json
          _notes?: string
          _payment_method: string
          _source?: string
        }
        Returns: string
      }
      save_zapi_checkpoint: {
        Args: { _checkpoint: Json; _claim: string; _event: string }
        Returns: undefined
      }
      transition_order: {
        Args: {
          _id: string
          _status: Database["public"]["Enums"]["order_status"]
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "superadmin"
      member_role: "owner" | "attendant" | "kitchen" | "courier"
      order_status:
        | "pending_payment"
        | "new"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["superadmin"],
      member_role: ["owner", "attendant", "kitchen", "courier"],
      order_status: [
        "pending_payment",
        "new",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
