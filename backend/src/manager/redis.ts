import { Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
class redisSubscriber {
  private static instance: redisSubscriber;
  private client_read: Redis;
  private client_write: Redis;
  private callbacks: Map<string, (value: unknown) => void>;

  private constructor() {
    this.client_read = new Redis(REDIS_URL);
    this.client_write = new Redis(REDIS_URL);
    this.callbacks = new Map();
    this.runLoop();
  }

  public static getInstance(): redisSubscriber {
    if (!redisSubscriber.instance) {
      redisSubscriber.instance = new redisSubscriber();
    }
    return redisSubscriber.instance;
  }

  private async runLoop() {
    while (true) {
      const response = await this.client_read.xread(
        "BLOCK",
        0,
        "STREAMS",
        "channel-2",
        "$",
      );

      if (!response) continue;
      console.log("response is", response);
      //@ts-ignore
      const [channel, items] = response[0];
      for (const [id, fields] of items) {
        console.log(`Received from ${channel}:`, id, fields);
        const { res, payload } = JSON.parse(fields[1]);
        console.log(fields, res, payload);
        if (this.callbacks.has(res)) {
          console.log("callback is coming");
          console.log(this.callbacks.get(res));
          this.callbacks.get(res)?.(payload);
          this.callbacks.delete(res);
        }
      }
    }
  }

  public waitForMessage(callbackId: string) {
    console.log("id is setting", callbackId);
    return new Promise((res, rej) => {
      this.callbacks.set(callbackId, res);
      setTimeout(() => {
        if (this.callbacks.has(callbackId)) {
          this.callbacks.delete(callbackId);
          rej(new Error("Timeout waiting for message"));
        }
      }, 5000);
    });
  }

  public async putMessage(field_name: string, payload: Record<string, any>) {
    const id = await this.client_write.xadd(
      "channel-1",
      "*",
      field_name,
      JSON.stringify(payload),
    );
    console.log(id);
    return id;
  }
}

export default redisSubscriber.getInstance();
