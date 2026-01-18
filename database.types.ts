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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  branding: {
    Tables: {
      asset_categories: {
        Row: {
          active: boolean
          asset_kind: string
          created_at: string
          description: string | null
          id: string
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          asset_kind?: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          asset_kind?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      asset_slots: {
        Row: {
          active: boolean
          allowed_mime_types: string[]
          category_id: string
          created_at: string
          entity_type: string
          help_text: string | null
          id: string
          is_required: boolean
          label_override: string | null
          max_assets: number
          sort_order: number
          subcategory_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          allowed_mime_types?: string[]
          category_id: string
          created_at?: string
          entity_type: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          label_override?: string | null
          max_assets?: number
          sort_order?: number
          subcategory_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          allowed_mime_types?: string[]
          category_id?: string
          created_at?: string
          entity_type?: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          label_override?: string | null
          max_assets?: number
          sort_order?: number
          subcategory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_slots_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_slots_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "asset_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_subcategories: {
        Row: {
          active: boolean
          category_id: string
          created_at: string
          description: string | null
          id: string
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          bucket: string
          category_id: string
          created_at: string
          description: string | null
          entity_id: string
          height_px: number | null
          id: string
          is_retired: boolean
          mime_type: string | null
          name: string
          path: string
          size_bytes: number | null
          subcategory_id: string | null
          updated_at: string
          width_px: number | null
        }
        Insert: {
          bucket?: string
          category_id: string
          created_at?: string
          description?: string | null
          entity_id: string
          height_px?: number | null
          id?: string
          is_retired?: boolean
          mime_type?: string | null
          name: string
          path: string
          size_bytes?: number | null
          subcategory_id?: string | null
          updated_at?: string
          width_px?: number | null
        }
        Update: {
          bucket?: string
          category_id?: string
          created_at?: string
          description?: string | null
          entity_id?: string
          height_px?: number | null
          id?: string
          is_retired?: boolean
          mime_type?: string | null
          name?: string
          path?: string
          size_bytes?: number | null
          subcategory_id?: string | null
          updated_at?: string
          width_px?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "asset_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      palette_colors: {
        Row: {
          created_at: string
          hex: string
          id: string
          label: string | null
          palette_id: string
          slot: number
          updated_at: string
          usage_notes: string | null
        }
        Insert: {
          created_at?: string
          hex: string
          id?: string
          label?: string | null
          palette_id: string
          slot: number
          updated_at?: string
          usage_notes?: string | null
        }
        Update: {
          created_at?: string
          hex?: string
          id?: string
          label?: string | null
          palette_id?: string
          slot?: number
          updated_at?: string
          usage_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "palette_colors_palette_fk"
            columns: ["palette_id"]
            isOneToOne: false
            referencedRelation: "palettes"
            referencedColumns: ["id"]
          },
        ]
      }
      palettes: {
        Row: {
          created_at: string | null
          entity_id: string
          id: string
          name: string
          role: Database["branding"]["Enums"]["color_role"]
          updated_at: string | null
          usage_notes: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          id?: string
          name: string
          role: Database["branding"]["Enums"]["color_role"]
          updated_at?: string | null
          usage_notes?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          id?: string
          name?: string
          role?: Database["branding"]["Enums"]["color_role"]
          updated_at?: string | null
          usage_notes?: string | null
        }
        Relationships: []
      }
      patterns: {
        Row: {
          allowed_colors: string[] | null
          created_at: string | null
          entity_id: string
          entity_type: string
          file_png: string | null
          file_svg: string | null
          id: string
          notes: string | null
          pattern_type: Database["branding"]["Enums"]["pattern_type"]
          updated_at: string | null
        }
        Insert: {
          allowed_colors?: string[] | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          file_png?: string | null
          file_svg?: string | null
          id?: string
          notes?: string | null
          pattern_type: Database["branding"]["Enums"]["pattern_type"]
          updated_at?: string | null
        }
        Update: {
          allowed_colors?: string[] | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          file_png?: string | null
          file_svg?: string | null
          id?: string
          notes?: string | null
          pattern_type?: Database["branding"]["Enums"]["pattern_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      typography: {
        Row: {
          availability: string | null
          created_at: string | null
          download_url: string | null
          entity_id: string
          entity_type: string
          font_name: string
          id: string
          role: Database["branding"]["Enums"]["typography_role"] | null
          updated_at: string | null
          usage_rules: string | null
          weights: Json | null
        }
        Insert: {
          availability?: string | null
          created_at?: string | null
          download_url?: string | null
          entity_id: string
          entity_type: string
          font_name: string
          id?: string
          role?: Database["branding"]["Enums"]["typography_role"] | null
          updated_at?: string | null
          usage_rules?: string | null
          weights?: Json | null
        }
        Update: {
          availability?: string | null
          created_at?: string | null
          download_url?: string | null
          entity_id?: string
          entity_type?: string
          font_name?: string
          id?: string
          role?: Database["branding"]["Enums"]["typography_role"] | null
          updated_at?: string | null
          usage_rules?: string | null
          weights?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      color_role: "primary" | "secondary" | "tertiary" | "accent"
      logo_category:
        | "district_primary"
        | "district_secondary"
        | "icon"
        | "school_logo"
        | "community_ed"
        | "athletics_primary"
        | "athletics_icon"
        | "athletics_wordmark"
        | "script_wordmark"
        | "wings_up"
        | "team_logo"
        | "brand_pattern"
        | "retired"
      logo_subcategory:
        | "full_color"
        | "stacked"
        | "horizontal"
        | "one_color_white"
        | "one_color_black"
        | "one_color_red"
        | "inverse"
        | "pattern_small"
        | "pattern_large"
        | "other"
      pattern_type: "triangle_small" | "triangle_large"
      typography_role:
        | "header1"
        | "header2"
        | "subheader"
        | "body"
        | "logo"
        | "display"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  governance: {
    Tables: {
      approvals: {
        Row: {
          approval_method: string
          approved_at: string
          board_member_id: string
          entity_id: string
          id: string
          ip_address: unknown
          signature_hash: string
          target_id: string
          target_type: Database["governance"]["Enums"]["approval_target_type"]
        }
        Insert: {
          approval_method?: string
          approved_at?: string
          board_member_id: string
          entity_id: string
          id?: string
          ip_address?: unknown
          signature_hash: string
          target_id: string
          target_type: Database["governance"]["Enums"]["approval_target_type"]
        }
        Update: {
          approval_method?: string
          approved_at?: string
          board_member_id?: string
          entity_id?: string
          id?: string
          ip_address?: unknown
          signature_hash?: string
          target_id?: string
          target_type?: Database["governance"]["Enums"]["approval_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "approvals_board_member_id_fkey"
            columns: ["board_member_id"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["id"]
          },
        ]
      }
      board_meetings: {
        Row: {
          adjourned_at: string | null
          board_id: string
          board_packet_document_id: string | null
          board_packet_version_id: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string
          finalized_at: string | null
          finalized_by: string | null
          finalized_signature_hash: string | null
          id: string
          location: string | null
          meeting_type: string
          scheduled_end: string | null
          scheduled_start: string
          started_at: string | null
          status: string
          title: string
          virtual_link: string | null
        }
        Insert: {
          adjourned_at?: string | null
          board_id: string
          board_packet_document_id?: string | null
          board_packet_version_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by: string
          finalized_at?: string | null
          finalized_by?: string | null
          finalized_signature_hash?: string | null
          id?: string
          location?: string | null
          meeting_type: string
          scheduled_end?: string | null
          scheduled_start: string
          started_at?: string | null
          status?: string
          title: string
          virtual_link?: string | null
        }
        Update: {
          adjourned_at?: string | null
          board_id?: string
          board_packet_document_id?: string | null
          board_packet_version_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string
          finalized_at?: string | null
          finalized_by?: string | null
          finalized_signature_hash?: string | null
          id?: string
          location?: string | null
          meeting_type?: string
          scheduled_end?: string | null
          scheduled_start?: string
          started_at?: string | null
          status?: string
          title?: string
          virtual_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_meetings_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_meetings_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["id"]
          },
        ]
      }
      board_members: {
        Row: {
          board_id: string
          created_at: string
          id: string
          role: string
          status: string
          term_end: string | null
          term_start: string
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          role: string
          status?: string
          term_end?: string | null
          term_start: string
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          role?: string
          status?: string
          term_end?: string | null
          term_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_members_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          name: string
          quorum_override_count: number | null
          quorum_rule: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          name?: string
          quorum_override_count?: number | null
          quorum_rule?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          name?: string
          quorum_override_count?: number | null
          quorum_rule?: string
        }
        Relationships: []
      }
      meeting_attendance: {
        Row: {
          board_member_id: string
          id: string
          meeting_id: string
          status: string
        }
        Insert: {
          board_member_id: string
          id?: string
          meeting_id: string
          status: string
        }
        Update: {
          board_member_id?: string
          id?: string
          meeting_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendance_board_member_id_fkey"
            columns: ["board_member_id"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "board_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_minutes: {
        Row: {
          amended_from_id: string | null
          approved_at: string | null
          approved_by: string | null
          content: string
          content_json: Json | null
          content_md: string | null
          draft: boolean
          finalized_at: string | null
          finalized_by: string | null
          id: string
          locked_at: string | null
          meeting_id: string
          status: Database["governance"]["Enums"]["minutes_status"]
          version_number: number
        }
        Insert: {
          amended_from_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          content: string
          content_json?: Json | null
          content_md?: string | null
          draft?: boolean
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          locked_at?: string | null
          meeting_id: string
          status?: Database["governance"]["Enums"]["minutes_status"]
          version_number?: number
        }
        Update: {
          amended_from_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          content?: string
          content_json?: Json | null
          content_md?: string | null
          draft?: boolean
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          locked_at?: string | null
          meeting_id?: string
          status?: Database["governance"]["Enums"]["minutes_status"]
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "meeting_minutes_amended_from_fkey"
            columns: ["amended_from_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_amended_from_fkey"
            columns: ["amended_from_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes_expanded"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "board_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      motions: {
        Row: {
          created_at: string
          description: string | null
          finalized_at: string | null
          id: string
          meeting_id: string
          motion_type: string
          moved_by: string
          seconded_by: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          finalized_at?: string | null
          id?: string
          meeting_id: string
          motion_type?: string
          moved_by: string
          seconded_by?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          finalized_at?: string | null
          id?: string
          meeting_id?: string
          motion_type?: string
          moved_by?: string
          seconded_by?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "motions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "board_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motions_moved_by_fkey"
            columns: ["moved_by"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motions_seconded_by_fkey"
            columns: ["seconded_by"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          board_member_id: string
          id: string
          motion_id: string
          signature_hash: string
          signed_at: string
          vote: string
        }
        Insert: {
          board_member_id: string
          id?: string
          motion_id: string
          signature_hash?: string
          signed_at?: string
          vote: string
        }
        Update: {
          board_member_id?: string
          id?: string
          motion_id?: string
          signature_hash?: string
          signed_at?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_board_member_id_fkey"
            columns: ["board_member_id"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_motion_id_fkey"
            columns: ["motion_id"]
            isOneToOne: false
            referencedRelation: "motions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      meeting_minutes_expanded: {
        Row: {
          amended_from_id: string | null
          approved_at: string | null
          approved_by: string | null
          board_id: string | null
          content: string | null
          content_json: Json | null
          content_md: string | null
          draft: boolean | null
          finalized_at: string | null
          finalized_by: string | null
          id: string | null
          locked_at: string | null
          meeting_id: string | null
          meeting_status: string | null
          meeting_title: string | null
          meeting_type: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          status: Database["governance"]["Enums"]["minutes_status"] | null
          version_number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "board_meetings_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_amended_from_fkey"
            columns: ["amended_from_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_amended_from_fkey"
            columns: ["amended_from_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes_expanded"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "board_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _object_exists: {
        Args: { p_kind: string; p_name: string; p_schema: string }
        Returns: boolean
      }
      approve_document_version: {
        Args: {
          p_approval_method?: string
          p_document_version_id: string
          p_ip?: unknown
          p_meeting_id?: string
          p_signature_hash?: string
        }
        Returns: string
      }
      approve_meeting_minutes: {
        Args: {
          p_approval_method?: string
          p_ip?: unknown
          p_meeting_id: string
          p_signature_hash?: string
        }
        Returns: string
      }
      assert_can_adjourn_meeting: {
        Args: { p_board_id: string; p_presiding_user_id: string }
        Returns: undefined
      }
      assert_can_start_meeting: {
        Args: { p_board_id: string }
        Returns: undefined
      }
      create_board_packet_for_meeting: {
        Args: { p_meeting_id: string; p_title?: string }
        Returns: Json
      }
      current_user_id: { Args: never; Returns: string }
      finalize_meeting: {
        Args: { p_meeting_id: string; p_signature_hash?: string }
        Returns: {
          adjourned_at: string | null
          board_id: string
          board_packet_document_id: string | null
          board_packet_version_id: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string
          finalized_at: string | null
          finalized_by: string | null
          finalized_signature_hash: string | null
          id: string
          location: string | null
          meeting_type: string
          scheduled_end: string | null
          scheduled_start: string
          started_at: string | null
          status: string
          title: string
          virtual_link: string | null
        }
        SetofOptions: {
          from: "*"
          to: "board_meetings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_motion: {
        Args: {
          p_approval_method?: string
          p_ip?: unknown
          p_motion_id: string
          p_signature_hash: string
        }
        Returns: string
      }
      is_board_chair: {
        Args: { p_entity_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_board_member: {
        Args: { p_entity_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_board_member_current: {
        Args: { p_board_id: string }
        Returns: boolean
      }
      is_board_officer: {
        Args: { p_board_id: string; p_user_id: string }
        Returns: boolean
      }
      is_board_officer_current: {
        Args: { p_board_id: string }
        Returns: boolean
      }
      is_quorum_met: { Args: { p_meeting_id: string }; Returns: boolean }
      meeting_is_adjourned_for_motion: {
        Args: { p_motion_id: string }
        Returns: boolean
      }
      quorum_required_for_meeting: {
        Args: { p_meeting_id: string }
        Returns: number
      }
      set_board_packet_version: {
        Args: { p_document_version_id: string; p_meeting_id: string }
        Returns: boolean
      }
    }
    Enums: {
      approval_target_type: "meeting_minutes" | "document_version" | "motion"
      meeting_status: "scheduled" | "in_session" | "adjourned" | "cancelled"
      minutes_status: "draft" | "finalized" | "amended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      business_campaigns: {
        Row: {
          business_id: string
          campaign_type: string
          created_at: string | null
          district_id: string
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          campaign_type: string
          created_at?: string | null
          district_id: string
          id?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          campaign_type?: string
          created_at?: string | null
          district_id?: string
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_campaigns_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          created_at: string | null
          entity_id: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          phone_number: string | null
          place_id: string | null
          status: string
          types: string[] | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          entity_id: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          phone_number?: string | null
          place_id?: string | null
          status?: string
          types?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          entity_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          phone_number?: string | null
          place_id?: string | null
          status?: string
          types?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_entity_id_fk"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          created_by: string
          id: number
          inserted_at: string
          slug: string
        }
        Insert: {
          created_by: string
          id?: number
          inserted_at?: string
          slug: string
        }
        Update: {
          created_by?: string
          id?: number
          inserted_at?: string
          slug?: string
        }
        Relationships: []
      }
      district_signups: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          district_id: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          district_id: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          district_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "district_signups_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "district_signups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "district_signups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_with_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          centroid_lat: number | null
          centroid_lng: number | null
          created_at: string | null
          entity_id: string
          id: string
          properties: Json
          sdorgid: string
          shortname: string | null
          status: string
        }
        Insert: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          created_at?: string | null
          entity_id: string
          id?: string
          properties: Json
          sdorgid: string
          shortname?: string | null
          status?: string
        }
        Update: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          created_at?: string | null
          entity_id?: string
          id?: string
          properties?: Json
          sdorgid?: string
          shortname?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_entity_id_fk"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_by_meeting_id: string | null
          content_md: string | null
          created_at: string
          created_by: string | null
          document_id: string
          file_sha256: string | null
          id: string
          mime_type: string | null
          review_notes: string | null
          status: Database["public"]["Enums"]["document_version_status"]
          storage_bucket: string | null
          storage_path: string | null
          version_number: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_meeting_id?: string | null
          content_md?: string | null
          created_at?: string
          created_by?: string | null
          document_id: string
          file_sha256?: string | null
          id?: string
          mime_type?: string | null
          review_notes?: string | null
          status?: Database["public"]["Enums"]["document_version_status"]
          storage_bucket?: string | null
          storage_path?: string | null
          version_number?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_meeting_id?: string | null
          content_md?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string
          file_sha256?: string | null
          id?: string
          mime_type?: string | null
          review_notes?: string | null
          status?: Database["public"]["Enums"]["document_version_status"]
          storage_bucket?: string | null
          storage_path?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          created_by: string | null
          current_version_id: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          effective_end: string | null
          effective_start: string | null
          entity_id: string
          id: string
          status: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["document_visibility"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          effective_end?: string | null
          effective_start?: string | null
          entity_id: string
          id?: string
          status?: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["document_visibility"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          effective_end?: string | null
          effective_start?: string | null
          entity_id?: string
          id?: string
          status?: Database["public"]["Enums"]["document_status"]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["document_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "documents_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          created_at: string | null
          district_id: string | null
          email: string | null
          id: string
          invoice_id: string | null
          receipt_url: string | null
          stripe_session_id: string
          subscription_id: string | null
          type: Database["public"]["Enums"]["donation_type"]
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          district_id?: string | null
          email?: string | null
          id?: string
          invoice_id?: string | null
          receipt_url?: string | null
          stripe_session_id: string
          subscription_id?: string | null
          type?: Database["public"]["Enums"]["donation_type"]
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          district_id?: string | null
          email?: string | null
          id?: string
          invoice_id?: string | null
          receipt_url?: string | null
          stripe_session_id?: string
          subscription_id?: string | null
          type?: Database["public"]["Enums"]["donation_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          active: boolean
          created_at: string
          entity_type: string
          external_ids: Json
          id: string
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          entity_type: string
          external_ids?: Json
          id?: string
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          entity_type?: string
          external_ids?: Json
          id?: string
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entities_entity_type_fkey"
            columns: ["entity_type"]
            isOneToOne: false
            referencedRelation: "entity_types"
            referencedColumns: ["key"]
          },
        ]
      }
      entity_geometries: {
        Row: {
          bbox: Json | null
          centroid: unknown
          created_at: string
          entity_id: string
          geojson: Json | null
          geom: unknown
          geometry_type: string
          id: string
          source: string | null
          updated_at: string
        }
        Insert: {
          bbox?: Json | null
          centroid?: unknown
          created_at?: string
          entity_id: string
          geojson?: Json | null
          geom: unknown
          geometry_type: string
          id?: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          bbox?: Json | null
          centroid?: unknown
          created_at?: string
          entity_id?: string
          geojson?: Json | null
          geom?: unknown
          geometry_type?: string
          id?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_geometries_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_relationships: {
        Row: {
          child_entity_id: string
          created_at: string
          id: string
          is_primary: boolean
          parent_entity_id: string
          relationship_type: string
        }
        Insert: {
          child_entity_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_entity_id: string
          relationship_type: string
        }
        Update: {
          child_entity_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_entity_id?: string
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_relationships_child_entity_id_fkey"
            columns: ["child_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_relationships_parent_entity_id_fkey"
            columns: ["parent_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_types: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          key: string
          label: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          key: string
          label: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      entity_users: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          role: Database["public"]["Enums"]["entity_user_role"]
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          role: Database["public"]["Enums"]["entity_user_role"]
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          role?: Database["public"]["Enums"]["entity_user_role"]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_users_entity_ref_id_fk"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_with_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel_id: number
          id: number
          inserted_at: string
          message: string | null
          user_id: string
        }
        Insert: {
          channel_id: number
          id?: number
          inserted_at?: string
          message?: string | null
          user_id: string
        }
        Update: {
          channel_id?: number
          id?: number
          inserted_at?: string
          message?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      nonprofits: {
        Row: {
          active: boolean
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          district_id: string | null
          ein: string | null
          entity_id: string
          id: string
          logo_url: string | null
          mission_statement: string | null
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          updated_at: string
          website_url: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          district_id?: string | null
          ein?: string | null
          entity_id: string
          id?: string
          logo_url?: string | null
          mission_statement?: string | null
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          district_id?: string | null
          ein?: string | null
          entity_id?: string
          id?: string
          logo_url?: string | null
          mission_statement?: string | null
          name?: string
          org_type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nonprofits_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nonprofits_entity_id_fk"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          role: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: number
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: number
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: number
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number | null
          created_at: string | null
          district_id: string | null
          email: string | null
          id: string
          interval: string | null
          status: string
          stripe_subscription_id: string
          type: Database["public"]["Enums"]["donation_type"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          district_id?: string | null
          email?: string | null
          id?: string
          interval?: string | null
          status: string
          stripe_subscription_id: string
          type?: Database["public"]["Enums"]["donation_type"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          district_id?: string | null
          email?: string | null
          id?: string
          interval?: string | null
          status?: string
          stripe_subscription_id?: string
          type?: Database["public"]["Enums"]["donation_type"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          id: number
          inserted_at: string
          is_complete: boolean | null
          task: string | null
          user_id: string
        }
        Insert: {
          id?: number
          inserted_at?: string
          is_complete?: boolean | null
          task?: string | null
          user_id: string
        }
        Update: {
          id?: number
          inserted_at?: string
          is_complete?: boolean | null
          task?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: string
          user_id: string
        }
        Insert: {
          role: string
          user_id: string
        }
        Update: {
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      entity_geometries_geojson: {
        Row: {
          entity_id: string | null
          geojson: Json | null
          geometry_type: string | null
        }
        Insert: {
          entity_id?: string | null
          geojson?: never
          geometry_type?: string | null
        }
        Update: {
          entity_id?: string | null
          geojson?: never
          geometry_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_geometries_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      raster_columns: {
        Row: {
          blocksize_x: number | null
          blocksize_y: number | null
          extent: unknown
          nodata_values: number[] | null
          num_bands: number | null
          out_db: boolean[] | null
          pixel_types: string[] | null
          r_raster_column: unknown
          r_table_catalog: unknown
          r_table_name: unknown
          r_table_schema: unknown
          regular_blocking: boolean | null
          same_alignment: boolean | null
          scale_x: number | null
          scale_y: number | null
          spatial_index: boolean | null
          srid: number | null
        }
        Relationships: []
      }
      raster_overviews: {
        Row: {
          o_raster_column: unknown
          o_table_catalog: unknown
          o_table_name: unknown
          o_table_schema: unknown
          overview_factor: number | null
          r_raster_column: unknown
          r_table_catalog: unknown
          r_table_name: unknown
          r_table_schema: unknown
        }
        Relationships: []
      }
      user_profiles_with_roles: {
        Row: {
          avatar_url: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          last_name: string | null
          role: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      __st_countagg_transfn: {
        Args: {
          agg: Database["public"]["CompositeTypes"]["agg_count"]
          exclude_nodata_value?: boolean
          nband?: number
          rast: unknown
          sample_percent?: number
        }
        Returns: Database["public"]["CompositeTypes"]["agg_count"]
        SetofOptions: {
          from: "*"
          to: "agg_count"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _add_overview_constraint: {
        Args: {
          factor: number
          ovcolumn: unknown
          ovschema: unknown
          ovtable: unknown
          refcolumn: unknown
          refschema: unknown
          reftable: unknown
        }
        Returns: boolean
      }
      _add_raster_constraint: {
        Args: { cn: unknown; sql: string }
        Returns: boolean
      }
      _add_raster_constraint_alignment: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _add_raster_constraint_blocksize: {
        Args: {
          axis: string
          rastcolumn: unknown
          rastschema: unknown
          rasttable: unknown
        }
        Returns: boolean
      }
      _add_raster_constraint_coverage_tile: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _add_raster_constraint_extent: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _add_raster_constraint_nodata_values: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _add_raster_constraint_num_bands: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _add_raster_constraint_out_db: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _add_raster_constraint_pixel_types: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _add_raster_constraint_scale: {
        Args: {
          axis: string
          rastcolumn: unknown
          rastschema: unknown
          rasttable: unknown
        }
        Returns: boolean
      }
      _add_raster_constraint_spatially_unique: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _add_raster_constraint_srid: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _drop_overview_constraint: {
        Args: { ovcolumn: unknown; ovschema: unknown; ovtable: unknown }
        Returns: boolean
      }
      _drop_raster_constraint: {
        Args: { cn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _drop_raster_constraint_alignment: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _drop_raster_constraint_blocksize: {
        Args: {
          axis: string
          rastcolumn: unknown
          rastschema: unknown
          rasttable: unknown
        }
        Returns: boolean
      }
      _drop_raster_constraint_coverage_tile: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _drop_raster_constraint_extent: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _drop_raster_constraint_nodata_values: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _drop_raster_constraint_num_bands: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _drop_raster_constraint_out_db: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _drop_raster_constraint_pixel_types: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _drop_raster_constraint_regular_blocking: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _drop_raster_constraint_scale: {
        Args: {
          axis: string
          rastcolumn: unknown
          rastschema: unknown
          rasttable: unknown
        }
        Returns: boolean
      }
      _drop_raster_constraint_spatially_unique: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _drop_raster_constraint_srid: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _overview_constraint: {
        Args: {
          factor: number
          ov: unknown
          refcolumn: unknown
          refschema: unknown
          reftable: unknown
        }
        Returns: boolean
      }
      _overview_constraint_info: {
        Args: { ovcolumn: unknown; ovschema: unknown; ovtable: unknown }
        Returns: Record<string, unknown>
      }
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _raster_constraint_info_alignment: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _raster_constraint_info_blocksize: {
        Args: {
          axis: string
          rastcolumn: unknown
          rastschema: unknown
          rasttable: unknown
        }
        Returns: number
      }
      _raster_constraint_info_coverage_tile: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _raster_constraint_info_extent: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: unknown
      }
      _raster_constraint_info_index: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _raster_constraint_info_nodata_values: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: number[]
      }
      _raster_constraint_info_num_bands: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: number
      }
      _raster_constraint_info_out_db: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean[]
      }
      _raster_constraint_info_pixel_types: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: string[]
      }
      _raster_constraint_info_regular_blocking: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _raster_constraint_info_scale: {
        Args: {
          axis: string
          rastcolumn: unknown
          rastschema: unknown
          rasttable: unknown
        }
        Returns: number
      }
      _raster_constraint_info_spatially_unique: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: boolean
      }
      _raster_constraint_info_srid: {
        Args: { rastcolumn: unknown; rastschema: unknown; rasttable: unknown }
        Returns: number
      }
      _raster_constraint_nodata_values: {
        Args: { rast: unknown }
        Returns: number[]
      }
      _raster_constraint_out_db: { Args: { rast: unknown }; Returns: boolean[] }
      _raster_constraint_pixel_types: {
        Args: { rast: unknown }
        Returns: string[]
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_aspect4ma: {
        Args: { pos: number[]; userargs?: string[]; value: number[] }
        Returns: number
      }
      _st_asraster: {
        Args: {
          geom: unknown
          gridx?: number
          gridy?: number
          height?: number
          nodataval?: number[]
          pixeltype?: string[]
          scalex?: number
          scaley?: number
          skewx?: number
          skewy?: number
          touched?: boolean
          upperleftx?: number
          upperlefty?: number
          value?: number[]
          width?: number
        }
        Returns: unknown
      }
      _st_clip: {
        Args: {
          crop?: boolean
          geom: unknown
          nband: number[]
          nodataval?: number[]
          rast: unknown
        }
        Returns: unknown
      }
      _st_colormap: {
        Args: {
          colormap: string
          method?: string
          nband: number
          rast: unknown
        }
        Returns: unknown
      }
      _st_contains:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
      _st_containsproperly:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
      _st_convertarray4ma: { Args: { value: number[] }; Returns: number[] }
      _st_count: {
        Args: {
          exclude_nodata_value?: boolean
          nband?: number
          rast: unknown
          sample_percent?: number
        }
        Returns: number
      }
      _st_countagg_finalfn: {
        Args: { agg: Database["public"]["CompositeTypes"]["agg_count"] }
        Returns: number
      }
      _st_countagg_transfn:
        | {
            Args: {
              agg: Database["public"]["CompositeTypes"]["agg_count"]
              exclude_nodata_value: boolean
              rast: unknown
            }
            Returns: Database["public"]["CompositeTypes"]["agg_count"]
            SetofOptions: {
              from: "*"
              to: "agg_count"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              agg: Database["public"]["CompositeTypes"]["agg_count"]
              exclude_nodata_value: boolean
              nband: number
              rast: unknown
            }
            Returns: Database["public"]["CompositeTypes"]["agg_count"]
            SetofOptions: {
              from: "*"
              to: "agg_count"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              agg: Database["public"]["CompositeTypes"]["agg_count"]
              exclude_nodata_value: boolean
              nband: number
              rast: unknown
              sample_percent: number
            }
            Returns: Database["public"]["CompositeTypes"]["agg_count"]
            SetofOptions: {
              from: "*"
              to: "agg_count"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dfullywithin: {
        Args: {
          distance: number
          nband1: number
          nband2: number
          rast1: unknown
          rast2: unknown
        }
        Returns: boolean
      }
      _st_dwithin:
        | {
            Args: {
              geog1: unknown
              geog2: unknown
              tolerance: number
              use_spheroid?: boolean
            }
            Returns: boolean
          }
        | {
            Args: {
              distance: number
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_gdalwarp: {
        Args: {
          algorithm?: string
          gridx?: number
          gridy?: number
          height?: number
          maxerr?: number
          rast: unknown
          scalex?: number
          scaley?: number
          skewx?: number
          skewy?: number
          srid?: number
          width?: number
        }
        Returns: unknown
      }
      _st_grayscale4ma: {
        Args: { pos: number[]; userargs?: string[]; value: number[] }
        Returns: number
      }
      _st_hillshade4ma: {
        Args: { pos: number[]; userargs?: string[]; value: number[] }
        Returns: number
      }
      _st_histogram: {
        Args: {
          bins?: number
          exclude_nodata_value?: boolean
          max?: number
          min?: number
          nband?: number
          rast: unknown
          right?: boolean
          sample_percent?: number
          width?: number[]
        }
        Returns: Record<string, unknown>[]
      }
      _st_intersects:
        | {
            Args: { geom: unknown; nband?: number; rast: unknown }
            Returns: boolean
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_mapalgebra:
        | {
            Args: {
              callbackfunc: unknown
              customextent?: unknown
              distancex?: number
              distancey?: number
              extenttype?: string
              mask?: number[]
              pixeltype?: string
              rastbandargset: Database["public"]["CompositeTypes"]["rastbandarg"][]
              userargs?: string[]
              weighted?: boolean
            }
            Returns: unknown
          }
        | {
            Args: {
              expression: string
              extenttype?: string
              nodata1expr?: string
              nodata2expr?: string
              nodatanodataval?: number
              pixeltype?: string
              rastbandargset: Database["public"]["CompositeTypes"]["rastbandarg"][]
            }
            Returns: unknown
          }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_neighborhood: {
        Args: {
          band: number
          columnx: number
          distancex: number
          distancey: number
          exclude_nodata_value?: boolean
          rast: unknown
          rowy: number
        }
        Returns: number[]
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
      _st_pixelascentroids: {
        Args: {
          band?: number
          columnx?: number
          exclude_nodata_value?: boolean
          rast: unknown
          rowy?: number
        }
        Returns: {
          geom: unknown
          val: number
          x: number
          y: number
        }[]
      }
      _st_pixelaspolygons: {
        Args: {
          band?: number
          columnx?: number
          exclude_nodata_value?: boolean
          rast: unknown
          rowy?: number
        }
        Returns: {
          geom: unknown
          val: number
          x: number
          y: number
        }[]
      }
      _st_quantile: {
        Args: {
          exclude_nodata_value?: boolean
          nband?: number
          quantiles?: number[]
          rast: unknown
          sample_percent?: number
        }
        Returns: Record<string, unknown>[]
      }
      _st_rastertoworldcoord: {
        Args: { columnx?: number; rast: unknown; rowy?: number }
        Returns: Record<string, unknown>
      }
      _st_reclass: {
        Args: {
          rast: unknown
          reclassargset: Database["public"]["CompositeTypes"]["reclassarg"][]
        }
        Returns: unknown
      }
      _st_roughness4ma: {
        Args: { pos: number[]; userargs?: string[]; value: number[] }
        Returns: number
      }
      _st_samealignment_finalfn: {
        Args: { agg: Database["public"]["CompositeTypes"]["agg_samealignment"] }
        Returns: boolean
      }
      _st_samealignment_transfn: {
        Args: {
          agg: Database["public"]["CompositeTypes"]["agg_samealignment"]
          rast: unknown
        }
        Returns: Database["public"]["CompositeTypes"]["agg_samealignment"]
        SetofOptions: {
          from: "*"
          to: "agg_samealignment"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _st_setvalues: {
        Args: {
          hasnosetvalue?: boolean
          keepnodata?: boolean
          nband: number
          newvalueset: number[]
          noset?: boolean[]
          nosetvalue?: number
          rast: unknown
          x: number
          y: number
        }
        Returns: unknown
      }
      _st_slope4ma: {
        Args: { pos: number[]; userargs?: string[]; value: number[] }
        Returns: number
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_summarystats: {
        Args: {
          exclude_nodata_value?: boolean
          nband?: number
          rast: unknown
          sample_percent?: number
        }
        Returns: Database["public"]["CompositeTypes"]["summarystats"]
        SetofOptions: {
          from: "*"
          to: "summarystats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _st_tile: {
        Args: {
          height: number
          nband?: number[]
          nodataval?: number
          padwithnodata?: boolean
          rast: unknown
          width: number
        }
        Returns: unknown[]
      }
      _st_touches:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
      _st_tpi4ma: {
        Args: { pos: number[]; userargs?: string[]; value: number[] }
        Returns: number
      }
      _st_tri4ma: {
        Args: { pos: number[]; userargs?: string[]; value: number[] }
        Returns: number
      }
      _st_valuecount:
        | {
            Args: {
              exclude_nodata_value?: boolean
              nband?: number
              rast: unknown
              roundto?: number
              searchvalues?: number[]
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              exclude_nodata_value?: boolean
              nband?: number
              rastercolumn: string
              rastertable: string
              roundto?: number
              searchvalues?: number[]
            }
            Returns: Record<string, unknown>[]
          }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
      _st_worldtorastercoord: {
        Args: { latitude?: number; longitude?: number; rast: unknown }
        Returns: Record<string, unknown>
      }
      _updaterastersrid: {
        Args: {
          column_name: unknown
          new_srid: number
          schema_name: unknown
          table_name: unknown
        }
        Returns: boolean
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      addoverviewconstraints:
        | {
            Args: {
              ovcolumn: unknown
              ovfactor: number
              ovschema: unknown
              ovtable: unknown
              refcolumn: unknown
              refschema: unknown
              reftable: unknown
            }
            Returns: boolean
          }
        | {
            Args: {
              ovcolumn: unknown
              ovfactor: number
              ovtable: unknown
              refcolumn: unknown
              reftable: unknown
            }
            Returns: boolean
          }
      addrasterconstraints:
        | {
            Args: {
              blocksize_x?: boolean
              blocksize_y?: boolean
              extent?: boolean
              nodata_values?: boolean
              num_bands?: boolean
              out_db?: boolean
              pixel_types?: boolean
              rastcolumn: unknown
              rastschema: unknown
              rasttable: unknown
              regular_blocking?: boolean
              same_alignment?: boolean
              scale_x?: boolean
              scale_y?: boolean
              srid?: boolean
            }
            Returns: boolean
          }
        | {
            Args: {
              constraints: string[]
              rastcolumn: unknown
              rastschema: unknown
              rasttable: unknown
            }
            Returns: boolean
          }
        | {
            Args: {
              blocksize_x?: boolean
              blocksize_y?: boolean
              extent?: boolean
              nodata_values?: boolean
              num_bands?: boolean
              out_db?: boolean
              pixel_types?: boolean
              rastcolumn: unknown
              rasttable: unknown
              regular_blocking?: boolean
              same_alignment?: boolean
              scale_x?: boolean
              scale_y?: boolean
              srid?: boolean
            }
            Returns: boolean
          }
        | {
            Args: {
              constraints: string[]
              rastcolumn: unknown
              rasttable: unknown
            }
            Returns: boolean
          }
      authorize: {
        Args: {
          requested_permission: Database["public"]["Enums"]["app_permission"]
        }
        Returns: boolean
      }
      business_admin: { Args: { target_business: string }; Returns: boolean }
      can_manage_entity_assets: {
        Args: { p_entity_id: string; p_uid: string }
        Returns: boolean
      }
      create_user: { Args: { email: string }; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      disablelongtransactions: { Args: never; Returns: string }
      district_admin: { Args: { target_district: string }; Returns: boolean }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      dropoverviewconstraints:
        | {
            Args: { ovcolumn: unknown; ovschema: unknown; ovtable: unknown }
            Returns: boolean
          }
        | { Args: { ovcolumn: unknown; ovtable: unknown }; Returns: boolean }
      droprasterconstraints:
        | {
            Args: {
              blocksize_x?: boolean
              blocksize_y?: boolean
              extent?: boolean
              nodata_values?: boolean
              num_bands?: boolean
              out_db?: boolean
              pixel_types?: boolean
              rastcolumn: unknown
              rastschema: unknown
              rasttable: unknown
              regular_blocking?: boolean
              same_alignment?: boolean
              scale_x?: boolean
              scale_y?: boolean
              srid?: boolean
            }
            Returns: boolean
          }
        | {
            Args: {
              constraints: string[]
              rastcolumn: unknown
              rastschema: unknown
              rasttable: unknown
            }
            Returns: boolean
          }
        | {
            Args: {
              blocksize_x?: boolean
              blocksize_y?: boolean
              extent?: boolean
              nodata_values?: boolean
              num_bands?: boolean
              out_db?: boolean
              pixel_types?: boolean
              rastcolumn: unknown
              rasttable: unknown
              regular_blocking?: boolean
              same_alignment?: boolean
              scale_x?: boolean
              scale_y?: boolean
              srid?: boolean
            }
            Returns: boolean
          }
        | {
            Args: {
              constraints: string[]
              rastcolumn: unknown
              rasttable: unknown
            }
            Returns: boolean
          }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      has_entity_role: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_roles: Database["public"]["Enums"]["entity_user_role"][]
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_entity_admin:
        | {
            Args: { p_entity_id: string; p_user_id?: string }
            Returns: boolean
          }
        | {
            Args: { p_entity_id: string; p_entity_type: string }
            Returns: boolean
          }
      is_entity_user:
        | {
            Args: { p_entity_id: string; p_user_id?: string }
            Returns: boolean
          }
        | {
            Args: { p_entity_id: string; p_entity_type: string }
            Returns: boolean
          }
      is_global_admin: { Args: { p_user_id?: string }; Returns: boolean }
      link_schools_to_districts: {
        Args: { p_limit: number; p_offset: number }
        Returns: Json
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      nonprofit_admin: { Args: { target_nonprofit: string }; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_gdal_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_raster_lib_build_date: { Args: never; Returns: string }
      postgis_raster_lib_version: { Args: never; Returns: string }
      postgis_raster_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addband:
        | {
            Args: {
              addbandargset: Database["public"]["CompositeTypes"]["addbandarg"][]
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              index: number
              nodataval?: number
              outdbfile: string
              outdbindex: number[]
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              index: number
              initialvalue?: number
              nodataval?: number
              pixeltype: string
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              index?: number
              nodataval?: number
              outdbfile: string
              outdbindex: number[]
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              initialvalue?: number
              nodataval?: number
              pixeltype: string
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              fromband?: number
              fromrast: unknown
              torast: unknown
              torastindex?: number
            }
            Returns: unknown
          }
        | {
            Args: {
              fromband?: number
              fromrasts: unknown[]
              torast: unknown
              torastindex?: number
            }
            Returns: unknown
          }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_approxcount:
        | {
            Args: {
              exclude_nodata_value: boolean
              rast: unknown
              sample_percent?: number
            }
            Returns: number
          }
        | {
            Args: {
              exclude_nodata_value?: boolean
              nband?: number
              rast: unknown
              sample_percent?: number
            }
            Returns: number
          }
        | {
            Args: { nband: number; rast: unknown; sample_percent: number }
            Returns: number
          }
        | { Args: { rast: unknown; sample_percent: number }; Returns: number }
      st_approxhistogram:
        | {
            Args: {
              bins?: number
              exclude_nodata_value?: boolean
              nband?: number
              rast: unknown
              right?: boolean
              sample_percent?: number
              width?: number[]
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              bins: number
              exclude_nodata_value: boolean
              nband: number
              rast: unknown
              right: boolean
              sample_percent: number
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              bins: number
              nband: number
              rast: unknown
              right: boolean
              sample_percent: number
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              bins: number
              nband: number
              rast: unknown
              right?: boolean
              sample_percent: number
              width?: number[]
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: { nband: number; rast: unknown; sample_percent: number }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: { rast: unknown; sample_percent: number }
            Returns: Record<string, unknown>[]
          }
      st_approxquantile:
        | {
            Args: {
              exclude_nodata_value: boolean
              quantile?: number
              rast: unknown
            }
            Returns: number
          }
        | {
            Args: {
              exclude_nodata_value?: boolean
              nband?: number
              quantiles?: number[]
              rast: unknown
              sample_percent?: number
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              exclude_nodata_value: boolean
              nband: number
              quantile: number
              rast: unknown
              sample_percent: number
            }
            Returns: number
          }
        | {
            Args: {
              nband: number
              quantile: number
              rast: unknown
              sample_percent: number
            }
            Returns: number
          }
        | {
            Args: {
              nband: number
              quantiles?: number[]
              rast: unknown
              sample_percent: number
            }
            Returns: Record<string, unknown>[]
          }
        | { Args: { quantile: number; rast: unknown }; Returns: number }
        | {
            Args: { quantiles: number[]; rast: unknown }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: { quantile: number; rast: unknown; sample_percent: number }
            Returns: number
          }
        | {
            Args: {
              quantiles?: number[]
              rast: unknown
              sample_percent: number
            }
            Returns: Record<string, unknown>[]
          }
      st_approxsummarystats:
        | {
            Args: {
              exclude_nodata_value: boolean
              rast: unknown
              sample_percent?: number
            }
            Returns: Database["public"]["CompositeTypes"]["summarystats"]
            SetofOptions: {
              from: "*"
              to: "summarystats"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              exclude_nodata_value?: boolean
              nband?: number
              rast: unknown
              sample_percent?: number
            }
            Returns: Database["public"]["CompositeTypes"]["summarystats"]
            SetofOptions: {
              from: "*"
              to: "summarystats"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { nband: number; rast: unknown; sample_percent: number }
            Returns: Database["public"]["CompositeTypes"]["summarystats"]
            SetofOptions: {
              from: "*"
              to: "summarystats"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { rast: unknown; sample_percent: number }
            Returns: Database["public"]["CompositeTypes"]["summarystats"]
            SetofOptions: {
              from: "*"
              to: "summarystats"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgdalraster: {
        Args: {
          format: string
          options?: string[]
          rast: unknown
          srid?: number
        }
        Returns: string
      }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_asjpeg:
        | {
            Args: { nband: number; options?: string[]; rast: unknown }
            Returns: string
          }
        | {
            Args: { nband: number; quality: number; rast: unknown }
            Returns: string
          }
        | {
            Args: { nbands: number[]; options?: string[]; rast: unknown }
            Returns: string
          }
        | {
            Args: { nbands: number[]; quality: number; rast: unknown }
            Returns: string
          }
        | { Args: { options?: string[]; rast: unknown }; Returns: string }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_aspect:
        | {
            Args: {
              interpolate_nodata?: boolean
              nband?: number
              pixeltype?: string
              rast: unknown
              units?: string
            }
            Returns: unknown
          }
        | {
            Args: {
              customextent: unknown
              interpolate_nodata?: boolean
              nband: number
              pixeltype?: string
              rast: unknown
              units?: string
            }
            Returns: unknown
          }
      st_aspng:
        | {
            Args: { compression: number; nband: number; rast: unknown }
            Returns: string
          }
        | {
            Args: { nband: number; options?: string[]; rast: unknown }
            Returns: string
          }
        | {
            Args: { compression: number; nbands: number[]; rast: unknown }
            Returns: string
          }
        | {
            Args: { nbands: number[]; options?: string[]; rast: unknown }
            Returns: string
          }
        | { Args: { options?: string[]; rast: unknown }; Returns: string }
      st_asraster:
        | {
            Args: {
              geom: unknown
              nodataval?: number
              pixeltype: string
              ref: unknown
              touched?: boolean
              value?: number
            }
            Returns: unknown
          }
        | {
            Args: {
              geom: unknown
              nodataval?: number[]
              pixeltype?: string[]
              ref: unknown
              touched?: boolean
              value?: number[]
            }
            Returns: unknown
          }
        | {
            Args: {
              geom: unknown
              gridx?: number
              gridy?: number
              nodataval?: number[]
              pixeltype?: string[]
              scalex: number
              scaley: number
              skewx?: number
              skewy?: number
              touched?: boolean
              value?: number[]
            }
            Returns: unknown
          }
        | {
            Args: {
              geom: unknown
              gridx: number
              gridy: number
              nodataval?: number
              pixeltype: string
              scalex: number
              scaley: number
              skewx?: number
              skewy?: number
              touched?: boolean
              value?: number
            }
            Returns: unknown
          }
        | {
            Args: {
              geom: unknown
              nodataval?: number
              pixeltype: string
              scalex: number
              scaley: number
              skewx?: number
              skewy?: number
              touched?: boolean
              upperleftx?: number
              upperlefty?: number
              value?: number
            }
            Returns: unknown
          }
        | {
            Args: {
              geom: unknown
              nodataval?: number[]
              pixeltype: string[]
              scalex: number
              scaley: number
              skewx?: number
              skewy?: number
              touched?: boolean
              upperleftx?: number
              upperlefty?: number
              value?: number[]
            }
            Returns: unknown
          }
        | {
            Args: {
              geom: unknown
              gridx?: number
              gridy?: number
              height: number
              nodataval?: number[]
              pixeltype?: string[]
              skewx?: number
              skewy?: number
              touched?: boolean
              value?: number[]
              width: number
            }
            Returns: unknown
          }
        | {
            Args: {
              geom: unknown
              gridx: number
              gridy: number
              height: number
              nodataval?: number
              pixeltype: string
              skewx?: number
              skewy?: number
              touched?: boolean
              value?: number
              width: number
            }
            Returns: unknown
          }
        | {
            Args: {
              geom: unknown
              height: number
              nodataval?: number
              pixeltype: string
              skewx?: number
              skewy?: number
              touched?: boolean
              upperleftx?: number
              upperlefty?: number
              value?: number
              width: number
            }
            Returns: unknown
          }
        | {
            Args: {
              geom: unknown
              height: number
              nodataval?: number[]
              pixeltype: string[]
              skewx?: number
              skewy?: number
              touched?: boolean
              upperleftx?: number
              upperlefty?: number
              value?: number[]
              width: number
            }
            Returns: unknown
          }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astiff:
        | {
            Args: { compression: string; rast: unknown; srid?: number }
            Returns: string
          }
        | {
            Args: {
              compression: string
              nbands: number[]
              rast: unknown
              srid?: number
            }
            Returns: string
          }
        | {
            Args: {
              nbands: number[]
              options?: string[]
              rast: unknown
              srid?: number
            }
            Returns: string
          }
        | {
            Args: { options?: string[]; rast: unknown; srid?: number }
            Returns: string
          }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_band:
        | { Args: { nband: number; rast: unknown }; Returns: unknown }
        | { Args: { nbands?: number[]; rast: unknown }; Returns: unknown }
        | {
            Args: { delimiter?: string; nbands: string; rast: unknown }
            Returns: unknown
          }
      st_bandfilesize: {
        Args: { band?: number; rast: unknown }
        Returns: number
      }
      st_bandfiletimestamp: {
        Args: { band?: number; rast: unknown }
        Returns: number
      }
      st_bandisnodata:
        | {
            Args: { band?: number; forcechecking?: boolean; rast: unknown }
            Returns: boolean
          }
        | { Args: { forcechecking: boolean; rast: unknown }; Returns: boolean }
      st_bandmetadata:
        | {
            Args: { band?: number; rast: unknown }
            Returns: {
              filesize: number
              filetimestamp: number
              isoutdb: boolean
              nodatavalue: number
              outdbbandnum: number
              path: string
              pixeltype: string
            }[]
          }
        | {
            Args: { band: number[]; rast: unknown }
            Returns: {
              bandnum: number
              filesize: number
              filetimestamp: number
              isoutdb: boolean
              nodatavalue: number
              outdbbandnum: number
              path: string
              pixeltype: string
            }[]
          }
      st_bandnodatavalue: {
        Args: { band?: number; rast: unknown }
        Returns: number
      }
      st_bandpath: { Args: { band?: number; rast: unknown }; Returns: string }
      st_bandpixeltype: {
        Args: { band?: number; rast: unknown }
        Returns: string
      }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clip:
        | {
            Args: { crop: boolean; geom: unknown; rast: unknown }
            Returns: unknown
          }
        | {
            Args: {
              crop?: boolean
              geom: unknown
              nodataval: number
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              crop?: boolean
              geom: unknown
              nodataval?: number[]
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: { crop: boolean; geom: unknown; nband: number; rast: unknown }
            Returns: unknown
          }
        | {
            Args: {
              crop?: boolean
              geom: unknown
              nband: number
              nodataval: number
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              crop?: boolean
              geom: unknown
              nband: number[]
              nodataval?: number[]
              rast: unknown
            }
            Returns: unknown
          }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_colormap:
        | {
            Args: { colormap: string; method?: string; rast: unknown }
            Returns: unknown
          }
        | {
            Args: {
              colormap?: string
              method?: string
              nband?: number
              rast: unknown
            }
            Returns: unknown
          }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
        | { Args: { rast1: unknown; rast2: unknown }; Returns: boolean }
      st_containsproperly:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
        | { Args: { rast1: unknown; rast2: unknown }; Returns: boolean }
      st_contour: {
        Args: {
          bandnumber?: number
          fixed_levels?: number[]
          level_base?: number
          level_interval?: number
          polygonize?: boolean
          rast: unknown
        }
        Returns: {
          geom: unknown
          id: number
          value: number
        }[]
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_count:
        | {
            Args: { exclude_nodata_value: boolean; rast: unknown }
            Returns: number
          }
        | {
            Args: {
              exclude_nodata_value?: boolean
              nband?: number
              rast: unknown
            }
            Returns: number
          }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
        | { Args: { rast1: unknown; rast2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
        | { Args: { rast1: unknown; rast2: unknown }; Returns: boolean }
      st_createoverview: {
        Args: { algo?: string; col: unknown; factor: number; tab: unknown }
        Returns: unknown
      }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_dfullywithin:
        | {
            Args: {
              distance: number
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
        | {
            Args: { distance: number; rast1: unknown; rast2: unknown }
            Returns: boolean
          }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
        | { Args: { rast1: unknown; rast2: unknown }; Returns: boolean }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_distinct4ma:
        | {
            Args: { args: string[]; matrix: number[]; nodatamode: string }
            Returns: number
          }
        | {
            Args: { pos: number[]; userargs?: string[]; value: number[] }
            Returns: number
          }
      st_dumpaspolygons: {
        Args: { band?: number; exclude_nodata_value?: boolean; rast: unknown }
        Returns: Database["public"]["CompositeTypes"]["geomval"][]
        SetofOptions: {
          from: "*"
          to: "geomval"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      st_dumpvalues:
        | {
            Args: {
              exclude_nodata_value?: boolean
              nband: number
              rast: unknown
            }
            Returns: number[]
          }
        | {
            Args: {
              exclude_nodata_value?: boolean
              nband?: number[]
              rast: unknown
            }
            Returns: {
              nband: number
              valarray: number[]
            }[]
          }
      st_dwithin:
        | {
            Args: {
              geog1: unknown
              geog2: unknown
              tolerance: number
              use_spheroid?: boolean
            }
            Returns: boolean
          }
        | {
            Args: {
              distance: number
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
        | {
            Args: { distance: number; rast1: unknown; rast2: unknown }
            Returns: boolean
          }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_fromgdalraster: {
        Args: { gdaldata: string; srid?: number }
        Returns: unknown
      }
      st_gdaldrivers: { Args: never; Returns: Record<string, unknown>[] }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_georeference: {
        Args: { format?: string; rast: unknown }
        Returns: string
      }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_grayscale:
        | {
            Args: {
              blueband?: number
              extenttype?: string
              greenband?: number
              rast: unknown
              redband?: number
            }
            Returns: unknown
          }
        | {
            Args: {
              extenttype?: string
              rastbandargset: Database["public"]["CompositeTypes"]["rastbandarg"][]
            }
            Returns: unknown
          }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hasnoband: {
        Args: { nband?: number; rast: unknown }
        Returns: boolean
      }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_hillshade:
        | {
            Args: {
              altitude?: number
              azimuth?: number
              interpolate_nodata?: boolean
              max_bright?: number
              nband?: number
              pixeltype?: string
              rast: unknown
              scale?: number
            }
            Returns: unknown
          }
        | {
            Args: {
              altitude?: number
              azimuth?: number
              customextent: unknown
              interpolate_nodata?: boolean
              max_bright?: number
              nband: number
              pixeltype?: string
              rast: unknown
              scale?: number
            }
            Returns: unknown
          }
      st_histogram:
        | {
            Args: {
              bins?: number
              exclude_nodata_value?: boolean
              nband?: number
              rast: unknown
              right?: boolean
              width?: number[]
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: { bins: number; nband: number; rast: unknown; right: boolean }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              bins: number
              nband: number
              rast: unknown
              right?: boolean
              width?: number[]
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              bins: number
              exclude_nodata_value: boolean
              nband: number
              rast: unknown
              right: boolean
            }
            Returns: Record<string, unknown>[]
          }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_interpolateraster: {
        Args: {
          bandnumber?: number
          geom: unknown
          options: string
          rast: unknown
        }
        Returns: unknown
      }
      st_intersection:
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize?: number }
            Returns: unknown
          }
        | {
            Args: { band?: number; geomin: unknown; rast: unknown }
            Returns: Database["public"]["CompositeTypes"]["geomval"][]
            SetofOptions: {
              from: "*"
              to: "geomval"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: { band: number; geomin: unknown; rast: unknown }
            Returns: Database["public"]["CompositeTypes"]["geomval"][]
            SetofOptions: {
              from: "*"
              to: "geomval"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: { geomin: unknown; rast: unknown }
            Returns: Database["public"]["CompositeTypes"]["geomval"][]
            SetofOptions: {
              from: "*"
              to: "geomval"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: {
              band1: number
              band2: number
              nodataval: number
              rast1: unknown
              rast2: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              band1: number
              band2: number
              nodataval: number[]
              rast1: unknown
              rast2: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              band1: number
              band2: number
              nodataval?: number[]
              rast1: unknown
              rast2: unknown
              returnband?: string
            }
            Returns: unknown
          }
        | {
            Args: {
              band1: number
              band2: number
              nodataval: number
              rast1: unknown
              rast2: unknown
              returnband: string
            }
            Returns: unknown
          }
        | {
            Args: { nodataval: number; rast1: unknown; rast2: unknown }
            Returns: unknown
          }
        | {
            Args: { nodataval: number[]; rast1: unknown; rast2: unknown }
            Returns: unknown
          }
        | {
            Args: {
              nodataval?: number[]
              rast1: unknown
              rast2: unknown
              returnband?: string
            }
            Returns: unknown
          }
        | {
            Args: {
              nodataval: number
              rast1: unknown
              rast2: unknown
              returnband: string
            }
            Returns: unknown
          }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | {
            Args: { geom: unknown; nband?: number; rast: unknown }
            Returns: boolean
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: { geom: unknown; nband?: number; rast: unknown }
            Returns: boolean
          }
        | {
            Args: { geom: unknown; nband: number; rast: unknown }
            Returns: boolean
          }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
        | { Args: { rast1: unknown; rast2: unknown }; Returns: boolean }
      st_invdistweight4ma: {
        Args: { pos: number[]; userargs?: string[]; value: number[] }
        Returns: number
      }
      st_iscoveragetile: {
        Args: {
          coverage: unknown
          rast: unknown
          tileheight: number
          tilewidth: number
        }
        Returns: boolean
      }
      st_isempty: { Args: { rast: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeemptycoverage: {
        Args: {
          height: number
          scalex: number
          scaley: number
          skewx: number
          skewy: number
          srid?: number
          tileheight: number
          tilewidth: number
          upperleftx: number
          upperlefty: number
          width: number
        }
        Returns: unknown[]
      }
      st_makeemptyraster:
        | { Args: { rast: unknown }; Returns: unknown }
        | {
            Args: {
              height: number
              pixelsize: number
              upperleftx: number
              upperlefty: number
              width: number
            }
            Returns: unknown
          }
        | {
            Args: {
              height: number
              scalex: number
              scaley: number
              skewx: number
              skewy: number
              srid?: number
              upperleftx: number
              upperlefty: number
              width: number
            }
            Returns: unknown
          }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_mapalgebra:
        | {
            Args: {
              callbackfunc: unknown
              customextent?: unknown
              extenttype?: string
              mask: number[]
              nband: number
              pixeltype?: string
              rast: unknown
              userargs?: string[]
              weighted: boolean
            }
            Returns: unknown
          }
        | {
            Args: {
              callbackfunc: unknown
              customextent?: unknown
              distancex?: number
              distancey?: number
              extenttype?: string
              nband: number
              pixeltype?: string
              rast: unknown
              userargs?: string[]
            }
            Returns: unknown
          }
        | {
            Args: {
              expression: string
              nband: number
              nodataval?: number
              pixeltype: string
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              callbackfunc: unknown
              customextent?: unknown
              distancex?: number
              distancey?: number
              extenttype?: string
              nband: number[]
              pixeltype?: string
              rast: unknown
              userargs?: string[]
            }
            Returns: unknown
          }
        | {
            Args: {
              expression: string
              nodataval?: number
              pixeltype: string
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              band1: number
              band2: number
              expression: string
              extenttype?: string
              nodata1expr?: string
              nodata2expr?: string
              nodatanodataval?: number
              pixeltype?: string
              rast1: unknown
              rast2: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              callbackfunc: unknown
              customextent?: unknown
              distancex?: number
              distancey?: number
              extenttype?: string
              nband1: number
              nband2: number
              pixeltype?: string
              rast1: unknown
              rast2: unknown
              userargs?: string[]
            }
            Returns: unknown
          }
        | {
            Args: {
              expression: string
              extenttype?: string
              nodata1expr?: string
              nodata2expr?: string
              nodatanodataval?: number
              pixeltype?: string
              rast1: unknown
              rast2: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              callbackfunc: unknown
              customextent?: unknown
              distancex?: number
              distancey?: number
              extenttype?: string
              pixeltype?: string
              rastbandargset: Database["public"]["CompositeTypes"]["rastbandarg"][]
              userargs?: string[]
            }
            Returns: unknown
          }
      st_mapalgebraexpr:
        | {
            Args: {
              band: number
              expression: string
              nodataval?: number
              pixeltype: string
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              expression: string
              nodataval?: number
              pixeltype: string
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              band1: number
              band2: number
              expression: string
              extenttype?: string
              nodata1expr?: string
              nodata2expr?: string
              nodatanodataval?: number
              pixeltype?: string
              rast1: unknown
              rast2: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              expression: string
              extenttype?: string
              nodata1expr?: string
              nodata2expr?: string
              nodatanodataval?: number
              pixeltype?: string
              rast1: unknown
              rast2: unknown
            }
            Returns: unknown
          }
      st_mapalgebrafct:
        | {
            Args: { band: number; onerastuserfunc: unknown; rast: unknown }
            Returns: unknown
          }
        | {
            Args: {
              args: string[]
              band: number
              onerastuserfunc: unknown
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              band: number
              onerastuserfunc: unknown
              pixeltype: string
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              args: string[]
              band: number
              onerastuserfunc: unknown
              pixeltype: string
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: { onerastuserfunc: unknown; rast: unknown }
            Returns: unknown
          }
        | {
            Args: { args: string[]; onerastuserfunc: unknown; rast: unknown }
            Returns: unknown
          }
        | {
            Args: { onerastuserfunc: unknown; pixeltype: string; rast: unknown }
            Returns: unknown
          }
        | {
            Args: {
              args: string[]
              onerastuserfunc: unknown
              pixeltype: string
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              band1: number
              band2: number
              extenttype?: string
              pixeltype?: string
              rast1: unknown
              rast2: unknown
              tworastuserfunc: unknown
              userargs?: string[]
            }
            Returns: unknown
          }
        | {
            Args: {
              extenttype?: string
              pixeltype?: string
              rast1: unknown
              rast2: unknown
              tworastuserfunc: unknown
              userargs?: string[]
            }
            Returns: unknown
          }
      st_mapalgebrafctngb: {
        Args: {
          args: string[]
          band: number
          ngbheight: number
          ngbwidth: number
          nodatamode: string
          onerastngbuserfunc: unknown
          pixeltype: string
          rast: unknown
        }
        Returns: unknown
      }
      st_max4ma:
        | {
            Args: { args: string[]; matrix: number[]; nodatamode: string }
            Returns: number
          }
        | {
            Args: { pos: number[]; userargs?: string[]; value: number[] }
            Returns: number
          }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_mean4ma:
        | {
            Args: { args: string[]; matrix: number[]; nodatamode: string }
            Returns: number
          }
        | {
            Args: { pos: number[]; userargs?: string[]; value: number[] }
            Returns: number
          }
      st_metadata: { Args: { rast: unknown }; Returns: Record<string, unknown> }
      st_min4ma:
        | {
            Args: { args: string[]; matrix: number[]; nodatamode: string }
            Returns: number
          }
        | {
            Args: { pos: number[]; userargs?: string[]; value: number[] }
            Returns: number
          }
      st_minconvexhull: {
        Args: { nband?: number; rast: unknown }
        Returns: unknown
      }
      st_mindist4ma: {
        Args: { pos: number[]; userargs?: string[]; value: number[] }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_minpossiblevalue: { Args: { pixeltype: string }; Returns: number }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_nearestvalue:
        | {
            Args: {
              band: number
              columnx: number
              exclude_nodata_value?: boolean
              rast: unknown
              rowy: number
            }
            Returns: number
          }
        | {
            Args: {
              band: number
              exclude_nodata_value?: boolean
              pt: unknown
              rast: unknown
            }
            Returns: number
          }
        | {
            Args: {
              columnx: number
              exclude_nodata_value?: boolean
              rast: unknown
              rowy: number
            }
            Returns: number
          }
        | {
            Args: { exclude_nodata_value?: boolean; pt: unknown; rast: unknown }
            Returns: number
          }
      st_neighborhood:
        | {
            Args: {
              band: number
              columnx: number
              distancex: number
              distancey: number
              exclude_nodata_value?: boolean
              rast: unknown
              rowy: number
            }
            Returns: number[]
          }
        | {
            Args: {
              band: number
              distancex: number
              distancey: number
              exclude_nodata_value?: boolean
              pt: unknown
              rast: unknown
            }
            Returns: number[]
          }
        | {
            Args: {
              columnx: number
              distancex: number
              distancey: number
              exclude_nodata_value?: boolean
              rast: unknown
              rowy: number
            }
            Returns: number[]
          }
        | {
            Args: {
              distancex: number
              distancey: number
              exclude_nodata_value?: boolean
              pt: unknown
              rast: unknown
            }
            Returns: number[]
          }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_notsamealignmentreason: {
        Args: { rast1: unknown; rast2: unknown }
        Returns: string
      }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
        | { Args: { rast1: unknown; rast2: unknown }; Returns: boolean }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pixelascentroid: {
        Args: { rast: unknown; x: number; y: number }
        Returns: unknown
      }
      st_pixelascentroids: {
        Args: { band?: number; exclude_nodata_value?: boolean; rast: unknown }
        Returns: {
          geom: unknown
          val: number
          x: number
          y: number
        }[]
      }
      st_pixelaspoint: {
        Args: { rast: unknown; x: number; y: number }
        Returns: unknown
      }
      st_pixelaspoints: {
        Args: { band?: number; exclude_nodata_value?: boolean; rast: unknown }
        Returns: {
          geom: unknown
          val: number
          x: number
          y: number
        }[]
      }
      st_pixelaspolygon: {
        Args: { rast: unknown; x: number; y: number }
        Returns: unknown
      }
      st_pixelaspolygons: {
        Args: { band?: number; exclude_nodata_value?: boolean; rast: unknown }
        Returns: {
          geom: unknown
          val: number
          x: number
          y: number
        }[]
      }
      st_pixelofvalue:
        | {
            Args: {
              exclude_nodata_value?: boolean
              nband: number
              rast: unknown
              search: number
            }
            Returns: {
              x: number
              y: number
            }[]
          }
        | {
            Args: {
              exclude_nodata_value?: boolean
              nband: number
              rast: unknown
              search: number[]
            }
            Returns: {
              val: number
              x: number
              y: number
            }[]
          }
        | {
            Args: {
              exclude_nodata_value?: boolean
              rast: unknown
              search: number
            }
            Returns: {
              x: number
              y: number
            }[]
          }
        | {
            Args: {
              exclude_nodata_value?: boolean
              rast: unknown
              search: number[]
            }
            Returns: {
              val: number
              x: number
              y: number
            }[]
          }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygon: { Args: { band?: number; rast: unknown }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantile:
        | {
            Args: {
              exclude_nodata_value: boolean
              quantile?: number
              rast: unknown
            }
            Returns: number
          }
        | {
            Args: {
              exclude_nodata_value?: boolean
              nband?: number
              quantiles?: number[]
              rast: unknown
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              exclude_nodata_value: boolean
              nband: number
              quantile: number
              rast: unknown
            }
            Returns: number
          }
        | {
            Args: { nband: number; quantile: number; rast: unknown }
            Returns: number
          }
        | {
            Args: { nband: number; quantiles: number[]; rast: unknown }
            Returns: Record<string, unknown>[]
          }
        | { Args: { quantile: number; rast: unknown }; Returns: number }
        | {
            Args: { quantiles: number[]; rast: unknown }
            Returns: Record<string, unknown>[]
          }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_range4ma:
        | {
            Args: { args: string[]; matrix: number[]; nodatamode: string }
            Returns: number
          }
        | {
            Args: { pos: number[]; userargs?: string[]; value: number[] }
            Returns: number
          }
      st_rastertoworldcoord: {
        Args: { columnx: number; rast: unknown; rowy: number }
        Returns: Record<string, unknown>
      }
      st_rastertoworldcoordx:
        | { Args: { rast: unknown; xr: number }; Returns: number }
        | { Args: { rast: unknown; xr: number; yr: number }; Returns: number }
      st_rastertoworldcoordy:
        | { Args: { rast: unknown; xr: number; yr: number }; Returns: number }
        | { Args: { rast: unknown; yr: number }; Returns: number }
      st_rastfromhexwkb: { Args: { "": string }; Returns: unknown }
      st_reclass:
        | {
            Args: {
              nband: number
              nodataval?: number
              pixeltype: string
              rast: unknown
              reclassexpr: string
            }
            Returns: unknown
          }
        | {
            Args: { pixeltype: string; rast: unknown; reclassexpr: string }
            Returns: unknown
          }
        | {
            Args: {
              rast: unknown
              reclassargset: Database["public"]["CompositeTypes"]["reclassarg"][]
            }
            Returns: unknown
          }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_resample:
        | {
            Args: {
              algorithm?: string
              maxerr?: number
              rast: unknown
              ref: unknown
              usescale?: boolean
            }
            Returns: unknown
          }
        | {
            Args: {
              algorithm?: string
              maxerr?: number
              rast: unknown
              ref: unknown
              usescale: boolean
            }
            Returns: unknown
          }
        | {
            Args: {
              algorithm?: string
              gridx?: number
              gridy?: number
              maxerr?: number
              rast: unknown
              scalex?: number
              scaley?: number
              skewx?: number
              skewy?: number
            }
            Returns: unknown
          }
        | {
            Args: {
              algorithm?: string
              gridx?: number
              gridy?: number
              height: number
              maxerr?: number
              rast: unknown
              skewx?: number
              skewy?: number
              width: number
            }
            Returns: unknown
          }
      st_rescale:
        | {
            Args: {
              algorithm?: string
              maxerr?: number
              rast: unknown
              scalex: number
              scaley: number
            }
            Returns: unknown
          }
        | {
            Args: {
              algorithm?: string
              maxerr?: number
              rast: unknown
              scalexy: number
            }
            Returns: unknown
          }
      st_resize:
        | {
            Args: {
              algorithm?: string
              maxerr?: number
              percentheight: number
              percentwidth: number
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              algorithm?: string
              height: number
              maxerr?: number
              rast: unknown
              width: number
            }
            Returns: unknown
          }
        | {
            Args: {
              algorithm?: string
              height: string
              maxerr?: number
              rast: unknown
              width: string
            }
            Returns: unknown
          }
      st_reskew:
        | {
            Args: {
              algorithm?: string
              maxerr?: number
              rast: unknown
              skewx: number
              skewy: number
            }
            Returns: unknown
          }
        | {
            Args: {
              algorithm?: string
              maxerr?: number
              rast: unknown
              skewxy: number
            }
            Returns: unknown
          }
      st_retile: {
        Args: {
          algo?: string
          col: unknown
          ext: unknown
          sfx: number
          sfy: number
          tab: unknown
          th: number
          tw: number
        }
        Returns: unknown[]
      }
      st_roughness:
        | {
            Args: {
              interpolate_nodata?: boolean
              nband?: number
              pixeltype?: string
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              customextent: unknown
              interpolate_nodata?: boolean
              nband: number
              pixeltype?: string
              rast: unknown
            }
            Returns: unknown
          }
      st_samealignment:
        | { Args: { rast1: unknown; rast2: unknown }; Returns: boolean }
        | {
            Args: {
              scalex1: number
              scalex2: number
              scaley1: number
              scaley2: number
              skewx1: number
              skewx2: number
              skewy1: number
              skewy2: number
              ulx1: number
              ulx2: number
              uly1: number
              uly2: number
            }
            Returns: boolean
          }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setbandindex: {
        Args: {
          band: number
          force?: boolean
          outdbindex: number
          rast: unknown
        }
        Returns: unknown
      }
      st_setbandisnodata: {
        Args: { band?: number; rast: unknown }
        Returns: unknown
      }
      st_setbandnodatavalue:
        | {
            Args: {
              band: number
              forcechecking?: boolean
              nodatavalue: number
              rast: unknown
            }
            Returns: unknown
          }
        | { Args: { nodatavalue: number; rast: unknown }; Returns: unknown }
      st_setbandpath: {
        Args: {
          band: number
          force?: boolean
          outdbindex: number
          outdbpath: string
          rast: unknown
        }
        Returns: unknown
      }
      st_setgeoreference:
        | {
            Args: { format?: string; georef: string; rast: unknown }
            Returns: unknown
          }
        | {
            Args: {
              rast: unknown
              scalex: number
              scaley: number
              skewx: number
              skewy: number
              upperleftx: number
              upperlefty: number
            }
            Returns: unknown
          }
      st_setgeotransform: {
        Args: {
          imag: number
          jmag: number
          rast: unknown
          theta_i: number
          theta_ij: number
          xoffset: number
          yoffset: number
        }
        Returns: unknown
      }
      st_setm: {
        Args: { band?: number; geom: unknown; rast: unknown; resample?: string }
        Returns: unknown
      }
      st_setrotation: {
        Args: { rast: unknown; rotation: number }
        Returns: unknown
      }
      st_setscale:
        | { Args: { rast: unknown; scale: number }; Returns: unknown }
        | {
            Args: { rast: unknown; scalex: number; scaley: number }
            Returns: unknown
          }
      st_setskew:
        | { Args: { rast: unknown; skew: number }; Returns: unknown }
        | {
            Args: { rast: unknown; skewx: number; skewy: number }
            Returns: unknown
          }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
        | { Args: { rast: unknown; srid: number }; Returns: unknown }
      st_setupperleft: {
        Args: { rast: unknown; upperleftx: number; upperlefty: number }
        Returns: unknown
      }
      st_setvalue:
        | {
            Args: {
              band: number
              newvalue: number
              rast: unknown
              x: number
              y: number
            }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; newvalue: number; rast: unknown }
            Returns: unknown
          }
        | {
            Args: {
              geom: unknown
              nband: number
              newvalue: number
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: { newvalue: number; rast: unknown; x: number; y: number }
            Returns: unknown
          }
      st_setvalues:
        | {
            Args: {
              geomvalset: Database["public"]["CompositeTypes"]["geomval"][]
              keepnodata?: boolean
              nband: number
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              keepnodata?: boolean
              nband: number
              newvalueset: number[]
              noset?: boolean[]
              rast: unknown
              x: number
              y: number
            }
            Returns: unknown
          }
        | {
            Args: {
              keepnodata?: boolean
              nband: number
              newvalueset: number[]
              nosetvalue: number
              rast: unknown
              x: number
              y: number
            }
            Returns: unknown
          }
        | {
            Args: {
              height: number
              keepnodata?: boolean
              nband: number
              newvalue: number
              rast: unknown
              width: number
              x: number
              y: number
            }
            Returns: unknown
          }
        | {
            Args: {
              height: number
              keepnodata?: boolean
              newvalue: number
              rast: unknown
              width: number
              x: number
              y: number
            }
            Returns: unknown
          }
      st_setz: {
        Args: { band?: number; geom: unknown; rast: unknown; resample?: string }
        Returns: unknown
      }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_slope:
        | {
            Args: {
              interpolate_nodata?: boolean
              nband?: number
              pixeltype?: string
              rast: unknown
              scale?: number
              units?: string
            }
            Returns: unknown
          }
        | {
            Args: {
              customextent: unknown
              interpolate_nodata?: boolean
              nband: number
              pixeltype?: string
              rast: unknown
              scale?: number
              units?: string
            }
            Returns: unknown
          }
      st_snaptogrid:
        | {
            Args: {
              algorithm?: string
              gridx: number
              gridy: number
              maxerr?: number
              rast: unknown
              scalex?: number
              scaley?: number
            }
            Returns: unknown
          }
        | {
            Args: {
              algorithm?: string
              gridx: number
              gridy: number
              maxerr?: number
              rast: unknown
              scalex: number
              scaley: number
            }
            Returns: unknown
          }
        | {
            Args: {
              algorithm?: string
              gridx: number
              gridy: number
              maxerr?: number
              rast: unknown
              scalexy: number
            }
            Returns: unknown
          }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_stddev4ma:
        | {
            Args: { args: string[]; matrix: number[]; nodatamode: string }
            Returns: number
          }
        | {
            Args: { pos: number[]; userargs?: string[]; value: number[] }
            Returns: number
          }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_sum4ma:
        | {
            Args: { args: string[]; matrix: number[]; nodatamode: string }
            Returns: number
          }
        | {
            Args: { pos: number[]; userargs?: string[]; value: number[] }
            Returns: number
          }
      st_summary: { Args: { rast: unknown }; Returns: string }
      st_summarystats:
        | {
            Args: { exclude_nodata_value: boolean; rast: unknown }
            Returns: Database["public"]["CompositeTypes"]["summarystats"]
            SetofOptions: {
              from: "*"
              to: "summarystats"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              exclude_nodata_value?: boolean
              nband?: number
              rast: unknown
            }
            Returns: Database["public"]["CompositeTypes"]["summarystats"]
            SetofOptions: {
              from: "*"
              to: "summarystats"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tile:
        | {
            Args: {
              height: number
              nband: number
              nodataval?: number
              padwithnodata?: boolean
              rast: unknown
              width: number
            }
            Returns: unknown[]
          }
        | {
            Args: {
              height: number
              nband: number[]
              nodataval?: number
              padwithnodata?: boolean
              rast: unknown
              width: number
            }
            Returns: unknown[]
          }
        | {
            Args: {
              height: number
              nodataval?: number
              padwithnodata?: boolean
              rast: unknown
              width: number
            }
            Returns: unknown[]
          }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
        | { Args: { rast1: unknown; rast2: unknown }; Returns: boolean }
      st_tpi:
        | {
            Args: {
              interpolate_nodata?: boolean
              nband?: number
              pixeltype?: string
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              customextent: unknown
              interpolate_nodata?: boolean
              nband: number
              pixeltype?: string
              rast: unknown
            }
            Returns: unknown
          }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
        | {
            Args: {
              algorithm?: string
              alignto: unknown
              maxerr?: number
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              algorithm?: string
              maxerr?: number
              rast: unknown
              scalex?: number
              scaley?: number
              srid: number
            }
            Returns: unknown
          }
        | {
            Args: {
              algorithm?: string
              maxerr?: number
              rast: unknown
              scalex: number
              scaley: number
              srid: number
            }
            Returns: unknown
          }
        | {
            Args: {
              algorithm?: string
              maxerr?: number
              rast: unknown
              scalexy: number
              srid: number
            }
            Returns: unknown
          }
      st_tri:
        | {
            Args: {
              interpolate_nodata?: boolean
              nband?: number
              pixeltype?: string
              rast: unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              customextent: unknown
              interpolate_nodata?: boolean
              nband: number
              pixeltype?: string
              rast: unknown
            }
            Returns: unknown
          }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_value:
        | {
            Args: {
              band: number
              exclude_nodata_value?: boolean
              pt: unknown
              rast: unknown
              resample?: string
            }
            Returns: number
          }
        | {
            Args: {
              band: number
              exclude_nodata_value?: boolean
              rast: unknown
              x: number
              y: number
            }
            Returns: number
          }
        | {
            Args: { exclude_nodata_value?: boolean; pt: unknown; rast: unknown }
            Returns: number
          }
        | {
            Args: {
              exclude_nodata_value?: boolean
              rast: unknown
              x: number
              y: number
            }
            Returns: number
          }
      st_valuecount:
        | {
            Args: {
              exclude_nodata_value?: boolean
              nband?: number
              rast: unknown
              roundto?: number
              searchvalues?: number[]
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              exclude_nodata_value: boolean
              nband: number
              rast: unknown
              roundto?: number
              searchvalue: number
            }
            Returns: number
          }
        | {
            Args: {
              nband: number
              rast: unknown
              roundto?: number
              searchvalue: number
            }
            Returns: number
          }
        | {
            Args: {
              nband: number
              rast: unknown
              roundto?: number
              searchvalues: number[]
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: { rast: unknown; roundto?: number; searchvalue: number }
            Returns: number
          }
        | {
            Args: { rast: unknown; roundto?: number; searchvalues: number[] }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              exclude_nodata_value?: boolean
              nband?: number
              rastercolumn: string
              rastertable: string
              roundto?: number
              searchvalues?: number[]
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              exclude_nodata_value: boolean
              nband: number
              rastercolumn: string
              rastertable: string
              roundto?: number
              searchvalue: number
            }
            Returns: number
          }
        | {
            Args: {
              nband: number
              rastercolumn: string
              rastertable: string
              roundto?: number
              searchvalue: number
            }
            Returns: number
          }
        | {
            Args: {
              nband: number
              rastercolumn: string
              rastertable: string
              roundto?: number
              searchvalues: number[]
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              rastercolumn: string
              rastertable: string
              roundto?: number
              searchvalue: number
            }
            Returns: number
          }
        | {
            Args: {
              rastercolumn: string
              rastertable: string
              roundto?: number
              searchvalues: number[]
            }
            Returns: Record<string, unknown>[]
          }
      st_valuepercent:
        | {
            Args: {
              exclude_nodata_value?: boolean
              nband?: number
              rast: unknown
              roundto?: number
              searchvalues?: number[]
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              exclude_nodata_value: boolean
              nband: number
              rast: unknown
              roundto?: number
              searchvalue: number
            }
            Returns: number
          }
        | {
            Args: {
              nband: number
              rast: unknown
              roundto?: number
              searchvalue: number
            }
            Returns: number
          }
        | {
            Args: {
              nband: number
              rast: unknown
              roundto?: number
              searchvalues: number[]
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: { rast: unknown; roundto?: number; searchvalue: number }
            Returns: number
          }
        | {
            Args: { rast: unknown; roundto?: number; searchvalues: number[] }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              exclude_nodata_value?: boolean
              nband?: number
              rastercolumn: string
              rastertable: string
              roundto?: number
              searchvalues?: number[]
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              exclude_nodata_value: boolean
              nband: number
              rastercolumn: string
              rastertable: string
              roundto?: number
              searchvalue: number
            }
            Returns: number
          }
        | {
            Args: {
              nband: number
              rastercolumn: string
              rastertable: string
              roundto?: number
              searchvalue: number
            }
            Returns: number
          }
        | {
            Args: {
              nband: number
              rastercolumn: string
              rastertable: string
              roundto?: number
              searchvalues: number[]
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              rastercolumn: string
              rastertable: string
              roundto?: number
              searchvalue: number
            }
            Returns: number
          }
        | {
            Args: {
              rastercolumn: string
              rastertable: string
              roundto?: number
              searchvalues: number[]
            }
            Returns: Record<string, unknown>[]
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | {
            Args: {
              nband1: number
              nband2: number
              rast1: unknown
              rast2: unknown
            }
            Returns: boolean
          }
        | { Args: { rast1: unknown; rast2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_worldtorastercoord:
        | {
            Args: { latitude: number; longitude: number; rast: unknown }
            Returns: Record<string, unknown>
          }
        | {
            Args: { pt: unknown; rast: unknown }
            Returns: Record<string, unknown>
          }
      st_worldtorastercoordx:
        | { Args: { pt: unknown; rast: unknown }; Returns: number }
        | { Args: { rast: unknown; xw: number }; Returns: number }
        | { Args: { rast: unknown; xw: number; yw: number }; Returns: number }
      st_worldtorastercoordy:
        | { Args: { pt: unknown; rast: unknown }; Returns: number }
        | { Args: { rast: unknown; xw: number; yw: number }; Returns: number }
        | { Args: { rast: unknown; yw: number }; Returns: number }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      updaterastersrid:
        | {
            Args: {
              column_name: unknown
              new_srid: number
              schema_name: unknown
              table_name: unknown
            }
            Returns: boolean
          }
        | {
            Args: {
              column_name: unknown
              new_srid: number
              table_name: unknown
            }
            Returns: boolean
          }
      upsert_entity_geometry_from_geojson: {
        Args: {
          p_entity_id: string
          p_geojson: Json
          p_geometry_type: string
          p_simplified_type?: string
          p_simplify?: boolean
          p_source: string
          p_tolerance?: number
        }
        Returns: undefined
      }
      upsert_entity_geometry_with_geom_geojson: {
        Args: {
          p_bbox?: Json
          p_entity_id: string
          p_geojson: Json
          p_geom_geojson: Json
          p_geometry_type: string
          p_source?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_permission: "channels.delete" | "messages.delete"
      app_role: "admin" | "moderator"
      campaign_type: "Primary" | "Secondary"
      document_status: "active" | "archived"
      document_type:
        | "articles_of_incorporation"
        | "irs_determination_letter"
        | "ein_letter"
        | "bylaws"
        | "conflict_of_interest_policy"
        | "whistleblower_policy"
        | "document_retention_policy"
        | "financial_controls_policy"
        | "expense_reimbursement_policy"
        | "gift_acceptance_policy"
        | "grant_management_policy"
        | "form_990"
        | "state_annual_report"
        | "meeting_minutes"
        | "other"
        | "board_packet"
      document_version_status:
        | "draft"
        | "in_review"
        | "approved"
        | "rejected"
        | "superseded"
      document_visibility: "public" | "internal" | "board_only"
      donation_type: "platform" | "district"
      entity_user_role: "admin" | "editor" | "viewer" | "employee"
      foundation_user_role: "President" | "board member" | "Patron"
      org_type: "district_foundation" | "up_the_ante" | "external_charity"
      user_status: "ONLINE" | "OFFLINE"
    }
    CompositeTypes: {
      addbandarg: {
        index: number | null
        pixeltype: string | null
        initialvalue: number | null
        nodataval: number | null
      }
      agg_count: {
        count: number | null
        nband: number | null
        exclude_nodata_value: boolean | null
        sample_percent: number | null
      }
      agg_samealignment: {
        refraster: unknown
        aligned: boolean | null
      }
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      geomval: {
        geom: unknown
        val: number | null
      }
      rastbandarg: {
        rast: unknown
        nband: number | null
      }
      reclassarg: {
        nband: number | null
        reclassexpr: string | null
        pixeltype: string | null
        nodataval: number | null
      }
      summarystats: {
        count: number | null
        sum: number | null
        mean: number | null
        stddev: number | null
        min: number | null
        max: number | null
      }
      unionarg: {
        nband: number | null
        uniontype: string | null
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
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
  branding: {
    Enums: {
      color_role: ["primary", "secondary", "tertiary", "accent"],
      logo_category: [
        "district_primary",
        "district_secondary",
        "icon",
        "school_logo",
        "community_ed",
        "athletics_primary",
        "athletics_icon",
        "athletics_wordmark",
        "script_wordmark",
        "wings_up",
        "team_logo",
        "brand_pattern",
        "retired",
      ],
      logo_subcategory: [
        "full_color",
        "stacked",
        "horizontal",
        "one_color_white",
        "one_color_black",
        "one_color_red",
        "inverse",
        "pattern_small",
        "pattern_large",
        "other",
      ],
      pattern_type: ["triangle_small", "triangle_large"],
      typography_role: [
        "header1",
        "header2",
        "subheader",
        "body",
        "logo",
        "display",
      ],
    },
  },
  governance: {
    Enums: {
      approval_target_type: ["meeting_minutes", "document_version", "motion"],
      meeting_status: ["scheduled", "in_session", "adjourned", "cancelled"],
      minutes_status: ["draft", "finalized", "amended"],
    },
  },
  public: {
    Enums: {
      app_permission: ["channels.delete", "messages.delete"],
      app_role: ["admin", "moderator"],
      campaign_type: ["Primary", "Secondary"],
      document_status: ["active", "archived"],
      document_type: [
        "articles_of_incorporation",
        "irs_determination_letter",
        "ein_letter",
        "bylaws",
        "conflict_of_interest_policy",
        "whistleblower_policy",
        "document_retention_policy",
        "financial_controls_policy",
        "expense_reimbursement_policy",
        "gift_acceptance_policy",
        "grant_management_policy",
        "form_990",
        "state_annual_report",
        "meeting_minutes",
        "other",
        "board_packet",
      ],
      document_version_status: [
        "draft",
        "in_review",
        "approved",
        "rejected",
        "superseded",
      ],
      document_visibility: ["public", "internal", "board_only"],
      donation_type: ["platform", "district"],
      entity_user_role: ["admin", "editor", "viewer", "employee"],
      foundation_user_role: ["President", "board member", "Patron"],
      org_type: ["district_foundation", "up_the_ante", "external_charity"],
      user_status: ["ONLINE", "OFFLINE"],
    },
  },
} as const
