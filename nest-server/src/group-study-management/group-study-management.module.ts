import { Module } from '@nestjs/common';
import { GroupStudyManagementService } from './group-study-management.service';
import { MediasoupModule } from 'src/mediasoup/mediasoup.module';

@Module({
  imports: [MediasoupModule],
  controllers: [],
  providers: [GroupStudyManagementService],
  exports: [GroupStudyManagementService],
})
export class GroupStudyManagementModule {}
