import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Gamepad, UserPlus, Check, X, Bell, RotateCcw } from "lucide-react";
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

    // Lắng nghe lời mời kết bạn (Chưa được chấp nhận)
    socket.on("friend_request_received", (data) => {
      const { fromUser } = data;
      toast(`Lời mời kết bạn`, {
        description: `${fromUser.username} đã gửi lời mời kết bạn cho bạn.`,
        icon: <UserPlus className="h-4 w-4 text-blue-500" />,
        action: {
          label: "Xem",
          onClick: () => navigate("/friends"),
        },
      });
    });

    // Lắng nghe lời mời kết bạn được chấp nhận
    socket.on("friend_request_accepted", (data) => {
      const { fromUser } = data;
      toast(`Yêu cầu kết bạn đã được chấp nhận`, {
        description: `${fromUser.username} và bạn hiện đã là bạn bè!`,
        icon: <Check className="h-4 w-4 text-green-500" />,
        action: {
          label: "Nhắn tin",
          onClick: () => navigate("/friends"),
        },
      });
    });

    // Lắng nghe trạng thái bạn bè online/offline
    socket.on("friend_status_changed", (data) => {
      const { userId, status, username } = data;
      // Chỉ hiện toast khi online (tránh làm phiền khi offline)
      if (status === "online") {
        toast(`Bạn bè online`, {
          description: `${username || 'Một người bạn'} vừa mới truy cập hệ thống.`,
          icon: <Bell className="h-4 w-4 text-amber-500" />,
          duration: 3000,
        });
      }
    });

    // Lắng nghe lời mời chơi game
    socket.on("game_invite_received", (data) => {
      const { invite } = data;
      const gameType = invite.Room?.game_type_id;
      const gameTypeMap = {
        1: "Cờ Caro",
        2: "Cờ Vua",
        3: "Cờ Tướng"
      };
      const gameName = gameTypeMap[gameType] || "trò chơi";

      toast(`Lời mời chơi ${gameName}`, {
        description: `${invite.fromUser?.username} đang mời bạn đấu một ván!`,
        icon: <Gamepad className="h-4 w-4 text-indigo-500" />,
        duration: 20000,
        action: {
          label: "Chấp nhận",
          onClick: () => navigate("/dashboard?invite=" + invite.room_id),
        },
      });
    });

    // Lắng nghe yêu cầu đi lại (Undo)
    socket.on("undo_request_received", (data) => {
      const { username } = data;
      const roomId = window.location.search.split("roomId=")[1]?.split("&")[0];
      
      toast(`Yêu cầu đi lại`, {
        description: `${username} muốn xin đi lại nước vừa rồi. Bạn có đồng ý không?`,
        icon: <RotateCcw className="h-4 w-4 text-orange-500" />,
        duration: 10000,
        action: {
          label: "Đồng ý",
          onClick: () => socket.emit("accept_undo", { roomId }),
        },
        cancel: {
            label: "Từ chối",
            onClick: () => socket.emit("reject_undo", { roomId }),
        }
      });
    });

    return () => {
      socket.off("friend_request_received");
      socket.off("friend_request_accepted");
      socket.off("friend_status_changed");
      socket.off("game_invite_received");
      socket.off("undo_request_received");
    };
  }, [currentUser, navigate]);

  return null;
};
