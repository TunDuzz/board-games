import { useNavigate } from "react-router-dom";
import { Crown, CircleDot, Grid3X3, TrendingUp, Trophy, Gamepad2, Loader2, Bot, Swords, Users, Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { userService } from "@/services/user.service";
import { gameTypeLabels } from "@/data/mock";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { matchmakingService } from "@/services/matchmaking.service";
import { roomService } from "@/services/room.service";
import { toast } from "sonner";
import GameInvitesList from "@/components/GameInvitesList";

const gameCards = [
  {
    type: "chess",
    title: "Chess",
    description: "The classic game of strategy and tactics on an 8×8 board.",
    icon: Crown,
    url: "/game/chess",
  },
  {
    type: "xiangqi",
    title: "Xiangqi",
    description: "Chinese Chess — battle across the river on a 9×10 board.",
    icon: CircleDot,
    url: "/game/xiangqi",
  },
  {
    type: "caro",
    title: "Caro",
    description: "Get five in a row on a 15×15 grid. Simple yet deep.",
    icon: Grid3X3,
    url: "/game/caro",
  },
];

const resultColors = {
  win: "bg-emerald-100 text-emerald-700",
  loss: "bg-red-100 text-red-700",
  draw: "bg-amber-100 text-amber-700",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // States cho Modal vÃ  Matchmaking
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [searchTime, setSearchTime] = useState(0);
  const [inputCode, setInputCode] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileData, historyData] = await Promise.all([
          userService.getProfile(),
          userService.getMatchHistory()
        ]);
        setUser(profileData);
        setMatches(historyData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Effect for matchmaking polling
  useEffect(() => {
    let interval;
    let timerInterval;

    if (isSearching) {
      setSearchTime(0);
      timerInterval = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);

      interval = setInterval(async () => {
        try {
          const data = await matchmakingService.checkStatus();
          if (data.matched) {
            clearInterval(interval);
            clearInterval(timerInterval);
            setIsSearching(false);
            setIsModalOpen(false);
            toast.success("Đã tìm thấy trận đấu!");
            if (data.room?.room_id) {
               navigate(`${selectedGame.url}?roomId=${data.room.room_id}&code=${data.room.room_code}`);
            }
          }
        } catch (error) {
          clearInterval(interval);
          clearInterval(timerInterval);
          setIsSearching(false);
        }
      }, 3000);
    }
    return () => {
      clearInterval(interval);
      clearInterval(timerInterval);
    };
  }, [isSearching, selectedGame, navigate]);

  const handleOpenModal = (game) => {
    setSelectedGame(game);
    setIsModalOpen(true);
    setIsSearching(false);
    setRoomCode("");
  };

  const handlePlayAI = () => {
    if (!selectedGame) return;
    setIsModalOpen(false);
    navigate(`${selectedGame.url}?mode=ai`);
  };

  const handleJoinQueue = async () => {
    if (!selectedGame) return;
    try {
      const data = await matchmakingService.joinQueue(selectedGame.type);
      if (data.matched) {
        toast.success("Đã tìm thấy trận đấu!");
        setIsModalOpen(false);
        navigate(`${selectedGame.url}?roomId=${data.room?.room_id}&code=${data.room?.room_code}`);
      } else {
        setIsSearching(true);
        toast.success("Đang tìm đối thủ...");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi ghép trận.");
    }
  };

  const handleCancelQueue = async () => {
    try {
      await matchmakingService.cancelQueue();
      setIsSearching(false);
      toast.success("Đã hủy tìm trận.");
    } catch (error) {
      toast.error("Lỗi hủy tìm trận.");
    }
  };

  const handleCreateRoom = async () => {
    if (!selectedGame) return;
    try {
      const data = await roomService.createRoom(selectedGame.type);
      setRoomCode(data.room?.room_code);
      toast.success("Tạo phòng thành công!");
      setIsModalOpen(false);
      navigate(`${selectedGame.url}?roomId=${data.room?.room_id}&code=${data.room?.room_code}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi tạo phòng.");
    }
  };

  const handleJoinByCode = async () => {
    if (!inputCode) return;
    try {
      const data = await roomService.joinRoom(inputCode);
      toast.success("Vào phòng thành công!");
      setIsModalOpen(false);
      navigate(`${selectedGame.url}?roomId=${data.room?.room_id}&code=${data.room?.room_code}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Mã phòng không hợp lệ hoặc đã đầy.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-10">Không tìm thấy thông tin người dùng.</div>
    );
  }

  const stats = user.UserStat || { total_matches: 0, wins: 0, losses: 0, draws: 0 };
  const winRate = stats.total_matches > 0
    ? Math.round((stats.wins / stats.total_matches) * 100)
    : 0;

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user.full_name || user.username}</h1>
          <p className="text-muted-foreground">Choose a game or review your stats.</p>
        </div>

        {/* Danh sách lời mời chơi game */}
        <GameInvitesList />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-accent p-2.5">
                <Gamepad2 className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_matches}</p>
                <p className="text-xs text-muted-foreground">Games Played</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-accent p-2.5">
                <TrendingUp className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{winRate}%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-accent p-2.5">
                <Trophy className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{user.elo}</p>
                <p className="text-xs text-muted-foreground">Elo Rating</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Game Selection */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Play a Game</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {gameCards.map((game) => (
              <Card
                key={game.type}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => handleOpenModal(game)}
              >
                <CardHeader className="pb-3">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                    <game.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <CardTitle className="text-base">{game.title}</CardTitle>
                  <CardDescription className="text-xs">{game.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Matches */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Recent Matches</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {matches.slice(0, 5).map((match) => (
                  <div key={match.match_id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {gameTypeLabels[match.game_type] || match.game_type}
                      </Badge>
                      <span className="text-sm">Trận đấu ngày {new Date(match.end_time).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${resultColors[match.result] || "bg-gray-100"}`}>
                        {match.result ? match.result.charAt(0).toUpperCase() + match.result.slice(1) : "Unknown"}
                      </span>
                    </div>
                  </div>
                ))}
                {matches.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No recent matches.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog Tùy chọn chơi */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tùy chọn chơi - {selectedGame?.title}</DialogTitle>
            <DialogDescription>
              Hãy chọn chế độ chơi bạn mong muốn.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center p-6 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="font-semibold">Đang tìm đối thủ ({Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, '0')})...</p>
                <Button variant="destructive" size="sm" onClick={handleCancelQueue}>Hủy tìm trận</Button>
              </div>
            ) : roomCode ? (
              <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
                <div className="bg-emerald-100 text-emerald-700 font-bold p-3 rounded-md animate-bounce">
                  Phòng đã tạo!
                </div>
                <p className="text-xl font-black tracking-widest">{roomCode}</p>
                <p className="text-sm text-muted-foreground">Chia sẻ mã này với bạn bè để cùng chơi.</p>
                <Button variant="outline" className="w-full mt-2" onClick={() => { navigator.clipboard.writeText(roomCode); toast.success("Đã copy!"); }}>
                   Copy Mã Phòng
                </Button>
                <Button className="w-full mt-2" onClick={() => setIsModalOpen(false)}>Đóng</Button>
              </div>
            ) : (
              <>
                <Button variant="outline" className="flex items-center justify-start gap-3 h-14" onClick={handlePlayAI}>
                  <Bot className="h-6 w-6 text-primary" />
                  <div className="text-left">
                    <p className="font-semibold text-sm">Chơi với Máy</p>
                    <p className="text-xs text-muted-foreground">Luyện tập với bot thông minh.</p>
                  </div>
                </Button>

                <Button variant="outline" className="flex items-center justify-start gap-3 h-14" onClick={handleJoinQueue}>
                  <Swords className="h-6 w-6 text-primary" />
                  <div className="text-left">
                    <p className="font-semibold text-sm">Ghép Trận</p>
                    <p className="text-xs text-muted-foreground">Tìm đối thủ xứng tầm trực tuyến.</p>
                  </div>
                </Button>

                <Button variant="outline" className="flex items-center justify-start gap-3 h-14" onClick={handleCreateRoom}>
                  <Users className="h-6 w-6 text-primary" />
                  <div className="text-left">
                    <p className="font-semibold text-sm">Chơi với Bạn Bè</p>
                    <p className="text-xs text-muted-foreground">Tạo phòng và mời bạn bè tham gia.</p>
                  </div>
                </Button>

                <div className="flex items-center gap-2 pt-2 border-t mt-2">
                  <Input 
                    placeholder="Nhập mã phòng kích hoạt..." 
                    value={inputCode} 
                    onChange={e => setInputCode(e.target.value.toUpperCase())} 
                  />
                  <Button onClick={handleJoinByCode}>Vào</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Dashboard;
