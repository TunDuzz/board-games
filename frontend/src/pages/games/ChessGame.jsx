import { toast as sonnerToast } from "sonner";
import React, { useState, useEffect } from "react"; // Added useEffect
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerInfoBar } from "@/components/PlayerInfoBar";
import { GameBoard } from "@/components/GameBoard";
import { INITIAL_CHESS_BOARD, getValidMoves, getPieceColor, isCheck, isCheckmate } from "@/utils/chessLogic";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams, useNavigate } from "react-router-dom";
import { GameRoomPanel } from "@/components/GameRoomPanel";
import { socket } from "@/lib/socket"; // Thêm client socket
import { aiService } from "@/services/ai.service";
import { GameOverModal } from "@/components/GameOverModal";
import { authService } from "@/services/auth.service";

const formatTime = (secs) => {
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
};

const ChessGame = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [board, setBoard] = useState(INITIAL_CHESS_BOARD);
  const boardRef = React.useRef(board);
  const [turn, setTurn] = useState('white');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [history, setHistory] = useState([]);

  React.useEffect(() => {
    boardRef.current = board;
  }, [board]);
  const [isGameOver, setIsGameOver] = useState(false);

  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('roomId');
  const code = searchParams.get('code');
  const mode = searchParams.get('mode');

  const [myRole, setMyRole] = useState(null); // 'player1' (White) hoặc 'player2' (Black)
  const [isAiThinking, setIsAiThinking] = useState(false);

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
        toast({ title: `Bạn là ${role === "player1" ? "Trắng (White)" : "Đen (Black)"}` });

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
        toast({ title: "Trận đấu bắt đầu", description: "Lượt: " + (firstTurn === myUserId ? "Của bạn" : "Đối thủ") });

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
            setLastMove(move); // Ghi nhận nước đi cuối để highlight
            executeMove(move.from.row, move.from.col, move.to.row, move.to.col, false); 
        }
      });

      socket.on("receive_draw_offer", ({ username }) => {
          sonnerToast(`Đối thủ [${username}] cầu hòa. Bạn có đồng ý không?`, {
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
          toast({ title: "Cầu hòa bị từ chối", description: message, variant: "destructive" });
      });

      socket.on("receive_time_limit", ({ minutes }) => {
          setMatchTimeLimit(minutes);
          setPlayer1Time(minutes * 60);
          setPlayer2Time(minutes * 60);
          toast({ title: "Cập nhật thời gian", description: `Thời gian trận đấu: ${minutes} phút` });
      });

      socket.on("receive_game_over", ({ result, winnerId, message }) => {
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

  // ==========================================
  // 2. TRIGGER AI CHO BOT MODE
  // ==========================================
  useEffect(() => {
    if (mode === 'ai' && turn === 'black' && !isAiThinking) {
        fetchAiMove();
    }
  }, [turn, mode]);

  const fetchAiMove = async () => {
      setIsAiThinking(true);
      try {
          // Tính FEN hoặc gửi array để GPT đọc
          const data = await aiService.makeMove("chess", board, [], "player2");
          const moveResult = data.move; 
          // Move format: { move: "e2e4" } hoặc coordinate

          if (moveResult && moveResult.from && moveResult.to) {
              executeMove(moveResult.from.row, moveResult.from.col, moveResult.to.row, moveResult.to.col, false);
          }
      } catch (error) {
          console.error("[AI Error]:", error);
          setTurn('white'); // Trả lại lượt
      } finally {
          setIsAiThinking(false);
      }
  };

  const handleSquareClick = (row, col) => {
    if (isGameOver) return;

    // 1. Chặn click khi đến lượt bot/AI
    if (mode === 'ai' && turn === 'black') return;
    if (isAiThinking) return;

    // 2. Chặn click khi chơi online nhưng ko phải lượt của mình
    if (roomId) {
      if (currentTurnUserId && currentTurnUserId !== myUserId) return;
      
      const isMyTurn = (myRole === 'player1' && turn === 'white') || (myRole === 'player2' && turn === 'black');
      if (!isMyTurn && !currentTurnUserId) return;
    }

    // Nếu đã chọn một ô trước đó, thử di chuyển
    if (selectedSquare) {
      const isMoveValid = validMoves.some(m => m.row === row && m.col === col);
      if (isMoveValid) {
        executeMove(selectedSquare.row, selectedSquare.col, row, col);
        return;
      }
    }

    // Chọn quân mới
    const piece = board[row][col];
    if (piece && getPieceColor(piece) === turn) {
      setSelectedSquare({ row, col });
      const moves = getValidMoves(board, row, col, history);
      setValidMoves(moves);
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const executeMove = (fromRow, fromCol, toRow, toCol, shouldEmit = true) => {
    const newBoard = boardRef.current.map(r => [...r]);
    const piece = board[fromRow][fromCol];
    
    // Tính toán moveInfo ngay tại đây để hỗ trợ việc truyền từ socket (khi validMoves rỗng)
    const movesOnSquare = getValidMoves(board, fromRow, fromCol, history);
    const moveInfo = movesOnSquare.find(m => m.row === toRow && m.col === toCol);

    if (!moveInfo) return; // Bảo vệ nếu nước đi không hợp lệ

    setLastMove({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } });

    // Xử lý di chuyển quân chính
    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = null;

    // Xử lý đòn đặc biệt: Nhập thành
    if (moveInfo.isCastling) {
      const backRank = toRow;
      if (moveInfo.isCastling === 'king') {
        newBoard[backRank][5] = newBoard[backRank][7];
        newBoard[backRank][7] = null;
      } else {
        newBoard[backRank][3] = newBoard[backRank][0];
        newBoard[backRank][0] = null;
      }
    }

    // Xử lý đòn đặc biệt: Bắt tốt qua đường (En Passant)
    if (moveInfo.isEnPassant) {
      newBoard[fromRow][toCol] = null;
    }

    // Xử lý Phong cấp (Tạm thời tự động lên Hậu)
    if (piece.toLowerCase() === 'p' && (toRow === 0 || toRow === 7)) {
      newBoard[toRow][toCol] = piece === 'P' ? 'Q' : 'q';
    }

    const nextTurn = turn === 'white' ? 'black' : 'white';
    const newHistory = [...history, {
      piece, from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      san: getNotation(piece, fromRow, fromCol, toRow, toCol)
    }];

    // Kiểm tra Chiếu bí sau khi đi
    if (isCheckmate(newBoard, nextTurn, newHistory)) {
      setIsGameOver(true);
      setModalResult("win");
      setModalMessage(`Chiếu bí! ${turn === 'white' ? 'Trắng' : 'Đen'} giành chiến thắng!`);
      setIsModalOpen(true);

      if (shouldEmit && roomId) {
          socket.emit("game_over", { 
             roomId, 
             matchId, 
             result: "win", 
             winnerId: myUserId 
          });
      }
    } else if (isCheck(newBoard, nextTurn)) {
      toast({ title: "Chiếu tướng!", description: `${nextTurn === 'white' ? 'Trắng' : 'Đen'} đang bị chiếu.` });
    }

    // Gửi nước đi lên socket cho phòng Online
    if (shouldEmit && roomId) {
        socket.emit("make_move", { 
           roomId, 
           matchId,
           moveData: { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } } 
        });
    }

    setBoard(newBoard);
    setHistory(newHistory);
    setTurn(nextTurn);
    setSelectedSquare(null);
    setValidMoves([]);
  };

  // ------------------------------------------
  // Xử lý Timeout (Hết giờ) - Đếm lùi
  // ------------------------------------------
  useEffect(() => {
    if (!matchId || isGameOver) return;

    const interval = setInterval(() => {
      if (turn === 'white') {
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

  const getNotation = (piece, fromRow, fromCol, toRow, toCol) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const p = piece.toLowerCase() === 'p' ? '' : piece.toUpperCase();
    return `${p}${files[toCol]}${8 - toRow}`;
  };

  const resetGame = () => {
    setBoard(INITIAL_CHESS_BOARD);
    setTurn('white');
    setHistory([]);
    setSelectedSquare(null);
    setValidMoves([]);
    setIsGameOver(false);
  };

  const handleOfferDraw = () => {
    if (isGameOver) return;
    if (roomId) {
      socket.emit("offer_draw", { roomId });
      toast({ title: "Cầu hòa", description: "Đã gửi lời cầu hòa đến đối thủ." });
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
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: history[i].san,
      black: history[i + 1] ? history[i + 1].san : ""
    });
  }

  return (
    <>
      <div className="h-full flex flex-col p-4">
        {isGameOver && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-center shrink-0">
            <h2 className="text-lg font-bold text-primary">Game Over</h2>
            <p className="text-sm">The match has ended.</p>
          </div>
        )}
        <div className="flex-1 flex flex-col gap-4 lg:flex-row min-h-0">
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <div className="shrink-0">
              <PlayerInfoBar 
                name={myRole === 'player1' ? player2Name : player1Name} 
                rating={myRole === 'player1' ? 2030 : 2290} 
                timer={myRole === 'player1' ? formatTime(player2Time) : formatTime(player1Time)} 
              />
            </div>
            <div className="flex-1 min-h-0 relative">
              <GameBoard
                gameType="chess"
                boardState={board.map(r => r.map(p => p ? {
                  type: p.toLowerCase(),
                  color: getPieceColor(p),
                  label: p
                } : null))}
                selectedSquare={selectedSquare}
                validMoves={validMoves}
                lastMove={lastMove}
                flipped={myRole === 'player2'}
                onSquareClick={handleSquareClick}
              />
            </div>
            <div className="shrink-0">
              <PlayerInfoBar 
                name={myRole === 'player1' ? player1Name : player2Name} 
                rating={myRole === 'player1' ? 2290 : 2030} 
                timer={myRole === 'player1' ? formatTime(player1Time) : formatTime(player2Time)} 
              />
            </div>
          </div>

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
                  <CardTitle className="text-sm font-bold leading-none">Cài đặt Thời gian</CardTitle>
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

            {code && <GameRoomPanel code={code} roomId={roomId} />}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Move History (Custom)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">#</th>
                        <th className="px-4 py-2 text-left font-medium">White</th>
                        <th className="px-4 py-2 text-left font-medium">Black</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movePairs.map((pair, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-accent/50">
                          <td className="px-4 py-1.5 text-muted-foreground">{pair.num}</td>
                          <td className="px-4 py-1.5 font-medium">{pair.white}</td>
                          <td className="px-4 py-1.5 font-medium">{pair.black}</td>
                        </tr>
                      ))}
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

export default ChessGame;

