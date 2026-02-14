import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppLayout } from "@/components/AppLayout";
import { userService } from "@/services/user.service";
import { Camera, Loader2, Save, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Profile = () => {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [nickname, setNickname] = useState(""); // Keeping this for the input field, will be updated from editName
  const [changingPass, setChangingPass] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: ""
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await userService.getProfile();
        setUser(data);
        setNickname(data.full_name || data.username);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await userService.updateProfile({ full_name: nickname });
      toast({
        title: "Cập nhật thành công!",
        description: "Thông tin cá nhân của bạn đã được lưu.",
      });
      setUser((prev) => ({ ...prev, full_name: nickname }));
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({
        variant: "destructive",
        title: "Lỗi cập nhật",
        description: error.response?.data?.message || "Đã có lỗi xảy ra khi lưu thông tin.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast({
        variant: "destructive",
        title: "Lỗi nhập liệu",
        description: "Mật khẩu mới và xác nhận mật khẩu không khớp.",
      });
      return;
    }

    setChangingPass(true);
    try {
      await userService.changePassword(passwords.current, passwords.new);
      toast({
        title: "Đổi mật khẩu thành công!",
        description: "Mật khẩu của bạn đã được cập nhật.",
      });
      setPasswords({ current: "", new: "", confirm: "" });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to change password:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Đã có lỗi xảy ra khi đổi mật khẩu.",
      });
    } finally {
      setChangingPass(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      toast({
        title: "Thông báo",
        description: "Tính năng tải ảnh lên đang được phát triển. Vui lòng thử lại sau.",
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="text-center py-10">Không tìm thấy thông tin người dùng.</div>
      </AppLayout>
    );
  }

  const stats = user.UserStats || { total_matches: 0, wins: 0, losses: 0, draws: 0 };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Player Profile</h1>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="relative group">
                <Avatar className="h-20 w-20 ring-2 ring-background shadow-xl">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-accent border shadow-sm hover:bg-accent/80 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              <div className="flex-1 w-full space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nickname" className="text-sm font-semibold">Nickname</Label>
                  <Input
                    id="nickname"
                    placeholder="Enter your nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-lg border border-dashed">
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider font-bold mb-1">Username</span>
                    <p className="font-semibold">{user.username}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider font-bold mb-1">Rank</span>
                    <p className="font-semibold text-primary">{user.rank}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider font-bold mb-1">Elo</span>
                    <p className="font-semibold">{user.elo}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleUpdate}
                    disabled={updating}
                    size="sm"
                    className="gap-2"
                  >
                    {updating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
                  </Button>

                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <KeyRound className="h-4 w-4" />
                        Change Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                          Enter your current password and your new password below.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handlePasswordChange} className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={passwords.current}
                            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={passwords.new}
                            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm New Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                            required
                          />
                        </div>
                        <DialogFooter className="pt-4">
                          <Button
                            type="submit"
                            disabled={changingPass}
                            className="gap-2"
                          >
                            {changingPass ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <KeyRound className="h-4 w-4" />
                            )}
                            Update Password
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Overall Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border bg-card/50 p-4 text-center shadow-sm">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Played</p>
                <p className="mt-2 text-2xl font-black">{stats.total_matches}</p>
              </div>
              <div className="rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-center shadow-sm">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Wins</p>
                <p className="mt-2 text-2xl font-black text-emerald-600">{stats.wins}</p>
              </div>
              <div className="rounded-xl border bg-red-50/50 dark:bg-red-950/20 p-4 text-center shadow-sm">
                <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Losses</p>
                <p className="mt-2 text-2xl font-black text-red-500">{stats.losses}</p>
              </div>
              <div className="rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 p-4 text-center shadow-sm">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Draws</p>
                <p className="mt-2 text-2xl font-black text-amber-600">{stats.draws}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Profile;
