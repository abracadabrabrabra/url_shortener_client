export interface User {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface Link {
  short_key: string;
  original_url: string;
  short_url: string;
  user_id: number | null;
  clicks_count?: number;
  created_at?: string;
}