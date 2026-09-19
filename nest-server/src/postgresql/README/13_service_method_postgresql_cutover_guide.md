# 13. Service Method PostgreSQL Cutover Guide

이 문서는 MongoDB와 PostgreSQL을 함께 사용하는 NestJS service method를 PostgreSQL 중심으로 점진적으로 전환할 때 적용하는 프로젝트 표준 작업 방식입니다. 새 채팅이나 새로운 작업자가 기존 맥락 없이 작업할 때 먼저 이 문서와 대상 method의 실제 코드를 읽어야 합니다.

이 가이드는 다음과 같은 반복 작업을 대상으로 합니다.

- MongoDB 코드는 아직 보존하고 dual-write를 유지하는 write method
- MongoDB 조회를 중단하고 PostgreSQL 결과를 반환하는 read method
- `ShadowDiffService.compare()`와 shadow 전용 오류 억제를 제거하는 method
- 성공 응답을 데이터 객체 대신 `{ success: true }`로 단순화하는 command endpoint
- PostgreSQL 트랜잭션과 row lock 필요 여부를 판단해야 하는 method

---

## 1. 작업 전 반드시 확인할 것

코드를 바로 수정하지 말고 다음 항목을 먼저 확인합니다.

1. 대상 service method 전체와 controller method를 읽습니다.
2. DTO, Drizzle schema, relation, unique constraint 이름을 확인합니다.
3. 프론트엔드 호출부가 응답 body를 실제로 사용하는지 검색합니다.
4. 같은 service의 인접 method가 사용하는 예외 처리와 응답 패턴을 확인합니다.
5. `diffService`가 다른 method에서도 사용되는지 확인합니다.
6. 기존 worktree 변경은 사용자 또는 다른 작업자의 변경일 수 있으므로 되돌리지 않습니다.
7. 기존 주석과 MongoDB 코드를 요청 없이 삭제하지 않습니다.

`diffService.compare()`를 한 method에서 제거하더라도 다른 method가 사용 중이면 import와 constructor injection은 유지해야 합니다.

---

## 2. 현재 마이그레이션 기본 정책

### Write method

별도 요청이 없다면 MongoDB write는 아직 실행 상태로 유지하고 PostgreSQL write도 실행합니다.

```text
MongoDB write
PostgreSQL write
PostgreSQL 결과 확인 및 로그
성공 응답
```

MongoDB 코드를 주석 처리하거나 삭제하지 않습니다. PostgreSQL 오류를 shadow 오류로 취급하여 무시하지 않습니다.

### Read method

PostgreSQL이 authoritative source로 전환된 read method에서는 PostgreSQL 결과를 반환합니다. MongoDB 조회 코드는 삭제하지 않고 요청에 따라 주석으로 보존합니다.

```text
PostgreSQL read
응답 shape 변환
PostgreSQL 결과 반환
```

MongoDB 조회 결과와 PG 결과를 비교하던 `diffService.compare()`는 해당 method에서 제거합니다.

---

## 3. Shadow Run 오류 억제를 제거한다

다음 패턴은 PostgreSQL이 단순 shadow 대상일 때만 허용됩니다.

```typescript
try {
  await writeToPostgreSQL();
} catch (error) {
  console.error('[ShadowDiff Error]', error);
}

return mongoResult;
```

PostgreSQL이 검증 대상 또는 authoritative source가 된 뒤에도 이 패턴을 유지하면 PG 실패가 HTTP 성공으로 위장됩니다. 내부 PG `try/catch`를 제거하고 오류를 바깥 catch로 전달해야 합니다.

```typescript
async updateSomething(dto: UpdateSomethingDto, userEmail: string) {
  try {
    await writeToMongoDB(dto, userEmail);

    const [updatedPgRow] = await this.db
      .update(schema.someTable)
      .set(/* ... */)
      .where(/* ... */)
      .returning();

    if (!updatedPgRow) {
      throw new Error(`PostgreSQL row not found for ${userEmail}`);
    }

    console.dir(updatedPgRow, { depth: null, colors: true });
    return;
  } catch (error) {
    console.error('[SomeService.updateSomething]', error);
    throw new InternalServerErrorException('Failed to update something');
  }
}
```

---

## 4. 오류 상태를 구분한다

### 4.1 PostgreSQL user가 없는 경우

Firebase 인증을 통과한 사용자의 MongoDB 데이터는 존재하지만 대응되는 PG `users` row가 없다면 일반적인 클라이언트 404가 아니라 서버 마이그레이션 또는 데이터 정합성 문제입니다.

```typescript
if (!pgUser) {
  throw new Error(`PostgreSQL user not found for ${userEmail}`);
}
```

바깥 catch에서 로그를 남기고 `InternalServerErrorException`으로 변환합니다.

### 4.2 대상 resource가 MongoDB에도 없는 경우

클라이언트가 업데이트 또는 삭제하려는 category 같은 resource가 MongoDB에도 없다면 해당 endpoint의 기존 계약에 따라 `NotFoundException`을 사용합니다.

```typescript
if (!categoryUpdated) {
  throw new NotFoundException('Category not found');
}
```

바깥 catch가 기존 Nest HTTP exception을 500으로 덮어쓰지 않도록 다시 전달해야 합니다.

```typescript
if (error instanceof NotFoundException) {
  throw error;
}
```

여러 HTTP exception을 보존해야 하면 `HttpException`을 기준으로 처리할 수 있습니다.

### 4.3 MongoDB는 성공했지만 PG 대응 row가 없는 경우

MongoDB 대상은 존재했지만 PG `.returning()` 결과가 없다면 두 저장소 사이의 데이터 불일치입니다. 클라이언트가 PG 내부 resource를 직접 요청한 것이 아니므로 보통 500으로 처리합니다.

### 4.4 Unique violation

PostgreSQL SQLSTATE `23505`는 constraint 이름으로 구분합니다.

```typescript
if (error.code === '23505') {
  if (error.constraint === 'categories_user_id_name_unique') {
    throw new ConflictException(
      'Category with this name already exists for this user.',
    );
  }
}
```

MongoDB duplicate key code `11000` 처리도 dual-write 기간에는 유지합니다.

### 4.5 Catch 기본 형태

```typescript
} catch (error) {
  if (error instanceof HttpException) {
    throw error;
  }

  console.error('[ServiceName.methodName]', error);
  throw new InternalServerErrorException('Client-safe failure message');
}
```

DB 원본 오류나 stack trace를 응답에 노출하지 않고 서버 로그에만 기록합니다.

---

## 5. `.returning()` 결과를 반드시 확인한다

Drizzle update와 delete의 `.returning()`은 배열을 반환합니다. 조건에 맞는 row가 없으면 `[]`이므로 첫 원소는 `undefined`입니다.

```typescript
const [updatedPgUser] = await this.db
  .update(schema.users)
  .set(updateValues)
  .where(eq(schema.users.userEmail, userEmail))
  .returning();

if (!updatedPgUser) {
  throw new Error(`PostgreSQL user not found for ${userEmail}`);
}
```

로그 확인만을 위해 전체 user row를 반환하면 token이나 불필요한 개인정보가 로그에 포함될 수 있습니다. 가능하면 변경 확인에 필요한 컬럼만 반환합니다.

```typescript
.returning({
  id: schema.users.id,
  categoryChangeInfoArray: schema.users.categoryChangeInfoArray,
});
```

---

## 6. PostgreSQL 결과 로그 규칙

사용자가 E2E 테스트 중 PG write를 직접 확인할 수 있도록 성공한 PG 결과를 로그로 남깁니다.

```typescript
console.log('pg result at update category');
console.log('--------------------------------------------------->');
console.dir(updatedPgCategory, {
  depth: null,
  colors: true,
});
console.log('<---------------------------------------------------');
```

다음 규칙을 적용합니다.

1. `diffService.compare()` 대신 PG 결과를 출력합니다.
2. 트랜잭션을 사용한다면 callback 내부가 아니라 commit이 완료된 뒤 출력합니다.
3. access token, 인증 정보, 불필요한 user 전체 row는 출력하지 않습니다.
4. 실패는 `console.error('[Service.method]', error)` 형식으로 남깁니다.

---

## 7. 성공 응답은 controller에서 만든다

프론트엔드가 업데이트 결과 객체를 사용하지 않는 command endpoint는 service가 값을 반환하지 않도록 합니다.

```typescript
async updateSomething(/* ... */): Promise<void> {
  // writes
  return;
}
```

Controller는 service 완료 후 성공 응답을 반환합니다.

```typescript
await this.someService.updateSomething(dto, request.userEmail);
return { success: true };
```

오류가 발생하면 Nest가 예외의 HTTP status와 오류 body를 자동으로 응답하므로 `{ success: false }`를 직접 만들지 않습니다.

응답을 바꾸기 전에 프론트엔드가 기존 response data를 사용하지 않는지 반드시 검색합니다.

---

## 8. PostgreSQL 트랜잭션 사용 기준

서로 의존하는 여러 PG write는 하나의 트랜잭션으로 묶습니다.

예시:

- 기존 `isCurrent` row들을 false로 변경한 뒤 대상 row를 true로 변경
- category를 변경하고 `users.categoryChangeInfoArray`도 함께 변경
- user와 기본 child row를 함께 생성
- child rows 전체 교체를 위해 delete 후 insert

```typescript
const result = await this.db.transaction(async (tx) => {
  // 모든 PG query는 this.db가 아니라 tx를 사용한다.
  await tx.update(/* ... */);
  const [updatedRow] = await tx.update(/* ... */).returning();
  return updatedRow;
});

// 여기까지 왔다면 commit 완료
console.dir(result);
```

MongoDB와 PostgreSQL을 함께 쓰는 dual-write 전체는 PG 트랜잭션 하나로 원자성을 보장할 수 없습니다. MongoDB write 성공 후 PG write가 실패하면 MongoDB 변경은 이미 남아 있을 수 있습니다. 완전한 cross-database 원자성이 필요하면 향후 outbox, 보상 작업, saga 또는 최종 PG cutover가 필요합니다.

---

## 9. Row lock 판단 기준

상세 설명은 다음 문서를 참고합니다.

`src/users/README/05_row_locks_for_jsonb_read_modify_write.md`

### 명시적 row lock이 필요한 경우

다음과 같은 서버 측 read-modify-write에서는 같은 row에 대한 동시 요청이 변경을 덮어쓰지 않도록 트랜잭션과 `SELECT ... FOR UPDATE`를 사용합니다.

```text
PG row 조회
JavaScript에서 기존 JSONB 배열 수정
수정된 배열 전체를 PG에 저장
```

```typescript
const [pgUser] = await tx
  .select({
    id: schema.users.id,
    categoryChangeInfoArray: schema.users.categoryChangeInfoArray,
  })
  .from(schema.users)
  .where(eq(schema.users.userEmail, userEmail))
  .for('update');
```

조회 후에는 동일한 row임을 명확히 하기 위해 `pgUser.id`로 업데이트합니다.

현재 적용 사례:

- `UsersService.updateColorForUnCategorized()`
- `CategoriesService.update()`의 `categoryChangeInfoArray` 동기화

### 명시적 선행 row lock이 필요 없는 경우

클라이언트가 보낸 완성된 배열이나 단순 scalar 값을 서버가 읽지 않고 직접 한 번의 UPDATE로 교체하는 경우입니다.

```typescript
await this.db
  .update(schema.users)
  .set({ categoryChangeInfoArray: dto.categoryChangeInfoArray })
  .where(eq(schema.users.userEmail, userEmail));
```

`UPDATE` 자체가 대상 row lock을 획득합니다. 현재 사례는 `UsersService.updateCategoryChangeInfoArray()`입니다.

다만 오래된 client payload가 최신 배열을 덮어쓰는 문제는 row lock으로 해결되지 않습니다. 필요하면 version 컬럼을 사용하는 optimistic concurrency, 변경 이벤트 단위 API, 또는 서버 병합 정책을 도입합니다.

동일한 JSONB를 read-modify-write하는 모든 writer가 같은 lock 순서를 따라야 합니다. 일부 method만 lock을 사용하면 lost update 방지가 완전하지 않습니다.

---

## 10. Read method 전환 규칙

### `findFirst()`

단일 row가 없으면 `undefined`입니다. PG user 누락을 명시적으로 처리합니다.

### `findMany()`

조회에 성공했지만 row가 없으면 `undefined`가 아니라 `[]`을 반환합니다. MongoDB `find()`도 빈 배열을 반환하므로 일반적으로 `?? []` fallback은 필요하지 않습니다.

### Nullable relation

Relational Query API의 nullable relation은 `category: null`처럼 반환됩니다. 기존 API 계약이 category field 자체의 생략을 요구하면 조회 후 변환합니다.

```typescript
return pgRows.map(({ category, ...row }) =>
  category === null ? row : { ...row, category },
);
```

### 오류를 삼키지 않는다

PG read 실패 후 `undefined`나 과거 MongoDB 데이터를 HTTP 200으로 반환하지 않습니다. 로그를 남기고 `InternalServerErrorException`을 발생시킵니다.

### Response shape 유지

MongoDB의 `.select()`와 `.populate()`가 만들던 기존 client contract를 확인하고 Drizzle의 `columns`와 `with`로 동일한 shape를 구성합니다. 필요 없는 PK, FK, 내부 flag는 반환하지 않습니다.

---

## 11. Batch update 주의사항

다음 코드는 모든 작업이 성공해야 Promise가 resolve되지만 batch 전체가 하나의 DB 트랜잭션인 것은 아닙니다.

```typescript
await Promise.all(
  dto.items.map((item) => this.update(item, userEmail)),
);
```

앞선 두 작업이 성공하고 마지막 작업이 실패하면 앞선 변경은 롤백되지 않습니다. 현재 dual-write 단계에서는 이 한계를 주석으로 기록합니다.

PostgreSQL이 authoritative source가 된 뒤 batch 전체 원자성이 필요하면 service 내부 로직을 transaction-aware helper로 분리하고 하나의 `db.transaction()`에서 모든 항목을 처리합니다. MongoDB와 PG를 동시에 쓰는 동안에는 PG transaction만으로 cross-database 원자성을 보장할 수 없습니다.

---

## 12. E2E 검증 방법

현재 프로젝트 작업에서는 별도 요청이 없으면 Jest test를 추가하지 않고 다음을 수행합니다.

1. 변경 후 `nest-server`에서 `npm run build`를 실행합니다.
2. 브라우저 Network에서 PATCH/POST 응답 status와 `{ success: true }`를 확인합니다.
3. 서버 로그에서 변경된 PG 결과를 확인합니다.
4. 새로고침 후 PG를 읽는 GET endpoint의 response body를 확인합니다.
5. UI state, Cache Storage, IndexedDB가 서버 응답을 가릴 수 있으므로 가능하면 Network response 또는 DB client로 직접 검증합니다.
6. 빈 배열, nullable relation, missing PG user, unique violation을 E2E 시나리오에 포함합니다.

예를 들어 `GET /users`의 최종 response body는 현재 PG replacement를 반환하지만 method 앞부분에서 MongoDB도 조회합니다. "응답 데이터가 PG에서 왔다"와 "method가 MongoDB에 전혀 접근하지 않는다"는 서로 다른 상태이므로 코드를 직접 확인해야 합니다.

---

## 13. 새 채팅에서 사용할 작업 지시 템플릿

새 채팅에서 다음과 같이 요청하면 이 문서의 기준을 빠르게 복원할 수 있습니다.

```text
먼저 AGENTS.md와
nest-server/src/postgresql/README/13_service_method_postgresql_cutover_guide.md를 읽어줘.

대상 service method, controller, DTO, Drizzle schema, 프론트엔드 호출부를 확인한 뒤
문서의 PostgreSQL cutover 규칙대로 수정해줘.

- 기존 MongoDB 코드와 주석은 삭제하지 말 것
- 해당 method의 diffService.compare는 제거할 것
- PG 오류를 shadow catch로 삼키지 말 것
- PG 결과만 안전한 컬럼으로 로그할 것
- command endpoint는 가능하면 { success: true }를 반환할 것
- transaction 및 row lock 필요 여부를 판단할 것
- Jest는 추가하지 말고 npm run build로 검증할 것
- unrelated worktree 변경은 수정하거나 되돌리지 말 것
```

문서를 기계적으로 적용하지 말고 실제 endpoint 계약과 데이터 흐름을 먼저 확인해야 합니다. 특히 response body를 사용하는 프론트엔드, 기존 4xx 예외, unique constraint 이름, cross-database partial failure 가능성은 method마다 다릅니다.

---

## 14. 최종 체크리스트

- [ ] 대상 service, controller, DTO, schema, client caller를 확인했다.
- [ ] MongoDB 코드와 기존 주석을 요청 없이 삭제하지 않았다.
- [ ] 해당 method의 shadow compare와 shadow-only catch를 제거했다.
- [ ] PG user 또는 대응 row 누락을 처리했다.
- [ ] 기존 Nest 4xx 예외를 500으로 덮어쓰지 않았다.
- [ ] `.returning()` 결과가 없는 경우를 처리했다.
- [ ] PG dependent writes를 transaction으로 묶었다.
- [ ] read-modify-write이면 row lock 필요성을 검토했다.
- [ ] transaction 내부에서 `this.db` 대신 `tx`를 사용했다.
- [ ] PG 로그가 commit 이후에 출력되고 민감정보를 포함하지 않는다.
- [ ] service와 controller의 성공 응답 책임을 분리했다.
- [ ] read response shape가 기존 client contract와 일치한다.
- [ ] batch가 실제로 원자적인지, 아니면 TODO가 필요한지 확인했다.
- [ ] Jest 요청이 없다면 `npm run build`를 실행했다.
- [ ] 변경하지 않은 사용자 작업을 되돌리지 않았다.
