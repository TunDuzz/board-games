import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { userService } from "@/services/user.service";
import { Loader2, User, Crown, CircleDot, Grid3X3 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getRankFromElo, getRankColor } from "@/utils/rank";

const GAMES = [
  { key: "chess",   label: "Cờ Vua",   icon: Crown },
  { key: "xiangqi", label: "Cờ Tướng", icon: CircleDot },
  { key: "caro",    label: "Cờ Caro",  icon: Grid3X3 },
];

const RankBadge = ({ index }) => {
  if (index === 0) return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold text-xs ring-2 ring-amber-300">
      🥇
    </span>
  );
  if (index === 1) return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold text-xs ring-2 ring-slate-300">
      🥈
    </span>
  );
  if (index === 2) return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-bold text-xs ring-2 ring-orange-300">
      🥉
    </span>
  );
  return (
    <span className="text-muted-foreground text-sm ml-2 tabular-nums">{index + 1}</span>
  );
};

const LeaderboardTable = ({ gameType }) => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setRankings([]);
    userService.getRankings(gameType)
      .then(data => setRankings(data))
      .catch(err => console.error("Failed to fetch rankings:", err))
      .finally(() => setLoading(false));
  }, [gameType]);

  if (loading) {
    return (
      <div className="flex h-[360px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-14 pl-4">Hạng</TableHead>
              <TableHead>Người chơi</TableHead>
              <TableHead className="text-right">ELO</TableHead>
              <TableHead className="text-right">Thắng</TableHead>
              <TableHead className="text-right">Thua</TableHead>
              <TableHead className="text-right">Tỉ lệ thắng</TableHead>
              <TableHead className="text-right pr-4">Số ván</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankings.map((player, index) => (
              <TableRow
                key={player.username}
                className={index < 3 ? "bg-muted/20 hover:bg-muted/40" : "hover:bg-muted/20"}
              >
                <TableCell className="pl-4">
                  <RankBadge index={index} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-9 w-9 border-2 border-border">
                        <AvatarImage src={player.avatarUrl} />
                        <AvatarFallback className="text-xs font-semibold bg-accent">
                          {player.displayName?.slice(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>
                      {index === 0 && (
                        <Crown className="absolute -top-2 -right-1 h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-tight">{player.displayName}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border mt-0.5 inline-block ${getRankColor(getRankFromElo(player.elo))}`}>
                        {getRankFromElo(player.elo)}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-bold text-sm tabular-nums text-primary">{player.elo}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-medium text-emerald-600 tabular-nums">{player.wins ?? "-"}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-medium text-rose-500 tabular-nums">{player.losses ?? "-"}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-medium text-emerald-600">{player.winRate}</span>
                </TableCell>
                <TableCell className="text-right pr-4 text-muted-foreground text-sm tabular-nums">
                  {player.totalGames}
                </TableCell>
              </TableRow>
            ))}
            {rankings.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <User className="h-8 w-8 opacity-30" />
                    <span>Chưa có dữ liệu xếp hạng cho game này.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const Rankings = () => {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Bảng xếp hạng</h1>
        <p className="text-muted-foreground mt-2">Cạnh tranh và vinh danh những người chơi xuất sắc nhất theo từng môn cờ.</p>
      </div>

      <Tabs defaultValue="chess">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          {GAMES.map(game => (
            <TabsTrigger key={game.key} value={game.key} className="gap-2 px-4 py-2">
              <game.icon className="h-4 w-4" />
              <span className="font-medium text-sm">{game.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {GAMES.map(game => (
          <TabsContent key={game.key} value={game.key}>
            <LeaderboardTable gameType={game.key} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Rankings;
