import {
  Injectable,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateTodayRecordDto } from './dto/create-today-record.dto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gte, sql } from 'drizzle-orm';
import * as schema from 'src/postgresql/schema';

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
        const [insertedTimerSession] = await tx
          .insert(schema.timerSessions)
          .values({
            userId: pgUser.id,
            kind: createTodayRecordDto.kind,
            startTime: createTodayRecordDto.startTime,
            endTime: createTodayRecordDto.endTime,
            timeCountedDown: createTodayRecordDto.timeCountedDown,
            pause: createTodayRecordDto.pause,
          })
          .returning({ id: schema.timerSessions.id });

        // [1] 여기서 error가 throw되면 트랜잭션이 즉시 ROLLBACK되어 DB에 아무것도 반영되지 않습니다 (All-or-Nothing 원자성 보장).
        if (!insertedTimerSession) {
          throw new Error(
            `PostgreSQL timer session was not inserted for ${userEmail}`,
          );
        }

        const sessionId = insertedTimerSession.id;
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
            safePomodoroRecordArr.length -
            persistablePomodoroRecords.length;
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

          const pgPomodoroValues = [];
          for (const val of persistablePomodoroRecords) {
            let categoryId: string | null = null;
            if (val.category?.name) {
              // NOTE: 카테고리ID값을 넣어야해서 찾는것임. DB에 한번 갔다옴.
              const foundCategory = await tx.query.categories.findFirst({
                where: and(
                  eq(schema.categories.userId, pgUser.id),
                  eq(schema.categories.name, val.category.name),
                ),
                columns: { id: true },
              });
              if (foundCategory) categoryId = foundCategory.id;
            }

            let todoistTaskId: string | null = null;
            if (val.task?.id) {
              // NOTE: 테스크ID값을 넣어야해서 찾는것임. DB에 한번 갔다옴.
              const foundTask = await tx.query.todoistTasks.findFirst({
                where: and(
                  eq(schema.todoistTasks.userId, pgUser.id),
                  eq(schema.todoistTasks.todoistTaskId, val.task.id),
                ),
                columns: { id: true },
              });
              if (foundTask) todoistTaskId = foundTask.id;
            }

            pgPomodoroValues.push({
              userId: pgUser.id,
              duration: val.duration,
              startTime: val.startTime,
              date: val.date,
              isDummy: val.isDummy ?? false,
              categoryId,
              todoistTaskId,
              timerSessionId: sessionId,
            });
          }

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

      ////#region logging
      //console.log(
      //  'timer session persist result at TodayRecordsService.createTodayRecord',
      //);
      //console.log('--------------------------------------------------->');
      //console.dir(insertedPgRecord, {
      //  depth: null,
      //  colors: true,
      //});
      //console.log('<---------------------------------------------------');
      ////#endregion

      return;
    } catch (error) {
      console.error('[TodayRecordsService.createTodayRecord]', error);
      throw new InternalServerErrorException(
        'Failed to insert timer session data',
      );
    }
    //#endregion
  }

  // NOTE:
  // 그러니까 강제로... 접속하자마자 그 접속 시간 이전의 데이터는 그냥 다 지워버리고
  // 그다음에 결국 남아있는 데이터를 다 가져오도록 하는거지...
  // 그렇게 해서 findTodayRecords의 "Today" 개념이 만들어진 것인데, 지금 다시 보면 납득하기 어렵다.
  // "Today"는 timestamp 조건문으로 조회하면 되는 것이지, 데이터를 지울 이유가 없다.
  // TODO: 위의 비판을 읽고
  // 1)FE에서 delete하는 modifier를 없앤다?...(이게 정말 맞는 말인지 확인하고 다시해보면 된다)
  // 2)로직 아래에 있는거 지우고 위의 말처럼 timestamp로 get today records를 구현.
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
          pause: true,
        },
      });

      console.log('pgRecords at get todayRecord', pgRecords);

      return pgRecords;
      //#endregion
    } catch (error) {
      console.error('[TodayRecordsService.findTodayRecords]', error);
      throw new InternalServerErrorException(
        'Failed to retrieve timer session data',
      );
    }
  }
}
