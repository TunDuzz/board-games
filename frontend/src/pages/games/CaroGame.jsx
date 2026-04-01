import { useState, useEffect } from "react"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerInfoBar } from "@/components/PlayerInfoBar";
import { GameBoard } from "@/components/GameBoard";

import { useSearchParams, useNavigate } from "react-router-dom";
import { GameRoomPanel } from "@/components/GameRoomPanel";
import ChatBox from "@/components/ChatBox";
import { aiService } from "@/services/ai.service"; 
import { toast as sonnerToast } from "sonner"; 
import { Loader2, Zap, Handshake, Play, X, RotateCcw } from "lucide-react";
import { socket } from "@/lib/socket"; 
import { checkWin, checkDraw, getWinningLine } from "@/utils/caroLogic"; 
import { GameOverModal } from "@/components/GameOverModal";
import { authService } from "@/services/auth.service";
import UnifiedSidePanel from "@/components/games/UnifiedSidePanel";
import { matchmakingService } from "@/services/matchmaking.service";
import { useGameTheme } from "@/hooks/useGameTheme.jsx";
import { ThemeSelector } from "@/components/ThemeSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import confetti from "canvas-confetti";

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

  const { boardTheme, setBoardTheme, pieceSkin, themeConfig } = useGameTheme();
  
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [eloResult, setEloResult] = useState(null);
  const [winner, setWinner] = useState(null);
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
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  const currentUser = authService.getCurrentUser();
  const myUserId = currentUser?.id;

  // States mới cho Timer & Highlight
  const [lastMove, setLastMove] = useState(null);
  const [player1Time, setPlayer1Time] = useState(1800); // 30 phút * 60s
  const [player2Time, setPlayer2Time] = useState(1800);
  const [matchTimeLimit, setMatchTimeLimit] = useState(30);

  const [player1Name, setPlayer1Name] = useState(currentUser?.username || "Người chơi 1");
  const [player2Name, setPlayer2Name] = useState("Người chơi 2");
  const [player1Stats, setPlayer1Stats] = useState({ 
    elo: currentUser?.elo || 0, 
    rank: currentUser?.rank || "Đồng" 
  });
  const [player2Stats, setPlayer2Stats] = useState({ elo: 0, rank: "Đồng" });
  const [isAiGameStarted, setIsAiGameStarted] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [playerCount, setPlayerCount] = useState(1);

  // States Giao diện & Âm thanh (LocalStorage)
  const [isMusicEnabled, setIsMusicEnabled] = useState(() => localStorage.getItem('isMusicEnabled') === 'true');
  const [isSfxEnabled, setIsSfxEnabled] = useState(() => localStorage.getItem('isSfxEnabled') !== 'false');
  const [pieceColor, setPieceColor] = useState(() => localStorage.getItem('pieceColor') || 'auto');

  // Quản lý âm thanh
  const [bgMusic] = useState(() => new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'));
  
  useEffect(() => {
    bgMusic.loop = true;
    bgMusic.volume = 0.2;
    if (isMusicEnabled) {
      bgMusic.play().catch(e => console.log("Audio play blocked by browser. User interaction required."));
    } else {
      bgMusic.pause();
    }
  }, [isMusicEnabled, bgMusic]);

  useEffect(() => {
    localStorage.setItem('isMusicEnabled', isMusicEnabled);
    localStorage.setItem('isSfxEnabled', isSfxEnabled);
    localStorage.setItem('pieceColor', pieceColor);
  }, [isMusicEnabled, isSfxEnabled, pieceColor]);

  const SOUND_ASSETS = {
    move: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/Move.mp3',
    'game-over': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/GenericNotify.mp3'
  };

  const playSfx = (type) => {
    if (!isSfxEnabled) return;
    const url = SOUND_ASSETS[type] || `/${type}.mp3`;
    const sfx = new Audio(url);
    sfx.volume = 0.6;
    sfx.play().catch(e => {});
  };

  // ==========================================
  // 1. KẾT NỐI SOCKET CHO PHÒNG ONLINE
  // ==========================================
  useEffect(() => {
    if (roomId) {
      socket.connect();
      socket.emit("join_game_room", { roomId });

      socket.on("game_room_joined", ({ role, players, match, chatHistory }) => {
        setMyRole(role);
        sonnerToast.success(`Bạn là ${role === "player1" ? "Quân Đen (Đi Trước)" : "Quân Trắng"}`);
        
        if (players) {
            const p1 = players.find(p => p.role === "player1");
            const p2 = players.find(p => p.role === "player2");
            if (p1) {
              setPlayer1Name(p1.username);
              setPlayer1Stats({ elo: p1.elo, rank: p1.rank });
            }
            if (p2) {
              setPlayer2Name(p2.username);
              setPlayer2Stats({ elo: p2.elo, rank: p2.rank });
            }
            setPlayerCount(players.length);
        }

        if (chatHistory) {
          setChatHistory(chatHistory);
        }

        if (match) {
            setMatchId(match.match_id);
            if (match.currentTurn) setCurrentTurnUserId(match.currentTurn);

            // Reconstruct board from history
            if (match.moves && match.moves.length > 0) {
                const newBoard = Array(15).fill(null).map(() => Array(15).fill(null));
                const newMoves = [];
                match.moves.forEach(m => {
                    const moveData = typeof m.move_data === "string" ? JSON.parse(m.move_data) : m.move_data;
                    if (moveData && moveData.row !== undefined && moveData.col !== undefined) {
                        newBoard[moveData.row][moveData.col] = { color: moveData.color.toLowerCase() };
                        newMoves.push(moveData);
                    }
                });
                setBoard(newBoard);
                setMoves(newMoves);
                if (newMoves.length > 0) {
                    setLastMove(newMoves[newMoves.length - 1]);
                }
                // Caro: Black (player1) goes first, so even moves length means it's Black's turn
                setIsBlackTurn(newMoves.length % 2 === 0);
            }
            if (match.player1Time) setPlayer1Time(match.player1Time);
            if (match.player2Time) setPlayer2Time(match.player2Time);
        }
      });

      socket.on("player_joined", ({ username, role }) => {
          if (role === "player2") setPlayer2Name(username);
          else if (role === "player1") setPlayer1Name(username);
          setPlayerCount(prev => Math.min(prev + 1, 2));
      });

      socket.on("player_left", ({ userId }) => {
          setPlayerCount(prev => Math.max(prev - 1, 1));
          if (myRole === 'player1') setPlayer2Name("Người chơi 2");
          else setPlayer1Name("Người chơi 1");
      });

      // LẮNG NGHE MATCH STARTED (Host bấm start)
      socket.on("match_started", ({ match_id, firstTurn, players }) => {
        setMatchId(match_id);
        setCurrentTurnUserId(firstTurn);
        setGameStartTime(Date.now());
        sonnerToast.success("Trận đấu bắt đầu! Lượt " + (firstTurn === myUserId ? "của Bạn" : "đối thủ"));

        if (players) {
            setPlayer1Name(players.player1.username);
            setPlayer2Name(players.player2.username);
        }
      });

      // LẮNG NGHE CHUYỂN LƯỢT
      socket.on("turn_changed", ({ currentTurn, player1Time, player2Time }) => {
        setCurrentTurnUserId(currentTurn);
        if (player1Time !== undefined) setPlayer1Time(player1Time);
        if (player2Time !== undefined) setPlayer2Time(player2Time);
      });

      socket.on("receive_move", ({ moveData }) => {
        setLastMove(moveData); // Lưu nước đi cuối để highlight
        setBoard(prev => {
          const newBoard = prev.map(r => [...r]);
          newBoard[moveData.row][moveData.col] = { color: moveData.color.toLowerCase() };
          
          if (checkWin(newBoard, moveData.row, moveData.col, moveData.color.toLowerCase())) {
              setWinningLine(getWinningLine(newBoard, moveData.row, moveData.col, moveData.color.toLowerCase()));
              handleGameOver("lose", null, "Đối thủ đã giành chiến thắng!");
          }
          return newBoard;
        });
        setIsBlackTurn(moveData.color.toLowerCase() === "white"); 
        setMoves(prev => [...prev, moveData]);
      });

      socket.on("receive_draw_offer", ({ username }) => {
          sonnerToast(`Đối thủ [${username}] cầu hòa. Bạn có đồng ý không?`, {
              duration: 10000,
              action: {
                  label: "Đồng ý",
                  onClick: () => {
                      const duration = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;
                      socket.emit("accept_draw", { 
                          roomId, 
                          matchId,
                          duration,
                          p1Captures: 0,
                          p2Captures: 0
                      });
                  }
              },
              cancel: {
                  label: "Từ chối",
                  onClick: () => socket.emit("reject_draw", { roomId })
              }
          });
      });

      socket.on("draw_rejected", ({ username, message }) => {
          sonnerToast.warning(message || `${username} từ chối hòa cờ.`);
      });

      socket.on("receive_time_limit", ({ minutes }) => {
          setMatchTimeLimit(minutes);
          setPlayer1Time(minutes * 60);
          setPlayer2Time(minutes * 60);
          sonnerToast.info(`Thời gian trận đấu được cập nhật thành ${minutes} phút`);
      });

      socket.on("receive_game_over", ({ result, winnerId, message }) => {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
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
        socket.off("player_joined");
        socket.off("player_left");
        socket.disconnect();
      };
    }
  }, [roomId, myUserId, matchId]);

  // Effect for matchmaking polling
  useEffect(() => {
    let interval;
    let timerInterval;

    if (isSearching) {
      setSearchTime(0);
      timerInterval = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);

      interval = setInterval(async () => {
        try {
          const data = await matchmakingService.checkStatus();
          if (data.matched) {
            clearInterval(interval);
            clearInterval(timerInterval);
            setIsSearching(false);
            sonnerToast.success("Đã tìm thấy đối thủ!");
            if (data.room?.room_id) {
               navigate(`/game/caro?roomId=${data.room.room_id}&code=${data.room.room_code}`);
            }
          }
        } catch (error) {
          clearInterval(interval);
          clearInterval(timerInterval);
          setIsSearching(false);
        }
      }, 3000);
    }
    return () => {
      clearInterval(interval);
      clearInterval(timerInterval);
    };
  }, [isSearching, navigate]);

  // Socket listener cho ELO
  useEffect(() => {
    const handleEloUpdated = (data) => {
        const myEloData = data.p1.userId === myUserId ? data.p1 : (data.p2.userId === myUserId ? data.p2 : null);
        if (myEloData) {
            setEloResult(myEloData);
            if (data.p1.userId === myUserId) {
                setPlayer1Stats(prev => ({ ...prev, elo: data.p1.newElo }));
            } else if (data.p2.userId === myUserId) {
                setPlayer2Stats(prev => ({ ...prev, elo: data.p2.newElo }));
            }
        }
    };
    socket.on("elo_updated", handleEloUpdated);
    return () => socket.off("elo_updated", handleEloUpdated);
  }, [myUserId]);

  // Trigger AI click khi đến lượt bot
  useEffect(() => {
    if (mode === 'ai') {
        setMyRole('player1');

        // Cập nhật thông tin Bot dựa trên độ khó
        const aiPersonas = {
            easy: { name: "Bot Gà Con", elo: 400, rank: "Đồng" },
            medium: { name: "Bot Sói Xám", elo: 1600, rank: "Bạch Kim" },
            hard: { name: "Bot Rồng Lửa", elo: 2800, rank: "Thách Đấu" }
        };
        const persona = aiPersonas[difficulty] || aiPersonas.medium;
        setPlayer2Name(persona.name);
        setPlayer2Stats({ elo: persona.elo, rank: persona.rank });

        if (!isBlackTurn && !isAiThinking && !isGameOver) {
            // Thêm delay 1.2s
            const timer = setTimeout(() => {
                fetchAiMove();
            }, 1200);
            return () => clearTimeout(timer);
        }
    }
  }, [isBlackTurn, mode, isAiThinking, isGameOver, difficulty]);

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
                  confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                  handleGameOver("lose", null, "Bot đã giành chiến thắng!");
                  return;
              }

              // KIỂM TRA HÒA
              if (checkDraw(newBoard)) {
                  handleGameOver("draw", null, "Bàn cờ đã đầy! Trận đấu kết thúc với kết quả Hòa.");
                  return;
              }

              setIsBlackTurn(true); 
          }
      } catch (error) {
          console.error("[AI Error]:", error);
          sonnerToast.error("AI gặp lỗi khi tính toán nước đi.");
          setIsBlackTurn(true); 
      } finally {
          setIsAiThinking(false);
      }
  };

  const resetGame = () => {
    setBoard(Array(15).fill(null).map(() => Array(15).fill(null)));
    setIsBlackTurn(true);
    setMoves([]);
    setIsGameOver(false);
    setWinningLine([]);
    setHintMove(null);
    setIsAiGameStarted(false);
  };

  const handleGameStart = () => {
      setIsAiGameStarted(true);
      setGameStartTime(Date.now());
      sonnerToast.success("Bắt đầu!", { description: "Trận đấu đã bắt đầu, mời bạn đi trước." });
  };

  const handleGameOver = (result, winnerId, message) => {
      const duration = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;
      
      setIsGameOver(true);
      setModalResult(result);
      setModalMessage(message);
      setIsModalOpen(true);

      if (roomId && matchId) {
          socket.emit("game_over", {
              roomId,
              matchId,
              result,
              winnerId,
              duration,
              p1Captures: 0,
              p2Captures: 0
          });
      }
  };

  const handleSquareClick = (row, col) => {
    if (board[row][col]) return; 
    if (isGameOver) return; 

    // CHẶN DI CHUYỂN KHI CHƯA BẮT ĐẦU (Nếu ở chế độ Online)
    if (roomId && !matchId) return;

    // CHẶN DI CHUYỂN KHI CHƯA BẮT ĐẦU (Nếu ở chế độ AI)
    if (mode === 'ai' && !isAiGameStarted) return;

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
    playSfx('move');

    const moveData = { color: isBlackTurn ? 'Black' : 'White', row, col };
    setLastMove(moveData); // Highlight nước vừa đi
    setMoves(prev => [...prev, moveData]);

    // 3. Gửi nước đi lên socket khi đấu online
    if (roomId) {
      socket.emit("make_move", { 
        roomId, 
        matchId, 
        moveData,
        remainingTime: myRole === 'player1' ? player1Time : player2Time
      });
    }

    // KIỂM TRA THẮNG
    if (checkWin(newBoard, row, col, currentColor)) {
        setWinningLine(getWinningLine(newBoard, row, col, currentColor));
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        playSfx('game-over');
        handleGameOver("win", myUserId, "Bạn đã giành chiến thắng!");
        return;
    } 

    // KIỂM TRA HÒA
    if (checkDraw(newBoard)) {
        handleGameOver("draw", null, "Bàn cờ đã đầy! Trận đấu kết thúc với kết quả Hòa.");
        return;
    }
  };

  // ------------------------------------------
  // Xử lý Timeout (Hết giờ) - Đếm lùi
  // ------------------------------------------
  useEffect(() => {
    if ((!matchId && !(mode === 'ai' && isAiGameStarted)) || isGameOver) return;

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
  }, [matchId, isGameOver, isBlackTurn, isAiGameStarted]);

  const handleTimeout = (timeLeftRole) => {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      const amIPlayer1 = myRole === "player1";
      const isLose = (timeLeftRole === "player1" && amIPlayer1) || (timeLeftRole === "player2" && !amIPlayer1);
      handleGameOver(isLose ? "lose" : "win", isLose ? null : myUserId, "Hết thời gian! Bạn đã " + (isLose ? "thua." : "thắng."));
  };

  const handleOfferDraw = () => {
    if (isGameOver) return;
    if (roomId) {
      socket.emit("offer_draw", { roomId });
      sonnerToast.info("Đã gửi lời cầu hòa đến đối thủ.");
    }
  };

  const handleResign = () => {
    if (isGameOver) return;
    
    if (window.confirm("Bạn chắc chắn muốn đầu hàng không?")) {
        if (roomId) {
          const duration = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;
          socket.emit("resign", { 
              roomId, 
              matchId,
              duration,
              p1Captures: 0,
              p2Captures: 0
          });
        } else {
            handleGameOver("resign", null, "Bạn đã đầu hàng!");
        }
    }
  };

  const handleStartGame = async () => {
    if (playerCount >= 2) {
      socket.emit("start_match", { roomId });
    } else if (mode === 'ai') {
      handleGameStart();
    } else {
      try {
        await matchmakingService.joinQueue("caro");
        setIsSearching(true);
        sonnerToast.success("Đang tìm đối thủ...");
      } catch (error) {
        sonnerToast.error(error.response?.data?.message || "Lỗi ghép trận.");
      }
    }
  };

  const handleCancelSearch = async () => {
    try {
      await matchmakingService.cancelQueue();
      setIsSearching(false);
      sonnerToast.success("Đã hủy tìm trận.");
    } catch (error) {
      sonnerToast.error("Lỗi hủy tìm trận.");
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

  const handleRequestUndo = () => {
    if (isGameOver || moves.length === 0) return;
    
    if (mode === 'ai') {
        // Nếu chơi với máy, lùi 2 nước (nếu máy vừa đi) hoặc 1 nước (nếu mình vừa đi)
        handleUndo(); // Lùi nước của máy
        if (isAiThinking) return; // Đang nghĩ thì ko undo được
        handleUndo(); // Lùi nước của mình
        toast.success("Đã lùi lại nước đi.");
    } else if (roomId) {
        socket.emit("request_undo", { roomId });
        toast.info("Đã gửi yêu cầu đi lại.");
    }
  };

  const handleUndo = () => {
    setMoves(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const newMoves = prev.slice(0, -1);
        
        setBoard(currentBoard => {
            const newBoard = currentBoard.map(r => [...r]);
            newBoard[last.row][last.col] = null;
            return newBoard;
        });

        setIsBlackTurn(last.color.toLowerCase() === 'black');
        setLastMove(newMoves.length > 0 ? newMoves[newMoves.length - 1] : null);
        setWinningLine([]);
        return newMoves;
    });
  };

  return (
    <>
      <div className="h-full flex flex-col p-1 sm:p-2">
        <div className="flex-1 flex flex-col gap-2 lg:flex-row min-h-0">
          {/* Board Area */}
          <div className="flex-1 flex flex-col gap-1 min-h-0">
            <div className="shrink-0">
              <PlayerInfoBar 
                name={myRole === 'player1' ? player2Name : player1Name} 
                rating={myRole === 'player1' ? player2Stats.elo : player1Stats.elo} 
                rank={myRole === 'player1' ? player2Stats.rank : player1Stats.rank}
                timer={myRole === 'player1' ? formatTime(player2Time) : formatTime(player1Time)} 
              />
            </div>

            <div className="flex-1 min-h-0 relative">
              <GameBoard 
                gameType="caro" 
                boardState={board} 
                lastMove={lastMove} 
                onSquareClick={handleSquareClick} 
                winningLine={winningLine}
                hintMove={hintMove}
                theme={themeConfig}
                skin={pieceSkin}
                myRole={myRole}
              />
              {isGameOver && (
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 z-20 pointer-events-none px-4 sm:px-12 animate-in fade-in zoom-in-95 duration-500">
                  <div className="overflow-hidden rounded-xl border border-white/20 bg-black/60 backdrop-blur-md shadow-2xl">
                    <div className="flex items-center justify-center py-3 px-4 gap-4 relative">
                      <div className="flex items-center gap-1.5 opacity-40">
                        {[1,2,3].map(i => <div key={i} className="w-1 h-8 bg-white rounded-full" />)}
                      </div>
                      <div className="text-center relative z-10">
                        <h2 className="text-lg font-black text-white uppercase tracking-[0.2em] leading-none mb-1 drop-shadow-md">Kết thúc</h2>
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]" />
                          <p className="text-[10px] text-white/90 font-bold uppercase tracking-widest drop-shadow-sm">Trận đấu đã kết thúc.</p>
                          <div className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-40">
                        {[1,2,3].map(i => <div key={i} className="w-1 h-8 bg-white rounded-full" />)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0">
              <PlayerInfoBar 
                name={myRole === 'player1' ? player1Name : player2Name} 
                rating={myRole === 'player1' ? player1Stats.elo : player2Stats.elo} 
                rank={myRole === 'player1' ? player1Stats.rank : player2Stats.rank}
                timer={myRole === 'player1' ? formatTime(player1Time) : formatTime(player2Time)} 
              />
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-full lg:w-80 min-h-0">
            <UnifiedSidePanel 
              gameType="caro"
              history={moves}
              movePairs={movePairs}
              currentTurnUserId={currentTurnUserId}
              myUserId={myUserId}
              myRole={myRole}
              isGameOver={isGameOver}
              matchId={matchId}
              roomId={roomId}
              code={code}
              onResign={handleResign}
              onOfferDraw={handleOfferDraw}
              onReset={resetGame}
              onGetHint={() => {}}
              isHintLoading={isHintLoading}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              mode={mode}
              matchTimeLimit={matchTimeLimit}
              setMatchTimeLimit={setMatchTimeLimit}
              setPlayer1Time={setPlayer1Time}
              setPlayer2Time={setPlayer2Time}
              chatHistory={chatHistory}
              onStartGame={handleStartGame}
              isGameStarted={mode === 'ai' ? isAiGameStarted : !!matchId}
              playerCount={playerCount}
              // Giao diện & Âm thanh
              boardTheme={boardTheme}
              setBoardTheme={setBoardTheme}
              isMusicEnabled={isMusicEnabled}
              setIsMusicEnabled={setIsMusicEnabled}
              isSfxEnabled={isSfxEnabled}
              setIsSfxEnabled={setIsSfxEnabled}
              pieceColor={pieceColor}
              setPieceColor={setPieceColor}
              playSfx={playSfx}
            />
            {/* Modal kết thúc trận đấu */}
            <GameOverModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                result={modalResult}
                message={modalMessage}
                winnerName={modalResult === "win" ? player1Name : (modalResult === "lose" ? player2Name : null)}
                eloChange={eloResult?.eloChange}
                newElo={eloResult?.newElo}
                duration={gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0}
                onExit={() => navigate('/dashboard')}
            />
          </div>
        </div>
      </div>

      {/* Matchmaking Overlay */}
      {isSearching && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card p-8 rounded-2xl border border-border shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 space-y-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              <Loader2 className="h-16 w-16 text-primary animate-spin relative" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-amber-500 uppercase">Đang tìm đối thủ</h2>
              <p className="text-muted-foreground text-sm">Vui lòng đợi trong giây lát...</p>
            </div>

            <div className="bg-muted px-4 py-2 rounded-full font-mono text-lg font-bold text-primary">
              {Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, '0')}
            </div>

            <Button 
              variant="destructive" 
              className="w-full py-6 font-bold uppercase tracking-widest gap-2"
              onClick={handleCancelSearch}
            >
              <X className="h-4 w-4" />
              Hủy tìm trận
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default CaroGame;
