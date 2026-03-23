import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search, UserPlus, UserMinus, Check, X, ShieldAlert } from "lucide-react";
import { friendService } from "@/services/friend.service";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner"; // Using sonner as it seems configured

const Friends = () => {
    const [activeTab, setActiveTab] = useState("friends");
    const [loading, setLoading] = useState(true);
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === "friends") {
                const data = await friendService.getFriends();
                setFriends(data.friends || []);
            } else if (activeTab === "requests") {
                const data = await friendService.getPendingRequests();
                setPendingRequests(data.requests || []);
            } else if (activeTab === "sent") {
                const data = await friendService.getSentRequests();
                setSentRequests(data.requests || []);
            }
        } catch (error) {
            console.error("Failed to fetch friends data:", error);
            toast.error("Không thể tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
        
        setSearching(true);
        try {
            const data = await friendService.searchUsers(searchQuery);
            setSearchResults(data.users || []);
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi tìm kiếm.");
        } finally {
            setSearching(false);
        }
    };

    const handleSendRequest = async (userId) => {
        try {
            await friendService.sendRequest(userId);
            toast.success("Đã gửi lời mời kết bạn!");
            if (searchQuery) {
                // Update search results state to reflect sent request
                setSearchResults(prev => prev.map(u => u.user_id === userId ? { ...u, relationship: "request_sent" } : u));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi gửi lời mời.");
        }
    };

    const handleAcceptRequest = async (friendId) => {
        try {
            await friendService.acceptRequest(friendId);
            toast.success("Đã chấp nhận kết bạn!");
            fetchData(); // Refresh current tab
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi xử lý.");
        }
    };

    const handleRejectRequest = async (friendId) => {
        try {
            await friendService.rejectRequest(friendId);
            toast.success("Đã từ chối lời mời.");
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi xử lý.");
        }
    };

    const handleRemoveFriend = async (friendId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa bạn bè?")) return;
        try {
            await friendService.removeFriend(friendId);
            toast.success("Đã xóa bạn bè.");
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi xóa bạn.");
        }
    };

    const tabs = [
        { id: "friends", label: "Bạn bè" },
        { id: "requests", label: "Lời mời" },
        { id: "sent", label: "Đã gửi" },
        { id: "search", label: "Tìm kiếm" }
    ];

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Quản lý Bạn bè</h1>

            {/* Custom Tabs */}
            <div className="flex border-b border-border">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 -mb-px text-sm font-medium transition-colors border-b-2 ${
                            activeTab === tab.id 
                            ? "border-primary text-foreground" 
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {tab.label}
                        {tab.id === "requests" && pendingRequests.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                                {pendingRequests.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading && activeTab !== "search" ? (
                <div className="flex h-[300px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="mt-4">
                    {/* Danh sách Bạn bè */}
                    {activeTab === "friends" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {friends.map(friend => (
                                <Card key={friend.user_id} className="hover:shadow-sm transition-shadow">
                                    <CardContent className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={friend.avatar_url} />
                                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                    {(friend.full_name || friend.username).slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{friend.full_name || friend.username}</p>
                                                <p className="text-xs text-muted-foreground">@{friend.username}</p>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => handleRemoveFriend(friend.user_id)}
                                        >
                                            <UserMinus className="h-4 w-4 mr-1" /> Xóa
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                            {friends.length === 0 && (
                                <p className="text-center text-muted-foreground col-span-2 py-10">Chưa có bạn bè.</p>
                            )}
                        </div>
                    )}

                    {/* Lời mời nhận được */}
                    {activeTab === "requests" && (
                        <div className="space-y-3">
                            {pendingRequests.map(req => (
                                <Card key={req.id}>
                                    <CardContent className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={req.from.avatar_url} />
                                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                    {(req.from.full_name || req.from.username).slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{req.from.full_name || req.from.username}</p>
                                                <p className="text-xs text-muted-foreground">Muốn kết bạn với bạn</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => handleAcceptRequest(req.from.user_id)}>
                                                <Check className="h-4 w-4 mr-1" /> Chấp nhận
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handleRejectRequest(req.from.user_id)}>
                                                <X className="h-4 w-4 mr-1" /> Từ chối
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {pendingRequests.length === 0 && (
                                <p className="text-center text-muted-foreground py-10">Không có lời mời nào.</p>
                            )}
                        </div>
                    )}

                    {/* Lời mời đã gửi */}
                    {activeTab === "sent" && (
                        <div className="space-y-3">
                            {sentRequests.map(req => (
                                <Card key={req.id}>
                                    <CardContent className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={req.to?.avatar_url} />
                                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                    {(req.to?.full_name || req.to?.username || "?").slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{req.to?.full_name || req.to?.username || "Unknown"}</p>
                                                <p className="text-xs text-muted-foreground">Đã gửi lời mời</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="text-muted-foreground" disabled>
                                            Đang chờ...
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                            {sentRequests.length === 0 && (
                                <p className="text-center text-muted-foreground py-10">Chưa gửi lời mời nào.</p>
                            )}
                        </div>
                    )}

                    {/* Tìm kiếm */}
                    {activeTab === "search" && (
                        <div className="space-y-4">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Tìm kiếm theo tên hoặc username..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Button type="submit" disabled={searching}>
                                    {searching && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                    Tìm
                                </Button>
                            </form>

                            <div className="space-y-3">
                                {searching ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    searchResults.map(user => (
                                        <Card key={user.user_id}>
                                            <CardContent className="flex items-center justify-between p-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={user.avatar_url} />
                                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                            {(user.full_name || user.username).slice(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold">{user.full_name || user.username}</p>
                                                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    {user.relationship === "none" && (
                                                        <Button size="sm" onClick={() => handleSendRequest(user.user_id)}>
                                                            <UserPlus className="h-4 w-4 mr-1" /> Kết bạn
                                                        </Button>
                                                    )}
                                                    {user.relationship === "friend" && (
                                                        <Button variant="outline" size="sm" disabled>
                                                            <span>Bạn bè</span>
                                                        </Button>
                                                    )}
                                                    {user.relationship === "request_sent" && (
                                                        <Button variant="outline" size="sm" disabled>
                                                            <span>Đã gửi</span>
                                                        </Button>
                                                    )}
                                                    {user.relationship === "request_received" && (
                                                        <Button size="sm" onClick={() => { setActiveTab("requests"); fetchData(); }}>
                                                            Xử lý lời mời
                                                        </Button>
                                                    )}
                                                    {user.relationship === "blocked" && (
                                                        <span className="text-xs text-destructive flex items-center gap-1">
                                                            <ShieldAlert className="h-3 w-3" /> Đã chặn
                                                        </span>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                                {!searching && searchResults.length === 0 && searchQuery.trim().length > 1 && (
                                    <p className="text-center text-muted-foreground py-10">Không tìm thấy người dùng.</p>
                                ) }
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Friends;
