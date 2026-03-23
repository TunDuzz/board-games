import { io } from "socket.io-client";

// Lấy base URL từ VITE_API_URL (ví dụ: http://localhost:3001/api -> http://localhost:3001)
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
const socketUrl = apiUrl.replace("/api", "");

export const socket = io(socketUrl, {
  autoConnect: false, // Chỉ kết nối khi vào màn chơi game
  auth: (cb) => {
    const token = localStorage.getItem("token");
    cb({ token });
  }
});
