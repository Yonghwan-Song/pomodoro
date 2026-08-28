import 'dotenv/config';
import mongoose from 'mongoose';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../postgresql/schema';

// 1. DB 클라이언트 설정
const pool = new Pool({
  connectionString: process.env.DOCKER_POSTGRESQL_URL,
});
const db = drizzle({ client: pool, schema, casing: 'snake_case' });

async function migrateUsers() {
  console.log('🔄 [1/1] Users 마이그레이션 시작...');

  // [E] Extract: MongoDB에서 Users 데이터 조회
  const mongoUsers = await mongoose.connection
    .db!.collection('users')
    .find({})
    .toArray();

  console.log(`📦 MongoDB에서 발견된 유저 수: ${mongoUsers.length}`);

  if (mongoUsers.length === 0) {
    console.log('마이그레이션할 유저가 없습니다.');
    return;
  }

  // [T] Transform: MongoDB 문서를 PostgreSQL 스키마 규격으로 매핑
  const transformedUsers = mongoUsers.map((doc) => ({
    firebaseUid: doc.firebaseUid,
    userEmail: doc.userEmail,
    userNickname: doc.userNickname ?? null,

    // Todoist
    todoistAccessToken: doc.todoistAccessToken ?? null,
    isTodoistIntegrationEnabled: doc.isTodoistIntegrationEnabled ?? false,
    currentTaskId: doc.currentTaskId ?? '',

    // Category (대소문자 차이 처리)
    colorForUncategorized: doc.colorForUnCategorized ?? '#f04005',
    isUncategorizedOnStat: doc.isUnCategorizedOnStat ?? true,

    // JSONB 필드들 (_id 잔재 제거 및 정제)
    timersStates: {
      duration: doc.timersStates?.duration ?? 25,
      pause: {
        totalLength: doc.timersStates?.pause?.totalLength ?? 0,
        record: (doc.timersStates?.pause?.record ?? []).map((r: any) => ({
          start: r.start,
          end: r.end,
        })),
      },
      repetitionCount: doc.timersStates?.repetitionCount ?? 0,
      running: doc.timersStates?.running ?? false,
      startTime: doc.timersStates?.startTime ?? 0,
    },
    taskChangeInfoArray: (doc.taskChangeInfoArray ?? []).map((t: any) => ({
      id: t.id ?? '',
      taskChangeTimestamp: t.taskChangeTimestamp ?? 0,
    })),
    categoryChangeInfoArray: (doc.categoryChangeInfoArray ?? []).map(
      (c: any) => ({
        categoryName: c.categoryName,
        categoryChangeTimestamp: c.categoryChangeTimestamp ?? 0,
        color: c.color,
        progress: c.progress ?? 0,
      }),
    ),
    currentCycleInfo: {
      totalFocusDuration: doc.currentCycleInfo?.totalFocusDuration ?? 100 * 60,
      cycleDuration: doc.currentCycleInfo?.cycleDuration ?? 130 * 60,
      cycleStartTimestamp: doc.currentCycleInfo?.cycleStartTimestamp ?? 0,
      veryFirstCycleStartTimestamp:
        doc.currentCycleInfo?.veryFirstCycleStartTimestamp ?? 0,
      totalDurationOfSetOfCycles:
        doc.currentCycleInfo?.totalDurationOfSetOfCycles ?? 130 * 60,
    },

    // autoStartSetting 평탄화 (Flattening)
    doesPomoStartAutomatically:
      doc.autoStartSetting?.doesPomoStartAutomatically ?? false,
    doesBreakStartAutomatically:
      doc.autoStartSetting?.doesBreakStartAutomatically ?? false,
    doesCycleStartAutomatically:
      doc.autoStartSetting?.doesCycleStartAutomatically ?? false,

    // Goals (_id 잔재 제거 및 정제)
    goals: {
      weeklyGoal: {
        minimum: doc.goals?.weeklyGoal?.minimum ?? 30,
        ideal: doc.goals?.weeklyGoal?.ideal ?? 40,
      },
      dailyGoals: (doc.goals?.dailyGoals ?? []).map((g: any) => ({
        minimum: g.minimum ?? 4,
        ideal: g.ideal ?? 6,
      })),
    },
  }));

  // [L] Load: PostgreSQL에 일괄 삽입 (INSERT)
  // 기존 테스트 데이터 초기화 후 삽입
  await db.delete(schema.users);

  const insertedUsers = await db
    .insert(schema.users)
    .values(transformedUsers)
    .returning({ id: schema.users.id, email: schema.users.userEmail });

  console.log(
    `✅ Postgres에 ${insertedUsers.length}명의 유저가 삽입되었습니다.`,
  );
}

async function migrateCycleSettings() {
  console.log('\n🔄 [2/2] CycleSettings & CycleRecords 마이그레이션 시작...');

  // 1. PostgreSQL에서 (email -> uuid) 매핑 테이블 생성
  const dbUsers = await db
    .select({ id: schema.users.id, email: schema.users.userEmail })
    .from(schema.users);

  const emailToUserIdMap = new Map<string, string>();
  for (const u of dbUsers) {
    emailToUserIdMap.set(u.email, u.id);
  }

  // 2. MongoDB에서 cyclesettings 데이터 조회
  const mongoCycleSettings = await mongoose.connection
    .db!.collection('cyclesettings')
    .find({})
    .toArray();

  console.log(
    `📦 MongoDB에서 발견된 CycleSettings 수: ${mongoCycleSettings.length}`,
  );

  if (mongoCycleSettings.length === 0) return;

  // 기존 테스트 데이터 초기화 (외래키 제약조건 고려하여 자식 테이블부터 삭제)
  await db.delete(schema.cycleRecords);
  await db.delete(schema.cycleSettings);

  let totalRecordsCount = 0;

  for (const doc of mongoCycleSettings) {
    const userId = emailToUserIdMap.get(doc.userEmail);
    if (!userId) {
      console.warn(
        `⚠️ 유저를 찾을 수 없음 (email: ${doc.userEmail}) -> 건너뜁니다.`,
      );
      continue;
    }

    // (1) cycle_settings 테이블에 INSERT
    // NOTE: We insert one value but what is returned by this insert command is always in an Array form. Therefore, we just pick the 0 index from it using array destructuring syntax.
    const [insertedSetting] = await db
      .insert(schema.cycleSettings)
      .values({
        userId: userId,
        name: doc.name,
        isCurrent: doc.isCurrent ?? false,
        pomoDuration: doc.pomoSetting?.pomoDuration ?? 25,
        shortBreakDuration: doc.pomoSetting?.shortBreakDuration ?? 5,
        longBreakDuration: doc.pomoSetting?.longBreakDuration ?? 15,
        numOfPomo: doc.pomoSetting?.numOfPomo ?? 4,
        numOfCycle: doc.pomoSetting?.numOfCycle ?? 1,
        averageAdherenceRate: doc.averageAdherenceRate ?? null,
      })
      .returning({ id: schema.cycleSettings.id });

    // (2) 해당 세팅의 cycleStat 배열이 있다면 cycle_records 테이블에 INSERT
    const stats = doc.cycleStat ?? [];
    if (stats.length > 0) {
      const recordsToInsert = stats.map((s: any) => ({
        cycleSettingId: insertedSetting.id,
        ratio: s.ratio,
        cycleAdherenceRate: s.cycleAdherenceRate,
        start: s.start,
        end: s.end,
      }));

      await db.insert(schema.cycleRecords).values(recordsToInsert);
      totalRecordsCount += recordsToInsert.length;
    }
  }

  console.log(
    `✅ cycle_settings ${mongoCycleSettings.length}개 & cycle_records ${totalRecordsCount}개 마이그레이션 완료!`,
  );
}

async function migrateCategories(): Promise<Map<string, string>> {
  console.log('\n🔄 [3/3] Categories 마이그레이션 시작...');

  const categoryIdMap = new Map<string, string>();

  // 1. (email -> user UUID) 매핑 맵 준비
  const dbUsers = await db
    .select({ id: schema.users.id, email: schema.users.userEmail })
    .from(schema.users);

  const emailToUserIdMap = new Map<string, string>();
  for (const u of dbUsers) {
    emailToUserIdMap.set(u.email, u.id);
  }

  // 2. MongoDB에서 categories 컬렉션 조회
  const mongoCategories = await mongoose.connection
    .db!.collection('categories')
    .find({})
    .toArray();

  console.log(`📦 MongoDB에서 발견된 Categories 수: ${mongoCategories.length}`);

  if (mongoCategories.length === 0) return categoryIdMap;

  // 3. 기존 테스트 데이터 초기화
  await db.delete(schema.categories);

  // 4. Transform & Load: 각 카테고리 삽입 및 MongoDB ObjectId -> Postgres UUID 매핑 저장
  for (const doc of mongoCategories) {
    const userId = emailToUserIdMap.get(doc.userEmail);
    if (!userId) {
      console.warn(
        `⚠️ 유저를 찾을 수 없음 (email: ${doc.userEmail}) -> 건너뜁니다.`,
      );
      continue;
    }

    const [inserted] = await db
      .insert(schema.categories)
      .values({
        userId: userId,
        name: doc.name,
        color: doc.color,
        isCurrent: doc.isCurrent ?? false,
        isOnStat: doc.isOnStat ?? false,
      })
      .returning({ id: schema.categories.id });

    // MongoDB ObjectId string -> Postgres UUID 매핑
    // Pomodoro document의 category objectid -> pomodoros pg table의  category_id that references categories table의 primary key인 id column.
    // In other words, inserted.id becomes the foreign key value of pomodoros table's row data.
    // Pomodoros table's foreign key value ( <=> inserted.id) can be found through this map because a pomodoro document has category schema's objectId ( <=> doc._id)
    categoryIdMap.set(doc._id.toString(), inserted.id);
  }

  console.log(
    `✅ Postgres에 ${categoryIdMap.size}개의 Categories가 삽입되었습니다.`,
  );

  return categoryIdMap;
}

async function migrateTodoistTasks(): Promise<Map<string, string>> {
  console.log('\n🔄 [4/5] TodoistTasks 마이그레이션 시작...');

  // Map<"userId:todoistTaskId", pgTodoistTaskUuid>
  const todoistTaskIdMap = new Map<string, string>();

  // 1. 유저 매핑 맵
  const dbUsers = await db
    .select({ id: schema.users.id, email: schema.users.userEmail })
    .from(schema.users);
  const emailToUserIdMap = new Map(dbUsers.map((u) => [u.email, u.id]));

  // 2. MongoDB todoisttasktrackings 조회
  const mongoTrackings = await mongoose.connection
    .db!.collection('todoisttasktrackings')
    .find({})
    .toArray();

  console.log(
    `📦 MongoDB에서 발견된 TodoistTaskTracking 수: ${mongoTrackings.length}`,
  );

  if (mongoTrackings.length === 0) return todoistTaskIdMap;

  // 3. 기존 데이터 정리
  await db.delete(schema.todoistTasks);

  // 4. PostgreSQL에 INSERT
  for (const doc of mongoTrackings) {
    const userId = emailToUserIdMap.get(doc.userEmail);
    if (!userId) {
      console.warn(
        `⚠️ 유저를 찾을 수 없음 (email: ${doc.userEmail}) -> 건너뜁니다.`,
      );
      continue;
    }

    const [inserted] = await db
      .insert(schema.todoistTasks)
      .values({
        userId: userId,
        todoistTaskId: doc.taskId,
        totalFocusDuration: doc.duration ?? 0,
        taskData: null,
        parentTaskId: null,
        isActive: true,
        syncedAt: null,
      })
      .onConflictDoNothing()
      .returning({ id: schema.todoistTasks.id });

    if (inserted) {
      // 1. Pomodoro document's taskId should be replaced with a foreign key that references todoist_tasks table's primary key, 'todoist_tasks_id'
      // 2. In the todoist_tasks table, its primary key ( <=> inserted.id) is in one on one relationship with the combination of its userId and todoistTaskId ( <=> doc.taskId) columns due to unique index.
      // 3. Additionally, pomodoro document has the combination (but not always because the taskId field is optional)
      // 4. Anyway, therefore we can find todoist_task_id, which is the foreign key of the pomodoros table, using the combination that can exist in pomodoro documents we get from mongodb atlas database.
      todoistTaskIdMap.set(`${userId}:${doc.taskId}`, inserted.id);
    }
  }

  console.log(
    `✅ Postgres에 ${todoistTaskIdMap.size}개의 TodoistTasks가 삽입되었습니다.`,
  );
  return todoistTaskIdMap;
}

interface FocusSessionCandidate {
  id: string;
  userId: string;
  startTime: number;
  endTime: number;
}

async function migrateTimerSessions(): Promise<FocusSessionCandidate[]> {
  console.log('\n🔄 [5/6] TimerSessions (TodayRecords) 마이그레이션 시작...');

  const focusSessions: FocusSessionCandidate[] = [];

  // 1. 유저 매핑 맵
  const dbUsers = await db
    .select({ id: schema.users.id, email: schema.users.userEmail })
    .from(schema.users);
  const emailToUserIdMap = new Map(dbUsers.map((u) => [u.email, u.id]));

  // 2. MongoDB todayrecords 조회
  const mongoRecords = await mongoose.connection
    .db!.collection('todayrecords')
    .find({})
    .toArray();

  console.log(
    `📦 MongoDB에서 발견된 TodayRecord 수: ${mongoRecords.length}`,
  );

  if (mongoRecords.length === 0) return focusSessions;

  // 3. 기존 데이터 정리
  await db.delete(schema.timerSessions);

  // 4. Transform: pause 필드 정제 및 PostgreSQL 규격 매핑
  const sessionsToInsert: (typeof schema.timerSessions.$inferInsert)[] = [];

  for (const doc of mongoRecords) {
    const userId = emailToUserIdMap.get(doc.userEmail);
    if (!userId) continue;

    // pause 구조 정제 (_id 제거 및 기본값 보장)
    const pauseData = doc.pause?.pause ?? doc.pause;
    const sanitizedPause = {
      totalLength: pauseData?.totalLength ?? 0,
      record: (pauseData?.record ?? []).map((r: any) => ({
        start: r.start,
        end: r.end,
      })),
    };

    const sessionStartTime =
      typeof doc.startTime === 'number' && !isNaN(doc.startTime)
        ? doc.startTime
        : 0;
    const sessionEndTime =
      typeof doc.endTime === 'number' && !isNaN(doc.endTime)
        ? doc.endTime
        : sessionStartTime;

    sessionsToInsert.push({
      userId: userId,
      kind: doc.kind === 'break' ? 'break' : 'pomo',
      startTime: sessionStartTime,
      endTime: sessionEndTime,
      timeCountedDown: doc.timeCountedDown ?? 0,
      pause: sanitizedPause,
    });
  }

  // 5. Load (500개씩 배치 INSERT)
  const BATCH_SIZE = 500;
  for (let i = 0; i < sessionsToInsert.length; i += BATCH_SIZE) {
    const chunk = sessionsToInsert.slice(i, i + BATCH_SIZE);
    const inserted = await db
      .insert(schema.timerSessions)
      .values(chunk)
      .returning({
        id: schema.timerSessions.id,
        userId: schema.timerSessions.userId,
        kind: schema.timerSessions.kind,
        startTime: schema.timerSessions.startTime,
        endTime: schema.timerSessions.endTime,
      });

    // 뽀모도로 매칭용: kind === 'pomo'인 Focus 세션만 보관
    for (const s of inserted) {
      if (s.kind === 'pomo') {
        focusSessions.push({
          id: s.id,
          userId: s.userId,
          startTime: s.startTime,
          endTime: s.endTime,
        });
      }
    }
  }

  console.log(
    `✅ Postgres에 ${sessionsToInsert.length}개의 TimerSessions 삽입 완료! (Focus 세션: ${focusSessions.length}개)`,
  );

  return focusSessions;
}

async function migratePomodoros(
  categoryIdMap: Map<string, string>,
  todoistTaskIdMap: Map<string, string>,
  focusSessions: FocusSessionCandidate[],
) {
  console.log('\n🔄 [6/6] Pomodoros 최종 마이그레이션 시작...');

  // 1. 유저 매핑 맵
  const dbUsers = await db
    .select({ id: schema.users.id, email: schema.users.userEmail })
    .from(schema.users);
  const emailToUserIdMap = new Map(dbUsers.map((u) => [u.email, u.id]));

  // 2. 사용자별 Focus 세션 그룹화 (검색 최적화)
  const userSessionsMap = new Map<string, FocusSessionCandidate[]>();
  for (const s of focusSessions) {
    if (!userSessionsMap.has(s.userId)) {
      userSessionsMap.set(s.userId, []);
    }
    userSessionsMap.get(s.userId)!.push(s);
  }

  // 3. MongoDB pomodoros 조회
  const mongoPomodoros = await mongoose.connection
    .db!.collection('pomodoros')
    .find({})
    .toArray();

  console.log(
    `📦 MongoDB에서 발견된 Pomodoros 수: ${mongoPomodoros.length}`,
  );

  if (mongoPomodoros.length === 0) return;

  // 4. 기존 데이터 정리
  await db.delete(schema.pomodoros);

  // 5. Transform & FK 연결 및 Audit 통계
  let matchedCount = 0;
  let unmatchedCount = 0;
  let ambiguousCount = 0;
  let dummyCount = 0;

  const pomodorosToInsert: (typeof schema.pomodoros.$inferInsert)[] = [];

  for (const doc of mongoPomodoros) {
    const userId = emailToUserIdMap.get(doc.userEmail);
    if (!userId) continue;

    // (1) Category FK 조회
    const categoryId = doc.category
      ? categoryIdMap.get(doc.category.toString()) ?? null
      : null;

    // (2) TodoistTask FK 조회
    const todoistTaskId = doc.taskId
      ? todoistTaskIdMap.get(`${userId}:${doc.taskId}`) ?? null
      : null;

    // (3) TimerSession FK 연결 (구간 매칭 [startTime, endTime))
    let timerSessionId: string | null = null;
    const isDummy = doc.isDummy ?? false;

    // startTime이 null인 레거시 데이터는 date 필드로 타임스탬프 계산 또는 0으로 대체
    const startTime =
      typeof doc.startTime === 'number' && !isNaN(doc.startTime)
        ? doc.startTime
        : doc.date && !isNaN(Date.parse(doc.date))
        ? new Date(doc.date).getTime()
        : 0;

    if (isDummy || doc.startTime === null || doc.startTime === undefined) {
      if (isDummy) dummyCount++;
      else unmatchedCount++;
    } else {
      const userSessions = userSessionsMap.get(userId) ?? [];
      const candidates = userSessions.filter(
        (s) => s.startTime <= startTime && startTime < s.endTime,
      );

      if (candidates.length === 1) {
        timerSessionId = candidates[0].id;
        matchedCount++;
      } else if (candidates.length === 0) {
        unmatchedCount++;
      } else {
        ambiguousCount++;
      }
    }

    pomodorosToInsert.push({
      userId: userId,
      duration: doc.duration ?? 0,
      startTime: startTime,
      date: doc.date ?? '',
      isDummy: isDummy,
      categoryId: categoryId,
      todoistTaskId: todoistTaskId,
      timerSessionId: timerSessionId,
    });
  }

  // 6. Load (1,000개씩 일괄 배치 INSERT)
  const BATCH_SIZE = 1000;
  for (let i = 0; i < pomodorosToInsert.length; i += BATCH_SIZE) {
    const chunk = pomodorosToInsert.slice(i, i + BATCH_SIZE);
    await db.insert(schema.pomodoros).values(chunk);
  }

  console.log(
    `✅ Postgres에 ${pomodorosToInsert.length}개의 Pomodoros 삽입 완료!`,
  );
  console.log(`📊 [뽀모도로 세션 매칭 통계]`);
  console.log(`   - 세션 매칭 성공: ${matchedCount}개`);
  console.log(
    `   - 과거 세션 삭제로 미매칭 (NULL 유지): ${unmatchedCount}개`,
  );
  console.log(`   - 모호한 중복 세션 (NULL 유지): ${ambiguousCount}개`);
  console.log(`   - 더미 데이터 (NULL 유지): ${dummyCount}개`);
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URL!);
    console.log('🍃 MongoDB Atlas 연결 성공');

    await migrateUsers();
    await migrateCycleSettings();
    const categoryIdMap = await migrateCategories();
    const todoistTaskIdMap = await migrateTodoistTasks();
    // timerSessions table's primary key becomes a foreign key of the pomodoros table.
    const focusSessions = await migrateTimerSessions();
    await migratePomodoros(categoryIdMap, todoistTaskIdMap, focusSessions);

    console.log('\n🎉 모든 데이터 마이그레이션이 성공적으로 완료되었습니다!');
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
  } finally {
    await mongoose.disconnect();
    await pool.end();
    console.log('🔌 모든 DB 연결 종료');
  }
}

main();
