const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // put your HTML/JS files in /public

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Join room
    socket.on("join", (room) => {
        socket.join(room);
        console.log(`${socket.id} joined room ${room}`);
    });

    // Relay signaling messages
    socket.on("signal", ({ room, data }) => {
        socket.to(room).emit("signal", data);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
