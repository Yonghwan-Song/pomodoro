// reference: https://www.youtube.com/watch?v=aynSM8llOBs

export type PayloadFromRecOfToday = {
  startTime: number;
  timeCountedDown: number; //in minutes
};
interface PubsubType {
  events: { [index: string]: Set<(data: PayloadFromRecOfToday) => void> };
  // subscribe: (evName: string, fn: (data: number) => void) => () => void;
  // unsubscribe: (evName: string, fn: (data: number) => void) => void;
  // publish: (evName: string, data: number) => void;
  subscribe: (
    evName: string,
    fn: (data: PayloadFromRecOfToday) => void
  ) => () => void;
  unsubscribe: (
    evName: string,
    fn: (data: PayloadFromRecOfToday) => void
  ) => void;
  publish: (evName: string, data: PayloadFromRecOfToday) => void;
}
export const pubsub: PubsubType = {
  events: {},

  subscribe: function (evName, fn) {
    if (!(evName in this.events)) {
      this.events[evName] = new Set();
    }
    this.events[evName].add(fn);
    console.log(`subscription to ${evName} has started`);
    console.log("events", this.events);

    return () => {
      this.events[evName].delete(fn);
    };
  },

  unsubscribe: function (evName, fn) {
    if (evName in this.events) {
      this.events[evName].delete(fn);
    }
  },

  publish: function (evName, data: PayloadFromRecOfToday) {
    console.log("publish is called with data", data);
    console.log("this.events[evName]", this.events[evName]);
    console.log("this is", this);
    if (this.events[evName]) {
      console.log(`inside if statement ${evName} with ${data}`);
      this.events[evName].forEach((f) => {
        f(data);
      });
    }
  },
};