import {
  Injectable,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateTodayRecordDto } from './dto/create-today-record.dto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gte, inArray, sql } from 'drizzle-orm';
import * as schema from 'src/postgresql/schema';
import { normalizeReason, sessionSegmentInserts } from './session-segment-rows';

const POSTGRES_INTEGER_MAX = 2_147_483_647;

function isPersistableDuration(duration: number): boolean {
  return (
    Number.isInteger(duration) &&
    duration > 0 &&
    duration <= POSTGRES_INTEGER_MAX
  );
}

function isPersistablePomodoroRecord(record: {
  duration: number;
  startTime: number;
  date: string;
}): boolean {
  return (
    isPersistableDuration(record.duration) &&
    Number.isInteger(record.startTime) &&
    record.startTime > 0 &&
    typeof record.date === 'string' &&
    record.date.length > 0
  );
}

@Injectable()
export class TodayRecordsService {
  constructor(
    @Inject('PG_DB_BY_DRIZZLE')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async createTodayRecord(
    createTodayRecordDto: CreateTodayRecordDto,
    userEmail: string,
  ) {
    try {
      const pgUser = await this.db.query.users.findFirst({
        where: eq(schema.users.userEmail, userEmail),
        columns: { id: true },
      });

      if (!pgUser) {
        // NOTE: This will be catched and interpreted as 500 error since the code we wrote in the catch block. And it is 500 not 404.
        // It is because the client is creating a timer session, not requesting a PostgreSQL user resource directly. If an authenticated user exists from the client’s perspective but the corresponding PostgreSQL row is missing, that indicates a server-side data consistency problem.
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      // Import pomodoro record persist logic
      //#region

      const pgPersistResult = await this.db.transaction(async (tx) => {
        //#region Common (break and pomo)
        const isEarlyEnded = createTodayRecordDto.isEarlyEnded ?? false;
        const earlyEndReason = isEarlyEnded
          ? normalizeReason(createTodayRecordDto.earlyEndReason)
          : null;

        const [insertedTimerSession] = await tx
          .insert(schema.timerSessions)
          .values({
            userId: pgUser.id,
            kind: createTodayRecordDto.kind,
            startTime: createTodayRecordDto.startTime,
            endTime: createTodayRecordDto.endTime,
            timeCountedDown: createTodayRecordDto.timeCountedDown,
            pause: createTodayRecordDto.pause,
            totalPauseLength: createTodayRecordDto.pause?.totalLength ?? 0,
            plannedDuration: createTodayRecordDto.plannedDuration ?? null,
            editedDuration: createTodayRecordDto.editedDuration ?? 0,
            isEarlyEnded,
            earlyEndReason,
          })
          .returning({ id: schema.timerSessions.id });

        // [1] 여기서 error가 throw되면 트랜잭션이 즉시 ROLLBACK되어 DB에 아무것도 반영되지 않습니다 (All-or-Nothing 원자성 보장).
        if (!insertedTimerSession) {
          throw new Error(
            `PostgreSQL timer session was not inserted for ${userEmail}`,
          );
        }

        const sessionId = insertedTimerSession.id;

        // 분리된 sessionPauses 테이블에 일시정지 기록 적재
        const pauseRecords = (createTodayRecordDto.pause?.record ?? []).filter(
          (r) =>
            typeof r.start === 'number' &&
            typeof r.end === 'number' &&
            r.end >= r.start,
        );
        if (pauseRecords.length > 0) {
          await tx.insert(schema.sessionPauses).values(
            pauseRecords.map((r) => ({
              timerSessionId: sessionId,
              startTime: r.start,
              endTime: r.end,
              reason: normalizeReason(r.reason),
            })),
          );
        }

        const segments = createTodayRecordDto.segments;
        const categoryNames = [
          ...new Set(
            segments
              .map((segment) => segment.owner[0].trim())
              .filter((name) => name.length > 0),
          ),
        ];
        const taskIds = [
          ...new Set(
            segments
              .map((segment) => segment.owner[1].trim())
              .filter((taskId) => taskId.length > 0),
          ),
        ];
        const categoryRows =
          categoryNames.length === 0
            ? []
            : await tx
                .select({
                  id: schema.categories.id,
                  name: schema.categories.name,
                })
                .from(schema.categories)
                .where(
                  and(
                    eq(schema.categories.userId, pgUser.id),
                    inArray(schema.categories.name, categoryNames),
                  ),
                );
        const taskRows =
          taskIds.length === 0
            ? []
            : await tx
                .select({
                  id: schema.todoistTasks.id,
                  todoistTaskId: schema.todoistTasks.todoistTaskId,
                  taskData: schema.todoistTasks.taskData,
                })
                .from(schema.todoistTasks)
                .where(
                  and(
                    eq(schema.todoistTasks.userId, pgUser.id),
                    inArray(schema.todoistTasks.todoistTaskId, taskIds),
                  ),
                );

        const categoryIdByName = new Map(
          categoryRows.map((row) => [row.name, row.id]),
        );
        const todoistRowIdByTaskId = new Map(
          taskRows.map((row) => [row.todoistTaskId, row.id]),
        );
        const taskContentByTaskId = new Map(
          taskRows.map((row) => [
            row.todoistTaskId,
            row.taskData?.content ?? null,
          ]),
        );

        const segmentRows = sessionSegmentInserts({
          userId: pgUser.id,
          timerSessionId: sessionId,
          segments,
          categoryIdByName,
          todoistRowIdByTaskId,
          taskContentByTaskId,
        });
        const insertedSegments =
          segmentRows.length === 0
            ? []
            : await tx
                .insert(schema.sessionSegments)
                .values(segmentRows)
                .returning({ id: schema.sessionSegments.id });
        //#endregion

        let insertedPgPomodoros: { id: string }[] = [];
        const updatedPgTasks = [];

        if (createTodayRecordDto.kind === 'pomo') {
          // [2] FE 방어 및 DB 무결성:
          // FE에서 빈 배열이거나 유효하지 않은 값이 들어올 수 있으므로 ?? [] 및 isPersistableDuration 필터링을 유지합니다.
          const safeTrackingArr = createTodayRecordDto.taskTrackingArr ?? [];
          const safePomodoroRecordArr =
            createTodayRecordDto.pomodoroRecordArr ?? [];
          const persistablePomodoroRecords = safePomodoroRecordArr.filter(
            (record) => isPersistablePomodoroRecord(record),
          );
          const persistableTaskTrackings = safeTrackingArr.filter(
            ({ duration }) => isPersistableDuration(duration),
          );
          const excludedPomodoroCount =
            safePomodoroRecordArr.length - persistablePomodoroRecords.length;
          const excludedTaskTrackingCount =
            safeTrackingArr.length - persistableTaskTrackings.length;
          if (excludedPomodoroCount > 0 || excludedTaskTrackingCount > 0) {
            console.warn(
              '[TodayRecordsService.createTodayRecord] ' +
                `Excluded records that cannot be stored: ` +
                `pomodoros=${excludedPomodoroCount}, ` +
                `taskTrackings=${excludedTaskTrackingCount}`,
            );
          }

          // NOTE: pomodoroRecordArr는 FE 파이프라인에서 segments를 집계(makeDurationsFromSegmentsByCategoryAndTaskCombination)하여 생성되므로,
          // pomodoroRecordArr에 포함된 모든 category/task는 이미 segments 조회 시 구축된 Map에 존재합니다. (추가 DB 조회 불필요, O(1) 메모리 매핑)
          const pgPomodoroValues = persistablePomodoroRecords.map((val) => {
            const categoryName = val.category?.name?.trim();
            const taskId = val.task?.id?.trim();
            const categoryId =
              categoryName && categoryIdByName.has(categoryName)
                ? categoryIdByName.get(categoryName)!
                : null;
            const todoistTaskId =
              taskId && todoistRowIdByTaskId.has(taskId)
                ? todoistRowIdByTaskId.get(taskId)!
                : null;

            return {
              userId: pgUser.id,
              duration: val.duration,
              startTime: val.startTime,
              date: val.date,
              isDummy: val.isDummy ?? false,
              categoryId,
              todoistTaskId,
              timerSessionId: sessionId,
            };
          });

          if (pgPomodoroValues.length > 0) {
            insertedPgPomodoros = await tx
              .insert(schema.pomodoros)
              .values(pgPomodoroValues)
              .returning({ id: schema.pomodoros.id });
          }

          // [3] 단일 PostgreSQL 트랜잭션 내 INSERT는 원자적이므로 실패 시 쿼리 전체가 예외를 던집니다.
          // 따라서 별도의 개수 비교 체크는 불필요하여 제거되었습니다.

          for (const tracking of persistableTaskTrackings) {
            const [updatedPgTask] = await tx
              .update(schema.todoistTasks)
              .set({
                totalFocusDuration: sql`${schema.todoistTasks.totalFocusDuration} + ${tracking.duration}`,
              })
              .where(
                and(
                  eq(schema.todoistTasks.userId, pgUser.id),
                  eq(schema.todoistTasks.todoistTaskId, tracking.taskId),
                ),
              )
              .returning({
                todoistTaskId: schema.todoistTasks.todoistTaskId,
                totalFocusDuration: schema.todoistTasks.totalFocusDuration,
              });

            // DECISION: A missing task row only loses this task's focus-time
            // increment. Throwing here would roll back the whole transaction,
            // dropping the timer session and its pomodoros, and a 500 is not
            // replayed by the client's failed-request queue, so the session
            // would be lost from the server for good.
            if (!updatedPgTask) {
              console.warn(
                '[TodayRecordsService.createTodayRecord] ' +
                  `Skipped focus duration update: PostgreSQL Todoist task ` +
                  `'${tracking.taskId}' not found for ${userEmail}`,
              );
              continue;
            }

            updatedPgTasks.push(updatedPgTask);
          }
        }

        // [4] 트랜잭션 커밋 결과 요약 반환 (로깅 및 디버깅용)
        return {
          timerSessionId: sessionId,
          insertedTimerSession,
          insertedSegmentCount: insertedSegments.length,
          insertedPomodoroCount: insertedPgPomodoros.length,
          updatedTasks: updatedPgTasks,
        };
      });

      // [5] 통합 트랜잭션 저장 결과 로깅
      console.log(
        '[TodayRecordsService.createTodayRecord] persist result (timerSession, pomodoros, taskTrackings)',
      );
      console.log('--------------------------------------------------->');
      console.dir(pgPersistResult, { depth: null, colors: true });
      console.log('<---------------------------------------------------');

      // DESIGN: pomodoros.timerSessionId references timer_sessions.id (schema.ts).
      // The column is nullable only for unmatched legacy rows. Every new pomodoro
      // insert must set this FK. This path inserts the timer session first, then
      // persists pomodoroRecordArr / taskTrackingArr in the same unit of work
      // with that session id. The DTO already accepts both arrays when kind is
      // 'pomo'. Do not keep a second write path that inserts pomodoros without a
      // session (the old persistPomodoroRecordsAndTaskTrackingDurations POST).

      return;
    } catch (error) {
      console.error(
        `Failed to create timer session in PostgreSQL for ${userEmail}`,
        error,
      );
      throw new InternalServerErrorException(
        `Failed to save timer session for ${userEmail}`,
      );
    }
  }

  // NOTE:
  // 과거에는 접속하자마자 해당 시점 이전 데이터를 삭제하고 남은 데이터만 가져오는 방식이었다.
  // 그렇게 해서 findTodayRecords의 "Today" 개념이 만들어진 것인데, 지금 다시 보면 납득하기 어렵다.
  // "Today"는 timestamp 조건문으로 조회하면 되는 것이지, 데이터를 지울 이유가 없다.
  async findTodayRecords(userEmail: string, timestamp?: number) {
    try {
      //#region Pg
      const pgUser = await this.db.query.users.findFirst({
        where: eq(schema.users.userEmail, userEmail),
        columns: { id: true },
      });

      console.log('pgUser at get todayRecord', pgUser);
      if (!pgUser) {
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      const pgRecords = await this.db.query.timerSessions.findMany({
        where: timestamp
          ? and(
              eq(schema.timerSessions.userId, pgUser.id),
              gte(schema.timerSessions.endTime, timestamp),
            )
          : eq(schema.timerSessions.userId, pgUser.id),
        columns: {
          kind: true,
          startTime: true,
          endTime: true,
          timeCountedDown: true,
          totalPauseLength: true,
          plannedDuration: true,
          editedDuration: true,
          isEarlyEnded: true,
          earlyEndReason: true,
        },
        with: {
          pauses: {
            columns: {
              startTime: true,
              endTime: true,
              duration: true,
              reason: true,
            },
          },
        },
      });

      console.log('pgRecords at get todayRecord', pgRecords);

      // 클라이언트(FE) 호환성을 위해 pause 객체 구조로 매핑하여 반환
      return pgRecords.map((r) => ({
        kind: r.kind,
        startTime: r.startTime,
        endTime: r.endTime,
        timeCountedDown: r.timeCountedDown,
        plannedDuration: r.plannedDuration,
        editedDuration: r.editedDuration,
        isEarlyEnded: r.isEarlyEnded,
        earlyEndReason: r.earlyEndReason,
        pause: {
          totalLength: r.totalPauseLength,
          record: r.pauses.map((p) => ({
            start: p.startTime,
            end: p.endTime,
            reason: p.reason,
          })),
        },
      }));
      //#endregion
    } catch (error) {
      console.error('[TodayRecordsService.findTodayRecords]', error);
      throw new InternalServerErrorException(
        'Failed to retrieve timer session data',
      );
    }
  }
}
