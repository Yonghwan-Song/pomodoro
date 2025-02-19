# Instead of comments

## src/index.tsx

### auto-start의 payload에 대해

### 1. 누가 먼저 보내냐

- `/timer`말고 다른 페이지에서 세션이 종료되고 자동시작 설정이 on이면 BroadCastChannel을 이용해서 autoStart을 지시

- 이때 payload로 다음 세션 시작시 필요한 정보들을 보낸다.

### 2. 어떻게 이어지는지

- 다른 페이지에서 자동시작된 세션이 그 페이지에서 머무르는 동안 종료되면, sw.js에 "endTimer" post 메시지가 이전에 index.tsx에 의해 정의된 autoStartCurrentSession함수 내부의 countDown부분에 의해 보내진다.

- 이때 종료되는 세션에 대한 정보를 포함시켜서 보낸다.

### 3. Loop

- 만약 다른 페이지에서 다시 다음 세션을 자동시작해야 하는 경우 1로 돌아간다. 상황에 따라 계속 반복된다.
