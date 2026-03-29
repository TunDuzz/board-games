import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { userService } from "@/services/user.service";
import { gameTypeLabels } from "@/data/mock";
import { Loader2, PlayCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const resultColors = {
  win: "bg-emerald-100 text-emerald-700",
  loss: "bg-red-100 text-red-700",
  draw: "bg-amber-100 text-amber-700",
};

const MatchHistory = () => {
  const navigate = useNavigate();
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

  const handleReplay = (matchId) => {
    navigate(`/replay/${matchId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    )
  }

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Match History</h1>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {matches.map((match) => {
                const matchId = match.match_id || match.id;
                return (
                  <div key={matchId} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {gameTypeLabels[match.game_type_id] || match.game_type_id}
                      </Badge>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Trận đấu ngày {new Date(match.end_time || match.created_at).toLocaleDateString()}</span>
                        <span className="text-xs text-muted-foreground">{new Date(match.end_time || match.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${resultColors[match.result] || "bg-gray-100"}`}>
                        {match.result ? match.result.charAt(0).toUpperCase() + match.result.slice(1) : "Unknown"}
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => handleReplay(matchId)}
                      >
                        <PlayCircle className="h-3.5 w-3.5" /> Xem lại
                      </Button>
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
      </div>
    </>
  );
};

export default MatchHistory;
