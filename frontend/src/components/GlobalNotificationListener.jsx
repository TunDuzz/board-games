import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Gamepad, UserPlus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth.service";

export const GlobalNotificationListener = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    if (!currentUser) return;

    // Kết nối socket toàn cục nếu chưa kết nối
    if (!socket.connected) {
      socket.connect();
    }

    // Lắng nghe lời mời kết bạn
    socket.on("friend_request_received", (data) => {
      const { fromUser } = data;
      toast(`Lời mời kết bạn từ ${fromUser.username}`, {
        description: "Bạn có muốn xem danh sách lời mời không?",
        icon: <UserPlus className="h-4 w-4 text-blue-500" />,
        action: {
          label: "Xem",
          onClick: () => navigate("/friends"),
        },
      });
    });

    // Lắng nghe lời mời chơi game
    socket.on("game_invite_received", (data) => {
      const { invite } = data;
      const gameNames = {
        caro: "Cờ Caro",
        chess: "Cờ Vua",
        xiangqi: "Cờ Tướng",
      };
      const gameName = gameNames[invite.Room?.game_type_id] || "trò chơi";

      toast(`Lời mời chơi ${gameName}`, {
        description: `${invite.fromUser?.username} đang chờ bạn trong phòng ${invite.Room?.room_code}`,
        icon: <Gamepad className="h-4 w-4 text-green-500" />,
        duration: 10000,
        action: {
          label: "Đến Dashboard",
          onClick: () => navigate("/dashboard"),
        },
      });
    });

    return () => {
      socket.off("friend_request_received");
      socket.off("game_invite_received");
    };
  }, [currentUser, navigate]);

  return null;
};
