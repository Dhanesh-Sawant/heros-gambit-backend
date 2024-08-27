const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// Store the state of the board
let boardState = {
  "row0-col0": "A-P1",
  "row0-col1": "A-P2",
  "row0-col2": "A-P3",
  "row0-col3": "A-H1",
  "row0-col4": "A-H2",
  "row4-col0": "B-H2",
  "row4-col1": "B-H1",
  "row4-col2": "B-P3",
  "row4-col3": "B-P2",
  "row4-col4": "B-P1",
};

// Assign players
let players = [];

wss.on('connection', function connection(ws) {
if (players.length >= 2) {
ws.send(JSON.stringify({ type: 'full' }));
ws.close();
return;
}

const player = players.length === 0 ? 'A' : 'B';
players.push(player);

ws.send(JSON.stringify({ type: 'player', player: player }));
ws.send(JSON.stringify({ type: 'gameState', gameState: stringifyGameState() }));

ws.on('message', function incoming(message) {
console.log('received: %s', message);
const decodedMessage = JSON.parse(message);

if (decodedMessage.type === 'move') {
const { character, newPosition } = decodedMessage;

// Update the board state
const oldPosition = Object.keys(boardState).find(pos => boardState[pos] === character);

if (!oldPosition) {
ws.send(JSON.stringify({ type: 'invalidMove' }));
return;
}

const validMoves = calculateValidMoves(character, oldPosition);
if (!validMoves.includes(newPosition)) {
ws.send(JSON.stringify({ type: 'invalidMove' }));
return;
}

if (boardState[newPosition] && boardState[newPosition].startsWith(player)) {
ws.send(JSON.stringify({ type: 'invalidMove' }));
return;
}

delete boardState[oldPosition];
boardState[newPosition] = character;

// Broadcast the updated game state to all players
wss.clients.forEach(function each(client) {
if (client.readyState === WebSocket.OPEN) {
client.send(JSON.stringify({ type: 'gameState', gameState: stringifyGameState() }));
}
});
}
});

ws.on('close', function close() {
players = players.filter(p => p !== player);
});
});

function stringifyGameState() {
return Object.entries(boardState).map(entry => entry.join(':')).join(',');
}

function calculateValidMoves(character, position) {
const [row, col] = parsePosition(position);
let validMoves = [];

switch (character.split('-')[1]) {
case 'P1':
case 'P2':
case 'P3':
validMoves = generatePawnMoves(row, col);
break;
case 'H1':
validMoves = generateHero1Moves(row, col);
break;
case 'H2':
validMoves = generateHero2Moves(row, col);
break;
}

return validMoves.filter(move => !boardState[move] || boardState[move].charAt(0) !== character.charAt(0));
}

function generatePawnMoves(row, col) {
const moves = [];
if (row > 0) moves.push(`row${row - 1}-col${col}`); // Forward
if (row < 4) moves.push(`row${row + 1}-col${col}`); // Backward
if (col > 0) moves.push(`row${row}-col${col - 1}`); // Left
if (col < 4) moves.push(`row${row}-col${col + 1}`); // Right
return moves;
}

function generateHero1Moves(row, col) {
const moves = [];
if (row > 1) moves.push(`row${row - 2}-col${col}`); // Forward 2
if (row < 3) moves.push(`row${row + 2}-col${col}`); // Backward 2
if (col > 1) moves.push(`row${row}-col${col - 2}`); // Left 2
if (col < 3) moves.push(`row${row}-col${col + 2}`); // Right 2
return moves;
}

function generateHero2Moves(row, col) {
const moves = [];
if (row > 1 && col > 1) moves.push(`row${row - 2}-col${col - 2}`); // FL Diagonal
if (row > 1 && col < 3) moves.push(`row${row - 2}-col${col + 2}`); // FR Diagonal
if (row < 3 && col > 1) moves.push(`row${row + 2}-col${col - 2}`); // BL Diagonal
if (row < 3 && col < 3) moves.push(`row${row + 2}-col${col + 2}`); // BR Diagonal
return moves;
}

function parsePosition(position) {
const rowCol = position.split('-');
return [
parseInt(rowCol[0].replace('row', '')),
parseInt(rowCol[1].replace('col', '')),
];
}
