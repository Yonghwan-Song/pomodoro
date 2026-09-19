# 언제 scale, precision쓰고 언제 안써도 되는지

결론부터 말씀드리면:

1. **현재 프로젝트에서는 `scale, precision` 없이 가도 100% 문제없습니다.**
2. 다만 Drizzle/TypeScript 특성상 `numeric()`보다 **`doublePrecision()`이 훨씬 다루기 편할 수 있습니다** (이유 아래 설명).

도대체 **언제 `(precision, scale)`을 쓰고, 언제 안 써도 되는지** 명확한 기준을 정리해 드립니다.

---

### 1. `precision, scale`을 반드시 걸어야 하는 경우 (강제성 필요)

| 상황                                | 예시                                 | 이유                                                                                                    |
| :---------------------------------- | :----------------------------------- | :------------------------------------------------------------------------------------------------------ |
| **돈 / 금융 / 결제 / 회계**         | 달러/센트 (`numeric(12, 2)`), 포인트 | `0.01`원의 오차도 법적/회계적 문제가 됨. DB 레벨에서 소수점 2자리 초과를 물리적으로 잘라내야 함.        |
| **다중 클라이언트 / 외부 API 연동** | 결제 PG사 연동, 공공 데이터 수집     | 프론트엔드 외에 여러 외부 시스템이 DB로 직접 데이터를 쏠 때, DB가 최후의 방어선으로 규격을 강제해야 함. |
| **정밀 계측 / 센서 데이터**         | 정밀도 0.001mm 고정 계측기           | 장비 스펙상 그 이하 자릿수는 '노이즈'이므로 DB 저장 시 잘라내야 함.                                     |

---

### 2. `precision, scale`을 안 걸어도 되는 경우 (유연성 필요)

- **생산성 지표, 진행률, 통계, 점수, 비율(`ratio`)**
- 소수점이 2자리든 3자리든 시스템이 터지지 않고, 값이 조금 더 정밀하게 들어와도 서비스에 아무 지장이 없는 경우.
- **현재 뽀모도로 앱의 `ratio`와 `adherenceRate`가 정확히 여기에 해당합니다.**

---

### 3. 실무 관점에서의 핵심: `numeric()` vs `doublePrecision()`

여기서 한 가지 꼭 고려해야 할 TypeScript/Drizzle 실무 포인트가 있습니다.

#### ① `numeric()`을 쓸 때:

- PostgreSQL의 `NUMERIC`은 자릿수가 무한할 수 있어서, **Drizzle/JS 드라이버는 이를 `string`으로 반환**합니다.
- 즉, DB에서 읽어왔을 때 `record.ratio`의 타입이 `number`가 아니라 **`string` (`"0.85"`)**이 됩니다.
- 프론트엔드나 서버 코드에서 매번 `Number(record.ratio)`로 변환해야 하는 번거로움이 생깁니다.

#### ② `doublePrecision()`을 쓸 때:

- PostgreSQL의 8바이트 부동소수점(`DOUBLE PRECISION`) 타입입니다.
- **Drizzle/JS 드라이버에서 곧바로 TypeScript `number` 타입(`0.85`)으로 매핑**됩니다.
- 자릿수 제약도 없고, JS `number`와 1:1로 일치하므로 타입 변환 코드가 전혀 필요 없습니다.

---

### 최종 결론 및 추천

- **소수점 제약(`precision, scale`)은 걸 필요가 없습니다.**
- TypeScript와 프론트엔드에서 `number` 타입으로 편하게 쓰시려면 **`doublePrecision()`**을 쓰는 것이 가장 깔끔합니다.

```typescript
export const cycleRecords = pgTable('cycle_records', {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  cycleSettingId: uuid('cycle_setting_id')
    .notNull()
    .references(() => cycleSettings.id, { onDelete: 'cascade' }),

  // scale/precision 제약 없이 JS number로 깔끔하게 매핑됨
  ratio: doublePrecision().notNull(),
  cycleAdherenceRate: doublePrecision('cycle_adherence_rate').notNull(),

  start: timestamp().notNull(),
  end: timestamp().notNull(),
  date: timestamp().defaultNow().notNull(),
});
```
