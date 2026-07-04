import React, { useState, useEffect } from 'react';
import { User, Hotspot, Event, PrivacySettings, UserStats, MeetRequest, ChatMessage } from './types';
import CampusWebPortal from './components/CampusWebPortal';
import AuthGate from './components/AuthGate';
import { Info, Wifi, BookOpen, Layers, LogOut, Key, ShieldCheck } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, writeBatch, getDoc, query, orderBy } from 'firebase/firestore';
import { computeLevelFromXp, emailToSafeId } from './utils';

export default function App() {
  // Firebase Authentication State Tracking
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Gmail Authorization & Google SSO Session State
  const [sessionUser, setSessionUser] = useState<{
    email: string;
    name: string;
    role: 'user' | 'admin';
    meta: Record<string, string>;
  } | null>(() => {
    try {
      const cached = localStorage.getItem('amigo_session');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Track Firebase Auth State transitions and align sessions securely
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsAuthChecking(false);
      
      if (!user) {
        // Clear any orphaned manual session if authentication states don't check out
        localStorage.removeItem('amigo_session');
        setSessionUser(null);
      } else {
        // Restore local session if logged in on Firebase but local caches got purged or delayed
        const cached = localStorage.getItem('amigo_session');
        if (!cached) {
          const safeId = 'usr_' + user.email?.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
          getDoc(doc(db, 'users', safeId)).then((snap) => {
            if (snap.exists()) {
              const uData = snap.data();
              const newUser = {
                email: user.email || '',
                name: uData.name || user.displayName || 'Google Student',
                role: (uData.role as 'user' | 'admin') || 'user',
                meta: uData.meta || {}
              };
              localStorage.setItem('amigo_session', JSON.stringify(newUser));
              setSessionUser(newUser);
            }
          }).catch(err => {
            console.error("Failed to fetch user record to align session state:", err);
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);


  const handleLogin = (email: string, name: string, role: 'user' | 'admin', meta: Record<string, string>) => {
    const newUser = { email, name, role, meta };
    localStorage.setItem('amigo_session', JSON.stringify(newUser));
    setSessionUser(newUser);
  };

  const handleLogout = () => {
    auth.signOut().catch(e => console.error("Firebase auth logout issue:", e));
    localStorage.removeItem('amigo_session');
    setSessionUser(null);
    setFirebaseUser(null);
    setStatsLoaded(false);
    setStats({
      meetsCount: 0,
      trustScore: 0,
      meetsThisWeek: 0,
      xp: 0,
      level: 1,
      title: 'Newcomer',
      bio: ''
    });
  };

  // Pre-populated high-quality realistic campus student mock data reflecting Screenshot 7
  const [users, setUsers] = useState<User[]>([
    {
      id: 'usr-priya',
      name: 'Priya Sharma',
      avatar: 'PS',
      avatarColor: 'from-amber-400 to-orange-500',
      trustScore: 4.7,
      title: 'Campus Legend',
      statusText: 'Anyone want to discuss machine learning papers?',
      statusType: 'Studying',
      location: 'Library Balcony',
      timeAgo: '59m'
    },
    {
      id: 'usr-arjun',
      name: 'Arjun Mehta',
      avatar: 'AM',
      avatarColor: 'from-emerald-400 to-teal-500',
      trustScore: 4.2,
      title: 'Icebreaker',
      statusText: 'Bored and up for any conversation',
      statusType: 'Bored',
      location: 'Campus Canteen',
      timeAgo: '29m'
    },
    {
      id: 'usr-nisha',
      name: 'Nisha Patel',
      avatar: 'NP',
      avatarColor: 'from-purple-500 to-indigo-500',
      trustScore: 4.9,
      title: 'Connector',
      statusText: 'Looking for someone to explore the garden with',
      statusType: 'Exploring',
      location: 'Garden Lawn',
      timeAgo: '44m'
    },
    {
      id: 'usr-rohan',
      name: 'Rohan Kumar',
      avatar: 'RK',
      avatarColor: 'from-rose-400 to-pink-500',
      trustScore: 3.8,
      title: 'Social Starter',
      statusText: 'Hungry — does anyone want to grab a bite?',
      statusType: 'Hungry',
      location: 'Campus Canteen',
      timeAgo: '14m'
    },
    {
      id: 'usr-kavya',
      name: 'Kavya Reddy',
      avatar: 'KR',
      avatarColor: 'from-sky-400 to-blue-500',
      trustScore: 4.5,
      title: 'Vibe Curator',
      statusText: 'Enjoying premium coffee and writing some hooks',
      statusType: 'Studying',
      location: 'Campus Canteen',
      timeAgo: '2m'
    }
  ]);

  // Pre-populated Hotspots mirroring screenshots (book cup leaves utensils)
  const [hotspots, setHotspots] = useState<Hotspot[]>([
    { id: 'spot-coffee', name: 'Campus Canteen', icon: 'coffee', activeCount: 3, limit: 10, description: 'Coffee block & canteen rooms', subZones: ['Table 12', 'Window Seat'], x: 25, y: 72 },
    { id: 'spot-leaf', name: 'Garden Lawn', icon: 'leaf', activeCount: 1, limit: 5, description: 'Open garden fields', subZones: ['Foliage path', 'East Lawn'], x: 32, y: 30 },
    { id: 'spot-book', name: 'Library Balcony', icon: 'book', activeCount: 1, limit: 4, description: 'Quiet research balcony', subZones: ['Study Room C', 'Balcony Corner'], x: 60, y: 28 },
    { id: 'spot-utensils', name: 'Campus Diner', icon: 'utensils', activeCount: 0, limit: 6, description: 'Commercial hot food canteen', subZones: ['Main Counter'], x: 44, y: 55 },
    { id: 'spot-home', name: 'Common Room', icon: 'home', activeCount: 0, limit: 12, description: 'Residential hallway lounge', subZones: ['Couch Area'], x: 65, y: 78 }
  ]);

  // Interconnected Events lists
  const [events, setEvents] = useState<Event[]>([
    {
      id: 'evt-1',
      title: 'Generative AI Meetup',
      location: 'Library Balcony',
      organizer: 'AI Society',
      rsvps: ['usr-priya'],
      maxRsvps: 15,
      startTime: 'Today, 15:00',
      isLive: true
    }
  ]);

  // Real-time meet requests between two users (pending -> accepted, or
  // deleted on reject/withdraw/conclude).
  const [meetRequests, setMeetRequests] = useState<MeetRequest[]>([]);

  // Simulating administrative alerts pushed live across WS STOMP pings
  const [broadcastAlert, setBroadcastAlert] = useState<string | null>(null);
  // Private feedback for admin actions (e.g. "User blocked.") - NOT the
  // same as broadcastAlert, which is a public campus-wide banner.
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  // Settings configs
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    ghostMode: false,
    autoExpireStatus: true,
    showTrustScore: true,
    pushNotifications: shadowStatePushNotifications(),
    silentPings: false
  });

  function shadowStatePushNotifications() {
    return true;
  }

  // Live gamification statistics module
  const [stats, setStats] = useState<UserStats>({
    meetsCount: 0,
    trustScore: 0,
    meetsThisWeek: 0,
    xp: 0,
    level: 1,
    title: 'Newcomer',
    bio: ''
  });

  // Tracks whether we've loaded this user's real stats from Firestore yet,
  // so we don't overwrite their saved progress with defaults or write too early
  const [statsLoaded, setStatsLoaded] = useState(false);

  // Toggle left workspace layouts
  const [leftTab, setLeftTab] = useState<'specs' | 'admin'>('specs');

  // Omni-channel State Synchronization for both Simulator and Web Version
  const [currentMyStatus, setCurrentMyStatus] = useState<{ text: string; type: string; hotspotId?: string } | null>(null);
  // Real-time chat messages for the current active accepted meet, if any.
  // Re-subscribed automatically whenever the active meet changes (see the
  // effect further below that watches meetRequests + sessionUser).
  const [activeChatMessages, setActiveChatMessages] = useState<ChatMessage[]>([]);
  const [waitlistedSpotIds, setWaitlistedSpotIds] = useState<string[]>([]);

  // Firestore Synchronization
  useEffect(() => {
    if (!sessionUser || !firebaseUser) return;

    // 1. Snapshot Listener for Users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      if (snapshot.empty) {
        const batch = writeBatch(db);
        const initialUsers = [
          { id: 'usr_priya_sharma_gmail_com', name: 'Priya Sharma', avatar: 'PS', avatarColor: 'from-amber-400 to-orange-500', trustScore: 4.7, title: 'Campus Legend', statusText: 'Anyone want to discuss machine learning papers?', statusType: 'Studying', location: 'Library Balcony', timeAgo: '59m', email: 'priya.sharma@gmail.com' },
          { id: 'usr_arjun_mehta_gmail_com', name: 'Arjun Mehta', avatar: 'AM', avatarColor: 'from-emerald-400 to-teal-500', trustScore: 4.2, title: 'Icebreaker', statusText: 'Bored and up for any conversation', statusType: 'Bored', location: 'Campus Canteen', timeAgo: '29m', email: 'arjun.mehta@gmail.com' },
          { id: 'usr_nisha_patel_gmail_com', name: 'Nisha Patel', avatar: 'NP', avatarColor: 'from-purple-500 to-indigo-500', trustScore: 4.9, title: 'Connector', statusText: 'Looking for someone to explore the garden with', statusType: 'Exploring', location: 'Garden Lawn', timeAgo: '44m', email: 'nisha.patel@gmail.com' },
          { id: 'usr_rohan_kumar_gmail_com', name: 'Rohan Kumar', avatar: 'RK', avatarColor: 'from-rose-400 to-pink-500', trustScore: 3.8, title: 'Social Starter', statusText: 'Hungry — does anyone want to grab a bite?', statusType: 'Hungry', location: 'Campus Canteen', timeAgo: '14m', email: 'rohan.kumar@gmail.com' },
          { id: 'usr_kavya_reddy_gmail_com', name: 'Kavya Reddy', avatar: 'KR', avatarColor: 'from-sky-400 to-blue-500', trustScore: 4.5, title: 'Vibe Curator', statusText: 'Enjoying premium coffee and writing some hooks', statusType: 'Studying', location: 'Campus Canteen', timeAgo: '2m', email: 'kavya.reddy@gmail.com' }
        ];
        initialUsers.forEach((u) => {
          batch.set(doc(db, 'users', u.id), u);
        });
        batch.commit().catch(e => console.error("Error seeding users list:", e));
      } else {
        const list: User[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as User);
        });
        setUsers(list);

        // If an admin blocks this user while they're mid-session, sign them
        // out immediately rather than waiting for their next login attempt.
        if (sessionUser) {
          const me = list.find(u => u.email?.toLowerCase() === sessionUser.email.toLowerCase());
          if (me?.blocked) {
            showAdminNotice('Your account has been blocked by an administrator.');
            handleLogout();
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // 2. Snapshot Listener for Hotspots
    const unsubscribeHotspots = onSnapshot(collection(db, 'hotspots'), (snapshot) => {
      if (snapshot.empty) {
        const batch = writeBatch(db);
        const initialHotspots = [
          { id: 'spot-coffee', name: 'Campus Canteen', icon: 'coffee', activeCount: 3, limit: 10, description: 'Coffee block & canteen rooms', subZones: ['Table 12', 'Window Seat'], x: 25, y: 72 },
          { id: 'spot-leaf', name: 'Garden Lawn', icon: 'leaf', activeCount: 1, limit: 5, description: 'Open garden fields', subZones: ['Foliage path', 'East Lawn'], x: 32, y: 30 },
          { id: 'spot-book', name: 'Library Balcony', icon: 'book', activeCount: 1, limit: 4, description: 'Quiet research balcony', subZones: ['Study Room C', 'Balcony Corner'], x: 60, y: 28 },
          { id: 'spot-utensils', name: 'Campus Diner', icon: 'utensils', activeCount: 0, limit: 6, description: 'Commercial hot food canteen', subZones: ['Main Counter'], x: 44, y: 55 },
          { id: 'spot-home', name: 'Common Room', icon: 'home', activeCount: 0, limit: 12, description: 'Residential hallway lounge', subZones: ['Couch Area'], x: 65, y: 78 }
        ];
        initialHotspots.forEach((h) => {
          batch.set(doc(db, 'hotspots', h.id), h);
        });
        batch.commit().catch(e => console.error("Error seeding hotspots:", e));
      } else {
        const list: Hotspot[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as Hotspot);
        });
        list.sort((a, b) => a.id.localeCompare(b.id));
        setHotspots(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'hotspots');
    });

    // 3. Snapshot Listener for Events
    const unsubscribeEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      if (snapshot.empty) {
        const initialEvents = [
          {
            id: 'evt-1',
            title: 'Generative AI Meetup',
            location: 'Library Balcony',
            organizer: 'AI Society',
            rsvps: ['usr-priya'],
            maxRsvps: 15,
            startTime: 'Today, 15:00',
            isLive: true
          }
        ];
        const batch = writeBatch(db);
        initialEvents.forEach((ev) => {
          batch.set(doc(db, 'events', ev.id), ev);
        });
        batch.commit().catch(e => console.error("Error seeding core events:", e));
      } else {
        const list: Event[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as Event);
        });
        setEvents(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });

    const unsubscribeMeetRequests = onSnapshot(collection(db, 'meetRequests'), (snapshot) => {
      const list: MeetRequest[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as MeetRequest);
      });
      setMeetRequests(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'meetRequests');
    });

    return () => {
      unsubscribeUsers();
      unsubscribeHotspots();
      unsubscribeEvents();
      unsubscribeMeetRequests();
    };
  }, [sessionUser, firebaseUser]);

  // Whenever the user's active accepted meet changes (starts, ends, or
  // switches), re-subscribe to that meet's chat thread. Firestore rules
  // ensure only the two participants can actually read/write these.
  useEffect(() => {
    if (!sessionUser) {
      setActiveChatMessages([]);
      return;
    }
    const myEmail = sessionUser.email.toLowerCase();
    const activeMeet = meetRequests.find(r =>
      r.status === 'accepted' && (r.fromEmail.toLowerCase() === myEmail || r.toEmail.toLowerCase() === myEmail)
    );
    if (!activeMeet) {
      setActiveChatMessages([]);
      return;
    }

    const messagesQuery = query(collection(db, 'chats', activeMeet.id, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((d) => list.push(d.data() as ChatMessage));
      setActiveChatMessages(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chat messages');
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser, meetRequests.map(r => `${r.id}:${r.status}`).join(',')]);

  const handleSendChatMessage = async (meetId: string, text: string) => {
    if (!sessionUser || !text.trim()) return;
    const myId = emailToSafeId(sessionUser.email);
    try {
      const msgRef = doc(collection(db, 'chats', meetId, 'messages'));
      await setDoc(msgRef, {
        id: msgRef.id,
        senderId: myId,
        senderEmail: sessionUser.email,
        senderName: sessionUser.name,
        text: text.trim(),
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('Send chat message failed:', e);
      showAdminNotice('Message failed to send - please try again.');
    }
  };

  // Callback when administration pushes WS alert
  const handlePushBroadcastToSimul = (message: string) => {
    setBroadcastAlert(message);
  };

  // Callback when B2B capacity limit modifications are requested
  const handleUpdateHotspotLimit = async (id: string, limit: number) => {
    try {
      const spotRef = doc(db, 'hotspots', id);
      await updateDoc(spotRef, { limit });
    } catch (e) {
      console.error("Firestore hotspot limit update query failure:", e);
      // Client offline fallback
      setHotspots(prev => prev.map(h => h.id === id ? { ...h, limit } : h));
    }
  };

  const handleAddNewEvent = async (event: Event) => {
    try {
      const eventRef = doc(db, 'events', event.id);
      await setDoc(eventRef, event);
    } catch (e) {
      console.error("Firestore event insert query failure:", e);
      // Client offline fallback
      setEvents(prev => [event, ...prev]);
    }
  };

  // ===== ADMIN ACTIONS =====
  // All of these are also enforced server-side in firestore.rules via
  // isAdmin() - the UI only decides who SEES these controls, the rules
  // decide who can actually perform them.

  const handleAdminClearUserStatus = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        statusText: '',
        statusType: '',
        location: '',
        timeAgo: ''
      });
      showAdminNotice('Status cleared for that user.');
    } catch (e) {
      console.error('Admin clear status failed:', e);
      showAdminNotice('Failed to clear status - check console for details.');
    }
  };

  const handleAdminToggleBlockUser = async (userId: string, blocked: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { blocked });
      showAdminNotice(blocked ? 'User blocked.' : 'User unblocked.');
    } catch (e) {
      console.error('Admin block/unblock failed:', e);
      showAdminNotice('Failed to update block status - check console for details.');
    }
  };

  // Organiser access lets someone create/trigger events, without giving
  // them full admin powers. Any admin can grant/revoke this (unlike full
  // admin role changes, which are restricted to the super admin).
  const handleAdminToggleOrganiser = async (userId: string, userEmail: string, isOrganiser: boolean) => {
    if (!userEmail) return;
    try {
      await updateDoc(doc(db, 'users', userId), { isOrganiser });
      if (isOrganiser) {
        await setDoc(doc(db, 'organisers', userEmail), {
          grantedBy: sessionUser?.email || 'unknown',
          grantedAt: new Date().toISOString()
        });
      } else {
        await deleteDoc(doc(db, 'organisers', userEmail));
      }
      showAdminNotice(isOrganiser ? 'Organiser access granted.' : 'Organiser access revoked.');
    } catch (e) {
      console.error('Admin organiser toggle failed:', e);
      showAdminNotice('Failed to update organiser access - check console for details.');
    }
  };

  const handleAdminAwardXp = async (userId: string, amount: number) => {
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        showAdminNotice('That user could not be found.');
        return;
      }
      const data = snap.data();
      const newXp = Math.max(0, (data.xp || 0) + amount);
      await updateDoc(userRef, {
        xp: newXp,
        level: computeLevelFromXp(newXp)
      });
      showAdminNotice(`Awarded ${amount} XP.`);
    } catch (e) {
      console.error('Admin XP award failed:', e);
      showAdminNotice('Failed to award XP - check console for details.');
    }
  };

  const handleAdminEditHotspot = async (id: string, updates: Partial<Hotspot>) => {
    try {
      await updateDoc(doc(db, 'hotspots', id), updates);
      showAdminNotice('Hotspot updated.');
    } catch (e) {
      console.error('Admin hotspot edit failed:', e);
      showAdminNotice('Failed to update hotspot - check console for details.');
    }
  };

  const handleAdminAddHotspot = async (hotspot: Hotspot) => {
    try {
      await setDoc(doc(db, 'hotspots', hotspot.id), hotspot);
      showAdminNotice(`Hotspot "${hotspot.name}" created.`);
    } catch (e) {
      console.error('Admin add hotspot failed:', e);
      showAdminNotice('Failed to create hotspot - check console for details.');
    }
  };

  const handleAdminDeleteHotspot = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'hotspots', id));
      showAdminNotice('Hotspot deleted.');
    } catch (e) {
      console.error('Admin delete hotspot failed:', e);
      showAdminNotice('Failed to delete hotspot - check console for details.');
    }
  };

  const handleAdminEditEvent = async (id: string, updates: Partial<Event>) => {
    try {
      await updateDoc(doc(db, 'events', id), updates);
      showAdminNotice('Event updated.');
    } catch (e) {
      console.error('Admin event edit failed:', e);
      showAdminNotice('Failed to update event - check console for details.');
    }
  };

  const handleAdminAddEvent = async (event: Event) => {
    try {
      await setDoc(doc(db, 'events', event.id), event);
      showAdminNotice(`Event "${event.title}" created.`);
    } catch (e) {
      console.error('Admin add event failed:', e);
      showAdminNotice('Failed to create event - check console for details.');
    }
  };

  const handleAdminDeleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'events', id));
      showAdminNotice('Event deleted.');
    } catch (e) {
      console.error('Admin delete event failed:', e);
      showAdminNotice('Failed to delete event - check console for details.');
    }
  };

  // Grants admin rights to any registered user by email. Requires that
  // person to already have a student profile (they must have registered
  // at least once) - creates both the /users role flag and the /admins
  // registry doc that the security rules check.
  const handleAdminGrantAdmin = async (targetEmail: string) => {
    const email = targetEmail.trim().toLowerCase();
    if (!email) return;
    const safeId = emailToSafeId(email);
    try {
      const userRef = doc(db, 'users', safeId);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        showAdminNotice(`No registered user found for "${email}". They need to register first.`);
        return;
      }
      await updateDoc(userRef, { role: 'admin' });
      await setDoc(doc(db, 'admins', email), {
        grantedBy: sessionUser?.email || 'unknown',
        grantedAt: new Date().toISOString()
      }, { merge: true });
      showAdminNotice(`${email} is now an admin.`);
    } catch (e) {
      console.error('Admin grant failed:', e);
      showAdminNotice('Failed to grant admin role - check console for details.');
    }
  };

  const handleAdminRevokeAdmin = async (targetEmail: string) => {
    const email = targetEmail.trim().toLowerCase();
    if (!email) return;
    if (sessionUser && email === sessionUser.email.toLowerCase()) {
      showAdminNotice("You can't revoke your own admin access from here.");
      return;
    }
    const safeId = emailToSafeId(email);
    try {
      await updateDoc(doc(db, 'users', safeId), { role: 'user' });
      await deleteDoc(doc(db, 'admins', email));
      showAdminNotice(`${email}'s admin access has been revoked.`);
    } catch (e) {
      console.error('Admin revoke failed:', e);
      showAdminNotice('Failed to revoke admin role - check console for details.');
    }
  };

  const showAdminNotice = (message: string) => {
    setAdminNotice(message);
    setTimeout(() => setAdminNotice(null), 4000);
  };

  // ===== MEET REQUESTS =====
  // Exclusivity (one active outgoing request or accepted meet at a time) is
  // enforced client-side in CampusWebPortal - these functions just perform
  // the actual Firestore operation once that check has passed.

  const handleSendMeetRequest = async (toUser: User) => {
    if (!sessionUser || !toUser.id || !toUser.email) return;
    const myId = emailToSafeId(sessionUser.email);
    try {
      const reqRef = doc(collection(db, 'meetRequests'));
      await setDoc(reqRef, {
        id: reqRef.id,
        fromId: myId,
        fromEmail: sessionUser.email,
        fromName: sessionUser.name,
        toId: toUser.id,
        toEmail: toUser.email,
        toName: toUser.name,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('Send meet request failed:', e);
      showAdminNotice('Could not send meet request - please try again.');
    }
  };

  const handleWithdrawMeetRequest = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, 'meetRequests', requestId));
    } catch (e) {
      console.error('Withdraw meet request failed:', e);
    }
  };

  const handleAcceptMeetRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'meetRequests', requestId), { status: 'accepted' });
    } catch (e) {
      console.error('Accept meet request failed:', e);
    }
  };

  const handleRejectMeetRequest = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, 'meetRequests', requestId));
    } catch (e) {
      console.error('Reject meet request failed:', e);
    }
  };

  // Ends an active meet: deletes the request and clears BOTH participants'
  // status, taking them both offline (matches the "conclude meet" spec).
  const handleConcludeMeet = async (requestId: string, otherUserId: string) => {
    try {
      await deleteDoc(doc(db, 'meetRequests', requestId));
      if (sessionUser) {
        const myId = emailToSafeId(sessionUser.email);
        await updateDoc(doc(db, 'users', myId), {
          statusText: '', statusType: '', location: '', timeAgo: ''
        });
      }
      if (otherUserId) {
        await updateDoc(doc(db, 'users', otherUserId), {
          statusText: '', statusType: '', location: '', timeAgo: ''
        });
      }
      setCurrentMyStatus(null);
    } catch (e) {
      console.error('Conclude meet failed:', e);
      showAdminNotice('Could not conclude meet - please try again.');
    }
  };

  // Sync client profile checkin actions to trigger real-time achievements level modifications
  const handleUserStatusUpdated = async (text: string, type: string, hotspotId?: string) => {
    console.log(`Presence intent broadcast checked in: ${text} (${type})`);
    if (!sessionUser) return;

    const selectedSpot = hotspots.find(h => h.id === hotspotId);
    const resolvedLocation = selectedSpot
      ? selectedSpot.name
      : (type === 'Studying' ? 'Library Balcony' : type === 'Exploring' ? 'Garden Lawn' : 'Campus Canteen');

    const safeId = 'usr_' + sessionUser.email.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
    const userRef = doc(db, 'users', safeId);

    try {
      const currentDoc = await getDoc(userRef);
      if (currentDoc.exists()) {
        await updateDoc(userRef, {
          statusText: text,
          statusType: type,
          location: resolvedLocation,
          timeAgo: 'Just now'
        });
      } else {
        const initials = sessionUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AM';
        await setDoc(userRef, {
          id: safeId,
          name: sessionUser.name,
          avatar: initials,
          avatarColor: 'from-sky-400 to-blue-500',
          trustScore: stats.trustScore,
          title: stats.title,
          email: sessionUser.email,
          location: resolvedLocation,
          role: sessionUser.role,
          statusText: text,
          statusType: type,
          meetsCount: stats.meetsCount,
          xp: stats.xp,
          level: stats.level,
          bio: stats.bio
        });
      }
    } catch (e) {
      console.error("Error updating user status in Firestore:", e);
    }
  };

  // Synchronize status changes to Firestore profile in real-time
  useEffect(() => {
    if (!sessionUser || !firebaseUser) return;
    if (currentMyStatus) {
      handleUserStatusUpdated(currentMyStatus.text, currentMyStatus.type, currentMyStatus.hotspotId);
    } else {
      const safeId = 'usr_' + sessionUser.email.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
      const userRef = doc(db, 'users', safeId);
      updateDoc(userRef, {
        statusText: "",
        statusType: "",
        location: "",
        timeAgo: ""
      }).catch(err => console.error("Error clearing status in Firestore:", err));

      // Going offline manually should also end any active meet, rather
      // than leaving the other person stuck with a live request/meet.
      const myEmail = sessionUser.email.toLowerCase();
      const activeMine = meetRequests.find(r =>
        r.fromEmail.toLowerCase() === myEmail || r.toEmail.toLowerCase() === myEmail
      );
      if (activeMine) {
        deleteDoc(doc(db, 'meetRequests', activeMine.id)).catch(err => console.error("Error clearing meet on offline:", err));
      }
    }
  }, [currentMyStatus, sessionUser, firebaseUser]);

  // Load this user's real progression (level, XP, meets, trust score) from
  // Firestore once per login, so it reflects their actual account instead of
  // placeholder demo numbers. Note: presence/status is intentionally NOT
  // restored here - the user must broadcast a status manually each session.
  useEffect(() => {
    if (!sessionUser || !firebaseUser || statsLoaded) return;

    const safeId = 'usr_' + sessionUser.email.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
    getDoc(doc(db, 'users', safeId)).then((snap) => {
      if (snap.exists()) {
        const uData = snap.data();
        setStats({
          meetsCount: uData.meetsCount ?? 0,
          trustScore: uData.trustScore ?? 0,
          meetsThisWeek: 0,
          xp: uData.xp ?? 0,
          level: uData.level ?? 1,
          title: uData.title || 'Newcomer',
          bio: uData.bio || ''
        });
      }
      setStatsLoaded(true);
    }).catch(err => {
      console.error("Failed to load user stats from Firestore:", err);
      setStatsLoaded(true);
    });
  }, [sessionUser, firebaseUser, statsLoaded]);

  // Persist stat changes (XP/level/meets gained from check-ins and RSVPs)
  // back to Firestore, once the initial load above has completed - this
  // prevents a race where we'd overwrite real data with defaults.
  useEffect(() => {
    if (!sessionUser || !firebaseUser || !statsLoaded) return;

    const safeId = 'usr_' + sessionUser.email.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
    const userRef = doc(db, 'users', safeId);
    updateDoc(userRef, {
      meetsCount: stats.meetsCount,
      xp: stats.xp,
      level: stats.level,
      trustScore: stats.trustScore,
      title: stats.title,
      bio: stats.bio
    }).catch(err => console.error("Failed to persist stats to Firestore:", err));
  }, [stats, sessionUser, firebaseUser, statsLoaded]);

  // Render centered spinner/loading security wall while resolving Firebase session caches
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#fdfaf7] flex flex-col justify-center items-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl border-4 border-gray-200 border-t-[#FF6B35] animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center font-black text-xs text-[#FF6B35]">
              AM
            </div>
          </div>
          <div className="text-sm font-extrabold text-gray-700 font-mono animate-pulse">
            SECURELY LOAD AMIGO...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfaf7] text-[#1a1a1a] flex flex-col antialiased selection:bg-[#FF6B35]/30 font-sans">
      
      {/* Brand Navigation Website Header banner */}
      <header className="bg-white border-b-4 border-[#1a1a1a] px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF6B35] border-2 border-[#1a1a1a] rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
              <span className="font-extrabold font-display text-white text-base tracking-tighter">AM</span>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black font-display text-[#1a1a1a] tracking-tight">
                AMIGO
              </h1>
            </div>
          </div>

          {/* Navigation tabs transforming the app into a robust marketing and service website */}
          <div className="flex items-center gap-4 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
            
            {sessionUser && (
              <div className="flex bg-[#FFF9F2] p-1 border-2 border-[#1a1a1a] rounded-xl items-center gap-2 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-[#FF6B35] border-2 border-[#1a1a1a] font-extrabold text-[#fdfaf7] text-xs flex items-center justify-center font-mono">
                    {sessionUser.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center text-[7px] font-black text-white ${
                    sessionUser.role === 'admin' ? 'bg-indigo-600' : 'bg-emerald-500'
                  }`}>
                    G
                  </span>
                </div>
                <div className="hidden md:block text-left text-xs mr-1">
                  <div className="font-extrabold flex items-center gap-1">
                    <span>{sessionUser.name}</span>
                    <span className={`text-[8px] px-1 font-mono rounded font-black border uppercase ${
                      sessionUser.role === 'admin' 
                        ? 'bg-indigo-100 text-[#1a1a1a] border-[#1a1a1a]' 
                        : 'bg-emerald-100 text-[#1a1a1a] border-[#1a1a1a]'
                    }`}>
                      {sessionUser.role}
                    </span>
                  </div>
                  <div className="text-[9px] text-gray-500 font-medium font-mono truncate max-w-[100px]">
                    {sessionUser.email}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out of Google"
                  className="p-1 px-2 hover:bg-[#FF6B35]/20 rounded-lg transition cursor-pointer text-gray-600 hover:text-black border-2 border-transparent hover:border-[#1a1a1a]"
                >
                  <LogOut size={13} className="stroke-[2.5]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Auth Gating Gate lockscreen if not logged in */}
      {!sessionUser ? (
        <AuthGate onLogin={handleLogin} />
      ) : (
        /* ==================== HOME/CAMPUS PORTAL WEBPAGE VIEW ==================== */
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col justify-stretch">
          <CampusWebPortal
            users={users}
            setUsers={setUsers}
            hotspots={hotspots}
            setHotspots={setHotspots}
            stats={stats}
            setStats={setStats}
            privacy={privacy}
            setPrivacy={setPrivacy}
            events={events}
            onAddEvent={handleAddNewEvent}
            broadcastAlert={broadcastAlert}
            setBroadcastAlert={setBroadcastAlert}
            onUpdateHotspotLimit={handleUpdateHotspotLimit}
            onSendBroadcast={handlePushBroadcastToSimul}
            adminNotice={adminNotice}
            onAdminClearUserStatus={handleAdminClearUserStatus}
            onAdminToggleBlockUser={handleAdminToggleBlockUser}
            onAdminToggleOrganiser={handleAdminToggleOrganiser}
            onAdminAwardXp={handleAdminAwardXp}
            onAdminEditHotspot={handleAdminEditHotspot}
            onAdminAddHotspot={handleAdminAddHotspot}
            onAdminDeleteHotspot={handleAdminDeleteHotspot}
            onAdminEditEvent={handleAdminEditEvent}
            onAdminAddEvent={handleAdminAddEvent}
            onAdminDeleteEvent={handleAdminDeleteEvent}
            onAdminGrantAdmin={handleAdminGrantAdmin}
            onAdminRevokeAdmin={handleAdminRevokeAdmin}
            meetRequests={meetRequests}
            onSendMeetRequest={handleSendMeetRequest}
            onWithdrawMeetRequest={handleWithdrawMeetRequest}
            onAcceptMeetRequest={handleAcceptMeetRequest}
            onRejectMeetRequest={handleRejectMeetRequest}
            onConcludeMeet={handleConcludeMeet}
            currentMyStatus={currentMyStatus}
            setCurrentMyStatus={setCurrentMyStatus}
            chatMessages={activeChatMessages}
            onSendChatMessage={handleSendChatMessage}
            waitlistedSpotIds={waitlistedSpotIds}
            setWaitlistedSpotIds={setWaitlistedSpotIds}
            sessionUser={sessionUser}
          />
        </main>
      )}

    </div>
  );
}

