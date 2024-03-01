import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { prisma } from "../prisma/prisma";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

type User = {
  userId: string;
  socketId: string;
};

type ActiveUsers = {
  users: User[];
  setUser: (userId: string, socketId: string) => void;
  deleteUser: (socketId: string) => void;
  findSocketId: (userId: string) => string | undefined;
  findUserId: (socketId: string) => string | undefined;
};

const activeUsers: ActiveUsers = {
  users: [],
  setUser: function (userId, socketId) {
    this.users.push({ userId, socketId });
  },
  deleteUser: function (socketId) {
    if (socketId)
      this.users = this.users.filter((user) => user.socketId !== socketId);
  },
  findSocketId: function (userId) {
    return this.users.find((user) => user.userId === userId)?.socketId;
  },
  findUserId: function (socketId) {
    return this.users.find((user) => user.socketId === socketId)?.userId;
  },
};

io.on("connection", (socket) => {
  socket.on("join", async (userId) => {
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true },
    });
    activeUsers.setUser(userId, socket.id);

    console.log(activeUsers.users);
  });

  socket.on("activity", ({ senderId, receiverId }) => {
    const receiverSocketId = activeUsers.findSocketId(receiverId);
    if (receiverSocketId)
      socket.broadcast.to(receiverSocketId).emit("activity", senderId);
  });

  socket.on("disconnect", async () => {
    const userId = activeUsers.findUserId(socket.id);
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: false },
    });
    activeUsers.deleteUser(socket.id);
    console.log(activeUsers.users);
  });
});

server.listen(3001, () => {
  console.log("server running at http://localhost:3001");
});