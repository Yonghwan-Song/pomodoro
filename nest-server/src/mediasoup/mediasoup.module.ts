import { Module } from '@nestjs/common';
import { MediasoupService } from './mediasoup.service';
import * as os from 'os';
import { LOCAL_IP } from 'src/common/webrtc/constants';

const localIpProvider = {
  provide: LOCAL_IP,
  useFactory: (): string => {
    const networkInterfaces = os.networkInterfaces();

    console.log('networkInterfaces - ', networkInterfaces);
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      if (interfaces) {
        for (const iface of interfaces) {
          if (iface.family === 'IPv4' && !iface.internal) {
            return iface.address;
          }
        }
      }
    }
    return '127.0.0.1';
  }
};

@Module({
  providers: [MediasoupService, localIpProvider],
  exports: [MediasoupService]
})
export class MediasoupModule {}
