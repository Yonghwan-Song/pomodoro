import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface TimerSessionRow {
  id: string;
  userId: string;
  kind: 'pomo' | 'break';
  startTime: number;
  endTime: number;
  timeCountedDown: number;
  totalPauseLength: number;
  plannedDuration: number | null;
  editedDuration: number | null;
  isEarlyEnded: boolean;
  earlyEndReason: string | null;
}

export interface SessionPauseRow {
  id?: string;
  timerSessionId: string;
  startTime: number;
  endTime: number;
  duration?: number;
  reason?: string | null;
}

export interface PomodoroRow {
  id?: string;
  startTime: number;
  duration: number; // in minutes
  categoryId?: string | null;
  categoryName?: string | null;
  todoistTaskId?: string | null;
  taskId?: string | null;
  taskContent?: string | null;
  userId?: string;
  timerSessionId?: string | null;
}

export interface SegmentCandidate {
  type: 'focus' | 'pause';
  startTime: number;
  endTime: number;
  duration: number;
  categoryName: string | null;
  categoryId: string | null;
  taskId: string | null;
  taskContent: string | null;
  todoistTaskId: string | null;
  reason: string | null;
}

export interface ReconstructedSegment {
  timerSessionId: string;
  userId: string;
  sequenceOrder: number;
  type: 'focus' | 'pause';
  startTime: number;
  duration: number;
  categoryName: string | null;
  categoryId: string | null;
  taskId: string | null;
  taskContent: string | null;
  todoistTaskId: string | null;
  reason: string | null;
}

const MINUTE_MS = 60_000;
const TAIL_MS = 60_000;

export const LEADING_GAP_SESSION_ID = '336259ac-7cc0-468f-b5a3-2c09c66b7566';
export const CLIPPED_BUDGET_SESSION_ID = 'dd8724b7-221a-40e4-8bdd-c4598313a2f4';
export const SPLIT_PAUSE_SESSION_ID = '59f5f957-9e60-4e79-a103-e0425f60b6b7';
export const NULL_FOCUS_SESSION_ID = '3093a831-6622-42f2-8519-7b2075af2e58';

interface PauseSpan {
  start: number;
  end: number;
  reason: string | null;
}

interface OwnerFields {
  categoryName: string | null;
  categoryId: string | null;
  taskId: string | null;
  taskContent: string | null;
  todoistTaskId: string | null;
}

export interface FkUpdate {
  pomoId: string;
  sessionId: string;
}

export interface PomoAssignment {
  pomosBySession: Map<string, PomodoroRow[]>;
  fkUpdates: FkUpdate[];
  excludedBoundaryIds: string[];
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function ownerOf(pomo: PomodoroRow | null): OwnerFields {
  if (!pomo) {
    return {
      categoryName: null,
      categoryId: null,
      taskId: null,
      taskContent: null,
      todoistTaskId: null,
    };
  }
  return {
    categoryName: emptyToNull(pomo.categoryName),
    categoryId: pomo.categoryId ?? null,
    taskId: emptyToNull(pomo.taskId),
    taskContent: emptyToNull(pomo.taskContent),
    todoistTaskId: pomo.todoistTaskId ?? null,
  };
}

function blankOwner(): OwnerFields {
  return ownerOf(null);
}

function normalizePauses(pauses: SessionPauseRow[]): PauseSpan[] {
  return pauses
    .map((pause) => ({
      start: Number(pause.startTime),
      end: Number(pause.endTime),
      reason: emptyToNull(pause.reason),
    }))
    .filter((pause) => pause.end > pause.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

function normalizePomos(pomodoros: PomodoroRow[]): PomodoroRow[] {
  return pomodoros
    .map((pomo) => ({
      ...pomo,
      startTime: Number(pomo.startTime),
      duration: Number(pomo.duration),
    }))
    .filter((pomo) => pomo.duration > 0)
    .sort((a, b) => a.startTime - b.startTime);
}

function pomoSelectedAt(pomos: PomodoroRow[], time: number): PomodoroRow | null {
  let selected: PomodoroRow | null = null;
  for (const pomo of pomos) {
    if (pomo.startTime <= time) selected = pomo;
    else break;
  }
  return selected;
}

function placeFocusBudget(
  pomo: PomodoroRow,
  pauses: PauseSpan[],
  sessionEnd: number,
): Array<{ start: number; end: number }> {
  const containing = pauses.find(
    (pause) => pomo.startTime >= pause.start && pomo.startTime < pause.end,
  );
  let cursor = containing ? containing.end : pomo.startTime;
  let remaining = pomo.duration * MINUTE_MS;
  const pieces: Array<{ start: number; end: number }> = [];
  let guard = 0;

  while (remaining > 0 && cursor < sessionEnd && guard < 100) {
    guard += 1;
    const hit = pauses.find(
      (pause) =>
        pause.end > cursor &&
        pause.start >= cursor &&
        pause.start < cursor + remaining,
    );
    if (!hit) {
      const end = Math.min(sessionEnd, cursor + remaining);
      if (end > cursor) pieces.push({ start: cursor, end });
      cursor = end;
      remaining = 0;
      break;
    }

    const untilPause = hit.start - cursor;
    if (untilPause > 0) {
      const end = Math.min(sessionEnd, cursor + untilPause);
      if (end > cursor) pieces.push({ start: cursor, end });
      remaining -= end - cursor;
      cursor = end;
      if (cursor >= sessionEnd || remaining <= 0) break;
    }

    if (hit.end <= cursor) break;
    cursor = hit.end;
  }

  return pieces;
}

function extendLastTail(
  pieces: Array<{ start: number; end: number }>,
  pauses: PauseSpan[],
  sessionEnd: number,
): void {
  if (pieces.length === 0) return;
  const last = pieces[pieces.length - 1];
  const nextPause = pauses.find((pause) => pause.start >= last.end);
  const boundary = nextPause ? nextPause.start : sessionEnd;
  const gap = boundary - last.end;
  if (gap > 0 && gap < TAIL_MS) last.end = boundary;
}

function pausePieces(
  pause: PauseSpan,
  pomos: PomodoroRow[],
): SegmentCandidate[] {
  const splitPoints = pomos
    .filter((pomo) => pomo.startTime > pause.start && pomo.startTime < pause.end)
    .map((pomo) => pomo.startTime)
    .sort((a, b) => a - b);
  const points = [pause.start, ...splitPoints, pause.end];
  const pieces: SegmentCandidate[] = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    if (end <= start) continue;
    const owner = ownerOf(pomoSelectedAt(pomos, start));
    pieces.push({
      type: 'pause',
      startTime: start,
      endTime: end,
      duration: end - start,
      ...owner,
      reason: pause.reason,
    });
  }
  return pieces;
}

function nullTimeline(
  sessionStart: number,
  sessionEnd: number,
  pauses: PauseSpan[],
): SegmentCandidate[] {
  const segments: SegmentCandidate[] = [];
  let cursor = sessionStart;
  for (const pause of pauses) {
    if (pause.start > cursor) {
      segments.push({
        type: 'focus',
        startTime: cursor,
        endTime: pause.start,
        duration: pause.start - cursor,
        ...blankOwner(),
        reason: null,
      });
    }
    segments.push({
      type: 'pause',
      startTime: pause.start,
      endTime: pause.end,
      duration: pause.end - pause.start,
      ...blankOwner(),
      reason: pause.reason,
    });
    cursor = Math.max(cursor, pause.end);
  }
  if (cursor < sessionEnd) {
    segments.push({
      type: 'focus',
      startTime: cursor,
      endTime: sessionEnd,
      duration: sessionEnd - cursor,
      ...blankOwner(),
      reason: null,
    });
  }
  return segments.filter((segment) => segment.duration > 0);
}

export function reconstructSessionSegments(
  session: TimerSessionRow,
  pauses: SessionPauseRow[],
  pomodoros: PomodoroRow[],
): ReconstructedSegment[] {
  const sessionStart = Number(session.startTime);
  const sessionEnd = Number(session.endTime);
  if (sessionEnd < sessionStart) {
    throw new Error(
      `Invalid session time: end (${sessionEnd}) < start (${sessionStart})`,
    );
  }
  if (sessionEnd === sessionStart) return [];

  const normalizedPauses = normalizePauses(pauses);
  const pomos = normalizePomos(pomodoros);
  const useNullOwner = session.kind === 'break' || pomos.length === 0;
  const candidates = useNullOwner
    ? nullTimeline(sessionStart, sessionEnd, normalizedPauses)
    : buildPomoTimeline(pomos, normalizedPauses, sessionEnd);

  candidates.sort((a, b) => a.startTime - b.startTime || (a.type === 'pause' ? -1 : 1));

  return candidates
    .filter((segment) => segment.duration > 0)
    .map((segment, index) => ({
      timerSessionId: session.id,
      userId: session.userId,
      sequenceOrder: index,
      type: segment.type,
      startTime: segment.startTime,
      duration: segment.duration,
      categoryName: segment.categoryName,
      categoryId: segment.categoryId,
      taskId: segment.taskId,
      taskContent: segment.taskContent,
      todoistTaskId: segment.todoistTaskId,
      reason: segment.reason,
    }));
}

function buildPomoTimeline(
  pomos: PomodoroRow[],
  pauses: PauseSpan[],
  sessionEnd: number,
): SegmentCandidate[] {
  const segments: SegmentCandidate[] = [];
  for (let i = 0; i < pomos.length; i += 1) {
    const pomo = pomos[i];
    const pieces = placeFocusBudget(pomo, pauses, sessionEnd);
    if (i === pomos.length - 1) extendLastTail(pieces, pauses, sessionEnd);
    const owner = ownerOf(pomo);
    for (const piece of pieces) {
      if (piece.end <= piece.start) continue;
      segments.push({
        type: 'focus',
        startTime: piece.start,
        endTime: piece.end,
        duration: piece.end - piece.start,
        ...owner,
        reason: null,
      });
    }
  }
  for (const pause of pauses) {
    segments.push(...pausePieces(pause, pomos));
  }
  return segments;
}

export function assignPomodoros(
  sessions: TimerSessionRow[],
  pomodoros: PomodoroRow[],
): PomoAssignment {
  const sessionsByUser = new Map<string, TimerSessionRow[]>();
  for (const session of sessions) {
    const list = sessionsByUser.get(session.userId) ?? [];
    list.push(session);
    sessionsByUser.set(session.userId, list);
  }

  const pomosBySession = new Map<string, PomodoroRow[]>();
  const excludedBoundaryIds: string[] = [];
  const orphans = new Map<string, PomodoroRow>();

  for (const raw of pomodoros) {
    const pomo: PomodoroRow = {
      ...raw,
      startTime: Number(raw.startTime),
      duration: Number(raw.duration),
    };
    if (!pomo.timerSessionId) {
      if (pomo.userId && pomo.duration > 0) {
        orphans.set(`${pomo.userId}|${pomo.startTime}`, pomo);
      }
      continue;
    }
    if (pomo.duration <= 0) continue;

    const owner = sessions.find((session) => session.id === pomo.timerSessionId);
    if (!owner) continue;
    const sameUser = sessionsByUser.get(owner.userId) ?? [];
    const matchesAnotherSession = sameUser.some(
      (session) => session.id !== owner.id && Number(session.startTime) === pomo.startTime,
    );
    if (matchesAnotherSession) {
      if (pomo.id) excludedBoundaryIds.push(pomo.id);
      continue;
    }
    const list = pomosBySession.get(owner.id) ?? [];
    list.push(pomo);
    pomosBySession.set(owner.id, list);
  }

  const fkUpdates: FkUpdate[] = [];
  for (const session of sessions) {
    if (session.kind !== 'pomo') continue;
    const linked = pomosBySession.get(session.id) ?? [];
    if (linked.length > 0) continue;
    const orphan = orphans.get(`${session.userId}|${Number(session.startTime)}`);
    if (!orphan || !orphan.id) continue;
    pomosBySession.set(session.id, [orphan]);
    fkUpdates.push({ pomoId: orphan.id, sessionId: session.id });
  }

  for (const list of pomosBySession.values()) {
    list.sort((a, b) => a.startTime - b.startTime);
  }

  return { pomosBySession, fkUpdates, excludedBoundaryIds };
}

export function classifySession(
  session: TimerSessionRow,
  pauses: SessionPauseRow[],
  pomos: PomodoroRow[],
): string {
  if (session.id === LEADING_GAP_SESSION_ID) return LEADING_GAP_SESSION_ID;
  if (session.id === CLIPPED_BUDGET_SESSION_ID) return CLIPPED_BUDGET_SESSION_ID;

  const endsOnPause = pauses.some(
    (pause) => Number(pause.endTime) === Number(session.endTime),
  );
  if (session.kind === 'break') {
    if (pauses.length === 0) return 'break, pause 없음';
    return endsOnPause ? 'break, 끝이 pause' : 'break, pause 있고 끝이 focus';
  }
  if (pomos.length === 0) {
    if (pauses.length === 0) return 'pomo, 양의 duration 행 없음, pause 없음';
    return endsOnPause ? 'pomo, 행 없이 끝이 pause' : 'pomo, 행 없이 pause만 있음';
  }
  if (pomos.length === 1) {
    if (pauses.length === 0) return 'pomo 1행, pause 없음';
    return endsOnPause
      ? 'pomo 1행, 끝이 pause'
      : 'pomo 1행, pause가 예산을 가르고 끝이 focus';
  }
  if (pauses.length === 0) return 'pomo 2행 이상, pause 없음';
  return endsOnPause
    ? 'pomo 2행 이상, 끝이 pause'
    : 'pomo 2행 이상, pause 있고 끝이 focus';
}

function formatSegment(sessionStart: number, segment: ReconstructedSegment): string {
  const offset = ((segment.startTime - sessionStart) / 1000).toFixed(3);
  const seconds = (segment.duration / 1000).toFixed(3);
  return `  #${segment.sequenceOrder} ${segment.type} +${offset}s ${seconds}s ${segment.categoryName ?? '-'}`;
}

export function assertAnchor(
  session: TimerSessionRow,
  segments: ReconstructedSegment[],
): string[] {
  const errors: string[] = [];
  const fail = (message: string) => errors.push(`${session.id.slice(0, 8)}: ${message}`);
  const endOf = (segment: ReconstructedSegment) => segment.startTime + segment.duration;

  if (session.id === SPLIT_PAUSE_SESSION_ID) {
    const first = segments[0];
    const pauses = segments.filter((segment) => segment.type === 'pause');
    const last = segments[segments.length - 1];
    const gap = first && pauses[0] ? pauses[0].startTime - endOf(first) : -1;
    if (segments.length !== 4) fail(`segment count ${segments.length}`);
    if (!first || first.type !== 'focus' || first.duration !== 21 * MINUTE_MS) {
      fail('first focus is not 21 minutes');
    }
    if (first?.categoryName !== 'Job Search & Application & Resume') {
      fail(`first category is ${first?.categoryName}`);
    }
    if (first?.taskId !== '6h6Q6XjrcjhcvPpm' || last?.taskId !== '6h6Q6XjrcjhcvPpm') {
      fail(`task id ${first?.taskId} / ${last?.taskId}`);
    }
    if (gap <= 0 || gap >= TAIL_MS) fail(`gap before pause is ${gap}`);
    if (pauses.length !== 2) fail(`pause pieces ${pauses.length}`);
    if (pauses[0]?.categoryName !== 'Job Search & Application & Resume') {
      fail('first pause owner');
    }
    if (pauses[1]?.categoryName !== 'Implementation') fail('second pause owner');
    if (last?.type !== 'focus' || last.categoryName !== 'Implementation') {
      fail('last focus owner');
    }
    if (last && pauses[1] && last.startTime !== endOf(pauses[1])) {
      fail('last focus does not start at pause end');
    }
    if (last && (last.duration <= 26 * MINUTE_MS || last.duration >= 27 * MINUTE_MS)) {
      fail(`last focus duration ${last.duration}`);
    }
    if (last && endOf(last) !== Number(session.endTime)) fail('last focus does not reach session end');
  }

  if (session.id === LEADING_GAP_SESSION_ID) {
    const pauses = segments.filter((segment) => segment.type === 'pause');
    const focus = segments.filter((segment) => segment.type === 'focus');
    if (segments.length !== 3) fail(`segment count ${segments.length}`);
    if (segments.some((segment) => segment.startTime === Number(session.startTime))) {
      fail('leading gap was filled');
    }
    if (pauses.length !== 2) fail(`pause pieces ${pauses.length}`);
    if (pauses[0]?.categoryName != null) fail('pause front has an owner');
    if (!pauses[1]?.categoryName?.startsWith('Job Search')) fail('pause back owner');
    const only = focus[0];
    if (!only || focus.length !== 1) fail('focus piece count');
    if (only && pauses[1] && only.startTime !== endOf(pauses[1])) {
      fail('focus does not start at pause end');
    }
    if (only && endOf(only) !== Number(session.endTime)) fail('focus does not reach session end');
    if (only && (only.duration < 24 * MINUTE_MS || only.duration >= 25 * MINUTE_MS)) {
      fail(`focus duration ${only.duration}`);
    }
  }

  if (session.id === CLIPPED_BUDGET_SESSION_ID) {
    if (segments.length !== 3) fail(`segment count ${segments.length}`);
    const [first, pause, second] = segments;
    if (first?.type !== 'focus' || pause?.type !== 'pause' || second?.type !== 'focus') {
      fail('shape');
    }
    if (first?.categoryName !== 'Implementation' || second?.categoryName !== 'Implementation') {
      fail('category');
    }
    if (second && endOf(second) !== Number(session.endTime)) fail('runs past session end');
    const focusMs = (first?.duration ?? 0) + (second?.duration ?? 0);
    if (focusMs >= 5 * MINUTE_MS) fail(`budget was not clipped ${focusMs}`);
    if (first && (first.duration < 45_000 || first.duration > 46_000)) {
      fail(`first focus ${first.duration}`);
    }
    if (pause && (pause.duration < 341_000 || pause.duration > 342_000)) {
      fail(`pause ${pause.duration}`);
    }
    if (second && (second.duration < 14_000 || second.duration > 15_000)) {
      fail(`second focus ${second.duration}`);
    }
  }

  if (session.id === NULL_FOCUS_SESSION_ID) {
    if (segments.length !== 1 || segments[0]?.type !== 'focus') fail('not one focus');
    if (segments[0]?.categoryName != null) fail('owner was invented');
    if (segments[0]?.duration !== Number(session.endTime) - Number(session.startTime)) {
      fail('duration is not the session wall');
    }
    if (segments[0]?.duration !== 5_400_000) fail(`duration ${segments[0]?.duration}`);
  }

  return errors;
}

export async function runBackfill(customUrl?: string, customDryRun?: boolean) {
  const args = process.argv.slice(2);
  if (args.includes('--force')) {
    console.error('--force is refused. It would delete existing client segments.');
    process.exit(1);
  }

  const isDryRun = customDryRun ?? args.includes('--dry-run');

  const batchSizeArgIdx = args.indexOf('--batch-size');
  const batchSize =
    batchSizeArgIdx !== -1 && args[batchSizeArgIdx + 1]
      ? parseInt(args[batchSizeArgIdx + 1], 10)
      : 100;

  const urlArgIdx = args.indexOf('--url');
  const targetUrl =
    customUrl ||
    (urlArgIdx !== -1 ? args[urlArgIdx + 1] : undefined) ||
    process.env.DATABASE_URL ||
    process.env.NEON_POSTGRESQL_URL;

  if (!targetUrl) {
    throw new Error('Database connection URL is not provided. Set DATABASE_URL/NEON_POSTGRESQL_URL or use --url');
  }

  const maskedConn = targetUrl.replace(/\/\/(.*?):(.*?)@/, '//$1:****@');

  console.log('====================================================');
  console.log('🚀 [Session Segments Backfill Migration]');
  console.log(`- Database: ${maskedConn}`);
  console.log(`- Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'LIVE (Applying to DB)'}`);
  console.log(`- Insert batch size: ${batchSize} sessions`);
  console.log('- Live writes use one transaction');
  console.log('====================================================\n');

  const pool = new Pool({ connectionString: targetUrl });
  const client: PoolClient = await pool.connect();

  try {
    // 0. Pre-checks
    const beforeCountRes = await client.query('SELECT count(*) FROM session_segments');
    const beforeCount = Number(beforeCountRes.rows[0].count);
    console.log(`📊 Initial session_segments count in DB: ${beforeCount}`);

    // 1. Fetch metadata mappings
    console.log('🔍 Loading categories and todoist tasks...');
    const catRes = await client.query('SELECT id, name FROM categories');
    const catNameById = new Map<string, string>(
      catRes.rows.map((r) => [r.id, r.name]),
    );

    const taskRes = await client.query(
      "SELECT id, todoist_task_id, task_data->>'content' as content FROM todoist_tasks",
    );
    const taskInfoById = new Map<string, { taskId: string; content: string | null }>(
      taskRes.rows.map((r) => [
        r.id,
        { taskId: r.todoist_task_id, content: r.content ?? null },
      ]),
    );

    // 2. Fetch all sessions
    console.log('🔍 Loading timer sessions...');
    const sessionRes = await client.query(`
      SELECT
        id, user_id as "userId", kind,
        start_time as "startTime", end_time as "endTime",
        time_counted_down as "timeCountedDown", total_pause_length as "totalPauseLength",
        planned_duration as "plannedDuration", edited_duration as "editedDuration",
        is_early_ended as "isEarlyEnded", early_end_reason as "earlyEndReason"
      FROM timer_sessions
      ORDER BY start_time ASC
    `);
    const sessions: TimerSessionRow[] = sessionRes.rows.map((row) => ({
      ...row,
      startTime: Number(row.startTime),
      endTime: Number(row.endTime),
      timeCountedDown: Number(row.timeCountedDown),
      totalPauseLength: Number(row.totalPauseLength),
    }));
    console.log(`   Found ${sessions.length} timer sessions.`);

    // 3. Fetch pauses
    console.log('🔍 Loading session pauses...');
    const pauseRes = await client.query(`
      SELECT
        id, timer_session_id as "timerSessionId",
        start_time as "startTime", end_time as "endTime",
        duration, reason
      FROM session_pauses
      ORDER BY start_time ASC
    `);
    const pausesBySession = new Map<string, SessionPauseRow[]>();
    for (const p of pauseRes.rows) {
      if (!pausesBySession.has(p.timerSessionId)) {
        pausesBySession.set(p.timerSessionId, []);
      }
      pausesBySession.get(p.timerSessionId)!.push(p);
    }
    console.log(`   Found ${pauseRes.rows.length} session pauses across ${pausesBySession.size} sessions.`);

    // 4. Fetch pomodoros
    console.log('🔍 Loading pomodoros...');
    const pomoRes = await client.query(`
      SELECT
        id, user_id as "userId", timer_session_id as "timerSessionId",
        start_time as "startTime", duration,
        category_id as "categoryId", todoist_task_id as "todoistTaskId"
      FROM pomodoros
      ORDER BY start_time ASC
    `);
    const allPomos: PomodoroRow[] = pomoRes.rows.map((pomo) => {
      const catName = pomo.categoryId ? catNameById.get(pomo.categoryId) ?? null : null;
      const taskInfo = pomo.todoistTaskId ? taskInfoById.get(pomo.todoistTaskId) : null;
      return {
        id: pomo.id,
        userId: pomo.userId,
        timerSessionId: pomo.timerSessionId,
        startTime: Number(pomo.startTime),
        duration: Number(pomo.duration),
        categoryId: pomo.categoryId,
        categoryName: catName,
        todoistTaskId: pomo.todoistTaskId,
        taskId: taskInfo?.taskId ?? null,
        taskContent: taskInfo?.content ?? null,
      };
    });
    const assignment = assignPomodoros(sessions, allPomos);
    const pomosBySession = assignment.pomosBySession;
    console.log(`   FK updates queued: ${assignment.fkUpdates.length}`);
    for (const update of assignment.fkUpdates) {
      console.log(`     ${update.pomoId} -> ${update.sessionId}`);
    }
    console.log(`   Boundary pomodoros excluded: ${assignment.excludedBoundaryIds.length}`);

    // 5. Existing segments map (preserve existing segments)
    const existingSegRes = await client.query(
      'SELECT DISTINCT timer_session_id FROM session_segments WHERE timer_session_id IS NOT NULL',
    );
    const existingSessionIds = new Set<string>(
      existingSegRes.rows.map((r) => r.timer_session_id),
    );
    console.log(`   Found ${existingSessionIds.size} sessions already possessing segments (will be preserved/skipped).`);

    // 6. Processing in batches & Timeline reconstructions
    console.log('\n⚙️  Processing timeline reconstructions and verification...');

    let insertedSessionsCount = 0;
    let skippedSessionsCount = 0;
    let totalSegmentsInserted = 0;
    const errors: { sessionId: string; message: string }[] = [];

    const classCounts: Record<string, number> = {};
    const anchorErrors: string[] = [];
    const reconstructedBySession = new Map<string, ReconstructedSegment[]>();

    for (const session of sessions) {
      const pauses = pausesBySession.get(session.id) ?? [];
      const pomos = pomosBySession.get(session.id) ?? [];
      const label = classifySession(session, pauses, pomos);
      classCounts[label] = (classCounts[label] ?? 0) + 1;
      const reconstructed = reconstructSessionSegments(session, pauses, pomos);
      reconstructedBySession.set(session.id, reconstructed);
      anchorErrors.push(...assertAnchor(session, reconstructed));
    }

    console.log('\nSession Class Distribution:');
    for (const [label, count] of Object.entries(classCounts)) {
      console.log(`  - ${label.padEnd(45)}: ${count} sessions`);
    }

    // Mathematical integrity verification
    const validationErrors: string[] = [];
    const classSum = Object.values(classCounts).reduce((sum, count) => sum + count, 0);
    if (classSum !== sessions.length) {
      validationErrors.push(`Class sum (${classSum}) does not match total sessions (${sessions.length})`);
    }

    // Anchor errors verification (must have 0 errors)
    if (anchorErrors.length > 0) {
      console.error('\n❌ Anchor session integrity check failed:');
      for (const err of anchorErrors) {
        console.error(`  - ${err}`);
        validationErrors.push(`Anchor check failed: ${err}`);
      }
    } else {
      console.log('✅ 4 Key Anchor Sessions integrity check: 100% PASSED');
    }

    // Filter target sessions: skip sessions that already have segments
    const targetSessions = sessions.filter((s) => {
      if (existingSessionIds.has(s.id)) {
        skippedSessionsCount++;
        return false;
      }
      return true;
    });

    console.log(`\n🎯 Target sessions to backfill: ${targetSessions.length} (Skipped existing: ${skippedSessionsCount})`);

    if (validationErrors.length > 0) {
      console.error('\n❌ Validation errors encountered before database write:');
      for (const message of validationErrors) console.error(`  - ${message}`);
      console.error('No rows were written.');
      process.exitCode = 1;
      return;
    }

    if (!isDryRun) await client.query('BEGIN');

    try {
      // Chunking batches
      for (let i = 0; i < targetSessions.length; i += batchSize) {
        const chunk = targetSessions.slice(i, i + batchSize);
        const segmentsToInsert: ReconstructedSegment[] = [];
        const sessionIdsInChunk: string[] = [];

        for (const session of chunk) {
          try {
            const reconstructed = reconstructedBySession.get(session.id) ?? [];
            if (reconstructed.length > 0) {
              segmentsToInsert.push(...reconstructed);
              sessionIdsInChunk.push(session.id);
            }
          } catch (err: any) {
            errors.push({ sessionId: session.id, message: err.message });
          }
        }

        if (!isDryRun && (segmentsToInsert.length > 0 || (i === 0 && assignment.fkUpdates.length > 0))) {
          if (i === 0 && assignment.fkUpdates.length > 0) {
            console.log(`\nApplying ${assignment.fkUpdates.length} FK updates to pomodoros...`);
            for (const update of assignment.fkUpdates) {
              await client.query(
                `UPDATE pomodoros
                 SET timer_session_id = $1
                 WHERE id = $2 AND timer_session_id IS NULL`,
                [update.sessionId, update.pomoId],
              );
            }
          }

          if (segmentsToInsert.length > 0) {
            const valuePlaceholders: string[] = [];
            const queryParams: any[] = [];
            let paramIdx = 1;

            for (const s of segmentsToInsert) {
              valuePlaceholders.push(
                `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7}, $${paramIdx + 8}, $${paramIdx + 9}, $${paramIdx + 10}, $${paramIdx + 11})`,
              );
              queryParams.push(
                s.timerSessionId,
                s.userId,
                s.sequenceOrder,
                s.type,
                s.startTime,
                s.duration,
                s.categoryName,
                s.categoryId,
                s.taskId,
                s.taskContent,
                s.todoistTaskId,
                s.reason,
              );
              paramIdx += 12;
            }

            const insertSql = `
              INSERT INTO session_segments (
                timer_session_id, user_id, sequence_order, type,
                start_time, duration, category_name, category_id,
                task_id, task_content, todoist_task_id, reason
              ) VALUES ${valuePlaceholders.join(', ')}
            `;
            await client.query(insertSql, queryParams);
          }
        }

        insertedSessionsCount += sessionIdsInChunk.length;
        totalSegmentsInserted += segmentsToInsert.length;

        const progress = Math.min(100, Math.round(((i + chunk.length) / targetSessions.length) * 100));
        process.stdout.write(
          `\r   Progress: [${progress}%] Processed ${i + chunk.length}/${targetSessions.length} sessions (${totalSegmentsInserted} segments queued/inserted)...`,
        );
      }

      if (!isDryRun) await client.query('COMMIT');
    } catch (txErr) {
      if (!isDryRun) await client.query('ROLLBACK');
      throw txErr;
    }

    console.log('\n\n================ MIGRATION REPORT ================');
    console.log(`- Sessions processed: ${targetSessions.length}`);
    console.log(`- Sessions successfully reconstructed: ${insertedSessionsCount}`);
    console.log(`- Sessions skipped (already existing): ${skippedSessionsCount}`);
    console.log(`- Total segments ${isDryRun ? 'simulated' : 'inserted'}: ${totalSegmentsInserted}`);
    console.log(`- Errors encountered: ${errors.length}`);

    const anchorIds = [
      SPLIT_PAUSE_SESSION_ID,
      LEADING_GAP_SESSION_ID,
      CLIPPED_BUDGET_SESSION_ID,
      NULL_FOCUS_SESSION_ID,
    ];
    console.log('\nAnchor sessions sample:');
    for (const id of anchorIds) {
      const session = sessions.find((row) => row.id === id);
      const segments = reconstructedBySession.get(id) ?? [];
      console.log(`Session ${id}:`);
      if (!session) {
        console.log('  missing session');
        continue;
      }
      for (const segment of segments) console.log(formatSegment(session.startTime, segment));
    }

    if (errors.length > 0) {
      console.error('\n⚠️ Errors:');
      for (const e of errors.slice(0, 10)) {
        console.error(`  - Session ${e.sessionId}: ${e.message}`);
      }
      process.exitCode = 1;
    }

    if (!isDryRun) {
      const afterCountRes = await client.query('SELECT count(*) FROM session_segments');
      console.log(`\n🎉 Final session_segments count in DB: ${afterCountRes.rows[0].count}`);
    } else {
      console.log('\n✅ Dry-run completed successfully! All validations passed. No changes were committed to DB.');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runBackfill().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
