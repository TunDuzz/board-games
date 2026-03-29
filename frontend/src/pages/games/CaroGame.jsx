import { useState, useEffect } from "react"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerInfoBar } from "@/components/PlayerInfoBar";
import { GameBoard } from "@/components/GameBoard";

import { useSearchParams, useNavigate } from "react-router-dom";
import { GameRoomPanel } from "@/components/GameRoomPanel";
import ChatBox from "@/components/ChatBox";
import { aiService } from "@/services/ai.service"; 
import { toast } from "sonner"; 
import { Loader2, Zap } from "lucide-react";
import { socket } from "@/lib/socket"; // Thêm client socket
import { checkWin, checkDraw, getWinningLine } from "@/utils/caroLogic"; // Dùng logic mới
import { GameOverModal } from "@/components/GameOverModal";
import { authService } from "@/services/auth.service";

const formatTime = (secs) => {
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
};

const CaroGame = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get('roomId');
  const code = searchParams.get('code');
  const mode = searchParams.get('mode'); 

  const [isGameOver, setIsGameOver] = useState(false);
  const [board, setBoard] = useState(Array(15).fill(null).map(() => Array(15).fill(null)));
  const [isBlackTurn, setIsBlackTurn] = useState(true);
  const [moves, setMoves] = useState([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [myRole, setMyRole] = useState(null); 
  const [winningLine, setWinningLine] = useState([]); 
  const [difficulty, setDifficulty] = useState('medium'); 
  const [hintMove, setHintMove] = useState(null);
  const [isHintLoading, setIsHintLoading] = useState(false);

  // States mới cho Socket & Modal
  const [matchId, setMatchId] = useState(null);
  const [currentTurnUserId, setCurrentTurnUserId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalResult, setModalResult] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const currentUser = authService.getCurrentUser();
  const myUserId = currentUser?.id;

  // States mới cho Timer & Highlight
  const [lastMove, setLastMove] = useState(null);
  const [player1Time, setPlayer1Time] = useState(1800); // 30 phút * 60s
  const [player2Time, setPlayer2Time] = useState(1800);
  const [matchTimeLimit, setMatchTimeLimit] = useState(30);

  const [player1Name, setPlayer1Name] = useState("Người chơi 1");
  const [player2Name, setPlayer2Name] = useState("Người chơi 2");

  // ==========================================
  // 1. KẾT NỐI SOCKET CHO PHÒNG ONLINE
  // ==========================================
  useEffect(() => {
    if (roomId) {
      socket.connect();
      socket.emit("join_game_room", { roomId });

      socket.on("game_room_joined", ({ role, players, match }) => {
        setMyRole(role);
        toast.success(`Bạn là ${role === "player1" ? "Quân Đen (Đi Trước)" : "Quân Trắng"}`);
        
        if (players) {
            const p1 = players.find(p => p.role === "player1");
            const p2 = players.find(p => p.role === "player2");
            if (p1) setPlayer1Name(p1.username);
            if (p2) setPlayer2Name(p2.username);
        }

        if (match) {
            setMatchId(match.match_id);
            if (match.currentTurn) setCurrentTurnUserId(match.currentTurn);
        }
      });

      socket.on("player_joined", ({ username, role }) => {
          if (role === "player2") setPlayer2Name(username);
          else if (role === "player1") setPlayer1Name(username);
      });

      // LẮNG NGHE MATCH STARTED (Host bấm start)
      socket.on("match_started", ({ match_id, firstTurn, players }) => {
        setMatchId(match_id);
        setCurrentTurnUserId(firstTurn);
        toast.success("Trận đấu bắt đầu! Lượt " + (firstTurn === myUserId ? "của Bạn" : "đối thủ"));

        if (players) {
            setPlayer1Name(players.player1.username);
            setPlayer2Name(players.player2.username);
        }
      });

      // LẮNG NGHE CHUYỂN LƯỢT
      socket.on("turn_changed", ({ currentTurn }) => {
        setCurrentTurnUserId(currentTurn);
      });

      socket.on("receive_move", ({ moveData }) => {
        setLastMove(moveData); // Lưu nước đi cuối để highlight
        setBoard(prev => {
          const newBoard = prev.map(r => [...r]);
          newBoard[moveData.row][moveData.col] = { color: moveData.color.toLowerCase() };
          
          if (checkWin(newBoard, moveData.row, moveData.col, moveData.color.toLowerCase())) {
              setWinningLine(getWinningLine(newBoard, moveData.row, moveData.col, moveData.color.toLowerCase()));
              setIsGameOver(true);
              setModalResult("lose");
              setModalMessage("Đối thủ đã giành chiến thắng!");
              setIsModalOpen(true);
          }
          return newBoard;
        });
        setIsBlackTurn(moveData.color.toLowerCase() === "white"); 
        setMoves(prev => [...prev, moveData]);
      });

      socket.on("receive_draw_offer", ({ username }) => {
          toast(`Đối thủ [${username}] cầu hòa. Bạn có đồng ý không?`, {
              duration: 10000,
              action: {
                  label: "Đồng ý",
                  onClick: () => socket.emit("accept_draw", { roomId, matchId })
              },
              cancel: {
                  label: "Từ chối",
                  onClick: () => socket.emit("reject_draw", { roomId })
              }
          });
      });

      socket.on("draw_rejected", ({ username, message }) => {
          toast.warning(message || `${username} từ chối hòa cờ.`);
      });

      socket.on("receive_time_limit", ({ minutes }) => {
          setMatchTimeLimit(minutes);
          setPlayer1Time(minutes * 60);
          setPlayer2Time(minutes * 60);
          toast.info(`Thời gian trận đấu được cập nhật thành ${minutes} phút`);
      });

      socket.on("receive_game_over", ({ result, winnerId, message }) => {
          setIsGameOver(true);
          
          if (result === "draw") {
              setModalResult("draw");
          } else if (result === "resign") {
              // Nếu người khác resign thì mình thắng
              setModalResult(winnerId === myUserId ? "win" : "resign");
          } else {
              setModalResult(winnerId === myUserId ? "win" : "lose");
          }
          
          setModalMessage(message);
          setIsModalOpen(true);
      });

      return () => {
        socket.off("game_room_joined");
        socket.off("match_started");
        socket.off("turn_changed");
        socket.off("receive_move");
        socket.off("receive_draw_offer");
        socket.off("draw_rejected");
        socket.off("receive_game_over");
        socket.disconnect();
      };
    }
  }, [roomId, myUserId, matchId]);

  // Đã chuyển checkWin ra caroLogic.js

  // Trigger AI click khi đến lượt bot
  useEffect(() => {
    if (mode === 'ai' && !isBlackTurn && !isAiThinking && !isGameOver) {
        fetchAiMove();
    }
  }, [isBlackTurn, mode, isGameOver]);

  const fetchAiMove = async () => {
      setIsAiThinking(true);
      try {
          const formattedHistory = moves.map(m => ({ x: m.col, y: m.row, color: m.color }));
          const data = await aiService.makeMove("caro", formattedHistory, [], "player2", difficulty);
          const { x, y } = data.move;

          if (x !== undefined && y !== undefined) {
              const newBoard = board.map(r => [...r]);
              newBoard[y][x] = { color: 'white' };
              setBoard(newBoard);

              setMoves(prev => [...prev, { color: 'White', row: y, col: x }]);

              // Kiểm tra AI Win
              if (checkWin(newBoard, y, x, 'white')) {
                  setWinningLine(getWinningLine(newBoard, y, x, 'white'));
                  setIsGameOver(true);
                  toast.error("Bot đã giành chiến thắng!");
                  return;
              }

              // KIỂM TRA HÒA
              if (checkDraw(newBoard)) {
                  setIsGameOver(true);
                  setModalResult("draw");
                  setModalMessage("Bàn cờ đã đầy! Trận đấu kết thúc với kết quả Hòa.");
                  setIsModalOpen(true);
                  return;
              }

              setIsBlackTurn(true); 
          }
      } catch (error) {
          console.error("[AI Error]:", error);
          toast.error("AI gặp lỗi khi tính toán nước đi.");
          setIsBlackTurn(true); 
      } finally {
          setIsAiThinking(false);
      }
  };

  const handleSquareClick = (row, col) => {
    if (board[row][col]) return; 

    // 1. Chặn click khi chơi với Bot / AI
    if (mode === 'ai' && !isBlackTurn) return; 
    if (isAiThinking) return;

    // 2. Chặn click khi chơi Online nhưng chưa tới lượt
    if (roomId) {
      if (currentTurnUserId && currentTurnUserId !== myUserId) {
          return; // Chưa tới lượt trên socket
      }
      // Fallback nếu chưa có currentTurnUserId
      const isMyTurn = (myRole === 'player1' && isBlackTurn) || (myRole === 'player2' && !isBlackTurn);
      if (!isMyTurn && !currentTurnUserId) return;
    }

    if (isGameOver) return; 

    const newBoard = board.map(r => [...r]);
    const currentColor = isBlackTurn ? 'black' : 'white';
    newBoard[row][col] = { color: currentColor };
    setBoard(newBoard);

    setIsBlackTurn(!isBlackTurn);
    setHintMove(null); // Xóa gợi ý khi có nước đi mới

    const moveData = { color: isBlackTurn ? 'Black' : 'White', row, col };
    setLastMove(moveData); // Highlight nước vừa đi
    setMoves(prev => [...prev, moveData]);

    // 3. Gửi nước đi lên socket khi đấu online
    if (roomId) {
      socket.emit("make_move", { roomId, matchId, moveData });
    }

    // KIỂM TRA THẮNG
    if (checkWin(newBoard, row, col, currentColor)) {
        setWinningLine(getWinningLine(newBoard, row, col, currentColor));
        setIsGameOver(true);
        setModalResult("win");
        setModalMessage("Bạn đã giành chiến thắng!");
        setIsModalOpen(true);

        if (roomId) {
            socket.emit("game_over", { 
                roomId, 
                matchId, 
                result: "win", 
                winnerId: myUserId 
            });
        }
        return;
    } 

    // KIỂM TRA HÒA
    if (checkDraw(newBoard)) {
        setIsGameOver(true);
        setModalResult("draw");
        setModalMessage("Bàn cờ đã đầy! Trận đấu kết thúc với kết quả Hòa.");
        setIsModalOpen(true);

        if (roomId) {
            socket.emit("game_over", { 
                roomId, 
                matchId, 
                result: "draw",
                message: "Bàn cờ đã đầy! Kết quả Hòa."
            });
        }
        return;
    }
  };

  // ------------------------------------------
  // Xử lý Timeout (Hết giờ) - Đếm lùi
  // ------------------------------------------
  useEffect(() => {
    if (!matchId || isGameOver) return;

    const interval = setInterval(() => {
      if (isBlackTurn) {
        setPlayer1Time(prev => {
          if (prev <= 1) { handleTimeout("player1"); return 0; }
          return prev - 1;
        });
      } else {
        setPlayer2Time(prev => {
          if (prev <= 1) { handleTimeout("player2"); return 0; }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [matchId, isGameOver, isBlackTurn]);

  const handleTimeout = (timeLeftRole) => {
      setIsGameOver(true);
      const amIPlayer1 = myRole === "player1";
      const isLose = (timeLeftRole === "player1" && amIPlayer1) || (timeLeftRole === "player2" && !amIPlayer1);
      
      setModalResult(isLose ? "lose" : "win");
      setModalMessage("Hết thời gian! Bạn đã " + (isLose ? "thua." : "thắng."));
      setIsModalOpen(true);

      if (roomId) {
          socket.emit("game_over", { roomId, matchId, result: "timeout", winnerId: isLose ? currentTurnUserId : myUserId });
      }
  };

  const resetGame = () => {
    setBoard(Array(15).fill(null).map(() => Array(15).fill(null)));
    setIsBlackTurn(true);
    setMoves([]);
    setIsGameOver(false);
    setWinningLine([]);
    setHintMove(null);
  };

  const handleGetHint = async () => {
    if (isGameOver || isHintLoading || (mode === 'ai' && !isBlackTurn)) return;
    
    setIsHintLoading(true);
    try {
      const formattedHistory = moves.map(m => ({ x: m.col, y: m.row, color: m.color }));
      const botRole = isBlackTurn ? "player1" : "player2";
      const data = await aiService.makeMove("caro", formattedHistory, [], botRole, "hard"); // Always use hard for hint
      setHintMove({ row: data.move.y, col: data.move.x });
      toast.success("AI gợi ý nước đi cho bạn!");
    } catch (error) {
      console.error("Hint error:", error);
      toast.error("Không thể lấy gợi ý vào lúc này.");
    } finally {
      setIsHintLoading(false);
    }
  };

  const handleOfferDraw = () => {
    if (isGameOver) return;
    if (roomId) {
      socket.emit("offer_draw", { roomId });
      toast.info("Đã gửi lời cầu hòa đến đối thủ.");
    }
  };

  const handleResign = () => {
    if (isGameOver) return;
    
    if (window.confirm("Bạn chắc chắn muốn đầu hàng không?")) {
        if (roomId) {
          socket.emit("resign", { roomId, matchId });
        } else {
            setIsGameOver(true);
            setModalResult("resign");
            setModalMessage("Bạn đã đầu hàng!");
            setIsModalOpen(true);
        }
    }
  };

  const movePairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      black: `${moves[i].row},${moves[i].col}`,
      white: moves[i + 1] ? `${moves[i + 1].row},${moves[i + 1].col}` : ""
    });
  }

  return (
    <>
      <div className="h-full flex flex-col p-4">
        <div className="flex-1 flex flex-col gap-4 lg:flex-row min-h-0">
          {/* Board Area */}
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <div className="shrink-0">
              <PlayerInfoBar name={player1Name} rating={1800} timer={formatTime(player1Time)} />
            </div>

            <div className="flex-1 min-h-0 relative">
              <GameBoard 
                gameType="caro" 
                boardState={board} 
                lastMove={lastMove} 
                onSquareClick={handleSquareClick} 
                winningLine={winningLine}
                hintMove={hintMove}
              />
            </div>

            <div className="shrink-0">
              <PlayerInfoBar name={player2Name} rating={1750} timer={formatTime(player2Time)} />
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-full lg:w-64 space-y-4">
            {roomId && (
               <Card className="bg-primary/5 border-primary/20">
                 <CardContent className="p-3 text-center font-medium">
                   {currentTurnUserId === myUserId ? (
                     <span className="text-green-600 animate-pulse flex items-center justify-center gap-1">
                       <span className="h-2 w-2 bg-green-600 rounded-full"></span> Lượt của bạn
                     </span>
                   ) : (
                     <span className="text-muted-foreground">⏳ Chờ đối thủ...</span>
                   )}
                 </CardContent>
               </Card>
            )}

            {roomId && myRole === 'player1' && !matchId && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold leading-none">Cài đặt Thời gian</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <select 
                    className="w-full p-2 border rounded-md text-sm bg-background/50 accent-primary"
                    value={matchTimeLimit}
                    onChange={(e) => {
                       const m = parseInt(e.target.value);
                       setMatchTimeLimit(m);
                       setPlayer1Time(m * 60);
                       setPlayer2Time(m * 60);
                       socket.emit("set_time_limit", { roomId, minutes: m });
                    }}
                  >
                    <option value={15}>15 Phút</option>
                    <option value={30}>30 Phút</option>
                    <option value={45}>45 Phút</option>
                    <option value={60}>60 Phút</option>
                  </select>
                </CardContent>
              </Card>
            )}

            {/* AI Settings / Hint - Show in AI mode or if user wants hint in PvP */}
            {((mode === 'ai') || roomId) && !isGameOver && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold leading-none">Cấp độ AI & Hỗ trợ</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  {mode === 'ai' && (
                    <select 
                      className="w-full p-2 border rounded-md text-sm bg-background/50 accent-primary"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                    >
                      <option value="easy">Dễ</option>
                      <option value="medium">Trung bình</option>
                      <option value="hard">Khó</option>
                    </select>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full h-8 text-xs gap-2"
                    onClick={handleGetHint}
                    disabled={isHintLoading || (roomId && currentTurnUserId !== myUserId) || (mode === 'ai' && !isBlackTurn)}
                  >
                    {isHintLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3 text-amber-500" />}
                    Gợi ý nước đi
                  </Button>
                </CardContent>
              </Card>
            )}

            {code && <GameRoomPanel code={code} roomId={roomId} />}
            
            {roomId && (
               <div className="flex-1 min-h-0">
                  <ChatBox roomId={roomId} currentUserId={myUserId} />
               </div>
            )}
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Move History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">#</th>
                        <th className="px-4 py-2 text-left font-medium">Black</th>
                        <th className="px-4 py-2 text-left font-medium">White</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movePairs.map((pair, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-accent/50">
                          <td className="px-4 py-1.5 text-muted-foreground">{pair.num}</td>
                          <td className="px-4 py-1.5 font-medium">{pair.black}</td>
                          <td className="px-4 py-1.5 font-medium">{pair.white}</td>
                        </tr>
                      ))}
                      {movePairs.length === 0 && (
                        <tr className="border-b last:border-0">
                          <td className="px-4 py-1.5 text-muted-foreground" colSpan={3}>Start playing...</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" className="w-full" onClick={resetGame}>New Game</Button>
              <Button variant="outline" size="sm" className="w-full" onClick={handleOfferDraw}>Offer Draw</Button>
              <Button variant="destructive" size="sm" className="w-full" onClick={handleResign}>Resign</Button>
               <Button variant="secondary" size="sm" className="w-full" onClick={() => {
                if (roomId) socket.emit("leave_room", { roomId });
                setTimeout(() => navigate('/dashboard'), 300);
              }}>Thoát phòng</Button>
            </div>
          </div>
        </div>
      </div>
      <GameOverModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        result={modalResult} 
        winnerName={modalResult === "win" ? "Bạn" : "Đối thủ"} 
        message={modalMessage}
        onExit={() => navigate('/dashboard')}
      />
    </>
  );
};

export default CaroGame;
