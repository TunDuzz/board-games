import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function PlayerInfoBar({ name, rating = 1500, timer = "10:00" }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-muted text-xs">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">Rating: {rating}</p>
        </div>
      </div>
      <div className="rounded-md bg-muted px-3 py-1.5 font-mono text-sm font-medium">
        {timer}
      </div>
    </div>
  );
}
