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
      admin_activity_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "admin_activity_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          created_at: string
          end_time: string
          id: string
          meeting_url: string | null
          professional_id: string
          start_time: string
          status: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          meeting_url?: string | null
          professional_id: string
          start_time: string
          status?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          meeting_url?: string | null
          professional_id?: string
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "availability_slots_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      careers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      course_progress: {
        Row: {
          completed_at: string
          course_id: string
          student_id: string
        }
        Insert: {
          completed_at?: string
          course_id: string
          student_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "course_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          asset_paths: string[]
          content: string | null
          created_at: string
          estimated_minutes: number | null
          id: string
          is_published: boolean
          title: string
          topic: string | null
        }
        Insert: {
          asset_paths?: string[]
          content?: string | null
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          is_published?: boolean
          title: string
          topic?: string | null
        }
        Update: {
          asset_paths?: string[]
          content?: string | null
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          is_published?: boolean
          title?: string
          topic?: string | null
        }
        Relationships: []
      }
      guardian_consents: {
        Row: {
          created_at: string
          expires_at: string
          guardian_email: string
          id: string
          student_id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          guardian_email: string
          id?: string
          student_id: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          guardian_email?: string
          id?: string
          student_id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_consents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "guardian_consents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_requests: {
        Row: {
          availability_slot_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          decided_at: string | null
          decline_reason: string | null
          id: string
          message: string | null
          professional_id: string
          reminder_sent_at: string | null
          status: string
          student_id: string
        }
        Insert: {
          availability_slot_id: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          decided_at?: string | null
          decline_reason?: string | null
          id?: string
          message?: string | null
          professional_id: string
          reminder_sent_at?: string | null
          status?: string
          student_id: string
        }
        Update: {
          availability_slot_id?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          decided_at?: string | null
          decline_reason?: string | null
          id?: string
          message?: string | null
          professional_id?: string
          reminder_sent_at?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_requests_availability_slot_id_fkey"
            columns: ["availability_slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_availability_slot_id_fkey"
            columns: ["availability_slot_id"]
            isOneToOne: false
            referencedRelation: "slot_links"
            referencedColumns: ["slot_id"]
          },
          {
            foreignKeyName: "mentorship_requests_availability_slot_id_fkey"
            columns: ["availability_slot_id"]
            isOneToOne: false
            referencedRelation: "upcoming_sessions"
            referencedColumns: ["slot_id"]
          },
          {
            foreignKeyName: "mentorship_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "mentorship_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "mentorship_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          mentorship_request_id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          mentorship_request_id: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          mentorship_request_id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_mentorship_request_id_fkey"
            columns: ["mentorship_request_id"]
            isOneToOne: false
            referencedRelation: "mentorship_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_mentorship_request_id_fkey"
            columns: ["mentorship_request_id"]
            isOneToOne: false
            referencedRelation: "my_conversations"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "messages_mentorship_request_id_fkey"
            columns: ["mentorship_request_id"]
            isOneToOne: false
            referencedRelation: "upcoming_sessions"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_connections: {
        Row: {
          created_at: string
          id: string
          recipient_id: string
          requester_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_id: string
          requester_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          recipient_id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_connections_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "peer_connections_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "peer_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_profiles: {
        Row: {
          bio: string | null
          career_id: string
          credentials_path: string | null
          experience_years: number | null
          rejection_reason: string | null
          user_id: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          bio?: string | null
          career_id: string
          credentials_path?: string | null
          experience_years?: number | null
          rejection_reason?: string | null
          user_id: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          bio?: string | null
          career_id?: string
          credentials_path?: string | null
          experience_years?: number | null
          rejection_reason?: string | null
          user_id?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_profiles_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "professional_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "professional_profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          role_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          is_active?: boolean
          name: string
          role_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          access_level: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          access_level: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          access_level?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      student_career_interests: {
        Row: {
          career_id: string
          student_id: string
        }
        Insert: {
          career_id: string
          student_id: string
        }
        Update: {
          career_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_career_interests_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_career_interests_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_career_interests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "peer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_career_interests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          bio: string | null
          date_of_birth: string
          guardian_consent_at: string | null
          guardian_email: string | null
          notification_prefs: Json
          user_id: string
        }
        Insert: {
          bio?: string | null
          date_of_birth: string
          guardian_consent_at?: string | null
          guardian_email?: string | null
          notification_prefs?: Json
          user_id: string
        }
        Update: {
          bio?: string | null
          date_of_birth?: string
          guardian_consent_at?: string | null
          guardian_email?: string | null
          notification_prefs?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "student_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      career_directory: {
        Row: {
          description: string | null
          id: string | null
          name: string | null
          professional_count: number | null
        }
        Insert: {
          description?: string | null
          id?: string | null
          name?: string | null
          professional_count?: never
        }
        Update: {
          description?: string | null
          id?: string | null
          name?: string | null
          professional_count?: never
        }
        Relationships: []
      }
      my_conversations: {
        Row: {
          last_activity: string | null
          last_message: string | null
          last_message_at: string | null
          last_sender_id: string | null
          other_user_id: string | null
          other_user_name: string | null
          request_id: string | null
          status: string | null
          unread_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["last_sender_id"]
            isOneToOne: false
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["last_sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      my_peer_connections: {
        Row: {
          created_at: string | null
          direction: string | null
          id: string | null
          other_first_name: string | null
          other_id: string | null
          status: string | null
        }
        Relationships: []
      }
      peer_directory: {
        Row: {
          first_name: string | null
          id: string | null
          interest_ids: string[] | null
          interest_names: string[] | null
          shared_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_user_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "student_profiles_user_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_professionals: {
        Row: {
          bio: string | null
          career_id: string | null
          career_name: string | null
          experience_years: number | null
          id: string | null
          name: string | null
          next_open_slot: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_profiles_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_user_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "professional_profiles_user_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_links: {
        Row: {
          meeting_url: string | null
          slot_id: string | null
        }
        Insert: {
          meeting_url?: string | null
          slot_id?: string | null
        }
        Update: {
          meeting_url?: string | null
          slot_id?: string | null
        }
        Relationships: []
      }
      upcoming_sessions: {
        Row: {
          end_time: string | null
          meeting_url: string | null
          professional_id: string | null
          professional_name: string | null
          request_id: string | null
          slot_id: string | null
          start_time: string | null
          student_id: string | null
          student_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "mentorship_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "my_peer_connections"
            referencedColumns: ["other_id"]
          },
          {
            foreignKeyName: "mentorship_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _remove_slot: {
        Args: { p_reason: string; p_slot_id: string }
        Returns: string
      }
      accept_request: { Args: { p_request_id: string }; Returns: undefined }
      admin_delete_slot: { Args: { p_slot_id: string }; Returns: string }
      confirm_guardian_consent: {
        Args: { token_input: string }
        Returns: undefined
      }
      admin_list_professionals: {
        Args: {
          p_career_id?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_status?: string
        }
        Returns: {
          applied_at: string
          bio: string
          career_id: string
          career_name: string
          email: string
          experience_years: number
          has_credentials: boolean
          is_active: boolean
          name: string
          rejection_reason: string
          total_count: number
          user_id: string
          verification_status: string
          verified_at: string
        }[]
      }
      admin_list_reports: {
        Args: { p_page?: number; p_page_size?: number; p_status?: string }
        Returns: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          reporter_name: string
          resolution_notes: string
          resolved_at: string
          status: string
          target_id: string
          target_name: string
          target_type: string
          total_count: number
        }[]
      }
      admin_list_requests: {
        Args: {
          p_career_id?: string
          p_page?: number
          p_page_size?: number
          p_status?: string
        }
        Returns: {
          career_id: string
          career_name: string
          created_at: string
          decided_at: string
          end_time: string
          professional_id: string
          professional_name: string
          request_id: string
          start_time: string
          status: string
          student_id: string
          student_name: string
          total_count: number
        }[]
      }
      admin_list_students: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_status?: string
        }
        Returns: {
          consent_status: string
          courses_completed: number
          created_at: string
          email: string
          id: string
          interest_count: number
          is_active: boolean
          is_minor: boolean
          last_sign_in_at: string
          name: string
          sessions_count: number
          total_count: number
        }[]
      }
      admin_list_users: {
        Args: {
          p_access_level?: string
          p_active?: boolean
          p_desc?: boolean
          p_include_deleted?: boolean
          p_page?: number
          p_page_size?: number
          p_role_id?: string
          p_search?: string
          p_sort?: string
        }
        Returns: {
          access_level: string
          created_at: string
          deleted_at: string
          email: string
          email_confirmed: boolean
          id: string
          is_active: boolean
          last_sign_in_at: string
          name: string
          role_id: string
          role_name: string
          total_count: number
        }[]
      }
      admin_remove_message: {
        Args: { p_message_id: string }
        Returns: undefined
      }
      admin_signups_by_day: {
        Args: { p_days?: number; p_tz?: string }
        Returns: {
          day: string
          professionals: number
          students: number
        }[]
      }
      admin_stats: {
        Args: never
        Returns: {
          admins: number
          awaiting_consent: number
          completed_sessions: number
          course_completions: number
          messages_7d: number
          new_users_7d: number
          open_reports: number
          peer_connections: number
          pending_requests: number
          pending_verifications: number
          professionals: number
          published_courses: number
          students: number
          upcoming_sessions: number
        }[]
      }
      cancel_session: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      close_user_activity: { Args: { p_user_id: string }; Returns: undefined }
      current_access_level: { Args: never; Returns: string }
      decline_request: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      delete_open_slot: { Args: { p_slot_id: string }; Returns: string }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_verified_professional: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_admin_id?: string
          p_details?: Json
          p_target_id?: string
          p_target_type?: string
        }
        Returns: undefined
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      notify: {
        Args: { p_payload?: Json; p_type: string; p_user_id: string }
        Returns: undefined
      }
      reject_professional: {
        Args: { p_reason: string; p_user_id: string }
        Returns: undefined
      }
      request_session: {
        Args: { p_message?: string; p_slot_id: string }
        Returns: string
      }
      resolve_report: {
        Args: { p_notes?: string; p_report_id: string }
        Returns: undefined
      }
      role_has_users: { Args: { p_role_id: string }; Returns: boolean }
      send_session_reminders: { Args: never; Returns: number }
      update_my_student_settings: {
        Args: { p_bio: string; p_interest_ids: string[]; p_prefs: Json }
        Returns: undefined
      }
      user_has_linked_records: { Args: { p_user_id: string }; Returns: boolean }
      verify_professional: { Args: { p_user_id: string }; Returns: undefined }
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
