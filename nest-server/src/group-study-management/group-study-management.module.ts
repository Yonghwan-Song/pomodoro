import { Module } from '@nestjs/common';
import { GroupStudyManagementService } from './group-study-management.service';
import { MediasoupModule } from 'src/mediasoup/mediasoup.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Room, RoomSchema } from 'src/schemas/room.schema';

@Module({
  imports: [
    MediasoupModule,
    MongooseModule.forFeature([{ name: Room.name, schema: RoomSchema }]),
  ],
  controllers: [],
  providers: [GroupStudyManagementService],
  exports: [GroupStudyManagementService],
})
export class GroupStudyManagementModule {}

// DESIGN: 이 모듈에서는 그냥 기존에 있는 Room을 가져와서 참가자를 추가하고 뭐... 그런 작업을 하면 되지 않으려나 싶다.
// 그리고... getRoomList도 그냥 여기서?....
