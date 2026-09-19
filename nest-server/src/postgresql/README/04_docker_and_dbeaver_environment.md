# 04. Docker & DBeaver 개발 환경 구축

## 1. PostgreSQL Docker Compose 설정 (`docker-compose.yml`)

`nest-server/.env` 파일의 `DOCKER_POSTGRESQL_URL` 설정값과 100% 매핑되도록 작성된 [docker-compose.yml](file:///home/yhs/repos/pomodoro/nest-server/docker-compose.yml) 구성을 설명합니다.

### `.env` 설정값
```properties
DOCKER_POSTGRESQL_URL=postgresql://postgres:3905@127.0.0.1:5432/nosql_to_sql
```

### `docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: pomodoro-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: "3905"
      POSTGRES_DB: nosql_to_sql
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 주요 실행 명령어
```fish
# 백그라운드에서 PostgreSQL 시작
docker compose up -d

# 상태 및 로그 확인
docker ps
docker compose logs -f postgres

# 컨테이너 종료
docker compose down
```

---

## 2. GUI DB 클라이언트 (DBeaver / Beekeeper Studio) 접속 설정

* **Connection Type:** `PostgreSQL`
* **Host / Address:** `localhost` (또는 `127.0.0.1`)
* **Port:** `5432`
* **User:** `postgres`
* **Password:** `3905`
* **Database:** `nosql_to_sql`
* **SSL:** `Disable` (체크 해제)

---

## 3. 우분투 (Ubuntu) & Fish Shell 트러블슈팅 기록

### 이슈 1: Apt sources 등록 시 줄바꿈 에러 (`Malformed entry ...`)
- **원인:** 터미널에서 multiline `echo` 및 파이프(`|`) 사용 시 `docker.list` 파일 내부에 줄바꿈(엔터)이 삽입되어 `signed-by=` 및 URL이 훼손됨.
- **해결:** 줄바꿈 없는 1줄 `printf` 또는 단일 문자열로 `sources.list.d/docker.list` 파일을 작성하여 해결.

### 이슈 2: `permission denied while trying to connect to the docker API`
- **원인:** `usermod -aG docker $USER` 실행 후 현재 터미널 세션에 그룹 권한이 즉시 세션 갱신되지 않음.
- **해결:** `newgrp docker` 명령어를 실행하여 현재 터미널의 사용자 그룹 권한을 즉시 새로고침.

### 이슈 3: DBeaver `.deb` 패키지 설치 시 `N: Download is performed unsandboxed as root`
- **원인:** `apt` 패키지 관리자의 샌드박스 파티션 계정(`_apt`)이 개인 사용자 홈 디렉터리(`/home/yhs/Downloads/`) 접근 권한이 없어 root 권한으로 폴백 실행된 알림(Notice) 메시지.
- **해결:** 에러가 아닌 정상 알림이므로 무시해도 되며, 설치는 100% 성공 처리됨.
