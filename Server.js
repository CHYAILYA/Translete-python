const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Serve static files (including index.html) from the "public" folder
app.use(express.static('public')); // Make sure the 'public' folder exists

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// A map to store clients by room ID
const rooms = {};

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log("A client has connected");

    // Assign the client to a room when joining
    let currentRoom = null;
    let userName = null; // Store the client's user name

    // Handle messages from client
    ws.on('message', (message) => {
        console.log('Received message: %s', message);
        const parsedMessage = JSON.parse(message);

        if (parsedMessage.action === 'join_room') {
            const roomId = parsedMessage.room_id;
            userName = parsedMessage.user_name; // Set the user name when they join

            currentRoom = roomId;

            // Ensure the room exists in the rooms map
            if (!rooms[roomId]) {
                rooms[roomId] = new Set();
            }

            // Add the client to the room
            rooms[roomId].add(ws);
            console.log(`Client ${userName} joined room: ${roomId}`);

            // Send a confirmation to the client
            ws.send(JSON.stringify({ message: `Joined room ${roomId} as ${userName}` }));
        }

        if (parsedMessage.action === 'send_translation' && currentRoom) {
            const translation = parsedMessage.translation;

            // Send translation to all clients in the same room
            rooms[currentRoom].forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ translation, userName }));
                }
            });
        }
    });

    // When the client disconnects, remove them from the room
    ws.on('close', () => {
        if (currentRoom && rooms[currentRoom]) {
            rooms[currentRoom].delete(ws);
            if (rooms[currentRoom].size === 0) {
                delete rooms[currentRoom]; // Remove the room if it has no clients
            }
        }
        console.log("A client has disconnected");
    });
});

// Get port from environment variables or default to 8080
const PORT = process.env.PORT || 8080;

// Start the server
server.listen(PORT, () => {
    const host = server.address().address || 'localhost';
    const port = server.address().port;
    console.log(`Server is running at http://${host}:${port}`);
});
