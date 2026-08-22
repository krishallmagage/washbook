export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          failed_pin_attempts: number
          full_name: string
          id: string
          is_active: boolean
          pin_hash: string | null
          pin_locked_until: string | null
          pin_set_at: string | null
          role: Database["public"]["Enums"]["site_role"]
          site_id: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          failed_pin_attempts?: number
          full_name: string
          id?: string
          is_active?: boolean
          pin_hash?: string | null
          pin_locked_until?: string | null
          pin_set_at?: string | null
          role: Database["public"]["Enums"]["site_role"]
          site_id: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          failed_pin_attempts?: number
          full_name?: string
          id?: string
          is_active?: boolean
          pin_hash?: string | null
          pin_locked_until?: string | null
          pin_set_at?: string | null
          role?: Database["public"]["Enums"]["site_role"]
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          enrolled_at: string
          enrolled_by: string | null
          id: string
          is_active: boolean
          label: string
          last_seen_at: string | null
          short_code: string
          site_id: string
        }
        Insert: {
          enrolled_at?: string
          enrolled_by?: string | null
          id?: string
          is_active?: boolean
          label: string
          last_seen_at?: string | null
          short_code: string
          site_id: string
        }
        Update: {
          enrolled_at?: string
          enrolled_by?: string | null
          id?: string
          is_active?: boolean
          label?: string
          last_seen_at?: string | null
          short_code?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          branch_code: string | null
          created_at: string
          currency: string
          day_cutoff_time: string
          id: string
          name: string
          phone: string | null
          photo_required: boolean
          summary_time: string
          supervisor_can_override: boolean
          threshold_cash_variance_cents: number
          threshold_consumable_variance_pct: number
          threshold_discount_pct: number
          timezone: string
          tin: string | null
          vat_registered: boolean
        }
        Insert: {
          address?: string | null
          branch_code?: string | null
          created_at?: string
          currency?: string
          day_cutoff_time?: string
          id?: string
          name: string
          phone?: string | null
          photo_required?: boolean
          summary_time?: string
          supervisor_can_override?: boolean
          threshold_cash_variance_cents?: number
          threshold_consumable_variance_pct?: number
          threshold_discount_pct?: number
          timezone?: string
          tin?: string | null
          vat_registered?: boolean
        }
        Update: {
          address?: string | null
          branch_code?: string | null
          created_at?: string
          currency?: string
          day_cutoff_time?: string
          id?: string
          name?: string
          phone?: string | null
          photo_required?: boolean
          summary_time?: string
          supervisor_can_override?: boolean
          threshold_cash_variance_cents?: number
          threshold_consumable_variance_pct?: number
          threshold_discount_pct?: number
          timezone?: string
          tin?: string | null
          vat_registered?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_jwt: { Args: never; Returns: Json }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["site_role"]
      }
      auth_site_id: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      fn_device_users: {
        Args: { p_device_id: string }
        Returns: {
          full_name: string
          id: string
          role: Database["public"]["Enums"]["site_role"]
        }[]
      }
      fn_has_permission: {
        Args: { action: Database["public"]["Enums"]["permission_action"] }
        Returns: boolean
      }
      fn_set_pin: {
        Args: { p_pin: string; p_user_id: string }
        Returns: undefined
      }
      fn_verify_pin: {
        Args: { p_device_id: string; p_pin: string; p_user_id: string }
        Returns: Database["public"]["CompositeTypes"]["pin_verify_result"]
        SetofOptions: {
          from: "*"
          to: "pin_verify_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      permission_action:
        | "create_ticket"
        | "override_price"
        | "assign_staff"
        | "change_own_job_state"
        | "bill_ticket"
        | "void_ticket"
        | "record_petty_cash"
        | "close_day"
        | "edit_price_list"
        | "manage_users"
        | "set_thresholds"
        | "view_reports"
        | "view_own_commission"
        | "view_audit_log"
        | "enrol_device"
      site_role:
        | "owner"
        | "manager"
        | "cashier"
        | "supervisor"
        | "staff"
        | "readonly"
    }
    CompositeTypes: {
      pin_verify_result: {
        ok: boolean | null
        user_id: string | null
        site_id: string | null
        site_role: Database["public"]["Enums"]["site_role"] | null
        full_name: string | null
        locked_until: string | null
        failure_reason: string | null
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      permission_action: [
        "create_ticket",
        "override_price",
        "assign_staff",
        "change_own_job_state",
        "bill_ticket",
        "void_ticket",
        "record_petty_cash",
        "close_day",
        "edit_price_list",
        "manage_users",
        "set_thresholds",
        "view_reports",
        "view_own_commission",
        "view_audit_log",
        "enrol_device",
      ],
      site_role: [
        "owner",
        "manager",
        "cashier",
        "supervisor",
        "staff",
        "readonly",
      ],
    },
  },
} as const

