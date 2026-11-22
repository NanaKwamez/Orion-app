export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRole = "conference" | "district" | "church";
export type ReportStatus = "draft" | "submitted";
export type RequestStatus = "pending" | "approved" | "rejected";
export type RequestType = "add" | "withdraw";
export type DistributionType =
  | "tithe"
  | "systematic"
  | "thanksgiving"
  | "loose"
  | "sabbath_school";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; role: ProfileRole; district_id: string | null; church_id: string | null; display_name: string; created_at: string; updated_at: string };
        Insert: { id: string; role: ProfileRole; district_id?: string | null; church_id?: string | null; display_name?: string; created_at?: string; updated_at?: string };
        Update: { role?: ProfileRole; district_id?: string | null; church_id?: string | null; display_name?: string; updated_at?: string };
        Relationships: [];
      };
      districts: {
        Row: { id: string; name: string; code: string; created_at: string };
        Insert: { id?: string; name: string; code: string; created_at?: string };
        Update: { name?: string; code?: string };
        Relationships: [];
      };
      churches: {
        Row: { id: string; district_id: string; name: string; code: string; created_at: string };
        Insert: { id?: string; district_id: string; name: string; code: string; created_at?: string };
        Update: { district_id?: string; name?: string; code?: string };
        Relationships: [];
      };
      members: {
        Row: { id: string; church_id: string; full_name: string; phone: string | null; gender: "male" | "female" | "other" | null; member_number: string | null; active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; church_id: string; full_name: string; phone?: string | null; gender?: "male" | "female" | "other" | null; member_number?: string | null; active?: boolean; created_at?: string; updated_at?: string };
        Update: { full_name?: string; phone?: string | null; gender?: "male" | "female" | "other" | null; member_number?: string | null; active?: boolean; updated_at?: string };
        Relationships: [];
      };
      member_change_requests: {
        Row: { id: string; church_id: string; member_id: string | null; request_type: RequestType; status: RequestStatus; full_name: string | null; phone: string | null; gender: "male" | "female" | "other" | null; member_number: string | null; reason: string; review_reason: string | null; requested_by: string; reviewed_by: string | null; created_at: string; reviewed_at: string | null };
        Insert: { id?: string; church_id: string; member_id?: string | null; request_type: RequestType; status?: RequestStatus; full_name?: string | null; phone?: string | null; gender?: "male" | "female" | "other" | null; member_number?: string | null; reason: string; review_reason?: string | null; requested_by: string; reviewed_by?: string | null; created_at?: string; reviewed_at?: string | null };
        Update: { status?: RequestStatus; review_reason?: string | null; reviewed_by?: string | null; reviewed_at?: string | null };
        Relationships: [];
      };
      distribution_rules: {
        Row: { id: string; effective_from: string; tithe_conference_pct: number; tithe_district_pct: number; systematic_conference_pct: number; systematic_district_pct: number; thanksgiving_conference_pct: number; thanksgiving_district_pct: number; loose_conference_pct: number; loose_district_pct: number; sabbath_school_conference_pct: number; sabbath_school_district_pct: number; created_by: string | null; created_at: string };
        Insert: { id?: string; effective_from: string; tithe_conference_pct: number; tithe_district_pct: number; systematic_conference_pct: number; systematic_district_pct: number; thanksgiving_conference_pct: number; thanksgiving_district_pct: number; loose_conference_pct: number; loose_district_pct: number; sabbath_school_conference_pct: number; sabbath_school_district_pct: number; created_by?: string | null; created_at?: string };
        Update: never;
        Relationships: [];
      };
      weekly_reports: {
        Row: { id: string; church_id: string; sabbath_date: string; status: ReportStatus; total_tithe: number; total_systematic: number; total_thanksgiving: number; loose_offering: number; sabbath_school_offering: number; submitted_at: string | null; submitted_by: string | null; reopened_at: string | null; reopened_by: string | null; reopen_reason: string | null; reopen_count: number; created_at: string; updated_at: string };
        Insert: { id?: string; church_id: string; sabbath_date: string; status?: ReportStatus; total_tithe?: number; total_systematic?: number; total_thanksgiving?: number; loose_offering?: number; sabbath_school_offering?: number; submitted_at?: string | null; submitted_by?: string | null; reopened_at?: string | null; reopened_by?: string | null; reopen_reason?: string | null; reopen_count?: number; created_at?: string; updated_at?: string };
        Update: { sabbath_date?: string; loose_offering?: number; sabbath_school_offering?: number; updated_at?: string };
        Relationships: [];
      };
      member_contributions: {
        Row: { id: string; report_id: string; member_id: string; tithe: number; systematic_offering: number; thanksgiving: number; created_at: string; updated_at: string };
        Insert: { id?: string; report_id: string; member_id: string; tithe?: number; systematic_offering?: number; thanksgiving?: number; created_at?: string; updated_at?: string };
        Update: { tithe?: number; systematic_offering?: number; thanksgiving?: number; updated_at?: string };
        Relationships: [];
      };
      report_distributions: {
        Row: { id: string; report_id: string; distribution_type: DistributionType; conference_amount: number; district_amount: number; local_amount: number; created_at: string };
        Insert: { id?: string; report_id: string; distribution_type: DistributionType; conference_amount: number; district_amount: number; local_amount: number; created_at?: string };
        Update: never;
        Relationships: [];
      };
      audit_logs: {
        Row: { id: string; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; district_id: string | null; church_id: string | null; metadata: Json; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      v_weekly_church_summary: { Row: { report_id: string; church_id: string; district_id: string; church_name: string; sabbath_date: string; status: ReportStatus; total_tithe: number; total_systematic: number; total_thanksgiving: number; loose_offering: number; sabbath_school_offering: number; conference_amount: number; district_amount: number; local_amount: number; grand_total: number }; Relationships: [] };
      v_weekly_district_summary: { Row: { district_id: string; district_name: string; sabbath_date: string; status: ReportStatus; submitted_reports: number; draft_reports: number; conference_amount: number; district_amount: number; local_amount: number; grand_total: number }; Relationships: [] };
      v_weekly_conference_summary: { Row: { sabbath_date: string; status: ReportStatus; submitted_reports: number; draft_reports: number; conference_amount: number; district_amount: number; local_amount: number; grand_total: number }; Relationships: [] };
      v_missing_reports: { Row: { church_id: string; district_id: string; church_name: string; sabbath_date: string }; Relationships: [] };
    };
    Functions: {
      submit_weekly_report: { Args: { p_report_id: string }; Returns: undefined };
      reopen_weekly_report: { Args: { p_report_id: string; p_reason: string }; Returns: undefined };
      request_member_add: { Args: { p_church_id: string; p_full_name: string; p_phone: string | null; p_gender: "male" | "female" | "other" | null; p_member_number: string | null; p_reason: string }; Returns: string };
      request_member_withdraw: { Args: { p_member_id: string; p_reason: string }; Returns: string };
      review_member_request: { Args: { p_request_id: string; p_action: "approved" | "rejected"; p_review_reason?: string | null }; Returns: undefined };
    };
  };
};
