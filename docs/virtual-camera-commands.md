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
