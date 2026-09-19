# 1

## Ports

recv
nest -> 10.99.228.66.36980, mobile -> 10.99.228.148.42899
send
nest -> 10.99.228.66.33306, mobile -> 10.99.228.148:42807

이것을 tcpdump인가로 확인을 해야함. 그래서 wlan에 연결된것인지 새로운 interface에 연결된것인지 확인할 수 있음.

## tcpdump

```bash
sudo tcpdump -ni enp102s0f3u1 "udp and host 10.99.228.148" -c 30

tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on enp102s0f3u1, link-type EN10MB (Ethernet), snapshot length 262144 bytes
15:56:39.610400 IP 10.99.228.148.42807 > 10.99.228.66.33306: UDP, length 84
15:56:39.611399 IP 10.99.228.148.42899 > 10.99.228.66.36980: UDP, length 32
15:56:39.614323 IP 10.99.228.148.42807 > 10.99.228.66.33306: UDP, length 363
15:56:39.617776 IP 10.99.228.148.42807 > 10.99.228.66.33306: UDP, length 828
15:56:39.623275 IP 10.99.228.148.42899 > 10.99.228.66.36980: UDP, length 36
15:56:39.628790 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1146
15:56:39.628825 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1146
15:56:39.628841 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1146
15:56:39.628855 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1146
15:56:39.628872 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1146
15:56:39.628893 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1146
15:56:39.628932 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1146
15:56:39.628970 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1146
15:56:39.629010 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1146
15:56:39.629051 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1147
15:56:39.629054 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1147
15:56:39.629089 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1147
15:56:39.639266 IP 10.99.228.148.42899 > 10.99.228.66.36980: UDP, length 56
15:56:39.649771 IP 10.99.228.148.42807 > 10.99.228.66.33306: UDP, length 884
15:56:39.654113 IP 10.99.228.148.42807 > 10.99.228.66.33306: UDP, length 128
15:56:39.654213 IP 10.99.228.148.42899 > 10.99.228.66.36980: UDP, length 36
15:56:39.654245 IP 10.99.228.66.33306 > 10.99.228.148.42807: UDP, length 64
15:56:39.658074 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1125
15:56:39.658117 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1125
15:56:39.658152 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1125
15:56:39.658185 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1125
15:56:39.658228 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1125
15:56:39.658246 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1125
15:56:39.658269 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1125
15:56:39.658286 IP 10.99.228.66.36980 > 10.99.228.148.42899: UDP, length 1125
30 packets captured
53 packets received by filter
0 packets dropped by kernel
```

### ip a - new interface

```bash
enp102s0f3u1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UNKNOWN group default qlen 1000
link/ether 7e:ff:f4:89:38:10 brd ff:ff:ff:ff:ff:ff
altname enx7efff4893810
inet 10.99.228.66/24 brd 10.99.228.255 scope global dynamic noprefixroute enp102s0f3u1
```

## UDP Up/Down COMMANDS

### DOWN

```bash
# Send transport
sudo iptables -I INPUT -i enp102s0f3u1 -p udp -d 10.99.228.66 --dport 33306 -j DROP
sudo iptables -I OUTPUT -o enp102s0f3u1 -p udp -s 10.99.228.66 --sport 33306 -j DROP

# Recv transport
sudo iptables -I INPUT -i enp102s0f3u1 -p udp -d 10.99.228.66 --dport 36980 -j DROP
sudo iptables -I OUTPUT -o enp102s0f3u1 -p udp -s 10.99.228.66 --sport 36980 -j DROP
```

### UP

```bash

# Send transport
sudo iptables -D INPUT -i enp102s0f3u1 -p udp -d 10.99.228.66 --dport 33306 -j DROP
sudo iptables -D OUTPUT -o enp102s0f3u1 -p udp -s 10.99.228.66 --sport 33306 -j DROP

# Recv transport
sudo iptables -D INPUT -i enp102s0f3u1 -p udp -d 10.99.228.66 --dport 36980 -j DROP
sudo iptables -D OUTPUT -o enp102s0f3u1 -p udp -s 10.99.228.66 --sport 36980 -j DROP
```

```bash
# Send transport
sudo iptables -D INPUT -i enp102s0f3u1 -p udp -d 10.20.105.210 --dport 33306 -j DROP
sudo iptables -D OUTPUT -o enp102s0f3u1 -p udp -s 10.20.105.210 --sport 33306 -j DROP

# Recv transport
sudo iptables -D INPUT -i enp102s0f3u1 -p udp -d 10.20.105.210 --dport 36980 -j DROP
sudo iptables -D OUTPUT -o enp102s0f3u1 -p udp -s 10.20.105.210 --sport 36980 -j DROP

```

## TCP Down

### 새로운 자동 연결 차단

```bash
adb reverse --remove tcp:3000
```

### 기존 연결 차단

#### `ss`

```bash
ss -tnp | grep ':3000'
ESTAB 0 0 127.0.0.1:34494 127.0.0.1:3000 users:(("firefox",pid=9781,fd=104))
ESTAB 0 0 127.0.0.1:54775 127.0.0.1:3000 users:(("adb",pid=8094,fd=17))
ESTAB 0 0 [::ffff:127.0.0.1]:3000 [::ffff:127.0.0.1]:34494 users:(("node",pid=8603,fd=43))
ESTAB 0 0 [::ffff:127.0.0.1]:3000 [::ffff:127.0.0.1]:54775 users:(("node",pid=8603,fd=42))
```

#### `tcpkill`

```bash
sudo tcpkill -i lo port 54775
```

## TCP UP

### tcpkill 중단

### adb reverse tcp:3000 tcp:3000

## 진행 시나리오

### TCP DOWN

- 끊어놓고 양쪽에서 채팅 하나씩 치고,
- 양쪽에서 마찬가지로 focus duration한번씩 진행해준다.
  - 이전에는 mobile -> ff 방향으로는 focus duration은 확실히 sync가 안되었었고,
  - 채팅도 정확히 기언은 안나는데, 안되었던 것 같다.

#### Issue 발견 - IMPT, TODO

1. 모바일쪽 채팅은, 그러니까.. 끊어진 당사자는, 계속 연결되었던 participants의 채팅을 복원받지 못한다.
2. 끊어진 당사는 계속 연결되어있던 participants의 disconnection이후의 focus duration을 update받지 못한다.

**지금 너무 오래 기다려서 방에서 나가질지도?**

### UDP DOWN

### TCP UP

왜 계속 시도되는거지?
한번만 하고 말아야 하는데? --- ice negotiation in the server side is expensive!

```bash
send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:28:23.272 transportSlice.ts:373 RESTART_ICE has been sent for send transport
16:28:23.272 transportSlice.ts:251 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:28:23.273 transportSlice.ts:373 RESTART_ICE has been sent for recv transport
16:28:23.317 socketSlice.ts:43 the id of the socket just connected VuMjUdykolxf9E_LAAAF
16:28:23.320 GroupStudy.tsx:30 right before the connect() useEffect
16:28:23.339 transportSlice.ts:304 AckResponse has been received for send transport
16:28:23.339 transportSlice.ts:307 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a RESTART_ICE_ACK_CB is invoked with res [object Object]
16:28:23.369 transportSlice.ts:304 AckResponse has been received for recv transport
16:28:23.370 transportSlice.ts:307 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b RESTART_ICE_ACK_CB is invoked with res [object Object]
16:28:23.402 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:28:23.402 transportSlice.ts:123 inside send transport's connectionstatechange - disconnected
16:28:23.402 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:28:23.402 transportSlice.ts:207 inside recv transport's connectionstatechange - disconnected
16:28:38.792 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:28:38.793 transportSlice.ts:128 inside send transport's connectionstatechange - failed
16:28:38.793 transportSlice.ts:251 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:28:38.796 transportSlice.ts:373 RESTART_ICE has been sent for send transport
16:28:38.805 transportSlice.ts:304 AckResponse has been received for send transport
16:28:38.805 transportSlice.ts:307 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a RESTART_ICE_ACK_CB is invoked with res [object Object]
16:28:38.823 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:28:38.823 transportSlice.ts:123 inside send transport's connectionstatechange - disconnected
16:28:39.074 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:28:39.075 transportSlice.ts:212 inside recv transport's connectionstatechange - failed
16:28:39.075 transportSlice.ts:251 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:28:39.077 transportSlice.ts:373 RESTART_ICE has been sent for recv transport
16:28:39.082 transportSlice.ts:304 AckResponse has been received for recv transport
16:28:39.082 transportSlice.ts:307 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b RESTART_ICE_ACK_CB is invoked with res [object Object]
16:28:39.098 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:28:39.099 transportSlice.ts:207 inside recv transport's connectionstatechange - disconnected
16:28:54.170 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:28:54.170 transportSlice.ts:128 inside send transport's connectionstatechange - failed
16:28:54.171 transportSlice.ts:251 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:28:54.173 transportSlice.ts:373 RESTART_ICE has been sent for send transport
16:28:54.182 transportSlice.ts:304 AckResponse has been received for send transport
16:28:54.182 transportSlice.ts:307 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a RESTART_ICE_ACK_CB is invoked with res [object Object]
16:28:54.204 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:28:54.204 transportSlice.ts:123 inside send transport's connectionstatechange - disconnected
16:28:54.824 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:28:54.825 transportSlice.ts:212 inside recv transport's connectionstatechange - failed
16:28:54.825 transportSlice.ts:251 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:28:54.827 transportSlice.ts:373 RESTART_ICE has been sent for recv transport
16:28:54.840 transportSlice.ts:304 AckResponse has been received for recv transport
16:28:54.840 transportSlice.ts:307 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b RESTART_ICE_ACK_CB is invoked with res [object Object]
16:28:54.857 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:28:54.857 transportSlice.ts:207 inside recv transport's connectionstatechange - disconnected
16:29:09.543 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:29:09.544 transportSlice.ts:128 inside send transport's connectionstatechange - failed
16:29:09.544 transportSlice.ts:251 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:29:09.547 transportSlice.ts:373 RESTART_ICE has been sent for send transport
16:29:09.553 transportSlice.ts:304 AckResponse has been received for send transport
16:29:09.553 transportSlice.ts:307 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a RESTART_ICE_ACK_CB is invoked with res [object Object]
16:29:09.572 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:29:09.572 transportSlice.ts:123 inside send transport's connectionstatechange - disconnected
16:29:10.636 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:29:10.637 transportSlice.ts:212 inside recv transport's connectionstatechange - failed
16:29:10.637 transportSlice.ts:251 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:29:10.639 transportSlice.ts:373 RESTART_ICE has been sent for recv transport
16:29:10.645 transportSlice.ts:304 AckResponse has been received for recv transport
16:29:10.645 transportSlice.ts:307 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b RESTART_ICE_ACK_CB is invoked with res [object Object]
16:29:10.658 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:29:10.658 transportSlice.ts:207 inside recv transport's connectionstatechange - disconnected
16:29:24.980 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:29:24.980 transportSlice.ts:128 inside send transport's connectionstatechange - failed
16:29:24.980 transportSlice.ts:251 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:29:24.982 transportSlice.ts:373 RESTART_ICE has been sent for send transport
16:29:24.991 transportSlice.ts:304 AckResponse has been received for send transport
16:29:24.992 transportSlice.ts:307 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a RESTART_ICE_ACK_CB is invoked with res [object Object]
16:29:25.012 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:29:25.013 transportSlice.ts:123 inside send transport's connectionstatechange - disconnected
16:29:26.387 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:29:26.387 transportSlice.ts:212 inside recv transport's connectionstatechange - failed
16:29:26.387 transportSlice.ts:251 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:29:26.390 transportSlice.ts:373 RESTART_ICE has been sent for recv transport
16:29:26.395 transportSlice.ts:304 AckResponse has been received for recv transport
16:29:26.396 transportSlice.ts:307 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b RESTART_ICE_ACK_CB is invoked with res [object Object]
16:29:26.413 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:29:26.413 transportSlice.ts:207 inside recv transport's connectionstatechange - disconnected
16:29:40.355 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:29:40.356 transportSlice.ts:128 inside send transport's connectionstatechange - failed
16:29:40.356 transportSlice.ts:251 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:29:40.358 transportSlice.ts:373 RESTART_ICE has been sent for send transport
16:29:40.364 transportSlice.ts:304 AckResponse has been received for send transport
16:29:40.365 transportSlice.ts:307 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a RESTART_ICE_ACK_CB is invoked with res [object Object]
16:29:40.378 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:29:40.378 transportSlice.ts:123 inside send transport's connectionstatechange - disconnected
16:29:42.199 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:29:42.199 transportSlice.ts:212 inside recv transport's connectionstatechange - failed
16:29:42.200 transportSlice.ts:251 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:29:42.202 transportSlice.ts:373 RESTART_ICE has been sent for recv transport
16:29:42.206 transportSlice.ts:304 AckResponse has been received for recv transport
16:29:42.206 transportSlice.ts:307 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b RESTART_ICE_ACK_CB is invoked with res [object Object]
16:29:42.224 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:29:42.225 transportSlice.ts:207 inside recv transport's connectionstatechange - disconnected
```

### UDP UP

위에 로그 이후 부분

```bash
inside send transport's connectionstatechange event handler
16:29:55.731 transportSlice.ts:128 inside send transport's connectionstatechange - failed
16:29:55.731 transportSlice.ts:251 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:29:55.733 transportSlice.ts:373 RESTART_ICE has been sent for send transport
16:29:55.740 transportSlice.ts:304 AckResponse has been received for send transport
16:29:55.740 transportSlice.ts:307 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a RESTART_ICE_ACK_CB is invoked with res [object Object]
16:29:55.755 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:29:55.755 transportSlice.ts:123 inside send transport's connectionstatechange - disconnected
16:29:58.011 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:29:58.011 transportSlice.ts:212 inside recv transport's connectionstatechange - failed
16:29:58.011 transportSlice.ts:251 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:29:58.013 transportSlice.ts:373 RESTART_ICE has been sent for recv transport
16:29:58.017 transportSlice.ts:304 AckResponse has been received for recv transport
16:29:58.018 transportSlice.ts:307 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b RESTART_ICE_ACK_CB is invoked with res [object Object]
16:29:58.033 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:29:58.033 transportSlice.ts:207 inside recv transport's connectionstatechange - disconnected
16:30:11.106 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:30:11.106 transportSlice.ts:128 inside send transport's connectionstatechange - failed
16:30:11.106 transportSlice.ts:251 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:30:11.107 transportSlice.ts:373 RESTART_ICE has been sent for send transport
16:30:11.113 transportSlice.ts:304 AckResponse has been received for send transport
16:30:11.113 transportSlice.ts:307 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a RESTART_ICE_ACK_CB is invoked with res [object Object]
16:30:11.125 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:30:11.125 transportSlice.ts:123 inside send transport's connectionstatechange - disconnected
16:30:13.762 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:30:13.763 transportSlice.ts:212 inside recv transport's connectionstatechange - failed
16:30:13.763 transportSlice.ts:251 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:30:13.765 transportSlice.ts:373 RESTART_ICE has been sent for recv transport
16:30:13.770 transportSlice.ts:304 AckResponse has been received for recv transport
16:30:13.771 transportSlice.ts:307 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b RESTART_ICE_ACK_CB is invoked with res [object Object]
16:30:13.792 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:30:13.792 transportSlice.ts:207 inside recv transport's connectionstatechange - disconnected
16:30:26.481 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:30:26.482 transportSlice.ts:128 inside send transport's connectionstatechange - failed
16:30:26.482 transportSlice.ts:251 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:30:26.486 transportSlice.ts:373 RESTART_ICE has been sent for send transport
16:30:26.491 transportSlice.ts:304 AckResponse has been received for send transport
16:30:26.491 transportSlice.ts:307 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a RESTART_ICE_ACK_CB is invoked with res [object Object]
16:30:26.506 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:30:26.506 transportSlice.ts:123 inside send transport's connectionstatechange - disconnected
16:30:29.515 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:30:29.516 transportSlice.ts:212 inside recv transport's connectionstatechange - failed
16:30:29.516 transportSlice.ts:251 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:30:29.518 transportSlice.ts:373 RESTART_ICE has been sent for recv transport
16:30:29.523 transportSlice.ts:304 AckResponse has been received for recv transport
16:30:29.523 transportSlice.ts:307 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b RESTART_ICE_ACK_CB is invoked with res [object Object]
16:30:29.536 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:30:29.536 transportSlice.ts:207 inside recv transport's connectionstatechange - disconnected
16:30:41.856 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:30:41.856 transportSlice.ts:128 inside send transport's connectionstatechange - failed
16:30:41.856 transportSlice.ts:251 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:30:41.858 transportSlice.ts:373 RESTART_ICE has been sent for send transport
16:30:41.862 transportSlice.ts:304 AckResponse has been received for send transport
16:30:41.863 transportSlice.ts:307 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a RESTART_ICE_ACK_CB is invoked with res [object Object]
16:30:41.881 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:30:41.881 transportSlice.ts:123 inside send transport's connectionstatechange - disconnected
16:30:45.262 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:30:45.263 transportSlice.ts:212 inside recv transport's connectionstatechange - failed
16:30:45.263 transportSlice.ts:251 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:30:45.265 transportSlice.ts:373 RESTART_ICE has been sent for recv transport
16:30:45.271 transportSlice.ts:304 AckResponse has been received for recv transport
16:30:45.272 transportSlice.ts:307 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b RESTART_ICE_ACK_CB is invoked with res [object Object]
16:30:45.285 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:30:45.285 transportSlice.ts:207 inside recv transport's connectionstatechange - disconnected
16:30:57.232 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:30:57.233 transportSlice.ts:128 inside send transport's connectionstatechange - failed
16:30:57.233 transportSlice.ts:251 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:30:57.234 transportSlice.ts:373 RESTART_ICE has been sent for send transport
16:30:57.238 transportSlice.ts:304 AckResponse has been received for send transport
16:30:57.239 transportSlice.ts:307 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a RESTART_ICE_ACK_CB is invoked with res [object Object]
16:30:57.251 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:30:57.252 transportSlice.ts:123 inside send transport's connectionstatechange - disconnected
16:31:01.073 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:31:01.074 transportSlice.ts:212 inside recv transport's connectionstatechange - failed
16:31:01.074 transportSlice.ts:251 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:31:01.075 transportSlice.ts:373 RESTART_ICE has been sent for recv transport
16:31:01.091 transportSlice.ts:304 AckResponse has been received for recv transport
16:31:01.091 transportSlice.ts:307 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b RESTART_ICE_ACK_CB is invoked with res [object Object]
16:31:01.108 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:31:01.108 transportSlice.ts:207 inside recv transport's connectionstatechange - disconnected
16:31:12.605 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:31:12.606 transportSlice.ts:128 inside send transport's connectionstatechange - failed
16:31:12.606 transportSlice.ts:251 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:31:12.608 transportSlice.ts:373 RESTART_ICE has been sent for send transport
16:31:12.613 transportSlice.ts:304 AckResponse has been received for send transport
16:31:12.613 transportSlice.ts:307 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a RESTART_ICE_ACK_CB is invoked with res [object Object]
16:31:12.631 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:31:12.631 transportSlice.ts:123 inside send transport's connectionstatechange - disconnected
16:31:16.824 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:31:16.825 transportSlice.ts:212 inside recv transport's connectionstatechange - failed
16:31:16.825 transportSlice.ts:251 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:31:16.827 transportSlice.ts:373 RESTART_ICE has been sent for recv transport
16:31:16.832 transportSlice.ts:304 AckResponse has been received for recv transport
16:31:16.833 transportSlice.ts:307 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b RESTART_ICE_ACK_CB is invoked with res [object Object]
16:31:16.851 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:31:16.852 transportSlice.ts:207 inside recv transport's connectionstatechange - disconnected
16:31:28.043 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:31:28.043 transportSlice.ts:128 inside send transport's connectionstatechange - failed
16:31:28.044 transportSlice.ts:251 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:31:28.046 transportSlice.ts:373 RESTART_ICE has been sent for send transport
16:31:28.076 transportSlice.ts:304 AckResponse has been received for send transport
16:31:28.077 transportSlice.ts:307 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a RESTART_ICE_ACK_CB is invoked with res [object Object]
16:31:28.136 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:31:28.136 transportSlice.ts:123 inside send transport's connectionstatechange - disconnected
16:31:32.575 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:31:32.575 transportSlice.ts:212 inside recv transport's connectionstatechange - failed
16:31:32.575 transportSlice.ts:251 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:31:32.577 transportSlice.ts:373 RESTART_ICE has been sent for recv transport
16:31:32.592 transportSlice.ts:304 AckResponse has been received for recv transport
16:31:32.593 transportSlice.ts:307 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b RESTART_ICE_ACK_CB is invoked with res [object Object]
16:31:32.606 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:31:32.607 transportSlice.ts:207 inside recv transport's connectionstatechange - disconnected
16:31:43.542 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:31:43.543 transportSlice.ts:128 inside send transport's connectionstatechange - failed
16:31:43.543 transportSlice.ts:251 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:31:43.545 transportSlice.ts:373 RESTART_ICE has been sent for send transport
16:31:43.549 transportSlice.ts:304 AckResponse has been received for send transport
16:31:43.550 transportSlice.ts:307 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a RESTART_ICE_ACK_CB is invoked with res [object Object]
16:31:43.570 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:31:43.570 transportSlice.ts:123 inside send transport's connectionstatechange - disconnected
16:31:48.386 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:31:48.386 transportSlice.ts:212 inside recv transport's connectionstatechange - failed
16:31:48.387 transportSlice.ts:251 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:31:48.389 transportSlice.ts:373 RESTART_ICE has been sent for recv transport
16:31:48.396 transportSlice.ts:304 AckResponse has been received for recv transport
16:31:48.396 transportSlice.ts:307 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b RESTART_ICE_ACK_CB is invoked with res [object Object]
16:31:48.408 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:31:48.408 transportSlice.ts:207 inside recv transport's connectionstatechange - disconnected
16:31:58.980 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:31:58.981 transportSlice.ts:128 inside send transport's connectionstatechange - failed
16:31:58.981 transportSlice.ts:251 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:31:58.982 transportSlice.ts:373 RESTART_ICE has been sent for send transport
16:31:58.987 transportSlice.ts:304 AckResponse has been received for send transport
16:31:58.988 transportSlice.ts:307 send transport 79b72e56-cfe8-4814-8b65-5bf904fb0b2a RESTART_ICE_ACK_CB is invoked with res [object Object]
16:31:59.004 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:31:59.004 transportSlice.ts:123 inside send transport's connectionstatechange - disconnected
16:32:04.138 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:32:04.138 transportSlice.ts:212 inside recv transport's connectionstatechange - failed
16:32:04.139 transportSlice.ts:251 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b is starting ICE RESTART ATTEMPT inside attemptIceRestart()
16:32:04.140 transportSlice.ts:373 RESTART_ICE has been sent for recv transport
16:32:04.146 transportSlice.ts:304 AckResponse has been received for recv transport
16:32:04.147 transportSlice.ts:307 recv transport 5b1bb5fa-a2dc-4546-80e3-f942a443722b RESTART_ICE_ACK_CB is invoked with res [object Object]
16:32:04.159 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:32:04.160 transportSlice.ts:207 inside recv transport's connectionstatechange - disconnected
16:32:04.487 transportSlice.ts:78 inside send transport's connectionstatechange event handler
16:32:04.488 transportSlice.ts:82 inside send transport's connectionstatechange - connected
16:32:04.587 transportSlice.ts:186 inside recv transport's connectionstatechange event handler
16:32:04.587 transportSlice.ts:191 inside recv transport's connectionstatechange - connected
```

# 마저 해야할 것들

1. udp를 먼저 up하고, tcp를 up
2. edge case 시나리오 의도적으로 구현.
3. 아까 위에서 언급한 update문제 해결 <-- 이게 제일 중요함.

# Typora root에서 이어서 하겠음.
