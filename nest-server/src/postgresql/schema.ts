import {
  type AnyPgColumn,
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  unique,
  uniqueIndex,
  integer,
  bigint,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { doublePrecision } from 'drizzle-orm/pg-core';
import type { Task } from '@doist/todoist-api-typescript';

//#region Types for JSONB
type TimersStates = {
  duration: number;
  pause: {
    totalLength: number;
    record: { start: number; end: number }[];
  };
  repetitionCount: number;
  running: boolean;
  startTime: number;
};

type TaskChangeInfo = {
  id: string;
  taskChangeTimestamp: number;
};

type CategoryChangeInfo = {
  categoryName: string;
  categoryChangeTimestamp: number;
  color: string;
  progress: number;
};

type CycleInfo = {
  totalFocusDuration: number;
  cycleDuration: number;
  cycleStartTimestamp: number;
  veryFirstCycleStartTimestamp: number;
  totalDurationOfSetOfCycles: number;
};

export interface Goal {
  minimum: number;
  ideal: number;
}

export type DailyGoals = [Goal, Goal, Goal, Goal, Goal, Goal, Goal];

export interface Goals {
  weeklyGoal: Goal;
  dailyGoals: DailyGoals;
}

type Pause = {
  totalLength: number;
  record: { start: number; end: number }[];
};
//#endregion

export const timerSessionKindEnum = pgEnum('timer_session_kind', [
  'pomo',
  'break',
]);

export const users = pgTable('users', {
  id: uuid().defaultRandom().primaryKey(), // 기존 코드 호환성: 프론트엔드(client)와 DTO에서 이미 ID를 string 타입으로 다루고 있어 타입 변경 비용이 거의 없습니다.
  firebaseUid: varchar({ length: 255 }).notNull().unique(),
  userEmail: varchar({ length: 255 }).notNull().unique(),
  userNickname: varchar({ length: 255 }),

  //#region Related to todoist
  todoistAccessToken: text(),
  isTodoistIntegrationEnabled: boolean().default(false),
  currentTaskId: text().default('').notNull(),
  //#endregion

  //#region Related to Category
  colorForUncategorized: varchar({
    length: 7,
  })
    .default('#f04005')
    .notNull(),
  isUncategorizedOnStat: boolean().default(true).notNull(),
  //#endregion

  //#region Columns required to run a cycle of sessions
  // Reset when session is finished
  timersStates: jsonb()
    .$type<TimersStates>()
    .default({
      duration: 25,
      pause: { totalLength: 0, record: [] },
      repetitionCount: 0,
      running: false,
      startTime: 0,
    })
    .notNull(),
  taskChangeInfoArray: jsonb().$type<TaskChangeInfo[]>().default([]).notNull(),
  categoryChangeInfoArray: jsonb()
    .$type<CategoryChangeInfo[]>()
    .default([
      {
        categoryName: 'uncategorized',
        categoryChangeTimestamp: 0,
        color: '#f04005',
        progress: 0,
      },
    ])
    .notNull(),
  // Reset when a cylce ends
  currentCycleInfo: jsonb()
    .$type<CycleInfo>()
    .default({
      totalFocusDuration: 100 * 60,
      cycleDuration: 130 * 60,
      cycleStartTimestamp: 0,
      veryFirstCycleStartTimestamp: 0,
      totalDurationOfSetOfCycles: 130 * 60,
    })
    .notNull(),
  //#endregion

  //#region Flattening autoStartSetting
  doesPomoStartAutomatically: boolean().default(false).notNull(),
  doesBreakStartAutomatically: boolean().default(false).notNull(),
  doesCycleStartAutomatically: boolean().default(false).notNull(),
  //#endregion

  //#region ETC: 그냥 왜 여기있는지 잘 모르겠는 것
  goals: jsonb()
    .$type<Goals>()
    .default({
      weeklyGoal: { minimum: 30, ideal: 40 },
      dailyGoals: [
        { minimum: 4, ideal: 6 },
        { minimum: 4, ideal: 6 },
        { minimum: 4, ideal: 6 },
        { minimum: 4, ideal: 6 },
        { minimum: 4, ideal: 6 },
        { minimum: 4, ideal: 6 },
        { minimum: 4, ideal: 6 },
      ],
    })
    .notNull(),
  //#endregion

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categories = pgTable(
  'categories',
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }), // NOTE: Shouldn't we follow the same column data type as the one we are referencing here? Is uuid selected because the primary key is defined with uuid in the users table?
    name: varchar({ length: 255 }).notNull(),
    color: varchar({ length: 7 }).notNull(),
    // If this isCurrent is true, it is the category for the current session.
    isCurrent: boolean().default(false).notNull(),
    isOnStat: boolean().default(false).notNull(),
  },
  (table) => [
    // A category name is unique within a user, not across all users.
    unique('categories_user_id_name_unique').on(table.userId, table.name),
    // 유저당 isCurrent: true 인 활성 카테고리는 오직 1개만 허용 (Partial Unique Index)
    uniqueIndex('categories_user_id_is_current_unique')
      .on(table.userId)
      .where(sql`${table.isCurrent} = true`),
  ],
);

export const cycleSettings = pgTable(
  'cycle_settings',
  {
    id: uuid().defaultRandom().primaryKey(),
    // NOTE: When migrating cycleSettings documents to pg, a row should have userId. But... its type is uuid and do we have a similar field on the cycleSetting Document?
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    isCurrent: boolean().default(false).notNull(),

    // NOTE: Flattening하고, API수준에서 object로 만들어서 보내주는게 좋다고 함.
    pomoDuration: integer().default(25).notNull(),
    shortBreakDuration: integer().default(5).notNull(),
    longBreakDuration: integer().default(15).notNull(),
    numOfPomo: integer().default(4).notNull(),
    numOfCycle: integer().default(1).notNull(),

    //#region QQQ: 이렇게 하면 default값이 null로 되나?
    // doublePrecision()에 .notNull()이나 .default(...)를 붙이지 않았으므로:
    // DB 기본값은 NULL
    // INSERT 시 해당 필드를 생략하면 NULL
    // TypeScript 조회 타입은 number | null
    // 명시적으로 undefined를 넣어도 보통 컬럼이 생략되어 NULL
    //#endregion
    // NOTE: 세팅 만들자마자 어떤 default 숫자를 부여하는게 옳지 않다고 생각. 정보가 없는거지 0이나 1을 주는것은 그 자체로 의미부여가 되니까.. 그냥 unknown의 의미로서 NULL이 맞다.
    averageAdherenceRate: doublePrecision(), // client/src/Pages/Main/Timer-Related/TimerController/TimerController.tsx:L383

    //#region  NOTE: 당장 필요 없어보여서 comment함. mongodb에는 어떻게 들어가있음...
    // createdAt: timestamp().defaultNow().notNull(),
    // updatedAt: timestamp().defaultNow().notNull(),
    //#endregion
  },
  (table) => [
    unique('cycle_settings_user_id_name_unique').on(table.userId, table.name),
    // 유저당 isCurrent: true 인 활성 사이클 설정은 오직 1개만 허용 (Partial Unique Index)
    uniqueIndex('cycle_settings_user_id_is_current_unique')
      .on(table.userId)
      .where(sql`${table.isCurrent} = true`),
  ],
);

export const cycleRecords = pgTable('cycle_records', {
  id: uuid().defaultRandom().primaryKey(),
  // TODO: 지금은 cascade delete하는데, cycleSetting이 만약에 cycleRecords를 '유의미' 하게 많이 row를 가지고 있다면, keep해두는게 데이터 분석에 좋을 듯.
  cycleSettingId: uuid()
    .notNull()
    .references(() => cycleSettings.id, { onDelete: 'cascade' }),
  ratio: doublePrecision().notNull(),
  cycleAdherenceRate: doublePrecision().notNull(),
  start: bigint({ mode: 'number' }).notNull(),
  end: bigint({ mode: 'number' }).notNull(),
});

export const rooms = pgTable('rooms', {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  isPermanent: boolean().default(false).notNull(), // TODO: authorization
  maxPeers: integer().default(4).notNull(),

  // Connected peers are runtime WebRTC state and stay in Room.peers in memory.
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const todoistTasks = pgTable(
  'todoist_tasks',
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    todoistTaskId: text().notNull(),

    // 이 단순 FK는 부모 Task가 존재한다는 것만 보장하고, 부모와 자식이 같은 userId를 갖는지는 보장하지 않는다.
    // DB에서 동일 사용자까지 강제하려면 (id, userId)에 UNIQUE 제약을 추가하고,
    // (parentTaskId, userId) -> (id, userId) 형태의 복합 FK를 정의해야 한다.
    // parentTaskId가 NULL이면 PostgreSQL의 기본 MATCH SIMPLE 규칙에 따라 복합 FK 검사도 통과하므로 root Task를 표현할 수 있다.
    // 지금은 마이그레이션을 단순하게 유지하고, 동기화 서비스가 같은 사용자의 todoistTaskId 안에서 부모를 찾도록 한다.
    parentTaskId: uuid().references((): AnyPgColumn => todoistTasks.id, {
      onDelete: 'set null',
    }),

    taskData: jsonb().$type<Task>(), // 기존 Pomodoro in mongodb에는 taskId만 있고 Task객체는 없으므로, migration때문에 notNull()은 생략.
    totalFocusDuration: integer().default(0).notNull(),
    isActive: boolean().default(true).notNull(), // What does "Active" mean in this context?
    syncedAt: timestamp({ withTimezone: true }).defaultNow(), // 최초 동기화 직전까지는 값이 없으므로 Nullable.
  },
  (table) => [
    unique('todoist_tasks_user_id_todoist_task_id_unique').on(
      table.userId,
      table.todoistTaskId,
    ),
  ],
);

export const timerSessions = pgTable(
  'timer_sessions',
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: timerSessionKindEnum().notNull(),
    startTime: bigint({ mode: 'number' }).notNull(),
    endTime: bigint({ mode: 'number' }).notNull(),
    timeCountedDown: bigint({ mode: 'number' }).notNull(),

    // JSONB keeps the MongoDB migration and Timeline read path simple.
    // If pause events become an analytics target, normalize them into a
    // session_pauses table and calculate totalLength with an aggregate query
    // or maintain it as a cached aggregate in the same transaction.
    pause: jsonb()
      .$type<Pause>()
      .default({ totalLength: 0, record: [] })
      .notNull(),
  },
  (table) => [
    uniqueIndex('timer_sessions_user_id_start_time_index').on(
      table.userId,
      table.startTime.desc(),
    ),
  ],
);

export const pomodoros = pgTable(
  'pomodoros',
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    duration: integer().notNull(),
    startTime: bigint({ mode: 'number' }).notNull(),
    date: text().notNull(),
    isDummy: boolean().default(false).notNull(),
    categoryId: uuid().references(() => categories.id, {
      onDelete: 'set null',
    }), // TODO: category를 삭제했다고 기록이 어떤 category에 관한 것이었나를 지우는게 맞아?... 이름으로도 남겨두는게 어때?
    todoistTaskId: uuid().references(() => todoistTasks.id),

    // IMPT:
    // Nullable because some legacy Pomodoros cannot be matched to a deleted or
    // missing MongoDB TodayRecord. New records should always provide this FK.
    timerSessionId: uuid().references(() => timerSessions.id),
  },
  (table) => [
    uniqueIndex('pomodoros_user_id_start_time_index').on(
      table.userId,
      table.startTime.desc(),
    ),
  ],
);

//#region Relations
export const usersRelations = relations(users, ({ many }) => ({
  categories: many(categories),
  cycleSettings: many(cycleSettings),
  todoistTasks: many(todoistTasks),
  timerSessions: many(timerSessions),
  pomodoros: many(pomodoros),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  // Users is a parent table since the userId field of categories is referencing users table's primary key field, "id".
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  pomodoros: many(pomodoros),
}));

export const cycleSettingsRelations = relations(
  cycleSettings,
  ({ one, many }) => ({
    user: one(users, {
      fields: [cycleSettings.userId],
      references: [users.id],
    }),
    cycleRecords: many(cycleRecords),
  }),
);

export const cycleRecordsRelations = relations(cycleRecords, ({ one }) => ({
  cycleSetting: one(cycleSettings, {
    fields: [cycleRecords.cycleSettingId],
    references: [cycleSettings.id],
  }),
}));

export const todoistTasksRelations = relations(
  todoistTasks,
  ({ one, many }) => ({
    user: one(users, {
      fields: [todoistTasks.userId],
      references: [users.id],
    }),
    parent: one(todoistTasks, {
      fields: [todoistTasks.parentTaskId],
      references: [todoistTasks.id],
      relationName: 'taskHierarchy',
    }),
    children: many(todoistTasks, {
      relationName: 'taskHierarchy',
    }),
    pomodoros: many(pomodoros),
  }),
);

export const timerSessionsRelations = relations(
  timerSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [timerSessions.userId],
      references: [users.id],
    }),
    pomodoros: many(pomodoros),
  }),
);

export const pomodorosRelations = relations(pomodoros, ({ one }) => ({
  user: one(users, {
    fields: [pomodoros.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [pomodoros.categoryId],
    references: [categories.id],
  }),
  todoistTask: one(todoistTasks, {
    fields: [pomodoros.todoistTaskId],
    references: [todoistTasks.id],
  }),
  timerSession: one(timerSessions, {
    fields: [pomodoros.timerSessionId],
    references: [timerSessions.id],
  }),
}));
//#endregion
