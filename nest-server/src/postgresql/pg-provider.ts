import { ConfigService } from '@nestjs/config';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const PG_DB_BY_DRIZZLE = 'PG_DB_BY_DRIZZLE';
export type DrizzleDb = NodePgDatabase<typeof schema>;

export const pgProviderByDrizzle = {
  provide: PG_DB_BY_DRIZZLE,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    // TODO: define/or get the db we ultimately have to return.
    // DECISION: Should I use pool? -> 안써도 된데. (Implicit pool이 drizzle에 의해 자동으로 생성된다)
    // -> UPDATE: 단순 setup은 drizzle(uri)로 충분하지만, NestJS 프로덕션 환경에서는
    //    1) Hot-Reload 시 커넥션 누수 방지 (pool.end / Graceful shutdown)
    //    2) 커넥션 수 제한 (max: 10 등) 및 SSL 설정을 위해 명시적 Pool 사용을 권장합니다.
    const uri = configService.get<string>('NEON_POSTGRESQL_URL');

    // QQQ: Why do we use configService? instead of just accessing the process and get env var?
    // -> ANSWER:
    //    1) Testability: 단위 테스트 작성 시 process.env를 직접 오염시키지 않고 ConfigService mock 주입 가능
    //    2) Validation: NestJS ConfigModule의 환경변수 자동 검증/타입 변환 활용 가능
    //    3) NestJS Standard: 의존성 주입(DI) 패턴을 통일성 있게 준수

    if (!uri) {
      throw new Error(
        '[Drizzle Provider] NEON_POSTGRESQL_URL environment variable is not defined.',
      );
    }

    // 명시적인 Pool 생성 (커넥션 수 제어 및 Graceful shutdown 관리용)
    const pool = new Pool({
      connectionString: uri,
      max: 10,
    });

    // drizzle 인스턴스 생성 시 schema를 전달해야 Relational Queries (db.query...) 및 강력한 타입 추론이 가능해집니다.
    const db = drizzle({ client: pool, schema, casing: 'snake_case' });
    return db;
  },
};
