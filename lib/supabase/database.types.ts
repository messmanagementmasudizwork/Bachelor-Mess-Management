// ============================================================
// Supabase Database Types — manually maintained
// Last updated: 2026-05-21
// Run `supabase gen types typescript --project-id YOUR_ID` to regenerate
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // ─── CORE ────────────────────────────────────────────────
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          email: string | null;
          avatar_url: string | null;
          profession: string | null;
          blood_group: string | null;
          emergency_contact: string | null;
          preferred_language: "bn" | "en";
          ui_theme: "light" | "dark" | "system";
          currency_symbol: string;
          date_format: string;
          time_format: "12h" | "24h";
          is_banned: boolean;
          notification_preferences: Json;
          company: string | null;
          department: string | null;
          designation: string | null;
          job_joining_date: string | null;
          job_id_card_no: string | null;
          pin_hash: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          profession?: string | null;
          blood_group?: string | null;
          emergency_contact?: string | null;
          preferred_language?: "bn" | "en";
          ui_theme?: "light" | "dark" | "system";
          currency_symbol?: string;
          date_format?: string;
          time_format?: "12h" | "24h";
          is_banned?: boolean;
          notification_preferences?: Json;
          company?: string | null;
          department?: string | null;
          designation?: string | null;
          job_joining_date?: string | null;
          job_id_card_no?: string | null;
          pin_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          profession?: string | null;
          blood_group?: string | null;
          emergency_contact?: string | null;
          preferred_language?: "bn" | "en";
          ui_theme?: "light" | "dark" | "system";
          currency_symbol?: string;
          date_format?: string;
          time_format?: "12h" | "24h";
          is_banned?: boolean;
          notification_preferences?: Json;
          company?: string | null;
          department?: string | null;
          designation?: string | null;
          job_joining_date?: string | null;
          job_id_card_no?: string | null;
          pin_hash?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      messes: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          mess_type: "student" | "job_holder" | "family" | "hostel";
          status: "active" | "inactive" | "suspended";
          owner_id: string;
          invite_code: string;
          seat_capacity: number | null;
          description: string | null;
          avatar_url: string | null;
          settings: Json;
          current_month: string;
          is_month_closed: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          mess_type?: "student" | "job_holder" | "family" | "hostel";
          owner_id: string;
          invite_code?: string;
          seat_capacity?: number | null;
          description?: string | null;
          settings?: Json;
          current_month?: string;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          address?: string | null;
          mess_type?: "student" | "job_holder" | "family" | "hostel";
          status?: "active" | "inactive" | "suspended";
          invite_code?: string;
          seat_capacity?: number | null;
          description?: string | null;
          avatar_url?: string | null;
          settings?: Json;
          current_month?: string;
          is_month_closed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ─── MESS SETTINGS (1:1 with messes) ─────────────────────
      mess_settings: {
        Row: {
          mess_id: string;
          meal_cutoff_breakfast: string;
          meal_cutoff_lunch: string;
          meal_cutoff_dinner: string;
          cutoff_days_before: number;
          cutoff_time_mode: "single" | "per_meal";
          cutoff_single_time: string;
          min_deposit_amount: number;
          guest_meal_charge: number;
          late_meal_penalty: number;
          weekly_menu_budget: number;
          allow_guest_meals: boolean;
          require_expense_approval: boolean;
          auto_manager_rotation: boolean;
          manager_rotation_type: "weekly" | "monthly" | "manual";
          notifications_enabled: boolean;
          max_meal_leave_days: number;
          allow_open_leave_presets: boolean;
          currency: string;
          timezone: string;
          show_meal_count_to_members: boolean;
          updated_at: string;
        };
        Insert: {
          mess_id: string;
          meal_cutoff_breakfast?: string;
          meal_cutoff_lunch?: string;
          meal_cutoff_dinner?: string;
          cutoff_days_before?: number;
          cutoff_time_mode?: "single" | "per_meal";
          cutoff_single_time?: string;
          min_deposit_amount?: number;
          guest_meal_charge?: number;
          late_meal_penalty?: number;
          weekly_menu_budget?: number;
          allow_guest_meals?: boolean;
          require_expense_approval?: boolean;
          auto_manager_rotation?: boolean;
          manager_rotation_type?: "weekly" | "monthly" | "manual";
          notifications_enabled?: boolean;
          max_meal_leave_days?: number;
          allow_open_leave_presets?: boolean;
          currency?: string;
          timezone?: string;
          show_meal_count_to_members?: boolean;
          updated_at?: string;
        };
        Update: {
          meal_cutoff_breakfast?: string;
          meal_cutoff_lunch?: string;
          meal_cutoff_dinner?: string;
          cutoff_days_before?: number;
          cutoff_time_mode?: "single" | "per_meal";
          cutoff_single_time?: string;
          min_deposit_amount?: number;
          guest_meal_charge?: number;
          late_meal_penalty?: number;
          weekly_menu_budget?: number;
          allow_guest_meals?: boolean;
          require_expense_approval?: boolean;
          auto_manager_rotation?: boolean;
          manager_rotation_type?: "weekly" | "monthly" | "manual";
          notifications_enabled?: boolean;
          max_meal_leave_days?: number;
          allow_open_leave_presets?: boolean;
          currency?: string;
          timezone?: string;
          show_meal_count_to_members?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mess_settings_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: true;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          }
        ];
      };

      mess_members: {
        Row: {
          id: string;
          mess_id: string;
          user_id: string;
          role: "owner" | "admin" | "manager" | "assistant_manager" | "member" | "guest";
          status: "active" | "inactive" | "on_leave" | "removed";
          account_status: "active" | "frozen" | "banned" | "closed";
          open_leave_started: string | null;
          leave_violation_since: string | null;
          seat_number: number | null;
          joining_date: string;
          leave_start: string | null;
          leave_end: string | null;
          meal_default_breakfast: boolean;
          meal_default_lunch: boolean;
          meal_default_dinner: boolean;
          building: string | null;
          floor_number: string | null;
          room_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          user_id: string;
          role?: "owner" | "admin" | "manager" | "assistant_manager" | "member" | "guest";
          status?: "active" | "inactive" | "on_leave" | "removed";
          account_status?: "active" | "frozen" | "banned" | "closed";
          open_leave_started?: string | null;
          leave_violation_since?: string | null;
          seat_number?: number | null;
          joining_date?: string;
          meal_default_breakfast?: boolean;
          meal_default_lunch?: boolean;
          meal_default_dinner?: boolean;
          building?: string | null;
          floor_number?: string | null;
          room_number?: string | null;
        };
        Update: {
          role?: "owner" | "admin" | "manager" | "assistant_manager" | "member" | "guest";
          status?: "active" | "inactive" | "on_leave" | "removed";
          account_status?: "active" | "frozen" | "banned" | "closed";
          open_leave_started?: string | null;
          leave_violation_since?: string | null;
          seat_number?: number | null;
          leave_start?: string | null;
          leave_end?: string | null;
          meal_default_breakfast?: boolean;
          meal_default_lunch?: boolean;
          meal_default_dinner?: boolean;
          building?: string | null;
          floor_number?: string | null;
          room_number?: string | null;
          updated_at?: string;
          is_current?: boolean;
          end_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "mess_members_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mess_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };

      // ─── MEALS ───────────────────────────────────────────────
      meals: {
        Row: {
          id: string;
          mess_id: string;
          member_id: string;
          date: string;
          breakfast: boolean;
          lunch: boolean;
          dinner: boolean;
          guest_breakfast: number;
          guest_lunch: number;
          guest_dinner: number;
          note: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          vacation_id: string | null;
        };
        Insert: {
          id?: string;
          mess_id: string;
          member_id: string;
          date: string;
          breakfast?: boolean;
          lunch?: boolean;
          dinner?: boolean;
          guest_breakfast?: number;
          guest_lunch?: number;
          guest_dinner?: number;
          note?: string | null;
          created_by?: string | null;
          vacation_id?: string | null;
        };
        Update: {
          breakfast?: boolean;
          lunch?: boolean;
          dinner?: boolean;
          guest_breakfast?: number;
          guest_lunch?: number;
          guest_dinner?: number;
          note?: string | null;
          updated_at?: string;
          vacation_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meals_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meals_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "mess_members";
            referencedColumns: ["id"];
          }
        ];
      };

      // ─── FINANCIALS ──────────────────────────────────────────
      bazaar_entries: {
        Row: {
          id: string;
          mess_id: string;
          expense_id: string;
          date: string;
          amount: number;
          note: string | null;
          shop_name: string | null;
          receipt_url: string | null;
          items: Json;
          month: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          mess_id: string;
          expense_id: string;
          date: string;
          amount: number;
          note?: string | null;
          shop_name?: string | null;
          receipt_url?: string | null;
          items?: Json;
          month: string;
          created_by?: string | null;
        };
        Update: {
          date?: string;
          amount?: number;
          note?: string | null;
          shop_name?: string | null;
          receipt_url?: string | null;
          items?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bazaar_entries_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bazaar_entries_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          }
        ];
      };
      expenses: {
        Row: {
          id: string;
          mess_id: string;
          category: string;
          amount: number;
          title: string;
          note: string | null;
          receipt_url: string | null;
          date: string;
          status: "pending" | "approved" | "rejected";
          split_type: "equal" | "by_meal" | "custom";
          is_variable: boolean;
          approved_by: string | null;
          approved_at: string | null;
          month: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          mess_id: string;
          category: string;
          amount: number;
          title: string;
          note?: string | null;
          receipt_url?: string | null;
          date: string;
          status?: "pending" | "approved" | "rejected";
          split_type?: "equal" | "by_meal" | "custom";
          is_variable?: boolean;
          month: string;
          created_by?: string | null;
        };
        Update: {
          amount?: number;
          title?: string;
          note?: string | null;
          receipt_url?: string | null;
          date?: string;
          status?: "pending" | "approved" | "rejected";
          approved_by?: string | null;
          approved_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          }
        ];
      };
      deposits: {
        Row: {
          id: string;
          mess_id: string;
          member_id: string;
          amount: number;
          payment_method: string;
          transaction_ref: string | null;
          note: string | null;
          date: string;
          status: "pending" | "confirmed" | "rejected";
          confirmed_by: string | null;
          confirmed_at: string | null;
          month: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          mess_id: string;
          member_id: string;
          amount: number;
          payment_method: string;
          transaction_ref?: string | null;
          note?: string | null;
          date: string;
          status?: "pending" | "confirmed" | "rejected";
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          month: string;
          created_by?: string | null;
        };
        Update: {
          amount?: number;
          status?: "pending" | "confirmed" | "rejected";
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deposits_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deposits_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "mess_members";
            referencedColumns: ["id"];
          }
        ];
      };

      // ─── REPORTS ─────────────────────────────────────────────
      member_monthly_snapshots: {
        Row: {
          id: string;
          mess_id: string;
          member_id: string;
          month: string;
          total_meals: number;
          total_breakfast: number;
          total_lunch: number;
          total_dinner: number;
          total_guest_meals: number;
          meal_rate: number;
          meal_cost: number;
          fixed_share: number;
          guest_charges: number;
          total_cost: number;
          total_deposited: number;
          balance: number;
          status: "advance" | "due" | "clear";
          is_final: boolean;
          generated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          member_id: string;
          month: string;
          total_meals?: number;
          total_breakfast?: number;
          total_lunch?: number;
          total_dinner?: number;
          total_guest_meals?: number;
          meal_rate?: number;
          meal_cost?: number;
          fixed_share?: number;
          guest_charges?: number;
          total_cost?: number;
          total_deposited?: number;
          balance?: number;
          status?: "advance" | "due" | "clear";
          is_final?: boolean;
          generated_at?: string;
          updated_at?: string;
        };
        Update: {
          total_meals?: number;
          total_breakfast?: number;
          total_lunch?: number;
          total_dinner?: number;
          total_guest_meals?: number;
          meal_rate?: number;
          meal_cost?: number;
          fixed_share?: number;
          guest_charges?: number;
          total_cost?: number;
          total_deposited?: number;
          balance?: number;
          status?: "advance" | "due" | "clear";
          is_final?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_monthly_snapshots_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_monthly_snapshots_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "mess_members";
            referencedColumns: ["id"];
          }
        ];
      };

      // ─── NOTIFICATIONS & COMMUNICATION ───────────────────────
      admin_notices: {
        Row: {
          id: string;
          mess_id: string;
          title: string;
          body: string;
          notice_type: "notice" | "meeting";
          publish_at: string | null;
          is_published: boolean;
          created_by: string;
          meeting_at: string | null;
          expires_at: string | null;
          reminder_1day_sent: boolean;
          reminder_30min_sent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          title: string;
          body: string;
          notice_type?: "notice" | "meeting";
          publish_at?: string | null;
          is_published?: boolean;
          created_by: string;
          meeting_at?: string | null;
          expires_at?: string | null;
          reminder_1day_sent?: boolean;
          reminder_30min_sent?: boolean;
        };
        Update: {
          title?: string;
          body?: string;
          notice_type?: "notice" | "meeting";
          publish_at?: string | null;
          is_published?: boolean;
          meeting_at?: string | null;
          expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          mess_id: string | null;
          type: "meal_reminder" | "due_reminder" | "expense_added" | "expense_approved" | "deposit_confirmed" | "manager_changed" | "member_joined" | "member_removed" | "month_closed" | "low_balance" | "rule_violation" | "vacation_announced" | "admin_notice" | "system";
          title: string;
          body: string;
          is_read: boolean;
          action_url: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mess_id?: string | null;
          type: "meal_reminder" | "due_reminder" | "expense_added" | "expense_approved" | "deposit_confirmed" | "manager_changed" | "member_joined" | "member_removed" | "month_closed" | "low_balance" | "rule_violation" | "vacation_announced" | "admin_notice" | "system";
          title: string;
          body: string;
          is_read?: boolean;
          action_url?: string | null;
          metadata?: Json | null;
        };
        Update: {
          is_read?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          updated_at?: string;
        };
        Update: {
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      direct_messages: {
        Row: {
          id: string;
          mess_id: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          is_read?: boolean;
          read_at?: string | null;
        };
        Update: {
          is_read?: boolean;
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "direct_messages_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          mess_id: string;
          sender_id: string;
          content: string;
          message_type: "text" | "announcement" | "voice" | "event";
          audio_url: string | null;
          reply_to: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          sender_id: string;
          content: string;
          message_type?: "text" | "announcement" | "voice" | "event";
          audio_url?: string | null;
          reply_to?: string | null;
        };
        Update: {
          content?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          }
        ];
      };

      // ─── AUDIT & HISTORY ─────────────────────────────────────
      audit_logs: {
        Row: {
          id: string;
          mess_id: string | null;
          user_id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_value: Json | null;
          new_value: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          mess_id?: string | null;
          user_id: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          old_value?: Json | null;
          new_value?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      manager_history: {
        Row: {
          id: string;
          mess_id: string;
          member_id: string;
          start_date: string;
          end_date: string | null;
          is_current: boolean;
          handover_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          member_id: string;
          start_date: string;
          end_date?: string | null;
          is_current?: boolean;
          handover_note?: string | null;
        };
        Update: {
          end_date?: string | null;
          is_current?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "manager_history_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "manager_history_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "mess_members";
            referencedColumns: ["id"];
          }
        ];
      };

      // ─── PERMISSIONS ─────────────────────────────────────────
      role_permission_presets: {
        Row: {
          role: string;
          permission_key: string;
          allowed: boolean;
          created_at: string;
        };
        Insert: {
          role: string;
          permission_key: string;
          allowed?: boolean;
        };
        Update: {
          allowed?: boolean;
        };
        Relationships: [];
      };
      mess_role_permissions: {
        Row: {
          id: string;
          mess_id: string;
          role: string;
          permission_key: string;
          allowed: boolean;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          role: string;
          permission_key: string;
          allowed: boolean;
          updated_by?: string | null;
        };
        Update: {
          allowed?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mess_role_permissions_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          }
        ];
      };
      member_permissions: {
        Row: {
          id: string;
          mess_id: string;
          user_id: string;
          permission_key: string;
          allowed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          user_id: string;
          permission_key: string;
          allowed: boolean;
        };
        Update: {
          allowed?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_permissions_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          }
        ];
      };

      // ─── COMMUNITY FEATURES ──────────────────────────────────
      inventory: {
        Row: {
          id: string;
          mess_id: string;
          item_name: string;
          category: string;
          quantity: number;
          unit: string;
          min_threshold: number;
          last_updated: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          item_name: string;
          category: string;
          quantity?: number;
          unit: string;
          min_threshold?: number;
        };
        Update: {
          quantity?: number;
          min_threshold?: number;
          last_updated?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          }
        ];
      };
      polls: {
        Row: {
          id: string;
          mess_id: string;
          created_by: string;
          title: string;
          description: string | null;
          poll_type: "menu_vote" | "manager_selection" | "rule_change" | "general";
          is_anonymous: boolean;
          options: { id: string; text: string }[];
          closes_at: string | null;
          status: "active" | "closed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          created_by: string;
          title: string;
          description?: string | null;
          poll_type?: "menu_vote" | "manager_selection" | "rule_change" | "general";
          is_anonymous?: boolean;
          options: { id: string; text: string }[];
          closes_at?: string | null;
          status?: "active" | "closed";
        };
        Update: {
          title?: string;
          description?: string | null;
          status?: "active" | "closed";
          closes_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "polls_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          }
        ];
      };
      poll_votes: {
        Row: {
          id: string;
          poll_id: string;
          mess_id: string;
          voter_id: string;
          option_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          mess_id: string;
          voter_id: string;
          option_id: string;
        };
        Update: {
          option_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "polls";
            referencedColumns: ["id"];
          }
        ];
      };
      complaints: {
        Row: {
          id: string;
          mess_id: string;
          submitted_by: string;
          assigned_to: string | null;
          title: string;
          description: string;
          category: "food" | "cleaning" | "maintenance" | "member" | "billing" | "other";
          priority: "low" | "medium" | "high" | "urgent";
          status: "open" | "in_progress" | "resolved" | "closed" | "rejected";
          resolution_note: string | null;
          resolved_at: string | null;
          media_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          submitted_by: string;
          assigned_to?: string | null;
          title: string;
          description: string;
          category?: "food" | "cleaning" | "maintenance" | "member" | "billing" | "other";
          priority?: "low" | "medium" | "high" | "urgent";
          status?: "open" | "in_progress" | "resolved" | "closed" | "rejected";
          media_url?: string | null;
        };
        Update: {
          status?: "open" | "in_progress" | "resolved" | "closed" | "rejected";
          priority?: "low" | "medium" | "high" | "urgent";
          assigned_to?: string | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "complaints_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          }
        ];
      };
      notices: {
        Row: {
          id: string;
          mess_id: string;
          created_by: string;
          title: string;
          content: string;
          is_pinned: boolean;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          created_by: string;
          title: string;
          content: string;
          is_pinned?: boolean;
          expires_at?: string | null;
        };
        Update: {
          title?: string;
          content?: string;
          is_pinned?: boolean;
          expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notices_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          }
        ];
      };
      menus: {
        Row: {
          id: string;
          mess_id: string;
          day: string;
          meal: string;
          items: string;
          note: string | null;
          is_special: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          day: string;
          meal: string;
          items: string;
          note?: string | null;
          is_special?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          items?: string;
          note?: string | null;
          is_special?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menus_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          }
        ];
      };
      events: {
        Row: {
          id: string;
          mess_id: string;
          created_by: string;
          title: string;
          description: string | null;
          event_date: string;
          location: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          created_by: string;
          title: string;
          description?: string | null;
          event_date: string;
          location?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          event_date?: string;
          location?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          }
        ];
      };

      // ─── MESS OPERATIONS ─────────────────────────────────────
      mess_vacations: {
        Row: {
          id: string;
          mess_id: string;
          title: string;
          start_date: string;
          end_date: string;
          reason: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          title: string;
          start_date: string;
          end_date: string;
          reason?: string | null;
          created_by: string;
        };
        Update: {
          title?: string;
          start_date?: string;
          end_date?: string;
          reason?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mess_vacations_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          }
        ];
      };
      reactivation_requests: {
        Row: {
          id: string;
          mess_id: string;
          member_id: string;
          proof_text: string | null;
          proof_file_url: string | null;
          status: "pending" | "approved" | "rejected";
          reviewed_by: string | null;
          reviewed_at: string | null;
          reviewer_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          member_id: string;
          proof_text?: string | null;
          proof_file_url?: string | null;
          status?: "pending" | "approved" | "rejected";
          reviewed_by?: string | null;
          reviewer_notes?: string | null;
        };
        Update: {
          status?: "pending" | "approved" | "rejected";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reviewer_notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reactivation_requests_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reactivation_requests_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "mess_members";
            referencedColumns: ["id"];
          }
        ];
      };

      // ─── PLATFORM / SUPER-ADMIN ──────────────────────────────
      platform_announcements: {
        Row: {
          id: string;
          title: string;
          body: string;
          target_type: "all" | "mess" | "role";
          target_id: string | null;
          target_role: string | null;
          sent_by: string;
          sent_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          target_type?: "all" | "mess" | "role";
          target_id?: string | null;
          target_role?: string | null;
          sent_by: string;
          is_active?: boolean;
        };
        Update: {
          title?: string;
          body?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          key: string;
          value: string;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
          description?: string | null;
        };
        Update: {
          value?: string;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          slug: string;
          price_monthly: number;
          price_yearly: number;
          max_members: number | null;
          max_messes: number | null;
          features: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          price_monthly?: number;
          price_yearly?: number;
          max_members?: number | null;
          max_messes?: number | null;
          features?: string[];
          is_active?: boolean;
        };
        Update: {
          name?: string;
          price_monthly?: number;
          price_yearly?: number;
          max_members?: number | null;
          max_messes?: number | null;
          features?: string[];
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      mess_subscriptions: {
        Row: {
          id: string;
          mess_id: string;
          plan_id: string;
          status: "active" | "cancelled" | "expired" | "trial";
          started_at: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          mess_id: string;
          plan_id: string;
          status?: "active" | "cancelled" | "expired" | "trial";
          started_at?: string;
          expires_at?: string | null;
        };
        Update: {
          status?: "active" | "cancelled" | "expired" | "trial";
          expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "mess_subscriptions_mess_id_fkey";
            columns: ["mess_id"];
            isOneToOne: false;
            referencedRelation: "messes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mess_subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          }
        ];
      };
    };

    // ─── VIEWS ───────────────────────────────────────────────
    Views: {
      member_balances: {
        Row: {
          member_id: string;
          mess_id: string;
          month: string;
          total_deposited: number;
          total_meal_cost: number;
          total_fixed_share: number;
          total_cost: number;
          balance: number;
        };
        Relationships: [];
      };
      daily_meal_summary: {
        Row: {
          mess_id: string;
          date: string;
          total_breakfast: number;
          total_lunch: number;
          total_dinner: number;
          total_guest: number;
          total_meals: number;
        };
        Relationships: [];
      };
      monthly_expense_summary: {
        Row: {
          mess_id: string;
          month: string;
          total_variable: number;
          total_fixed: number;
          total_expense: number;
          meal_rate: number;
        };
        Relationships: [];
      };
    };

    // ─── FUNCTIONS ───────────────────────────────────────────
    Functions: {
      calculate_meal_rate: {
        Args: { p_mess_id: string; p_month: string };
        Returns: number;
      };
      close_month: {
        Args: { p_mess_id: string; p_month: string; p_user_id: string };
        Returns: boolean;
      };
      get_member_balance: {
        Args: { p_member_id: string; p_mess_id: string; p_month: string };
        Returns: {
          total_deposited: number;
          total_cost: number;
          balance: number;
          due_amount: number;
        };
      };
      join_mess_by_invite: {
        Args: { p_invite_code: string; p_user_id: string };
        Returns: string;
      };
      generate_invite_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_action_pin_set: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      set_action_pin: {
        Args: { p_pin: string };
        Returns: undefined;
      };
      verify_action_pin: {
        Args: { p_pin: string };
        Returns: boolean;
      };
      remove_action_pin: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };

    // ─── ENUMS ───────────────────────────────────────────────
    Enums: {
      mess_type: "student" | "job_holder" | "family" | "hostel";
      member_role: "owner" | "admin" | "manager" | "assistant_manager" | "member" | "guest";
      member_status: "active" | "inactive" | "on_leave" | "removed";
      expense_status: "pending" | "approved" | "rejected";
      deposit_status: "pending" | "confirmed" | "rejected";
      payment_method: "cash" | "bkash" | "nagad" | "rocket" | "bank_transfer" | "other";
    };
  };
}
