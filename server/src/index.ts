import { WebSocketServer, WebSocket } from 'ws';

// ============================================
// ClawScape Server - Phase 1: Multiplayer
// ============================================

// Shared constants (duplicated for now - will fix imports later)
const TICK_RATE = 600;

interface Position {
  x: number;
  y: number;
  level: number;
}

interface NetworkMessage {
  type: string;
  payload: unknown;
  timestamp: number;
}

interface PlayerData {
  id: number;
  username: string;
  combatLevel: number;
  position: Position;
}

const PORT = 3000;

interface ConnectedPlayer extends PlayerData {
  ws: WebSocket;
}

const players = new Map<WebSocket, ConnectedPlayer>();
let nextPlayerId = 1;

const wss = new WebSocketServer({ port: PORT });

console.log(`ClawScape Server running on ws://localhost:${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  // Create player
  const player: ConnectedPlayer = {
    ws,
    id: nextPlayerId++,
    username: `Player${nextPlayerId}`,
    combatLevel: 3,
    position: { x: 0, y: 0, level: 0 }
  };

  players.set(ws, player);
  console.log(`Player ${player.id} connected. Total: ${players.size}`);

  // Send player their ID
  send(ws, {
    type: 'auth',
    payload: { playerId: player.id },
    timestamp: Date.now()
  });

  // Send existing players list
  const existingPlayers = Array.from(players.values())
    .filter(p => p.id !== player.id)
    .map(p => ({ id: p.id, position: p.position }));

  if (existingPlayers.length > 0) {
    send(ws, {
      type: 'players_list',
      payload: existingPlayers,
      timestamp: Date.now()
    });
  }

  // Notify others of new player
  broadcast({
    type: 'player_join',
    payload: { id: player.id, position: player.position },
    timestamp: Date.now()
  }, ws);

  // Handle messages
  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString()) as NetworkMessage;
      handleMessage(ws, message);
    } catch (e) {
      console.error('Invalid message:', e);
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    const player = players.get(ws);
    if (player) {
      console.log(`Player ${player.id} disconnected. Total: ${players.size - 1}`);

      // Notify others
      broadcast({
        type: 'player_leave',
        payload: { id: player.id },
        timestamp: Date.now()
      }, ws);

      players.delete(ws);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

function handleMessage(ws: WebSocket, message: NetworkMessage): void {
  const player = players.get(ws);
  if (!player) return;

  switch (message.type) {
    case 'player_move':
      const moveData = message.payload as { target: Position };
      player.position = moveData.target;

      // Broadcast to all other players
      broadcast({
        type: 'player_update',
        payload: {
          id: player.id,
          position: player.position
        },
        timestamp: Date.now()
      }, ws);
      break;

    case 'ping':
      send(ws, {
        type: 'pong',
        payload: {},
        timestamp: Date.now()
      });
      break;

    case 'chat':
      broadcast({
        type: 'chat',
        payload: {
          playerId: player.id,
          username: player.username,
          message: message.payload
        },
        timestamp: Date.now()
      });
      break;
  }
}

function send(ws: WebSocket, message: NetworkMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(message: NetworkMessage, exclude?: WebSocket): void {
  for (const [ws] of players) {
    if (ws !== exclude) {
      send(ws, message);
    }
  }
}

// Game tick
setInterval(() => {
  // Future: process queued actions
}, TICK_RATE);

console.log(`Game tick: ${TICK_RATE}ms | Waiting for players...`);
