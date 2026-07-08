# 하나의 server port가 여러 socket을 가지는 원리

이 문서는 다음을 설명한다.

1. Nest server는 port 3000 하나만 listen하는데, 어떻게 여러 client의 connection을 동시에 가질 수 있는가
2. Client (브라우저, adb daemon 등)의 port 할당 방식과 어떻게 다른가
3. 그 위에서 우리가 실제로 사용한 `ss -K` 명령어가 5-tuple로 어떻게 특정 connection만 골라 죽이는가

## 출발점: 무엇이 헷갈리는가

Server를 시작할 때 `app.listen(3000)`을 호출하면 Nest는 port 3000을 점유한다. "Port 3000은 점유됐으니 다른 process는 못 쓴다"는 것은 다 알고 있다.

그런데 client는 여러 명이 동시에 server에 접속할 수 있다. 만약 "한 port = 한 connection"이라면 동시에 두 명 이상은 불가능해야 한다. 실제로는 두 명, 백 명, 만 명이 동시에 접속해도 server는 모두를 동시에 처리한다. **port 3000 하나로 어떻게?**

답은: **TCP connection은 port 하나가 아니라 5-tuple로 식별된다**.

## 5-tuple 정의

OS kernel이 하나의 TCP connection을 다른 connection과 구분하기 위해 사용하는 5개의 값.

```
┌──────────────────────────────────────────────┐
│  1. Protocol         (TCP / UDP / SCTP)      │
│  2. Source IP        (보내는 쪽 IP)          │
│  3. Source Port      (보내는 쪽 port)        │
│  4. Destination IP   (받는 쪽 IP)            │
│  5. Destination Port (받는 쪽 port)          │
└──────────────────────────────────────────────┘
```

이 5개 값의 조합이 서로 다르면 kernel은 **다른 connection으로 취급**한다. 같은 destination IP:port (= 같은 server)에 접속하더라도 source IP나 source port가 다르면 별개의 socket이 된다.

## Server 측의 두 종류 socket

이게 가장 헷갈리는 부분인데, server에는 **서로 다른 종류의 socket이 동시에 존재**한다.

### 1) Listening socket

`app.listen(3000)`이 만드는 socket. 단 1개만 존재.

| Field | 값 |
|-------|-----|
| Local | `0.0.0.0:3000` (또는 `127.0.0.1:3000`) |
| Peer | 없음 (`*:*`) |
| State | `LISTEN` |
| 역할 | 새로운 client 연결 요청을 받는 입구 |

이 socket은 데이터를 주고받는 게 아니라, **새 connection 요청 (TCP SYN)을 받아서 새 socket을 만들어내는** 역할만 한다.

`ss -tnl | grep 3000`로 보면 이게 보인다.

### 2) Accepted socket (= established socket)

각 client가 접속할 때마다 listening socket이 `accept()`되어 **새로 생성**되는 socket. Connection 수만큼 N개 존재.

| Field | 값 (예시) |
|-------|-----|
| Local | `127.0.0.1:3000` |
| Peer | `127.0.0.1:34067` |
| State | `ESTAB` |
| 역할 | 그 client와 실제 데이터를 주고받음 |

각 accepted socket의 5-tuple은 **모두 다르다**. Local 쪽 (server 쪽)은 모두 `127.0.0.1:3000`로 같지만, peer 쪽이 client마다 다르기 때문이다.

`ss -tn | grep 3000`로 보면 listening 외의 connection들이 보인다.

## Kernel은 들어오는 packet을 어떻게 dispatch하는가

Client에서 server로 packet이 도착하면 kernel은 다음 순서로 처리한다.

```
incoming packet (TCP segment) 도착
        │
        ▼
packet의 5-tuple 추출:
  protocol=tcp
  src=<client IP>:<client port>
  dst=<server IP>:<server port>
        │
        ▼
established socket table 조회:
  이 5-tuple과 정확히 일치하는 ESTAB socket 있나?
        │
   ┌────┴────┐
  YES        NO
   │          │
   ▼          ▼
해당          listening socket 조회:
ESTAB        dst=<server IP>:<server port> + LISTEN인 것 있나?
socket으로     │
deliver       └─ YES  → SYN이면 새 ESTAB socket 만들고 3-way handshake
              │
              └─ NO   → RST 응답 ("그런 port 안 열림")
```

### 핵심 포인트

- **Established socket 조회가 listening socket 조회보다 먼저** 일어난다. 그래서 같은 dst:3000으로 와도 이미 ESTAB된 connection이면 listening socket을 거치지 않고 바로 해당 ESTAB socket으로 간다.
- ESTAB socket 매칭은 **5-tuple 전체가 정확히 일치**해야 함. Source port 한 자리만 달라도 다른 socket으로 dispatch.

## Client 측의 port 할당 방식

Client (브라우저, adb daemon 등)가 server에 connect할 때:

1. OS에게 "127.0.0.1:3000으로 TCP connection 만들어줘"라고 요청 (`connect()` syscall)
2. OS는 client의 source port를 **자동으로 할당** — Linux 기준 ephemeral port range `32768 ~ 60999` 중 사용 가능한 하나를 골라줌
3. 같은 client process가 같은 server에 또 접속하면 또 다른 source port가 할당됨

확인:
```bash
cat /proc/sys/net/ipv4/ip_local_port_range
# 32768	60999
```

그래서 우리가 본 실제 출력:

```
ESTAB ... 127.0.0.1:34067  →  127.0.0.1:3000   (adb)
ESTAB ... 127.0.0.1:39616  →  127.0.0.1:3000   (firefox)
```

`adb`와 `firefox`는 **서로 다른 process**이고, 각자 따로 `connect()`를 호출했으니 OS가 ephemeral range에서 다른 port를 할당해줬다 — `34067`과 `39616`. 그래서 양쪽이 같은 server에 붙어있어도 5-tuple이 달라서 kernel이 구분 가능.

만약 같은 firefox가 server에 두 개 socket을 만들면? 그것도 또 다른 ephemeral port (예: `45123`)가 할당돼서 역시 충돌 없음.

### Client 측 한계

같은 client에서 **같은 dst IP:port**로 동시에 만들 수 있는 connection 수는 ephemeral range 크기 (~28k)로 제한됨. 다 쓰면 `EADDRNOTAVAIL` 에러. 이게 일반 use case에서 문제되는 일은 거의 없지만, NAT 환경이나 connection pooling 안 한 client에서 가끔 발생.

## Server 측의 port "재사용" 방식 — client와의 결정적 차이

Client는 **매번 다른 source port를 받음** → port가 자동으로 식별자 역할.

Server는 **모든 connection의 local port가 3000으로 동일** → port만으론 식별 불가.

그럼 server는 어떻게 구분?

→ **5-tuple의 나머지 component (peer IP, peer port)로 구분**한다.

```
[Server 입장에서 본 동일한 connection들]

connection A: local=127.0.0.1:3000  peer=127.0.0.1:34067  (adb)
connection B: local=127.0.0.1:3000  peer=127.0.0.1:39616  (firefox)
connection C: local=127.0.0.1:3000  peer=127.0.0.1:45123  (다른 firefox 탭)
```

Local 쪽 IP/port는 다 같지만 peer 쪽이 다 달라서 **5-tuple로는 모두 unique**. Kernel은 packet을 받을 때 packet의 src/dst를 swap해서 본 5-tuple로 lookup하므로, 정확히 어느 connection으로 보내야 할지 결정 가능.

### 즉

| 측 | 식별자 역할을 하는 것 |
|----|----------------------|
| Client | source port (OS가 자동 할당하는 ephemeral port) |
| Server | peer IP + peer port (각 client마다 다름) |

양쪽 다 결국 **5-tuple 전체로 식별**하지만, 어느 component가 "다양한 값을 가지는지"가 다르다.

## 실제 우리 환경에서 확인

실제로 본 출력 (간략화):

```
$ ss -tnp | grep ':3000'
ESTAB 127.0.0.1:34067   127.0.0.1:3000    users:(("adb",     pid=8100,fd=17))
ESTAB 127.0.0.1:39616   127.0.0.1:3000    users:(("firefox", pid=11465,fd=198))
ESTAB 127.0.0.1:3000    127.0.0.1:34067   users:(("node",    pid=9512, fd=41))
ESTAB 127.0.0.1:3000    127.0.0.1:39616   users:(("node",    pid=9512, fd=40))
```

총 4줄이지만 **실제 connection은 2개**다. 각 connection은 양쪽 끝이 따로 socket을 가지므로 ss에 두 줄로 보인다.

| 줄 | Process | Local | Peer | 의미 |
|----|---------|-------|------|------|
| 1 | adb | `127.0.0.1:34067` | `127.0.0.1:3000` | Connection A의 client 측 |
| 3 | node (Nest) | `127.0.0.1:3000` | `127.0.0.1:34067` | Connection A의 server 측 |
| 2 | firefox | `127.0.0.1:39616` | `127.0.0.1:3000` | Connection B의 client 측 |
| 4 | node (Nest) | `127.0.0.1:3000` | `127.0.0.1:39616` | Connection B의 server 측 |

Server (node)의 두 socket은 local=`127.0.0.1:3000`로 같지만 peer가 다름 — 5-tuple이 다르므로 별개 socket. 각각 다른 file descriptor (`fd=41`, `fd=40`)로 관리됨.

## `ss -K`의 5-tuple filter

이 원리를 직접 활용한 게 우리가 쓴 `ss -K` 명령어.

```bash
sudo ss -K  src 127.0.0.1  sport = 34067  dst 127.0.0.1  dport = 3000
              ^^^^^^^^^^^   ^^^^^^^^^^^^   ^^^^^^^^^^^   ^^^^^^^^^^^^
              src IP        src port       dst IP         dst port
```

각 인자가 5-tuple의 한 component를 지정.

| Filter token | 5-tuple field | 값 | 의미 |
|--------------|---------------|----|------|
| `(default)` | Protocol | tcp | ss의 default가 tcp |
| `src 127.0.0.1` | Source IP | 127.0.0.1 | 보내는 쪽 IP가 loopback |
| `sport = 34067` | Source Port | 34067 | 보내는 쪽 port가 34067 |
| `dst 127.0.0.1` | Destination IP | 127.0.0.1 | 받는 쪽 IP가 loopback |
| `dport = 3000` | Destination Port | 3000 | 받는 쪽 port가 3000 |

이 5개 component가 모두 일치하는 socket만 매칭 → kernel에 destroy 요청.

### 왜 firefox는 안 죽었나

위 filter는 source port가 정확히 **34067**인 socket만 매칭한다. Firefox의 socket은 source port가 **39616**이므로 매칭에서 제외됨 — 다른 5-tuple이기 때문.

이게 5-tuple isolation의 실증. 같은 dst port 3000을 공유하는 두 connection이 있어도, source port 한 자리만 달라도 명령어는 정확히 한쪽만 골라 작동한다.

### 만약 더 wide한 filter였다면

```bash
sudo ss -K dst 127.0.0.1 dport = 3000
```

이렇게 했으면 src 관련 filter가 없으므로 dst가 일치하는 모든 socket이 매칭됨. 즉 adb, firefox, node 측 socket들 다 — laptop의 다른 process까지 다 끊어버림. 이게 이전 대화에서 위험하다고 한 이유.

### `--remove`와의 차이

`adb reverse --remove tcp:3000`은 **listening socket** (phone 쪽의 reverse forwarding 진입점)을 제거하는 것. 이미 establish된 socket은 영향 없음.

`ss -K`는 **established socket**을 destroy하는 것. listening socket은 안 건드림.

두 명령은 socket의 다른 종류를 대상으로 하므로 **상호 보완적**이다 — 새 연결 차단(`--remove`)과 기존 연결 종료(`ss -K`)를 같이 해야 깨끗한 disconnect.

## 정리

1. **Server의 port 1개로 여러 connection을 가질 수 있는 이유**: TCP connection은 port가 아니라 5-tuple로 식별된다. Server 쪽 local은 모두 같지만 peer 쪽이 다름.

2. **Client 측은 OS가 자동으로 source port를 할당** (ephemeral range)하므로 여러 connection이 자연스럽게 unique한 5-tuple을 가짐.

3. **Server 측은 단일 listening socket이 새 client마다 accepted socket을 새로 만든다.** 새 socket은 local 쪽이 같아도 peer 쪽이 달라 5-tuple이 unique.

4. **`ss -K`는 5-tuple filter를 받아 정확히 매칭되는 socket만 destroy**한다. 인자 하나만 빼도 wide하게 매칭될 수 있으니 주의.

5. **Listening socket vs accepted socket의 구분**은 disconnect 시나리오에서 중요. 두 종류를 다른 도구로 다뤄야 깨끗한 단절이 가능.
