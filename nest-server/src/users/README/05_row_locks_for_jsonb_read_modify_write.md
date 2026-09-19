# JSONB Read-Modify-Write와 PostgreSQL Row Lock

이 문서는 `UsersService.updateColorForUnCategorized()`와 `CategoriesService.update()`처럼 JSONB 값을 읽고, JavaScript에서 변경한 뒤, 배열 전체를 다시 저장하는 코드에서 row lock이 필요한 이유를 설명합니다.

---

## 1. 한 요청 내부의 실행 순서

다음 코드는 한 요청 안에서는 작성된 순서대로 실행됩니다.

```typescript
const pgCurrentUser = await getUser();

const updatedCategoryChangeInfoArray =
  pgCurrentUser.categoryChangeInfoArray.map((info) => {
    return info.categoryName === 'uncategorized'
      ? { ...info, color: newColor }
      : info;
  });

await updateUser(updatedCategoryChangeInfoArray);
```

`await getUser()`가 끝나야 다음 줄로 이동하며, `Array.prototype.map()`은 동기적으로 새 배열을 완성합니다. 따라서 한 함수 안에서 `map()`이 조회보다 먼저 실행되거나 UPDATE 이후에 실행되는 문제는 없습니다.

---

## 2. 문제는 동시에 실행되는 서로 다른 요청이다

동일한 사용자를 변경하는 요청 A와 B가 거의 동시에 들어오면 각 요청 내부의 순서는 지켜져도 요청끼리는 다음처럼 섞일 수 있습니다.

```text
A: 기존 JSONB 배열 조회
B: 동일한 기존 JSONB 배열 조회
A: 배열 변경 후 UPDATE
B: 오래된 배열을 기준으로 변경 후 UPDATE
```

마지막 UPDATE가 앞선 UPDATE의 변경을 덮어쓰는 현상을 lost update라고 합니다. 각 함수에서 `await`을 사용했다는 사실은 서로 다른 HTTP 요청 사이의 실행 순서를 보장하지 않습니다.

---

## 3. `SELECT ... FOR UPDATE`의 역할

`FOR UPDATE`는 트랜잭션이 조회한 row를 잠급니다.

```typescript
const [pgCurrentUser] = await tx
  .select({
    id: schema.users.id,
    categoryChangeInfoArray: schema.users.categoryChangeInfoArray,
  })
  .from(schema.users)
  .where(eq(schema.users.userEmail, userEmail))
  .for('update');
```

요청 A가 이 row를 잠근 상태라면 같은 방식으로 row를 잠그려는 요청 B는 A의 트랜잭션이 끝날 때까지 기다립니다.

```text
A: 최신 row 조회 및 잠금
B: 같은 row의 잠금을 기다림
A: 배열 변경, UPDATE, COMMIT
B: 잠금 획득 후 최신 row 조회
B: 최신 배열을 기준으로 변경, UPDATE, COMMIT
```

잠금은 테이블 전체가 아니라 조건에 맞는 사용자 row에 적용됩니다. 트랜잭션이 commit 또는 rollback되면 PostgreSQL이 자동으로 잠금을 해제합니다.

---

## 4. 조회한 UUID로 업데이트하는 이유

API 입력인 `userEmail`은 사용자를 처음 찾는 자연키로 사용합니다. 사용자를 찾은 후에는 방금 잠근 row의 기본키인 `id`로 UPDATE합니다.

```typescript
await tx
  .update(schema.users)
  .set({ categoryChangeInfoArray: updatedArray })
  .where(eq(schema.users.id, pgCurrentUser.id));
```

이렇게 하면 "방금 조회하고 잠근 바로 그 row를 업데이트한다"는 의도가 명확해지고, 이메일 변경 가능성과 무관한 불변 UUID를 업데이트 식별자로 사용할 수 있습니다.

---

## 5. 모든 관련 writer가 같은 규칙을 따라야 한다

Row lock은 JSONB 배열을 read-modify-write하는 다른 코드 경로도 UPDATE 전에 같은 row를 잠글 때 가장 효과적입니다. 다른 메서드가 잠금 없이 오래된 배열을 읽고 배열 전체를 저장하면 변경을 덮어쓸 가능성이 남습니다.

현재 같은 잠금 규칙을 적용하는 위치는 다음과 같습니다.

1. `UsersService.updateColorForUnCategorized()`: `uncategorized` 항목의 색상을 변경합니다.
2. `CategoriesService.update()`: 카테고리 이름이나 색상이 변경되면 같은 변경을 `categoryChangeInfoArray`에 반영합니다.
3. `UsersService.updateCurrentTaskId()`: 기존 `taskChangeInfoArray`의 마지막 항목을 교체하거나 새 항목을 추가합니다.

이 메서드들은 모두 다음 순서를 따릅니다.

```text
PostgreSQL 트랜잭션 시작
users row를 SELECT ... FOR UPDATE로 조회하고 잠금
최신 categoryChangeInfoArray를 JavaScript에서 변경
조회한 users.id로 동일한 row UPDATE
트랜잭션 COMMIT과 함께 잠금 해제
```

`CategoriesService.update()`가 수정하는 `categories` row에는 별도의 선행 `SELECT ... FOR UPDATE`를 추가하지 않습니다. 해당 row는 직접 `UPDATE`되므로 PostgreSQL이 UPDATE 과정에서 필요한 row lock을 자동으로 획득합니다. 명시적인 선행 잠금은 먼저 읽고 JavaScript에서 수정한 후 전체 값을 다시 저장하는 `users.categoryChangeInfoArray`를 보호하기 위한 것입니다.

장기적으로 선택할 수 있는 방법은 다음과 같습니다.

1. 모든 JSONB read-modify-write 경로에서 동일한 row lock 규칙을 사용한다.
2. JavaScript에서 배열 전체를 교체하지 않고 PostgreSQL JSONB 연산으로 필요한 요소만 원자적으로 변경한다.
3. 배열 요소가 독립적으로 자주 변경된다면 별도 테이블로 정규화한다.

단순 스칼라 컬럼만 직접 UPDATE하는 경우 PostgreSQL의 UPDATE가 필요한 row lock을 자체적으로 획득하므로 보통 별도의 선행 `SELECT ... FOR UPDATE`가 필요하지 않습니다.

코드에서 이 문서가 필요한 위치를 바로 찾을 수 있도록 두 메서드의 locking select 위에 이 파일 경로를 주석으로 남겨 두었습니다.

---

## 6. 배열 전체를 직접 교체하는 경우

`UsersService.updateCategoryChangeInfoArray()`는 서버에서 기존 `categoryChangeInfoArray`를 먼저 조회하거나 수정하지 않습니다. 클라이언트가 보낸 완성된 배열을 단일 UPDATE로 교체합니다.

```typescript
await db
  .update(schema.users)
  .set({ categoryChangeInfoArray: dto.categoryChangeInfoArray })
  .where(eq(schema.users.userEmail, userEmail));
```

이 경우에는 read-modify-write 사이에 보호할 SELECT가 없으며, PostgreSQL UPDATE가 대상 row를 자동으로 잠급니다. 따라서 별도의 선행 `SELECT ... FOR UPDATE`는 필요하지 않습니다.

다만 클라이언트가 오래전에 읽은 배열 전체를 보내면 서버의 최신 배열을 덮어쓸 수 있습니다. 이것은 서버 내부의 동시 read-modify-write 문제가 아니라 stale client payload 문제입니다. 필요해지면 version 컬럼을 이용한 optimistic concurrency control, 변경 이벤트 단위 API, 또는 서버 측 병합 정책으로 해결해야 합니다.
