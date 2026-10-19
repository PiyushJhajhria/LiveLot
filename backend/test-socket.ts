
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Connected successfully!");
  console.log("Client socket ID:", socket.id);

  socket.disconnect();
});

socket.on("connect_error", (error) => {
  console.error("Connection failed:", error.message);
  process.exitCode = 1;
  socket.disconnect();
});
