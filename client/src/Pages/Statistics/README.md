# How the data obtained from response object is processed a few times according to needs

## DB -> API server ->

In the database, original data stored in the mongodb is like the interface below.
And the data array we get from the response of api request is like the DataArray type below.

```typescript
interface originalData = {
  userEmail: string;
  duration: number;
  startTime: number;
  date: string;
  isDummy: boolean;
}
// type DataArray = {
//   userEmail: string;
//   duration: number;
//   startTime: number;
//   date: string;
//   isDummy: boolean;
// }[];
```

## Statistics function component

Within the getStatArr() function,
the data array from DB is modified to be like below

```typescript
// Total means a sum of all focus durations done during a day.
interface DailyPomo {
  date: string;
  timestamp: number;
  dayOfWeek: string;
  total: number;
}
type StatArrType = DailyPomo[];
```

## week state in Statistics component

```typescript
const [week, setWeek] = useState<CertainWeek>(init);
export interface Weekdays {
  date: string;
  timestamp: number;
  dayOfWeek: string;
  total?: number;
}
// This type is used for AreaChart component.
export type CertainWeek = Weekdays[];
```

The `week` is going to be used for Area chart.
The `thisWeek`, `prevWeek`, `nextWeek` functions set an array for the `week` state.
The `thisWeek` is called inside `getStatArr(user: User)`.

```typescript
interface Weekdays {
  date: string;
  timestamp: number;
  dayOfWeek: string;
  total?: number;
}
type StatArrType = DailyPomo[];
```
