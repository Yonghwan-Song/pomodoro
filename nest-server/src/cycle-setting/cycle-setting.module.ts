import { Module } from '@nestjs/common';
import { CycleSettingService } from './cycle-setting.service';
import { CycleSettingController } from './cycle-setting.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import {
  CycleSetting,
  CycleSettingSchema,
} from 'src/schemas/cycleSetting.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CycleSetting.name, schema: CycleSettingSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CycleSettingController],
  providers: [CycleSettingService],
  // exports: [CycleSettingService],
})
export class CycleSettingModule {}
