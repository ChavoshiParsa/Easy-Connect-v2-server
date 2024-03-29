"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const prisma_1 = require("../prisma/prisma");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "https://easy-connect-v2.vercel.app",
    },
});
const activeUsers = {
    users: [],
    setUser: function (userId, socketId) {
        this.users.push({ userId, socketId });
    },
    deleteUser: function (socketId) {
        if (socketId)
            this.users = this.users.filter((user) => user.socketId !== socketId);
    },
    findSocketId: function (userId) {
        var _a;
        return (_a = this.users.find((user) => user.userId === userId)) === null || _a === void 0 ? void 0 : _a.socketId;
    },
    findUserId: function (socketId) {
        var _a;
        return (_a = this.users.find((user) => user.socketId === socketId)) === null || _a === void 0 ? void 0 : _a.userId;
    },
};
io.on("connection", (socket) => {
    socket.on("join", (userId) => __awaiter(void 0, void 0, void 0, function* () {
        socket.broadcast.emit("online", userId);
        activeUsers.setUser(userId, socket.id);
        yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: { isOnline: true, lastSeen: Date.now().toString() },
        });
        console.log(activeUsers.users);
    }));
    socket.on("activity", ({ senderId, receiverId }) => {
        const receiverSocketId = activeUsers.findSocketId(receiverId);
        if (receiverSocketId)
            socket.broadcast.to(receiverSocketId).emit("activity", senderId);
    });
    socket.on("message", ({ senderId, receiverId, message }) => {
        const receiverSocketId = activeUsers.findSocketId(receiverId);
        if (receiverSocketId)
            socket.broadcast
                .to(receiverSocketId)
                .emit("message", { senderId, message });
    });
    socket.on("seen", (receiverId) => {
        const receiverSocketId = activeUsers.findSocketId(receiverId);
        const viewerId = activeUsers.findUserId(socket.id);
        if (receiverSocketId)
            socket.broadcast.to(receiverSocketId).emit("seen", viewerId);
    });
    socket.on("disconnect", () => __awaiter(void 0, void 0, void 0, function* () {
        const userId = activeUsers.findUserId(socket.id);
        socket.broadcast.emit("offline", userId);
        activeUsers.deleteUser(socket.id);
        yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeen: Date.now().toString() },
        });
        console.log(activeUsers.users);
    }));
});
server.listen(3001, () => {
    console.log("server running");
});
