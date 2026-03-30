import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerInfoBar } from "@/components/PlayerInfoBar";
import { getStrictValidMoves, isInCheck, isCheckmate } from "@/utils/xiangqiLogic";
import { useSearchParams, useNavigate } from "react-router-dom";
import { GameRoomPanel } from "@/components/GameRoomPanel";
import ChatBox from "@/components/ChatBox";
import { GameBoard } from "@/components/GameBoard";
import { socket } from "@/lib/socket"; 
import { aiService } from "@/services/ai.service";
import { toast } from "sonner";
import { Loader2, Zap, RotateCcw } from "lucide-react";
import { GameOverModal } from "@/components/GameOverModal";
import { authService } from "@/services/auth.service";
import { useGameTheme } from "@/hooks/useGameTheme.jsx";
import { ThemeSelector } from "@/components/ThemeSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import confetti from "canvas-confetti";

const formatTime = (secs) => {
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
};

const initialXiangqiBoard = () => {
  const board = Array(10).fill(null).map(() => Array(9).fill(null));
  // Black pieces (top)
  board[0][0] = { color: 'black', label: '車' };
  board[0][1] = { color: 'black', label: '馬' };
  board[0][2] = { color: 'black', label: '象' };
  board[0][3] = { color: 'black', label: '士' };
  board[0][4] = { color: 'black', label: '將' };
  board[0][5] = { color: 'black', label: '士' };
  board[0][6] = { color: 'black', label: '象' };
  board[0][7] = { color: 'black', label: '馬' };
  board[0][8] = { color: 'black', label: '車' };

  board[2][1] = { color: 'black', label: '砲' };
  board[2][7] = { color: 'black', label: '砲' };

  board[3][0] = { color: 'black', label: '卒' };
  board[3][2] = { color: 'black', label: '卒' };
  board[3][4] = { color: 'black', label: '卒' };
  board[3][6] = { color: 'black', label: '卒' };
  board[3][8] = { color: 'black', label: '卒' };

  // Red pieces (bottom)
  board[9][0] = { color: 'red', label: '俥' };
  board[9][1] = { color: 'red', label: '傌' };
  board[9][2] = { color: 'red', label: '相' };
  board[9][3] = { color: 'red', label: '仕' };
  board[9][4] = { color: 'red', label: '帥' };
  board[9][5] = { color: 'red', label: '仕' };
  board[9][6] = { color: 'red', label: '相' };
  board[9][7] = { color: 'red', label: '傌' };
  board[9][8] = { color: 'red', label: '俥' };

  board[7][1] = { color: 'red', label: '炮' };
  board[7][7] = { color: 'red', label: '炮' };

  board[6][0] = { color: 'red', label: '兵' };
  board[6][2] = { color: 'red', label: '兵' };
  board[6][4] = { color: 'red', label: '兵' };
  board[6][6] = { color: 'red', label: '兵' };
  board[6][8] = { color: 'red', label: '兵' };

  return board;
};

const XiangqiGame = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get('roomId');
  const code = searchParams.get('code');
  const mode = searchParams.get('mode');

  const [board, setBoard] = useState(initialXiangqiBoard());
  const boardRef = React.useRef(board);
  const [turn, setTurn] = useState('red');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [history, setHistory] = useState([]);

  React.useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const [myRole, setMyRole] = useState(null); 
  const [isAiThinking, setIsAiThinking] = useState(false);
  const { boardTheme, pieceSkin, themeConfig } = useGameTheme();
  const [isGameOver, setIsGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState('medium'); 
  const [hintMove, setHintMove] = useState(null);
  const [isHintLoading, setIsHintLoading] = useState(false);

  const [matchId, setMatchId] = useState(null);
  const [currentTurnUserId, setCurrentTurnUserId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalResult, setModalResult] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const currentUser = authService.getCurrentUser();
  const myUserId = currentUser?.id;

  const [lastMove, setLastMove] = useState(null);
  const [player1Time, setPlayer1Time] = useState(1800); 
  const [player2Time, setPlayer2Time] = useState(1800);
  const [matchTimeLimit, setMatchTimeLimit] = useState(30);

  const [player1Name, setPlayer1Name] = useState("Người chơi 1");
  const [player2Name, setPlayer2Name] = useState("Người chơi 2");

  useEffect(() => {
    if (roomId) {
      socket.connect();
      socket.emit("join_game_room", { roomId });

      socket.on("game_room_joined", ({ role, players, match }) => {
        setMyRole(role);
        toast.success(`Bạn là ${role === "player1" ? "Quân Đỏ (Red - Đi Trước)" : "Quân Đen (Black)"}`);

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

      socket.on("match_started", ({ match_id, firstTurn, players }) => {
        setMatchId(match_id);
        setCurrentTurnUserId(firstTurn);
        toast.success("Trận đấu bắt đầu! Lượt: " + (firstTurn === myUserId ? "Của bạn" : "Đối thủ"));

        if (players) {
            setPlayer1Name(players.player1.username);
            setPlayer2Name(players.player2.username);
        }
      });

      socket.on("turn_changed", ({ currentTurn }) => {
        setCurrentTurnUserId(currentTurn);
      });

      socket.on("receive_move", ({ moveData }) => {
        const move = moveData;
        if (move && move.from && move.to) {
            setLastMove(move); 
            executeMove(move.from.row, move.from.col, move.to.row, move.to.col, false); 
        }
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
          toast.info(`Cập nhật thời gian trận đấu: ${minutes} phút`);
      });

      socket.on("receive_game_over", ({ result, winnerId, message }) => {
          confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
          setIsGameOver(true);
          
          if (result === "draw") {
              setModalResult("draw");
          } else if (result === "resign") {
              setModalResult(winnerId === myUserId ? "win" : "resign");
          } else {
              setModalResult(winnerId === myUserId ? "win" : "lose");
          }
          
          setModalMessage(message);
          setIsModalOpen(true);
      });

      socket.on("undo_executed", ({ currentTurn }) => {
        handleUndo();
        setCurrentTurnUserId(currentTurn);
        toast.success("Nước đi đã được thu hồi.");
      });

      socket.on("undo_rejected", ({ message }) => {
        toast.error(message);
      });

      return () => {
        socket.off("game_room_joined");
        socket.off("player_joined");
        socket.off("match_started");
        socket.off("turn_changed");
        socket.off("receive_move");
        socket.off("receive_draw_offer");
        socket.off("draw_rejected");
        socket.off("receive_time_limit");
        socket.off("receive_game_over");
        socket.off("undo_executed");
        socket.off("undo_rejected");
        socket.disconnect();
      };
    }
  }, [roomId, myUserId, matchId]);

  useEffect(() => {
    if (mode === 'ai' && turn === 'black' && !isAiThinking) {
        fetchAiMove();
    }
  }, [turn, mode]);

  const fetchAiMove = async () => {
      setIsAiThinking(true);
      setHintMove(null);
      try {
          const data = await aiService.makeMove("xiangqi", board, [], "player2", difficulty);
          const moveResult = data.move; 

          if (moveResult && moveResult.from && moveResult.to) {
              executeMove(moveResult.from.row, moveResult.from.col, moveResult.to.row, moveResult.to.col, false);
          }
      } catch (error) {
          console.error("[AI Error]:", error);
          setTurn('red'); 
      } finally {
          setIsAiThinking(false);
      }
  };

  const handleSquareClick = (row, col) => {
    if (isGameOver) return; 

    if (mode === 'ai' && turn === 'black') return;
    if (isAiThinking) return;

    if (roomId) {
      if (currentTurnUserId && currentTurnUserId !== myUserId) return;
      
      const isMyTurn = (myRole === 'player1' && turn === 'red') || (myRole === 'player2' && turn === 'black');
      if (!isMyTurn && !currentTurnUserId) return;
    }

    if (selectedSquare) {
      const isMoveValid = validMoves.some(m => m.row === row && m.col === col);
      if (isMoveValid) {
        executeMove(selectedSquare.row, selectedSquare.col, row, col);
        return;
      }
    }

    const piece = board[row][col];
    if (piece && piece.color === turn) {
      setSelectedSquare({ row, col });
      setValidMoves(getStrictValidMoves(board, row, col)); 
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const executeMove = (fromRow, fromCol, toRow, toCol, shouldEmit = true) => {
    let capturedGeneral = false;
    
    const newBoard = boardRef.current.map(r => [...r]);
    const piece = newBoard[fromRow][fromCol];
    const targetPiece = newBoard[toRow][toCol];

    if (targetPiece && (targetPiece.label === '將' || targetPiece.label === '帥')) {
        capturedGeneral = true;
    }

    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = null;

    setLastMove({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } });

    if (capturedGeneral) {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
        setIsGameOver(true);
        setModalResult("win");
        setModalMessage(`Chiến thắng! Bạn đã ăn Tướng của đối phương!`);
        setIsModalOpen(true);

        if (shouldEmit && roomId) {
            socket.emit("game_over", { roomId, matchId, result: "win", winnerId: myUserId });
        }
    } else {
        const nextTurn = turn === 'red' ? 'black' : 'red';
        if (isCheckmate(newBoard, nextTurn)) {
            confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
            setIsGameOver(true);
            setModalResult("win");
            setModalMessage("Chiếu sát! Bạn đã giành chiến thắng!");
            setIsModalOpen(true);

            if (shouldEmit && roomId) {
                socket.emit("game_over", { roomId, matchId, result: "win", winnerId: myUserId });
            }
        } else if (isInCheck(newBoard, nextTurn)) {
            toast.warning(`Chiếu tướng! Quân ${nextTurn === 'red' ? 'Đỏ' : 'Đen'} đang bị chiếu.`);
        }
    }

    if (shouldEmit && roomId) {
        socket.emit("make_move", { 
           roomId, 
           matchId,
           moveData: { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } } 
        });
    }

    const desc = `${piece?.label || 'Quân'} (${fromCol+1},${fromRow+1}) ➔ (${toCol+1},${toRow+1})`;
    setHistory(prev => [...prev, {
        piece, 
        from: { row: fromRow, col: fromCol }, 
        to: { row: toRow, col: toCol }, 
        captured: targetPiece,
        desc
    }]);

    setBoard(newBoard);
    setTurn(prev => prev === 'red' ? 'black' : 'red');
    setSelectedSquare(null);
    setValidMoves([]);
    setHintMove(null);
  };

  useEffect(() => {
    if (!matchId || isGameOver) return;

    const interval = setInterval(() => {
      if (turn === 'red') {
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
  }, [matchId, isGameOver, turn]);

  const handleTimeout = (timeLeftRole) => {
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
      setIsGameOver(true);
      const amIPlayer1 = myRole === "player1";
      const isLose = (timeLeftRole === "player1" && amIPlayer1) || (timeLeftRole === "player2" && !amIPlayer1);
      
      setModalResult(isLose ? "lose" : "win");
      setModalMessage("Hết thời gian! Bạn đã " + (isLose ? "thua." : "thắng."));
      setIsModalOpen(true);
  };

  const resetGame = () => {
    setBoard(initialXiangqiBoard());
    setTurn('red');
    setSelectedSquare(null);
    setValidMoves([]);
    setHistory([]);
    setIsGameOver(false);
    setLastMove(null);
    setHintMove(null);
  };

  const handleGetHint = async () => {
    if (isGameOver || isHintLoading || (mode === 'ai' && turn === 'black')) return;
    
    setIsHintLoading(true);
    try {
      const botRole = turn === 'red' ? "player1" : "player2";
      const data = await aiService.makeMove("xiangqi", board, [], botRole, "hard");
      setHintMove(data.move);
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
      toast("Đã gửi lời cầu hòa đến đối thủ.");
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

  const handleRequestUndo = () => {
    if (isGameOver || history.length === 0) return;
    
    if (mode === 'ai') {
        handleUndo(); 
        if (isAiThinking) return;
        handleUndo(); 
        toast.success("Đã lùi lại nước đi.");
    } else if (roomId) {
        socket.emit("request_undo", { roomId });
        toast.info("Đã gửi yêu cầu đi lại.");
    }
  };

  const handleUndo = () => {
    setHistory(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const newHistory = prev.slice(0, -1);
        
        setBoard(currentBoard => {
            const newBoard = currentBoard.map(r => [...r]);
            newBoard[last.from.row][last.from.col] = last.piece;
            newBoard[last.to.row][last.to.col] = last.captured || null;
            return newBoard;
        });

        setTurn(last.piece.color);
        setLastMove(newHistory.length > 0 ? newHistory[newHistory.length-1] : null);
        return newHistory;
    });
  };

  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      red: history[i].desc,
      black: history[i + 1] ? history[i + 1].desc : ""
    });
  }

  return (
    <>
      <div className="h-full flex flex-col p-4">
        <div className="flex-1 flex flex-col gap-4 lg:flex-row min-h-0">
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <div className="shrink-0">
              <PlayerInfoBar 
                name={myRole === 'player1' ? player2Name : player1Name} 
                rating={myRole === 'player1' ? 1950 : 2100} 
                timer={myRole === 'player1' ? formatTime(player2Time) : formatTime(player1Time)} 
              />
            </div>

            <div className="flex-1 min-h-0 relative">
              <GameBoard
                gameType="xiangqi"
                boardState={board}
                selectedSquare={selectedSquare}
                validMoves={validMoves}
                lastMove={lastMove}
                hintMove={hintMove}
                flipped={myRole === 'player2'}
                onSquareClick={handleSquareClick}
                theme={themeConfig}
                skin={pieceSkin}
              />
            </div>

            <div className="shrink-0">
              <PlayerInfoBar 
                name={myRole === 'player1' ? player1Name : player2Name} 
                rating={myRole === 'player1' ? 2100 : 1950} 
                timer={myRole === 'player1' ? formatTime(player1Time) : formatTime(player2Time)} 
              />
            </div>
          </div>

          <div className="w-full lg:w-72 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-120px)] pr-2 scrollbar-thin">
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
            
            {!isGameOver && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold leading-none flex items-center gap-2">
                    <Zap className="h-3 w-3 text-amber-500" />
                    Hỗ trợ AI
                  </CardTitle>
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
                    disabled={isHintLoading || (roomId && currentTurnUserId !== myUserId) || (mode === 'ai' && turn === 'black')}
                  >
                    {isHintLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3 text-amber-500" />}
                    Gợi ý nước đi
                  </Button>
                </CardContent>
              </Card>
            )}
            
            <Card className="border-primary/20 bg-primary/5">
              <Tabs defaultValue="history" className="w-full">
                <CardHeader className="pb-0 px-2">
                  <TabsList className="grid w-full grid-cols-2 h-8">
                    <TabsTrigger value="history" className="text-[10px]">Lịch sử</TabsTrigger>
                    <TabsTrigger value="themes" className="text-[10px]">Giao diện</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="p-0">
                  <TabsContent value="history" className="mt-0">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground text-[11px]">
                            <th className="px-3 py-2 text-left font-medium">#</th>
                            <th className="px-3 py-2 text-left font-medium">Đỏ</th>
                            <th className="px-3 py-2 text-left font-medium">Đen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {movePairs.map((pair, idx) => (
                            <tr key={idx} className="border-b last:border-0 hover:bg-accent/50">
                              <td className="px-3 py-1 text-muted-foreground text-[11px]">{pair.num}</td>
                              <td className="px-3 py-1 font-medium text-[11px]">{pair.red}</td>
                              <td className="px-3 py-1 font-medium text-[11px]">{pair.black}</td>
                            </tr>
                          ))}
                          {movePairs.length === 0 && (
                            <tr className="border-b last:border-0">
                              <td className="px-3 py-4 text-center text-muted-foreground text-[11px]" colSpan={3}>Bắt đầu chơi...</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                  <TabsContent value="themes" className="mt-0 p-3">
                    <ThemeSelector />
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>

            {code && <GameRoomPanel code={code} roomId={roomId} />}

            {roomId && (
               <div className="flex-shrink-0 h-[300px]">
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
                        <th className="px-4 py-2 text-left font-medium">Red</th>
                        <th className="px-4 py-2 text-left font-medium">Black</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movePairs.map((pair, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-accent/50">
                          <td className="px-4 py-1.5 text-muted-foreground">{pair.num}</td>
                          <td className="px-4 py-1.5 font-medium truncate max-w-[80px]" title={pair.red}>{pair.red}</td>
                          <td className="px-4 py-1.5 font-medium truncate max-w-[80px]" title={pair.black}>{pair.black}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="w-full" onClick={resetGame}>New Game</Button>
                <Button variant="outline" size="sm" className="w-full gap-1" onClick={handleRequestUndo} disabled={history.length === 0 || isGameOver}>
                  <RotateCcw className="h-3 w-3" /> Đi lại
                </Button>
              </div>
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

export default XiangqiGame;
