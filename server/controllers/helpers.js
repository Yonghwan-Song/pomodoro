/**
 * @param {*} when
 * @param {*} pomoDuration
 * @param {*} shortBreak
 * @param {*} longBreak
 * @param {*} numOfPomo
 * @param {*} numOfCycle One cycle consists of the numOfPomo amount of pomoDuration. Thus, total concentration time will be (pomoDuration * numOfPomo) * numOfCycle
 * @param {*} userEmail
 * @returns
 */
export function createRecords(
  when,
  pomoDuration,
  shortBreak,
  longBreak,
  numOfPomo,
  numOfCycle,
  userEmail
) {
  //let startTime = new Date(when.year, when.month, when.day, when.hours);
  let startTime = new Date(
    when.year,
    when.month,
    when.day,
    when.hours
  ).getTime();

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
        date: new Date(startTime).toLocaleDateString(),
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
