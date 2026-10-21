
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "admin_activity_log": {
                  Row: {
                    "action": string,"admin_id": string | null,"created_at": string,"details": NonNullable<Json>,"id": string,"target_id": string | null,"target_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"admin_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Update: {
                    "action"?: string,"admin_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_activity_log_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"availability_slots": {
                  Row: {
                    "created_at": string,"end_time": string,"id": string,"meeting_url": string | null,"professional_id": string,"start_time": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"end_time": string,"id"?: string,"meeting_url"?: string | null,"professional_id": string,"start_time": string,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"end_time"?: string,"id"?: string,"meeting_url"?: string | null,"professional_id"?: string,"start_time"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_slots_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"careers": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"course_progress": {
                  Row: {
                    "completed_at": string,"course_id": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string,"course_id": string,"student_id": string
                  }
                  Update: {
                    "completed_at"?: string,"course_id"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "course_progress_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "course_progress_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"courses": {
                  Row: {
                    "asset_paths": (string)[],"content": string | null,"created_at": string,"estimated_minutes": number | null,"id": string,"is_published": boolean,"title": string,"topic": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "asset_paths"?: (string)[],"content"?: string | null,"created_at"?: string,"estimated_minutes"?: number | null,"id"?: string,"is_published"?: boolean,"title": string,"topic"?: string | null
                  }
                  Update: {
                    "asset_paths"?: (string)[],"content"?: string | null,"created_at"?: string,"estimated_minutes"?: number | null,"id"?: string,"is_published"?: boolean,"title"?: string,"topic"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"guardian_consents": {
                  Row: {
                    "created_at": string,"expires_at": string,"guardian_email": string,"id": string,"student_id": string,"token_hash": string,"used_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at": string,"guardian_email": string,"id"?: string,"student_id": string,"token_hash": string,"used_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"guardian_email"?: string,"id"?: string,"student_id"?: string,"token_hash"?: string,"used_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "guardian_consents_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"mentorship_requests": {
                  Row: {
                    "availability_slot_id": string,"cancel_reason": string | null,"created_at": string,"decided_at": string | null,"decline_reason": string | null,"id": string,"message": string | null,"professional_id": string,"status": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "availability_slot_id": string,"cancel_reason"?: string | null,"created_at"?: string,"decided_at"?: string | null,"decline_reason"?: string | null,"id"?: string,"message"?: string | null,"professional_id": string,"status"?: string,"student_id": string
                  }
                  Update: {
                    "availability_slot_id"?: string,"cancel_reason"?: string | null,"created_at"?: string,"decided_at"?: string | null,"decline_reason"?: string | null,"id"?: string,"message"?: string | null,"professional_id"?: string,"status"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mentorship_requests_availability_slot_id_fkey"
      columns: ["availability_slot_id"]
isOneToOne: false
      referencedRelation: "availability_slots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentorship_requests_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentorship_requests_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string,"created_at": string,"deleted_at": string | null,"id": string,"mentorship_request_id": string,"read_at": string | null,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"mentorship_request_id": string,"read_at"?: string | null,"sender_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"mentorship_request_id"?: string,"read_at"?: string | null,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_mentorship_request_id_fkey"
      columns: ["mentorship_request_id"]
isOneToOne: false
      referencedRelation: "mentorship_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"id": string,"payload": NonNullable<Json>,"read_at": string | null,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"type": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"peer_connections": {
                  Row: {
                    "created_at": string,"id": string,"recipient_id": string,"requester_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"recipient_id": string,"requester_id": string,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"recipient_id"?: string,"requester_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "peer_connections_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "peer_connections_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"professional_profiles": {
                  Row: {
                    "bio": string | null,"career_id": string,"credentials_path": string | null,"experience_years": number | null,"rejection_reason": string | null,"user_id": string,"verification_status": string,"verified_at": string | null,"verified_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bio"?: string | null,"career_id": string,"credentials_path"?: string | null,"experience_years"?: number | null,"rejection_reason"?: string | null,"user_id": string,"verification_status"?: string,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Update: {
                    "bio"?: string | null,"career_id"?: string,"credentials_path"?: string | null,"experience_years"?: number | null,"rejection_reason"?: string | null,"user_id"?: string,"verification_status"?: string,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "professional_profiles_career_id_fkey"
      columns: ["career_id"]
isOneToOne: false
      referencedRelation: "careers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "professional_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "professional_profiles_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"id": string,"is_active": boolean,"name": string,"role_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"id": string,"is_active"?: boolean,"name": string,"role_id": string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"role_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"id": string,"reason": string,"reporter_id": string,"resolution_notes": string | null,"resolved_at": string | null,"resolved_by": string | null,"status": string,"target_id": string,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"reason": string,"reporter_id": string,"resolution_notes"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"target_id": string,"target_type": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"reason"?: string,"reporter_id"?: string,"resolution_notes"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"target_id"?: string,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"roles": {
                  Row: {
                    "access_level": string,"created_at": string,"description": string | null,"id": string,"is_system": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_level": string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_system"?: boolean,"name": string
                  }
                  Update: {
                    "access_level"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_system"?: boolean,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"student_career_interests": {
                  Row: {
                    "career_id": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "career_id": string,"student_id": string
                  }
                  Update: {
                    "career_id"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_career_interests_career_id_fkey"
      columns: ["career_id"]
isOneToOne: false
      referencedRelation: "careers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_career_interests_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"student_profiles": {
                  Row: {
                    "bio": string | null,"date_of_birth": string,"guardian_consent_at": string | null,"guardian_email": string | null,"notification_prefs": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bio"?: string | null,"date_of_birth": string,"guardian_consent_at"?: string | null,"guardian_email"?: string | null,"notification_prefs"?: NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "bio"?: string | null,"date_of_birth"?: string,"guardian_consent_at"?: string | null,"guardian_email"?: string | null,"notification_prefs"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "current_access_level":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_active_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
