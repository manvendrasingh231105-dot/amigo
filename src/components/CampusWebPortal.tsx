import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  Settings, 
  User, 
  MapPin, 
  Shield, 
  Check, 
  X, 
  Flame, 
  Award, 
  Bell, 
  Eye, 
  EyeOff, 
  Plus, 
  LogOut, 
  Trash2, 
  MessageSquare, 
  Coffee, 
  Leaf, 
  Sun, 
  BookOpen, 
  Utensils, 
  Home, 
  ChevronRight,
  ShieldCheck,
  Zap,
  AlertCircle,
  Users,
  BarChart3,
  Send,
  Signal,
  Layers,
  Info,
  Calendar
} from 'lucide-react';
import { User as AmigoUser, Hotspot, PrivacySettings, UserStats, Achievement, Event, MeetRequest, ChatMessage } from '../types';
import { computeLevelFromXp, SUPER_ADMIN_EMAIL } from '../utils';
import AdminConsole from './AdminConsole';

interface DesktopWebAppProps {
  users: AmigoUser[];
  setUsers: React.Dispatch<React.SetStateAction<AmigoUser[]>>;
  hotspots: Hotspot[];
  setHotspots: React.Dispatch<React.SetStateAction<Hotspot[]>>;
  stats: UserStats;
  setStats: React.Dispatch<React.SetStateAction<UserStats>>;
  privacy: PrivacySettings;
  setPrivacy: React.Dispatch<React.SetStateAction<PrivacySettings>>;
  events: Event[];
  onAddEvent: (event: Event) => void;
  broadcastAlert: string | null;
  setBroadcastAlert: (alert: string | null) => void;
  onUpdateHotspotLimit: (id: string, limit: number) => void;
  onSendBroadcast: (message: string) => void;

  // Admin controls (only meaningful/visible when sessionUser.role === 'admin')
  adminNotice: string | null;
  onAdminClearUserStatus: (userId: string) => void;
  onAdminToggleBlockUser: (userId: string, blocked: boolean) => void;
  onAdminToggleOrganiser: (userId: string, userEmail: string, isOrganiser: boolean) => void;
  onAdminAwardXp: (userId: string, amount: number) => void;
  onAdminEditHotspot: (id: string, updates: Partial<Hotspot>) => void;
  onAdminAddHotspot: (hotspot: Hotspot) => void;
  onAdminDeleteHotspot: (id: string) => void;
  onAdminEditEvent: (id: string, updates: Partial<Event>) => void;
  onAdminAddEvent: (event: Event) => void;
  onAdminDeleteEvent: (id: string) => void;
  onAdminGrantAdmin: (email: string) => void;
  onAdminRevokeAdmin: (email: string) => void;

  // Real meet-request system
  meetRequests: MeetRequest[];
  onSendMeetRequest: (toUser: AmigoUser) => void;
  onWithdrawMeetRequest: (requestId: string) => void;
  onAcceptMeetRequest: (requestId: string) => void;
  onRejectMeetRequest: (requestId: string) => void;
  onConcludeMeet: (requestId: string, otherUserId: string) => void;
  
  // Shared States for perfect Omni-channel Device synchronization
  currentMyStatus: { text: string; type: string; hotspotId?: string } | null;
  setCurrentMyStatus: React.Dispatch<React.SetStateAction<{ text: string; type: string; hotspotId?: string } | null>>;
  chatMessages: ChatMessage[];
  onSendChatMessage: (meetId: string, text: string) => void;
  waitlistedSpotIds: string[];
  setWaitlistedSpotIds: React.Dispatch<React.SetStateAction<string[]>>;
  sessionUser?: {
    email: string;
    name: string;
    role: 'user' | 'admin';
    meta: Record<string, string>;
  } | null;
}

export default function DesktopWebApp({
  users,
  setUsers,
  hotspots,
  setHotspots,
  stats,
  setStats,
  privacy,
  setPrivacy,
  events,
  onAddEvent,
  broadcastAlert,
  setBroadcastAlert,
  onUpdateHotspotLimit,
  onSendBroadcast,
  adminNotice,
  onAdminClearUserStatus,
  onAdminToggleBlockUser,
  onAdminToggleOrganiser,
  onAdminAwardXp,
  onAdminEditHotspot,
  onAdminAddHotspot,
  onAdminDeleteHotspot,
  onAdminEditEvent,
  onAdminAddEvent,
  onAdminDeleteEvent,
  onAdminGrantAdmin,
  onAdminRevokeAdmin,
  meetRequests,
  onSendMeetRequest,
  onWithdrawMeetRequest,
  onAcceptMeetRequest,
  onRejectMeetRequest,
  onConcludeMeet,
  currentMyStatus,
  setCurrentMyStatus,
  chatMessages,
  onSendChatMessage,
  waitlistedSpotIds,
  setWaitlistedSpotIds,
  sessionUser
}: DesktopWebAppProps) {
  // Navigation inside Desktop Web App
  const [webActiveTab, setWebActiveTab] = useState<'radar' | 'events' | 'gamification' | 'privacy' | 'admin'>('radar');
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [filteredMode, setFilteredMode] = useState<'everyone' | 'this_hotspot'>('everyone');

  // Administrator state values merged from CreatorDashboard
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'b2b' | 'events'>('b2b');
  const [editingCapacityId, setEditingCapacityId] = useState<string | null>(null);
  const [tempCapacity, setTempCapacity] = useState<number>(0);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Custom Ping Alert Modal states matching mobile simulator
  
  // Status BROADCASTER form
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusType, setStatusType] = useState<'Studying' | 'Bored' | 'Exploring' | 'Hungry'>('Studying');
  const [broadcastHotspotId, setBroadcastHotspotId] = useState<string>('');
  
  // Ephemeral Chat Input
  const [chatInputText, setChatInputText] = useState('');
  
  // B2B scheduler form state within webapp
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('Library Balcony');
  const [newEventOrganizer, setNewEventOrganizer] = useState('AI Club');
  const [newEventLimit, setNewEventLimit] = useState(20);
  const [newEventTime, setNewEventTime] = useState('14:30');
  const [newEventDate, setNewEventDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Local notifications (toast)
  const [toastText, setToastText] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastText(msg);
    setTimeout(() => {
      setToastText(prev => prev === msg ? null : prev);
    }, 4500);
  };

  const handleGoVisible = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusText.trim()) return;

    const chosenSpotId = broadcastHotspotId || hotspots[0]?.id || '';
    const chosenSpot = hotspots.find(h => h.id === chosenSpotId);

    setCurrentMyStatus({ text: statusText, type: statusType, hotspotId: chosenSpotId });
    setShowStatusForm(false);

    setStats(prev => {
      const newXp = prev.xp + 50;
      return {
        ...prev,
        xp: newXp,
        meetsCount: prev.meetsCount + 1,
        level: computeLevelFromXp(newXp)
      };
    });

    showNotification(`Presence broadcast live at ${chosenSpot?.name || 'campus'}! +50 XP granted.`);
    setStatusText('');
  };

  const handleClearStatus = () => {
    setCurrentMyStatus(null);
    showNotification("Presence dissolved. You are now ghosted on the campus network.");
  };

  const handleChatFormSubmit = (e: React.FormEvent, meetId: string) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;
    onSendChatMessage(meetId, chatInputText.trim());
    setChatInputText('');
  };

  const handleJoinSpotWaitlist = (spotId: string, spotName: string) => {
    setWaitlistedSpotIds((prev) => [...prev, spotId]);
    showNotification(`Waitlist Registered: We'll ping you as soon as ${spotName} drops density.`);
  };

  const startCapacityEdit = (hotspot: Hotspot) => {
    setEditingCapacityId(hotspot.id);
    setTempCapacity(hotspot.limit);
  };

  const saveCapacityEdit = (id: string) => {
    onUpdateHotspotLimit(id, tempCapacity);
    setEditingCapacityId(null);
    showNotification(`Hotspot capacity for ${hotspots.find(h => h.id === id)?.name} updated to ${tempCapacity}!`);
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim() || broadcastMessage.length > 60) return;

    onSendBroadcast(broadcastMessage);
    setBroadcastSuccess(true);
    showNotification(`Websocket message broadcast camp-wide: "${broadcastMessage}"`);
    setTimeout(() => {
      setBroadcastSuccess(false);
      setBroadcastMessage('');
    }, 3000);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventDate || !newEventTime) return;

    const scheduledFor = new Date(`${newEventDate}T${newEventTime}`);
    const today = new Date();
    const isToday = scheduledFor.toDateString() === today.toDateString();
    const dateLabel = isToday
      ? 'Today'
      : scheduledFor.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const timeLabel = scheduledFor.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const event: Event = {
      id: `event-${Date.now()}`,
      title: newEventTitle,
      location: newEventLocation,
      organizer: newEventOrganizer,
      rsvps: [],
      maxRsvps: newEventLimit,
      startTime: `${dateLabel}, ${timeLabel}`,
      scheduledFor: scheduledFor.toISOString(),
      isLive: true
    };

    onAddEvent(event);
    setNewEventTitle('');
    showNotification(`Broadcast: Scheduled '${event.title}' at ${event.location} on ${dateLabel}!`);
  };

  const handleRsvpEvent = (eventId: string) => {
    // Check if or RSVP
    const hasRsvped = events.find(e => e.id === eventId)?.rsvps.includes('me');
    if (hasRsvped) {
      showNotification("You have already RSVPed for this social meetup block.");
      return;
    }
    // Update RSVP on parent events
    const evt = events.find(e => e.id === eventId);
    if (evt) {
      if (evt.rsvps.length >= evt.maxRsvps) {
        showNotification("Sorry, this scheduled meetup venue has hit maximum capacity registrations.");
        return;
      }
      evt.rsvps.push('me');
      setStats(p => {
        const newXp = p.xp + 10;
        return {
          ...p,
          xp: newXp,
          meetsCount: p.meetsCount + 1,
          level: computeLevelFromXp(newXp)
        };
      });
      showNotification("Successfully RSVPed! +10 XP awarded.");
    }
  };

  // Filter peers by selected hotspot index mapping
  // ===== Super admin: drag-to-reposition hotspots on the coordinate grid =====
  const isSuperAdminUser = sessionUser?.role === 'admin' && sessionUser.email.toLowerCase() === SUPER_ADMIN_EMAIL;
  const myOwnProfile = users.find(u => u.email?.toLowerCase() === sessionUser?.email?.toLowerCase());
  const canOrganiseEvents = sessionUser?.role === 'admin' || !!myOwnProfile?.isOrganiser;
  const gridRef = useRef<HTMLDivElement>(null);
  const [draggingHotspotId, setDraggingHotspotId] = useState<string | null>(null);
  const [dragPreviewPos, setDragPreviewPos] = useState<{ x: number; y: number } | null>(null);

  const handleHotspotPointerDown = (e: React.PointerEvent, spotId: string) => {
    if (!isSuperAdminUser || !onAdminEditHotspot) return;
    e.stopPropagation();
    setDraggingHotspotId(spotId);
  };

  const handleGridPointerMove = (e: React.PointerEvent) => {
    if (!draggingHotspotId || !gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const xPct = Math.min(96, Math.max(4, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.min(96, Math.max(4, ((e.clientY - rect.top) / rect.height) * 100));
    setDragPreviewPos({ x: Math.round(xPct), y: Math.round(yPct) });
  };

  const finishHotspotDrag = () => {
    if (draggingHotspotId && dragPreviewPos && onAdminEditHotspot) {
      onAdminEditHotspot(draggingHotspotId, { x: dragPreviewPos.x, y: dragPreviewPos.y });
    }
    setDraggingHotspotId(null);
    setDragPreviewPos(null);
  };

  // ===== Meet request derived state =====
  const myEmailLower = sessionUser?.email?.toLowerCase() || '';
  const myOutgoingPending = meetRequests.find(r => r.status === 'pending' && r.fromEmail.toLowerCase() === myEmailLower);
  const myIncomingPending = meetRequests.filter(r => r.status === 'pending' && r.toEmail.toLowerCase() === myEmailLower);
  const myActiveMeet = meetRequests.find(r => r.status === 'accepted' && (r.fromEmail.toLowerCase() === myEmailLower || r.toEmail.toLowerCase() === myEmailLower));

  // Toast the moment a NEW incoming request arrives, so it's noticed even
  // if the person isn't currently looking at the peer list or Radar tab.
  const prevIncomingIds = useRef<string[]>([]);
  useEffect(() => {
    const currentIds = myIncomingPending.map(r => r.id);
    const newOnes = myIncomingPending.filter(r => !prevIncomingIds.current.includes(r.id));
    newOnes.forEach(r => showNotification(`📩 ${r.fromName} sent you a Meet Request!`));
    prevIncomingIds.current = currentIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myIncomingPending.map(r => r.id).join(',')]);

  const renderMeetAction = (peer: AmigoUser) => {
    const peerEmailLower = peer.email?.toLowerCase();

    // Active accepted meet WITH this person - offer to conclude it
    if (myActiveMeet && (myActiveMeet.fromEmail.toLowerCase() === peerEmailLower || myActiveMeet.toEmail.toLowerCase() === peerEmailLower)) {
      const otherUserId = myActiveMeet.fromEmail.toLowerCase() === myEmailLower ? myActiveMeet.toId : myActiveMeet.fromId;
      return (
        <button
          onClick={() => onConcludeMeet(myActiveMeet.id, otherUserId)}
          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] rounded-lg border-2 border-[#1a1a1a] shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] uppercase transition shrink-0 cursor-pointer"
        >
          ✅ Conclude Meet
        </button>
      );
    }

    // Already in an active meet with someone else - can't request anyone
    if (myActiveMeet) {
      return (
        <span className="text-[9px] font-mono bg-gray-100 text-gray-400 border border-gray-300 px-2 py-0.5 rounded font-black uppercase">
          Busy in a meet
        </span>
      );
    }

    // This person already sent ME a pending request - accept/reject it
    const incomingFromThisPeer = myIncomingPending.find(r => r.fromEmail.toLowerCase() === peerEmailLower);
    if (incomingFromThisPeer) {
      return (
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => onAcceptMeetRequest(incomingFromThisPeer.id)}
            className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] rounded-lg border-2 border-[#1a1a1a] shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] uppercase transition cursor-pointer"
          >
            ✓ Accept
          </button>
          <button
            onClick={() => onRejectMeetRequest(incomingFromThisPeer.id)}
            className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-black text-[9px] rounded-lg border-2 border-[#1a1a1a] shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] uppercase transition cursor-pointer"
          >
            ✕ Reject
          </button>
        </div>
      );
    }

    // I already sent a pending request TO this exact person - offer withdraw
    if (myOutgoingPending && myOutgoingPending.toEmail.toLowerCase() === peerEmailLower) {
      return (
        <button
          onClick={() => onWithdrawMeetRequest(myOutgoingPending.id)}
          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-black text-[9px] rounded-lg border-2 border-[#1a1a1a] shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] uppercase transition shrink-0 cursor-pointer"
        >
          ⏳ Pending · Withdraw
        </button>
      );
    }

    // I have a pending request out to someone else - blocked from sending another
    if (myOutgoingPending) {
      return (
        <span className="text-[9px] font-mono bg-gray-100 text-gray-400 border border-gray-300 px-2 py-0.5 rounded font-black uppercase">
          Request pending elsewhere
        </span>
      );
    }

    // Free to send a request
    return (
      <button
        onClick={() => onSendMeetRequest(peer)}
        className="px-2.5 py-1 bg-white hover:bg-[#FFF4E5] text-[#1a1a1a] font-black text-[9px] rounded-lg border-2 border-[#1a1a1a] shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] uppercase transition shrink-0 cursor-pointer"
      >
        👋 Request Meet
      </button>
    );
  };

  const getFilteredPeers = () => {
    // Only show peers who have manually broadcast a real status - never
    // show someone as "available" just because they're registered.
    let result = users.filter(u => !!u.statusText && !!u.statusType && !u.blocked);

    if (selectedHotspotId) {
      const selectedSpot = hotspots.find(h => h.id === selectedHotspotId);
      if (selectedSpot) {
        result = users.filter(u => {
          if (selectedSpot.name === 'Library Balcony') return u.statusType === 'Studying';
          if (selectedSpot.name === 'Campus Canteen') return u.statusType === 'Bored' || u.statusType === 'Hungry';
          if (selectedSpot.name === 'Garden Lawn') return u.statusType === 'Exploring';
          return true;
        });
      }
    }

    if (filteredMode === 'this_hotspot') {
      const activeSpot = hotspots.find(h => h.id === selectedHotspotId) || hotspots[0];
      const spotName = activeSpot ? activeSpot.name : 'Library Balcony';
      result = result.filter(u => u.location && u.location.includes(spotName));
    }

    return result;
  };

  const filteredPeers = getFilteredPeers();

  const getIconColor = (type?: string) => {
    if (type === 'Studying') return 'text-blue-500 bg-blue-50';
    if (type === 'Bored') return 'text-amber-500 bg-amber-50';
    if (type === 'Exploring') return 'text-emerald-500 bg-emerald-50';
    if (type === 'Hungry') return 'text-rose-500 bg-rose-50';
    return 'text-stone-500 bg-stone-50';
  };

  const getHotspotIconComp = (iconName: string) => {
    switch (iconName) {
      case 'utensils': return <Utensils size={18} />;
      case 'coffee': return <Coffee size={18} />;
      case 'leaf': return <Leaf size={18} />;
      case 'book': return <BookOpen size={18} />;
      case 'sun': return <Sun size={18} />;
      default: return <Home size={18} />;
    }
  };

  const achievements: Achievement[] = [
    { id: 'first', title: 'First Meet', icon: '🔥', description: 'Met with your first real-world Amigo', unlocked: true },
    { id: 'conv', title: 'Conversation', icon: '💬', description: 'Maintained status for 3 hours', unlocked: true },
    { id: 'vibes', title: '5-Star Vibes', icon: '⭐', description: 'Received 10 premium feedbacks', unlocked: false },
    { id: 'explorer', title: 'Explorer', icon: '👣', description: 'Checked in at separate zones', unlocked: false },
  ];

  return (
    <div className="bg-white border-4 border-[#1a1a1a] rounded-[32px] overflow-hidden flex flex-col w-full font-sans relative shadow-[10px_10px_0px_0px_rgba(26,26,26,1)]" id="desktop-webport-container">
      
      {/* Toast Alert System overlay */}
      {toastText && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-[#E7F5FF] border-2 border-[#1a1a1a] text-[#1a1a1a] px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 z-50 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] animate-bounce font-sans">
          <ShieldCheck className="text-[#FF6B35] shrink-0" size={16} />
          <div className="text-left">
            <span className="font-mono text-[8px] font-black uppercase text-blue-900 tracking-wider">SECURE BROADCAST DECI</span>
            <p className="font-bold mt-0.5">{toastText}</p>
          </div>
          <button onClick={() => setToastText(null)} className="ml-2 font-bold hover:text-rose-500">
            <X size={14} className="stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Broadcast alert pushed by campus admin via simulated WS */}
      {broadcastAlert && (
        <div className="bg-[#FFF4E5] border-b-2 border-[#1a1a1a] text-[#1a1a1a] px-6 py-2.5 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2 text-left">
            <Bell className="text-[#FF6B35] stroke-[2.5] shrink-0 animate-bounce" size={14} />
            <p className="font-semibold text-stone-800 leading-tight">
              <span className="font-black text-[9px] uppercase font-mono tracking-wider text-amber-900 block">CAMPUS ADMINISTRATIVE BROADCAST</span>
              "{broadcastAlert}"
            </p>
          </div>
          <button 
            onClick={() => setBroadcastAlert(null)} 
            className="p-1 hover:bg-amber-100 rounded border border-[#1a1a1a]/30"
          >
            <X size={12} className="stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Desktop Dashboard Navigation Header Banner */}
      <div className="bg-[#fcf9f5] border-b-2 border-[#1a1a1a] px-6 py-4 flex flex-col xl:flex-row items-start xl:items-center justify-between shrink-0 select-none gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#E7F5FF] border-2 border-[#1a1a1a] p-1.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 border border-[#1a1a1a] animate-pulse"></span>
            <span className="text-[10px] font-black font-mono text-[#1a1a1a] uppercase">WEB-TUNNEL ACTIVE</span>
          </div>
          <p className="text-[11px] text-gray-500 font-bold uppercase font-mono tracking-wide hidden md:block">
            Student: <span className="text-[#FF6B35] underline">{sessionUser ? sessionUser.name : 'Guest User'}</span> · Rank: <span className="text-[#FF6B35]">Level {stats.level}</span>
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <button 
            onClick={() => setWebActiveTab('radar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition border-2 flex items-center gap-1.5 cursor-pointer ${
              webActiveTab === 'radar' 
                ? 'bg-[#FF6B35] text-white border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]' 
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a1a1a] hover:text-[#1a1a1a]'
            }`}
          >
            <MessageSquare size={13} />
            <span>Campus Radar & Lobby</span>
            {myIncomingPending.length > 0 && (
              <span className="ml-0.5 bg-emerald-500 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center border border-white">
                {myIncomingPending.length}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => setWebActiveTab('events')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition border-2 flex items-center gap-1.5 cursor-pointer ${
              webActiveTab === 'events' 
                ? 'bg-[#FF6B35] text-white border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]' 
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a1a1a] hover:text-[#1a1a1a]'
            }`}
          >
            <Plus size={13} />
            <span>Campus meetups & RSVPs</span>
          </button>

          <button 
            onClick={() => setWebActiveTab('gamification')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition border-2 flex items-center gap-1.5 cursor-pointer ${
              webActiveTab === 'gamification' 
                ? 'bg-[#FF6B35] text-white border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]' 
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a1a1a] hover:text-[#1a1a1a]'
            }`}
          >
            <Award size={13} />
            <span>My Rank & Stats</span>
          </button>

          <button 
            onClick={() => setWebActiveTab('privacy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition border-2 flex items-center gap-1.5 cursor-pointer ${
              webActiveTab === 'privacy' 
                ? 'bg-[#FF6B35] text-white border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]' 
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a1a1a] hover:text-[#1a1a1a]'
            }`}
          >
            <ShieldCheck size={13} />
            <span>Privacy & Safety</span>
          </button>

          {sessionUser?.role === 'admin' && (
            <button
              onClick={() => setWebActiveTab('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition border-2 flex items-center gap-1.5 cursor-pointer ${
                webActiveTab === 'admin'
                  ? 'bg-indigo-600 text-white border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]'
                  : 'bg-white text-indigo-700 border-indigo-200 hover:border-[#1a1a1a] hover:text-indigo-900'
              }`}
            >
              <Shield size={13} />
              <span>Admin Console</span>
            </button>
          )}
        </div>
      </div>

      {/* Private admin action feedback (block confirmations, errors, etc.) */}
      {adminNotice && (
        <div className="bg-indigo-50 border-b-2 border-indigo-900 px-6 py-2 flex items-center justify-between shrink-0">
          <p className="text-xs font-bold text-indigo-900 flex items-center gap-2">
            <Shield size={13} />
            {adminNotice}
          </p>
        </div>
      )}

      {/* Main Content Areas based on tabs */}
      <div className="flex-1 flex flex-col bg-[#fdfaf7] text-left">
        
        {/* =============== Lobby & Radar Tab =============== */}
        {webActiveTab === 'radar' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y-2 lg:divide-y-0 lg:divide-x-2 divide-[#1a1a1a]">
            
            {/* Column A (3/12): Hotspots & Coordinates Navigator */}
            <div className="col-span-12 lg:col-span-3 p-4 lg:max-h-[700px] lg:overflow-y-auto space-y-4 bg-white/50">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] font-black uppercase text-gray-400">HOTSPOT TILES</span>
                {selectedHotspotId && (
                  <button 
                    onClick={() => setSelectedHotspotId(null)}
                    className="text-[9px] font-bold text-rose-500 hover:underline uppercase"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {hotspots.map(h => {
                  const isSelected = selectedHotspotId === h.id;
                  const isFull = h.activeCount >= h.limit;
                  return (
                    <div 
                      key={h.id}
                      onClick={() => setSelectedHotspotId(isSelected ? null : h.id)}
                      className={`p-3 border-2 rounded-xl transition cursor-pointer text-left relative ${
                        isSelected 
                          ? 'border-[#FF6B35] bg-[#FFF4E5] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]' 
                          : 'border-[#1a1a1a] bg-white hover:bg-[#FFFDF9]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-lg border border-[#1a1a1a] ${isSelected ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                            {getHotspotIconComp(h.icon)}
                          </span>
                          <div>
                            <h4 className="text-xs font-black text-[#1a1a1a] leading-none">{h.name}</h4>
                            <span className="text-[9px] font-mono font-bold text-gray-400 block mt-1">{h.description}</span>
                          </div>
                        </div>

                        <span className={`text-[9px] font-mono font-black border-2 border-[#1a1a1a] px-1.5 py-0.5 rounded-lg ${isFull ? 'bg-orange-200 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                          {h.activeCount}/{h.limit}
                        </span>
                      </div>

                      {/* Waitlist option if capacity exceeded */}
                      {isFull && (
                        <div className="mt-2.5 bg-[#FFF4E5] border border-orange-300 p-1.5 rounded-lg text-[9px] text-orange-950 font-semibold">
                          <p className="mb-1">This venue is crowded!</p>
                          {waitlistedSpotIds.includes(h.id) ? (
                            <span className="block text-center text-emerald-700 font-bold uppercase font-mono">✓ notification registered</span>
                          ) : (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJoinSpotWaitlist(h.id, h.name);
                              }}
                              className="w-full py-1 bg-[#FF6B35] text-white border border-[#1a1a1a] font-black rounded text-[8px] uppercase select-none cursor-pointer"
                            >
                              🔔 Register for occupancy update
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Presence Checker / Go Visible Toggle */}
              <div className="bg-[#FFF4E5] border-2 border-[#1a1a1a] p-4 rounded-2xl shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
                {currentMyStatus ? (
                  <div className="space-y-2">
                    <span className="font-mono text-[9px] font-black text-amber-900 uppercase">My Presence Broadcast</span>
                    <div className="bg-white px-2 py-1.5 rounded-xl border border-amber-300 font-semibold text-[11px] leading-snug">
                      "{currentMyStatus.text}"
                    </div>
                    <p className="text-[9px] text-gray-500 font-semibold">Checked in at: <span className="underline font-bold text-gray-700">{hotspots.find(h => h.id === currentMyStatus.hotspotId)?.name || 'Campus'}</span></p>
                    <button 
                      onClick={handleClearStatus}
                      className="w-full py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] rounded-lg border-2 border-[#1a1a1a] tracking-wider uppercase transition cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)]"
                    >
                      ☠ Go Offline
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-extrabold text-[#1a1a1a] uppercase leading-tight">Broadcast Presence</h5>
                    <p className="text-[10px] text-stone-600 leading-normal">Declare yourself available nearby to request real-world meetups.</p>
                    
                    {!showStatusForm ? (
                      <button 
                        onClick={() => setShowStatusForm(true)}
                        className="w-full py-1.5 bg-[#FF6B35] hover:bg-[#e0531f] text-white font-black text-xs rounded-lg border-2 border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition cursor-pointer"
                      >
                        🚀 Share Intent Status
                      </button>
                    ) : (
                      <form onSubmit={handleGoVisible} className="space-y-2 pt-1">
                        <input 
                          type="text" 
                          required
                          value={statusText}
                          onChange={(e) => setStatusText(e.target.value)}
                          placeholder="e.g. Free for quick coffee chat?"
                          className="w-full bg-white border border-[#1a1a1a] rounded px-2 py-1 text-[10px] font-medium"
                        />
                        <select 
                          value={statusType}
                          onChange={(e) => setStatusType(e.target.value as any)}
                          className="w-full bg-white border border-[#1a1a1a] rounded px-2 py-1 text-[10px] font-bold"
                        >
                          <option value="Studying">Studying 📖</option>
                          <option value="Bored">Bored 💬</option>
                          <option value="Exploring">Exploring 👣</option>
                          <option value="Hungry">Hungry 🍔</option>
                        </select>
                        <select
                          value={broadcastHotspotId || hotspots[0]?.id || ''}
                          onChange={(e) => setBroadcastHotspotId(e.target.value)}
                          required
                          className="w-full bg-white border border-[#1a1a1a] rounded px-2 py-1 text-[10px] font-bold"
                        >
                          {hotspots.map(h => (
                            <option key={h.id} value={h.id}>📍 {h.name}</option>
                          ))}
                        </select>
                        <div className="flex gap-1 pt-1">
                          <button 
                            type="button" 
                            onClick={() => setShowStatusForm(false)}
                            className="flex-1 py-1 bg-white border border-[#1a1a1a] text-[9px] font-bold rounded"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="flex-1 py-1 bg-emerald-500 text-white border border-[#1a1a1a] text-[9px] font-black rounded"
                          >
                            Go Live
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Column B (5/12): Student Lobby Peer Grid */}
            <div className="col-span-12 lg:col-span-5 p-4 lg:max-h-[700px] lg:overflow-y-auto space-y-4">

              {/* Incoming meet request notifications - ALWAYS visible here regardless
                  of hotspot filter, so a request never gets missed just because the
                  sender's card happens to be filtered out of the list below. */}
              {myIncomingPending.length > 0 && (
                <div className="bg-emerald-50 border-2 border-emerald-600 rounded-2xl p-3 shadow-[3px_3px_0px_0px_rgba(5,150,105,1)] space-y-2 animate-fadeIn">
                  <p className="text-[10px] font-black text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                    🔔 {myIncomingPending.length} Meet Request{myIncomingPending.length > 1 ? 's' : ''} Waiting On You
                  </p>
                  {myIncomingPending.map(req => (
                    <div key={req.id} className="bg-white border-2 border-[#1a1a1a] rounded-xl p-2.5 flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-[#1a1a1a] truncate">{req.fromName}</p>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => onAcceptMeetRequest(req.id)}
                          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] rounded-lg border-2 border-[#1a1a1a] uppercase transition cursor-pointer"
                        >
                          ✓ Accept
                        </button>
                        <button
                          onClick={() => onRejectMeetRequest(req.id)}
                          className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-black text-[9px] rounded-lg border-2 border-[#1a1a1a] uppercase transition cursor-pointer"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center bg-[#fdfaf7] py-0.5 sticky top-0 z-10">
                <h3 className="font-display font-black text-base text-[#1a1a1a] tracking-tight">
                  {selectedHotspotId ? "Filtered Peers Nearby" : "All Active Amigos"}
                </h3>
                <span className="font-mono text-[9px] font-black text-blue-900 bg-[#E7F5FF] border border-blue-200 px-2 py-0.5 rounded">
                  {filteredPeers.length} Spontaneous Members
                </span>
              </div>

              {/* Filtering modes replicated from mobile simulator */}
              <div className="flex gap-2 bg-[#fdfaf7] pb-1 border-b border-[#1a1a1a]/10">
                <button
                  type="button"
                  onClick={() => setFilteredMode('everyone')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-[11px] font-black text-center border-2 border-[#1a1a1a] transition duration-100 cursor-pointer ${
                    filteredMode === 'everyone' 
                      ? 'bg-[#FF6B35] text-white shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] font-black' 
                      : 'bg-white text-gray-500 hover:text-[#1a1a1a]'
                  }`}
                >
                  All Campus Peers
                </button>
                <button
                  type="button"
                  onClick={() => setFilteredMode('this_hotspot')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-[11px] font-black text-center border-2 border-[#1a1a1a] transition duration-100 cursor-pointer ${
                    filteredMode === 'this_hotspot' 
                      ? 'bg-[#FF6B35] text-white shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] font-black' 
                      : 'bg-white text-gray-500 hover:text-[#1a1a1a]'
                  }`}
                >
                  This Hotspot Only
                </button>
              </div>

              {/* Empty state is handled properly */}
              {filteredPeers.length === 0 ? (
                <div className="text-center py-12 px-6 bg-[#f7f4f0] border-2 border-dashed border-[#1a1a1a]/20 rounded-2xl">
                  <span className="text-xl">💤</span>
                  <h4 className="text-xs font-black text-[#1a1a1a] mt-2 uppercase">No Peers Checked In</h4>
                  <p className="text-[10px] text-gray-500 mt-1 leading-normal">There are currently no students checked in with active presence status in this geofenced microzone.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredPeers.map(user => (
                    <div 
                      key={user.id}
                      className="bg-white border-2 border-[#1a1a1a] p-4 rounded-2xl hover:translate-x-[-1.5px] hover:translate-y-[-1.5px] shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] transition-transform flex flex-col justify-between text-left relative"
                    >
                      {/* Card Header Info */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2.5">
                          {/* Avatar block with status ring */}
                          <div className={`h-10 w-10 rounded-full bg-gradient-to-tr ${user.avatarColor} border-2 border-[#1a1a1a] flex items-center justify-center font-bold text-white text-xs shrink-0 relative shadow-sm`}>
                            {user.avatar}
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-[#1a1a1a]"></span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-black text-[#1a1a1a] leading-none">{user.name}</h4>
                              <span className="text-[8px] text-[#FF6B35] font-mono font-black border border-[#1a1a1a]/30 p-0.5 px-1 rounded bg-[#fff8f1]">
                                {user.trustScore} ★ trust
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-gray-400 font-bold uppercase mt-1 block">Level {user.level ?? 1} · {user.title}</span>
                          </div>
                        </div>

                        <span className={`text-[8.5px] font-bold font-mono uppercase border-2 border-[#1a1a1a] px-1.5 py-0.5 rounded-lg ${getIconColor(user.statusType)} shadow-sm shrink-0`}>
                          {user.statusType === 'Studying' && '📖 Studying'}
                          {user.statusType === 'Bored' && '💬 Bored'}
                          {user.statusType === 'Exploring' && '👣 Exploring'}
                          {user.statusType === 'Hungry' && '🍕 Hungry'}
                        </span>
                      </div>

                      {/* Status Dialogue Bubbles */}
                      <div className="my-3 text-xs text-[#1a1a1a] bg-[#f7f4f0] p-2.5 rounded-2xl border-2 border-[#1a1a1a] flex gap-1.5 items-start font-semibold">
                        <span className="text-[#FF6B35]">💬</span>
                        <p className="italic font-bold">"{user.statusText}"</p>
                      </div>

                      {/* Card Footer Detail */}
                      <div className="flex justify-between items-center pt-1 border-t border-gray-100 mt-1">
                        <span className="text-[9px] font-mono text-gray-500 font-black uppercase flex items-center gap-1">
                          <MapPin size={11} className="text-[#FF6B35] stroke-[2]" />
                          <span>{user.location || "Canteen Windows"}</span>
                        </span>
                        
                        {/* Interactive meet-request action - hidden entirely on your own card */}
                        {user.email?.toLowerCase() === sessionUser?.email?.toLowerCase() ? (
                          <span className="text-[9px] font-mono bg-gray-100 text-gray-500 border border-gray-300 px-2 py-0.5 rounded font-black uppercase">
                            This is you
                          </span>
                        ) : renderMeetAction(user)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column C (4/12): Web-Scale Interactive Radar Map & Decent Tunnel Panel */}
            <div className="col-span-12 lg:col-span-4 p-4 flex flex-col justify-between text-left space-y-4 lg:max-h-[700px] lg:overflow-y-auto">
              
              {/* Radar Map Block */}
              <div className="bg-white border-2 border-[#1a1a1a] rounded-2xl p-3 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[9px] font-black uppercase text-[#1a1a1a] tracking-wide text-left">PROXIMITY COORDINATE GRID (POSTGIS)</span>
                  {isSuperAdminUser && (
                    <span className="text-[8px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                      Drag pins to reposition
                    </span>
                  )}
                </div>

                <div
                  ref={gridRef}
                  onPointerMove={handleGridPointerMove}
                  onPointerUp={finishHotspotDrag}
                  onPointerLeave={finishHotspotDrag}
                  className="h-40 bg-[#fdfaf7] border-2 border-[#1a1a1a] rounded-xl relative overflow-hidden flex items-center justify-center"
                >
                  {/* Outer Concentric Radar Circles */}
                  <div className="absolute inset-2 border-2 border-dashed border-[#1a1a1a]/15 rounded-full"></div>
                  <div className="absolute inset-10 border border-[#1a1a1a]/10 rounded-full animate-pulse"></div>
                  <div className="absolute inset-20 border border-[#1a1a1a]/20 rounded-full"></div>

                  {/* Hotspots represented as spatial coordinates */}
                  {hotspots.map(spot => {
                    const hasSelected = selectedHotspotId === spot.id;
                    const isDragging = draggingHotspotId === spot.id;
                    const displayX = isDragging && dragPreviewPos ? dragPreviewPos.x : spot.x;
                    const displayY = isDragging && dragPreviewPos ? dragPreviewPos.y : spot.y;
                    const spotCoords = displayX != null && displayY != null ? { left: `${displayX}%`, top: `${displayY}%` } : { left: '50%', top: '50%' };
                    return (
                      <div 
                        key={spot.id}
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-10 transition-transform duration-150 pointer-events-auto ${
                          isSuperAdminUser ? (isDragging ? 'cursor-grabbing scale-125' : 'cursor-grab hover:scale-110') : 'cursor-pointer'
                        } ${hasSelected && !isSuperAdminUser ? 'scale-125' : !isSuperAdminUser ? 'hover:scale-110' : ''}`}
                        style={spotCoords}
                        onPointerDown={(e) => handleHotspotPointerDown(e, spot.id)}
                        onClick={() => { if (!isSuperAdminUser) setSelectedHotspotId(hasSelected ? null : spot.id); }}
                      >
                        <div className={`h-8 w-8 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center shadow-[1px_1px_2px_rgba(0,0,0,0.15)] ${
                          hasSelected || isDragging ? 'bg-orange-500 text-white' : 'bg-white text-[#FF6B35]'
                        }`}>
                          {getHotspotIconComp(spot.icon)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Self pulsing student position coordinates inside Geofence */}
                  {currentMyStatus && (() => {
                    const mySpot = hotspots.find(h => h.id === currentMyStatus.hotspotId);
                    const coords = { x: mySpot?.x ?? 50, y: mySpot?.y ?? 50 };
                    return (
                      <div 
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-300"
                        style={{ left: `${coords.x}%`, top: `${coords.y - 4}%` }}
                      >
                        <div className="h-4.5 w-4.5 bg-emerald-500 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center relative shadow-sm">
                          <span className="absolute -inset-1.5 rounded-full border border-emerald-500 animate-ping opacity-75"></span>
                        </div>
                        <span className="absolute left-6 -top-1 px-1 bg-emerald-950 text-white font-mono text-[7px] uppercase font-bold rounded shadow-sm whitespace-nowrap">My Beacon</span>
                      </div>
                    );
                  })()}

                  <span className="absolute bottom-1 right-2 text-[8px] font-mono text-gray-400 font-bold">GRID ACCURACY: &lt;1.2m</span>
                </div>
              </div>

              {/* Live Meet Chat (real, Firestore-backed - only exists while an accepted meet is active) */}
              <div className="flex-1 min-h-0 bg-white border-2 border-[#1a1a1a] rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex flex-col">
                {myActiveMeet ? (() => {
                  const otherName = myActiveMeet.fromEmail.toLowerCase() === myEmailLower ? myActiveMeet.toName : myActiveMeet.fromName;
                  const otherInitials = otherName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AM';
                  const otherUserId = myActiveMeet.fromEmail.toLowerCase() === myEmailLower ? myActiveMeet.toId : myActiveMeet.fromId;
                  return (
                    <div className="flex-1 flex flex-col h-full">
                      {/* Chat Header info */}
                      <div className="bg-[#FFF4E5] border-b-2 border-[#1a1a1a] p-3 flex justify-between items-center text-left">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 border border-[#1a1a1a] flex items-center justify-center font-bold text-white text-xs select-none">
                            {otherInitials}
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black text-[#1a1a1a] leading-none">{otherName}</h4>
                            <span className="text-[7.5px] text-emerald-700 font-mono font-bold block mt-0.5">🟢 ACTIVE MEET - LIVE CHAT</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onConcludeMeet(myActiveMeet.id, otherUserId)}
                          className="px-2 py-1 bg-white border border-[#1a1a1a] rounded-lg font-black text-[8.5px] uppercase text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                        >
                          End Meet
                        </button>
                      </div>

                      {/* Chat Messages Log */}
                      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#fcf9f5]">
                        {chatMessages.length === 0 && (
                          <p className="text-center text-[10px] text-gray-400 font-semibold py-4">Say hi! Messages here are only visible to the two of you.</p>
                        )}
                        {chatMessages.map((msg) => {
                          const isMe = msg.senderEmail?.toLowerCase() === myEmailLower;
                          return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] p-2 rounded-xl border border-[#1a1a1a] shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] ${
                                isMe ? 'bg-[#FF6B35] text-white rounded-tr-none' : 'bg-white text-stone-900 rounded-tl-none'
                              }`}>
                                <p className="text-[11px] font-semibold leading-relaxed break-words">{msg.text}</p>
                                <span className={`text-[6.5px] block text-right mt-1 font-mono ${isMe ? 'text-orange-100' : 'text-gray-400'}`}>
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Chat Input form */}
                      <form onSubmit={(e) => handleChatFormSubmit(e, myActiveMeet.id)} className="p-2 border-t border-[#1a1a1a]/20 flex gap-1.5 shrink-0 bg-white">
                        <input 
                          type="text"
                          className="flex-1 text-[11px] font-semibold bg-[#fcf9f5] border border-[#1a1a1a] rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#FF6B35]"
                          placeholder="Type a message..."
                          value={chatInputText}
                          onChange={(e) => setChatInputText(e.target.value)}
                        />
                        <button 
                          type="submit"
                          className="px-3 bg-[#FF6B35] text-white border border-[#1a1a1a] rounded-lg font-black text-[10px] shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] cursor-pointer"
                        >
                          Send
                        </button>
                      </form>

                      {/* Conclude meet */}
                      <div className="bg-[#fcf9f5] px-2.5 pb-2 border-t border-dotted border-rose-300 text-center pt-2">
                        <button 
                          onClick={() => onConcludeMeet(myActiveMeet.id, otherUserId)}
                          className="w-full py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[8.5px] border border-rose-300 uppercase rounded-lg tracking-tight select-none cursor-pointer"
                        >
                          ✅ Conclude meet & go offline
                        </button>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="flex-1 flex flex-col justify-center items-center p-6 text-center space-y-3 bg-[#fbf9f6]">
                    <Shield size={32} className="text-[#FF6B35] animate-pulse stroke-[1.5]" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-[#1a1a1a] uppercase">No Active Meet</h4>
                      <p className="text-[10px] text-gray-400 font-semibold leading-normal max-w-xs mx-auto">
                        Send a Request Meet to a checked-in peer from the lobby. Once they accept, your live chat opens here.
                      </p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500 rounded-xl p-2 text-emerald-950 text-[9px] font-semibold leading-normal">
                      🛡️ Chats are private to the two of you and end automatically when the meet is concluded.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {/* =============== Events Meetup RSVP Tab =============== */}
        {webActiveTab === 'events' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-display font-black text-xl text-[#1a1a1a] tracking-tight">Scheduled B2B Campus Meetups</h3>
                <p className="text-xs text-gray-500 font-semibold uppercase mt-1">Campus clubs and business entities schedule location-based events. RSVP to join.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Event Listings Registry (8/12 cols) */}
              <div className="md:col-span-8 space-y-3.5">
                <span className="font-mono text-[10px] text-gray-400 font-black uppercase">LIVE EVENTS REGISTRY ({events.length})</span>
                
                {events.map(event => {
                  const hasRsvped = event.rsvps.includes('me');
                  const spotFull = event.rsvps.length >= event.maxRsvps;
                  return (
                    <div 
                      key={event.id}
                      className="bg-white border-4 border-[#1a1a1a] p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition hover:translate-x-[-1px] hover:translate-y-[-1px]"
                    >
                      <div className="space-y-2 text-left">
                        <span className="font-mono text-[9px] font-black bg-[#E7F5FF] text-blue-900 border-2 border-[#1a1a1a] rounded-full px-2.5 py-0.5 uppercase shadow-sm">
                          {event.organizer}
                        </span>
                        <h4 className="text-base font-black text-[#1a1a1a] tracking-tight">{event.title}</h4>
                        <div className="text-xs text-gray-500 font-bold">
                          Location: <span className="text-gray-700 underline">{event.location}</span> · Timing: {event.startTime}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 justify-between w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0">
                        {/* RSVP Metrics bar */}
                        <div className="text-right">
                          <span className="font-mono font-black text-xs text-[#1a1a1a] bg-[#f7f4f0] border-2 border-[#1a1a1a] px-2 py-1 rounded-xl shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] inline-flex items-center gap-1">
                            <Users size={12} className="text-[#FF6B35]" />
                            <span>{event.rsvps.length} / {event.maxRsvps}</span>
                          </span>
                          <span className="text-[9px] font-mono font-bold text-gray-400 block mt-1 uppercase">Attending peers</span>
                        </div>

                        {/* Actions */}
                        {hasRsvped ? (
                          <span className="bg-emerald-100 text-emerald-900 border-2 border-emerald-500 px-3 py-1.5 rounded-xl font-bold font-mono text-[10px] uppercase shadow-sm">
                            ✓ Registered RSVP
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleRsvpEvent(event.id)}
                            disabled={spotFull}
                            className={`px-3 py-1.5 font-black text-xs border-2 border-[#1a1a1a] rounded-xl shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition uppercase cursor-pointer ${
                              spotFull 
                                ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed shadow-none' 
                                : 'bg-[#FF6B35] hover:bg-orange-600 text-white'
                            }`}
                          >
                            {spotFull ? 'Venue Packed' : 'Join Activity API'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Instant Social Inventions Scheduler Form (4/12 cols) - organiser/admin only */}
              <div className="md:col-span-4 bg-white border-2 border-[#1a1a1a] p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] text-left">
                {canOrganiseEvents ? (
                  <>
                    <span className="font-mono text-[9px] font-black text-blue-900 uppercase">SCHEDULER SERVICE</span>
                    <h4 className="text-sm font-black text-[#1a1a1a] mt-1 mb-3 uppercase">Trigger B2B Student Meet</h4>

                    <form onSubmit={handleCreateEvent} className="space-y-3.5">
                      <div>
                        <label className="text-[9px] font-black text-gray-450 block uppercase font-mono">Event / Group Title</label>
                        <input 
                          type="text" 
                          required
                          value={newEventTitle} 
                          onChange={(e) => setNewEventTitle(e.target.value)}
                          placeholder="e.g. Generative AI Hackathon"
                          className="w-full text-xs font-semibold bg-[#fdfaf7] border border-[#1a1a1a] rounded-xl p-2 focus:outline-none focus:border-[#FF6B35] mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-black text-gray-450 block uppercase font-mono">Subzone Location</label>
                          <select 
                            value={newEventLocation} 
                            onChange={(e) => setNewEventLocation(e.target.value)}
                            className="w-full text-xs font-bold bg-[#fdfaf7] border border-[#1a1a1a] rounded-xl p-2 mt-1"
                          >
                            <option value="Library Balcony">Library Balcony</option>
                            <option value="Campus Canteen">Campus Canteen</option>
                            <option value="Garden Lawn">Garden Lawn</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-gray-450 block uppercase font-mono font-mono">Organizer Club</label>
                          <input 
                            type="text" 
                            required
                            value={newEventOrganizer} 
                            onChange={(e) => setNewEventOrganizer(e.target.value)}
                            className="w-full text-xs bg-[#fdfaf7] border border-[#1a1a1a] rounded-xl p-2 mt-1 font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-gray-450 block uppercase font-mono">Event Date</label>
                        <input 
                          type="date" 
                          required
                          min={new Date().toISOString().split('T')[0]}
                          value={newEventDate} 
                          onChange={(e) => setNewEventDate(e.target.value)}
                          className="w-full text-xs bg-[#fdfaf7] border border-[#1a1a1a] rounded-xl p-2 mt-1 font-mono font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-black text-gray-450 block uppercase font-mono">Capacity Limit</label>
                          <input 
                            type="number" 
                            value={newEventLimit} 
                            onChange={(e) => setNewEventLimit(parseInt(e.target.value) || 12)}
                            className="w-full text-xs bg-[#fdfaf7] border border-[#1a1a1a] rounded-xl p-2 mt-1 font-mono font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-gray-450 block uppercase font-mono">Start Time</label>
                          <input 
                            type="time" 
                            value={newEventTime} 
                            onChange={(e) => setNewEventTime(e.target.value)}
                            className="w-full text-xs bg-[#fdfaf7] border border-[#1a1a1a] rounded-xl p-2 mt-1 font-mono font-semibold"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-2 bg-[#FF6B35] text-white border-2 border-[#1a1a1a] text-xs font-black rounded-xl shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:bg-orange-600 uppercase transition cursor-pointer"
                      >
                        🚀 Launch Event Alert
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="text-center py-6 space-y-3">
                    <span className="text-3xl block">🔒</span>
                    <h4 className="text-sm font-black text-[#1a1a1a] uppercase">Organiser Access Required</h4>
                    <p className="text-xs text-gray-500 font-semibold leading-relaxed px-2">
                      Only approved organisers and admins can schedule campus events. Want to broadcast your own events here?
                    </p>
                    <a
                      href="mailto:manvendrasingh17791@gmail.com?subject=Amigo%20Organiser%20Access%20Request"
                      className="inline-block text-xs font-black text-[#FF6B35] underline decoration-wavy"
                    >
                      manvendrasingh17791@gmail.com
                    </a>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}


        {/* =============== Gamification XP Tab =============== */}
        {webActiveTab === 'gamification' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
              <span className="h-7 w-1.5 bg-[#FF6B35] rounded-full border border-[#1a1a1a]"></span>
              <h3 className="font-display font-black text-xl text-[#1a1a1a]">Reputation Reputation Ecosystem (Gamification)</h3>
            </div>

            {/* Profile XP & Trust stats card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#E7F5FF] border-2 border-[#1a1a1a] p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] text-left flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[9px] font-black text-blue-900 block uppercase">Google OAuth Security Profile</span>
                  <div className="flex items-center gap-2 mt-1.5 bg-white p-2 border-2 border-[#1a1a1a] rounded-xl shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs ${
                      sessionUser?.role === 'admin' ? 'bg-indigo-600' : 'bg-emerald-500'
                    }`}>
                      {sessionUser ? sessionUser.name.split(' ').map(n => n[0]).join('') : 'G'}
                    </div>
                    <div className="truncate">
                      <p className="font-extrabold text-[#1a1a1a] text-xs shrink-0">{sessionUser ? sessionUser.name : 'Guest User'}</p>
                      <p className="font-mono text-[9px] text-gray-500 shrink-0">{sessionUser ? sessionUser.email : 'guest@gmail.com'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-stone-600 font-semibold border-t border-[#1a1a1a]/10 pt-2 leading-tight">
                  "{stats.bio}"
                </div>

                <div className="mt-3 border-t border-[#1a1a1a]/25 pt-2.5">
                  <span className="font-mono text-[8px] uppercase tracking-wider font-bold block text-gray-400">Affiliation Authority Schema:</span>
                  <div className="text-[11px] font-bold text-blue-950 mt-1">
                    {sessionUser?.role === 'admin' ? (
                      <div>🛡️ Admin in <span className="bg-white border text-[10px] px-1.5 py-0.2 rounded font-mono">{sessionUser.meta.department || 'Management'}</span></div>
                    ) : (
                      <div>🎓 Student in <span className="bg-white border text-[10px] px-1.5 py-0.2 rounded font-mono">{sessionUser?.meta?.branch || 'Computer Science'}</span></div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-[#FFF4E5] border-2 border-[#1a1a1a] p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] text-left">
                <span className="font-mono text-[9px] font-black text-amber-900 block uppercase">Weighted Trust Score</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <h4 className="text-3xl font-black text-[#1a1a1a] font-display">{stats.trustScore}</h4>
                  <span className="text-xs text-stone-500 font-black">★ / 5.0</span>
                </div>
                <p className="text-[10px] text-amber-900 font-semibold mt-2">Formulated from respectful proximity exchanges and verified meetings.</p>
              </div>

              <div className="bg-[#EBFBEE] border-2 border-[#1a1a1a] p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] text-left">
                <span className="font-mono text-[9px] font-black text-emerald-950 block uppercase">Verification Level & XP</span>
                <h4 className="text-2xl font-black text-[#1a1a1a] mt-0.5">Level {stats.level}</h4>
                <div className="w-full bg-emerald-900/10 border border-[#1a1a1a]/30 h-3 rounded-full overflow-hidden mt-1 text-left relative">
                  <div className="bg-emerald-600 h-full" style={{ width: `${(stats.xp / 2000) * 100}%` }}></div>
                </div>
                <p className="text-[9px] text-emerald-800 font-mono font-bold mt-1.5 uppercase text-right tracking-tight">{stats.xp} / 2000 XP (Required for lvl 8)</p>
              </div>
            </div>

            {/* Achievements unlock tracker */}
            <div className="space-y-3">
              <span className="font-mono text-[10px] text-gray-400 font-black uppercase block tracking-wider">UNLOCKED MILESTONE BADGES</span>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {achievements.map(badge => (
                  <div 
                    key={badge.id}
                    className={`p-4 border-2 rounded-2xl text-left flex gap-3 relative shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] ${
                      badge.unlocked 
                        ? 'border-[#1a1a1a] bg-white' 
                        : 'border-dashed border-gray-300 bg-[#fbf9f6] opacity-60'
                    }`}
                  >
                    <span className="text-2xl pt-1 select-none">{badge.icon}</span>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                        <span>{badge.title}</span>
                        {badge.unlocked && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 border border-emerald-950 block"></span>}
                      </h4>
                      <p className="text-[10px] text-gray-500 font-medium leading-relaxed">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}


        {/* =============== Decentralized Privacy Tab =============== */}
        {webActiveTab === 'privacy' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
              <span className="h-7 w-1.5 bg-emerald-500 rounded-full border border-[#1a1a1a]"></span>
              <h3 className="font-display font-black text-xl text-[#1a1a1a]">Decentralized Privacy & Security Settings</h3>
            </div>

            <div className="max-w-2xl mx-auto w-full">
              
              {/* Privacy Controllers */}
              <div className="bg-white border-2 border-[#1a1a1a] p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] text-left space-y-4">
                <span className="font-mono text-[9px] font-black text-emerald-950 uppercase">PRIVACY CONTROLLER</span>
                
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-stone-900 leading-none">Ghost Mode</h4>
                      <span className="text-[10px] text-gray-400 font-semibold block mt-1">Dissolve absolute coordinates</span>
                    </div>
                    <button 
                      onClick={() => setPrivacy({ ...privacy, ghostMode: !privacy.ghostMode })}
                      className={`w-12 h-6 rounded-full border-2 border-[#1a1a1a] transition relative shrink-0 cursor-pointer ${
                        privacy.ghostMode ? 'bg-emerald-500' : 'bg-gray-100'
                      }`}
                    >
                      <span className={`w-4 h-4 bg-white border border-[#1a1a1a] rounded-full absolute top-[2px] transition ${
                        privacy.ghostMode ? 'left-6' : 'left-[2px]'
                      }`}></span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <div>
                      <h4 className="text-xs font-black text-stone-900 leading-none">Inactivity Expiry</h4>
                      <span className="text-[10px] text-gray-400 font-semibold block mt-1">Erase visibility after 3h offline</span>
                    </div>
                    <button 
                      onClick={() => setPrivacy({ ...privacy, autoExpireStatus: !privacy.autoExpireStatus })}
                      className={`w-12 h-6 rounded-full border-2 border-[#1a1a1a] transition relative shrink-0 cursor-pointer ${
                        privacy.autoExpireStatus ? 'bg-emerald-500' : 'bg-gray-100'
                      }`}
                    >
                      <span className={`w-4 h-4 bg-white border border-[#1a1a1a] rounded-full absolute top-[2px] transition ${
                        privacy.autoExpireStatus ? 'left-6' : 'left-[2px]'
                      }`}></span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <div>
                      <h4 className="text-xs font-black text-stone-900 leading-none">Reputation Transparency</h4>
                      <span className="text-[10px] text-gray-400 font-semibold block mt-1">Show campus Weighted Trust Score</span>
                    </div>
                    <button 
                      onClick={() => setPrivacy({ ...privacy, showTrustScore: !privacy.showTrustScore })}
                      className={`w-12 h-6 rounded-full border-2 border-[#1a1a1a] transition relative shrink-0 cursor-pointer ${
                        privacy.showTrustScore ? 'bg-emerald-500' : 'bg-gray-100'
                      }`}
                    >
                      <span className={`w-4 h-4 bg-white border border-[#1a1a1a] rounded-full absolute top-[2px] transition ${
                        privacy.showTrustScore ? 'left-6' : 'left-[2px]'
                      }`}></span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <div>
                      <h4 className="text-xs font-black text-stone-900 leading-none">Silent Pings Only</h4>
                      <span className="text-[10px] text-gray-400 font-semibold block mt-1">Turn off chat bubble alerts</span>
                    </div>
