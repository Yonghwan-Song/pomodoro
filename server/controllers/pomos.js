import { Pomo } from "../models/pomo.js";
import { User } from "../models/user.js";
import { createRecords } from "./helpers.js";

export const recordPomo = async (req, res) => {
  try {
    let { userEmail, duration, startTime, LocaleDateString } = req.body;
    console.log(req.body);
    console.log(duration.__proto__.constructor);
    console.log(startTime.__proto__.constructor);

    // calculate a date using startTime

    //? is await needed ?....
    //? aren't we just creating a new object which becomes a document in mongodb?
    //const newPomo = await new Pomo({ userEmail, duration, startTime });
    let newPomo = new Pomo({
      userEmail,
      duration,
      startTime,
      date: LocaleDateString,
    });
    let savedPomo = await newPomo.save();

    let currentUser = await User.findOne({ email: userEmail });
    currentUser.pomoSet.push(savedPomo);
    currentUser.save();

    res.json(savedPomo);
  } catch (error) {
    console.log(`******DB error: recordPomo in controllers/pomos.js******`);
  }
};

export const getStat = async (req, res) => {
  try {
    let pomoRecords = await Pomo.findByUserEmail(req.params.userEmail);
    let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    // [{ date: '9/12/2022', total: 300 }, ... ]
    let durationByDateArr = pomoRecords
      .sort((a, b) => a.startTime - b.startTime)
      .reduce((acc, curRec) => {
        // check if the date property of the last element in the acc
        // has the same value as the curRec's date value.
        if (acc.length === 0) {
          const dayOfWeek = new Date(curRec.date).getDay();
          return [
            {
              date: curRec.date,
              dayOfWeek: days[dayOfWeek],
              total: curRec.duration,
            },
          ];
        }

        if (acc[acc.length - 1].date === curRec.date) {
          acc[acc.length - 1].total += curRec.duration;
          return acc;
        } else {
          const dayOfWeek = new Date(curRec.date).getDay();
          return [
            ...acc,
            {
              date: curRec.date,
              dayOfWeek: days[dayOfWeek],
              total: curRec.duration,
            },
          ];
        }
      }, []);

    res.json(durationByDateArr);
  } catch (error) {
    console.log(`getStat in controllers/pomos.js\n ${error}`);
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
    let userEmail = req.params.userEmail;
    let { year, month, day, hours, numOfPomo, numOfCycle } = req.body;
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
      numOfPomo, // long break every four pomo durtaions.
      numOfCycle, // this one cycle of 25 * 4 pomo will be repeated 3 times (cycle count).
      userEmail
    );
    // total 300 minutes (5 hours).

    let pomoDocArray = pomoRecords.map((pomoRecord) => {
      return new Pomo(pomoRecord);
    });

    //#region Save the documents
    // Hard-coding
    let currentUser = await User.findOne({ email: userEmail });
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
