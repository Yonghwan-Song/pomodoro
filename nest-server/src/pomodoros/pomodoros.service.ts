import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePomodoroDto } from './dto/create-pomodoro.dto';
import { CreateDemoDataDto } from './dto/create-demo-data.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Pomodoro } from 'src/schemas/pomodoro.schema';
import { Model } from 'mongoose';
import { Category } from 'src/schemas/category.schema';

@Injectable()
export class PomodorosService {
  constructor(
    @InjectModel(Pomodoro.name) private pomodoroModel: Model<Pomodoro>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  async addPomodoroRecord(
    createPomodoroDto: CreatePomodoroDto,
    userEmail: string,
  ) {
    const { currentCategoryName, ...restDTO } = createPomodoroDto;

    console.log(`currentCategoryName === ${currentCategoryName}`);

    if (currentCategoryName) {
      const currentCategory = await this.categoryModel
        .findOne({
          userEmail,
          name: currentCategoryName,
        })
        .exec();

      if (currentCategory) {
        const newPomodoroRecord = new this.pomodoroModel({
          userEmail,
          ...restDTO,
          category: currentCategory._id,
        });
        return await newPomodoroRecord.save();
      } else {
        throw new NotFoundException('Category not found');
      }
    } else {
      // currentCategoryName could be undefined since it is an optional field in the CreatePomodoroDto class.
      const newPomodoroRecord = new this.pomodoroModel({
        userEmail,
        ...restDTO,
      });
      return await newPomodoroRecord.save();
    }
  }

  async getAllPomodoroRecordsByUserEmail(userEmail: string) {
    const categories = await this.categoryModel.find({ userEmail }).exec();

    const cateInfoForStat = categories.reduce<
      { name: string; color: string; isOnStat: boolean }[]
    >((previousValue, currentValue) => {
      const { name, color, isOnStat } = currentValue;
      previousValue.push({ name, color, isOnStat });
      return previousValue;
    }, []);
    const pomodoroDocs = await this.pomodoroModel
      .find({ userEmail })
      .populate('category')
      .exec();

    return pomodoroDocs;
    return { pomodoroDocs, cateInfoForStat };
  }

  createDemoData(createDemoDataDto: CreateDemoDataDto, userEmail: string) {
    const { timestampForBeginningOfYesterday, timezoneOffset } =
      createDemoDataDto;

    let pomodoroRecords = [];
    const _24h = 24 * 60 * 60 * 1000;
    const fromClient = new Date(timestampForBeginningOfYesterday); //TODO: 중복인 것 같아.

    console.log(fromClient.getTime());
    console.log(timestampForBeginningOfYesterday);

    for (let i = 0; i < 40; i++) {
      // Generate an array of records of a day
      const aDateInThePast = new Date(fromClient.getTime() - _24h * i);
      const aDate = {
        year: aDateInThePast.getFullYear(),
        month: aDateInThePast.getMonth(),
        day: aDateInThePast.getDate(),
      };
      const arrOfDemoPomodoroRecords = [
        ...createRecords({
          when: { ...aDate, hours: 8 },
          timezoneOffset,
          pomoDuration: 25,
          shortBreak: 5,
          longBreak: 15,
          numOfPomo: 4,
          numOfCycle: Math.trunc(generateRandomNumOfCycle(0, 3)),
          userEmail,
        }),
        ...createRecords({
          when: { ...aDate, hours: 13 },
          timezoneOffset,
          pomoDuration: 25,
          shortBreak: 5,
          longBreak: 15,
          numOfPomo: 4,
          numOfCycle: Math.trunc(generateRandomNumOfCycle(0, 3)),
          userEmail,
        }),
        ...createRecords({
          when: { ...aDate, hours: 18 },
          timezoneOffset,
          pomoDuration: 25,
          shortBreak: 5,
          longBreak: 15,
          numOfPomo: 4,
          numOfCycle: Math.trunc(generateRandomNumOfCycle(0, 3)),
          userEmail,
        }),
      ];
      pomodoroRecords = [...pomodoroRecords, ...arrOfDemoPomodoroRecords];
    }

    const arrOfPomodoroDocs = pomodoroRecords.map((aPomodoroRecord) => {
      aPomodoroRecord.isDummy = true;
      return new this.pomodoroModel(aPomodoroRecord);
    });

    return this.pomodoroModel.bulkSave(arrOfPomodoroDocs);
  }

  deleteDemoData(userEmail: string) {
    return this.pomodoroModel
      .deleteMany({
        isDummy: true,
        userEmail,
      })
      .exec();
  }
}

/**
 * Generate pomodoro records starting from the when argument.
 * And then return the records which are Pomodoro documents.
 */
function createRecords({
  when,
  timezoneOffset,
  pomoDuration,
  shortBreak,
  longBreak,
  numOfPomo,
  numOfCycle,
  userEmail,
}: {
  when: { year: number; month: number; day: number; hours: number };
  timezoneOffset: number;
  pomoDuration: number;
  shortBreak: number;
  longBreak: number;
  numOfPomo: number;
  numOfCycle: number;
  userEmail: string;
}) {
  let startTime = new Date(
    when.year,
    when.month,
    when.day,
    when.hours,
  ).getTime();

  // min -> millisec
  const timesInMilliSeconds = {
    pomoDuration: pomoDuration * 60 * 1000,
    shortBreak: shortBreak * 60 * 1000,
    longBreak: longBreak * 60 * 1000,
  };

  const pomoRecordArr = [];

  // This is the timestamp to create a client's local date.
  const dateWithAdjustedTimestamp = new Date(
    startTime - timezoneOffset * 60 * 1000,
  );

  for (let i = 0; i < numOfCycle; i++) {
    for (let j = 0; j < numOfPomo; j++) {
      pomoRecordArr.push({
        userEmail,
        duration: pomoDuration,
        startTime,
        date: `${
          dateWithAdjustedTimestamp.getUTCMonth() + 1
        }/${dateWithAdjustedTimestamp.getUTCDate()}/${dateWithAdjustedTimestamp.getUTCFullYear()}`,
      });
      if (j == numOfPomo - 1) {
        startTime +=
          timesInMilliSeconds.pomoDuration + timesInMilliSeconds.longBreak;
      } else {
        startTime +=
          timesInMilliSeconds.pomoDuration + timesInMilliSeconds.shortBreak;
      }
    }
  }

  return pomoRecordArr;
}

function generateRandomNumOfCycle(min, max) {
  return Math.random() * (max - min) + min;
}
