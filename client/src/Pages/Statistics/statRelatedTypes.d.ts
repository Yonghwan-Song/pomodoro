export type weekArrType = {
  date: string;
  dayOfWeek: string;
}[];

// Pomo means a focus duration(=== pomo duration, I used it interchangeably)
export type pomoType = {
  userEmail: string;
  duration: number;
  startTime: number;
  date: string;
  isDummy: boolean;
};

// The total is optional since there might be some weekdays not coming yet.
// e.g. If today is Thu, the remaining three days should not have total properties
//      so that the area chart can only show data until today.
export interface Weekdays {
  date: string;
  timestamp: number;
  dayOfWeek: string;
  total?: number;
}

// This type is used for AreaChart component.
export type CertainWeek = Weekdays[];

// Total means a sum of all focus durations done during a day.
export interface DailyPomo {
  date: string;
  timestamp: number;
  dayOfWeek: string;
  total: number;
}

export type StatArrType = DailyPomo[];

export type DataArray = {
  userEmail: string;
  duration: number;
  startTime: number;
  date: string;
  isDummy: boolean;
}[];
