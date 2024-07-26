import { Module } from '@nestjs/common';
import { TodayRecordsController } from './today-records.controller';
import { TodayRecordsService } from './today-records.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TodayRecord, TodayRecordSchema } from 'src/schemas/todayRecord.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TodayRecord.name, schema: TodayRecordSchema },
    ]),
  ],
  controllers: [TodayRecordsController],
  providers: [TodayRecordsService],
})
export class TodayRecordsModule {}
