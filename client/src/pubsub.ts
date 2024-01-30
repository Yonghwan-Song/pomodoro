// reference: https://www.youtube.com/watch?v=aynSM8llOBs

type Callback = (data: any) => void;
interface PubsubType {
  events: { [index: string]: Set<(data: any) => void> };
  subscribe: (evName: string, cb: Callback) => () => void;
  unsubscribe: (evName: string, cb: Callback) => void;
  publish: (evName: string, data: any) => void;
}
export const pubsub: PubsubType = {
  events: {},

  subscribe: function (evName, cb) {
    if (!(evName in this.events)) {
      this.events[evName] = new Set();
    }
    this.events[evName].add(cb);
    console.log(`subscription to ${evName} has started`);
    console.log("events", this.events);

    return () => {
      this.events[evName].delete(cb);
    };
  },

  unsubscribe: function (evName, cb) {
    if (evName in this.events) {
      this.events[evName].delete(cb);
      console.log(`The Subscription to the ${evName} has been unsubscribed.`);
    }
  },

  publish: function (evName, data: any) {
    // console.log(`${evName} is published with data`, data);
    // console.log("Set of subscribers's callbacks", this.events[evName]);
    // console.log("this is", this);
    if (this.events[evName]) {
      this.events[evName].forEach((f) => {
        f(data);
      });
    }
  },
};
