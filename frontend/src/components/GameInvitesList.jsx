import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Gamepad, Check, X } from "lucide-react";
import { gameInviteService } from "@/services/gameInvite.service";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const GameInvitesList = () => {
    const navigate = useNavigate();
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvites();
        const interval = setInterval(fetchInvites, 10000); 
        return () => clearInterval(interval);
    }, []);

    const fetchInvites = async () => {
        try {
            const data = await gameInviteService.getReceivedInvites();
            setInvites(data.invites || []);
        } catch (error) {
            console.error("Failed to fetch invites:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (inviteId, roomId, gameTypeName, roomCode) => {
        try {
            await gameInviteService.acceptInvite(inviteId);
            toast.success("Đã chấp nhận lời mời!");
            
            if (roomId && gameTypeName && roomCode) {
                navigate(`/game/${gameTypeName}?roomId=${roomId}&code=${roomCode}`);
            } else {
                toast.error("Thiếu thông tin phòng để chuyển hướng.");
            }
            
            setInvites(prev => prev.filter(inv => inv.invite_id !== inviteId));
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi chấp nhận lời mời.");
        }
    };

    const handleReject = async (inviteId) => {
        try {
            await gameInviteService.rejectInvite(inviteId);
            toast.success("Đã từ chối lời mời.");
            setInvites(prev => prev.filter(inv => inv.invite_id !== inviteId));
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi từ chối lời mời.");
        }
    };

    const getGameName = (typeId) => {
        const games = {
            "chess": "Cờ vua",
            "xiangqi": "Cờ tướng",
            "caro": "Cờ caro"
        };
        return games[typeId] || typeId;
    };

    if (loading && invites.length === 0) return null;
    if (invites.length === 0) return null;

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                <Gamepad className="h-4 w-4" /> Lời mời chơi game ({invites.length})
            </h3>
            {invites.map(invite => (
                <Card key={invite.invite_id} className="border-primary/50 bg-primary/5">
                    <CardContent className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border-2 border-primary/20">
                                <AvatarImage src={invite.fromUser?.avatar_url} />
                                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                                    {(invite.fromUser?.full_name || invite.fromUser?.username || "G").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-bold">
                                    {invite.fromUser?.full_name || invite.fromUser?.username}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Mời bạn chơi <span className="font-semibold text-foreground">{getGameName(invite.Room?.game_type_id || "game")}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-1.5">
                            <Button size="xs" className="h-8 px-2.5 text-xs" onClick={() => handleAccept(invite.invite_id, invite.Room?.room_id, invite.Room?.GameType?.name, invite.Room?.room_code)}>
                                <Check className="h-3.5 w-3.5 mr-1" /> Tham gia
                            </Button>
                            <Button variant="outline" size="xs" className="h-8 px-2.5 text-xs" onClick={() => handleReject(invite.invite_id)}>
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default GameInvitesList;
