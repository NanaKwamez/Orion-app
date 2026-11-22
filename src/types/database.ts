export type ProfileRole = "conference" | "district" | "church";
export type MemberStatus = "pending_add" | "active" | "pending_withdrawal" | "withdrawn" | "rejected";
export type RequestStatus = "pending" | "approved" | "rejected";
export type ContributionType = "tithe" | "systematic" | "thanksgiving" | "loose" | "sabbath_school";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string; role: ProfileRole; district_id: string | null; church_id: string | null; is_active: boolean; must_change_password: boolean; created_at: string; updated_at: string };
        Insert: { id: string; full_name: string; role: ProfileRole; district_id?: string | null; church_id?: string | null; is_active?: boolean; must_change_password?: boolean };
        Update: { full_name?: string; role?: ProfileRole; district_id?: string | null; church_id?: string | null; is_active?: boolean; must_change_password?: boolean };
      };
      districts: {
        Row: { id: string; name: string; code: string; is_active: boolean; created_by: string | null; created_at: string };
        Insert: { id?: string; name: string; code: string; is_active?: boolean; created_by?: string | null };
        Update: { name?: string; code?: string; is_active?: boolean };
      };
      churches: {
        Row: { id: string; district_id: string; name: string; code: string; location: string | null; is_active: boolean; created_by: string | null; created_at: string };
        Insert: { id?: string; district_id: string; name: string; code: string; location?: string | null; is_active?: boolean; created_by?: string | null };
        Update: { district_id?: string; name?: string; code?: string; location?: string | null; is_active?: boolean };
      };
      members: {
        Row: { id: string; church_id: string; full_name: string; phone: string | null; gender: "male" | "female" | "other" | null; member_number: string | null; date_joined: string | null; status: MemberStatus; created_by: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; church_id: string; full_name: string; phone?: string | null; gender?: "male" | "female" | "other" | null; member_number?: string | null; date_joined?: string | null; status?: MemberStatus; created_by?: string | null };
        Update: { full_name?: string; phone?: string | null; gender?: "male" | "female" | "other" | null; member_number?: string | null; date_joined?: string | null; status?: MemberStatus };
      };
      member_change_requests: {
        Row: { id: string; church_id: string; member_id: string | null; request_type: "add" | "withdraw"; reason: string; status: RequestStatus; requested_by: string; requested_at: string; reviewed_by: string | null; reviewed_at: string | null; review_note: string | null };
        Insert: { id?: string; church_id: string; member_id?: string | null; request_type: "add" | "withdraw"; reason: string; requested_by: string };
        Update: never;
      };
      distribution_rules: {
        Row: { id: string; contribution_type: ContributionType; conference_pct: number; district_pct: number; local_pct: number; effective_from: string; created_by: string | null; created_at: string };
        Insert: { id?: string; contribution_type: ContributionType; conference_pct: number; district_pct: number; local_pct: number; effective_from: string; created_by?: string | null };
        Update: never;
      };
      weekly_reports: {
        Row: { id: string; church_id: string; sabbath_date: string; status: "draft" | "submitted"; loose_offering: number; sabbath_school_offering: number; notes: string | null; submitted_by: string | null; submitted_at: string | null; reopened_count: number; created_by: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; church_id: string; sabbath_date: string; status?: "draft" | "submitted"; loose_offering?: number; sabbath_school_offering?: number; notes?: string | null; submitted_by?: string | null; submitted_at?: string | null; reopened_count?: number; created_by?: string | null };
        Update: { loose_offering?: number; sabbath_school_offering?: number; notes?: string | null };
      };
      member_contributions: {
        Row: { id: string; report_id: string; member_id: string; tithe: number; systematic: number; thanksgiving: number; created_at: string; updated_at: string };
        Insert: { id?: string; report_id: string; member_id: string; tithe?: number; systematic?: number; thanksgiving?: number };
        Update: { tithe?: number; systematic?: number; thanksgiving?: number };
      };
      report_distributions: {
        Row: { id: string; report_id: string; contribution_type: ContributionType; total_amount: number; conference_amount: number; district_amount: number; local_amount: number; conference_pct: number; district_pct: number; local_pct: number; rule_id: string };
        Insert: never;
        Update: never;
      };
      audit_logs: {
        Row: { id: number; actor_id: string | null; actor_role: string | null; action: string; entity_type: string; entity_id: string | null; church_id: string | null; district_id: string | null; details: Record<string, unknown>; created_at: string };
        Insert: never;
        Update: never;
      };
    };
    Views: {
      v_weekly_church_summary: { Row: { report_id: string; church_id: string; district_id: string; church_name: string; sabbath_date: string; status: "draft" | "submitted"; tithe_total: number; systematic_total: number; thanksgiving_total: number; loose_offering: number; sabbath_school_offering: number; conference_due: number; district_due: number; local_kept: number; grand_total: number } };
      v_weekly_district_summary: { Row: { district_id: string; district_name: string; sabbath_date: string; report_id: string; church_id: string; church_name: string; status: "draft" | "submitted"; conference_due: number; district_due: number; local_kept: number; grand_total: number } };
      v_weekly_conference_summary: { Row: { sabbath_date: string; report_id: string; church_id: string; district_id: string; church_name: string; status: "draft" | "submitted"; conference_due: number; district_due: number; local_kept: number; grand_total: number } };
      v_missing_reports: { Row: { church_id: string; district_id: string; church_name: string; sabbath_date: string } };
    };
    Functions: {
      submit_weekly_report: { Args: { p_report_id: string }; Returns: Record<string, unknown> };
      reopen_weekly_report: { Args: { p_report_id: string; p_reason: string }; Returns: undefined };
      request_member_add: { Args: { p_church_id: string; p_full_name: string; p_phone: string | null; p_gender: "male" | "female" | "other" | null; p_member_number: string | null; p_reason: string }; Returns: string };
      request_member_withdraw: { Args: { p_member_id: string; p_reason: string }; Returns: string };
      review_member_request: { Args: { p_request_id: string; p_approve: boolean; p_note?: string | null }; Returns: undefined };
    };
  };
};
