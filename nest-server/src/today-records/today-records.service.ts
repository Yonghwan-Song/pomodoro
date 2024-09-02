import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TodayRecord } from 'src/schemas/todayRecord.schema';
import { CreateTodayRecordDto } from './dto/create-today-record.dto';

@Injectable()
export class TodayRecordsService {
  constructor(
    @InjectModel(TodayRecord.name)
    private todayRecordModel: Model<TodayRecord>,
  ) {}

  createTodayRecord(
    createTodayRecordDto: CreateTodayRecordDto,
    userEmail: string,
  ) {
    console.log('createTodayRecordDto', createTodayRecordDto);
    const newRecordOfToday = new this.todayRecordModel({
      userEmail,
      ...createTodayRecordDto,
    });
    return newRecordOfToday.save();
  }

  findTodayRecords(userEmail: string) {
    return this.todayRecordModel.find({ userEmail }).exec();
  }

  deleteRecordsBeforeToday(timestamp: number, userEmail: string) {
    return this.todayRecordModel.deleteMany({
      userEmail,
      startTime: { $lt: timestamp },
    });
  }
}
