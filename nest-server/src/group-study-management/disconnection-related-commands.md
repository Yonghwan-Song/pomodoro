# Prev
```bash
pomodoro-from-arch/nest-server on  feature/integrate-webrtc [$!?] via  v20.20.2
❯ adb start-server
  adb reverse tcp:3001 tcp:3001
  adb reverse tcp:3000 tcp:3000
3001
3000

pomodoro-from-arch/nest-server on  feature/integrate-webrtc [$!?] via  v20.20.2
❯ adb reverse --remove tcp:3000

pomodoro-from-arch/nest-server on  feature/integrate-webrtc [$!?] via  v20.20.2
❯ ss -tnp | grep ':3000'
ESTAB      0      0               127.0.0.1:41161          127.0.0.1:3000  users:(("adb",pid=22774,fd=15))
ESTAB      0      0               127.0.0.1:48508          127.0.0.1:3000  users:(("firefox",pid=21111,fd=211))
ESTAB      0      0      [::ffff:127.0.0.1]:3000  [::ffff:127.0.0.1]:41161 users:(("node",pid=58400,fd=40))
ESTAB      0      0      [::ffff:127.0.0.1]:3000  [::ffff:127.0.0.1]:48508 users:(("node",pid=58400,fd=42))


…ro-from-arch/nest-server on  feature/integrate-webrtc [$!?] via  v20.20.2 took 58s
❯ sudo ss -K src 127.0.0.1 sport = 41161 dst 127.0.0.1 dport = 3000

[sudo] password for yhs:
RTNETLINK answers: Invalid argument
Netid   State    Recv-Q    Send-Q       Local Address:Port        Peer Address:Port
tcp     ESTAB    0         0                127.0.0.1:41161          127.0.0.1:hbci
```

# New

### 1. `tcpkill` (Surgical Socket Kill)
`ss -K`가 커널 설정이나 문법 문제로 실패할 때 가장 확실한 대안입니다. 3000번 포트 전체를 건드리지 않고, `ss -tnp`로 확인한 **고유 포트(ephemeral port)**만 조준해서 죽입니다.

*   **원리:** 대상 포트로 RST(Reset) 패킷을 보내 연결을 강제 종료.
*   **장점:** 특정 소켓만 끊고 프로세스(Firefox, Node)는 살려둘 수 있음.

```bash
# ss -tnp로 확인한 ADB 쪽 고유 포트가 41161일 경우
sudo tcpkill -i lo port 41161
```
*   **작동 방식 (중요):**
    *   **상주형 저격수:** 실행 즉시 종료되지 않고, 해당 포트로 패킷이 흐를 때마다 계속해서 `RST` 패킷을 던집니다. (로그의 `R` 표시가 Reset 패킷 전송 의미)
    *   **수동 종료 필요:** 소켓이 끊긴 것을 확인(서버 로그 등)했다면 반드시 **`Ctrl + C`**를 눌러 종료해야 합니다. 종료하지 않으면 해당 포트를 통한 재연결이나 통신이 계속 차단됩니다.
*   **주의:** `tcpkill`은 패킷이 오갈 때 반응하므로, 소켓이 완전히 놀고 있다면 아무 일도 안 일어날 수 있습니다.

### 2. `gdb`를 이용한 소켓 클로즈 (Ninja Mode) <--- made an error, so I just used tcpkill>
네트워크 패킷이 흐르지 않아 `tcpkill`이 안 먹힐 때, 프로세스 내부로 들어가 해당 소켓(파일 디스크립터)만 닫아버리는 가장 강력한 방법입니다.

*   **확인:** `ss -tnp` 결과에서 `node` 프로세스의 PID와 `fd` 번호를 확인합니다.
    *   예: `users:(("node",pid=58400,fd=40))` -> PID=58400, FD=40

```bash
# gdb로 프로세스에 붙어서 특정 파일 디스크립터만 close 실행
sudo gdb -p 58400 -batch -ex 'p close(40)'
```
*결과: 서버(Node) 입장에서는 즉시 'transport close' 이벤트가 발생하며, 다른 브라우저 연결이나 서버 프로세스에는 영향을 주지 않습니다.*

### Tip: 왜 `adb reverse --remove`로는 안 되나요?
`adb reverse --remove`는 새로운 연결 통로를 없애는 것이지, **이미 생성되어 통신 중인 Established 소켓을 끊어주지는 않기 때문**입니다. 위 방법들을 써야 실제 "연결 끊김" 상황을 재현할 수 있습니다.

## tcp
