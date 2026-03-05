export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          stripe_account_id: string | null
          stripe_customer_id: string | null
          kyc_verified: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          username: string
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          kyc_verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          kyc_verified?: boolean
          created_at?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          id: string
          user_id: string
          name: string
          size_bytes: number
          mime_type: string
          storage_path: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          size_bytes: number
          mime_type: string
          storage_path: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          size_bytes?: number
          mime_type?: string
          storage_path?: string
          created_at?: string
        }
        Relationships: []
      }
      links: {
        Row: {
          id: string
          user_id: string
          file_id: string
          slug: string
          title: string
          description: string | null
          preview_url: string | null
          price_amount: number
          price_currency: string
          max_unlocks: number | null
          unlock_count: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_id: string
          slug: string
          title: string
          description?: string | null
          preview_url?: string | null
          price_amount: number
          price_currency?: string
          max_unlocks?: number | null
          unlock_count?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_id?: string
          slug?: string
          title?: string
          description?: string | null
          preview_url?: string | null
          price_amount?: number
          price_currency?: string
          max_unlocks?: number | null
          unlock_count?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          link_id: string
          buyer_email: string
          amount_paid: number
          platform_fee: number
          creator_amount: number
          currency: string
          stripe_session_id: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          link_id: string
          buyer_email: string
          amount_paid: number
          platform_fee: number
          creator_amount: number
          currency: string
          stripe_session_id?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          link_id?: string
          buyer_email?: string
          amount_paid?: number
          platform_fee?: number
          creator_amount?: number
          currency?: string
          stripe_session_id?: string | null
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          id: string
          user_id: string
          amount: number
          currency: string
          stripe_payout_id: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          currency: string
          stripe_payout_id?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          currency?: string
          stripe_payout_id?: string | null
          status?: string
          created_at?: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
