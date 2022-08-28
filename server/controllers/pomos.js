import { Pomo } from "../models/pomo.js";
import { User } from "../models/user.js";

export const recordPomo = async (req, res) => {
  try {
    let { userEmail, duration, startTime } = req.body;
    console.log(req.body);
    console.log(duration.__proto__.constructor);
    console.log(startTime.__proto__.constructor);

    //? is await needed ?....
    //? aren't we just creating a new object which becomes a document in mongodb?
    //const newPomo = await new Pomo({ userEmail, duration, startTime });
    let newPomo = new Pomo({ userEmail, duration, startTime });
    let savedPomo = await newPomo.save();

    let currentUser = await User.findOne({ email: userEmail });
    currentUser.pomoSet.push(savedPomo);
    currentUser.save();

    res.json(savedPomo);
  } catch (error) {
    console.log(`******DB error: recordPomo in controllers/pomos.js******`);
  }
};

export const getPomoRecords = async (req, res) => {
  try {
    let pomoRecords = await Pomo.findByUserEmail(req.params.userEmail);

    //#region calculate the total cocentration time of today
    const now = new Date();
    const _24hours = 24 * 60 * 60 * 1000;
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    let startOfTodayTimestamp = startOfToday.getTime();
    let endOfTodayTimestamp = startOfTodayTimestamp + _24hours;

    const todayPomoTotalDuration = pomoRecords
      .filter((rec) => {
        return (
          rec.startTime >= startOfTodayTimestamp &&
          rec.startTime < endOfTodayTimestamp
        );
      })
      .reduce((S_n_1, a_n) => {
        return S_n_1 + a_n.duration;
      }, 0);
    //#endregion

    //#region calculate the total cocentration time of this week
    let daysPassed = new Date(startOfToday.getDay() + 6) % 7;
    let startOfWeekTimestamp = startOfTodayTimestamp - daysPassed * _24hours;
    let endOfWeekTimestamp = startOfWeekTimestamp + 7 * _24hours;

    const thisWeekPomoTotalDuration = pomoRecords
      .filter((rec) => {
        return (
          rec.startTime >= startOfWeekTimestamp &&
          rec.startTime < endOfWeekTimestamp
        );
      })
      .reduce((S_n_1, a_n) => {
        return S_n_1 + a_n.duration;
      }, 0);

    //#endregion
    res.json({
      pomoRecords,
      todayPomoTotalDuration,
      thisWeekPomoTotalDuration,
    });
  } catch (error) {
    console.log(`getPomoRecords in controllers/pomos.js\n ${error}`);
  }
};

export const deletePomoRecords = async (req, res) => {
  try {
    let deletedCount = await Pomo.deleteAllByUserEmail(req.params.userEmail);

    res.json(deletedCount);
  } catch (error) {
    console.log(`deleteRecords in controllers/pomos.js\n ${error}`);
  }
};

export const generateDummies = async (req, res) => {
  try {
    let { year, month, day, hours } = req.body;
    const pomoRecords = createRecords(
      {
        year,
        month,
        day,
        hours,
      },
      25,
      5,
      15,
      4,
      3,
      "syh300089@gmail.com"
    );

    let pomoDocArray = pomoRecords.map((pomoRecord) => {
      return new Pomo(pomoRecord);
    });

    //#region Save the documents
    // Hard-coding
    let currentUser = await User.findOne({ email: "syh300089@gmail.com" });
    let savedPomoDocArray = [];
    for (let pomoDoc of pomoDocArray) {
      let savedPomoDoc = await pomoDoc.save();
      savedPomoDocArray.push(savedPomoDoc);
      currentUser.pomoSet.push(savedPomoDoc);
    }

    currentUser.save();
    //#endregion

    res.json(savedPomoDocArray);
  } catch (error) {
    console.log(
      `******DB error: generateDummies in controllers/pomos.js******`
    );
  }
};

function createRecords(
  when,
  pomoDuration,
  shortBreak,
  longBreak,
  numOfPomo,
  numOfCycle,
  userEmail
) {
  let startTime = new Date(when.year, when.month, when.day, when.hours);
  startTime = startTime.getTime();

  const timesInMilliSeconds = {
    pomoDuration: pomoDuration * 60 * 1000,
    shortBreak: shortBreak * 60 * 1000,
    longBreak: longBreak * 60 * 1000,
  };

  let pomoRecordArr = [];

  for (let i = 0; i < numOfCycle; i++) {
    for (let j = 0; j < numOfPomo; j++) {
      pomoRecordArr.push({
        userEmail,
        duration: pomoDuration,
        startTime,
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
