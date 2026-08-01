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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assembly_attendance: {
        Row: {
          assembly_id: string
          attended: boolean | null
          attendee_type: string
          created_at: string | null
          full_name: string
          id: string
          position: string | null
          voter_pin: string | null
        }
        Insert: {
          assembly_id: string
          attended?: boolean | null
          attendee_type: string
          created_at?: string | null
          full_name: string
          id?: string
          position?: string | null
          voter_pin?: string | null
        }
        Update: {
          assembly_id?: string
          attended?: boolean | null
          attendee_type?: string
          created_at?: string | null
          full_name?: string
          id?: string
          position?: string | null
          voter_pin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assembly_attendance_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assembly_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_registration_links: {
        Row: {
          assembly_id: string
          created_at: string
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          assembly_id: string
          created_at?: string
          expires_at: string
          id?: string
          token?: string
        }
        Update: {
          assembly_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembly_registration_links_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assembly_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_sessions: {
        Row: {
          created_at: string | null
          date: string
          end_time: string | null
          id: string
          name: string
          quorum_required: number
          start_time: string | null
          status: string | null
          total_active_members: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          end_time?: string | null
          id?: string
          name: string
          quorum_required?: number
          start_time?: string | null
          status?: string | null
          total_active_members?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string | null
          id?: string
          name?: string
          quorum_required?: number
          start_time?: string | null
          status?: string | null
          total_active_members?: number | null
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          attendee_type: string
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          guest_id: string | null
          id: string
          is_present: boolean | null
          member_id: string | null
          session_id: string
          voter_pin: string | null
        }
        Insert: {
          attendee_type: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          guest_id?: string | null
          id?: string
          is_present?: boolean | null
          member_id?: string | null
          session_id: string
          voter_pin?: string | null
        }
        Update: {
          attendee_type?: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          guest_id?: string | null
          id?: string
          is_present?: boolean | null
          member_id?: string | null
          session_id?: string
          voter_pin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assembly_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string | null
          description: string | null
          election_id: string
          id: string
          image_url: string | null
          name: string
          position: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          election_id: string
          id?: string
          image_url?: string | null
          name: string
          position: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          election_id?: string
          id?: string
          image_url?: string | null
          name?: string
          position?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      elections: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      guests: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          id_number: string | null
          name: string
          organization: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          id_number?: string | null
          name: string
          organization?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          id_number?: string | null
          name?: string
          organization?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          id_number: string | null
          is_active: boolean | null
          name: string
          organization: string | null
          phone: string | null
          position_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          id_number?: string | null
          is_active?: boolean | null
          name: string
          organization?: string | null
          phone?: string | null
          position_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          id_number?: string | null
          is_active?: boolean | null
          name?: string
          organization?: string | null
          phone?: string | null
          position_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      nominations: {
        Row: {
          candidate_name: string
          created_at: string | null
          election_id: string
          id: string
          nominator_pin: string
          position: string
        }
        Insert: {
          candidate_name: string
          created_at?: string | null
          election_id: string
          id?: string
          nominator_pin: string
          position: string
        }
        Update: {
          candidate_name?: string
          created_at?: string | null
          election_id?: string
          id?: string
          nominator_pin?: string
          position?: string
        }
        Relationships: [
          {
            foreignKeyName: "nominations_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nominations_nominator_pin_fkey"
            columns: ["nominator_pin"]
            isOneToOne: false
            referencedRelation: "assembly_attendance"
            referencedColumns: ["voter_pin"]
          },
        ]
      }
      performance_logs: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          rating: string | null
          recorded_at: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          rating?: string | null
          recorded_at?: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          rating?: string | null
          recorded_at?: string
          value?: number
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string | null
          id: string
          name: string
          quorum_weight: number | null
          type: Database["public"]["Enums"]["position_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          quorum_weight?: number | null
          type: Database["public"]["Enums"]["position_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          quorum_weight?: number | null
          type?: Database["public"]["Enums"]["position_type"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          candidate_id: string
          created_at: string | null
          election_id: string
          id: string
          position_voted: string
          voter_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          election_id: string
          id?: string
          position_voted: string
          voter_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          election_id?: string
          id?: string
          position_voted?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_election_results: {
        Args: { p_election_id: string }
        Returns: {
          candidate_id: string
          candidate_name: string
          candidate_position: string
          vote_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin" | "assembly_sergeant" | "secretary"
      position_type:
        | "president"
        | "vice_president"
        | "secretary"
        | "treasurer"
        | "member"
        | "board_member"
        | "ministro_ordenado"
        | "ministro_certificado"
        | "ministro_licenciado"
        | "delegado_pastor"
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
    ? DefaultSchema["CompositeTypes"][CompositeTypeName]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin", "assembly_sergeant", "secretary"],
      position_type: [
        "president",
        "vice_president",
        "secretary",
        "treasurer",
        "member",
        "board_member",
        "ministro_ordenado",
        "ministro_certificado",
        "ministro_licenciado",
        "delegado_pastor",
      ],
    },
  },
} as const
