// server.js

const express = require('express');
const WebSocket = require('ws');

const SocketServer = WebSocket.Server;

// Modules

const uuid = require('node-uuid');
const randomColour = require('randomcolor');
const request = require('request');

// Set the port to 3001
const PORT = 3001;

// Create a new express server
const server = express()
  .use(express.static('public'))
  .listen(PORT, '0.0.0.0', 'localhost', () => console.log(`Listening on ${PORT}`));

// Create the WebSockets server
const wss = new SocketServer({ server });

// Get Giphy Images

function handleRandom(results, message) {
  const newMessage = message;
  newMessage.content = results.data.fixed_height_downsampled_url;
  wss.broadcast(newMessage);
}

// Get Giphy function allows for input, or no input from the user in query.

function getGiphy(query, message) {
  console.log(message);
  const url = `https://api.giphy.com/v1/gifs/random?api_key=a4d472db7a34443f9e8ce2e023adea27&tag=${query}&rating=PG`;
  request(url, (err, response, body) => {
    if (err) {
      throw err;
    }
    const returnedBody = JSON.parse(body);
    handleRandom(returnedBody, message, wss);
  });
}


// Broadcast helper function with stringify

wss.broadcast = function broadcast(data) {
  console.log('BROADCAST ', data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// On connection from client

wss.on('connection', (ws) => {
  // Generate random text colour and assign to user
  const clientColour = randomColour();
  const setColour = {
    type: 'systemStatus',
    subType: 'userColour',
    userColour: clientColour,
  };

  ws.send(JSON.stringify(setColour));

  // Update total users across all clients upon connect

  let connectedUsers = wss.clients.size;
  wss.broadcast({
    type: 'systemStatus',
    subType: 'totalUsers',
    totalUsers: connectedUsers,
  });
  console.log(`Client connected, Total Users = ${connectedUsers}`);

  // On receive message or system event, broadcast.

  ws.onmessage = function (event) {
    const incomingMessage = JSON.parse(event.data);
    incomingMessage.uuid = uuid();
    
    // If giphy request via '/' in text bar
    
    if (incomingMessage.content && incomingMessage.content[0] === '/') {
      const parts = incomingMessage.content.split(' ');
      const cmd = parts.shift().replace('/', '');
      getGiphy(cmd, incomingMessage);
    } 
    
    // else handle a regular request with switch
    
    else {
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

  // Client closes the socket.

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
