import { RecordOfToday } from "../models/recordOfToday.js";

export const getRecordsOfToday = async (req, res) => {
  try {
    let records = await RecordOfToday.findByUserEmail(req.params.userEmail);
    //? should we remove useEmail property at this point?
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error });
    console.log(`getRecordsOfToday in controllers/recOfToday.js\n ${error}`);
  }
};

export const storeRecordOfToday = async (req, res) => {
  try {
    const { userEmail, kind, startTime, endTime, timeCountedDown, pause } =
      req.body;
    let newRecord = new RecordOfToday({
      userEmail,
      kind,
      startTime,
      endTime,
      timeCountedDown,
      pause,
    });
    let savedNewRecord = await newRecord.save();
    res.json(savedNewRecord);
  } catch (error) {
    res.status(500).json({ message: error });
    console.log(`storeRecordOfToday in controllers/recOfToday.js\n ${error}`);
  }
};

//TODO: is it okay to _just send a timestamp_ that is going to be used to determine which data are before today?
export const deleteRecordsBeforeToday = async (req, res) => {
  try {
    let { startOfTodayTimestamp, userEmail } = req.body;
    const deletedCount = await RecordOfToday.deleteMany({
      userEmail: userEmail,
      startTime: { $lt: startOfTodayTimestamp },
    });
    console.log("deletedCount - ", deletedCount);
    res.json(deletedCount);
  } catch (error) {
    res.status(500).json({ message: error });
    console.log(
      `deleteRecordsBeforeToday in controllers/recOfToday.js\n ${error}`
    );
  }
};
