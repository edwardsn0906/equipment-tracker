import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { VDC_TEAM_NAMES } from './team';

export { VDC_TEAM_NAMES };

const DATA_FILE = process.env.VERCEL
  ? '/tmp/equipment-data.json'
  : path.join(process.cwd(), 'equipment-data.json');

/* ─── types ─────────────────────────────────────── */
export interface Equipment {
  id: string;
  name: string;
  category: string;
  description: string;
  serial_number: string;
  status: 'available' | 'checked_out' | 'maintenance';
  current_user: string | null;
  current_location: string | null;
  checkout_type: string | null;
  job_number: string | null;
  cost_code: string | null;
  checked_out_at: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  equipment_id: string;
  equipment_name: string;
  action: 'checked_out' | 'checked_in';
  checkout_type: string | null;
  user_name: string | null;
  location: string | null;
  job_number: string | null;
  cost_code: string | null;
  notes: string | null;
  checked_out_at: string | null;
  checked_in_at: string | null;
  duration_minutes: number | null;
  timestamp: string;
}

interface DbData {
  equipment: Equipment[];
  activity: ActivityLog[];
  _nextActivityId: number;
}

/* ─── singleton ──────────────────────────────────── */
declare global { var __dbData: DbData | undefined; }

function load(): DbData {
  if (global.__dbData) return global.__dbData;
  if (fs.existsSync(DATA_FILE)) {
    global.__dbData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    return global.__dbData!;
  }
  global.__dbData = { equipment: [], activity: [], _nextActivityId: 1 };
  save();
  return global.__dbData;
}

function save() {
  if (global.__dbData) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(global.__dbData, null, 2));
  }
}

/* ─── public API (matches former SQL queries) ───── */
export function getAllEquipment() {
  const { equipment, activity } = load();
  return equipment.slice().reverse().map(eq => {
    const acts = activity.filter(a => a.equipment_id === eq.id);
    const latest = acts[acts.length - 1] ?? null;
    return {
      ...eq,
      activity_count: acts.length,
      latest_activity: latest ? JSON.stringify({ action: latest.action, user_name: latest.user_name, timestamp: latest.timestamp }) : null,
    };
  });
}

export function getEquipmentById(id: string) {
  const { equipment, activity } = load();
  const eq = equipment.find(e => e.id === id);
  if (!eq) return null;
  const acts = activity.filter(a => a.equipment_id === id).slice().reverse();
  return { ...eq, activity: acts };
}

export function createEquipment(data: { name: string; category: string; description?: string; serial_number?: string }): Equipment {
  const db = load();
  const eq: Equipment = {
    id: randomUUID(),
    name: data.name,
    category: data.category,
    description: data.description ?? '',
    serial_number: data.serial_number ?? '',
    status: 'available',
    current_user: null,
    current_location: null,
    checkout_type: null,
    job_number: null,
    cost_code: null,
    checked_out_at: null,
    created_at: new Date().toISOString(),
  };
  db.equipment.push(eq);
  save();
  return eq;
}

export function checkOut(args: {
  equipment_id: string;
  user_name: string;
  location: string;
  checkout_type: string;
  job_number: string;
  cost_code: string;
  notes?: string;
}): Equipment | null {
  const db = load();
  const eq = db.equipment.find(e => e.id === args.equipment_id);
  if (!eq) return null;
  const now = new Date().toISOString();
  eq.status = 'checked_out';
  eq.current_user = args.user_name;
  eq.current_location = args.location;
  eq.checkout_type = args.checkout_type;
  eq.job_number = args.job_number;
  eq.cost_code = args.cost_code;
  eq.checked_out_at = now;
  db.activity.push({
    id: db._nextActivityId++,
    equipment_id: eq.id,
    equipment_name: eq.name,
    action: 'checked_out',
    checkout_type: args.checkout_type,
    user_name: args.user_name,
    location: args.location,
    job_number: args.job_number,
    cost_code: args.cost_code,
    notes: args.notes ?? null,
    checked_out_at: now,
    checked_in_at: null,
    duration_minutes: null,
    timestamp: now,
  });
  save();
  return eq;
}

export function checkIn(equipment_id: string, notes?: string): Equipment | null {
  const db = load();
  const eq = db.equipment.find(e => e.id === equipment_id);
  if (!eq) return null;
  const now = new Date().toISOString();
  const outAt = eq.checked_out_at ? new Date(eq.checked_out_at) : new Date();
  const durationMinutes = Math.round((Date.now() - outAt.getTime()) / 60000);
  db.activity.push({
    id: db._nextActivityId++,
    equipment_id: eq.id,
    equipment_name: eq.name,
    action: 'checked_in',
    checkout_type: eq.checkout_type,
    user_name: eq.current_user,
    location: eq.current_location,
    job_number: eq.job_number,
    cost_code: eq.cost_code,
    notes: notes ?? null,
    checked_out_at: eq.checked_out_at,
    checked_in_at: now,
    duration_minutes: durationMinutes,
    timestamp: now,
  });
  eq.status = 'available';
  eq.current_user = null;
  eq.current_location = null;
  eq.checkout_type = null;
  eq.job_number = null;
  eq.cost_code = null;
  eq.checked_out_at = null;
  save();
  return eq;
}

export function getAllActivity(): ActivityLog[] {
  const { activity } = load();
  return activity.slice().reverse();
}

