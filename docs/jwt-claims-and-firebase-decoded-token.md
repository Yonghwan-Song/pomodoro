# JWT Claims & Firebase DecodedIdToken

## JWT란?

JWT(JSON Web Token)는 세 파트로 구성된다.

1. **Header** - 토큰 타입, 서명 알고리즘
2. **Payload** - 실제 데이터 (JSON 객체)
3. **Signature** - 위변조 검증용 서명

## Claim이란?

Payload 파트의 JSON 객체 안에 있는 **각 key-value 쌍 하나하나**를 claim이라고 부른다.

"이 토큰의 주인은 이런 속성을 **주장(claim)한다**"는 의미에서 유래한 단어.

```json
{
  "uid": "abc123",
  "email": "user@gmail.com",
  "name": "홍길동",
  "exp": 1708000000,
  "admin": true
}
```

위 예시에서 `uid`, `email`, `name`, `exp`, `admin` 각각이 전부 claim이다.

## Claim의 두 종류

### Standard Claims

JWT 스펙에서 표준으로 정해진 것들.

| claim | 의미 |
|-------|------|
| `exp` | 만료 시간 |
| `iat` | 발급 시간 |
| `iss` | 발급자 |
| `sub` | 주체 (subject) |

Firebase `DecodedIdToken`에 명시적으로 타입 선언된 `uid`, `email`, `picture` 등이 여기 해당한다.

### Custom Claims

개발자나 OAuth provider가 임의로 추가한 것들.

- Firebase의 `setCustomUserClaims()`로 직접 추가하는 것: `admin: true`, `role: "editor"` 등
- Google 로그인 시 Google이 자동으로 넣어주는 것: `name`, `locale` 등

## Firebase DecodedIdToken의 index signature

`firebase-admin`의 `DecodedIdToken` 인터페이스 (token-verifier.d.ts):

```ts
export interface DecodedIdToken {
  uid: string;
  email?: string;
  picture?: string;
  // ... 기타 standard claims
  [key: string]: any; // <- 이것
}
```

### 왜 `[key: string]: any`를 붙였나?

Custom claims는 앱마다, 사람마다 다르기 때문에 Firebase가 타입으로 미리 선언할 수 없다.
Google, GitHub, Apple 등 OAuth provider가 각자 추가로 넣어주는 claims도 provider마다 달라서 전부 명시 불가능하다.

그래서 **"우리가 보장하는 표준 필드는 명시적으로 선언하고, 나머지는 네가 알아서 써라"** 는 의미로 index signature를 붙인 것.

### 단점

타입 안전성이 사라진다. `decoded.아무거나`를 써도 TypeScript가 에러를 내지 않는다.

```ts
decoded.name       // Google이 넣어준 nickname. 런타임엔 값 있음. 타입 에러 없음.
decoded.asdfasdf   // 없는 필드. 런타임엔 undefined. 그래도 타입 에러 없음.
```

그래서 명시되지 않은 필드를 쓸 때는 런타임에 실제로 값이 있는지 직접 확인하거나 optional chaining을 쓰는 것이 안전하다.

```ts
socket.data.userNickname = decoded.name ?? null;
```
