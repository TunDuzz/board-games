import React from 'react';
import { Button } from "@/components/ui/button";
import { Check, Box } from "lucide-react";
import { useGameTheme } from "@/hooks/useGameTheme.jsx";
import { cn } from "@/lib/utils";

export const ThemeSelector = () => {
  const { boardTheme, setBoardTheme, pieceSkin, setPieceSkin, themes, skins } = useGameTheme();

  return (
    <div className="space-y-6 pt-2">
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-1 w-8 bg-primary rounded-full" />
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-primary/80">Bàn cờ</h4>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {Object.keys(themes).map((id) => (
            <Button
              key={id}
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-3 h-10 text-xs transition-all duration-200 border",
                boardTheme === id 
                  ? "bg-primary/10 border-primary/50 text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]" 
                  : "border-transparent hover:bg-accent/50 hover:border-border"
              )}
              onClick={() => setBoardTheme(id)}
            >
              <div 
                className="w-5 h-5 rounded shadow-inner border border-white/20" 
                style={{ backgroundColor: themes[id].caro.bg }}
              />
              <span className="font-medium">{themes[id].name}</span>
              {boardTheme === id && (
                <div className="ml-auto bg-primary rounded-full p-0.5">
                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              )}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-1 w-8 bg-orange-500 rounded-full" />
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-orange-500/80">Quân cờ</h4>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {skins.map((s) => (
            <Button
              key={s.id}
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-3 h-10 text-xs transition-all duration-200 border",
                pieceSkin === s.id 
                  ? "bg-orange-500/10 border-orange-500/50 text-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.1)]" 
                  : "border-transparent hover:bg-accent/50 hover:border-border"
              )}
              onClick={() => setPieceSkin(s.id)}
            >
              <Box className="h-3.5 w-3.5 opacity-70" />
              <span className="font-medium">{s.name}</span>
              {pieceSkin === s.id && (
                <div className="ml-auto bg-orange-500 rounded-full p-0.5">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
