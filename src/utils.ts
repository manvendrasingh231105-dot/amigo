// The single account allowed to grant/revoke admin roles and reposition
// hotspots on the map. Kept here so both CampusWebPortal and AdminConsole
// reference the same value.
export const SUPER_ADMIN_EMAIL = 'manvendrasingh17791@gmail.com';

// Shared gamification helpers.
// Every 200 XP earned levels a user up by 1, starting at Level 1 with 0 XP.
export const XP_PER_LEVEL = 200;

export function computeLevelFromXp(xp: number): number {
  return 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL);
}

// Converts an email into the same safe Firestore document ID format used
// throughout the app (e.g. "john.doe@gmail.com" -> "usr_john_doe_gmail_com").
export function emailToSafeId(email: string): string {
  return 'usr_' + email.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
}
