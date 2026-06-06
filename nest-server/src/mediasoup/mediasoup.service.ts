import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import * as mediasoup from 'mediasoup';
import type { WebRtcTransport } from 'mediasoup/types';
import { LOCAL_IP } from 'src/common/webrtc/constants';

@Injectable()
export class MediasoupService implements OnModuleInit {
  private worker: mediasoup.types.Worker;
  private router: mediasoup.types.Router;

  constructor(@Inject(LOCAL_IP) private readonly announcedIps: string[]) {}

  async onModuleInit() {
    this.worker = await mediasoup.createWorker();
    this.router = await this.worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000
          }
        }
      ]
    });

    console.log('this.worker process ID: ', this.worker.pid);
    console.log('this.router.id: ', this.router.id);
  }

  getRtpCapabilities() {
    return this.router.rtpCapabilities;
  }

  async getWebRtcTransport(): Promise<WebRtcTransport> {
    // HACK: local reconnect 테스트 위해 TCP listenInfo 제거. 배포 시 TCP entry 다시 활성화할 것.
    // listenInfos가 있으면 enableTcp 옵션은 무시되므로, TCP를 진짜 끄려면 여기서 제외해야 함.
    const listenInfos: mediasoup.types.TransportListenInfo[] =
      this.announcedIps.flatMap((ip) => [
        {
          protocol: 'udp' as const,
          ip: '0.0.0.0',
          announcedAddress: ip,
          portRange: { min: 20000, max: 20200 }
        }
        // {
        //   protocol: 'tcp' as const,
        //   ip: '0.0.0.0',
        //   announcedAddress: ip
        // }
      ]);

    const webRtcTransport = await this.router.createWebRtcTransport({
      listenInfos,
      enableUdp: true,
      // enableTcp: true,
      enableTcp: false,
      preferUdp: true
    });

    console.log(
      `Mediasoup transport created with announced Addresses: ${this.announcedIps.join(
        ', '
      )}`
    );

    return webRtcTransport;
  }

  checkIfClientCanConsume(
    producerId: string,
    rtpCapabilities: mediasoup.types.RtpCapabilities
  ) {
    return this.router.canConsume({ producerId, rtpCapabilities });
  }

  async createConsumer(
    recvTransport: WebRtcTransport,
    producerId: string,
    rtpCapabilities: mediasoup.types.RtpCapabilities
  ) {
    return await recvTransport.consume({
      producerId,
      rtpCapabilities,
      paused: true
    });
  }
}
