import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { VDC_TEAM_NAMES } from './team';

export { VDC_TEAM_NAMES };

const DATA_FILE = path.join(process.cwd(), 'equipment-data.json');

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
  seed(global.__dbData);
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

/* ─── seed ───────────────────────────────────────── */
function hoursAgo(h: number) { return new Date(Date.now() - h * 3600000).toISOString(); }

function seed(db: DbData) {
  const items = [
    { name: 'Dewalt 20V Drill Kit',       category: 'Power Tools',        serial: 'DW-2024-001', desc: '20V MAX Cordless Drill/Driver with 2 batteries' },
    { name: 'Hilti TE 30-A36 Hammer',     category: 'Power Tools',        serial: 'HT-2023-047', desc: 'Cordless Rotary Hammer, 36V' },
    { name: 'Optical Level & Tripod Set', category: 'Survey Equipment',   serial: 'TL-2022-012', desc: 'Automatic Optical Level with tripod and rod' },
    { name: 'Makita 7-1/4" Circular Saw', category: 'Power Tools',        serial: 'MK-2024-033', desc: '15A Circular Saw with blade guard' },
    { name: 'Honda EU2200i Generator',    category: 'Power Equipment',    serial: 'HG-2023-008', desc: '2200W Portable Inverter Generator' },
    { name: 'Full Body Safety Harness',   category: 'Safety Equipment',   serial: 'SH-2024-021', desc: 'Fall Protection Harness, ANSI/ASSE Z359.11' },
    { name: 'Milwaukee Sawzall 18V',      category: 'Power Tools',        serial: 'MW-2023-056', desc: '18V Cordless Reciprocating Saw' },
    { name: 'Laser Distance Meter 330ft', category: 'Measurement',        serial: 'LD-2024-009', desc: 'Digital Laser Tape Measure' },
    { name: 'Electric Pressure Washer',   category: 'Cleaning Equipment', serial: 'PW-2022-003', desc: '3200 PSI Electric Pressure Washer' },
    { name: 'Concrete Vibrator 2HP',      category: 'Concrete Equipment', serial: 'CV-2023-015', desc: '2HP Electric Internal Vibrator' },
    { name: '32ft Extension Ladder',      category: 'Access Equipment',   serial: 'EL-2024-042', desc: 'Aluminum Type IA Extension Ladder' },
    { name: '60-Gallon Air Compressor',   category: 'Power Equipment',    serial: 'AC-2023-028', desc: '60G Vertical Two-Stage Air Compressor' },
  ];

  const preCheckouts = [
    { idx: 0, user: 'Noah Edwards',       location: 'Site A - Downtown',       type: 'short_term', job: 'JOB-2024-047', cost: 'CC-1420', ha: 3 },
    { idx: 4, user: 'Mike Donovan (Sub)', location: 'Site B - Westside',       type: 'long_term',  job: 'JOB-2024-031', cost: 'CC-2210', ha: 72 },
    { idx: 7, user: 'Daniel Rodriguez',   location: 'Site C - Harbor District',type: 'short_term', job: 'JOB-2024-052', cost: 'CC-1420', ha: 1 },
  ];

  items.forEach((item, i) => {
    const id = randomUUID();
    const co = preCheckouts.find(c => c.idx === i);
    const now = new Date().toISOString();
    const eq: Equipment = {
      id, name: item.name, category: item.category, description: item.desc,
      serial_number: item.serial, status: 'available',
      current_user: null, current_location: null, checkout_type: null,
      job_number: null, cost_code: null, checked_out_at: null, created_at: now,
    };

    if (co) {
      const outAt = hoursAgo(co.ha);
      eq.status = 'checked_out';
      eq.current_user = co.user; eq.current_location = co.location;
      eq.checkout_type = co.type; eq.job_number = co.job;
      eq.cost_code = co.cost; eq.checked_out_at = outAt;
      db.activity.push({ id: db._nextActivityId++, equipment_id: id, equipment_name: item.name, action: 'checked_out', checkout_type: co.type, user_name: co.user, location: co.location, job_number: co.job, cost_code: co.cost, notes: null, checked_out_at: outAt, checked_in_at: null, duration_minutes: null, timestamp: outAt });
    } else if (i % 3 === 0) {
      const o = hoursAgo(30), inn = hoursAgo(26);
      db.activity.push({ id: db._nextActivityId++, equipment_id: id, equipment_name: item.name, action: 'checked_out', checkout_type: 'short_term', user_name: 'Jon Garner', location: 'Site D - North', job_number: 'JOB-2024-038', cost_code: 'CC-1110', notes: null, checked_out_at: o, checked_in_at: null, duration_minutes: null, timestamp: o });
      db.activity.push({ id: db._nextActivityId++, equipment_id: id, equipment_name: item.name, action: 'checked_in',  checkout_type: 'short_term', user_name: 'Jon Garner', location: 'Site D - North', job_number: 'JOB-2024-038', cost_code: 'CC-1110', notes: 'Good condition', checked_out_at: o, checked_in_at: inn, duration_minutes: 240, timestamp: inn });
    } else if (i % 3 === 1) {
      const o1 = hoursAgo(72), i1 = hoursAgo(48);
      db.activity.push({ id: db._nextActivityId++, equipment_id: id, equipment_name: item.name, action: 'checked_out', checkout_type: 'long_term', user_name: 'Carlos Mendez (PM)', location: 'Site E - East', job_number: 'JOB-2024-019', cost_code: 'CC-3300', notes: null, checked_out_at: o1, checked_in_at: null, duration_minutes: null, timestamp: o1 });
      db.activity.push({ id: db._nextActivityId++, equipment_id: id, equipment_name: item.name, action: 'checked_in',  checkout_type: 'long_term', user_name: 'Carlos Mendez (PM)', location: 'Site E - East', job_number: 'JOB-2024-019', cost_code: 'CC-3300', notes: null, checked_out_at: o1, checked_in_at: i1, duration_minutes: 1440, timestamp: i1 });
    }

    db.equipment.push(eq);
  });
}
