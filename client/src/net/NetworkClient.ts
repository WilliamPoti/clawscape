import { NetworkMessage, PlayerUpdate } from '@clawscape/shared';

export interface NetworkEvents {
  onAuth(playerId: number): void;
  onPlayerUpdate(update: PlayerUpdate): void;
  onPlayerJoin(id: number, position: { x: number; y: number }): void;
  onPlayerLeave(id: number): void;
  onPlayersList(players: Array<{ id: number; position: { x: number; y: number } }>): void;
  onConnect(): void;
  onDisconnect(): void;
}

export class NetworkClient {
  private socket: WebSocket | null = null;
  private connected: boolean = false;
  private events: NetworkEvents;
  private serverUrl: string;

  constructor(serverUrl: string, events: NetworkEvents) {
    this.serverUrl = serverUrl;
    this.events = events;
  }

  connect(): void {
    this.socket = new WebSocket(this.serverUrl);

    this.socket.onopen = () => {
      console.log('Connected to server');
      this.connected = true;
      this.events.onConnect();
    };

    this.socket.onmessage = (event) => {
      const message: NetworkMessage = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.socket.onclose = () => {
      console.log('Disconnected from server');
      this.connected = false;
      this.events.onDisconnect();
      setTimeout(() => this.connect(), 3000);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  send(type: string, payload: unknown): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message: NetworkMessage = {
        type: type as any,
        payload,
        timestamp: Date.now()
      };
      this.socket.send(JSON.stringify(message));
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private handleMessage(message: NetworkMessage): void {
    switch (message.type) {
      case 'auth': {
        const authData = message.payload as { playerId: number };
        this.events.onAuth(authData.playerId);
        break;
      }
      case 'player_update': {
        const update = message.payload as PlayerUpdate;
        this.events.onPlayerUpdate(update);
        break;
      }
      case 'player_join': {
        const joinData = message.payload as { id: number; position: { x: number; y: number } };
        this.events.onPlayerJoin(joinData.id, joinData.position);
        break;
      }
      case 'player_leave': {
        const leaveData = message.payload as { id: number };
        this.events.onPlayerLeave(leaveData.id);
        break;
      }
      case 'players_list': {
        const players = message.payload as Array<{ id: number; position: { x: number; y: number } }>;
        this.events.onPlayersList(players);
        break;
      }
    }
  }
}
