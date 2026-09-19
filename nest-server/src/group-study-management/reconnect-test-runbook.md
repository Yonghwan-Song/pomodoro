# Reconnect Test Runbook

Local network에서 mediasoup ICE restart를 테스트하기 위한 step-by-step 가이드.

피곤할 때 그대로 따라치면 됨. 위에서 아래로.

---

## 0. 사전 조건 (이미 코드에 적용된 변경)

이번 세션에서 적용된 변경 두 가지. 다음 테스트 시작 전 그대로인지만 확인.

### A. `mediasoup.module.ts` — env-var override 추가됨

`MEDIASOUP_ANNOUNCED_IPS` 환경변수가 있으면 자동 IP 감지를 무시하고 그 값만 announce.

### B. `mediasoup.service.ts` — TCP fallback 비활성화됨

`listenInfos`에서 TCP entry를 주석 처리, `enableTcp: false`도 함께 설정.

```ts
// listenInfos에서 TCP 제거 (이게 실질적 차단)
const listenInfos = this.announcedIps.flatMap((ip) => [
  { protocol: 'udp' as const, ip: '0.0.0.0', announcedAddress: ip }
  // { protocol: 'tcp' as const, ip: '0.0.0.0', announcedAddress: ip }
]);

// 옵션도 false로 (listenInfos가 우선이지만 의도 명확화 위해)
enableTcp: false,
```

> **중요**: mediasoup v3+에서 `listenInfos`를 명시하면 `enableTcp` 옵션은 무시됨. 그래서 listenInfos에서 TCP entry를 빼는 게 진짜 차단법.

> **배포 전 반드시 listenInfos의 TCP entry 주석 해제 + `enableTcp: true`로 되돌릴 것.**

---

## 1. 환경 점검 (30초)

phone과 laptop이 같은 Wi-Fi에 있고 AP isolation이 없는지 확인.

### 1-1. laptop IP 확인

```bash
ip -br addr show wlan0
```

이 runbook은 `10.20.105.210` 가정. 다르면 이후 단계의 IP를 모두 갈아끼우기.

### 1-2. ICMP ping 테스트

```bash
adb shell ping -c 3 10.20.105.210
```

**기대값**: 응답 옴. 100% loss면 AP isolation 의심.

### 1-3. UDP 도달성 테스트 (ICMP만 통과하고 UDP만 막는 정책 대비)

`nc`가 없으면 먼저 설치:
```bash
sudo pacman -S openbsd-netcat   # Arch
```

**터미널 A (laptop)** — UDP listener 띄우기:
```bash
nc -ul 9999
```

**터미널 B (laptop, 다른 창)** — phone에서 UDP 패킷 보내기:
```bash
adb shell "echo 'hello-from-phone' | toybox nc -u -w1 10.20.105.210 9999"
```

**기대값**: 터미널 A에 `hello-from-phone`이 찍힘.

찍히지 않으면:
- ICMP는 통과하는데 UDP만 차단되는 환경 → wlan0 path는 미디어 테스트에 부적합
- 다른 Wi-Fi 또는 USB tether 환경으로 이동, 그에 맞는 IP로 `MEDIASOUP_ANNOUNCED_IPS` 갈아끼우기

확인 끝나면 터미널 A의 `nc -ul 9999`는 Ctrl+C로 종료.

---

## 2. 서버 시작 (terminal 1)

```bash
cd ~/Repos/pomodoro-from-arch/nest-server
MEDIASOUP_ANNOUNCED_IPS=10.20.105.210 pnpm start:dev
```

**확인**: 시작 로그에 다음이 나와야 함.
```
MEDIASOUP_ANNOUNCED_IPS override active: [ '10.20.105.210' ]
```

이 줄이 없으면 env-var가 안 먹힌 것 — fish shell이면:
```fish
env MEDIASOUP_ANNOUNCED_IPS=10.20.105.210 pnpm start:dev
```

---

## 3. Vite (client) 시작 (terminal 2)

```bash
cd ~/Repos/pomodoro-from-arch/client
pnpm dev
```

---

## 4. adb reverse 설정 (terminal 3)

phone이 laptop의 3000/3001 포트에 닿게.

```bash
adb reverse tcp:3000 tcp:3000
adb reverse tcp:3001 tcp:3001
adb reverse --list   # 두 줄 보이면 OK
```

---

## 5. Phone에서 GroupStudy room 진입

phone 브라우저 → `http://localhost:3001` → 로그인 → GroupStudy room 입장 → 카메라/마이크 켜기.

다른 브라우저(laptop의 chrome)에서도 같은 room 진입 → phone 입장에서 receive할 다른 peer가 있어야 recv transport도 활성화됨.

---

## 6. UDP 포트 캡처 (terminal 4) — phone의 IP 부분에 실제 phone IP 넣기

```bash
sudo tcpdump -ni wlan0 "udp and host <PHONE_IP>" -c 30
```

`<PHONE_IP>`는 보통 `10.20.x.x` 대역. `arp -n | grep wlan0` 또는 phone Wi-Fi 설정에서 확인.

**해석 — 두 종류의 tuple이 보일 것**:

| 패턴 | 정체 |
|---|---|
| `phone:A → server:X` 가 대용량(1000B+)으로 흐르고 reverse는 소량 | **send transport** (server 포트 = `X`) |
| `server:Y → phone:B` 가 대용량(1000B+)으로 흐르고 reverse는 소량 | **recv transport** (server 포트 = `Y`) |

서버 포트 두 개(`X`, `Y`)를 메모.

---

## 7. iptables로 UDP 차단 (terminal 4 또는 5)

`<X>`, `<Y>`를 6단계에서 본 실제 포트로 치환.

```bash
# Send transport
sudo iptables -I INPUT  -i wlan0 -p udp -d 10.20.105.210 --dport <X> -j DROP
sudo iptables -I OUTPUT -o wlan0 -p udp -s 10.20.105.210 --sport <X> -j DROP

# Recv transport
sudo iptables -I INPUT  -i wlan0 -p udp -d 10.20.105.210 --dport <Y> -j DROP
sudo iptables -I OUTPUT -o wlan0 -p udp -s 10.20.105.210 --sport <Y> -j DROP
```

---

## 8. Drop이 작동하는지 검증 (즉시)

```bash
sudo iptables -L INPUT  -v -n | grep -E "<X>|<Y>"
sudo iptables -L OUTPUT -v -n | grep -E "<X>|<Y>"
```

**카운터(`pkts` 컬럼)가 양수로 즉시 올라가야 정상.** 0이면 매치 조건 실수 — IP/인터페이스/포트 다시 확인.

---

## 9. ICE restart 동작 관찰 (~30초)

다음 로그 시퀀스를 server/client 양쪽에서 찾기.

```
ice state: connected
  ↓ (consent freshness 실패, ~15-30초)
ice state: disconnected
  ↓
ice state: failed
  ↓ (커밋 a0d28944의 ICE restart 로직 발동)
restartIce 호출 → 새 ICE params 발급
  ↓
새 selected tuple
  ↓
ice state: connected (복구)
```

**확인 포인트**:
- `disconnected` 전이가 30초 안에 일어나는가
- ICE restart가 자동 호출되는가 (수동 액션 없이)
- 영상이 다시 흐르는가 (tcpdump에 새 포트로 1000B+ 패킷 재개)

---

## 10. 정리 (테스트 종료)

```bash
# iptables 규칙 전부 제거
sudo iptables -F INPUT
sudo iptables -F OUTPUT

# 서버/Vite 종료 (Ctrl+C)

# adb reverse 해제 (필수 아님, 다음 세션에 그대로 둬도 무방)
adb reverse --remove-all
```

---

## 11. 배포 전 코드 되돌리기 — 매우 중요

`mediasoup.service.ts`에서:

```ts
// before (test mode)
enableTcp: false,

// after (prod-ready)
enableTcp: true,
```

`HACK:` 코멘트도 함께 제거. grep으로 자가검사:

```bash
rg "HACK:" nest-server/src
```

결과가 비어야 배포 OK.

---

## Troubleshooting

### 서버 시작 로그에 `override active` 안 보임
- fish shell: `env VAR=value pnpm start:dev` 형태로
- bash/zsh: 위 명령 그대로 작동해야 함
- IDE 터미널이면 환경변수 상속 문제일 수 있음 — 외부 터미널에서 시도

### iptables 카운터가 0인데 영상이 끊기지도 않음
- 인터페이스 이름 확인: `ip -br link show` → wlan0 맞는지
- 서버 IP 재확인: `ip -br addr show wlan0` → 10.20.105.210 맞는지
- tcpdump를 다시 떠서 실제 selected tuple이 6단계 가정대로인지 검증

### iptables 카운터는 올라가는데 영상이 계속 흐름
- TCP fallback 의심 → `mediasoup.service.ts`의 `enableTcp: false` 적용됐는지 확인
- 다른 candidate IP 의심 → 서버 시작 로그 `override active` 배열이 한 개인지 확인
- IPv6 의심 (드뭄): `ip6tables`도 같이 차단 필요할 수 있음

### ICE state가 30초 넘게 connected에서 안 빠짐
- consent freshness 설정값 확인
- Socket.IO ping을 통해 시그널링이 살아있는지 확인 — 시그널링도 같이 죽으면 다른 시나리오

---

## 핵심 요약 한 장

```
[코드 변경 적용됨] → [server start with env] → [phone room 진입]
        ↓
[tcpdump로 server UDP 포트 두 개 캡처]
        ↓
[iptables 4줄로 둘 다 drop]
        ↓
[카운터 양수 확인]
        ↓
[~30초 대기, ICE restart 발동 관찰]
        ↓
[iptables -F, 코드 enableTcp: true로 되돌리기]
```

---

## Bash Script Cheat Sheet

아래 명령은 repo root(`/home/yhs/Repos/pomodoro-from-arch`)에서 실행한다고 가정한다.

### adb reverse 설정

phone 브라우저가 laptop의 Vite/Nest 포트에 접근할 수 있게 `adb reverse`를 등록한다.

```bash
bash_scripts/adb_reverse.sh
```

직접 실행하면 내부적으로 다음을 수행한다.

```bash
adb start-server
adb reverse tcp:3000 tcp:3000
adb reverse tcp:3001 tcp:3001
adb reverse --list
```

### signaling TCP 연결 끊기

phone과 laptop 사이의 `tcp:3000` signaling 연결을 끊는 테스트용 스크립트다. 실행하면 `adb reverse --remove tcp:3000` 후, 현재 `adb`가 사용 중인 loopback TCP port를 찾아 `tcpkill`을 실행한다.

```bash
bash_scripts/adb_disconnect_tcp.sh
```

`tcpkill`은 계속 떠 있으므로 테스트 중에는 그대로 두고, signaling을 복구할 때 `Ctrl+C`로 중단한다.

### signaling TCP 연결 복구

`adb_disconnect_tcp.sh`를 `Ctrl+C`로 멈춘 뒤 실행한다.

```bash
bash_scripts/adb_reconnect_tcp.sh
```

내부적으로 `adb start-server`, `adb reverse tcp:3000 tcp:3000`, `adb reverse --list`를 수행한다.

### UDP transport 차단: 포트를 수동으로 넣는 방식

`tcpdump`나 Nest 로그에서 send/recv transport의 server local port를 이미 알고 있을 때 사용한다.

```bash
sudo bash_scripts/transport_iptables.sh --send-port <SEND_PORT> --recv-port <RECV_PORT>
```

예시:

```bash
sudo bash_scripts/transport_iptables.sh --send-port 40335 --recv-port 59055
```

기본값은 `udp`, `wlan0`, `10.20.105.210`이다. 다른 인터페이스/IP를 쓰면 명시한다.

```bash
sudo bash_scripts/transport_iptables.sh \
  --iface wlan0 \
  --ip 10.20.105.210 \
  --send-port 40335 \
  --recv-port 59055
```

차단 해제는 같은 포트로 `-a -D`를 붙인다.

```bash
sudo bash_scripts/transport_iptables.sh --send-port 40335 --recv-port 59055 -a -D
```

실행 후 `INPUT`/`OUTPUT` counter를 자동 출력한다. 그 출력을 생략하려면:

```bash
sudo bash_scripts/transport_iptables.sh --send-port 40335 --recv-port 59055 --no-verify
```

### UDP transport 차단: Nest 로그에서 포트 자동 추출

Nest server를 시작할 때 stdout을 파일로 남긴다.

```bash
cd nest-server
MEDIASOUP_ANNOUNCED_IPS=10.20.105.210 pnpm start:dev 2>&1 | tee /tmp/pomodoro-nest.log
```

fish shell이면:

```fish
cd nest-server
env MEDIASOUP_ANNOUNCED_IPS=10.20.105.210 pnpm start:dev 2>&1 | tee /tmp/pomodoro-nest.log
```

로그의 `peer=...` 값으로 해당 peer의 가장 최근 `send`/`recv` `tuple=udp` local port를 자동 추출하고, 그대로 iptables 차단을 건다.

```bash
sudo bash_scripts/transport_iptables_from_nest_log.sh \
  --peer-id <PEER_ID> \
  --log-file /tmp/pomodoro-nest.log
```

먼저 어떤 port가 잡히는지만 확인하려면 `--print-only`를 쓴다. 이 경우 iptables는 건드리지 않는다.

```bash
bash_scripts/transport_iptables_from_nest_log.sh \
  --peer-id <PEER_ID> \
  --log-file /tmp/pomodoro-nest.log \
  --print-only
```

자동 추출 방식도 해제는 `-a -D`를 붙인다.

```bash
sudo bash_scripts/transport_iptables_from_nest_log.sh \
  --peer-id <PEER_ID> \
  --log-file /tmp/pomodoro-nest.log \
  -a -D
```

### iptables 전체 정리

테스트가 끝났고 실험용 rule을 전부 비워도 되는 상황이면:

```bash
sudo iptables -F INPUT
sudo iptables -F OUTPUT
```

다른 작업의 iptables rule이 섞여 있을 수 있으면 전체 flush 대신 위의 `-a -D` 방식으로 제거한다.


----

## Drop udp
```bash
sudo iptables -I OUTPUT -o lo -p udp --dport 38745 -j DROP
sudo iptables -I INPUT -i lo -p udp --sport 44344 -j DROP
```
