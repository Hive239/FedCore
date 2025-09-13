// Database types for Project Pro
// Based on the CoreIQ/Project Pro database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      user_tenants: {
        Row: {
          id: string
          user_id: string
          tenant_id: string
          role: 'owner' | 'admin' | 'member'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id: string
          role: 'owner' | 'admin' | 'member'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          status: 'new' | 'on-track' | 'delayed' | 'on-hold' | 'completed'
          budget: number | null
          start_date: string | null
          end_date: string | null
          association_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          status?: 'new' | 'on-track' | 'delayed' | 'on-hold' | 'completed'
          budget?: number | null
          start_date?: string | null
          end_date?: string | null
          association_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          status?: 'new' | 'on-track' | 'delayed' | 'on-hold' | 'completed'
          budget?: number | null
          start_date?: string | null
          end_date?: string | null
          association_id?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          tenant_id: string
          project_id: string | null
          title: string
          description: string | null
          status: 'pending' | 'in-progress' | 'review' | 'completed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          due_date: string | null
          assignee_id: string | null
          category_id: string | null
          position: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          project_id?: string | null
          title: string
          description?: string | null
          status?: 'pending' | 'in-progress' | 'review' | 'completed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          assignee_id?: string | null
          category_id?: string | null
          position?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          project_id?: string | null
          title?: string
          description?: string | null
          status?: 'pending' | 'in-progress' | 'review' | 'completed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          assignee_id?: string | null
          category_id?: string | null
          position?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          file_path: string
          file_size: number
          mime_type: string
          category_id: string | null
          project_id: string | null
          vendor_id: string | null
          expiry_date: string | null
          version: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          file_path: string
          file_size: number
          mime_type: string
          category_id?: string | null
          project_id?: string | null
          vendor_id?: string | null
          expiry_date?: string | null
          version?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          file_path?: string
          file_size?: number
          mime_type?: string
          category_id?: string | null
          project_id?: string | null
          vendor_id?: string | null
          expiry_date?: string | null
          version?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      vendors: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          category_id: string | null
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          address: string | null
          rating: number | null
          status: 'active' | 'inactive' | 'pending'
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          category_id?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          rating?: number | null
          status?: 'active' | 'inactive' | 'pending'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          category_id?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          rating?: number | null
          status?: 'active' | 'inactive' | 'pending'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          tenant_id: string
          title: string
          description: string | null
          start_date: string
          end_date: string
          all_day: boolean
          location: string | null
          category_id: string | null
          project_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          title: string
          description?: string | null
          start_date: string
          end_date: string
          all_day?: boolean
          location?: string | null
          category_id?: string | null
          project_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          title?: string
          description?: string | null
          start_date?: string
          end_date?: string
          all_day?: boolean
          location?: string | null
          category_id?: string | null
          project_id?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      associations: {
        Row: {
          id: string
          tenant_id: string
          name: string
          address: string | null
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          address?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          address?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          tenant_id: string
          name: string
          type: 'task' | 'project' | 'document' | 'event' | 'vendor'
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          type: 'task' | 'project' | 'document' | 'event' | 'vendor'
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          type?: 'task' | 'project' | 'document' | 'event' | 'vendor'
          color?: string | null
          created_at?: string
        }
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
  }
}

// Type aliases for easier use
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience types
export type Tenant = Tables<'tenants'>
export type UserTenant = Tables<'user_tenants'>
export type Project = Tables<'projects'>
export type Task = Tables<'tasks'>
export type Document = Tables<'documents'>
export type Vendor = Tables<'vendors'>
export type Event = Tables<'events'>
export type Association = Tables<'associations'>
export type Category = Tables<'categories'>