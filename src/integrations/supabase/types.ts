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
      batches: {
        Row: {
          created_at: string
          details: Json
          id: string
          item_count: number
          name: string
          target: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          item_count?: number
          name: string
          target?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          item_count?: number
          name?: string
          target?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          external_id: string | null
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      instagram_accounts: {
        Row: {
          created_at: string
          id: string
          ig_user_id: string
          page_id: string | null
          page_name: string | null
          profile_picture_url: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ig_user_id: string
          page_id?: string | null
          page_name?: string | null
          profile_picture_url?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ig_user_id?: string
          page_id?: string | null
          page_name?: string | null
          profile_picture_url?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      instagram_post_destinations: {
        Row: {
          account_id: string
          attempts: number
          container_id: string | null
          created_at: string
          error_code: string | null
          id: string
          media_id: string | null
          next_attempt_at: string
          operation_started_at: string | null
          phase: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          attempts?: number
          container_id?: string | null
          created_at?: string
          error_code?: string | null
          id?: string
          media_id?: string | null
          next_attempt_at?: string
          operation_started_at?: string | null
          phase?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          attempts?: number
          container_id?: string | null
          created_at?: string
          error_code?: string | null
          id?: string
          media_id?: string | null
          next_attempt_at?: string
          operation_started_at?: string | null
          phase?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_post_destinations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_post_destinations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_tokens: {
        Row: {
          access_token: string
          account_id: string
          data_access_expires_at: string | null
          expires_at: string | null
          revoked_at: string | null
          token_kind: string
          updated_at: string
        }
        Insert: {
          access_token: string
          account_id: string
          data_access_expires_at?: string | null
          expires_at?: string | null
          revoked_at?: string | null
          token_kind?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          account_id?: string
          data_access_expires_at?: string | null
          expires_at?: string | null
          revoked_at?: string | null
          token_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_oauth_states: {
        Row: {
          binding_hash: string | null
          created_at: string
          expires_at: string
          id: string
          redirect_uri: string | null
          return_to: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          binding_hash?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri?: string | null
          return_to?: string | null
          session_id?: string | null
          user_id?: string
        }
        Update: {
          binding_hash?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri?: string | null
          return_to?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          account_username: string | null
          caption: string | null
          created_at: string
          creation_id: string | null
          details: Json
          error_message: string | null
          format: string
          id: string
          instagram_account_id: string | null
          instagram_media_id: string | null
          lease_owner: string | null
          lease_until: string | null
          platform: string
          published_at: string | null
          scheduled_for: string | null
          status: string
          updated_at: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          account_username?: string | null
          caption?: string | null
          created_at?: string
          creation_id?: string | null
          details?: Json
          error_message?: string | null
          format?: string
          id?: string
          instagram_account_id?: string | null
          instagram_media_id?: string | null
          lease_owner?: string | null
          lease_until?: string | null
          platform?: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_id?: string | null
        }
        Update: {
          account_username?: string | null
          caption?: string | null
          created_at?: string
          creation_id?: string | null
          details?: Json
          error_message?: string | null
          format?: string
          id?: string
          instagram_account_id?: string | null
          instagram_media_id?: string | null
          lease_owner?: string | null
          lease_until?: string | null
          platform?: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_billing: {
        Row: {
          created_at: string
          credits_balance: number
          customer_email: string | null
          plan_name: string | null
          plan_renews_at: string | null
          plan_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_balance?: number
          customer_email?: string | null
          plan_name?: string | null
          plan_renews_at?: string | null
          plan_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_balance?: number
          customer_email?: string | null
          plan_name?: string | null
          plan_renews_at?: string | null
          plan_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          batch_id: string | null
          created_at: string
          duration: number | null
          id: string
          original_name: string | null
          settings: Json
          size_bytes: number | null
          status: string
          storage_path: string | null
          thumbnail_path: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          original_name?: string | null
          settings?: Json
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          thumbnail_path?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          original_name?: string | null
          settings?: Json
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          thumbnail_path?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_instagram_destination: {
        Args: {
          _destination: string
          _expected: string
          _patch: Json
          _post: string
          _worker: string
        }
        Returns: boolean
      }
      claim_instagram_post: {
        Args: { _worker: string }
        Returns: {
          account_username: string | null
          caption: string | null
          created_at: string
          creation_id: string | null
          details: Json
          error_message: string | null
          format: string
          id: string
          instagram_account_id: string | null
          instagram_media_id: string | null
          lease_owner: string | null
          lease_until: string | null
          platform: string
          published_at: string | null
          scheduled_for: string | null
          status: string
          updated_at: string
          user_id: string
          video_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "scheduled_posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      consume_credits: {
        Args: { _amount: number; _description: string }
        Returns: number
      }
      consume_meta_state: {
        Args: { _binding: string; _id: string; _redirect: string }
        Returns: {
          binding_hash: string | null
          created_at: string
          expires_at: string
          id: string
          redirect_uri: string | null
          return_to: string | null
          session_id: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "meta_oauth_states"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      release_instagram_post: {
        Args: { _post: string; _worker: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
