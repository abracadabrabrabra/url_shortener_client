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

export interface UserStats {
  total_links: number;
  total_clicks: number;
  clicks_today: number;
  clicks_this_month: number;
}

export interface DailyClicks {
  date: string;
  clicks: number;
}

export interface LinkAnalytics {
  short_key: string;
  short_url: string;
  original_url: string;
  total_clicks: number;
  unique_clicks: number;
  average_per_day: number;
  last_click_at: string | null;
  created_at: string;
  is_active: boolean;
  daily_clicks: DailyClicks[];
  comparison: {
    total_clicks_percent: number;
    unique_clicks_percent: number;
    average_per_day_percent: number;
  };
}
