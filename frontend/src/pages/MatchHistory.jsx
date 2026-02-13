import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { userService } from "@/services/user.service";
import { gameTypeLabels } from "@/data/mock";
import { Loader2 } from "lucide-react";

const resultColors = {
  win: "bg-emerald-100 text-emerald-700",
  loss: "bg-red-100 text-red-700",
  draw: "bg-amber-100 text-amber-700",
};

const MatchHistory = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await userService.getMatchHistory();
        setMatches(data);
      } catch (error) {
        console.error("Failed to fetch match history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Match History</h1>

        {loading ? (
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {matches.map((match) => {
                  const isWin = match.result === "win"; // Adjust based on BE response
                  return (
                    <div key={match.id} className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-xs font-normal">
                          {gameTypeLabels[match.game_type] || match.game_type}
                        </Badge>
                        <span className="text-sm">Trận đấu kết thúc vào {new Date(match.end_time).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${resultColors[match.result] || "bg-gray-100"}`}>
                          {match.result ? match.result.charAt(0).toUpperCase() + match.result.slice(1) : "Unknown"}
                        </span>
                        <span className={`text-xs font-medium ${match.rating_change > 0 ? "text-emerald-600" : match.rating_change < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                          {match.rating_change > 0 ? "+" : ""}{match.rating_change}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {matches.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Bạn chưa có trận đấu nào.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default MatchHistory;
