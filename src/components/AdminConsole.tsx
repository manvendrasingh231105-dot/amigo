import React, { useState } from 'react';
import { Shield, Trash2, Ban, CheckCircle2, Zap, Plus, Pencil, X, UserPlus, UserMinus } from 'lucide-react';
import { User, Hotspot, Event } from '../types';

interface AdminConsoleProps {
  users: User[];
  hotspots: Hotspot[];
  events: Event[];
  currentAdminEmail: string;
  onClearUserStatus: (userId: string) => void;
  onToggleBlockUser: (userId: string, blocked: boolean) => void;
  onAwardXp: (userId: string, amount: number) => void;
  onEditHotspot: (id: string, updates: Partial<Hotspot>) => void;
  onAddHotspot: (hotspot: Hotspot) => void;
  onDeleteHotspot: (id: string) => void;
  onEditEvent: (id: string, updates: Partial<Event>) => void;
  onAddEvent: (event: Event) => void;
  onDeleteEvent: (id: string) => void;
  onGrantAdmin: (email: string) => void;
  onRevokeAdmin: (email: string) => void;
}

const ICONS = ['coffee', 'leaf', 'sun', 'book', 'utensils', 'home'];

export default function AdminConsole({
  users,
  hotspots,
  events,
  currentAdminEmail,
  onClearUserStatus,
  onToggleBlockUser,
  onAwardXp,
  onEditHotspot,
  onAddHotspot,
  onDeleteHotspot,
  onEditEvent,
  onAddEvent,
  onDeleteEvent,
  onGrantAdmin,
  onRevokeAdmin
}: AdminConsoleProps) {
  const [subTab, setSubTab] = useState<'users' | 'hotspots' | 'events' | 'roles'>('users');
  const [xpInputs, setXpInputs] = useState<Record<string, string>>({});
  const [editingHotspotId, setEditingHotspotId] = useState<string | null>(null);
  const [hotspotDraft, setHotspotDraft] = useState<Partial<Hotspot>>({});
  const [showNewHotspotForm, setShowNewHotspotForm] = useState(false);
  const [newHotspot, setNewHotspot] = useState<Partial<Hotspot>>({ icon: 'coffee', limit: 10, x: 50, y: 50 });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventDraft, setEventDraft] = useState<Partial<Event>>({});
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({ maxRsvps: 20, isLive: true });
  const [roleEmail, setRoleEmail] = useState('');

  // Only this account can grant/revoke admin access for other people.
  // Every other admin sees and can use every other tab.
  const SUPER_ADMIN_EMAIL = 'manvendrasingh17791@gmail.com';
  const isSuperAdmin = currentAdminEmail.toLowerCase() === SUPER_ADMIN_EMAIL;

  const subTabs: { key: typeof subTab; label: string }[] = [
    { key: 'users', label: 'Users & Status' },
    { key: 'hotspots', label: 'Hotspots' },
    { key: 'events', label: 'Meetups & Events' },
    ...(isSuperAdmin ? [{ key: 'roles' as const, label: 'Admin Roles' }] : [])
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <span className="h-7 w-1.5 bg-indigo-600 rounded-full border border-[#1a1a1a]"></span>
        <h3 className="font-display font-black text-xl text-[#1a1a1a] flex items-center gap-2">
          <Shield size={18} className="text-indigo-600" />
          Admin Console
        </h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {subTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition border-2 cursor-pointer ${
              subTab === t.key
                ? 'bg-indigo-600 text-white border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a1a1a] hover:text-[#1a1a1a]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== USERS ===== */}
      {subTab === 'users' && (
        <div className="space-y-3 max-w-4xl">
          {users.length === 0 && (
            <p className="text-xs text-gray-400 font-semibold">No users found yet.</p>
          )}
          {users.map(u => (
            <div key={u.id} className="bg-white border-2 border-[#1a1a1a] rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${u.avatarColor} border-2 border-[#1a1a1a] flex items-center justify-center text-white font-black text-xs shrink-0`}>
                  {u.avatar}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#1a1a1a] truncate flex items-center gap-1.5">
                    {u.name}
                    {u.role === 'admin' && <Shield size={12} className="text-indigo-600 shrink-0" />}
                    {u.blocked && <span className="text-[9px] bg-red-100 text-red-700 font-black px-1.5 py-0.5 rounded-full border border-red-300">BLOCKED</span>}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono truncate">{u.email}</p>
                  <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                    Lvl {u.level ?? 1} · {u.xp ?? 0} XP · {u.meetsCount ?? 0} meets
                    {u.statusText ? (
                      <span className="text-emerald-700"> · "{u.statusText}"</span>
                    ) : (
                      <span className="text-gray-300"> · no active status</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {u.statusText && (
                  <button
                    onClick={() => onClearUserStatus(u.id)}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-black border-2 border-[#1a1a1a] bg-amber-100 hover:bg-amber-200 transition flex items-center gap-1 cursor-pointer"
                  >
                    <X size={11} /> Clear status
                  </button>
                )}

                <button
                  onClick={() => onToggleBlockUser(u.id, !u.blocked)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border-2 border-[#1a1a1a] transition flex items-center gap-1 cursor-pointer ${
                    u.blocked ? 'bg-emerald-100 hover:bg-emerald-200' : 'bg-red-100 hover:bg-red-200'
                  }`}
                >
                  {u.blocked ? <><CheckCircle2 size={11} /> Unblock</> : <><Ban size={11} /> Block</>}
                </button>

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="XP"
                    value={xpInputs[u.id] || ''}
                    onChange={(e) => setXpInputs(prev => ({ ...prev, [u.id]: e.target.value }))}
                    className="w-16 px-2 py-1.5 rounded-lg text-[10px] font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                  />
                  <button
                    onClick={() => {
                      const amt = parseInt(xpInputs[u.id] || '0', 10);
                      if (!isNaN(amt) && amt !== 0) {
                        onAwardXp(u.id, amt);
                        setXpInputs(prev => ({ ...prev, [u.id]: '' }));
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-black border-2 border-[#1a1a1a] bg-indigo-100 hover:bg-indigo-200 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Zap size={11} /> Award
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== HOTSPOTS ===== */}
      {subTab === 'hotspots' && (
        <div className="space-y-3 max-w-4xl">
          <button
            onClick={() => setShowNewHotspotForm(v => !v)}
            className="px-3 py-2 rounded-xl text-xs font-black border-2 border-[#1a1a1a] bg-emerald-100 hover:bg-emerald-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={13} /> {showNewHotspotForm ? 'Cancel' : 'Add new hotspot'}
          </button>

          {showNewHotspotForm && (
            <div className="bg-white border-2 border-[#1a1a1a] rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Hotspot name"
                  value={newHotspot.name || ''}
                  onChange={(e) => setNewHotspot(prev => ({ ...prev, name: e.target.value }))}
                  className="px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                />
                <input
                  placeholder="Description"
                  value={newHotspot.description || ''}
                  onChange={(e) => setNewHotspot(prev => ({ ...prev, description: e.target.value }))}
                  className="px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                />
                <select
                  value={newHotspot.icon}
                  onChange={(e) => setNewHotspot(prev => ({ ...prev, icon: e.target.value }))}
                  className="px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                >
                  {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
                <input
                  type="number"
                  placeholder="Capacity limit"
                  value={newHotspot.limit ?? ''}
                  onChange={(e) => setNewHotspot(prev => ({ ...prev, limit: parseInt(e.target.value, 10) || 0 }))}
                  className="px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                />
                <input
                  type="number"
                  placeholder="Map X % (0-100)"
                  value={newHotspot.x ?? ''}
                  onChange={(e) => setNewHotspot(prev => ({ ...prev, x: parseInt(e.target.value, 10) || 0 }))}
                  className="px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                />
                <input
                  type="number"
                  placeholder="Map Y % (0-100)"
                  value={newHotspot.y ?? ''}
                  onChange={(e) => setNewHotspot(prev => ({ ...prev, y: parseInt(e.target.value, 10) || 0 }))}
                  className="px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                />
              </div>
              <button
                onClick={() => {
                  if (!newHotspot.name || !newHotspot.description) return;
                  const id = 'spot-' + newHotspot.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + Date.now().toString(36);
                  onAddHotspot({
                    id,
                    name: newHotspot.name,
                    icon: newHotspot.icon || 'coffee',
                    activeCount: 0,
                    limit: newHotspot.limit || 10,
                    description: newHotspot.description,
                    subZones: [],
                    x: newHotspot.x ?? 50,
                    y: newHotspot.y ?? 50
                  });
                  setNewHotspot({ icon: 'coffee', limit: 10, x: 50, y: 50 });
                  setShowNewHotspotForm(false);
                }}
                className="px-3 py-2 rounded-xl text-xs font-black border-2 border-[#1a1a1a] bg-[#FF6B35] text-white hover:bg-orange-600 transition cursor-pointer"
              >
                Create hotspot
              </button>
            </div>
          )}

          {hotspots.map(h => (
            <div key={h.id} className="bg-white border-2 border-[#1a1a1a] rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
              {editingHotspotId === h.id ? (
                <div className="space-y-2">
                  <input
                    value={hotspotDraft.name ?? h.name}
                    onChange={(e) => setHotspotDraft(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                    placeholder="Name"
                  />
                  <input
                    value={hotspotDraft.description ?? h.description}
                    onChange={(e) => setHotspotDraft(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                    placeholder="Description"
                  />
                  <input
                    type="number"
                    value={hotspotDraft.limit ?? h.limit}
                    onChange={(e) => setHotspotDraft(prev => ({ ...prev, limit: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                    placeholder="Capacity limit"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onEditHotspot(h.id, hotspotDraft);
                        setEditingHotspotId(null);
                        setHotspotDraft({});
                      }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-black border-2 border-[#1a1a1a] bg-emerald-100 hover:bg-emerald-200 transition cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingHotspotId(null); setHotspotDraft({}); }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-black border-2 border-[#1a1a1a] bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#1a1a1a] truncate">{h.name}</p>
                    <p className="text-[10px] text-gray-400 font-semibold truncate">{h.description}</p>
                    <p className="text-[10px] font-bold text-gray-500 mt-0.5">{h.activeCount}/{h.limit} active</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setEditingHotspotId(h.id); setHotspotDraft({}); }}
                      className="p-2 rounded-lg border-2 border-[#1a1a1a] bg-white hover:bg-gray-100 transition cursor-pointer"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteHotspot(h.id)}
                      className="p-2 rounded-lg border-2 border-[#1a1a1a] bg-red-100 hover:bg-red-200 transition cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== EVENTS ===== */}
      {subTab === 'events' && (
        <div className="space-y-3 max-w-4xl">
          <button
            onClick={() => setShowNewEventForm(v => !v)}
            className="px-3 py-2 rounded-xl text-xs font-black border-2 border-[#1a1a1a] bg-emerald-100 hover:bg-emerald-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={13} /> {showNewEventForm ? 'Cancel' : 'Add new event'}
          </button>

          {showNewEventForm && (
            <div className="bg-white border-2 border-[#1a1a1a] rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Event title"
                  value={newEvent.title || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  className="px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                />
                <input
                  placeholder="Location"
                  value={newEvent.location || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  className="px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                />
                <input
                  placeholder="Organizer"
                  value={newEvent.organizer || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, organizer: e.target.value }))}
                  className="px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                />
                <input
                  placeholder="Start time (e.g. Today 6 PM)"
                  value={newEvent.startTime || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                  className="px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                />
                <input
                  type="number"
                  placeholder="Max RSVPs"
                  value={newEvent.maxRsvps ?? ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, maxRsvps: parseInt(e.target.value, 10) || 0 }))}
                  className="px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                />
              </div>
              <button
                onClick={() => {
                  if (!newEvent.title || !newEvent.location || !newEvent.organizer || !newEvent.startTime) return;
                  const id = 'evt-' + newEvent.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + Date.now().toString(36);
                  onAddEvent({
                    id,
                    title: newEvent.title,
                    location: newEvent.location,
                    organizer: newEvent.organizer,
                    rsvps: [],
                    maxRsvps: newEvent.maxRsvps || 20,
                    startTime: newEvent.startTime,
                    isLive: true
                  });
                  setNewEvent({ maxRsvps: 20, isLive: true });
                  setShowNewEventForm(false);
                }}
                className="px-3 py-2 rounded-xl text-xs font-black border-2 border-[#1a1a1a] bg-[#FF6B35] text-white hover:bg-orange-600 transition cursor-pointer"
              >
                Create event
              </button>
            </div>
          )}

          {events.map(ev => (
            <div key={ev.id} className="bg-white border-2 border-[#1a1a1a] rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
              {editingEventId === ev.id ? (
                <div className="space-y-2">
                  <input
                    value={eventDraft.title ?? ev.title}
                    onChange={(e) => setEventDraft(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                    placeholder="Title"
                  />
                  <input
                    value={eventDraft.location ?? ev.location}
                    onChange={(e) => setEventDraft(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                    placeholder="Location"
                  />
                  <input
                    value={eventDraft.startTime ?? ev.startTime}
                    onChange={(e) => setEventDraft(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                    placeholder="Start time"
                  />
                  <input
                    type="number"
                    value={eventDraft.maxRsvps ?? ev.maxRsvps}
                    onChange={(e) => setEventDraft(prev => ({ ...prev, maxRsvps: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
                    placeholder="Max RSVPs"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onEditEvent(ev.id, eventDraft);
                        setEditingEventId(null);
                        setEventDraft({});
                      }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-black border-2 border-[#1a1a1a] bg-emerald-100 hover:bg-emerald-200 transition cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingEventId(null); setEventDraft({}); }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-black border-2 border-[#1a1a1a] bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#1a1a1a] truncate">{ev.title}</p>
                    <p className="text-[10px] text-gray-400 font-semibold truncate">{ev.location} · {ev.startTime}</p>
                    <p className="text-[10px] font-bold text-gray-500 mt-0.5">{ev.rsvps.length}/{ev.maxRsvps} RSVPs · by {ev.organizer}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setEditingEventId(ev.id); setEventDraft({}); }}
                      className="p-2 rounded-lg border-2 border-[#1a1a1a] bg-white hover:bg-gray-100 transition cursor-pointer"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteEvent(ev.id)}
                      className="p-2 rounded-lg border-2 border-[#1a1a1a] bg-red-100 hover:bg-red-200 transition cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== ROLES (super admin only) ===== */}
      {subTab === 'roles' && isSuperAdmin && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-white border-2 border-[#1a1a1a] rounded-2xl p-5 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] space-y-3">
            <span className="font-mono text-[9px] font-black text-indigo-900 uppercase">Grant / revoke admin access</span>
            <p className="text-[10px] text-gray-400 font-semibold">
              The target must already have a registered student account. Granting admin gives them every capability on this page.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="user@gmail.com"
                value={roleEmail}
                onChange={(e) => setRoleEmail(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-bold border-2 border-[#1a1a1a] focus:outline-none focus:border-indigo-600"
              />
              <button
                onClick={() => { if (roleEmail.trim()) { onGrantAdmin(roleEmail.trim()); setRoleEmail(''); } }}
                className="px-3 py-2 rounded-xl text-xs font-black border-2 border-[#1a1a1a] bg-indigo-100 hover:bg-indigo-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus size={13} /> Grant admin
              </button>
              <button
                onClick={() => { if (roleEmail.trim()) { onRevokeAdmin(roleEmail.trim()); setRoleEmail(''); } }}
                className="px-3 py-2 rounded-xl text-xs font-black border-2 border-[#1a1a1a] bg-red-100 hover:bg-red-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserMinus size={13} /> Revoke admin
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-mono text-[9px] font-black text-gray-400 uppercase">Current admins</span>
            {users.filter(u => u.role === 'admin').map(a => (
              <div key={a.id} className="bg-white border-2 border-[#1a1a1a] rounded-xl p-3 flex items-center justify-between">
                <p className="text-xs font-black text-[#1a1a1a] flex items-center gap-1.5">
                  <Shield size={12} className="text-indigo-600" /> {a.name} <span className="text-gray-400 font-mono font-semibold">({a.email})</span>
                </p>
                {a.email?.toLowerCase() === currentAdminEmail.toLowerCase() && (
                  <span className="text-[9px] font-black text-gray-400 uppercase">You</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
