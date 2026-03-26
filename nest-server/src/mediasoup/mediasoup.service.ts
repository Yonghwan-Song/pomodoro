import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import * as mediasoup from 'mediasoup';
import type { WebRtcTransport } from 'mediasoup/types';
import { LOCAL_IP } from 'src/common/webrtc/constants';

@Injectable()
export class MediasoupService implements OnModuleInit {
  private worker: mediasoup.types.Worker;
  private router: mediasoup.types.Router;

  constructor(@Inject(LOCAL_IP) private readonly announcedIp: string) {}

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

  getRtcCapabilities() {
    return this.router.rtpCapabilities;
  }

  async getWebRtcTransport(): Promise<WebRtcTransport> {
    const webRtcTransport = await this.router.createWebRtcTransport({
      listenInfos: [
        {
          protocol: 'udp',
          ip: '0.0.0.0',
          announcedAddress: this.announcedIp
        }
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true
    });

    console.log(
      `Mediasoup transport created with announced Address: ${this.announcedIp}`
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
