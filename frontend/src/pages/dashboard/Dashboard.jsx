import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Crown, CircleDot, Grid3X3, TrendingUp, Trophy, Gamepad2, Loader2, Bot, Swords, Users, Copy, PlayCircle, ArrowRight, XCircle, MinusCircle } from "lucide-react";
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
import { friendService } from "@/services/friend.service";
import { gameInviteService } from "@/services/gameInvite.service";
import { toast } from "sonner";
import GameInvitesList from "@/components/GameInvitesList";
import { socket } from "@/lib/socket";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getRankFromElo, getRankColor } from "@/utils/rank";

const gameCards = [
  {
    type: "chess",
    title: "Cờ Vua",
    description: "Trò chơi chiến thuật kinh điển trên bàn cờ 8×8.",
    icon: Crown,
    url: "/game/chess",
  },
  {
    type: "xiangqi",
    title: "Cờ Tướng",
    description: "Đấu trí bằng chiến thuật quân sự trên bàn cờ 9×10.",
    icon: CircleDot,
    url: "/game/xiangqi",
  },
  {
    type: "caro",
    title: "Cờ Caro",
    description: "Xếp 5 quân thành hàng trên lưới 15×15. Đơn giản mà tinh tế.",
    icon: Grid3X3,
    url: "/game/caro",
  },
];

const resultColors = {
  win: "bg-emerald-100 text-emerald-700 border-emerald-200",
  lose: "bg-rose-100 text-rose-700 border-rose-200",
  draw: "bg-amber-100 text-amber-700 border-amber-200",
  timeout: "bg-orange-100 text-orange-700 border-orange-200",
  resign: "bg-slate-100 text-slate-700 border-slate-200",
};

const resultLabels = {
  win: "Bạn thắng",
  lose: "Bạn thua",
  draw: "Hòa",
  timeout: "Hết giờ",
  resign: "Đầu hàng",
};

const resultIcons = {
  win: Trophy,
  lose: XCircle,
  draw: MinusCircle,
  timeout: MinusCircle,
  resign: XCircle,
};

const gameTypeDisplayNames = {
  "chess": "Cờ Vua",
  "xiangqi": "Cờ Tướng",
  "caro": "Cờ Caro",
  "1": "Cờ Vua",
  "2": "Cờ Tướng",
  "3": "Cờ Caro"
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States cho Modal và Matchmaking
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [searchTime, setSearchTime] = useState(0);
  const [inputCode, setInputCode] = useState("");
  const [friends, setFriends] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileData, historyData, friendsData] = await Promise.all([
          userService.getProfile(),
          userService.getMatchHistory(),
          friendService.getFriends()
        ]);
        setUser(profileData);
        setMatches(historyData);
        setFriends(friendsData.friends || []);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.on("friend_status_changed", ({ userId, status }) => {
      setFriends(prev => prev.map(f =>
        f.user_id === userId ? { ...f, status } : f
      ));
    });

    return () => {
      socket.off("friend_status_changed");
    };
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
    handleJoinQueueDirectly(selectedGame);
  };

  const handleJoinQueueDirectly = async (game) => {
    try {
      const data = await matchmakingService.joinQueue(game.type);
      if (data.matched) {
        toast.success("Đã tìm thấy trận đấu!");
        setIsModalOpen(false);
        navigate(`${game.url}?roomId=${data.room?.room_id}&code=${data.room?.room_code}`);
      } else {
        setSelectedGame(game);
        setIsModalOpen(true);
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
      setCurrentRoom(data.room);
      toast.success("Tạo phòng thành công!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi tạo phòng.");
    }
  };

  const handleSendInvite = async (friendId) => {
    if (!currentRoom) return;
    try {
      await gameInviteService.sendInvite(friendId, currentRoom.room_id);
      toast.success("Đã gửi lời mời chơi!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi gửi lời mời.");
    }
  };

  const handleEnterRoom = () => {
    if (currentRoom && selectedGame) {
      navigate(`${selectedGame.url}?roomId=${currentRoom.room_id}&code=${currentRoom.room_code}`);
    }
  };

  const handleJoinByCode = async () => {
    if (!inputCode) return;
    try {
      const data = await roomService.joinRoom(inputCode, null, selectedGame?.type);
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

  if (error || !user) {
    return (
      <div className="text-center py-10 space-y-4">
        <p className="text-muted-foreground">{error || "Không tìm thấy thông tin người dùng."}</p>
        <Button onClick={() => window.location.reload()}>Thử lại</Button>
      </div>
    );
  }

  const stats = user.UserStat || { total_matches: 0, wins: 0, losses: 0, draws: 0 };
  const winRate = stats.total_matches > 0
    ? Math.round((stats.wins / stats.total_matches) * 100)
    : 0;

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Chào mừng bạn trở lại, {user.full_name || user.username}</h1>
          <p className="text-muted-foreground mt-2">Chọn một trò chơi hoặc xem lại thống kê của bạn.</p>
        </div>

        {/* Danh sách lời mời chơi game */}
        <GameInvitesList />

        {/* Statistics by Game Type */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Thống kê theo trò chơi</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {gameCards.map((game) => {
              const gameStat = user.gameStats?.find(s =>
                s.game_type_id === (game.type === 'chess' ? 1 : game.type === 'xiangqi' ? 2 : 3)
              ) || { elo: 0, matches: 0, wins: 0, losses: 0, draws: 0 };

              return (
                <Card key={game.type} className="overflow-hidden border-t-4" style={{ borderTopColor: game.type === 'chess' ? '#3b82f6' : game.type === 'xiangqi' ? '#ef4444' : '#10b981' }}>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <game.icon className="h-4 w-4" /> {game.title}
                    </CardTitle>
                    <Badge variant="outline" className={`${getRankColor(getRankFromElo(gameStat.elo))} font-bold`}>
                      {getRankFromElo(gameStat.elo)}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-2xl font-bold">{gameStat.elo}</div>
                        <p className="text-xs text-muted-foreground uppercase tracking-tighter">Elo hiện tại</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-emerald-600">{gameStat.wins}W - {gameStat.losses}L</div>
                        <p className="text-[10px] text-muted-foreground">{gameStat.matches} trận đã đấu</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Game Selection */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Bắt đầu chơi</h2>
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
          <h2 className="mb-4 text-lg font-semibold">Trận đấu gần đây</h2>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y">
                {matches.slice(0, 5).map((match) => {
                  const matchTime = match.end_time || match.start_time || match.created_at;
                  const dateObj = matchTime ? new Date(matchTime) : new Date();
                  const resultKey = match.user_result || match.result || "draw";
                  const displayResult = resultLabels[resultKey] || resultKey;
                  const resultClassName = resultColors[resultKey] || "bg-gray-100 text-gray-600";
                  const ResultIcon = resultIcons[resultKey];
                  const opponent = match.player1_id === user.user_id ? match.player2 : match.player1;

                  return (
                    <div 
                      key={match.match_id || match.id} 
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/replay/${match.match_id || match.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border shadow-sm">
                          <AvatarImage src={opponent?.avatar_url} />
                          <AvatarFallback className="text-[10px] font-bold bg-muted text-muted-foreground">
                            {opponent?.username?.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <span className="group-hover:text-primary transition-colors">vs {opponent?.full_name || opponent?.username || "Ẩn danh"}</span>
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold h-4 bg-primary/10 text-primary border-none">
                              {gameTypeDisplayNames[match.game_type_id] || "Game"}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground opacity-70">
                            {dateObj.toLocaleDateString('vi-VN')} {dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1.5 shadow-sm border ${resultClassName}`}>
                          {ResultIcon && <ResultIcon className="h-3 w-3" />}
                          {displayResult}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0 hidden sm:block">
                           <PlayCircle className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {matches.length > 5 && (
                  <div 
                    className="px-5 py-4 text-center border-t hover:bg-muted/20 transition-colors cursor-pointer group"
                    onClick={() => navigate('/history')}
                  >
                    <span className="text-xs font-bold text-primary flex items-center justify-center gap-1.5">
                      Xem tất cả lịch sử đấu
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                )}

                {matches.length === 0 && (
                  <div className="px-5 py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                    <Swords className="h-8 w-8 opacity-20" />
                    <p>Chưa có trận đấu nào gần đây.</p>
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

          <div className="flex flex-col gap-3 py-4 max-h-[70vh] overflow-y-auto">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center p-6 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="font-semibold">Đang tìm đối thủ ({Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, '0')})...</p>
                <Button variant="destructive" size="sm" onClick={handleCancelQueue}>Hủy tìm trận</Button>
              </div>
            ) : roomCode ? (
              <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
                <div className="bg-emerald-100 text-emerald-700 font-bold p-3 rounded-md animate-bounce w-full">
                  Phòng đã tạo!
                </div>
                <p className="text-xl font-black tracking-widest">{roomCode}</p>

                <div className="w-full space-y-4">
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(roomCode); toast.success("Đã copy!"); }}>
                      Copy Mã
                    </Button>
                    <Button className="flex-1" onClick={handleEnterRoom}>Vào Phòng</Button>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold mb-3 text-left">Mời bạn bè online:</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {friends.filter(f => f.status === 'online' || f.status === 'in_game').length > 0 ? (
                        friends.filter(f => f.status === 'online' || f.status === 'in_game').map(friend => (
                          <div key={friend.user_id} className="flex items-center justify-between p-2 rounded-lg bg-accent/30">
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <Avatar className="h-7 w-7">
                                  <AvatarImage src={friend.avatar_url} />
                                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                                    {friend.username.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-background z-10 ${friend.status === 'in_game' ? 'bg-amber-500' : 'bg-green-500'
                                  }`} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-medium truncate max-w-[100px]">{friend.username}</span>
                                {friend.status === 'in_game' && (
                                  <span className="text-[8px] text-amber-600 leading-none">Trong trận</span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="xs"
                              className="h-7 text-[10px]"
                              disabled={friend.status === 'in_game'}
                              onClick={() => handleSendInvite(friend.user_id)}
                            >
                              {friend.status === 'in_game' ? "Bận" : "Mời"}
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground py-2 italic text-left">Không có bạn bè nào đang online.</p>
                      )}
                    </div>
                  </div>
                </div>

                <Button variant="ghost" className="w-full mt-2" onClick={() => { setRoomCode(""); setCurrentRoom(null); }}>Quay lại</Button>
              </div>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  className="flex items-center justify-start gap-4 h-16 px-4 border-muted hover:border-primary hover:bg-primary/5 transition-all group focus-visible:ring-0 focus-visible:ring-offset-0 outline-none" 
                  onClick={handlePlayAI}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent group-hover:bg-primary/10 transition-colors">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">Chơi với Máy</p>
                    <p className="text-xs text-muted-foreground">Luyện tập với bot thông minh.</p>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="flex items-center justify-start gap-4 h-16 px-4 border-muted hover:border-primary hover:bg-primary/5 transition-all group focus-visible:ring-0 focus-visible:ring-offset-0 outline-none" 
                  onClick={handleJoinQueue}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent group-hover:bg-primary/10 transition-colors">
                    <Swords className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">Ghép Trận</p>
                    <p className="text-xs text-muted-foreground">Tìm đối thủ xứng tầm trực tuyến.</p>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="flex items-center justify-start gap-4 h-16 px-4 border-muted hover:border-primary hover:bg-primary/5 transition-all group focus-visible:ring-0 focus-visible:ring-offset-0 outline-none" 
                  onClick={handleCreateRoom}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent group-hover:bg-primary/10 transition-colors">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">Chơi với Bạn Bè</p>
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
