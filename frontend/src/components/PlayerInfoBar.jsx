import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getRankFromElo, getRankColor } from "@/utils/rank";

export function PlayerInfoBar({ name, rating = 0, timer = "30:00" }) {
  const rankName = getRankFromElo(rating);
  const rankColors = getRankColor(rankName);

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card/60 backdrop-blur-sm p-2 shadow-sm">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8 border border-primary/20">
          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
            {name ? name.slice(0, 2).toUpperCase() : "??"}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <p className="text-xs font-bold tracking-tight leading-none">{name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shadow-sm ${rankColors}`}>
              {rankName}
            </span>
            <span className="text-[9px] text-muted-foreground font-medium">
              ELO: {rating}
            </span>
          </div>
        </div>
      </div>
      <div className="rounded bg-muted px-2 py-1 font-mono text-xs font-medium">
        {timer}
      </div>
    </div>
  );
}
