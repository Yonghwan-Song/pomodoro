import { Module } from '@nestjs/common';
import { MediasoupService } from './mediasoup.service';
import * as os from 'os';
import { LOCAL_IP } from 'src/common/webrtc/constants';

const localIpProvider = {
  provide: LOCAL_IP,
  useFactory: (): string[] => {
    // AP Isolation이 작동할때도 있고 아닐때도 있어서 만듦. 작동하면 그냥 하면 되고 안하면, env값으로 local ip명시해서 app run하면 된다.
    const override = process.env.MEDIASOUP_ANNOUNCED_IPS;
    if (override) {
      const ips = override
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      console.log('MEDIASOUP_ANNOUNCED_IPS override active:', ips);
      return ips;
    }

    const networkInterfaces = os.networkInterfaces();
    const ips: string[] = [];

    console.log('networkInterfaces - ', networkInterfaces);
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      if (interfaces) {
        for (const iface of interfaces) {
          if (iface.family === 'IPv4' && !iface.internal) {
            ips.push(iface.address);
          }
        }
      }
    }
    console.log('Ip interfaces array', ips);
    return ips.length > 0 ? ips : ['127.0.0.1'];
  },
};

@Module({
  providers: [MediasoupService, localIpProvider],
  exports: [MediasoupService],
})
export class MediasoupModule {}
