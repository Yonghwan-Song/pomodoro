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

  async persistPomodoroRecords(
    createPomodoroDto: CreatePomodoroDto,
    userEmail: string,
  ) {
    const documentsWithCategoriesPopulated = [];

    for (const val of createPomodoroDto.pomodoroRecordArr) {
      if (val.category) {
        const currentCategory = await this.categoryModel //<------- we got object as a whole and use it's property _id.
          .findOne({
            userEmail,
            name: val.category.name,
          })
          .exec();
        documentsWithCategoriesPopulated.push({
          ...val,
          category: currentCategory._id,
        });
      } else {
        documentsWithCategoriesPopulated.push({
          ...val,
        });
      }
    }

    const result = await this.pomodoroModel.insertMany(
      documentsWithCategoriesPopulated,
    );

    return result;
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

//#region Type definitions
type InfoType = {
  kind: 'category' | 'pause' | 'endOfSession';
  name?: string | 'start' | 'end';
  timestamp: number;
};
type M = {
  c_duration_array: {
    categoryName: string;
    duration: number;
    startTime: number;
  }[];
  currentCategoryName: string;
};
type NN = {
  durationArr: {
    owner: string; //! This is not optional since pause can also have its category. I mean we just can pause a session and the session has its category (including "uncategorized")
    duration: number;
    type: 'pause' | 'focus';
    startTime: number;
  }[];
  currentStartTime: number;
  currentType: 'pause' | 'focus';
  currentOwner: string;
};
type Duration = {
  owner: string;
  duration: number;
  type: 'pause' | 'focus';
  startTime: number;
};
//#endregion

//#region transform 1 - to get data sorted by timestamp.
function createDataSortedByTimestamp(
  categoryChangeInfoArray: {
    categoryName: string;
    categoryChangeTimestamp: number;
  }[],
  pauseRecord: {
    start: number;
    end: number;
  }[],
  endTime: number,
) {
  const categoryChanges = transformCategoryChanges(categoryChangeInfoArray);
  const pauseRecords = transformPauseRecords(pauseRecord);
  const data = [...categoryChanges, ...pauseRecords];
  data.sort((a, b) => a.timestamp - b.timestamp);
  data.push({ kind: 'endOfSession', timestamp: endTime });
  return data;

  function transformCategoryChanges(
    categoryChangeInfoArray: {
      categoryName: string;
      categoryChangeTimestamp: number;
    }[],
  ): InfoType[] {
    return categoryChangeInfoArray.map((val) => ({
      kind: 'category',
      name: val.categoryName,
      timestamp: val.categoryChangeTimestamp,
    }));
  }

  function transformPauseRecords(
    pauseRecords: { start: number; end: number }[],
  ): InfoType[] {
    return pauseRecords.flatMap((val) => [
      { kind: 'pause', name: 'start', timestamp: val.start },
      { kind: 'pause', name: 'end', timestamp: val.end },
    ]);
  }
}
//#endregion

//#region transform 2: duration for each category
//! reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
function calculateDurationForEveryCategory(
  acc: NN,
  val: InfoType,
  idx: number,
  _array: InfoType[],
): NN {
  // 로직:
  // 1. currentValue가 이제 Info니까... 우선 그냥 timestamp이용해서 시간 간격을 계산한다.
  // 2. 그리고 이제 currentValue.kind가 무엇이냐에 따라서...
  if (idx === 0) {
    acc.currentOwner = val.name!;
    acc.currentStartTime = val.timestamp;
    return acc;
  }

  const duration_in_ms = val.timestamp - _array[idx - 1].timestamp;
  const duration_in_min = Math.floor(duration_in_ms / (60 * 1000));

  switch (val.kind) {
    case 'pause':
      if (val.name === 'start') {
        acc.durationArr.push({
          owner: acc.currentOwner,
          duration: duration_in_min,
          type: acc.currentType,
          startTime: acc.currentStartTime,
        });
        acc.currentType = 'pause';
        acc.currentStartTime = val.timestamp;
      }
      if (val.name === 'end') {
        acc.durationArr.push({
          owner: acc.currentOwner,
          duration: duration_in_min,
          type: acc.currentType,
          startTime: acc.currentStartTime,
        });
        acc.currentType = 'focus';
        acc.currentStartTime = val.timestamp;
      }
      break;
    case 'category':
      acc.durationArr.push({
        owner: acc.currentOwner,
        duration: duration_in_min,
        type: acc.currentType,
        startTime: acc.currentStartTime,
      });
      acc.currentOwner = val.name!;
      acc.currentStartTime = val.timestamp;
      break;
    case 'endOfSession':
      if (duration_in_min !== 0)
        // A session is forcibly ended by a user during a pause.
        acc.durationArr.push({
          owner: acc.currentOwner,
          duration: duration_in_min,
          type: acc.currentType,
          startTime: acc.currentStartTime,
        });
      break;

    default:
      break;
  }

  return acc;
}
//#endregion

//#region transform 3: sum up focus durations of the same category.
function aggregateFocusDurationOfTheSameCategory(
  prev: M,
  val: Duration,
  idx: number,
  // array: Duration[],
) {
  if (idx === 0) {
    prev.c_duration_array.push({
      categoryName: val.owner,
      duration: val.duration,
      startTime: val.startTime,
    });
    prev.currentCategoryName = val.owner;

    return prev;
  }

  if (val.owner === prev.currentCategoryName) {
    if (val.type === 'focus') {
      prev.c_duration_array[prev.c_duration_array.length - 1].duration +=
        val.duration;
    }
  }

  if (val.owner !== prev.currentCategoryName) {
    const newDuration = {
      categoryName: val.owner,
      duration: val.type === 'focus' ? val.duration : 0, // pause 도중에 다른 카테고리로 바꿨다면, 처음 duration이 pause.
      startTime: val.startTime,
    };
    prev.c_duration_array.push(newDuration);
    prev.currentCategoryName = val.owner;
  }

  return prev;
}
//#endregion
