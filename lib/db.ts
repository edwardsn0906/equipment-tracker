import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { VDC_TEAM_NAMES } from './team';

export { VDC_TEAM_NAMES };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

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
  components: string[];
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
  components_included: string[] | null;
}

/* ─── ensure tables exist ────────────────────────── */
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT DEFAULT '',
      serial_number TEXT DEFAULT '',
      status TEXT DEFAULT 'available',
      "current_user" TEXT,
      current_location TEXT,
      checkout_type TEXT,
      job_number TEXT,
      cost_code TEXT,
      checked_out_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      components TEXT[] DEFAULT '{}'
    )
  `);
  await pool.query(`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS components TEXT[] DEFAULT '{}'`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      equipment_id TEXT NOT NULL,
      equipment_name TEXT NOT NULL,
      action TEXT NOT NULL,
      checkout_type TEXT,
      user_name TEXT,
      location TEXT,
      job_number TEXT,
      cost_code TEXT,
      notes TEXT,
      checked_out_at TIMESTAMPTZ,
      checked_in_at TIMESTAMPTZ,
      duration_minutes INTEGER,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      components_included TEXT[] DEFAULT '{}'
    )
  `);
  await pool.query(`ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS components_included TEXT[] DEFAULT '{}'`);
}

/* ─── public API ─────────────────────────────────── */
export async function getAllEquipment() {
  await ensureTables();
  const { rows } = await pool.query(`
    SELECT
      e.*,
      (SELECT COUNT(*) FROM activity_log WHERE equipment_id = e.id)::int AS activity_count,
      (SELECT row_to_json(a) FROM (
        SELECT action, user_name, timestamp FROM activity_log
        WHERE equipment_id = e.id ORDER BY timestamp DESC LIMIT 1
      ) a) AS latest_activity
    FROM equipment e
    ORDER BY e.created_at DESC
  `);
  return rows.map((r: Record<string, unknown>) => ({
    ...r,
    latest_activity: r.latest_activity ? JSON.stringify(r.latest_activity) : null,
  }));
}

export async function getEquipmentById(id: string) {
  await ensureTables();
  const { rows } = await pool.query('SELECT * FROM equipment WHERE id = $1', [id]);
  if (!rows[0]) return null;
  const { rows: activity } = await pool.query(
    'SELECT * FROM activity_log WHERE equipment_id = $1 ORDER BY timestamp DESC LIMIT 30',
    [id]
  );
  return { ...rows[0], activity };
}

export async function createEquipment(data: {
  name: string; category: string; description?: string; serial_number?: string; components?: string[];
}) {
  await ensureTables();
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO equipment (id, name, category, description, serial_number, components)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [id, data.name, data.category, data.description ?? '', data.serial_number ?? '', data.components ?? []]
  );
  return rows[0] as Equipment;
}

export async function checkOut(args: {
  equipment_id: string; user_name: string; location: string;
  checkout_type: string; job_number: string; cost_code: string; notes?: string;
  components_included?: string[];
}) {
  await ensureTables();
  const now = new Date().toISOString();
  const { rows: eqRows } = await pool.query('SELECT name FROM equipment WHERE id = $1', [args.equipment_id]);
  const equipmentName = eqRows[0]?.name ?? '';

  await pool.query(
    `UPDATE equipment SET
      status = 'checked_out',
      "current_user" = $1,
      current_location = $2,
      checkout_type = $3,
      job_number = $4,
      cost_code = $5,
      checked_out_at = $6
     WHERE id = $7`,
    [args.user_name, args.location, args.checkout_type, args.job_number, args.cost_code, now, args.equipment_id]
  );
  await pool.query(
    `INSERT INTO activity_log
      (equipment_id, equipment_name, action, checkout_type, user_name, location, job_number, cost_code, notes, checked_out_at, components_included)
     VALUES ($1, $2, 'checked_out', $3, $4, $5, $6, $7, $8, $9, $10)`,
    [args.equipment_id, equipmentName, args.checkout_type, args.user_name, args.location,
     args.job_number, args.cost_code, args.notes ?? null, now, args.components_included ?? []]
  );
  const { rows } = await pool.query('SELECT * FROM equipment WHERE id = $1', [args.equipment_id]);
  return rows[0] as Equipment;
}

export async function checkIn(equipment_id: string, notes?: string) {
  await ensureTables();
  const { rows: eqRows } = await pool.query('SELECT * FROM equipment WHERE id = $1', [equipment_id]);
  const eq = eqRows[0];
  if (!eq) return null;

  const now = new Date().toISOString();
  const outAt = eq.checked_out_at ? new Date(eq.checked_out_at) : new Date();
  const durationMinutes = Math.round((Date.now() - outAt.getTime()) / 60000);

  await pool.query(
    `UPDATE equipment SET
      status = 'available',
      "current_user" = NULL,
      current_location = NULL,
      checkout_type = NULL,
      job_number = NULL,
      cost_code = NULL,
      checked_out_at = NULL
     WHERE id = $1`,
    [equipment_id]
  );
  await pool.query(
    `INSERT INTO activity_log
      (equipment_id, equipment_name, action, checkout_type, user_name, location,
       job_number, cost_code, notes, checked_out_at, checked_in_at, duration_minutes)
     VALUES ($1, $2, 'checked_in', $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [equipment_id, eq.name, eq.checkout_type ?? null, eq.current_user ?? null,
     eq.current_location ?? null, eq.job_number ?? null, eq.cost_code ?? null,
     notes ?? null, eq.checked_out_at ?? null, now, durationMinutes]
  );
  const { rows } = await pool.query('SELECT * FROM equipment WHERE id = $1', [equipment_id]);
  return rows[0] as Equipment;
}

export async function getAllActivity(): Promise<ActivityLog[]> {
  await ensureTables();
  const { rows } = await pool.query(
    'SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 200'
  );
  return rows as ActivityLog[];
}
