# Flex Direction Column (`flex-direction: column`)

## 1. 개요 (What is it?)

CSS Flexbox는 기본적으로 자식 요소들을 **가로(Row)**로 나열합니다. `flex-direction: column`은 이 메인 축(Main Axis)을 **세로(Column)**로 변경하여, 요소들이 위에서 아래로 떨어지도록 만드는 속성입니다.

"어차피 `<div>` 같은 Block 요소들은 원래 위에서 아래로 쌓이는데, 굳이 왜 Flex Column을 쓰는가?" 라는 의문이 들 수 있습니다. 단순한 수직 나열이 목적이 아니라, **수직 공간(높이)을 동적으로 계산하고 분배하기 위해** 사용하는 것이 Flex Column의 핵심 존재 이유입니다.

---

## 2. 일반 Block Flow와의 차이점

### 2-1. 일반적인 Block 요소 (`display: block`)
*   **특징:** 내용물(Content)의 높이만큼만 자리를 차지하며, 차곡차곡 아래로 쌓입니다.
*   **한계:** 특정 요소에게 "남는 화면 높이를 네가 다 차지해라" 라고 지시하기가 매우 까다롭습니다. 예전에는 `calc(100vh - 80px)` 처럼 헤더나 푸터의 높이를 하드코딩해서 빼주는 방식을 사용해야 했습니다. 화면 크기가 변하거나 헤더 높이가 동적으로 변하면 레이아웃이 쉽게 깨집니다.

### 2-2. Flex Column (`display: flex; flex-direction: column`)
*   **특징:** 부모 컨테이너가 특정 높이를 가지고 있을 때, 자식 요소들에게 **`flex-grow` (`flex: 1`)** 속성을 부여하여 **남는 수직 공간을 비율대로 나누어 가질 수 있습니다.**
*   **장점:** 하드코딩 없이 브라우저가 남은 공간을 알아서 계산해주므로, 반응형 웹이나 App-like 레이아웃(화면 꽉 차는 레이아웃)을 만들 때 절대적으로 유리합니다.

---

## 3. 대표적인 활용 패턴 (App-like Layout)

최신 웹 애플리케이션(채팅 앱, 대시보드 등)에서 화면 전체를 꽉 채우면서, 특정 영역만 스크롤되게 만들고 싶을 때 거의 필수적으로 사용되는 패턴입니다.

### 3-1. 구조 예시 (Header + Scrollable Content + Footer)

```html
<div class="app-container">
  <header class="header">상단 고정 헤더 (높이 자동)</header>
  
  <main class="content">
    이 영역은 헤더와 푸터가 차지하고 "남은 전체 화면 높이"를 모두 차지합니다.
    내용이 길어지면 브라우저 전체가 스크롤되는 것이 아니라,
    이 영역 안에서만 스크롤(overflow-y: auto)이 발생합니다.
  </main>
  
  <footer class="footer">하단 고정 컨트롤러 (높이 자동)</footer>
</div>
```

### 3-2. CSS 구현 원리

```css
/* 1. 최상위 부모: 화면 전체 높이를 잡고 Column 방향 설정 */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh; /* 화면 전체 높이 */
}

/* 2. 고정 영역: 자기 내용물(Content)만큼만 높이를 가짐 */
.header, .footer {
  /* flex 속성을 주지 않으면 기본적으로 내용물 크기 유지 */
  padding: 1rem;
}

/* 3. 동적 영역: 남은 수직 공간을 모두 흡수 */
.content {
  flex: 1;             /* = flex-grow: 1. 남는 공간 내가 다 쓸게! */
  overflow-y: auto;    /* 내 영역을 넘어가면 나만 스크롤 만들게! */
}
```

---

## 4. 요약

`flex-direction: column`은 단순히 요소를 세로로 줄 세우는 용도를 넘어, **"유동적인 수직 공간(Height) 분배"**를 위해 사용합니다. 
`flex: 1`과 `overflow-y: auto`를 조합하면, 헤더/푸터는 고정시키고 중간 콘텐츠 영역만 스크롤되는 모던 웹/앱 레이아웃을 가장 우아하고 쉽게 구현할 수 있습니다.
