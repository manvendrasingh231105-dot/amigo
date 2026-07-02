export interface User {
  id: string;
  name: string;
  avatar: string;
  avatarColor: string; // Tailwind class like "from-amber-500 to-orange-600"
  trustScore: number;
  title: string; // e.g., "Campus Legend", "Icebreaker", "Connector", "Social Starter", "Vibe Curator", "Rising Star"
  statusText?: string;
  statusType?: "Studying" | "Bored" | "Exploring" | "Hungry" | "Coding" | "Chilling";
  location?: string;
  timeAgo?: string;
  handshakeState?: "none" | "sent" | "received" | "accepted";
  handshakeMessage?: string;
  pingText?: string;
  email?: string;
  role?: "user" | "admin";
  blocked?: boolean;
  xp?: number;
  level?: number;
  meetsCount?: number;
  bio?: string;
}

export interface Hotspot {
  id: string;
  name: string;
  icon: string; // e.g., 'coffee', 'leaf', 'sun', 'book', 'utensils', 'home'
  activeCount: number;
  limit: number;
  description: string;
  subZones: string[];
  x: number; // percentage coordinate for custom interactive map
  y: number; // percentage coordinate for custom interactive map
}

export interface Event {
  id: string;
  title: string;
  location: string;
  organizer: string;
  rsvps: string[]; // list of user ids
  maxRsvps: number;
  startTime: string;
  isLive: boolean;
  alertSent?: boolean;
}

export interface PrivacySettings {
  ghostMode: boolean;
  autoExpireStatus: boolean;
  showTrustScore: boolean;
  pushNotifications: boolean;
  silentPings: boolean;
}

export interface UserStats {
  meetsCount: number;
  trustScore: number;
  meetsThisWeek: number;
  xp: number;
  level: number;
  title: string;
  bio: string;
}

export interface Achievement {
  id: string;
  title: string;
  icon: string;
  description: string;
  unlocked: boolean;
}
