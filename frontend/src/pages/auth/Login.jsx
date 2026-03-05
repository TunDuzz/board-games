import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Gamepad2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/services/auth.service";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authService.login(formData.email, formData.password);
      toast({ title: "Đăng nhập thành công!", description: "Chào mừng quay trở lại." });
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      const message = error.response?.data?.message || "Đã có lỗi xảy ra. Vui lòng thử lại.";
      toast({
        variant: "destructive",
        title: "Đăng nhập thất bại",
        description: message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Gamepad2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Board Game</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chess · Xiangqi · Caro
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Welcome back</CardTitle>
              <CardDescription>
                Sign in to continue playing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
              <Link
                to="/register"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Don't have an account? Sign up
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
