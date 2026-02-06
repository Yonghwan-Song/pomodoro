# OBS에서 Virtual Camera 여러 개 만드는 방법

## 핵심 원리: "Everything is a file"

Linux에서는:

- **일반 파일**: `/home/user/document.txt` → 디스크 데이터
- **장치 파일(Device Files)**: `/dev/video0`, `/dev/audio` → **하드웨어와 통신하는 인터페이스**

**장치 파일 = 실제 파일처럼 읽고 쓸 수 있는 추상화 레이어**

### 웹캠 작동 원리

```
실제 카메라 (USB 하드웨어)
  ↓ (USB 드라이버)
/dev/video0 (장치 파일)
  ↓ (read/write 시스템 콜)
애플리케이션 (Chrome, Zoom) — 마치 파일에서 읽듯이 영상 데이터 수신
```

### 가상 카메라의 핵심: v4l2loopback

v4l2loopback은 **소프트웨어로 만든 가짜 카메라 장치**

```
OBS (영상 출력)
  ↓ (v4l2loopback 드라이버로 데이터 쓰기)
/dev/video10 (가상 장치 파일) ← 실제 하드웨어 없음, 소프트웨어만 사용
  ↓ (read/write 시스템 콜)
Chrome/WebRTC 앱 (읽기)
```

**특징:**

- `/dev/video10`은 실제 카메라 하드웨어가 없음
- 메모리 버퍼만 있음
- OBS가 데이터를 쓰면 → 메모리에 저장
- 다른 앱이 읽으면 → 메모리에서 꺼내서 제공

---

## 현재 상황 분석

### 시스템 상태

```
Iriun Webcam (platform:v4l2loopback-000):
        /dev/video0

Integrated Camera: Integrated C (usb-0000:64:00.4-1):
        /dev/video1
        /dev/video2
        /dev/video3
        /dev/video4
```

- ✅ v4l2loopback 이미 설치됨
- `/dev/video0`에 "Iriun Webcam"이 등록됨 (1개만 생성됨)

### 왜 2개 씬이 1개 카메라로만 보이는가?

**OBS의 기본 Virtual Camera 기능 제한:**

- ✅ 한 번에 **1개의 가상 카메라**만 생성 가능
- ✅ 현재 **활성 씬(Active Scene)**만 출력
- ❌ 2개 이상의 가상 카메라를 동시에 실행 불가

```
OBS Virtual Camera (Start 버튼)
    ↓
/dev/video0 (Iriun Webcam) ← 현재 활성 씬만 출력
    ↑
WebRTC 앱 (video0 하나만 접근 가능)
```

---

## 해결책: 2개 가상 카메라 각각 다른 씬 출력하기

### 1️⃣ 추가 가상 카메라 디바이스 생성

```bash
# 기존 모듈 언로드
sudo modprobe -r v4l2loopback

# 2개 카메라로 다시 로드
sudo modprobe v4l2loopback devices=2 video_nr=0,10 card_label="OBS-Scene1","OBS-Scene2" exclusive_caps=1
```

확인:

```bash
v4l2-ctl --list-devices
```

예상 결과:

```
OBS-Scene1 (platform:v4l2loopback-000):
        /dev/video0

OBS-Scene2 (platform:v4l2loopback-001):
        /dev/video10
```

### 2️⃣ obs-v4l2sink 플러그인 설치

```bash
# Arch Linux
paru -S obs-v4l2sink
# 또는
yay -S obs-v4l2sink
```

설치 후 **OBS 재시작**

### 3️⃣ OBS에서 각 씬을 각각 다른 카메라에 출력

**씬1 (Scene1):**

1. Scene1을 선택
2. Tools → V4L2 Video Output
3. Device: `/dev/video0` → Start

**씬2 (Scene2):**

1. Scene2를 선택
2. Tools → V4L2 Video Output
3. Device: `/dev/video10` → Start

### 4️⃣ 권한 설정

```bash
sudo usermod -aG video $USER
# 로그아웃/로그인 필요
```

---

## 테스트

```bash
# 각 카메라 확인
ffplay /dev/video0   # Scene1
ffplay /dev/video10  # Scene2
```

---

scene에서 하나 더 만들어서 해봤는데 그냥 안되네... 그리고 iriun webcam이 이름으로 등록되어있어.. 왜지.

## 추가 질문들

- 문득 네 답변을 듣고 생각해보니까... file을 매개로 외장 카메라와 통신하는 모델은.. window에서도 쓰일 것 같은데 ... 맞나?.. 애초에 file이 꼭 hard disk에 저장되어서 나중에 꺼내 읽어야하는 그런것만으로 존재할 필요가 없잖아...
- 예를 들면, 파일을 단순히 그냥 종이라고 치면, 종이를 가지고 노트필기해서 어디에 나중에 보기위해 저장할 수도 있고, 편지지처럼 communication할 때 사용될 수도 있는거니까... 후자가 어떻게 보면 device 파일이라고 보면 되지 않나?... 그냥... 통신의 수단?...

# sonnet과 한 대화 정리

**주요 명령어 총정리**

---

## **1. 가상 카메라 관리**

### **모듈 확인/로드/제거**

```bash
# 현재 로드된 모듈 확인
lsmod | grep v4l2loopback

# 모듈 정보 보기
modinfo v4l2loopback

# 모듈 제거 (전부)
sudo modprobe -r v4l2loopback

# 가상 카메라 생성 (2개)
sudo modprobe v4l2loopback devices=2 video_nr=20,21 card_label=YouTube1,YouTube2 exclusive_caps=1

# 가상 카메라 생성 (Iriun 포함 3개)
sudo modprobe v4l2loopback devices=3 video_nr=0,20,21 card_label=Iriun,YouTube1,YouTube2 exclusive_caps=1
```

**파라미터 설명:**

- `devices=N`: 가상 카메라 개수
- `video_nr=20,21`: 장치 번호 지정 (/dev/video20, /dev/video21)
- `card_label=이름1,이름2`: 장치 이름
- `exclusive_caps=1`: 한 번에 한 프로그램만 접근 (권장)

---

### **장치 확인**

```bash
# 모든 비디오 장치 목록
v4l2-ctl --list-devices

# 특정 장치 상세 정보
v4l2-ctl --device=/dev/video20 --all

# 커널 로그 확인 (에러 디버깅)
sudo dmesg | grep v4l2loopback
sudo dmesg | tail -20
```

---

## **2. 유튜브 → 가상 카메라 송출**

### **기본 명령어**

```bash
# Timer
yt-dlp -o - "https://www.youtube.com/watch?v=mivcDoTjpQE" | \
  ffmpeg -re -i pipe:0 -f v4l2 -pix_fmt yuv420p /dev/video20

# Jackson Hole Town Square
yt-dlp -o - "https://www.youtube.com/watch?v=1EiC9bvVGnk" | \
  ffmpeg -re -i pipe:0 -f v4l2 -pix_fmt yuv420p /dev/video21
```

**옵션 설명:**

- `yt-dlp -o -`: stdout으로 실시간 스트리밍 (다운로드 안 함)
- `ffmpeg -re`: 실시간 속도로 처리
- `-i pipe:0`: stdin에서 입력 받기
- `-f v4l2`: v4l2 장치로 출력
- `-pix_fmt yuv420p`: 픽셀 포맷 (호환성)

---

### **해상도 조정 (CPU 절약)**

```bash
# 320x240 (가벼움)
yt-dlp -o - "URL" | \
  ffmpeg -re -i pipe:0 -s 320x240 -f v4l2 -pix_fmt yuv420p /dev/video20

# 640x480 (적당함)
yt-dlp -o - "URL" | \
  ffmpeg -re -i pipe:0 -s 640x480 -f v4l2 -pix_fmt yuv420p /dev/video20
```

---

### **백그라운드 실행**

```bash
# 터미널 닫아도 계속 실행
nohup yt-dlp -o - "URL" | \
  ffmpeg -re -i pipe:0 -f v4l2 -pix_fmt yuv420p /dev/video20 \
  > /tmp/youtube-stream.log 2>&1 &

# 프로세스 확인
ps aux | grep yt-dlp

# 종료
pkill -f "yt-dlp.*video20"
```

---

## **3. 화면 캡처 → 가상 카메라**

```bash
# 영역 선택해서 캡처
wf-recorder --muxer=v4l2 --file=/dev/video22 --geometry="$(slurp)"

# 전체 화면 캡처
wf-recorder --muxer=v4l2 --file=/dev/video22
```

---

## **4. 가상 카메라 확인/테스트**

```bash
# mpv로 확인
mpv av://v4l2:/dev/video20

# ffplay로 확인
ffplay /dev/video20

# 간단한 이미지 송출 테스트
ffmpeg -loop 1 -i image.png -f v4l2 -pix_fmt yuv420p /dev/video20
```

---

## **5. 부팅 시 자동 설정**

### **설정 파일 생성**

```bash
# 모듈 옵션 설정
sudo nano /etc/modprobe.d/v4l2loopback.conf
```

**내용:**

```
options v4l2loopback devices=3 video_nr=0,20,21 card_label=Iriun,YouTube1,YouTube2 exclusive_caps=1
```

```bash
# 부팅 시 자동 로드
sudo nano /etc/modules-load.d/v4l2loopback.conf
```

**내용:**

```
v4l2loopback
```

---

## **6. 실전 테스트 시나리오 (4명 스터디룸)**

### **터미널 3개 실행**

```bash
# 터미널 1: YouTube 1
yt-dlp -o - "https://www.youtube.com/watch?v=jNQXAC9IVRw" | \
  ffmpeg -re -i pipe:0 -f v4l2 -pix_fmt yuv420p /dev/video20

# 터미널 2: YouTube 2
yt-dlp -o - "https://www.youtube.com/watch?v=21X5lGlDOfg" | \
  ffmpeg -re -i pipe:0 -f v4l2 -pix_fmt yuv420p /dev/video21

# 터미널 3: 화면 캡처
wf-recorder --muxer=v4l2 --file=/dev/video22 --geometry="$(slurp)"
```

### **브라우저 4개 실행**

```bash
google-chrome-stable "localhost:3000"
chromium "localhost:3000"
brave "localhost:3000"
firefox "localhost:3000"
```

각 브라우저에서:

1. 권한 팝업 → 다른 카메라 선택
2. WebRTC 연결 테스트

---

## **7. 문제 해결**

```bash
# 모든 v4l2loopback 제거 후 재시작
sudo modprobe -r v4l2loopback
sudo modprobe v4l2loopback devices=2 video_nr=20,21 card_label=YouTube1,YouTube2 exclusive_caps=1

# 장치가 사용 중일 때
lsof /dev/video20              # 어떤 프로세스가 사용 중인지 확인
pkill -f "yt-dlp.*video20"     # 해당 프로세스 종료

# 권한 문제
sudo chmod 666 /dev/video20    # 임시 해결
sudo usermod -aG video $USER   # 영구 해결 (재로그인 필요)
```

---

## **빠른 참조 치트시트**

```bash
# === 설정 ===
sudo modprobe v4l2loopback devices=2 video_nr=20,21 card_label=YT1,YT2 exclusive_caps=1
v4l2-ctl --list-devices

# === 송출 ===
yt-dlp -o - "URL" | ffmpeg -re -i pipe:0 -f v4l2 -pix_fmt yuv420p /dev/video20

# === 확인 ===
mpv av://v4l2:/dev/video20

# === 정리 ===
sudo modprobe -r v4l2loopback
```

---

**이 명령어들만 있으면 WebRTC 테스트 환경 완벽하게 구축 가능!** 🚀

---

# 루틴

```bash
# 모듈 제거 (전부)
sudo modprobe -r v4l2loopback

# 가상 카메라 생성 (2개)
sudo modprobe v4l2loopback devices=2 video_nr=20,21 card_label=YouTube1,YouTube2 exclusive_caps=1

# Timer
yt-dlp -o - "https://www.youtube.com/watch?v=mivcDoTjpQE" | \
  ffmpeg -re -i pipe:0 -f v4l2 -pix_fmt yuv420p /dev/video20

# Jackson Hole Town Square
yt-dlp -o - "https://www.youtube.com/watch?v=1EiC9bvVGnk" | \
  ffmpeg -re -i pipe:0 -f v4l2 -pix_fmt yuv420p /dev/video21
```
