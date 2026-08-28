# 01. Docker Compose & PostgreSQL 운영 가이드

본 문서는 `nest-server`에서 PostgreSQL 데이터베이스 컨테이너를 **Docker Compose**로 운용하는 방법과 GUI 클라이언트 접속 방법을 정리한 문서입니다.

---

## 1. Docker Compose 구성 정보

`nest-server/docker-compose.yml` 파일은 `.env`의 `DOCKER_POSTGRESQL_URL` 설정과 100% 일치하도록 구성되어 있습니다.

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

---

## 2. 필수 명령어 모음

### ① 컨테이너 백그라운드 시작
```fish
# nest-server 디렉터리에서 실행
docker compose up -d
```

### ② 실행 상태 확인
```fish
docker ps
# 또는
docker compose ps
```

### ③ DB 실시간 로그 확인
```fish
docker compose logs -f postgres
```

### ④ 컨테이너 중지
```fish
docker compose down
```

### ⑤ DB 볼륨까지 완전히 삭제하고 초기화할 때 (주의: 데이터 삭제됨)
```fish
docker compose down -v
```

---

## 3. GUI DB 클라이언트 (DBeaver / Beekeeper Studio) 접속 정보

PostgreSQL 컨테이너가 띄워지면 DBeaver나 Beekeeper Studio에서 아래 정보로 데이터베이스에 직접 접속할 수 있습니다.

* **Connection Type:** `PostgreSQL`
* **Host / Address:** `localhost` (또는 `127.0.0.1`)
* **Port:** `5432`
* **User / Username:** `postgres`
* **Password:** `3905`
* **Database:** `nosql_to_sql`
* **SSL:** `Disable` (체크 해제 / 사용 안 함)

---

## 4. 터미널(CLI) psql 직접 접속 방법

```fish
docker exec -it pomodoro-postgres psql -U postgres -d nosql_to_sql
```
