import type WebSocket from "ws";
class WebsocketManager {
  private wsMap: Map<string, WebSocket[]>;
  private token = ["btcusdc", "ethusdc", "solusdc"];
  constructor() {
    this.wsMap = new Map<string, WebSocket[]>();
  }

  public getWsMap(token: string) {
    return this.wsMap.get(token);
  }

  public setWsMap(token: string, ws: WebSocket) {
    if (this.wsMap.has(token)) {
      this.wsMap.get(token)?.push(ws);
    } else {
      if (this.token.includes(token)) {
        this.wsMap.set(token, [ws]);
      }
    }
  }

  public removeWsMap(token: string, ws: WebSocket) {
    if (this.wsMap.has(token)) {
      const clients = this.wsMap.get(token);
      if (clients) {
        const index = clients.indexOf(ws);
        if (index !== -1) {
          clients.splice(index, 1);
        }
        if (clients.length === 0) {
          this.wsMap.delete(token);
        }
      }
    }
  }
}

export default WebsocketManager;
