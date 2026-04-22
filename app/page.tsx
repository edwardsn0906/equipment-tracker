'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package, Plus, Search, RefreshCw, QrCode, ExternalLink,
  Zap, Ruler, Crosshair, MapPin, Clock, X, Download, Star, Lightbulb,
  Wrench, Crown, CheckCircle, LogOut, LogIn, Activity, BarChart2,
  ChevronDown, Hash, DollarSign, AlertTriangle, Camera, Plane, Tablet, ScanLine,
} from 'lucide-react';
import { VDC_TEAM, getMemberColor, getMemberGradient, getInitials } from '@/lib/team';

/* ─── types ─────────────────────────────────────── */
interface Equipment {
  id: string; name: string; category: string;
  description: string; serial_number: string;
  status: 'available' | 'checked_out' | 'maintenance';
  current_user: string | null; current_location: string | null;
  checkout_type: string | null; job_number: string | null;
  cost_code: string | null; checked_out_at: string | null;
  created_at: string; activity_count: number;
  latest_activity: string | null; components: string[];
}
interface ActivityRow {
  id: number; equipment_id: string; equipment_name: string;
  action: string; checkout_type: string | null;
  user_name: string | null; location: string | null;
  job_number: string | null; cost_code: string | null;
  notes: string | null; checked_out_at: string | null;
  checked_in_at: string | null; duration_minutes: number | null;
  timestamp: string; components_included: string[] | null;
}

/* ─── helpers ────────────────────────────────────── */
const CATEGORIES = [
  'Total Station', 'Faro Scanner', '360 Camera', 'Drone',
  'Layout Tablet', 'iPad', 'Other',
];

function categoryIcon(cat: string) {
  const m: Record<string, React.ElementType> = {
    'Total Station': Crosshair, 'Faro Scanner': ScanLine,
    '360 Camera': Camera, 'Drone': Plane,
    'Layout Tablet': Tablet, 'iPad': Tablet,
  };
  return m[cat] ?? Package;
}

const memberIcon: Record<string, React.ElementType> = {
  'Noah Edwards': Zap, 'Lisbeth Uraga-Velazquez': Star, 'Lisa Atchison': Lightbulb,
  'Jon Garner': Wrench, 'Daniel Rodriguez': Ruler, 'Chad Reichert': Crown,
};

function MemberAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const color = getMemberColor(name);
  const gradient = getMemberGradient(name);
  const Icon = memberIcon[name];
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ background: gradient }}>
      {Icon ? <Icon size={size === 'sm' ? 13 : 16} color="#fff" /> : getInitials(name)}
    </div>
  );
}

const STATUS = {
  available:   { label: 'Available',    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  checked_out: { label: 'Checked Out',  bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  maintenance: { label: 'Maintenance',  bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500'     },
};

function timeAgo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDuration(mins: number | null) {
  if (!mins) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/* ─── QR Modal ───────────────────────────────────── */
function QRModal({ eq, onClose }: { eq: Equipment; onClose: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = `${window.location.origin}/equipment/${eq.id}`;
    setUrl(u);
    if (ref.current) {
      import('qrcode').then(QRCode => {
        QRCode.toCanvas(ref.current!, u, { width: 220, margin: 2, color: { dark: '#0f172a', light: '#fff' } });
      });
    }
  }, [eq.id]);
  const download = () => {
    const a = document.createElement('a');
    a.download = `qr-${eq.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.href = ref.current!.toDataURL();
    a.click();
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">QR Code</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="flex justify-center mb-4">
          <div className="p-2 border-2 border-slate-100 rounded-xl"><canvas ref={ref} /></div>
        </div>
        <div className="text-center mb-4">
          <p className="font-semibold text-slate-900">{eq.name}</p>
          <p className="text-sm text-slate-500">{eq.category}</p>
          {eq.serial_number && <p className="text-xs text-slate-400 font-mono">S/N: {eq.serial_number}</p>}
        </div>
        <div className="space-y-2">
          <button onClick={download} className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors">
            <Download size={15} /> Download PNG
          </button>
          <a href={`/equipment/${eq.id}`} target="_blank" className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
            <ExternalLink size={15} /> Open Scan Page
          </a>
        </div>
        <p className="text-xs text-slate-400 text-center mt-3">Scan with phone to check in / out</p>
      </div>
    </div>
  );
}

/* ─── Add Equipment Modal ────────────────────────── */
function AddModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: '', category: 'Total Station', serial_number: '', description: '' });
  const [components, setComponents] = useState<string[]>([]);
  const [compInput, setCompInput] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const addComponent = () => {
    const val = compInput.trim();
    if (val && !components.includes(val)) setComponents(c => [...c, val]);
    setCompInput('');
  };
  const removeComponent = (c: string) => setComponents(cs => cs.filter(x => x !== c));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    await fetch('/api/equipment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, components }),
    });
    setLoading(false); onDone(); onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-900">Add Equipment</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Leica TS16 Total Station"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
            <input value={form.serial_number} onChange={e => set('serial_number', e.target.value)}
              placeholder="e.g. TS16-2024-001"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} placeholder="Brief description..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
          </div>

          {/* Components */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Associated Components</label>
            <p className="text-xs text-slate-400 mb-2">Add batteries, cables, cases, etc. — users will check these off at checkout.</p>
            <div className="flex gap-2">
              <input value={compInput} onChange={e => setCompInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addComponent(); } }}
                placeholder="e.g. Battery Pack, Charging Cable…"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              <button type="button" onClick={addComponent}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors">
                Add
              </button>
            </div>
            {components.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {components.map(c => (
                  <span key={c} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    {c}
                    <button type="button" onClick={() => removeComponent(c)} className="hover:text-blue-900 leading-none">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {loading ? 'Adding…' : 'Add Equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Equipment Card ─────────────────────────────── */
function EquipCard({ eq, onQR }: { eq: Equipment; onQR: () => void }) {
  const sc = STATUS[eq.status] ?? STATUS.available;
  const Icon = categoryIcon(eq.category);
  const latest = eq.latest_activity ? (() => { try { return JSON.parse(eq.latest_activity!); } catch { return null; } })() : null;
  const isVDC = eq.current_user && VDC_TEAM.find(m => m.name === eq.current_user);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col">
      {/* colored top stripe */}
      <div className={`h-1 rounded-t-2xl ${eq.status === 'checked_out' ? 'bg-amber-400' : eq.status === 'maintenance' ? 'bg-red-400' : 'bg-emerald-400'}`} />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className={`p-2.5 rounded-xl ${sc.bg}`}><Icon size={18} className={sc.text} /></div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 leading-tight">{eq.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{eq.category}</p>
          {eq.serial_number && <p className="text-xs text-slate-400 font-mono mt-0.5">S/N {eq.serial_number}</p>}
        </div>

        {eq.status === 'checked_out' && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              {isVDC ? <MemberAvatar name={eq.current_user!} /> : <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{getInitials(eq.current_user ?? '?')}</div>}
              <div>
                <p className="text-sm font-semibold text-amber-900 leading-tight">{eq.current_user}</p>
                <p className="text-xs text-amber-600">{eq.checkout_type === 'short_term' ? 'Day Use' : 'Long-Term'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-700"><MapPin size={11} />{eq.current_location}</div>
            {eq.job_number && <div className="flex items-center gap-3 text-xs text-amber-600">
              <span className="flex items-center gap-1"><Hash size={10} />{eq.job_number}</span>
              <span className="flex items-center gap-1"><DollarSign size={10} />{eq.cost_code}</span>
            </div>}
            {eq.checked_out_at && <div className="flex items-center gap-1.5 text-xs text-amber-500"><Clock size={11} />Out {timeAgo(eq.checked_out_at)}</div>}
          </div>
        )}

        {eq.status === 'available' && latest && (
          <p className="text-xs text-slate-400 flex items-center gap-1.5"><Clock size={11} />Last used {timeAgo(latest.timestamp)}</p>
        )}

        <div className="flex gap-2 mt-auto pt-1">
          <button onClick={onQR} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <QrCode size={13} />QR
          </button>
          <a href={`/equipment/${eq.id}`} target="_blank" className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition-colors">
            Manage <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Usage History Table ────────────────────────── */
function UsageTable({ rows, equipment }: { rows: ActivityRow[]; equipment: Equipment[] }) {
  const [filterEq, setFilterEq] = useState('all');
  const [filterMember, setFilterMember] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const filtered = rows.filter(r => {
    if (filterEq !== 'all' && r.equipment_id !== filterEq) return false;
    if (filterMember !== 'all' && r.user_name !== filterMember) return false;
    if (filterType !== 'all' && r.checkout_type !== filterType) return false;
    return true;
  });

  const allUsers = [...new Set(rows.map(r => r.user_name).filter(Boolean))].sort() as string[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { value: filterEq, set: setFilterEq, opts: [['all', 'All Equipment'], ...equipment.map(e => [e.id, e.name] as [string,string])], label: 'Equipment' },
          { value: filterMember, set: setFilterMember, opts: [['all', 'All Members'], ...allUsers.map(u => [u, u] as [string,string])], label: 'Member' },
          { value: filterType, set: setFilterType, opts: [['all','All Types'],['short_term','Day Use'],['long_term','Long-Term']], label: 'Type' },
        ].map(f => (
          <div key={f.label} className="relative">
            <select value={f.value} onChange={e => f.set(e.target.value)}
              className="pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
              {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        ))}
        <span className="ml-auto text-xs text-slate-400 self-center">{filtered.length} records</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {['Equipment','Action','Type','Member / Contact','Job #','Cost Code','Location','Out At','In At','Duration'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400 text-sm">No records match filters</td></tr>
            ) : filtered.map(r => {
              const isVDCMember = r.user_name && VDC_TEAM.find(m => m.name === r.user_name);
              return (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap max-w-[180px] truncate">
                    <a href={`/equipment/${r.equipment_id}`} target="_blank" className="hover:text-blue-600 transition-colors">{r.equipment_name}</a>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${r.action === 'checked_out' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {r.action === 'checked_out' ? <LogOut size={11} /> : <LogIn size={11} />}
                      {r.action === 'checked_out' ? 'Out' : 'In'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.checkout_type === 'short_term' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                      {r.checkout_type === 'short_term' ? 'Day Use' : 'Long-Term'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {isVDCMember ? <MemberAvatar name={r.user_name!} /> :
                        r.user_name ? <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{getInitials(r.user_name)}</div> : null}
                      <span className="text-slate-700 text-xs">{r.user_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 font-mono whitespace-nowrap">{r.job_number ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 font-mono whitespace-nowrap">{r.cost_code ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap max-w-[140px] truncate">{r.location ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(r.checked_out_at)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(r.checked_in_at)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDuration(r.duration_minutes)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Dashboard ──────────────────────────────────── */
export default function Dashboard() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [tab, setTab] = useState<'equipment' | 'activity' | 'history'>('equipment');
  const [qrEq, setQrEq] = useState<Equipment | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    const [eRes, aRes] = await Promise.all([fetch('/api/equipment'), fetch('/api/activity')]);
    const [eData, aData] = await Promise.all([eRes.json(), aRes.json()]);
    setEquipment(eData); setActivity(aData);
    setLoading(false); setLastUpdated(new Date()); setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); const t = setInterval(() => fetchAll(true), 30000); return () => clearInterval(t); }, [fetchAll]);

  const categories = [...new Set(equipment.map(e => e.category))].sort();
  const filtered = equipment.filter(eq => {
    const q = search.toLowerCase();
    return (!q || eq.name.toLowerCase().includes(q) || eq.serial_number?.toLowerCase().includes(q) || eq.category.toLowerCase().includes(q))
      && (statusFilter === 'all' || eq.status === statusFilter)
      && (catFilter === 'all' || eq.category === catFilter);
  });

  const stats = {
    total: equipment.length,
    available: equipment.filter(e => e.status === 'available').length,
    out: equipment.filter(e => e.status === 'checked_out').length,
    maint: equipment.filter(e => e.status === 'maintenance').length,
  };

  const TABS = [
    { id: 'equipment', label: 'Equipment', icon: Package },
    { id: 'activity', label: 'Activity Feed', icon: Activity },
    { id: 'history', label: 'Usage History', icon: BarChart2 },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg,#5b8dee,#7c5cbf)' }}>
              <Package size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">Equipment Tracker</h1>
              <p className="text-xs text-slate-400 mt-0.5">Frank L. Blum · VDC Field Assets</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchAll()} disabled={refreshing}
              className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-500 disabled:opacity-40">
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
              style={{ background: 'linear-gradient(135deg,#5b8dee,#7c5cbf)' }}>
              <Plus size={16} /><span className="hidden sm:inline">Add Equipment</span><span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Items', value: stats.total, Icon: Package, bg: 'bg-slate-100', color: 'text-slate-600' },
            { label: 'Available', value: stats.available, Icon: CheckCircle, bg: 'bg-emerald-50', color: 'text-emerald-600' },
            { label: 'Checked Out', value: stats.out, Icon: LogOut, bg: 'bg-amber-50', color: 'text-amber-600' },
            { label: 'Maintenance', value: stats.maint, Icon: AlertTriangle, bg: 'bg-red-50', color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${s.bg}`}><s.Icon size={18} className={s.color} /></div>
              <div><p className="text-2xl font-bold text-slate-900">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>

        {/* Equipment grid */}
        {tab === 'equipment' && (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, serial, category…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="checked_out">Checked Out</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 h-52 animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No equipment found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map(eq => <EquipCard key={eq.id} eq={eq} onQR={() => setQrEq(eq)} />)}
              </div>
            )}
          </>
        )}

        {/* Activity feed */}
        {tab === 'activity' && (
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
            {activity.slice(0, 60).map(r => {
              const isVDC = r.user_name && VDC_TEAM.find(m => m.name === r.user_name);
              return (
                <div key={r.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                  <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${r.action === 'checked_out' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                    {r.action === 'checked_out' ? <LogOut size={13} className="text-amber-600" /> : <LogIn size={13} className="text-emerald-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold">{r.user_name}</span>
                      {' '}{r.action === 'checked_out' ? 'checked out' : 'checked in'}{' '}
                      <a href={`/equipment/${r.equipment_id}`} target="_blank" className="font-medium text-blue-600 hover:underline">{r.equipment_name}</a>
                      {' '}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${r.checkout_type === 'short_term' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {r.checkout_type === 'short_term' ? 'Day Use' : 'Long-Term'}
                      </span>
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-0.5">
                      {r.location && <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10} />{r.location}</span>}
                      {r.job_number && <span className="text-xs text-slate-500 flex items-center gap-1"><Hash size={10} />{r.job_number}</span>}
                      {r.cost_code && <span className="text-xs text-slate-500">{r.cost_code}</span>}
                      <span className="text-xs text-slate-400">{timeAgo(r.timestamp)}</span>
                    </div>
                  </div>
                  {isVDC && <MemberAvatar name={r.user_name!} />}
                </div>
              );
            })}
            {activity.length === 0 && <p className="p-8 text-center text-slate-400 text-sm">No activity yet</p>}
          </div>
        )}

        {/* Usage history table */}
        {tab === 'history' && <UsageTable rows={activity} equipment={equipment} />}

        {lastUpdated && <p className="text-xs text-slate-400 text-center">Updated {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 30s</p>}
      </div>

      {qrEq && <QRModal eq={qrEq} onClose={() => setQrEq(null)} />}
      {showAdd && <AddModal onClose={() => setShowAdd(false)} onDone={() => fetchAll()} />}
    </div>
  );
}
