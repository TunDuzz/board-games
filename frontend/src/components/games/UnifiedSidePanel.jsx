import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trophy,
  MessageSquare,
  Info,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Play,
  RotateCcw,
  Flag,
  Handshake,
  Zap,
  Loader2,
  Construction,
  LayoutGrid,
  ChevronDown,
  Crown,
  HelpCircle,
  Volume2,
  VolumeX
} from "lucide-react";
import ChatBox from "@/components/ChatBox";

const UnifiedSidePanel = ({
  history = [],
  movePairs = [],
  currentTurnUserId,
  myUserId,
  myRole,
  isGameOver,
  matchId,
  roomId,
  code,
  onResign,
  onOfferDraw,
  onUndo,
  onReset,
  onGetHint,
  isHintLoading,
  difficulty,
  setDifficulty,
  mode,
  matchTimeLimit,
  setMatchTimeLimit,
  setPlayer1Time,
  setPlayer2Time,
  chatHistory = [],
  gameType,
  onStartGame,
  playerCount = 1,
  isGameStarted = false,
  // New props for Audio & Theme
  isMusicEnabled,
  setIsMusicEnabled,
  isSfxEnabled,
  setIsSfxEnabled,
  boardTheme,
  setBoardTheme,
  pieceColor,
  setPieceColor
}) => {
  const [activeTab, setActiveTab] = useState("play");
  const [showThemeSelect, setShowThemeSelect] = useState(false);
  const [showTimeSelect, setShowTimeSelect] = useState(false);

  const getThemes = (type) => {
    switch (type) {
      case 'xiangqi':
        return [
          { id: 'classic', label: 'Truyền thống', colors: ['#f1e0c5', '#d46231'] },
          { id: 'wood', label: 'Gỗ mộc', colors: ['#e1c699', '#5d4037'] },
          { id: 'bamboo', label: 'Trúc xanh', colors: ['#d4d8c1', '#5a7d51'] }
        ];
      case 'caro':
        return [
          { id: 'classic', label: 'Vở kẻ ô', colors: ['#ffffff', '#cbd5e1'] },
          { id: 'wood', label: 'Bảng gỗ', colors: ['#e3c099', '#8b5e3c'] },
          { id: 'dark', label: 'Bảng đen', colors: ['#1e293b', '#334155'] }
        ];
      default: // chess
        return [
          { id: 'classic', label: 'Cổ điển', colors: ['#ebecd0', '#779556'] },
          { id: 'wood', label: 'Gỗ mộc', colors: ['#f0d9b5', '#b58863'] },
          { id: 'blue', label: 'Biển cả', colors: ['#dee3e6', '#8ca2ad'] }
        ];
    }
  };

  const themes = getThemes(gameType);

  return (
    <Card className="flex flex-col h-full border-border bg-card text-card-foreground shadow-2xl overflow-hidden rounded-xl">
      <div className="bg-muted p-1 flex border-b border-border">
        <button
          onClick={() => setActiveTab("play")}
          className={`flex-1 flex flex-col items-center py-2 rounded-lg transition-all ${activeTab === 'play' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Trophy className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Chơi</span>
        </button>
        <button
          onClick={() => setActiveTab("new")}
          className={`flex-1 flex flex-col items-center py-2 transition-all ${activeTab === 'new' ? 'bg-background text-primary shadow-sm rounded-lg' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <RotateCcw className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Ván mới</span>
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex-1 flex flex-col items-center py-2 transition-all ${activeTab === 'settings' ? 'bg-background text-primary shadow-sm rounded-lg' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Settings className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Cài đặt</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'play' && (
          <div className="flex-1 flex flex-col min-h-0">
            <Tabs defaultValue="moves" className="flex flex-col min-h-0">
              <TabsList className="grid grid-cols-2 rounded-none bg-muted border-b border-border h-10">
                <TabsTrigger value="moves" className="text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary">Các nước đi</TabsTrigger>
                <TabsTrigger value="info" className="text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary">Thông tin</TabsTrigger>
              </TabsList>

              <TabsContent value="moves" className="flex flex-col min-h-0 m-0 p-0 border-none outline-none">
                <ScrollArea className="h-[140px] bg-background p-0">
                  <table className="w-full text-sm border-collapse">
                    <tbody className="divide-y divide-border">
                      {gameType === "chess" ? (
                        movePairs.map((pair, idx) => (
                          <tr key={idx} className="hover:bg-primary/5 transition-colors group">
                            <td className="w-10 py-1.5 px-3 text-muted-foreground font-mono text-[11px] bg-muted/30">{pair.num}.</td>
                            <td className="px-4 py-1.5 font-medium text-[13px] hover:text-primary cursor-pointer transition-colors">{pair.white}</td>
                            <td className="px-4 py-1.5 font-medium text-[13px] hover:text-primary cursor-pointer transition-colors">{pair.black || ""}</td>
                          </tr>
                        ))
                      ) : (
                        history.map((move, idx) => (
                          <tr key={idx} className="hover:bg-primary/5 transition-colors">
                            <td className="w-10 py-1.5 px-3 text-muted-foreground font-mono text-[11px] bg-muted/30">{idx + 1}.</td>
                            <td className="px-4 py-1.5 font-medium text-[13px]">{move.san || move.move_data?.text || "Move"}</td>
                          </tr>
                        ))
                      )}
                      {history.length === 0 && (
                        <tr>
                          <td colSpan="3" className="py-8 text-center text-muted-foreground italic text-xs">Vị trí bắt đầu</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </ScrollArea>

                {mode === 'ai' && (
                  <div className="bg-muted p-2 border-t border-border">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full h-10 text-[13px] font-bold gap-2 shadow-sm"
                      onClick={onGetHint}
                      disabled={isHintLoading || (roomId && currentTurnUserId !== myUserId)}
                    >
                      {isHintLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
                      )}
                      Gợi ý nước đi
                    </Button>
                  </div>
                )}

                <div className="bg-background py-2 px-3 flex items-center justify-between border-t border-border">
                  <div className="flex gap-4">
                    <button
                      onClick={onOfferDraw}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Handshake className="h-3.5 w-3.5" /> ½ Hòa cờ
                    </button>
                    <button
                      onClick={onResign}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Flag className="h-3.5 w-3.5" /> Hủy/Bỏ
                    </button>
                  </div>
                  <button
                    onClick={onReset}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="info" className="flex-1 overflow-y-auto bg-background text-xs text-muted-foreground m-0 border-none outline-none">
                <div className="p-4 space-y-6">
                  <div>
                    <h4 className="font-bold text-foreground uppercase text-[10px] mb-2 tracking-widest opacity-50">Chi tiết trận đấu</h4>
                    <div className="space-y-2 bg-muted p-3 rounded-lg border border-border">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Loại hình:</span>
                        <span className="text-foreground capitalize">{gameType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phòng:</span>
                        <span className="text-foreground">#{roomId || "Local"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Trạng thái:</span>
                        <span className={isGameOver ? "text-red-500" : "text-emerald-500 font-medium"}>
                          {isGameOver ? "Kết thúc" : "Đang đánh"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex-1 border-t border-border flex flex-col min-h-0 bg-muted">
              {roomId && (
                <div className="py-2 px-4 text-xs bg-background/50 border-b border-border">
                  {currentTurnUserId === myUserId ? (
                    <p className="text-emerald-500 font-bold flex items-center gap-2">
                      <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                      Đến lượt bạn
                    </p>
                  ) : (
                    <p className="text-amber-500 font-bold flex items-center gap-2">
                      <span className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.4)]"></span>
                      Đang đợi đối thủ...
                    </p>
                  )}
                </div>
              )}

              <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                {roomId ? (
                  <ChatBox roomId={roomId} currentUserId={myUserId} initialMessages={chatHistory} />
                ) : (
                  <div className="flex-1 flex items-center justify-center p-4 text-muted-foreground italic text-[10px]">
                    Chat chỉ khả dụng trong phòng đấu
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto bg-background p-4 space-y-5 custom-scrollbar [scrollbar-gutter:stable]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Cài đặt hệ thống</h3>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/20 to-transparent ml-4"></div>
            </div>

            {/* Audio Section - Premium Toggles */}
            <section className="space-y-3">
              <h4 className="font-bold text-foreground/60 uppercase text-[9px] tracking-widest pl-1">Âm thanh</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsMusicEnabled(!isMusicEnabled)}
                  className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-300 ${isMusicEnabled ? 'bg-primary/10 border-primary/50 text-primary shadow-sm' : 'bg-muted/40 border-border/40 text-muted-foreground opacity-80'}`}
                >
                  <div className="flex items-center gap-2">
                    {isMusicEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 opacity-100" />}
                    <span className="text-[10px] font-bold">Nhạc nền</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${isMusicEnabled ? 'bg-primary/20' : 'bg-muted-foreground/20'}`}>
                    <div className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shadow-sm transition-all duration-300 ${isMusicEnabled ? 'left-[18px] bg-primary' : 'left-[3px] bg-muted-foreground'}`}></div>
                  </div>
                </button>
                <button
                  onClick={() => setIsSfxEnabled(!isSfxEnabled)}
                  className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-300 ${isSfxEnabled ? 'bg-primary/10 border-primary/50 text-primary shadow-sm' : 'bg-muted/40 border-border/40 text-muted-foreground opacity-80'}`}
                >
                  <div className="flex items-center gap-2">
                    {isSfxEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 opacity-100" />}
                    <span className="text-[10px] font-bold">Hiệu ứng</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${isSfxEnabled ? 'bg-primary/20' : 'bg-muted-foreground/20'}`}>
                    <div className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shadow-sm transition-all duration-300 ${isSfxEnabled ? 'left-[18px] bg-primary' : 'left-[3px] bg-muted-foreground'}`}></div>
                  </div>
                </button>
              </div>
            </section>

            {/* Theme & Piece Styles Section - NEW COMPACT DESIGN */}
            <section className="space-y-3">
              <h4 className="font-bold text-foreground/60 uppercase text-[9px] tracking-widest pl-1">Giao diện bàn cờ</h4>
              <div className="flex items-center gap-2">
                {/* Theme Selector Dropdown */}
                <div className="relative flex-1">
                  <button
                    onClick={() => setShowThemeSelect(!showThemeSelect)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-muted/60 hover:bg-muted rounded-xl border border-border/40 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-background rounded-lg shadow-sm transition-transform">
                        <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-[11px] font-bold text-foreground/80">Tùy chọn</span>
                    </div>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 ${showThemeSelect ? '' : 'rotate-180'}`} />
                  </button>

                  {showThemeSelect && (
                    <div className="absolute top-full left-0 right-0 mt-1 p-1 bg-background border border-border shadow-2xl z-50 flex flex-col gap-0.5 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200 origin-top">
                      {themes.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setBoardTheme(t.id);
                            setShowThemeSelect(false);
                          }}
                          className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${boardTheme === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
                        >
                          <div className="w-4 h-4 rounded-full border border-current/20 shadow-sm" style={{ background: `linear-gradient(135deg, ${t.colors[0]} 50%, ${t.colors[1]} 50%)` }}></div>
                          <span className="text-[11px] font-bold truncate">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  {[
                    { id: 'light', icon: <Crown className="h-3.5 w-3.5" />, color: 'bg-[#f8fafc]', border: 'border-slate-200', text: 'text-slate-600' },
                    {
                      id: 'auto',
                      icon: (
                        <div className="h-3.5 w-3.5 rounded-full border border-slate-400/80 flex overflow-hidden">
                          <div className="flex-1 bg-slate-800" />
                          <div className="flex-1 bg-white" />
                        </div>
                      ),
                      color: 'bg-gradient-to-r from-slate-200 to-slate-50',
                      border: 'border-slate-300/50',
                      text: 'text-slate-500'
                    },
                    { id: 'dark', icon: <Crown className="h-3.5 w-3.5 fill-current" />, color: 'bg-[#1e293b]', border: 'border-slate-700', text: 'text-slate-100' }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setPieceColor(btn.id)}
                      className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all duration-300 ${pieceColor === btn.id ? 'ring-2 ring-primary ring-offset-1 scale-105 shadow-md' : 'opacity-80 hover:opacity-100 shadow-sm border border-transparent hover:border-border'}`}
                      title={btn.id === 'auto' ? "Màu cờ theo hệ thống (Đồng bộ)" : `Đổi màu cờ của bạn thành ${btn.id === 'light' ? 'Trắng' : 'Đen'} (Chỉ mình bạn thấy)`}
                    >
                      <div className={`w-full h-full flex items-center justify-center rounded-[inherit] ${btn.color} ${btn.text} ${btn.border} border`}>
                        {btn.icon}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Room & Match Info - Compact Cards */}
            <section className="space-y-3 pt-2 border-t border-border/50">
              <div className="grid grid-cols-2 gap-2">
                {code && (
                  <div className="bg-muted/50 p-2.5 rounded-xl border border-border/50">
                    <p className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter mb-1 opacity-50">Mã phòng</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-primary tracking-tight font-mono">{code}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(code);
                          // toast.success("Đã sao chép mã phòng");
                        }}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Handshake className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-muted/50 p-2.5 rounded-xl border border-border/50">
                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter mb-1 opacity-50">Thời gian</p>
                  {(mode === 'ai' || (roomId && myRole === 'player1' && !matchId)) ? (
                    <div className="relative">
                      <button
                        onClick={() => {
                          if (!isGameStarted) setShowTimeSelect(!showTimeSelect);
                        }}
                        className={`w-full flex items-center justify-between text-[11px] font-bold text-foreground pr-1 ${isGameStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className="text-primary">{matchTimeLimit} Phút</span>
                        {!isGameStarted && <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-300 ${showTimeSelect ? '' : 'rotate-180'}`} />}
                      </button>

                      {showTimeSelect && (
                        <div className="absolute top-full left-0 right-0 mt-1 p-1 bg-background border border-border shadow-2xl z-50 flex flex-col gap-0.5 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200 origin-top">
                          {[15, 30, 45, 60].map((m) => (
                            <button
                              key={m}
                              onClick={() => {
                                setMatchTimeLimit(m);
                                setPlayer1Time(m * 60);
                                setPlayer2Time(m * 60);
                                setShowTimeSelect(false);
                              }}
                              className={`flex items-center justify-between p-2 rounded-lg transition-colors ${matchTimeLimit === m ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
                            >
                              <span className="text-[10px] font-bold">{m} Phút</span>
                              {matchTimeLimit === m && <Zap className="h-2.5 w-2.5 fill-current" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-foreground/80">{matchTimeLimit} Phút</span>
                  )}
                </div>
              </div>
            </section>

            {/* AI Difficulty - If applicable */}
            {mode === 'ai' && !isGameOver && (
              <section className="space-y-2">
                <h4 className="font-bold text-foreground/60 uppercase text-[9px] tracking-widest">Độ khó máy</h4>
                <div className="flex gap-1">
                  {['easy', 'medium', 'hard'].map((d) => (
                    <button
                      key={d}
                      onClick={() => !isGameStarted && setDifficulty(d)}
                      disabled={isGameStarted}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight border transition-all ${difficulty === d ? 'bg-amber-500 border-amber-600 text-white shadow-[0_2px_8px_rgba(245,158,11,0.3)]' : 'bg-muted text-muted-foreground border-transparent opacity-60 hover:opacity-100'} ${isGameStarted ? 'cursor-not-allowed' : ''}`}
                    >
                      {d === 'easy' ? 'Gà' : d === 'medium' ? 'Sói' : 'Rồng'}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Start Game Button - Fixed at bottom of section */}
            {((roomId && !matchId) || (mode === 'ai' && !isGameStarted)) && (
              <div className="pt-2">
                <Button
                  variant="default"
                  size="lg"
                  className="w-full py-5 rounded-xl text-xs font-black uppercase tracking-widest gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl transition-all"
                  onClick={onStartGame}
                >
                  <Play className="h-4 w-4 fill-current" />
                  Bắt đầu ngay
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground hover:text-foreground text-[9px] uppercase font-bold tracking-widest mt-2"
              onClick={() => setActiveTab('play')}
            >
              Quay lại trận đấu
            </Button>
          </div>
        )}

        {activeTab === 'new' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-secondary-foreground">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Construction className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-2">Đang nâng cấp!</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[180px]">
              Tính năng đang được tinh chỉnh để hoàn hảo nhất.
            </p>
            <Button variant="ghost" size="sm" className="mt-6 text-[10px] uppercase font-bold text-primary" onClick={() => setActiveTab('play')}>
              Về trận đấu
            </Button>
          </div>
        )}
      </div>

    </Card>
  );
};

export default UnifiedSidePanel;
