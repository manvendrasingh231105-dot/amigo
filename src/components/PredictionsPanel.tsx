import React, { useState } from 'react';
import { BarChart3, Trophy, Lock, Zap } from 'lucide-react';
import { Poll, PollOptionTotal, PollWager } from '../types';

interface PredictionsPanelProps {
  polls: Poll[];
  pollOptionTotals: Record<string, PollOptionTotal[]>;
  pollWagers: Record<string, PollWager[]>;
  myEmail: string;
  myXp: number;
  onPlaceWager: (pollId: string, optionId: string, amount: number) => void;
}

function formatXp(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(Math.round(n));
}

export default function PredictionsPanel({
  polls,
  pollOptionTotals,
  pollWagers,
  myEmail,
  myXp,
  onPlaceWager
}: PredictionsPanelProps) {
  const [selectedOption, setSelectedOption] = useState<Record<string, string>>({});
  const [wagerAmount, setWagerAmount] = useState<Record<string, string>>({});

  // Show open/closed polls first, resolved ones after
  const sortedPolls = [...polls].sort((a, b) => {
    if (a.status === b.status) return b.createdAt.localeCompare(a.createdAt);
    const order = { open: 0, closed: 1, resolved: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <span className="h-7 w-1.5 bg-[#FF6B35] rounded-full border border-[#1a1a1a]"></span>
        <h3 className="font-display font-black text-xl text-[#1a1a1a] flex items-center gap-2">
          <BarChart3 size={18} className="text-[#FF6B35]" />
          Predictions
        </h3>
      </div>
      <p className="text-xs text-gray-500 font-semibold -mt-4">
        Back your pick with XP you've earned. Winners split the losing side's pool.
      </p>

      {sortedPolls.length === 0 && (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center">
          <p className="text-sm text-gray-400 font-semibold">No predictions running right now — check back soon.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
        {sortedPolls.map(poll => {
          const totals = pollOptionTotals[poll.id] || [];
          const totalPool = totals.reduce((sum, t) => sum + (t.totalXp || 0), 0);
          const myWager = (pollWagers[poll.id] || []).find(w => w.userEmail?.toLowerCase() === myEmail.toLowerCase());
          const leadingTotal = totals.reduce((max, t) => Math.max(max, t.totalXp || 0), 0);
          const leadingOption = totals.find(t => t.totalXp === leadingTotal && leadingTotal > 0);

          const selOpt = selectedOption[poll.id] || (myWager?.optionId ?? poll.options[0]?.id);
          const amtStr = wagerAmount[poll.id] ?? '';

          return (
            <div key={poll.id} className="bg-white border-2 border-[#1a1a1a] rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-[#1a1a1a]">{poll.title}</h4>
                  {poll.description && <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{poll.description}</p>}
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                  poll.status === 'open' ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : poll.status === 'closed' ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-gray-100 text-gray-500 border-gray-300'
                }`}>
                  {poll.status}
                </span>
              </div>

              <p className="text-[10px] font-mono font-bold text-gray-400">
                {formatXp(totalPool)} XP contributed
                {poll.status !== 'resolved' && leadingOption && totalPool > 0 && (
                  <span className="text-[#FF6B35]"> · leading: {poll.options.find(o => o.id === leadingOption.optionId)?.label} ({Math.round((leadingOption.totalXp / totalPool) * 100)}%)</span>
                )}
              </p>

              <div className="space-y-2">
                {poll.options.map(opt => {
                  const optTotal = totals.find(t => t.optionId === opt.id)?.totalXp || 0;
                  const pct = totalPool > 0 ? Math.round((optTotal / totalPool) * 100) : 0;
                  const odds = optTotal > 0 ? (totalPool / optTotal).toFixed(1) : '—';
                  const isWinner = poll.status === 'resolved' && poll.winningOptionId === opt.id;
                  const isMyPick = myWager?.optionId === opt.id;
                  const selectable = poll.status === 'open' && !myWager;

                  return (
                    <div key={opt.id}>
                      <button
                        disabled={!selectable}
                        onClick={() => setSelectedOption(prev => ({ ...prev, [poll.id]: opt.id }))}
                        className={`w-full text-left px-3 py-2 rounded-xl border-2 transition flex items-center justify-between gap-2 ${
                          isWinner ? 'bg-emerald-50 border-emerald-500'
                          : isMyPick ? 'bg-[#FFF4E5] border-[#FF6B35]'
                          : selOpt === opt.id && selectable ? 'bg-[#FFF4E5] border-[#FF6B35]'
                          : 'bg-[#fdfaf7] border-gray-200'
                        } ${selectable ? 'cursor-pointer hover:border-[#1a1a1a]' : 'cursor-default'}`}
                      >
                        <span className="text-xs font-bold text-[#1a1a1a] flex items-center gap-1.5">
                          {opt.label}
                          {isWinner && <Trophy size={12} className="text-emerald-600" />}
                          {isMyPick && !isWinner && <span className="text-[8px] font-black text-[#FF6B35] uppercase">Your pick</span>}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-gray-400 shrink-0">
                          {formatXp(optTotal)} XP · {pct}% · 1:{odds}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Wager controls */}
              {poll.status === 'open' && !myWager && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    min={1}
                    max={myXp}
                    placeholder={`Up to ${formatXp(myXp)} XP`}
                    value={amtStr}
                    onChange={(e) => setWagerAmount(prev => ({ ...prev, [poll.id]: e.target.value }))}
                    className="flex-1 text-xs font-bold bg-[#fdfaf7] border-2 border-[#1a1a1a] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#FF6B35]"
                  />
                  <button
                    onClick={() => {
                      const amt = parseInt(amtStr, 10);
                      if (!selOpt || isNaN(amt) || amt <= 0) return;
                      onPlaceWager(poll.id, selOpt, amt);
                      setWagerAmount(prev => ({ ...prev, [poll.id]: '' }));
                    }}
                    className="px-3 py-1.5 bg-[#FF6B35] hover:bg-orange-600 text-white font-black text-[10px] rounded-lg border-2 border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] uppercase transition cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Zap size={11} /> Wager
                  </button>
                </div>
              )}

              {poll.status === 'open' && myWager && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                  <Lock size={11} /> Locked in {formatXp(myWager.amount)} XP on this poll — results pending.
                </div>
              )}

              {poll.status === 'closed' && (
                <p className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  Betting closed — awaiting results.
                </p>
              )}

              {poll.status === 'resolved' && myWager && (
                <p className={`text-[10px] font-bold rounded-lg px-2.5 py-1.5 border ${
                  (myWager.payout ?? 0) > 0
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-gray-500 bg-gray-50 border-gray-200'
                }`}>
                  {(myWager.payout ?? 0) > 0
                    ? `🎉 You won ${formatXp(myWager.payout ?? 0)} XP!`
                    : `You wagered ${formatXp(myWager.amount)} XP and it didn't come in this time.`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
