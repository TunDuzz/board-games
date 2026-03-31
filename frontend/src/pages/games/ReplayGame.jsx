import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GameBoard } from "@/components/GameBoard";
import { userService } from "@/services/user.service";
import { INITIAL_CHESS_BOARD, getPieceColor as getChessPieceColor } from "@/utils/chessLogic";
import { BOARD_SIZE as CARO_BOARD_SIZE, getWinningLine, checkWin } from "@/utils/caroLogic";
import { ChevronLeft, ChevronRight, RotateCcw, Play, Pause, Home, Trophy, Calendar, Hash, Video, StopCircle, Brain, Lightbulb, AlertTriangle, XCircle, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";
import { aiService } from "@/services/ai.service";

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
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const containerRef = useRef(null);

    const [isAnalysisMode, setIsAnalysisMode] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null); // { bestMove, moveQuality, evalScore }
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [moveQualityMap, setMoveQualityMap] = useState({}); // idx -> quality
    const [analysisProgress, setAnalysisProgress] = useState(0); // 0-100
    const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);

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

    // Hàm phân tích một vị trí cụ thể (trả về dữ liệu thay vì set state để dùng cho batch)
    const performAnalysis = async (idx) => {
        const gameType = matchInfo.GameType.name;
        // Dựng lại bàn cờ TRƯỚC nước đi idx
        const prevBoard = getInitialBoard(gameType);
        for (let i = 0; i < idx; i++) {
            const m = moves[i].move_data;
            if (gameType === 'caro') {
                const color = i % 2 === 0 ? 'black' : 'white';
                prevBoard[m.row][m.col] = { color };
            } else {
                const piece = prevBoard[m.from.row][m.from.col];
                prevBoard[m.to.row][m.to.col] = piece;
                prevBoard[m.from.row][m.from.col] = null;
            }
        }

        const currentMove = moves[idx].move_data;
        let turn = '';
        let movesHistory = [];
        if (gameType === 'caro') {
            turn = idx % 2 === 0 ? 'black' : 'white';
            movesHistory = moves.slice(0, idx).map((m, i) => ({
                x: m.move_data.col, y: m.move_data.row, color: i % 2 === 0 ? 'Black' : 'White'
            }));
        } else if (gameType === 'chess') {
            turn = idx % 2 === 0 ? 'white' : 'black';
        } else if (gameType === 'xiangqi') {
            turn = idx % 2 === 0 ? 'red' : 'black';
        }

        const data = await aiService.analyzePosition(gameType, prevBoard, turn, movesHistory);
        const aiMove = data.bestMove;
        const aiScore = data.evalScore || 0;

        // Tính chất lượng nước đi dựa trên sự chênh lệch điểm (nếu có hệ thống score chuẩn)
        // Hiện tại: excellent nếu trùng AI, else good. 
        // Sau này có thể so sánh score của nước đi người chơi vs AI.
        let quality = 'good';
        if (aiMove) {
            let isExact = false;
            if (gameType === 'caro') {
                isExact = aiMove.x === currentMove.col && aiMove.y === currentMove.row;
            } else {
                isExact = aiMove.from?.row === currentMove.from?.row &&
                          aiMove.from?.col === currentMove.from?.col &&
                          aiMove.to?.row === currentMove.to?.row &&
                          aiMove.to?.col === currentMove.to?.col;
            }
            if (isExact) quality = 'excellent';
        }

        return { aiMove, quality, score: aiScore };
    };

    const analyzeCurrentMove = async () => {
        if (!matchInfo || currentIndex < 0) return;
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            const result = await performAnalysis(currentIndex);
            setAnalysisResult({ bestMove: result.aiMove, moveQuality: result.quality, evalScore: result.score });
            setMoveQualityMap(prev => ({ ...prev, [currentIndex]: result.quality }));
        } catch (err) {
            toast.error("Lỗi phân tích: " + err.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Reset analysis khi đổi nước đi
    useEffect(() => {
        if (isAnalysisMode) {
            setAnalysisResult(null);
        }
    }, [currentIndex]);

    const analyzeAllMoves = async () => {
        if (!matchInfo || moves.length === 0) return;
        setIsAnalyzingAll(true);
        setAnalysisProgress(0);
        const newMap = { ...moveQualityMap };
        
        try {
            for (let i = 0; i < moves.length; i++) {
                if (newMap[i]) {
                    setAnalysisProgress(Math.round(((i + 1) / moves.length) * 100));
                    continue;
                }
                const result = await performAnalysis(i);
                newMap[i] = result.quality;
                setMoveQualityMap({ ...newMap });
                setAnalysisProgress(Math.round(((i + 1) / moves.length) * 100));
                await new Promise(r => setTimeout(r, 100));
            }
            toast.success("Đã hoàn thành phân tích toàn bộ ván cờ!");
        } catch (err) {
            toast.error("Lỗi khi phân tích hàng loạt: " + err.message);
        } finally {
            setIsAnalyzingAll(false);
        }
    };

    const qualityConfig = {
        excellent: { label: 'Tuyệt vời!', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: Zap },
        good:      { label: 'Tốt',       color: 'text-blue-500',    bg: 'bg-blue-500/10 border-blue-500/30',   icon: Lightbulb },
        inaccuracy:{ label: 'Thiếu chính xác', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30', icon: AlertTriangle },
        mistake:   { label: 'Sai lầm',   color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/30', icon: AlertTriangle },
        blunder:   { label: 'Thảm họa!', color: 'text-red-500',    bg: 'bg-red-500/10 border-red-500/30',    icon: XCircle },
    };

    // MediaRecorder functions
    const startRecording = () => {
        const canvas = document.querySelector('canvas');
        if (!canvas) {
            toast.error("Không tìm thấy bàn cờ để quay video");
            return;
        }

        // Tìm định dạng video hỗ trợ tốt nhất
        const types = [
            'video/mp4', 
            'video/webm;codecs=h264', 
            'video/webm;codecs=vp8', 
            'video/webm'
        ];
        const supportedType = types.find(type => MediaRecorder.isTypeSupported(type));

        if (!supportedType) {
            toast.error("Trình duyệt không hỗ trợ ghi video");
            return;
        }

        const stream = canvas.captureStream(30); // 30 FPS
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: supportedType
        });

        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: supportedType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            document.body.appendChild(a);
            a.style = 'display: none';
            a.href = url;
            const extension = supportedType.includes('mp4') ? 'mp4' : 'webm';
            a.download = `replay-match-${matchId}.${extension}`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Đã tải xuống video replay!");
            setIsRecording(false);
        };

        // Reset and start
        setCurrentIndex(-1);
        setIsPlaying(true);
        setIsRecording(true);

        // Đợi một chút để canvas vẽ frame đầu tiên trước khi bắt đầu ghi
        setTimeout(() => {
            if (mediaRecorder.state === 'inactive') {
                mediaRecorder.start();
                toast.info("Đang ghi lại video... Vui lòng đợi trận đấu chạy hết.");
            }
        }, 500);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };

    // Auto-stop recording when replay finishes
    useEffect(() => {
        if (isRecording && currentIndex === moves.length - 1 && !isPlaying) {
            // Wait a bit for the last move to be visible
            setTimeout(stopRecording, 1000);
        }
    }, [isRecording, currentIndex, moves.length, isPlaying]);

    const EvaluationBar = ({ score, gameType }) => {
        // Chuẩn hóa điểm số về khoảng -100 đến 100 để hiển thị trên thanh
        // Caro: WIN_SCORE = 100,000,000
        // Chess: Pawn = 100
        // Xiangqi: Chariot = 1000
        let normalized = 0;
        if (gameType === 'caro') {
            normalized = (score / 100000) * 10; // Giả sử 1tr điểm là cực mạnh
        } else if (gameType === 'chess') {
            normalized = score / 100; // 1 đơn vị = 1 tốt
        } else if (gameType === 'xiangqi') {
            normalized = score / 100; // 10 đơn vị = 1 xe
        }

        // Giới hạn trong khoảng -10 đến 10 cho độ cao thanh (visual)
        const displayScore = Math.max(-10, Math.min(10, normalized));
        // Đổi sang %: -10 -> 100% Đen thắng, 10 -> 0% Đen thắng (Đỏ/Trắng thắng)
        // Với Chess/Xiangqi: Trắng/Đỏ là số dương, Đen là số âm.
        // Thanh 100% chiều cao. 50% là cân bằng.
        // Tăng displayScore (Trắng/Đỏ thắng) -> Tăng percentage (Thanh trắng cao lên)
        const percentage = 50 + (displayScore * 5); // 10 -> 100%, -10 -> 0%

        return (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-64 bg-zinc-800 rounded-full overflow-hidden border border-white/10 hidden md:block group">
                <div 
                    className="absolute bottom-0 w-full bg-white transition-all duration-700 ease-out"
                    style={{ height: `${percentage}%` }}
                />
                <div className="absolute inset-0 flex flex-col justify-between items-center py-2 text-[8px] font-bold pointer-events-none mix-blend-difference text-white">
                    <span>B</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {normalized > 0 ? `+${(normalized/10).toFixed(1)}` : (normalized/10).toFixed(1)}
                    </span>
                    <span>{gameType === 'xiangqi' ? 'R' : 'W'}</span>
                </div>
            </div>
        );
    };

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
                    
                    {isAnalysisMode && analysisResult && (
                        <EvaluationBar score={analysisResult.evalScore || 0} gameType={gameTypeName} />
                    )}

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
                    <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-thin">
                        {/* Thanh điều khiển */}
                        <div className="p-6 space-y-6 border-b border-primary/5 shrink-0 bg-card z-10 sticky top-0">
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

                                <div className="w-full pt-2">
                                    <Button 
                                        variant={isRecording ? "destructive" : "outline"} 
                                        className="w-full gap-2 font-bold"
                                        onClick={isRecording ? stopRecording : startRecording}
                                    >
                                        {isRecording ? (
                                            <>
                                                <StopCircle className="h-4 w-4 animate-pulse" />
                                                Dừng & Tải Video
                                            </>
                                        ) : (
                                            <>
                                                <Video className="h-4 w-4" />
                                                Ghi hình & Tải (.webm)
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-[10px] text-muted-foreground text-center mt-2 px-4">
                                        * Hệ thống sẽ tự động chạy lại trận đấu từ đầu để ghi hình.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Chế độ Phân tích AI */}
                        <div className="p-4 border-b border-primary/5 space-y-3">
                            <Button
                                variant={isAnalysisMode ? "default" : "outline"}
                                className="w-full gap-2 font-bold"
                                onClick={() => setIsAnalysisMode(!isAnalysisMode)}
                                disabled={isAnalyzingAll}
                            >
                                <Brain className={`h-4 w-4 ${isAnalysisMode ? 'animate-pulse' : ''}`} />
                                {isAnalysisMode ? 'Đang Phân Tích' : 'Bật Chế Độ Phân Tích'}
                            </Button>

                            {isAnalysisMode && (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="flex-1 gap-2 text-[11px]"
                                            onClick={analyzeCurrentMove}
                                            disabled={isAnalyzing || isAnalyzingAll || currentIndex < 0}
                                        >
                                            {isAnalyzing ? (
                                                <><Brain className="h-3 w-3 animate-spin" /> Đang chạy...</>
                                            ) : (
                                                <><Lightbulb className="h-3 w-3 text-amber-500" /> Nước này</>
                                            )}
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="flex-1 gap-2 text-[11px] border-primary/30 hover:border-primary"
                                            onClick={analyzeAllMoves}
                                            disabled={isAnalyzing || isAnalyzingAll}
                                        >
                                            {isAnalyzingAll ? (
                                                <><Loader2 className="h-3 w-3 animate-spin" /> {analysisProgress}%</>
                                            ) : (
                                                <><Brain className="h-3 w-3 text-primary" /> Phân tích hết</>
                                            )}
                                        </Button>
                                    </div>

                                    {isAnalyzingAll && (
                                        <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                                            <div 
                                                className="bg-primary h-full transition-all duration-300" 
                                                style={{ width: `${analysisProgress}%` }}
                                            />
                                        </div>
                                    )}

                                    {analysisResult && (() => {
                                        const q = qualityConfig[analysisResult.moveQuality] || qualityConfig.good;
                                        const QIcon = q.icon;
                                        return (
                                            <div className={`p-4 rounded-xl border ${q.bg} space-y-3`}>
                                                <div className="flex items-center gap-2">
                                                    <QIcon className={`h-5 w-5 ${q.color}`} />
                                                    <span className={`font-bold text-sm ${q.color}`}>{q.label}</span>
                                                </div>
                                                {analysisResult.bestMove && (
                                                    <div className="text-xs space-y-1 text-muted-foreground">
                                                        <p className="font-semibold text-foreground">💡 AI gợi ý nước tốt nhất:</p>
                                                        <p className="font-mono bg-background/50 p-2 rounded-lg">
                                                            {gameTypeName === 'caro'
                                                                ? `Vị trí (${analysisResult.bestMove.x}, ${analysisResult.bestMove.y})`
                                                                : `(${analysisResult.bestMove.from?.col},${analysisResult.bestMove.from?.row}) → (${analysisResult.bestMove.to?.col},${analysisResult.bestMove.to?.row})`
                                                            }
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {currentIndex < 0 && (
                                        <p className="text-xs text-center text-muted-foreground">
                                            Chọn một nước đi để bắt đầu phân tích
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Danh sách nước đi */}
                        <div className="flex-1 flex flex-col min-h-[300px] bg-muted/10">
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
                                            <div className="flex flex-col truncate flex-1">
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
                                            {moveQualityMap[idx] && (
                                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                                    moveQualityMap[idx] === 'excellent' ? 'bg-emerald-500' :
                                                    moveQualityMap[idx] === 'good' ? 'bg-blue-500' :
                                                    moveQualityMap[idx] === 'mistake' ? 'bg-orange-500' : 'bg-red-500'
                                                }`} title={qualityConfig[moveQualityMap[idx]]?.label} />
                                            )}
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
