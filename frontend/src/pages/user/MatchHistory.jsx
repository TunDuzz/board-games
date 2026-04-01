import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { userService } from "@/services/user.service";
import { Loader2, PlayCircle, Swords, User, Gamepad2, Crown, CircleDot, Grid3X3, ChevronLeft, ChevronRight, Trophy, XCircle, MinusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getRankFromElo, getRankColor } from "@/utils/rank";

const GAMES = [
  { key: "all",     label: "Tất cả",   icon: Gamepad2 },
  { key: "chess",   label: "Cờ Vua",   icon: Crown },
  { key: "xiangqi", label: "Cờ Tướng", icon: CircleDot },
  { key: "caro",    label: "Cờ Caro",  icon: Grid3X3 },
];

const GAME_LABELS = { 1: "Cờ Vua", 2: "Cờ Tướng", 3: "Cờ Caro", chess: "Cờ Vua", xiangqi: "Cờ Tướng", caro: "Cờ Caro" };

const RESULT_CONFIG = {
  win:     { label: "Bạn thắng",  cls: "bg-emerald-100 text-emerald-700", icon: Trophy },
  lose:    { label: "Bạn thua",   cls: "bg-rose-100 text-rose-700",     icon: XCircle },
  draw:    { label: "Hòa",        cls: "bg-amber-100 text-amber-700",    icon: MinusCircle },
  timeout: { label: "Hết giờ",    cls: "bg-orange-100 text-orange-700",  icon: MinusCircle },
  resign:  { label: "Đầu hàng",   cls: "bg-slate-100 text-slate-600",    icon: XCircle },
};

const formatDuration = (secs) => {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}p ${s}s` : `${s}s`;
};

const MatchCard = ({ match, onReplay, currentUserId }) => {
  const matchId = match.match_id || match.id;
  const matchTime = match.end_time || match.start_time;
  const dateObj = matchTime ? new Date(matchTime) : new Date();

  // Kết quả của user hiện tại
  const resultKey = match.user_result || match.result || "draw";
  const result = RESULT_CONFIG[resultKey] || RESULT_CONFIG.draw;

  // Xác định đối thủ chính xác dựa trên currentUserId
  const opponentInfo = match.player1_id === currentUserId ? match.player2 : match.player1;

  const gameName = GAME_LABELS[match.game_type_id] || "Game";
  const duration = formatDuration(match.duration_seconds);

  return (
    <div 
      className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors group cursor-pointer"
      onClick={() => onReplay(matchId)}
    >
      <div className="flex items-center gap-3">
        {/* Avatar đối thủ */}
        <Avatar className="h-9 w-9 border shadow-sm flex-shrink-0">
          <AvatarImage src={opponentInfo?.avatar_url} />
          <AvatarFallback className="text-[10px] font-bold bg-muted text-muted-foreground">
            {opponentInfo?.username?.slice(0, 2).toUpperCase() || "??"}
          </AvatarFallback>
        </Avatar>

        {/* Thông tin chính */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm group-hover:text-primary transition-colors">
              vs {opponentInfo?.full_name || opponentInfo?.username || "Ẩn danh"}
            </span>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-none font-bold">
              {gameName}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground opacity-70">
            <span>{dateObj.toLocaleDateString('vi-VN')} {dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
            {duration && (
              <>
                <span className="opacity-40">·</span>
                <span>{duration}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Kết quả - Dạng pill như Dashboard */}
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1.5 shadow-sm border ${result.cls}`}>
          <result.icon className="h-3 w-3" />
          {result.label}
        </span>
        
        {/* Play icon transition như Dashboard */}
        <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 hidden sm:block">
           <PlayCircle className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
};

const HistoryList = ({ gameType, onReplay, currentUserId }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    setLoading(true);
    setMatches([]);
    setCurrentPage(1); // Reset page when tab changes
    const key = gameType === "all" ? undefined : gameType;
    userService.getMatchHistory(key)
      .then(data => setMatches(data))
      .catch(err => console.error("Failed to fetch history:", err))
      .finally(() => setLoading(false));
  }, [gameType]);

  const totalPages = Math.max(1, Math.ceil(matches.length / ITEMS_PER_PAGE));
  const paginatedMatches = matches.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y min-h-[300px]">
          {paginatedMatches.map(match => (
            <MatchCard key={match.match_id || match.id} match={match} onReplay={onReplay} currentUserId={currentUserId} />
          ))}
          {matches.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[300px] gap-3 text-muted-foreground">
              <Swords className="h-10 w-10 opacity-20" />
              <p className="text-sm">Chưa có trận đấu nào{gameType !== "all" ? ` cho ${GAME_LABELS[gameType]}` : ""}.</p>
            </div>
          )}
        </div>

        {/* Summary footer */}
        {matches.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 border-t bg-muted/10 gap-4">
            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 mx-2 text-xs font-semibold">
                <span className="text-primary">{currentPage}</span>
                <span className="text-muted-foreground opacity-50">/</span>
                <span className="text-muted-foreground">{totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Summary info */}
            <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                <span>{matches.filter(m => m.user_result === "win").length} Thắng</span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                <span>{matches.filter(m => m.user_result === "lose").length} Thua</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                <span>{matches.filter(m => m.user_result === "draw").length} Hòa</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const MatchHistory = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    userService.getProfile().then(setUser).catch(console.error);
  }, []);

  const handleReplay = (matchId) => {
    navigate(`/replay/${matchId}`);
  };

  if (!user) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Lịch sử đấu</h1>
        <p className="text-muted-foreground mt-2">Xem lại các trận đấu bạn đã tham gia.</p>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          {GAMES.map(game => (
            <TabsTrigger key={game.key} value={game.key} className="gap-2 px-4">
              <game.icon className="h-4 w-4" />
              <span className="hidden sm:inline font-medium">{game.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {GAMES.map(game => (
          <TabsContent key={game.key} value={game.key}>
            <HistoryList gameType={game.key} onReplay={handleReplay} currentUserId={user.user_id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default MatchHistory;
