import { Timestamp } from 'firebase/firestore';

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
  isOrganiser?: boolean;
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
  scheduledFor?: string; // ISO date-time string, used for future scheduling/sorting
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

// A real-time meet request between two users, backed by Firestore.
// 'pending': sent, awaiting the recipient's response.
// 'accepted': both users are now in an exclusive active meet.
// (rejected/withdrawn/concluded requests are deleted rather than kept, so
// "does an active request exist" is just "does a doc exist".)
export interface MeetRequest {
  id: string;
  fromId: string;
  fromEmail: string;
  fromName: string;
  toId: string;
  toEmail: string;
  toName: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}

// A single chat message, stored at chats/{meetRequestId}/messages/{id}.
// Only readable/writable by the two participants of that meet request,
// and only while it's still 'accepted' (see firestore.rules).
export interface ChatMessage {
  id: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  text: string;
  timestamp: string;
}

// ===== Polls & Predictions (XP betting) =====
// A poll's option definitions live on the poll doc itself (static labels).
// The XP totals wagered per option live in a SEPARATE subcollection
// (polls/{id}/optionTotals/{optionId}) so they can be updated atomically
// with Firestore's increment() - you can't atomically increment a single
// field inside an array element, only inside a map/subdocument.
export interface PollOption {
  id: string;
  label: string;
}

export interface Poll {
  id: string;
  title: string;
  description?: string;
  options: PollOption[];
  // Live XP pool per option, keyed by optionId - stored directly on the
  // poll doc (not a separate subcollection) so it updates atomically via
  // a single field increment and syncs through the same plain listener
  // that already watches the polls collection - no collectionGroup query
  // involved, which is one less thing that can silently misbehave.
  totals: Record<string, number>;
  status: 'open' | 'closed' | 'resolved';
  winningOptionId?: string;
  createdAt: string;
  createdBy: string; // admin email
  closesAt?: Timestamp | null; // Firestore Timestamp (not a string) - after this, new wagers are rejected server-side even if status still says 'open'
}

// polls/{pollId}/wagers/{userSafeId} - one wager per user per poll.
// Locked in once created; can't be changed or withdrawn.
export interface PollWager {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  optionId: string;
  amount: number;
  createdAt: string;
  payout?: number; // filled in once the poll resolves, if they won
}
