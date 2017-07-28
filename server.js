// server.js

const express = require('express');
const WebSocket = require('ws');

const SocketServer = WebSocket.Server;
const uuid = require('node-uuid');
const randomColour = require('randomcolor');
const request = require('request');

// Set the port to 3001
const PORT = 3001;

// Create a new express server
const server = express()
  // Make the express server serve static assets (html, javascript, css) from the /public folder
  .use(express.static('public'))
  .listen(PORT, '0.0.0.0', 'localhost', () => console.log(`Listening on ${PORT}`));

// Create the WebSockets server
const wss = new SocketServer({ server });

// Giphy Get

function handleRandom(results, message) {
  let newMessage = message;
  newMessage.content = results.data.fixed_height_downsampled_url;
  wss.broadcast(newMessage);
}


// TO DO ERROR HANDLE

function getGiphy(query, message) {
  console.log(message);
  const url = `https://api.giphy.com/v1/gifs/random?api_key=a4d472db7a34443f9e8ce2e023adea27&tag=${query}&rating=PG`;
  request(url, (err, response, body) => {
    body = JSON.parse(body);
    handleRandom(body, message, wss);
  });
}


// Broadcast function with stringify
wss.broadcast = function broadcast(data) {
  console.log('BROADCAST ', data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// Connect and run

wss.on('connection', (ws) => {
  const clientColour = randomColour();
  const setColour = {
    type: 'systemStatus',
    subType: 'userColour',
    userColour: clientColour,
  };

  ws.send(JSON.stringify(setColour));

  let connectedUsers = wss.clients.size;

  // Update total users across all clients upon connect
  wss.broadcast({
    type: 'systemStatus',
    subType: 'totalUsers',
    totalUsers: connectedUsers,
  });
  console.log(`Client connected, Total Users = ${connectedUsers}`);

  // Receive Message or system event

  ws.onmessage = function (event) {
    const incomingMessage = JSON.parse(event.data);
    incomingMessage.uuid = uuid();
    
    if (incomingMessage.content && incomingMessage.content[0] === '/') {
      const parts = incomingMessage.content.split(' ');
      const cmd = parts.shift().replace('/', '');
      getGiphy(cmd, incomingMessage);
    } else {
      switch (incomingMessage.type) {
        case 'newMessage': {
          wss.broadcast(incomingMessage);
          break;
        }
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
            content: `Server error: Unknown case type. Report error to the admin: ${incomingMessage.uuid}`,
          };
          wss.broadcast(defaultErrorCheck);
          console.log(`
              *************** \n
              ERROR UID: ${incomingMessage.uuid} \n 
              Unknown case type for incoming msg. \n
              Incoming message: ${event.data} \n
              ***************** \n`);
          break;
        }
      }
    }
  };

  // Set up a callback for when a client closes the socket. This usually means they closed their browser.
  ws.on('close', () => {
    connectedUsers = wss.clients.size;
    console.log(`Client disconnected, Total Users = ${connectedUsers}`);
    wss.broadcast({
      type: 'systemStatus',
      subType: 'totalUsers',
      totalUsers: connectedUsers,
    });
  });
});
