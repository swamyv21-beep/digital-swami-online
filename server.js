
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 10000);
const MAX_PLAYERS = 8;
const rooms = new Map();
const peers = new Map();

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (pathname === '/health') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify({ok: true, rooms: rooms.size}));
  }

  if (pathname !== '/' && pathname !== '/index.html') {
    res.writeHead(404);
    return res.end('Not found');
  }

  const file = path.join(__dirname, 'index.html');

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(500);
      return res.end('index.html could not be loaded');
    }

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

function send(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function snapshot(room) {
  return [...room.values()].map(p => ({
    peer: p.id,
    presence: p.presence || {name: p.name, s: {}}
  }));
}

function broadcastPeers(room) {
  const peersList = snapshot(room);
  for (const p of room.values()) {
    send(p.ws, {type: 'peers', peers: peersList});
  }
}

function remove(ws) {
  const p = peers.get(ws);
  if (!p) return;
  peers.delete(ws);

  const room = rooms.get(p.room);
  if (room) {
    room.delete(p.id);
    if (room.size) broadcastPeers(room);
    else rooms.delete(p.room);
  }
}

const wss = new WebSocket.Server({server, maxPayload: 256 * 1024});

wss.on('connection', ws => {
  const p = {
    id: crypto.randomBytes(8).toString('hex'),
    ws,
    room: null,
    name: 'Player',
    presence: null
  };

  peers.set(ws, p);
  send(ws, {type: 'welcome', peer: p.id});

  ws.on('message', raw => {
    let m;
    try {
      m = JSON.parse(raw.toString());
    } catch {
      return send(ws, {type: 'error', message: 'Invalid message format.'});
    }

    if (m.type === 'join') {
      const code = String(m.room || '')
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, '')
        .slice(0, 32);

      if (!code) {
        return send(ws, {type: 'error', message: 'Room code is required.'});
      }

      if (p.room) remove(ws);

      let room = rooms.get(code);
      if (!room) {
        room = new Map();
        rooms.set(code, room);
      }

      if (room.size >= MAX_PLAYERS) {
        return send(ws, {type: 'error', message: 'Room is full (maximum 8 players).'});
      }

      p.room = code;
      p.name = String(m.name || 'Player').replace(/[<>]/g, '').slice(0, 24);
      p.presence = {name: p.name, s: {}};
      room.set(p.id, p);
      broadcastPeers(room);
      return;
    }

    if (!p.room) {
      return send(ws, {type: 'error', message: 'Join a room first.'});
    }

    const room = rooms.get(p.room);
    if (!room) return;

    if (m.type === 'presence') {
      p.presence = m.presence || {name: p.name, s: {}};
      p.presence.name = p.name;
      broadcastPeers(room);
      return;
    }

    if (m.type === 'event') {
      const eventName = String(m.name || '').slice(0, 40);
      if (!eventName) return;

      for (const other of room.values()) {
        send(other.ws, {
          type: 'event',
          peer: p.id,
          name: eventName,
          data: m.data
        });
      }
    }
  });

  ws.on('close', () => remove(ws));
  ws.on('error', () => remove(ws));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Digital Swami website running on port ${PORT}`);
});
