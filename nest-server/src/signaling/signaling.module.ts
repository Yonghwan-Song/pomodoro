import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { MediasoupModule } from 'src/mediasoup/mediasoup.module';
import { GroupStudyManagementModule } from 'src/group-study-management/group-study-management.module';

@Module({
  imports: [MediasoupModule, GroupStudyManagementModule],
  providers: [SignalingGateway]
})
export class SignalingModule {}
