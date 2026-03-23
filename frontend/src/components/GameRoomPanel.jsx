import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { friendService } from "@/services/friend.service";
import { gameInviteService } from "@/services/gameInvite.service";
import { toast } from "sonner";
import { Copy, Share2, Users } from "lucide-react";

export const GameRoomPanel = ({ code, roomId }) => {
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(false);
    const [invitingIds, setInvitingIds] = useState([]);

    useEffect(() => {
        const fetchFriends = async () => {
            setLoading(true);
            try {
                const data = await friendService.getFriends();
                setFriends(data.friends || []);
            } catch (error) {
                console.error("Failed to fetch friends for invite:", error);
            } finally {
                setLoading(false);
            }
        };

        if (roomId) {
            fetchFriends();
        }
    }, [roomId]);

    const handleCopyCode = () => {
        navigator.clipboard.writeText(code);
        toast.success("Đã sao chép mã phòng!");
    };

    const handleInviteFriend = async (friendId) => {
        setInvitingIds(prev => [...prev, friendId]);
        try {
            await gameInviteService.sendInvite(friendId, roomId);
            toast.success("Mời bạn bè thành công!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Không thể gửi lời mời.");
        } finally {
            setInvitingIds(prev => prev.filter(id => id !== friendId));
        }
    };

    if (!code) return null;

    return (
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Phòng Thi Đấu
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-background rounded-lg p-3 border flex items-center justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground font-medium">Mã phòng</p>
                        <p className="text-lg font-black tracking-widest text-primary">{code}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={handleCopyCode}>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>

                <div>
                    <p className="text-xs text-muted-foreground font-medium mb-2">Mời bạn bè</p>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                        {friends.map(friend => (
                            <div key={friend.user_id} className="flex items-center justify-between p-2 rounded-md hover:bg-background/50">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={friend.avatar_url} />
                                        <AvatarFallback className="text-[10px]">
                                            {(friend.full_name || friend.username).slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-semibold truncate w-24">
                                        {friend.full_name || friend.username}
                                    </span>
                                </div>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-6 text-[10px] px-2"
                                    disabled={invitingIds.includes(friend.user_id)}
                                    onClick={() => handleInviteFriend(friend.user_id)}
                                >
                                    {invitingIds.includes(friend.user_id) ? "..." : "Mời"}
                                </Button>
                            </div>
                        ))}
                        {friends.length === 0 && !loading && (
                            <p className="text-center text-xs text-muted-foreground py-2">Chưa có bạn bè.</p>
                        )}
                        {loading && (
                            <p className="text-center text-xs text-muted-foreground py-2">Đang tải...</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
