# ICE 기초 원리와 ufrag, pwd의 존재 이유

WebRTC를 처음 접할 때 가장 낯설고 납득하기 어려운 부분이 바로 ICE와 뜬금없이 등장하는 `ufrag`(username fragment), `pwd`(password)입니다.
"그냥 IP랑 포트 알아내서 데이터 보내면 되는 거 아냐? 왜 굳이 아이디랑 비밀번호를 또 만들어?"라는 의문을 해소하기 위한 배경입니다.

### 1단계: ICE 전반적인 원리 (길 찾기)

WebRTC는 기본적으로 **Peer-to-Peer(P2P)** 통신입니다. 중간에 서버를 안 거치고 클라이언트와 클라이언트(혹은 클라이언트와 미디어 서버)가 직접 데이터를 주고받아야 가장 빠르니까요.

문제는 우리 컴퓨터들이 대부분 **공유기(NAT)나 방화벽** 뒤에 숨어 있다는 것입니다. 그래서 상대방이 나에게 데이터를 보내고 싶어도, 내 진짜 위치(공인 IP와 포트)를 모릅니다.

그래서 **ICE(Interactive Connectivity Establishment)** 라는 프레임워크가 등장합니다. ICE의 임무는 다음과 같습니다.
1. **Candidate(후보) 수집:** STUN 서버(우체국)에 물어봐서 내 공인 IP/포트를 알아내고, 안 되면 TURN 서버(중계소) 통로까지 확보하여 내가 통신할 수 있는 "모든 가능한 경로(Candidate)"를 긁어모읍니다.
2. **시그널링 (Signaling):** 이렇게 찾은 내 경로들을 SDP(Session Description Protocol)에 담아서 시그널링 서버를 통해 상대방에게 전달합니다.
3. **Connectivity Check (연결 확인):** 상대방의 경로들을 받았다고 다짜고짜 영상 데이터를 쏘지 않습니다. "이 길이 진짜 뚫려있나?" 확인하기 위해 서로 STUN 패킷을 던져봅니다. 뚫려 있고 가장 빠른 경로가 확인되면, 그제야 진짜 데이터를 보냅니다.

### 2단계: ufrag와 pwd는 대체 왜 필요할까? (가장 중요한 부분)

이제 핵심입니다. 방금 3번에서 **"서로 STUN 패킷을 던져본다(Connectivity Check)"**고 했죠? 

인터넷이라는 공간은 온갖 쓰레기 데이터, 악의적인 해커, 엉뚱한 패킷이 돌아다니는 위험한 도로입니다. 내 컴퓨터(또는 서버)가 5000번 포트를 열어두고 상대방의 "연결 확인(STUN)" 패킷을 기다리고 있다고 가정해 보겠습니다.

그때 5000번 포트로 뭔가 패킷이 툭 들어옵니다. 내 컴퓨터는 어떻게 생각할까요?
> *"이게 시그널링 서버에서 매칭된 내 짝꿍이 보낸 STUN 패킷인가? 아니면 지나가던 해커가 포트 스캐닝하려고 찔러본 쓰레기 패킷인가?"*

이걸 구별할 방법이 없습니다! IP 주소만 믿자니, IP 주소는 위장(Spoofing)하기 너무 쉽습니다. 바로 이 **'네가 내 짝꿍이 맞는지 증명해라'**를 해결하기 위해 도입된 단기 인증 수단이 `ufrag`와 `pwd`입니다.

#### 쉽게 비유하자면: "암구호(일회용 비밀번호)"

1. **사전 약속 (Signaling 단계):**
   나와 상대방은 만나기 전에 안전한 시그널링 서버를 통해 속닥속닥 약속을 합니다.
   *나: "야, 내가 이따 네 포트로 노크할 때, '사과'(`ufrag`)라는 이름표 달고 '바나나'(`pwd`)라는 암호 걸어서 보낼게!"*
   *상대방: "오케이, 난 '포도'(`ufrag`) 달고 '딸기'(`pwd`)로 보낼게!"*

2. **접근 확인 (Connectivity Check 단계):**
   내가 상대방에게 STUN 패킷을 보낼 때, 그냥 보내는 게 아닙니다. 
   패킷 안에 `ufrag` 값("사과")을 적고, `pwd`("바나나")를 비밀키로 사용해서 패킷 전체를 **해싱(암호화 서명, HMAC-SHA1)** 해서 보냅니다.

3. **검증 및 통과:**
   상대방이 패킷을 받습니다. 
   *"이름표에 '사과'라고 적혀있네? 아까 약속한 이름표야. 그럼 암호가 '바나나'일 텐데, '바나나'로 서명을 풀어볼까? 오, 완벽하게 풀려! 이건 쓰레기 패킷이 아니라 **내가 시그널링으로 약속한 내 짝꿍이 보낸 게 확실하네!** 통과!"*

### 3단계: 요약 및 ICE Restart와의 관계

**`ufrag`와 `pwd`의 존재 이유를 요약하자면:**
- 특정 P2P 세션(전화 한 통) 동안, **나에게 들어오는 접근(STUN 패킷)이 진짜 인가된 상대방이 보낸 것인지 빠르고 가볍게 인증**하기 위한 수단입니다.
- 보안 용어로 **Short-term Authentication(단기 인증)**이라고 부릅니다. 이 세션이 끝나면 이 ufrag/pwd는 버려집니다.

**이게 왜 ICE Restart의 핵심 트리거가 될까요?**
통신이 길게 끊겨서 ICE 상태가 `failed`가 되었다는 것은, **"기존에 약속했던 '사과/바나나' 암구호 세션은 유효기간이 끝났음(파기됨)"**을 의미합니다. 그 암구호로는 백날 노크해 봐야 문을 열어주지 않고 무시합니다 (이게 바로 failed 상태의 ICE Agent입니다).

따라서 연결을 복구하려면 시그널링을 통해 **"야, 이전 암구호는 버리고 이제 '수박/참외'라는 새로운 암구호로 다시 시작하자!"**라고 새로운 `ufrag/pwd`를 교환해야만 합니다. 이 새로운 암구호를 발급받아야만 ICE Agent가 "아, 새로운 세션이 시작되었구나!" 하고 잠에서 깨어나 다시 길찾기(Connectivity Check)를 시작하는 것입니다.

---

## 💻 실제 코드에서는 ufrag와 pwd가 어디에 있을까?

`ufrag`와 `pwd`라는 단어 자체가 코드에 직접 문자열로 하드코딩되어 있지는 않습니다. 대신, 이 둘은 **`iceParameters`라는 객체 안에 묶여서** 서버와 클라이언트를 오가게 됩니다. 이를 로깅해서 확인해보면 실제로 `{ usernameFragment: '...', password: '...' }` 형태를 띄는 것을 볼 수 있습니다.

### 1. 맨 처음 암구호가 발급될 때 (최초 연결)

`group-study-management.service.ts` 파일의 `establishTransport` 메서드에서 최초 발급이 일어납니다.

```typescript
// nest-server/src/group-study-management/group-study-management.service.ts
async establishTransport(socketId: string, type: 'send' | 'recv') {
    // 내부적으로 Mediasoup C++ 워커(Worker)에게 Transport 생성을 지시함
    const transport = await this.mediasoupService.getWebRtcTransport();

    // 생성된 transport 객체 안에 들어있는 정보들을 클라이언트에게 보낼 준비를 함
    const transportOptions = {
      id: transport.id,
      iceParameters: transport.iceParameters, // <--- 여기에 ufrag와 pwd가 담겨 발급됩니다!
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    };

    return transportOptions;
}
```
서버가 이 `transportOptions`를 클라이언트(`connectionStore.ts`)로 넘겨주고, 클라이언트가 `device.createSendTransport()`를 호출할 때 이 `iceParameters`를 사용함으로써, 서로 암구호 세팅이 끝납니다.

### 2. 이전 암구호가 만료되고 새로 갱신될 때 (ICE Restart)

네트워크가 끊어져 상태가 `failed`가 되면, 클라이언트는 새 암구호를 요구합니다.

#### (1) 클라이언트 측: "상태 failed 감지! 새 암구호 줘!"
```typescript
// client/src/zustand-stores/connectionStore.ts (attemptIceRestart 내부)
if (state === "failed" && !isRestartingIce) {
    const attemptIceRestart = () => {
        // 서버의 Signaling Gateway로 RESTART_ICE 이벤트를 쏜다.
        socket.emit(
          EventNames.RESTART_ICE,
          { transportId: transport.id, role },
          async (ackResponse: AckResponse<{ iceParameters: any }>) => { // <--- 새 암구호 도착
            if (ackResponse.success && ackResponse.data?.iceParameters) {
                // 받은 새 암구호(iceParameters)를 내 ICE Agent에 적용! (상태 머신 초기화)
                await transport.restartIce({
                  iceParameters: ackResponse.data.iceParameters 
                });
            }
          }
// ...
```

#### (2) 서버 관문: "요청이 왔네. 서비스로 넘기자"
```typescript
// nest-server/src/signaling/signaling.gateway.ts
@SubscribeMessage(EventNames.RESTART_ICE)
async handleRestartIce(...) {
    return await this.groupStudyManagementService.restartIce(
      clientSocket.id,
      payload.role
    );
}
```

#### (3) 서버 측: "새 암구호 발급해줄게"
```typescript
// nest-server/src/group-study-management/group-study-management.service.ts
async restartIce(socketId: string, role: 'send' | 'recv') {
    // ...
    // 서버 측 Mediasoup Transport에게 ICE 속성을 다시 시작하라고 지시!
    // 이 메서드가 실행되면서 기존 연결포트는 유지하고 "새로운 ufrag와 pwd"가 들어있는 객체를 반환합니다.
    const iceParameters = await transport.restartIce();

    // 발급된 새 암구호 객체를 클라이언트에게 리턴
    return { success: true, data: { iceParameters } };
}
```

최초 연결 시 발급에서 갱신까지, 모든 인증 교환을 양방향 핑퐁을 통해 유기적으로 제어하는 구조입니다.
