## CSS `@layer`, reset, PandaCSS 정리

### 1. `@layer`란 무엇인가

- **정의**: CSS 규칙을 논리적인 레이어(층)로 나누어 **동일한 우선순위(specificity)**일 때 어떤 것이 이길지 제어하는 표준 문법.
- **특징**
  - 선택자 우선순위가 같다면, **나중에 선언된 레이어가 앞의 레이어를 덮어쓴다.**
  - 보통 다음처럼 선언한다.

```css
@layer reset, base, tokens, recipes, utilities;

@layer reset {
  /* 브라우저 기본 스타일 초기화 */
}

@layer base {
  /* body, h1 같은 전역 기본 스타일 */
}

@layer utilities {
  /* .px_4, .d_flex 같은 유틸리티 클래스 */
}
```

#### 1-1. 레이어 선언과 정의의 관계

- 이 줄:

```css
@layer reset, base, tokens, recipes, utilities;
```

- 의미:
  - `reset`, `base`, `tokens`, `recipes`, `utilities`라는 **레이어 이름을 미리 선언**하고
  - **레이어 간 순서**를 정의한다.  
    (`reset` < `base` < `tokens` < `recipes` < `utilities`)
- 이 줄은 일종의 **“레이어 선언(declaration)”** 역할을 한다.

- 그 다음의 `@layer reset { ... }` 같은 블록은:

```css
@layer reset {
  /* 브라우저 기본 스타일 초기화 */
}
```

- 의미:
  - “위에서 선언한 `reset` 레이어 안에, 이 규칙들을 **정의(implementation)** 해라”
  - 동일한 레이어 이름을 가진 여러 `@layer reset { ... }` 블록이 있어도, **같은 레이어로 병합**된다.

- 정리하면:
  - **맨 위 `@layer reset, base, ...;`** → “레이어 이름과 순서”를 선언
  - **아래 `@layer reset { ... }`** → 해당 레이어에 실제 스타일을 정의  
  → 이 둘이 합쳐져서 “같은 specificity일 때 어떤 레이어가 위에 올지”를 제어할 수 있게 된다.

### 2. reset CSS 개념

- **reset**: 브라우저마다 다른 기본 스타일을 **일정하게 맞추기 위해 초기화하는 CSS**.
- 대표적인 예:

```css
@layer reset {
  *, *::before, *::after {
    box-sizing: border-box;
  }

  * {
    margin: 0;
    /* padding: 0;  ← 보통은 전역 padding 0은 잘 안 건드리는 편 */
  }
}
```

- 목적:
  - 브라우저 기본 `margin`, `padding`, `list-style`, `button` border 등 제거/통일
  - 이후 레이어(components, utilities)에서 예측 가능한 상태로 스타일 작업하기 위함

### 3. 이번 버그의 원인

#### 상황

- `Room.tsx` 최상위 div에 PandaCSS로 다음 스타일을 줌:

```ts
paddingX: { base: "3", md: "5" },
paddingY: { base: "3", md: "4" },
```

- HTML로 변환되면 대략 이런 클래스가 됨:

```html
<div class="px_3 md:px_5 py_3 md:py_4 ...">
```

- DevTools의 `Copy styles` 결과 (일부):

```text
padding-inline: var(--spacing-5);
padding-block: var(--spacing-4);
margin: 0px;
padding: 0px;
box-sizing: border-box;
```

#### 핵심 문제

- `padding-inline`, `padding-block`은 Panda 유틸리티(`px_3`, `py_3`)에서 잘 생성되고 있음.
- 그런데 그 **아래 줄에 있는 `padding: 0px;`이 모든 padding을 다시 0으로 덮어씀.**
- 이 `padding: 0px;`은 `client/src/index.css`의 다음 코드에서 나옴:

```css
* {
  margin: 0px;
  padding: 0px;
  box-sizing: border-box;
}
```

- `*` 선택자와 Panda 유틸 클래스는 **specificity가 동일(0,0,0)** 이라, **스타일시트에서 더 나중에 적용된 쪽이 이긴다.**
- 현재 구조에서는 이 전역 `* { padding: 0 }` 규칙이 Panda 유틸보다 뒤에서 적용되어,
  `px_3`, `py_3`가 만든 padding이 모두 무효화되는 버그가 발생했다.

### 4. PandaCSS와 `@layer`의 관계

- Panda는 내부적으로 스타일을 여러 레이어로 나눈다:
  - `reset`
  - `base`
  - `tokens`
  - `recipes`
  - `utilities` 등
- `index.css` 상단에 있던 코드는 단순히 **레이어 이름만 등록**한 것:

```css
@layer reset, base, tokens, recipes, utilities;
```

- 하지만 실제 reset 규칙을 **레이어 밖에서** 이렇게 선언해 버리면:

```css
* {
  margin: 0px;
  padding: 0px;
  box-sizing: border-box;
}
```

- 이 전역 규칙은 Panda가 생성한 유틸리티와 같은 specificity를 가지면서, **로드 순서에 따라 유틸리티를 덮어써 버릴 수 있다.**

### 5. 해결 방법 정리

#### 방법 1: reset을 `@layer reset` 안으로 옮기기 (권장)

```css
@layer reset, base, tokens, recipes, utilities;

@layer reset {
  * {
    margin: 0;
    /* padding: 0;  ← 전역 padding 초기화는 지양하는 편 */
    box-sizing: border-box;
  }
}
```

- 이렇게 하면:
  - reset 레이어가 먼저 적용되고
  - 그 위에 Panda의 `utilities` 레이어가 올라오면서
  - `px_3`, `py_3` 등의 유틸 클래스가 **reset보다 우선**해서 정상 동작.

#### 방법 2: 전역 `padding: 0` 제거

```css
* {
  margin: 0;
  /* padding: 0;  ← 제거 */
  box-sizing: border-box;
}
```

- 대부분의 경우, margin만 리셋하고 padding은 컴포넌트/유틸에서 제어하게 두는 방식이 더 안전하다.

### 6. 배운 점

- **reset를 쓸 때는 레이어(`@layer`)와 로딩 순서까지 고려해야 한다.**
- 전역 `* { padding: 0 }`는 생각보다 영향 범위가 넓고, 유틸리티 기반 디자인 시스템(Panda, Tailwind 등)과 충돌하기 쉽다.
- PandaCSS 자체 문제라기보다는, **글로벌 reset과 유틸리티 레이어 간의 우선순위 설정 문제**였다.

### 7. 추가 Q&A: 브라우저 기본 스타일 vs 전역 기본 스타일 vs 유틸리티 클래스

최종적으로 브라우저가 화면을 그릴 때는 "어떤 요소에 어떤 속성이 적용되었나"만 볼 뿐, 이 셋을 스스로 구분하지는 않습니다. 하지만 **"출처(Origin)"**, **"적용 의도"**, **"우선순위 제어(@layer)"**를 기준으로 명확히 구분됩니다.

1. **브라우저 기본 스타일 (User Agent Styles)**
   - **출처:** 개발자가 작성하지 않아도 브라우저(Chrome, Safari 등)에 내장된 초기 스타일. (예: `<h1>`은 굵게, `<ul>`은 점이 찍힘)
   - **특징:** 우선순위가 가장 낮아 개발자가 작성한 CSS에 쉽게 덮어씌워집니다.
2. **전역 기본 스타일 (Reset / Base Styles)**
   - **출처:** 전체 밑바탕을 일관되게 칠하기 위해 개발자가 직접 작성하는 코드.
   - **목적:** 브라우저 간 기본 스타일 차이를 없애 백지상태(`reset`)로 만들거나, 프로젝트 전체의 기본 폰트 등을 설정(`base`)하기 위함.
   - **특징:** 주로 `*`, `body`, `button` 같은 **범용적인 태그 선택자** 사용. (예: `* { margin: 0; padding: 0; }`)
3. **유틸리티 클래스 (Utility Classes)**
   - **출처:** 특정한 요소에 **딱 하나의 스타일만 콕 집어서 적용하기 위해** 작성/생성되는 코드 (Panda CSS, Tailwind 등).
   - **특징:** `.px_3`, `.flex`처럼 **클래스(Class) 선택자**를 사용해 레고 블록처럼 조립. (예: `<div class="px_3">`)

이들을 굳이 `@layer`로 나누는 이유는 **"누가 누구를 덮어쓸 것인가(우선순위 충돌 방지)"**를 통제하기 위해서입니다.

### 8. 추가 Q&A: 유틸리티 클래스와 CSS Module의 차이점

유틸리티 클래스는 CSS Module처럼 이름 겹침을 방지하기 위해 임의의 해시값을 붙이는 자동 로직이 아닙니다. 두 방식은 CSS 스타일링 충돌을 해결하기 위한 **서로 다른 접근 방식**입니다.

1. **CSS Modules 방식: "이름을 고유하게 꼬아서(Hashing) 가두기" (격리 중심)**
   - **동작 방식:** 빌드 시 `.Button_active__3f9x` 처럼 클래스 이름 뒤에 고유한 해시 문자열을 자동으로 붙여줍니다.
   - **목적:** 파일(컴포넌트) 단위로 스타일을 고립시켜 동일한 `.active` 클래스명을 여러 파일에서 써도 충돌하지 않게 합니다.

2. **유틸리티 클래스 방식 (Panda CSS, Tailwind): "원자 단위(Atomic)로 규격화하기" (규격 중심)**
   - **동작 방식:** 클래스명을 파일별로 짓지 않고, `.p-4`(padding 1rem), `.flex` 등 단일 역할만 하는 전역 클래스를 사용합니다.
   - **목적:** 애초에 충돌할 일조차 없도록 CSS를 규격화하여, 클래스 네이밍 고민 없이 HTML에 조립해서 사용합니다.
   - **Panda CSS의 역할:** 코드 상에 `paddingX: "3"`이라고 쓰면, 빌드 타임에 이를 분석하여 필요한 유틸리티 클래스 `.px_3 { ... }`를 CSS 파일에 하나만 텍스트로 찍어내고 HTML/JSX와 연결해 줍니다.

