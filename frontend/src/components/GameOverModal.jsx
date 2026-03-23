import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Skull, Handshake, Flag } from "lucide-react";

export const GameOverModal = ({ 
    isOpen, 
    onClose, 
    result, // "win", "lose", "draw", "resign"
    winnerName, 
    message,
    onExit 
}) => {
    
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
            <DialogContent className="sm:max-w-md text-center">
                <DialogHeader className="flex flex-col items-center gap-2">
                    <div className={`p-4 rounded-full ${details.bg} mb-2 animate-bounce`}>
                        {details.icon}
                    </div>
                    <DialogTitle className={`text-2xl font-bold ${details.color}`}>
                        {details.title}
                    </DialogTitle>
                    <DialogDescription className="text-base mt-1">
                        {message || (winnerName ? `Người thắng: ${winnerName}` : "Trận đấu đã kết thúc.")}
                    </DialogDescription>
                </DialogHeader>
                
                <DialogFooter className="sm:justify-center gap-2 mt-4">
                    <Button variant="outline" onClick={onClose}>
                        Đóng
                    </Button>
                    {onExit && (
                        <Button variant="destructive" onClick={onExit}>
                            Thoát phòng
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
