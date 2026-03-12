export type InspirationKind = "image" | "text" | "link" | "video";

export interface Garden {
  id: string;
  user_id: string;
  name: string;
  cover_url: string | null;
  emoji: string;
  created_at: string;
}

export interface Inspiration {
  id: string;
  user_id: string;
  type: InspirationKind;
  title: string | null;
  content_url: string | null;
  source_url: string | null;
  thumbnail_url: string | null;
  notes: string | null;
  tags: string[];
  is_favorite: boolean;
  is_archived: boolean;
  is_shared: boolean;
  share_token: string | null;
  position: number;
  garden_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspirationInsert {
  user_id: string;
  type: InspirationKind;
  title?: string | null;
  content_url?: string | null;
  source_url?: string | null;
  thumbnail_url?: string | null;
  notes?: string | null;
  tags?: string[];
  is_favorite?: boolean;
}

export interface InspirationUpdate {
  type?: InspirationKind;
  title?: string | null;
  content_url?: string | null;
  source_url?: string | null;
  thumbnail_url?: string | null;
  notes?: string | null;
  tags?: string[];
  is_favorite?: boolean;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  language: "fr" | "en" | null;
  created_at: string;
}

export interface ProfileStats {
  total: number;
  favorites: number;
  topTag: string | null;
  topGarden: string | null;
  firstSeed: string | null;
}

export type FilterKind = InspirationKind | "all" | "favorites";

export type SortKind = "recent" | "oldest" | "favorites-first" | "by-type";

export interface SearchFilters {
  query: string;
  type: FilterKind;
}

export interface Database {
  public: {
    Tables: {
      inspirations: {
        Row: Inspiration;
        Insert: InspirationInsert;
        Update: InspirationUpdate;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
    };
  };
}
