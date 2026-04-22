'use client';

import { useState, useEffect } from 'react';
import {
  Package, MapPin, Clock, LogOut, LogIn, ArrowLeft,
  CheckCircle, Wrench, Hash, DollarSign, ChevronDown, AlertCircle,
  AlertTriangle, X,
} from 'lucide-react';
import { VDC_TEAM, VDC_TEAM_NAMES, getMemberColor, getMemberGradient, getInitials } from '@/lib/team';

/* ─── types ─────────────────────────────────────── */
interface ActivityRow {
  id: number; action: string; checkout_type: string | null;
  user_name: string | null; location: string | null;
  job_number: string | null; cost_code: string | null;
  notes: string | null; checked_out_at: string | null;
  checked_in_at: string | null; duration_minutes: number | null;
  timestamp: string; components_included: string[] | null;
}
interface IssueRow {
  id: number; reported_by: string; description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'resolved'; reported_at: string;
  resolved_at: string | null; resolved_by: string | null;
}
interface Equipment {
  id: string; name: string; category: string;
  description: string; serial_number: string;
  status: 'available' | 'checked_out' | 'maintenance';
  current_user: string | null; current_location: string | null;
  checkout_type: string | null; job_number: string | null;
  cost_code: string | null; checked_out_at: string | null;
  activity: ActivityRow[]; components: string[]; issues: IssueRow[];
}

/* ─── helpers ────────────────────────────────────── */
function timeAgo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fmtDuration(mins: number | null) {
  if (!mins) return null;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function MemberAvatar({ name }: { name: string }) {
  const isVDC = VDC_TEAM.find(m => m.name === name);
  const gradient = getMemberGradient(name);
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
      style={{ background: isVDC ? gradient : '#94a3b8' }}>
      {getInitials(name)}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────── */
export default function EquipmentPage({ params }: { params: { id: string } }) {
  const [eq, setEq] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'idle' | 'checkout' | 'checkin'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // checkout form
  const [checkoutType, setCheckoutType] = useState<'short_term' | 'long_term'>('short_term');
  const [member, setMember] = useState('');
  const [longTermName, setLongTermName] = useState('');
  const [location, setLocation] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [costCode, setCostCode] = useState('');
  const [notes, setNotes] = useState('');
  const [checkinNotes, setCheckinNotes] = useState('');
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(new Set());

  // issue form
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueReporter, setIssueReporter] = useState('');
  const [issueSeverity, setIssueSeverity] = useState<'low'|'medium'|'high'|'critical'>('medium');
  const [issueDesc, setIssueDesc] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  const fetchEq = async () => {
    const res = await fetch(`/api/equipment/${params.id}`);
    if (!res.ok) { setError(res.status === 404 ? 'Equipment not found' : 'Load failed'); setLoading(false); return; }
    const data = await res.json();
    setEq(data);
    setSelectedComponents(new Set(data.components ?? []));
    setLoading(false);
  };
  useEffect(() => { fetchEq(); }, [params.id]);

  const doCheckout = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setApiError(null);
    const userName = checkoutType === 'short_term' ? member : longTermName;
    const res = await fetch('/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipment_id: params.id, user_name: userName, location, checkout_type: checkoutType, job_number: jobNumber, cost_code: costCode, notes, components_included: [...selectedComponents] }),
    });
    if (res.ok) {
      setSuccess(`Checked out to ${userName}. You're responsible for this item.`);
      setMode('idle'); setMember(''); setLongTermName(''); setLocation(''); setJobNumber(''); setCostCode(''); setNotes('');
      await fetchEq();
    } else {
      const d = await res.json(); setApiError(d.error ?? 'Checkout failed');
    }
    setSubmitting(false);
  };

  const doCheckin = async () => {
    setSubmitting(true); setApiError(null);
    const res = await fetch('/api/checkin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipment_id: params.id, notes: checkinNotes }),
    });
    if (res.ok) {
      setSuccess('Checked in successfully. Item is now available.');
      setMode('idle'); setCheckinNotes('');
      await fetchEq();
    } else {
      const d = await res.json(); setApiError(d.error ?? 'Check-in failed');
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !eq) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center"><Package size={48} className="mx-auto mb-4 text-slate-200" />
        <h1 className="text-lg font-semibold text-slate-700">{error ?? 'Not found'}</h1></div>
    </div>
  );

  const STATUS_CFG = {
    available:   { label: 'AVAILABLE',     sub: 'Ready to check out', bg: '#10b981', Icon: CheckCircle },
    checked_out: { label: 'CHECKED OUT',   sub: 'Currently in use',   bg: '#f59e0b', Icon: LogOut },
    maintenance: { label: 'IN MAINTENANCE', sub: 'Not available',      bg: '#ef4444', Icon: Wrench },
  };
  const sc = STATUS_CFG[eq.status];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <a href="/" className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"><ArrowLeft size={18} /></a>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg,#5b8dee,#7c5cbf)' }}>
            <Package size={13} className="text-white" />
          </div>
          <span className="font-semibold text-sm text-slate-700">Equipment Tracker</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {/* Success */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircle size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-emerald-800">{success}</p>
          </div>
        )}
        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        {/* Equipment info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-100 rounded-xl"><Package size={24} className="text-slate-500" /></div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{eq.name}</h1>
              <p className="text-slate-500 text-sm mt-0.5">{eq.category}</p>
              {eq.serial_number && <p className="text-xs text-slate-400 font-mono mt-1">S/N: {eq.serial_number}</p>}
              {eq.description && <p className="text-sm text-slate-500 mt-2 leading-snug">{eq.description}</p>}
            </div>
          </div>
        </div>

        {/* Status banner */}
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: sc.bg }}>
          <div className="p-2 bg-white/20 rounded-xl"><sc.Icon size={22} className="text-white" /></div>
          <div>
            <p className="text-white font-bold text-lg leading-none">{sc.label}</p>
            <p className="text-white/75 text-sm mt-0.5">{sc.sub}</p>
          </div>
        </div>

        {/* Currently checked out info */}
        {eq.status === 'checked_out' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Currently With</p>
            <div className="flex items-center gap-3">
              <MemberAvatar name={eq.current_user!} />
              <div>
                <p className="font-semibold text-slate-900">{eq.current_user}</p>
                <p className="text-xs text-slate-500">{eq.checkout_type === 'short_term' ? 'Day Use (VDC)' : 'Long-Term Checkout'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600"><MapPin size={14} className="text-slate-400" />{eq.current_location}</div>
              {eq.job_number && <div className="flex items-center gap-2 text-slate-600"><Hash size={14} className="text-slate-400" />{eq.job_number}</div>}
              {eq.cost_code && <div className="flex items-center gap-2 text-slate-600"><DollarSign size={14} className="text-slate-400" />{eq.cost_code}</div>}
              {eq.checked_out_at && <div className="flex items-center gap-2 text-slate-500"><Clock size={14} className="text-slate-400" />{timeAgo(eq.checked_out_at)}</div>}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {mode === 'idle' && eq.status === 'available' && (
          <button onClick={() => setMode('checkout')}
            className="w-full py-4 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-sm"
            style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
            <LogOut size={22} /> Check Out This Item
          </button>
        )}
        {mode === 'idle' && eq.status === 'checked_out' && (
          <button onClick={() => setMode('checkin')}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-sm">
            <LogIn size={22} /> Check In This Item
          </button>
        )}

        {/* ── Checkout form ── */}
        {mode === 'checkout' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Check Out Details</h3>

            {/* Type toggle */}
            <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
              {([['short_term','Day Use (VDC)'],['long_term','Long-Term']] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => setCheckoutType(val)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${checkoutType === val ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={doCheckout} className="space-y-4">
              {/* Person */}
              {checkoutType === 'short_term' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">VDC Team Member *</label>
                  <div className="relative">
                    <select required value={member} onChange={e => setMember(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white appearance-none">
                      <option value="">Select team member…</option>
                      {VDC_TEAM_NAMES.map(n => {
                        const m = VDC_TEAM.find(t => t.name === n)!;
                        return <option key={n} value={n}>{n}</option>;
                      })}
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  {member && VDC_TEAM.find(t => t.name === member) && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: getMemberGradient(member) }}>
                        {getInitials(member)}
                      </div>
                      <span style={{ color: getMemberColor(member) }} className="font-medium">{member}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Primary Contact Name *</label>
                  <input required value={longTermName} onChange={e => setLongTermName(e.target.value)}
                    autoFocus placeholder="Full name (subcontractor, PM, etc.)"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Job # <span className="text-slate-400 font-normal">(optional)</span></label>
                <input value={jobNumber} onChange={e => setJobNumber(e.target.value)}
                  placeholder="e.g. JOB-2024-047"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Cost Code <span className="text-slate-400 font-normal">(optional)</span></label>
                <input value={costCode} onChange={e => setCostCode(e.target.value)}
                  placeholder="e.g. CC-1420"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Site / Location *</label>
                <input required value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Site A - Downtown"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" />
              </div>
              {eq.components && eq.components.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Components Included</label>
                  <p className="text-xs text-slate-400 mb-2">Uncheck any components you are NOT taking.</p>
                  <div className="space-y-2">
                    {eq.components.map(comp => (
                      <label key={comp} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                        <input type="checkbox"
                          checked={selectedComponents.has(comp)}
                          onChange={e => {
                            const next = new Set(selectedComponents);
                            e.target.checked ? next.add(comp) : next.delete(comp);
                            setSelectedComponents(next);
                          }}
                          className="w-4 h-4 rounded accent-blue-600" />
                        <span className="text-sm text-slate-700">{comp}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Condition notes, expected return, etc." rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setMode('idle'); setApiError(null); }}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
                  {submitting ? 'Checking Out…' : 'Confirm Checkout'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Check-in form ── */}
        {mode === 'checkin' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Check In — {eq.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Condition / Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea autoFocus value={checkinNotes} onChange={e => setCheckinNotes(e.target.value)}
                  placeholder="e.g. Good condition, needs battery charge…" rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setMode('idle'); setApiError(null); }}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={doCheckin} disabled={submitting}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50">
                  {submitting ? 'Checking In…' : 'Confirm Check In'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report Issue */}
        {!showIssueForm ? (
          <button onClick={() => setShowIssueForm(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-amber-300 text-amber-700 font-medium text-sm flex items-center justify-center gap-2 hover:bg-amber-50 transition-colors">
            <AlertTriangle size={16} /> Report an Issue with This Equipment
          </button>
        ) : (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500" /> Report Issue</h3>
              <button onClick={() => { setShowIssueForm(false); setIssueDesc(''); setIssueReporter(''); setIssueSeverity('medium'); }}
                className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={15} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name *</label>
                <div className="relative">
                  <select value={issueReporter} onChange={e => setIssueReporter(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base bg-white appearance-none">
                    <option value="">Select your name…</option>
                    {VDC_TEAM_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Severity *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low','medium','high','critical'] as const).map(s => {
                    const cfg = { low: 'bg-blue-50 text-blue-700 border-blue-200', medium: 'bg-amber-50 text-amber-700 border-amber-200', high: 'bg-orange-50 text-orange-700 border-orange-200', critical: 'bg-red-50 text-red-700 border-red-200' };
                    const sel = { low: 'bg-blue-600 text-white border-blue-600', medium: 'bg-amber-500 text-white border-amber-500', high: 'bg-orange-500 text-white border-orange-500', critical: 'bg-red-600 text-white border-red-600' };
                    return (
                      <button key={s} type="button" onClick={() => setIssueSeverity(s)}
                        className={`py-2 rounded-xl border text-xs font-semibold capitalize transition-colors ${issueSeverity === s ? sel[s] : cfg[s]}`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description *</label>
                <textarea value={issueDesc} onChange={e => setIssueDesc(e.target.value)}
                  placeholder="Describe the issue in detail…" rows={3} autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowIssueForm(false); setIssueDesc(''); setIssueReporter(''); setIssueSeverity('medium'); }}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button
                  disabled={!issueReporter || !issueDesc.trim() || issueSubmitting}
                  onClick={async () => {
                    setIssueSubmitting(true);
                    await fetch('/api/issues', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ equipment_id: eq.id, equipment_name: eq.name, reported_by: issueReporter, description: issueDesc.trim(), severity: issueSeverity }),
                    });
                    setIssueSubmitting(false); setShowIssueForm(false);
                    setIssueDesc(''); setIssueReporter(''); setIssueSeverity('medium');
                    setSuccess('Issue reported. Thank you!');
                    await fetchEq();
                  }}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold transition-colors">
                  {issueSubmitting ? 'Submitting…' : 'Submit Issue'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Issues for this equipment */}
        {eq.issues && eq.issues.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" /> Issue Log
              </h3>
              <span className="text-xs text-slate-400">{eq.issues.filter(i => i.status === 'open').length} open</span>
            </div>
            <div className="divide-y divide-slate-50">
              {eq.issues.map(issue => {
                const sev = { low: 'bg-blue-50 text-blue-700', medium: 'bg-amber-50 text-amber-700', high: 'bg-orange-50 text-orange-700', critical: 'bg-red-50 text-red-700' };
                return (
                  <div key={issue.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${sev[issue.severity]}`}>{issue.severity}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${issue.status === 'open' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{issue.status}</span>
                          <span className="text-xs text-slate-400">{new Date(issue.reported_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <p className="text-sm text-slate-800">{issue.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Reported by {issue.reported_by}{issue.resolved_by ? ` · Resolved by ${issue.resolved_by}` : ''}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Activity history */}
        {eq.activity.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Activity History</h3>
              <span className="text-xs text-slate-400">{eq.activity.length} events</span>
            </div>
            <div className="divide-y divide-slate-50">
              {eq.activity.map(r => (
                <div key={r.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${r.action === 'checked_out' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                    {r.action === 'checked_out' ? <LogOut size={12} className="text-amber-600" /> : <LogIn size={12} className="text-emerald-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800">
                        {r.action === 'checked_out' ? 'Checked out' : 'Checked in'}
                        {r.user_name && ` · ${r.user_name}`}
                      </p>
                      {r.checkout_type && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${r.checkout_type === 'short_term' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                          {r.checkout_type === 'short_term' ? 'Day Use' : 'Long-Term'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-0.5 text-xs text-slate-400">
                      {r.location && <span className="flex items-center gap-1"><MapPin size={10} />{r.location}</span>}
                      {r.job_number && <span className="flex items-center gap-1"><Hash size={10} />{r.job_number}</span>}
                      {r.cost_code && <span>{r.cost_code}</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-slate-400">
                      {r.checked_out_at && <span>Out: {fmtDate(r.checked_out_at)}</span>}
                      {r.checked_in_at && <span>In: {fmtDate(r.checked_in_at)}</span>}
                      {r.duration_minutes != null && <span>({fmtDuration(r.duration_minutes)})</span>}
                      <span>{timeAgo(r.timestamp)}</span>
                    </div>
                    {r.components_included && r.components_included.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.components_included.map(c => (
                          <span key={c} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{c}</span>
                        ))}
                      </div>
                    )}
                    {r.notes && <p className="text-xs text-slate-500 mt-1 italic">"{r.notes}"</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
