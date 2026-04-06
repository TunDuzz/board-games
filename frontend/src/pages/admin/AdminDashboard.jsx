import React, { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import { authService } from "@/services/auth.service";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, UserX, UserCheck, ShieldAlert } from "lucide-react";

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const currentUser = authService.getCurrentUser();

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await adminService.getAllUsers();
            setUsers(data);
        } catch (error) {
            toast.error("Không thể lấy danh sách người dùng.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleToggleBan = async (userId) => {
        if (userId === currentUser?.id) {
            toast.error("Bạn không thể tự chặn chính mình!");
            return;
        }

        try {
            const result = await adminService.toggleBanUser(userId);
            toast.success(result.message);
            // Reload users after toggle
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi thao tác chặn người dùng.");
        }
    };

    if (loading && users.length === 0) {
        return <div className="flex items-center justify-center h-full">Đang tải dữ liệu...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-gradient">Admin Dashboard</h1>
                <p className="text-muted-foreground">Quản lý hệ thống và người dùng.</p>
            </div>

            <Card className="glass shadow-xl border-white/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <ShieldCheck className="h-6 w-6 text-indigo-500" />
                                Quản lý tài khoản
                            </CardTitle>
                            <CardDescription>
                                Danh sách tất cả người dùng trong hệ thống ({users.length})
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-xl border border-white/5 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Người dùng</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Rank/Elo</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="text-right">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.user_id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border border-white/10 ring-2 ring-indigo-500/20">
                                                    <AvatarImage src={user.avatar_url} />
                                                    <AvatarFallback className="bg-indigo-500 text-white font-bold">
                                                        {user.username.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-indigo-100">{user.username}</span>
                                                    <span className="text-xs text-muted-foreground">{user.full_name || 'Họ tên chưa cập nhật'}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant={user.role === 'admin' ? 'default' : 'secondary'}
                                                className={user.role === 'admin' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                                            >
                                                {user.role === 'admin' ? (
                                                    <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Admin</span>
                                                ) : 'User'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-amber-500">{user.rank || 'N/A'}</span>
                                                <span className="text-xs text-muted-foreground">{user.elo || 0} Elo</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {user.is_banned ? (
                                                <Badge variant="destructive" className="animate-pulse shadow-sm shadow-red-500/50">
                                                    <ShieldAlert className="h-3 w-3 mr-1" /> Đã chặn
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-emerald-500 border-emerald-500/50 bg-emerald-500/10">
                                                    <UserCheck className="h-3 w-3 mr-1" /> Bình thường
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant={user.is_banned ? "outline" : "destructive"}
                                                size="sm"
                                                className="transition-all hover:scale-105 active:scale-95"
                                                onClick={() => handleToggleBan(user.user_id)}
                                                disabled={user.user_id === currentUser?.id}
                                            >
                                                {user.is_banned ? (
                                                    <><UserCheck className="h-4 w-4 mr-1" /> Bỏ chặn</>
                                                ) : (
                                                    <><UserX className="h-4 w-4 mr-1" /> Chặn</>
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminDashboard;
