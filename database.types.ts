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
          font_name: string
          id: string
          role: Database["branding"]["Enums"]["typography_role"]
          updated_at: string | null
          usage_rules: string | null
          weights: Json | null
        }
        Insert: {
          availability?: string | null
          created_at?: string | null
          download_url?: string | null
          entity_id: string
          font_name: string
          id?: string
          role?: Database["branding"]["Enums"]["typography_role"]
          updated_at?: string | null
          usage_rules?: string | null
          weights?: Json | null
        }
        Update: {
          availability?: string | null
          created_at?: string | null
          download_url?: string | null
          entity_id?: string
          font_name?: string
          id?: string
          role?: Database["branding"]["Enums"]["typography_role"]
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
        | "primary_logo"
        | "secondary_logo"
        | "wordmark"
        | "seal"
        | "co_brand"
        | "event"
        | "program"
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
          p_signature_hash?: string
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
          email: string | null
          entity_id: string | null
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
          email?: string | null
          entity_id?: string | null
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
          email?: string | null
          entity_id?: string | null
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
            foreignKeyName: "donations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
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
      entity_attributes: {
        Row: {
          attrs: Json
          entity_id: string
          namespace: string
          updated_at: string
        }
        Insert: {
          attrs?: Json
          entity_id: string
          namespace: string
          updated_at?: string
        }
        Update: {
          attrs?: Json
          entity_id?: string
          namespace?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_attributes_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
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
      entity_source_records: {
        Row: {
          entity_id: string
          external_key: string | null
          fetched_at: string
          payload: Json
          source: string
        }
        Insert: {
          entity_id: string
          external_key?: string | null
          fetched_at?: string
          payload: Json
          source: string
        }
        Update: {
          entity_id?: string
          external_key?: string | null
          fetched_at?: string
          payload?: Json
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_source_records_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_status: {
        Row: {
          entity_id: string
          status: string
          updated_at: string
        }
        Insert: {
          entity_id: string
          status: string
          updated_at?: string
        }
        Update: {
          entity_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_status_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
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
      mde_org_types: {
        Row: {
          code: string
          description: string
          updated_at: string
        }
        Insert: {
          code: string
          description: string
          updated_at?: string
        }
        Update: {
          code?: string
          description?: string
          updated_at?: string
        }
        Relationships: []
      }
      mde_school_class_types: {
        Row: {
          code: string
          description: string
          program_school: string | null
          short_description: string | null
          updated_at: string
        }
        Insert: {
          code: string
          description: string
          program_school?: string | null
          short_description?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          description?: string
          program_school?: string | null
          short_description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mde_states: {
        Row: {
          code: string
          country: string | null
          fips_code: number | null
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          country?: string | null
          fips_code?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          country?: string | null
          fips_code?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
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
          email: string | null
          entity_id: string | null
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
          email?: string | null
          entity_id?: string | null
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
          email?: string | null
          entity_id?: string | null
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
            foreignKeyName: "subscriptions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
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
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
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
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
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
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
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
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
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
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
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
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
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
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
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
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
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
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
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
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
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
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
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
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
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
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
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
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
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
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
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
      upsert_entity_geometry_geojson_only: {
        Args: {
          p_entity_id: string
          p_geojson: Json
          p_geometry_type: string
          p_source?: string
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
      geometry_dump: {
        path: number[] | null
        geom: unknown
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
        "primary_logo",
        "secondary_logo",
        "wordmark",
        "seal",
        "co_brand",
        "event",
        "program",
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
