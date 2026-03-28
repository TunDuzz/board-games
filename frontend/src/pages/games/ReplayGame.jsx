import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GameBoard } from "@/components/GameBoard";
import { userService } from "@/services/user.service";
import { INITIAL_CHESS_BOARD, getPieceColor as getChessPieceColor } from "@/utils/chessLogic";
import { BOARD_SIZE as CARO_BOARD_SIZE, getWinningLine, checkWin } from "@/utils/caroLogic";
import { ChevronLeft, ChevronRight, RotateCcw, Play, Pause, Home, Trophy, Calendar, User, Hash } from "lucide-react";
import { toast } from "sonner";

const ReplayGame = () => {
    const { matchId } = useParams();
    const navigate = useNavigate();
    const [matchInfo, setMatch] = useState(null);
    const [moves, setMoves] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [board, setBoard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [winningLine, setWinningLine] = useState([]);

    // Khởi tạo bàn cờ ban đầu dựa trên loại game
    const getInitialBoard = (gameType) => {
        if (gameType === 'caro') {
            return Array(CARO_BOARD_SIZE).fill(null).map(() => Array(CARO_BOARD_SIZE).fill(null));
        } else if (gameType === 'chess') {
            return INITIAL_CHESS_BOARD.map(row => [...row]);
        } else if (gameType === 'xiangqi') {
            const b = Array(10).fill(null).map(() => Array(9).fill(null));
            b[0][0] = { color: 'black', label: '車' }; b[0][1] = { color: 'black', label: '馬' };
            b[0][2] = { color: 'black', label: '象' }; b[0][3] = { color: 'black', label: '士' };
            b[0][4] = { color: 'black', label: '將' }; b[0][5] = { color: 'black', label: '士' };
            b[0][6] = { color: 'black', label: '象' }; b[0][7] = { color: 'black', label: '馬' };
            b[0][8] = { color: 'black', label: '車' };
            b[2][1] = { color: 'black', label: '砲' }; b[2][7] = { color: 'black', label: '砲' };
            b[3][0] = { color: 'black', label: '卒' }; b[3][2] = { color: 'black', label: '卒' };
            b[3][4] = { color: 'black', label: '卒' }; b[3][6] = { color: 'black', label: '卒' };
            b[3][8] = { color: 'black', label: '卒' };
            b[9][0] = { color: 'red', label: '俥' }; b[9][1] = { color: 'red', label: '傌' };
            b[9][2] = { color: 'red', label: '相' }; b[9][3] = { color: 'red', label: '仕' };
            b[9][4] = { color: 'red', label: '帥' }; b[9][5] = { color: 'red', label: '仕' };
            b[9][6] = { color: 'red', label: '相' }; b[9][7] = { color: 'red', label: '傌' };
            b[9][8] = { color: 'red', label: '俥' };
            b[7][1] = { color: 'red', label: '炮' }; b[7][7] = { color: 'red', label: '炮' };
            b[6][0] = { color: 'red', label: '兵' }; b[6][2] = { color: 'red', label: '兵' };
            b[6][4] = { color: 'red', label: '兵' }; b[6][6] = { color: 'red', label: '兵' };
            b[6][8] = { color: 'red', label: '兵' };
            return b;
        }
        return [];
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await userService.getMatchMoves(matchId);
                setMatch(data.match);
                setMoves(data.moves);
                setBoard(getInitialBoard(data.match.GameType.name));
            } catch (error) {
                toast.error("Không thể tải dữ liệu replay");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [matchId]);

    // Xử lý áp dụng nước đi lên bàn cờ
    useEffect(() => {
        if (!matchInfo || loading) return;

        const gameType = matchInfo.GameType.name;
        const newBoard = getInitialBoard(gameType);

        let currentWinningLine = [];
        for (let i = 0; i <= currentIndex; i++) {
            const move = moves[i].move_data;
            if (gameType === 'caro') {
                const currentColor = i % 2 === 0 ? 'black' : 'white';
                newBoard[move.row][move.col] = { color: currentColor };
                // Kiểm tra thắng để vẽ đường gạch
                if (checkWin(newBoard, move.row, move.col, currentColor)) {
                    currentWinningLine = getWinningLine(newBoard, move.row, move.col, currentColor);
                } else {
                    currentWinningLine = []; 
                }
            } else if (gameType === 'chess' || gameType === 'xiangqi') {
                const piece = newBoard[move.from.row][move.from.col];
                newBoard[move.to.row][move.to.col] = piece;
                newBoard[move.from.row][move.from.col] = null;
            }
        }
        
        setBoard(newBoard);
        setWinningLine(currentWinningLine); 
    }, [currentIndex, moves, matchInfo, loading]);

    // Tự động chạy replay
    useEffect(() => {
        let timer;
        if (isPlaying && currentIndex < moves.length - 1) {
            timer = setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
            }, 1000);
        } else if (currentIndex === moves.length - 1) {
            setIsPlaying(false);
        }
        return () => clearTimeout(timer);
    }, [isPlaying, currentIndex, moves]);

    if (loading) return <div className="flex items-center justify-center h-screen">Đang tải dữ liệu...</div>;
    if (!matchInfo) return <div className="flex items-center justify-center h-screen">Không tìm thấy trận đấu</div>;

    const lastMove = currentIndex >= 0 ? moves[currentIndex].move_data : null;
    const gameTypeName = matchInfo.GameType.name;

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] p-6 gap-6 overflow-hidden bg-background">
            {/* Cột trái: Bàn cờ và thông tin trận đấu */}
            <div className="flex-1 flex flex-col gap-4 min-h-0 relative">
                <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-primary/10 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Trophy className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <Badge variant="default" className="bg-primary text-primary-foreground font-bold px-3 py-0.5">
                                    {gameTypeName.toUpperCase()}
                                </Badge>
                                <span className="text-sm font-bold text-foreground">Trận đấu #{matchId}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(matchInfo.end_time || matchInfo.created_at).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Hash className="h-3 w-3" />
                                    {moves.length} nước đi
                                </div>
                                <div className={`font-bold uppercase ${
                                    matchInfo.result === 'win' ? 'text-emerald-500' : 
                                    matchInfo.result === 'draw' ? 'text-amber-500' : 'text-red-500'
                                }`}>
                                    Kết quả: {matchInfo.result}
                                </div>
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/history')} className="gap-2 hover:bg-primary/5">
                        <ChevronLeft className="h-4 w-4" /> Trở về lịch sử
                    </Button>
                </div>

                <div className="flex-1 min-h-0 bg-card rounded-2xl border border-primary/10 shadow-lg p-2 flex items-center justify-center relative overflow-hidden">
                    {/* Nền trang trí */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
                    
                    <div className="w-full h-full max-w-[850px] max-h-[850px] relative z-10 flex items-center justify-center">
                        <GameBoard 
                            gameType={gameTypeName}
                            boardState={gameTypeName === 'chess' ? board.map(r => r.map(p => p ? {
                                type: p.toLowerCase(),
                                color: getChessPieceColor(p),
                                label: p
                            } : null)) : board}
                            lastMove={lastMove}
                            winningLine={winningLine}
                        />
                    </div>
                </div>
            </div>

            {/* Cột phải: Điều khiển và Lịch sử nước đi */}
            <div className="w-full lg:w-96 flex flex-col gap-4 min-h-0">
                <Card className="flex flex-col border-primary/10 bg-card shadow-lg h-full overflow-hidden">
                    <CardHeader className="py-4 px-6 border-b border-primary/10 bg-muted/30">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                            <RotateCcw className="h-4 w-4" />
                            Phân tích trận đấu
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                        {/* Thanh điều khiển */}
                        <div className="p-6 space-y-6 border-b border-primary/5">
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative flex items-center justify-center w-24 h-24">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r="44"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="transparent"
                                            className="text-primary/10"
                                        />
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r="44"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="transparent"
                                            strokeDasharray={2 * Math.PI * 44}
                                            strokeDashoffset={2 * Math.PI * 44 * (1 - (currentIndex + 1) / moves.length)}
                                            className="text-primary transition-all duration-300 ease-in-out"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-xl font-black text-primary leading-none">
                                            {currentIndex + 1}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase mt-1">
                                            / {moves.length}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="rounded-full hover:bg-primary/5"
                                        onClick={() => { setCurrentIndex(-1); setIsPlaying(false); }}
                                        disabled={currentIndex === -1}
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-10 w-10 rounded-full hover:bg-primary/5"
                                        onClick={() => { setCurrentIndex(prev => Math.max(-1, prev - 1)); setIsPlaying(false); }}
                                        disabled={currentIndex === -1}
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>
                                    <Button 
                                        size="icon" 
                                        className={`h-14 w-14 rounded-full shadow-lg transition-all duration-200 ${
                                            isPlaying ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
                                        }`}
                                        onClick={() => setIsPlaying(!isPlaying)}
                                        disabled={currentIndex >= moves.length - 1 && !isPlaying}
                                    >
                                        {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-10 w-10 rounded-full hover:bg-primary/5"
                                        onClick={() => { setCurrentIndex(prev => Math.min(moves.length - 1, prev + 1)); setIsPlaying(false); }}
                                        disabled={currentIndex >= moves.length - 1}
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="rounded-full hover:bg-primary/5"
                                        onClick={() => navigate('/dashboard')}
                                    >
                                        <Home className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Danh sách nước đi */}
                        <div className="flex-1 flex flex-col min-h-0 bg-muted/10">
                            <div className="px-6 py-3 flex items-center justify-between border-b border-primary/5 bg-muted/20">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Hash className="h-3 w-3" /> Lịch sử nước đi
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-primary/20">
                                <div className="grid grid-cols-2 gap-2">
                                    {moves.map((m, idx) => (
                                        <button 
                                            key={m.move_id}
                                            onClick={() => { setCurrentIndex(idx); setIsPlaying(false); }}
                                            className={`flex items-center gap-3 p-3 rounded-xl text-xs transition-all duration-200 border ${
                                                currentIndex === idx 
                                                ? "bg-primary text-primary-foreground font-bold border-primary shadow-md transform scale-[1.02]" 
                                                : "bg-card hover:bg-primary/5 border-transparent hover:border-primary/20 text-foreground"
                                            }`}
                                        >
                                            <span className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] ${
                                                currentIndex === idx ? "bg-primary-foreground/20" : "bg-muted"
                                            }`}>
                                                {idx + 1}
                                            </span>
                                            <div className="flex flex-col truncate">
                                                <span className="truncate">
                                                    {gameTypeName === 'caro' 
                                                        ? (idx % 2 === 0 ? 'Đen' : 'Trắng')
                                                        : `Nước đi ${idx % 2 === 0 ? 'Trắng' : 'Đen'}`
                                                    }
                                                </span>
                                                <span className={`text-[10px] ${currentIndex === idx ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                                    {gameTypeName === 'caro' 
                                                        ? `(${m.move_data.col}, ${m.move_data.row})`
                                                        : `(${m.move_data.from.col},${m.move_data.from.row}) → (${m.move_data.to.col},${m.move_data.to.row})`
                                                    }
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ReplayGame;
