const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server,{
	cors: {	}
  });

const PORT = process.env.PORT || 8080
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log(`${socket.id} user connected`);
});

io.on('connection', function(socket){
	io.sockets.emit("user-joined", socket.id, io.engine.clientsCount, [...io.sockets.sockets.keys()]);

	socket.on('signal', (toId, message) => {
		console.log("signal");
		io.to(toId).emit('signal', socket.id, message);
  	});

    socket.on("message", function(data){
		console.log("messsage");
		io.sockets.emit("broadcast-message", socket.id, data);
    })

	socket.on('disconnect', function() {
		console.log("disconnect");
		io.sockets.emit("user-left", socket.id);
	})
});

server.listen(PORT, () => {
	console.log("Express server listening on port %d in %s mode", PORT, app.settings.env);
  });
  
  