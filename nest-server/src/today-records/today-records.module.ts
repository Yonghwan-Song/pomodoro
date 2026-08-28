import { Module } from '@nestjs/common';
import { TodayRecordsController } from './today-records.controller';
import { TodayRecordsService } from './today-records.service';

@Module({
  controllers: [TodayRecordsController],
  providers: [TodayRecordsService],
})
export class TodayRecordsModule {}
