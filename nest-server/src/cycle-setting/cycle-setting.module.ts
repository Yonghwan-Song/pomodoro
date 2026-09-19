import { Module } from '@nestjs/common';
import { CycleSettingService } from './cycle-setting.service';
import { CycleSettingController } from './cycle-setting.controller';

@Module({
  controllers: [CycleSettingController],
  providers: [CycleSettingService],
  // exports: [CycleSettingService],
})
export class CycleSettingModule {}
