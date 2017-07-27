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
  .listen(PORT, '0.0.0.0', 'localhost', () => console.log(`Listening on ${PORT}`));

// Create the WebSockets server
const wss = new SocketServer({ server });


// Broadcast function with stringify
wss.broadcast = function broadcast(data) {
  console.log(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// Connect and run



wss.on('connection', (ws) => {

let connectedUsers = wss.clients.size;

  // Update total users across all clients upon connect
  wss.broadcast({
    type: 'systemStatus',
    totalUsers: connectedUsers,
  });
  console.log(`Client connected, Total Users = ${connectedUsers}`);

  // Receive Message or system event

  ws.onmessage = function (event) {
    const incomingMessage = JSON.parse(event.data);
    incomingMessage.uuid = uuid();
    switch (incomingMessage.type) {
      case 'newMessage':
        wss.broadcast(incomingMessage);
        break;
      case 'nameChange': {
        const nameChangeBroadcast = {
          uuid: incomingMessage.uuid,
          content: `${incomingMessage.oldUsername} has changed their name to ${incomingMessage.newUserName}`,
          type: 'nameChange',
        };
        wss.broadcast(nameChangeBroadcast);
        break;
      }
      default: {
        const defaultErrorCheck = {
          uuid: incomingMessage.uuid,
          type: 'err',
          content: `Server error: Unknown case type. Admin: See server logs console. ${incomingMessage.uuid}`,
        };
        wss.broadcast(defaultErrorCheck);
        console.log(
          `
          *************** \n
          ERROR UID: ${incomingMessage.uuid} \n 
          Unknown case type for incoming msg. \n
          Incoming message: ${event.data} \n
          ***************** \n`);
        break;
      }
    }
  };

  // Set up a callback for when a client closes the socket. This usually means they closed their browser.
  ws.on('close', () => {
    connectedUsers = wss.clients.size;
    console.log(`Client disconnected, Total Users = ${connectedUsers}`);
    wss.broadcast({
      type: 'systemStatus',
      totalUsers: connectedUsers,
    });
  });
});
