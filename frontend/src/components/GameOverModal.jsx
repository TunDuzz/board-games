import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Skull, Handshake, Flag } from "lucide-react";
import { getRankFromElo, getRankColor } from "@/utils/rank";

export const GameOverModal = ({ 
    isOpen, 
    onClose, 
    result, // "win", "lose", "draw", "resign"
    winnerName, 
    message,
    eloChange,
    newElo,
    captures,
    duration,
    onExit 
}) => {
    
    const formatDuration = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };





    const getResultDetails = () => {
        switch (result) {
            case "win":
                return {
                    title: "Chúc Mừng!",
                    color: "text-yellow-500",
                    icon: <Trophy className="h-16 w-16 text-yellow-500" />,
                    bg: "bg-yellow-500/10"
                };
            case "lose":
                return {
                    title: "Rất Tiếc!",
                    color: "text-destructive",
                    icon: <Skull className="h-16 w-16 text-destructive" />,
                    bg: "bg-destructive/10"
                };
            case "draw":
                return {
                    title: "Hòa Cờ!",
                    color: "text-blue-500",
                    icon: <Handshake className="h-16 w-16 text-blue-500" />,
                    bg: "bg-blue-500/10"
                };
            case "resign":
                return {
                    title: "Đã Đầu Hàng!",
                    color: "text-orange-500",
                    icon: <Flag className="h-16 w-16 text-orange-500" />,
                    bg: "bg-orange-500/10"
                };
            default:
                return {
                    title: "Kết Thúc",
                    color: "text-foreground",
                    icon: <Trophy className="h-16 w-16" />,
                    bg: "bg-accent"
                };
        }
    };

    const details = getResultDetails();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md text-center bg-background/95 backdrop-blur-sm border-white/10 shadow-2xl">
                <DialogHeader className="flex flex-col items-center gap-2">
                    <div className={`p-4 rounded-full ${details.bg} mb-2 animate-bounce`}>
                        {details.icon}
                    </div>
                    <DialogTitle className={`text-3xl font-bold ${details.color} tracking-tight`}>
                        {details.title}
                    </DialogTitle>
                    <DialogDescription className="text-base mt-1 font-medium text-foreground/80">
                        {message || (winnerName ? `Người thắng: ${winnerName}` : "Trận đấu đã kết thúc.")}
                    </DialogDescription>
                </DialogHeader>

                {/* Thống kê trận đấu */}
                <div className="grid grid-cols-2 gap-3 mt-4 px-2">
                    {eloChange !== undefined && (
                        <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-xs text-muted-foreground uppercase font-semibold">Thay đổi ELO</span>
                            <span className={`text-xl font-bold ${eloChange >= 0 ? "text-green-500" : "text-destructive"}`}>
                                {eloChange >= 0 ? `+${eloChange}` : eloChange}
                            </span>
                            {newElo !== undefined && (
                                <div className="flex flex-col items-center gap-1 mt-2">
                                    <span className="text-sm font-medium text-muted-foreground italic mb-1">Cấp bậc hiện tại</span>
                                    <div className={`px-4 py-1.5 rounded-full border ${getRankColor(getRankFromElo(newElo))} font-bold text-lg shadow-sm animate-in fade-in zoom-in duration-500`}>
                                        {getRankFromElo(newElo)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {duration !== undefined && duration > 0 && (
                        <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-xs text-muted-foreground uppercase font-semibold">Thời gian</span>
                            <span className="text-xl font-bold text-foreground">{formatDuration(duration)}</span>
                        </div>
                    )}
                    {captures !== undefined && captures > 0 && (
                        <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5 col-span-2">
                            <span className="text-xs text-muted-foreground uppercase font-semibold">Quân cờ đã ăn</span>
                            <span className="text-xl font-bold text-blue-400">{captures} quân</span>
                        </div>
                    )}
                </div>
                
                <DialogFooter className="sm:justify-center gap-2 mt-6">
                    <Button variant="outline" className="min-w-[100px] hover:bg-white/5 transition-colors" onClick={onClose}>
                        Đóng
                    </Button>
                    {onExit && (
                        <Button variant="destructive" className="min-w-[120px] shadow-lg shadow-destructive/20" onClick={onExit}>
                            Thoát phòng
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
