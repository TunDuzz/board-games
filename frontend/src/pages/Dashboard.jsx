import { useNavigate } from "react-router-dom";
import { Crown, CircleDot, Grid3X3, TrendingUp, Trophy, Gamepad2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { userService } from "@/services/user.service";
import { gameTypeLabels } from "@/data/mock";
import { useState, useEffect } from "react";

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
    type: "gomoku",
    title: "Gomoku",
    description: "Get five in a row on a 15×15 grid. Simple yet deep.",
    icon: Grid3X3,
    url: "/game/gomoku",
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="text-center py-10">Không tìm thấy thông tin người dùng.</div>
      </AppLayout>
    );
  }

  const stats = user.UserStat || { total_matches: 0, wins: 0, losses: 0, draws: 0 };
  const winRate = stats.total_matches > 0
    ? Math.round((stats.wins / stats.total_matches) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user.full_name || user.username}</h1>
          <p className="text-muted-foreground">Choose a game or review your stats.</p>
        </div>

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
                onClick={() => navigate(game.url)}
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
                  <div key={match.id} className="flex items-center justify-between px-5 py-3.5">
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
    </AppLayout>
  );
};

export default Dashboard;
