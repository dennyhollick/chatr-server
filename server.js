// server.js

const express = require('express');
const WebSocket = require('ws');
const SocketServer = WebSocket.Server;
const uuid = require('node-uuid');

// Set the port to 3001
const PORT = 3001;

// Create a new express server
const server = express()
   // Make the express server serve static assets (html, javascript, css) from the /public folder
  .use(express.static('public'))
  .listen(PORT, '0.0.0.0', 'localhost', () => console.log(`Listening on ${ PORT }`));

// Create the WebSockets server
const wss = new SocketServer({ server });



// Broadcast function with stringify
wss.broadcast = function broadcast(data) {
  console.log('broadcasting')
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// Connect and run

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.onmessage = function (event) {
  let incomingMessage = JSON.parse(event.data)
  incomingMessage.uuid = uuid();
  wss.broadcast(incomingMessage);
  };

  // Set up a callback for when a client closes the socket. This usually means they closed their browser.
  ws.on('close', () => console.log('Client disconnected'));
});