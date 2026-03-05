import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { userService } from "@/services/user.service";
import { Loader2, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getRankFromElo, getRankColor } from "@/utils/rank";

const Rankings = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const data = await userService.getRankings();
        setRankings(data);
      } catch (error) {
        console.error("Failed to fetch rankings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRankings();
  }, []);

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Global Rankings</h1>

        {loading ? (
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Elo</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                    <TableHead className="text-right">Games</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankings.map((player, index) => (
                    <TableRow key={player.username}>
                      <TableCell className="font-medium">
                        {index + 1 <= 3 ? (
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${index + 1 === 1 ? "bg-amber-100 text-amber-700"
                            : index + 1 === 2 ? "bg-gray-100 text-gray-600"
                              : "bg-orange-100 text-orange-700"
                            }`}>
                            {index + 1}
                          </span>
                        ) : (
                          <span className="text-muted-foreground ml-2">{index + 1}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={player.avatarUrl} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{player.displayName}</p>
                            <p className={`text-xs px-1.5 py-0.5 rounded-md inline-block mt-0.5 font-medium ${getRankColor(getRankFromElo(player.elo))}`}>
                              {getRankFromElo(player.elo)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{player.elo}</TableCell>
                      <TableCell className="text-right text-sm text-emerald-600 font-medium">{player.winRate}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{player.totalGames}</TableCell>
                    </TableRow>
                  ))}
                  {rankings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Chưa có dữ liệu xếp hạng.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default Rankings;
