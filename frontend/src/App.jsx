import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import ChessGame from "./pages/games/ChessGame";
import XiangqiGame from "./pages/games/XiangqiGame";
import CaroGame from "./pages/games/CaroGame";
import ReplayGame from "./pages/games/ReplayGame";
import Profile from "./pages/user/Profile";
import MatchHistory from "./pages/user/MatchHistory";
import Rankings from "./pages/user/Rankings";
import Friends from "./pages/user/Friends";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import { AppLayout } from "./components/AppLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { GameThemeProvider } from "@/hooks/useGameTheme.jsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GameThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/game/chess" element={<ChessGame />} />
              <Route path="/game/xiangqi" element={<XiangqiGame />} />
              <Route path="/game/caro" element={<CaroGame />} />
              <Route path="/replay/:matchId" element={<ReplayGame />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/history" element={<MatchHistory />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            </Route>

          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </GameThemeProvider>
  </QueryClientProvider>
);

export default App;
