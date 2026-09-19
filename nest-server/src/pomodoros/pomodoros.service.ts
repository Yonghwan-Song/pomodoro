import {
  Injectable,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreatePomodoroDto } from './dto/create-pomodoro.dto';
import { CreateDemoDataDto } from './dto/create-demo-data.dto';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from 'src/postgresql/schema';
import { DrizzleDb, PG_DB_BY_DRIZZLE } from 'src/postgresql/pg-provider';

const POSTGRES_INTEGER_MAX = 2_147_483_647;

function isPersistableDuration(duration: number): boolean {
  return (
    Number.isInteger(duration) &&
    duration > 0 &&
    duration <= POSTGRES_INTEGER_MAX
  );
}

@Injectable()
export class PomodorosService {
  constructor(
    @Inject(PG_DB_BY_DRIZZLE)
    private readonly db: DrizzleDb,
  ) {}

  // task 끼리 계산해서 묶어주면,
  async persistPomodoroRecordsAndTaskTrackingDurations(
    createPomodoroDto: CreatePomodoroDto,
    userEmail: string,
  ) {
    try {
      console.log('Received createPomodoroDto in service:', createPomodoroDto);

      // FE에서는 항상 배열로 보내지만, DTO상 optional이므로 ?? [] 방어 적용
      const safeTrackingArr = createPomodoroDto.taskTrackingArr ?? [];

      const persistablePomodoroRecords =
        createPomodoroDto.pomodoroRecordArr.filter(({ duration }) =>
          isPersistableDuration(duration),
        );

      const persistableTaskTrackings = safeTrackingArr.filter(({ duration }) =>
        isPersistableDuration(duration),
      );

      const excludedPomodoroCount =
        createPomodoroDto.pomodoroRecordArr.length -
        persistablePomodoroRecords.length;

      const excludedTaskTrackingCount =
        safeTrackingArr.length - persistableTaskTrackings.length;

      if (excludedPomodoroCount > 0 || excludedTaskTrackingCount > 0) {
        console.warn(
          '[PomodorosService.persistPomodoroRecordsAndTaskTrackingDurations] ' +
            `Excluded records with invalid durations: ` +
            `pomodoros=${excludedPomodoroCount}, ` +
            `taskTrackings=${excludedTaskTrackingCount}`,
        );
      }

      //#region Pg
      // QQQ: 아마도 이 transaction함수 내부에서 pomodoros table관련 constraint를 위배해서 에러가 발생해서,
      // `pgPersistResult`값이 undefined인지 뭔지가 나온 것 같은데, drizzle-orm 수준에서 error를 분명히 던져야지 맞는것 같은데,
      // catch하지 못했다. Callback함수에서 try-catch 구문에 의해 catch된 error를 다시 throw해야함?
      const pgPersistResult = await this.db.transaction(async (tx) => {
        const pgUser = await tx.query.users.findFirst({
          where: eq(schema.users.userEmail, userEmail),
          columns: { id: true },
        });

        if (!pgUser) {
          throw new Error(`PostgreSQL user not found for ${userEmail}`);
        }

        // 1) 뽀모도로 레코드 FK 매핑 및 INSERT
        const pgPomodoroValues = [];
        // for (const val of createPomodoroDto.pomodoroRecordArr) {
        for (const val of persistablePomodoroRecords) {
          let categoryId: string | null = null;
          if (val.category?.name) {
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
          });
        }

        let insertedPgPomodoros: { id: string }[] = [];
        if (pgPomodoroValues.length > 0) {
          insertedPgPomodoros = await tx
            .insert(schema.pomodoros)
            .values(pgPomodoroValues)
            .returning({ id: schema.pomodoros.id });
        }

        if (insertedPgPomodoros.length !== pgPomodoroValues.length) {
          throw new Error(
            `PostgreSQL inserted ${insertedPgPomodoros.length} of ${pgPomodoroValues.length} pomodoro records`,
          );
        }

        // 2) taskTrackingArr 누적 집중 시간 증분 업데이트
        const updatedPgTasks = [];
        // for (const tracking of safeTrackingArr) {
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

          if (!updatedPgTask) {
            throw new Error(
              `PostgreSQL Todoist task '${tracking.taskId}' not found for ${userEmail}`,
            );
          }

          updatedPgTasks.push(updatedPgTask);
        }

        return {
          insertedPomodoroCount: insertedPgPomodoros.length,
          updatedTasks: updatedPgTasks,
        };
      });

      console.log('pg result at persist pomodoro records');
      console.log('--------------------------------------------------->');
      console.dir(pgPersistResult, { depth: null, colors: true });
      console.log('<---------------------------------------------------');
      //#endregion

      return;
    } catch (error) {
      console.error(
        '[PomodorosService.persistPomodoroRecordsAndTaskTrackingDurations]',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to persist pomodoro records',
      );
    }
  }

  async getAllPomodoroRecordsByUserEmail(userEmail: string) {
    //#region Pg
    try {
      const pgUser = await this.db.query.users.findFirst({
        where: eq(schema.users.userEmail, userEmail),
        columns: { id: true },
      });

      if (!pgUser) {
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      const pgResultGetPomodoros = await this.db.query.pomodoros.findMany({
        where: and(eq(schema.pomodoros.userId, pgUser.id)),
        with: {
          category: {
            columns: {
              name: true,
              color: true,
              isOnStat: true,
            },
          },
        },
        columns: {
          duration: true,
          startTime: true,
          date: true,
        },
      });

      const pomodoros = pgResultGetPomodoros.map(({ category, ...pomodoro }) =>
        category === null ? pomodoro : { ...pomodoro, category },
      );
      //#endregion

      console.log('pg result at get all pomodoro records');
      console.log('--------------------------------------------------->');
      console.dir(pomodoros, {
        depth: null,
        colors: true,
      });
      console.log('<---------------------------------------------------');

      return pomodoros;
    } catch (error) {
      console.error(
        '[PomodorosService.getAllPomodoroRecordsByUserEmail]',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve pomodoro records',
      );
    }
  }

  async getTodayTotalDurationByUserEmail(
    userEmail: string,
    todayDateString: string,
  ) {
    //#region Pg
    try {
      const pgUser = await this.db.query.users.findFirst({
        where: eq(schema.users.userEmail, userEmail),
        columns: { id: true },
      });

      if (!pgUser) {
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      const [pgResult] = await this.db
        .select({
          todayTotal: sql<number>`COALESCE(SUM(${schema.pomodoros.duration}), 0)`,
        })
        .from(schema.pomodoros)
        .where(
          and(
            eq(schema.pomodoros.userId, pgUser.id),
            eq(schema.pomodoros.date, todayDateString),
          ),
        );

      const todayTotal = Number(pgResult?.todayTotal ?? 0);

      console.log('pg result at get today total duration');
      console.log('--------------------------------------------------->');
      console.dir(
        { todayTotal },
        {
          depth: null,
          colors: true,
        },
      );
      console.log('<---------------------------------------------------');

      return { todayTotal };
    } catch (error) {
      console.error(
        '[PomodorosService.getTodayTotalDurationByUserEmail]',
        error,
      );
      throw new InternalServerErrorException(
        "Failed to retrieve today's total duration",
      );
    }
    //#endregion
  }

  async createDemoData(
    createDemoDataDto: CreateDemoDataDto,
    userEmail: string,
  ) {
    try {
      const { timestampForBeginningOfYesterday, timezoneOffset } =
        createDemoDataDto;

      let pomodoroRecords = [];
      const _24h = 24 * 60 * 60 * 1000;
      const fromClient = new Date(timestampForBeginningOfYesterday); //TODO: 중복인 것 같아.

      console.log(fromClient.getTime());
      console.log(timestampForBeginningOfYesterday);

      for (let i = 0; i < 40; i++) {
        // Generate an array of records of a day
        const aDateInThePast = new Date(fromClient.getTime() - _24h * i);
        const aDate = {
          year: aDateInThePast.getFullYear(),
          month: aDateInThePast.getMonth(),
          day: aDateInThePast.getDate(),
        };
        const arrOfDemoPomodoroRecords = [
          ...createRecords({
            when: { ...aDate, hours: 8 },
            timezoneOffset,
            pomoDuration: 25,
            shortBreak: 5,
            longBreak: 15,
            numOfPomo: 4,
            numOfCycle: Math.trunc(generateRandomNumOfCycle(0, 3)),
          }),
          ...createRecords({
            when: { ...aDate, hours: 13 },
            timezoneOffset,
            pomoDuration: 25,
            shortBreak: 5,
            longBreak: 15,
            numOfPomo: 4,
            numOfCycle: Math.trunc(generateRandomNumOfCycle(0, 3)),
          }),
          ...createRecords({
            when: { ...aDate, hours: 18 },
            timezoneOffset,
            pomoDuration: 25,
            shortBreak: 5,
            longBreak: 15,
            numOfPomo: 4,
            numOfCycle: Math.trunc(generateRandomNumOfCycle(0, 3)),
          }),
        ];
        pomodoroRecords = [...pomodoroRecords, ...arrOfDemoPomodoroRecords];
      }

      //#region Pg
      const insertedCount = await this.db.transaction(async (tx) => {
        const pgUser = await tx.query.users.findFirst({
          where: eq(schema.users.userEmail, userEmail),
          columns: { id: true },
        });

        if (!pgUser) {
          throw new Error(`PostgreSQL user not found for ${userEmail}`);
        }

        const pgDemoValues = pomodoroRecords.map((rec) => ({
          userId: pgUser.id,
          duration: rec.duration,
          startTime: rec.startTime,
          date: rec.date,
          isDummy: true,
        }));

        let count = 0;
        for (let i = 0; i < pgDemoValues.length; i += 500) {
          const chunk = pgDemoValues.slice(i, i + 500);
          const inserted = await tx
            .insert(schema.pomodoros)
            .values(chunk)
            .returning({ id: schema.pomodoros.id });

          if (inserted.length !== chunk.length) {
            throw new Error(
              `PostgreSQL inserted ${inserted.length} of ${chunk.length} demo pomodoro records`,
            );
          }

          count += inserted.length;
        }

        return count;
      });

      console.log('pg result at create demo data');
      console.log('--------------------------------------------------->');
      console.dir({ insertedCount }, { depth: null, colors: true });
      console.log('<---------------------------------------------------');
      //#endregion

      return;
    } catch (error) {
      console.error('[PomodorosService.createDemoData]', error);
      throw new InternalServerErrorException('Failed to create demo data');
    }
  }

  async deleteDemoData(userEmail: string) {
    try {
      //#region Pg
      const pgUser = await this.db.query.users.findFirst({
        where: eq(schema.users.userEmail, userEmail),
        columns: { id: true },
      });

      if (!pgUser) {
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      const deletedPgRecords = await this.db
        .delete(schema.pomodoros)
        .where(
          and(
            eq(schema.pomodoros.userId, pgUser.id),
            eq(schema.pomodoros.isDummy, true),
          ),
        )
        .returning({ id: schema.pomodoros.id });

      console.log('pg result at delete demo data');
      console.log('--------------------------------------------------->');
      console.dir(
        { deletedCount: deletedPgRecords.length },
        { depth: null, colors: true },
      );
      console.log('<---------------------------------------------------');
      //#endregion

      return;
    } catch (error) {
      console.error('[PomodorosService.deleteDemoData]', error);
      throw new InternalServerErrorException('Failed to delete demo data');
    }
  }
}

/**
 * Generate pomodoro records starting from the when argument.
 * And then return the generated records.
 */
function createRecords({
  when,
  timezoneOffset,
  pomoDuration,
  shortBreak,
  longBreak,
  numOfPomo,
  numOfCycle,
}: {
  when: { year: number; month: number; day: number; hours: number };
  timezoneOffset: number;
  pomoDuration: number;
  shortBreak: number;
  longBreak: number;
  numOfPomo: number;
  numOfCycle: number;
}) {
  let startTime = new Date(
    when.year,
    when.month,
    when.day,
    when.hours,
  ).getTime();

  // min -> millisec
  const timesInMilliSeconds = {
    pomoDuration: pomoDuration * 60 * 1000,
    shortBreak: shortBreak * 60 * 1000,
    longBreak: longBreak * 60 * 1000,
  };

  const pomoRecordArr = [];

  // This is the timestamp to create a client's local date.
  const dateWithAdjustedTimestamp = new Date(
    startTime - timezoneOffset * 60 * 1000,
  );

  for (let i = 0; i < numOfCycle; i++) {
    for (let j = 0; j < numOfPomo; j++) {
      pomoRecordArr.push({
        duration: pomoDuration,
        startTime,
        date: `${
          dateWithAdjustedTimestamp.getUTCMonth() + 1
        }/${dateWithAdjustedTimestamp.getUTCDate()}/${dateWithAdjustedTimestamp.getUTCFullYear()}`,
      });
      if (j == numOfPomo - 1) {
        startTime +=
          timesInMilliSeconds.pomoDuration + timesInMilliSeconds.longBreak;
      } else {
        startTime +=
          timesInMilliSeconds.pomoDuration + timesInMilliSeconds.shortBreak;
      }
    }
  }

  return pomoRecordArr;
}

function generateRandomNumOfCycle(min, max) {
  return Math.random() * (max - min) + min;
}
