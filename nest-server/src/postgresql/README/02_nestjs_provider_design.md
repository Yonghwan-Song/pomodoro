# 02. NestJS Provider 설계 & ConfigService 아키텍처

## 1. Drizzle Provider 구현 패턴 (`pg-provider.ts`)

NestJS에서 Drizzle 인스턴스를 커스텀 프로바이더(Custom Provider)로 만들어 앱 전반에 주입(`@Inject('PG_DB_BY_DRIZZLE')`)하는 표준 형태입니다.

```typescript
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './entities/test-record.entity';

export const pgProviderByDrizzle = {
  provide: 'PG_DB_BY_DRIZZLE',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const uri = configService.get<string>('DOCKER_POSTGRESQL_URL');

    if (!uri) {
      throw new Error('[Drizzle Provider] DOCKER_POSTGRESQL_URL environment variable is not defined.');
    }

    const pool = new Pool({
      connectionString: uri,
      max: 10,
    });

    return drizzle({ client: pool, schema });
  },
};
```

---

## 2. 왜 `process.env` 대신 `ConfigService`를 사용해야 하는가?

코드에서 `process.env.DOCKER_POSTGRESQL_URL`로 직접 접근하지 않고, NestJS의 `ConfigService`를 주입받아 가져오는 3가지 핵심 이유입니다.

### ① 단위 테스트 용이성 (Testability)
- `process.env`를 직접 참조하면 테스트 실행 시 전역 환경변수를 오염시키거나 외부 환경에 의존하게 됩니다.
- `ConfigService`를 사용하면 단위 테스트(Unit Test) 작성 시 `ConfigService` mock 객체를 주입하여 원하는 환경변수 값으로 손쉽게 테스트를 격리 수행할 수 있습니다.

### ② 환경변수 검증 & 자동 타입 변환 (Validation)
- `@nestjs/config` 모듈에 Joi나 Zod 스키마를 연결하면, 서버 부팅 시점에 누락되었거나 형식이 잘못된 환경변수를 자동으로 검증할 수 있습니다.
- `configService.get<number>('PORT')` 처럼 자동 타입 변환 기능을 활용할 수 있습니다.

### ③ NestJS 의존성 주입(DI) 아키텍처 표준 준수
- NestJS 프레임워크 전반의 모듈식 아키텍처 규약을 준수하고, 모듈 간 결합도를 최적으로 유지합니다.

---

## 3. 예외 처리 가이드

환경변수가 누락되었을 때 런타임에 불명확한 오류가 발생하는 것을 방지하기 위해, `useFactory` 내부에서 `if (!uri)` 방어 코드를 작성하여 직관적인 에러 메시지를 남기도록 설계되었습니다.
