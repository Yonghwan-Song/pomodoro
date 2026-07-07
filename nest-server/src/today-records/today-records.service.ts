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

  // NOTE:
  // 그러니까 강제로... 접속하자마자 그 접속 시간 이전의 데이터는 그냥 다 지워버리고
  // 그다음에 결국 남아있는 데이터를 다 가져오도록 하는거지...
  // 그렇게 해서 findTodayRecords에서 "Today"라는 개념이 형성된 것인데... 시발러마... 대가리깬다..
  // Today를 그냥 시발 timestamp 조건문을 이용해서 가져가면 되는거지 무슨 왜 데이터를 지워... 소중한 데이터를 ...
  // TODO: 위의 비판을 읽고
  // 1)FE에서 delete하는 modifier를 없앤다?...(이게 정말 맞는 말인지 확인하고 다시해보면 된다)
  // 2)로직 아래에 있는거 지우고 위의 말처럼 timestamp로 get today records를 구현.
  findTodayRecords(userEmail: string, timestamp?: number) {
    if (timestamp) {
      return this.todayRecordModel
        .find({
          userEmail,
          startTime: { $gte: timestamp },
        })
        .exec();
    }
    return this.todayRecordModel.find({ userEmail }).exec();
  }

  deleteRecordsBeforeToday(timestamp: number, userEmail: string) {
    return this.todayRecordModel.deleteMany({
      userEmail,
      startTime: { $lt: timestamp },
    });
  }

  async seedDummyData(userEmail: string) {
    const NOW = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const YESTERDAY = NOW - ONE_DAY;

    const dummyData = [
      {
        userEmail,
        kind: 'pomo',
        startTime: YESTERDAY,
        endTime: YESTERDAY + 25 * 60 * 1000,
        timeCountedDown: 25 * 60,
        pause: { pause: { totalLength: 0, record: [] } },
      },
      {
        userEmail,
        kind: 'break',
        startTime: YESTERDAY + 30 * 60 * 1000,
        endTime: YESTERDAY + 35 * 60 * 1000,
        timeCountedDown: 5 * 60,
        pause: { pause: { totalLength: 0, record: [] } },
      },
      {
        userEmail,
        kind: 'pomo',
        startTime: NOW - 2 * 60 * 60 * 1000, // 2 hours ago
        endTime: NOW - 1.5 * 60 * 60 * 1000,
        timeCountedDown: 30 * 60,
        pause: { pause: { totalLength: 0, record: [] } },
      },
      {
        userEmail,
        kind: 'pomo',
        startTime: NOW - 1 * 60 * 60 * 1000, // 1 hour ago
        endTime: NOW - 0.5 * 60 * 60 * 1000,
        timeCountedDown: 30 * 60,
        pause: { pause: { totalLength: 0, record: [] } },
      },
    ];

    await this.todayRecordModel.insertMany(dummyData);
    return { message: 'Dummy data seeded', count: dummyData.length };
  }
}
