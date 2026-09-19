# 02. 서버 실행 & 환경변수 가이드

`nest-server` 프로젝트 실행 스크립트와 `.env` 주요 환경변수에 대한 가이드입니다.

---

## 1. 서버 실행 스크립트

```fish
# 1. 의존성 설치
npm install

# 2. 개발 모드 실행 (Hot-Reload)
npm run start:dev

# 3. 프로덕션 빌드
npm run build

# 4. 프로덕션 모드 실행
npm run start:prod

# 5. 단위 테스트 실행
npm run test
```

---

## 2. `.env` 주요 환경변수 항목

```properties
# PostgreSQL 연결 URL (Drizzle ORM & Docker 매핑)
DOCKER_POSTGRESQL_URL=postgresql://postgres:3905@127.0.0.1:5432/nosql_to_sql

# MongoDB 마이그레이션 원본 URL
MONGODB_URL='mongodb+srv://...'

# 프론트엔드 연결 URL
FRONTEND_URL="http://localhost:3001"
```
