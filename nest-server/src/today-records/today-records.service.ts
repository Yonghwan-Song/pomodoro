import {
  Injectable,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateTodayRecordDto } from './dto/create-today-record.dto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gte } from 'drizzle-orm';
import * as schema from 'src/postgresql/schema';

@Injectable()
export class TodayRecordsService {
  constructor(
    @Inject('PG_DB_BY_DRIZZLE')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // DONE
  async createTodayRecord(
    createTodayRecordDto: CreateTodayRecordDto,
    userEmail: string,
  ) {
    try {
      console.log('createTodayRecordDto', createTodayRecordDto);

      //#region Pg
      const pgUser = await this.db.query.users.findFirst({
        where: eq(schema.users.userEmail, userEmail),
        columns: { id: true },
      });

      if (!pgUser) {
        // NOTE: This will be catched and interpreted as 500 error since the code we wrote in the catch block. And it is 500 not 404.
        // It is because the client is creating a timer session, not requesting a PostgreSQL user resource directly. If an authenticated user exists from the client’s perspective but the corresponding PostgreSQL row is missing, that indicates a server-side data consistency problem.
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      const [insertedPgRecord] = await this.db
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

      if (!insertedPgRecord) {
        throw new Error(
          `PostgreSQL timer session was not inserted for ${userEmail}`,
        );
      }

      console.log('pg result at TodayRecordsService.createTodayRecord');
      console.log('--------------------------------------------------->');
      console.dir(insertedPgRecord, {
        depth: null,
        colors: true,
      });
      console.log('<---------------------------------------------------');

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
