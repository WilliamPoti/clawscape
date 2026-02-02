import { WebSocketServer, WebSocket } from 'ws';
import { TICK_RATE, NetworkMessage, PlayerData, Position } from '@clawscape/shared';

// ============================================
// ClawScape Server - Phase 0 Foundation
// ============================================

const PORT = 3000;

// Connected players
const players = new Map<WebSocket, PlayerData>();
let nextPlayerId = 1;

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT });

console.log(`ClawScape Server running on ws://localhost:${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  // Create player data
  const player: PlayerData = {
    id: nextPlayerId++,
    username: `Player${nextPlayerId}`,
    combatLevel: 3,
    position: { x: 0, y: 0, level: 0 }
  };

  players.set(ws, player);
  console.log(`Player ${player.id} connected. Total players: ${players.size}`);

  // Send player their ID
  send(ws, {
    type: 'auth',
    payload: { playerId: player.id },
    timestamp: Date.now()
  });

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
      console.log(`Player ${player.id} disconnected`);
      players.delete(ws);
    }
  });

  // Handle errors
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
      // Broadcast chat to everyone
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

// Game tick loop (600ms like RS)
setInterval(() => {
  // Future: process queued actions, update world state, etc.
}, TICK_RATE);

console.log(`Game tick running at ${TICK_RATE}ms intervals`);
