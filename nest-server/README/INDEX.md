# NestJS Server 문서 지식베이스 (Knowledge Base)

NestJS 백엔드 서버의 환경 설정, Docker 데이터베이스 운영, 스크립트 실행 방법에 대한 문서 저장소입니다.

---

## 📚 주요 문서 목록

1. **[01. Docker Compose & DB 운영 가이드](./01_docker_compose_guide.md)**
   - PostgreSQL 컨테이너 실행 및 중지 (`docker compose up -d`, `down`)
   - 컨테이너 상태/로그 확인 명령어
   - DBeaver / Beekeeper Studio GUI 데이터베이스 클라이언트 접속 가이드

2. **[02. 서버 실행 & 환경변수 가이드](./02_server_scripts_and_env.md)**
   - 개발 서버 실행 (`npm run start:dev`) 및 빌드
   - `.env` 파일주요 설정 항목 설명

3. **[PostgreSQL & Drizzle ORM 모듈 문서 Hub](../src/postgresql/README/INDEX.md)**
   - Drizzle Pool 관리, ConfigService 아키텍처, 스키마 매핑 가이드
