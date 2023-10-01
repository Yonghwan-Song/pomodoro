// reference: https://www.youtube.com/watch?v=aynSM8llOBs

interface PubsubType {
  events: { [index: string]: Set<(data: any) => void> };
  subscribe: (evName: string, fn: (data: any) => void) => () => void;
  unsubscribe: (evName: string, fn: (data: any) => void) => void;
  publish: (evName: string, data: any) => void;
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
      console.log(`The Subscription to the ${evName} has been unsubscribed.`);
    }
  },

  publish: function (evName, data: any) {
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
