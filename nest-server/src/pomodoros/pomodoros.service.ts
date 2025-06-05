import { Injectable } from '@nestjs/common';
import { CreatePomodoroDto } from './dto/create-pomodoro.dto';
import { CreateDemoDataDto } from './dto/create-demo-data.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Pomodoro } from 'src/schemas/pomodoro.schema';
import { Model } from 'mongoose';
import { Category } from 'src/schemas/category.schema';
import { TodoistTaskTracking } from 'src/schemas/todoistTaskTracking.schema';

@Injectable()
export class PomodorosService {
  constructor(
    @InjectModel(Pomodoro.name) private pomodoroModel: Model<Pomodoro>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(TodoistTaskTracking.name)
    private todoistTaskTrackingModel: Model<TodoistTaskTracking>,
  ) {}

  // task 끼리 계산해서 묶어주면,
  async persistPomodoroRecordsAndTaskTrackingDurations(
    createPomodoroDto: CreatePomodoroDto,
    userEmail: string,
  ) {
    console.log('Received createPomodoroDto in service:', createPomodoroDto);

    const arrayOfObjectsModifiedForPomodoroDoc = [];

    for (const val of createPomodoroDto.pomodoroRecordArr) {
      const recordToPush: any = { ...val, userEmail };

      // Handle category reference
      if (val.category) {
        const currentCategory = await this.categoryModel
          .findOne({
            userEmail,
            name: val.category.name,
          })
          .exec();

        if (currentCategory) {
          recordToPush.category = currentCategory._id;
        } else {
          // Optionally handle missing category (e.g., skip or throw error)
          recordToPush.category = undefined;
        }
      }

      // Handle task reference (if you want to store taskId as a string)
      if (val.task) {
        recordToPush.taskId = val.task.id;
        // Optionally remove the nested task object
        delete recordToPush.task;
      }

      arrayOfObjectsModifiedForPomodoroDoc.push(recordToPush);
    }

    console.log(
      'arrayOfObjectsModifiedForPomodoroDoc in persistPomodoroRecords',
      arrayOfObjectsModifiedForPomodoroDoc,
    );

    const pomodoroRecordPersistResult = await this.pomodoroModel.insertMany(
      arrayOfObjectsModifiedForPomodoroDoc,
    );

    const taskTrackingDurationsToPersist =
      createPomodoroDto.taskTrackingArr.map((tracking) => ({
        ...tracking,
        userEmail, // Add userEmail property
      }));

    // Instead of insertMany, use bulkWrite for upsert+inc
    const bulkOps = taskTrackingDurationsToPersist.map((tracking) => ({
      updateOne: {
        filter: { userEmail: tracking.userEmail, taskId: tracking.taskId },
        update: { $inc: { duration: tracking.duration } },
        upsert: true,
      },
    }));

    const taskTrackingDurationsPersistResult =
      await this.todoistTaskTrackingModel.bulkWrite(bulkOps);

    console.log(
      'taskTrackingDurationsPersistResult in persistPomodoroRecords<--------------------',
      taskTrackingDurationsPersistResult,
    );

    // TODO - userEmail을 제외하고 보내기?
    return { pomodoroRecordPersistResult, taskTrackingDurationsPersistResult };
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
      .populate({
        path: 'category',
        select: '-_id -userEmail -__v',
      })
      .select('-_id -userEmail -isDummy -__v')
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
