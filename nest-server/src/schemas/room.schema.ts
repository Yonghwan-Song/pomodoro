import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoomDocument = HydratedDocument<Room>;

// NOTE: from `/home/yhs/Repos/integrate-webrtc-by-gemini/pomodoro/nest-server/src/group-study-management/entities/room.entity.ts`
// public readonly id: string; <--- mongodb's ObjectId
// public readonly name: string; <---
// public readonly peers: Map<string, Peer> = new Map(); <--- User's.... map?
// public readonly createdAt: Date; <---

@Schema({ timestamps: true })
export class Room {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, default: false })
  isPermanent: boolean; // empty여도 지워지지 않는 방을 만들려고 설정한 property. 이 값은 내가 그냥 db에서 직접 true로 바꿔놓을것임 그렇게 해서 permanent한 방을 만들고,
  // 사용자에게는 이 값을 수정할 수 있는 루트를 제공하지 않겠음. 우선.

  @Prop({ default: 4 })
  maxPeers: number;
}

export const RoomSchema = SchemaFactory.createForClass(Room);
