import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export async function runExpandMigration(customConnectionString?: string) {
  const connectionString =
    customConnectionString ||
    process.env.DATABASE_URL ||
    process.env.NEON_POSTGRESQL_URL;

  if (!connectionString) {
    throw new Error(
      'Database connection string not found. Please provide it via argument or set DATABASE_URL / NEON_POSTGRESQL_URL in .env',
    );
  }

  // Mask credentials for safe logging
  const maskedConn = connectionString.replace(
    /\/\/(.*?):(.*?)@/,
    '//$1:****@',
  );
  console.log(`🔌 Connecting to database: ${maskedConn}`);

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    console.log('\n🚀 Starting DB Migration: Expand timer_sessions schema (Zero-Downtime)...\n');

    // 0. Pre-migration state check
    const countSessionsBefore = await client.query('SELECT count(*) FROM timer_sessions');
    console.log(`📊 Current timer_sessions count: ${countSessionsBefore.rows[0].count}`);

    const existingTablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('session_pauses', 'session_segments');
    `);
    const existingTableNames = existingTablesRes.rows.map((r: any) => r.table_name);
    console.log(`📊 Existing target tables: ${existingTableNames.length > 0 ? existingTableNames.join(', ') : 'None'}`);

    await client.query('BEGIN');

    // Step 1: Create session_segment_type enum
    console.log('\n[1/6] Ensuring enum type: session_segment_type...');
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE session_segment_type AS ENUM ('focus', 'pause');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('      ✅ session_segment_type enum ready.');

    // Step 2: Expand timer_sessions table (keeping pause column intact)
    console.log('\n[2/6] Expanding timer_sessions with 5 new columns (pause JSONB column is preserved)...');
    await client.query(`
      ALTER TABLE timer_sessions
        ADD COLUMN IF NOT EXISTS planned_duration bigint,
        ADD COLUMN IF NOT EXISTS edited_duration bigint DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_pause_length bigint DEFAULT 0 NOT NULL,
        ADD COLUMN IF NOT EXISTS is_early_ended boolean DEFAULT false NOT NULL,
        ADD COLUMN IF NOT EXISTS early_end_reason text;
    `);
    console.log('      ✅ timer_sessions columns expanded.');

    // Step 3: Add CHECK constraints to timer_sessions
    console.log('\n[3/6] Adding check constraints to timer_sessions...');
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timer_sessions_end_after_start') THEN
          ALTER TABLE timer_sessions ADD CONSTRAINT timer_sessions_end_after_start CHECK (end_time >= start_time);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timer_sessions_planned_duration_nonnegative') THEN
          ALTER TABLE timer_sessions ADD CONSTRAINT timer_sessions_planned_duration_nonnegative CHECK (planned_duration >= 0);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timer_sessions_target_duration_nonnegative') THEN
          ALTER TABLE timer_sessions ADD CONSTRAINT timer_sessions_target_duration_nonnegative CHECK (planned_duration + edited_duration >= 0);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timer_sessions_countdown_nonnegative') THEN
          ALTER TABLE timer_sessions ADD CONSTRAINT timer_sessions_countdown_nonnegative CHECK (time_counted_down >= 0);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timer_sessions_pause_length_nonnegative') THEN
          ALTER TABLE timer_sessions ADD CONSTRAINT timer_sessions_pause_length_nonnegative CHECK (total_pause_length >= 0);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timer_sessions_early_end_reason_valid') THEN
          ALTER TABLE timer_sessions ADD CONSTRAINT timer_sessions_early_end_reason_valid CHECK (is_early_ended OR early_end_reason IS NULL);
        END IF;
      END $$;
    `);
    console.log('      ✅ CHECK constraints added to timer_sessions.');

    // Step 4: Create session_pauses table
    console.log('\n[4/6] Creating session_pauses table if not exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS session_pauses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        timer_session_id uuid NOT NULL REFERENCES timer_sessions(id) ON DELETE CASCADE,
        start_time bigint NOT NULL,
        end_time bigint NOT NULL,
        duration bigint GENERATED ALWAYS AS (end_time - start_time) STORED NOT NULL,
        reason text,
        CONSTRAINT session_pauses_end_after_start CHECK (end_time >= start_time)
      );
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS session_pauses_session_id_start_time_index
        ON session_pauses (timer_session_id, start_time);
      CREATE INDEX IF NOT EXISTS session_pauses_timer_session_id_idx
        ON session_pauses (timer_session_id);
    `);
    console.log('      ✅ session_pauses table and indexes ready.');

    // Step 5: Create session_segments table
    console.log('\n[5/6] Creating session_segments table if not exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS session_segments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        timer_session_id uuid REFERENCES timer_sessions(id) ON DELETE SET NULL,
        sequence_order integer NOT NULL,
        type session_segment_type NOT NULL,
        start_time bigint NOT NULL,
        duration bigint NOT NULL,
        end_time bigint GENERATED ALWAYS AS (start_time + duration) STORED NOT NULL,
        category_name varchar(255),
        category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
        task_id text,
        task_content text,
        todoist_task_id uuid REFERENCES todoist_tasks(id) ON DELETE SET NULL,
        reason text,
        CONSTRAINT session_segments_duration_nonnegative CHECK (duration >= 0)
      );
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS session_segments_session_id_sequence_order_index
        ON session_segments (timer_session_id, sequence_order);
      CREATE INDEX IF NOT EXISTS session_segments_session_id_start_time_index
        ON session_segments (timer_session_id, start_time);
      CREATE INDEX IF NOT EXISTS session_segments_user_id_start_time_index
        ON session_segments (user_id, start_time);
    `);
    console.log('      ✅ session_segments table and indexes ready.');

    // Step 6: Backfill pause data from timer_sessions.pause JSONB
    console.log('\n[6/6] Backfilling pause data from existing timer_sessions.pause JSONB...');
    
    // 6-a. Update total_pause_length
    const updatePauseLengthRes = await client.query(`
      UPDATE timer_sessions
      SET total_pause_length = COALESCE((pause->>'totalLength')::bigint, 0)
      WHERE pause IS NOT NULL
        AND (pause->>'totalLength') IS NOT NULL
        AND total_pause_length = 0;
    `);
    console.log(`      - Updated total_pause_length on ${updatePauseLengthRes.rowCount} rows.`);

    // 6-b. Insert into session_pauses from pause->'record' array
    const insertPausesRes = await client.query(`
      INSERT INTO session_pauses (id, timer_session_id, start_time, end_time, reason)
      SELECT
        gen_random_uuid(),
        ts.id,
        (rec->>'start')::bigint,
        (rec->>'end')::bigint,
        rec->>'reason'
      FROM timer_sessions ts,
           jsonb_array_elements(ts.pause->'record') AS rec
      WHERE ts.pause IS NOT NULL
        AND ts.pause->'record' IS NOT NULL
        AND jsonb_typeof(ts.pause->'record') = 'array'
        AND (rec->>'start') IS NOT NULL
        AND (rec->>'end') IS NOT NULL
        AND (rec->>'end')::bigint >= (rec->>'start')::bigint
      ON CONFLICT (timer_session_id, start_time) DO NOTHING;
    `);
    console.log(`      - Migrated ${insertPausesRes.rowCount} pause records into session_pauses.`);

    await client.query('COMMIT');
    console.log('\n✨ [Success] All schema expansions and pause migrations committed successfully!\n');

    // Step 7: Post-migration Verification
    console.log('🔍 Running verification checks:');
    
    const pauseColCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'timer_sessions' AND column_name = 'pause';
    `);
    console.log(`   - timer_sessions.pause JSONB preserved: ${pauseColCheck.rowCount === 1 ? 'YES (✅ Verified)' : 'NO (❌ Warning!)'}`);

    const newColsCheck = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'timer_sessions'
        AND column_name IN ('planned_duration', 'edited_duration', 'total_pause_length', 'is_early_ended', 'early_end_reason')
      ORDER BY column_name;
    `);
    console.log(`   - New columns added to timer_sessions: ${newColsCheck.rows.map((r: any) => r.column_name).join(', ')}`);

    const countPausesAfter = await client.query('SELECT count(*) FROM session_pauses');
    const countSegmentsAfter = await client.query('SELECT count(*) FROM session_segments');
    const pauseSumCheck = await client.query(`
      SELECT
        count(*) AS total_sessions_with_pauses,
        sum(total_pause_length) AS sum_session_total_pause_length
      FROM timer_sessions
      WHERE total_pause_length > 0;
    `);
    const pauseTableSumCheck = await client.query(`
      SELECT sum(duration) AS sum_session_pauses_duration FROM session_pauses;
    `);

    console.log(`   - session_pauses row count: ${countPausesAfter.rows[0].count}`);
    console.log(`   - session_segments row count: ${countSegmentsAfter.rows[0].count} (ready for backfill)`);
    console.log(`   - Sessions with total_pause_length > 0: ${pauseSumCheck.rows[0].total_sessions_with_pauses}`);
    console.log(`   - timer_sessions sum(total_pause_length): ${pauseSumCheck.rows[0].sum_session_total_pause_length} ms`);
    console.log(`   - session_pauses sum(duration): ${pauseTableSumCheck.rows[0].sum_session_pauses_duration} ms`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ [Error] Migration failed. Transaction rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  const targetUrl = process.argv[2];
  runExpandMigration(targetUrl).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
