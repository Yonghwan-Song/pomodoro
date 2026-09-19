# 오프라인 배치 동기화(`batchUpdate`) 및 세션 이력 동기화 가이드

이 문서는 `CategoriesModule`에서 오프라인 복구 시 호출되는 `batchUpdate` 엔드포인트의 역할, `users.categoryChangeInfoArray` 세션 이력 동기화, 그리고 카테고리 삭제 시 뽀모도로 외래키 `ON DELETE SET NULL` 동작 원리를 정리한 문서입니다.

---

## 1. `PATCH /categories/batch` (`batchUpdate`)의 핵심 역할

### 📌 왜 존재하는가? (Offline Request Coalescing & Replay)
프론트엔드의 `errorController.ts`는 네트워크 단절(오프라인) 상태에서 발생한 여러 카테고리 수정 요청들을 IndexedDB에 저장할 때, 개별 요청을 중복 저장하지 않고 **`PATCH /categories/batch` (`{ categories: [...] }`) 형태로 1개의 배치 요청으로 병합(Coalesce)**합니다.

### 📌 온라인 복구 흐름
1. 네트워크가 다시 연결(`online` 이벤트)되면 `errorController.resendFailedReqs()`가 실행됩니다.
2. 병합된 `PATCH /categories/batch` 1방으로 서버에 전송되어 오프라인 동안 일어난 모든 카테고리 변경 사항을 원자적으로 동기화합니다.
3. 백엔드 `batchUpdate` 메소드는 DTO 배열을 순회하며 `this.update`를 호출해 PostgreSQL과 Mongoose를 일괄 갱신합니다.

---

## 2. 카테고리 변경 시 세션 이력 동기화 (Dual-Sync)

카테고리의 `name`이나 `color`가 수정될 때:
- 단순히 `categories` 테이블만 수정하면 현재 진행 중인 세션 기록의 색상/라벨과 불일치가 발생합니다.
- 따라서 **`users.categoryChangeInfoArray` (JSONB)** 배열을 조회하여 동일한 카테고리명을 가진 세션 항목들의 `color`와 `categoryName`을 함께 동기화하여 UPDATE합니다.

```typescript
if ('color' in data || 'name' in data) {
  const updatedCategoryArray = (pgUser.categoryChangeInfoArray ?? []).map((info) => {
    const cloned = { ...info };
    if (cloned.categoryName === name) {
      if ('color' in data && data.color) cloned.color = data.color;
      if ('name' in data && data.name) cloned.categoryName = data.name;
    }
    return cloned;
  });

  await this.db
    .update(schema.users)
    .set({ categoryChangeInfoArray: updatedCategoryArray })
    .where(eq(schema.users.id, pgUser.id));
}
```

---

## 3. 카테고리 삭제 시 과거 기록 보존 (`ON DELETE SET NULL`)

- **과거 뽀모도로 기록과의 관계**:
  - 카테고리를 삭제한다고 해서 사용자가 과거에 집중한 뽀모도로 기록까지 삭제되면 안 됩니다.
  - PostgreSQL의 `pomodoros.categoryId`는 `references(() => categories.id, { onDelete: 'set null' })`로 선언되어 있습니다.
  - 따라서 카테고리를 `DELETE`하면 DB 엔진이 연관된 모든 과거 뽀모도로의 `categoryId`를 자동으로 `NULL`로 안전하게 변경합니다.
