import { toast as sonnerToast } from "sonner";
import React, { useState, useEffect } from "react"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerInfoBar } from "@/components/PlayerInfoBar";
import { GameBoard } from "@/components/GameBoard";
import { INITIAL_CHESS_BOARD, getValidMoves, getPieceColor, isCheck, isCheckmate } from "@/utils/chessLogic";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams, useNavigate } from "react-router-dom";
import { GameRoomPanel } from "@/components/GameRoomPanel";
import ChatBox from "@/components/ChatBox";
import { socket } from "@/lib/socket"; 
import { aiService } from "@/services/ai.service";
import { Loader2, Zap, Handshake, Play, X, RotateCcw } from "lucide-react";
import { GameOverModal } from "@/components/GameOverModal";
import { authService } from "@/services/auth.service";
import UnifiedSidePanel from "@/components/games/UnifiedSidePanel";
import { matchmakingService } from "@/services/matchmaking.service";
import { useGameTheme } from "@/hooks/useGameTheme.jsx";
import confetti from "canvas-confetti";

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
  const turnRef = React.useRef(turn);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [history, setHistory] = useState([]);
  const historyRef = React.useRef(history);

  const { boardTheme, pieceSkin, themeConfig } = useGameTheme();
  const [isGameOver, setIsGameOver] = useState(false);

  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('roomId');
  const code = searchParams.get('code');
  const mode = searchParams.get('mode');

  const [myRole, setMyRole] = useState(null); 
  const [isAiThinking, setIsAiThinking] = useState(false);
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
  const [player1Time, setPlayer1Time] = useState(1800); 
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
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  // Giao diện & Âm thanh 
  const [isMusicEnabled, setIsMusicEnabled] = useState(() => localStorage.getItem('isMusicEnabled') === 'true');
  const [isSfxEnabled, setIsSfxEnabled] = useState(() => localStorage.getItem('isSfxEnabled') !== 'false');
  const [pieceColor, setPieceColor] = useState(() => localStorage.getItem('pieceColor') || 'auto');

  const [bgMusic] = useState(() => new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'));
  const [gameStartTime, setGameStartTime] = useState(null);
  const [whiteCaptures, setWhiteCaptures] = useState(0);
  const [blackCaptures, setBlackCaptures] = useState(0);
  const [eloResult, setEloResult] = useState(null);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    bgMusic.loop = true;
    bgMusic.volume = 0.2;
    if (isMusicEnabled) {
      bgMusic.play().catch(e => {});
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
    capture: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/Capture.mp3',
    check: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/Check.mp3',
    'game-over': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/GenericNotify.mp3'
  };

  const playSfx = (type) => {
    if (!isSfxEnabled) return;
    const url = SOUND_ASSETS[type] || `/${type}.mp3`;
    const sfx = new Audio(url);
    sfx.volume = 0.6;
    sfx.play().catch(e => {});
  };

  // Socket ELO updated
  useEffect(() => {
    const handleEloUpdated = (data) => {
        setEloResult(data);
        if (myRole === 'player1') {
            setPlayer1Stats(prev => ({ ...prev, elo: data.newElo, rank: data.newRank }));
        } else {
            setPlayer2Stats(prev => ({ ...prev, elo: data.newElo, rank: data.newRank }));
        }
    };

    socket.on("elo_updated", handleEloUpdated);
    return () => socket.off("elo_updated", handleEloUpdated);
  }, [myRole]);

  // Main Socket Connection
  useEffect(() => {
    if (roomId) {
      socket.connect();
      socket.emit("join_game_room", { roomId });

      socket.on("game_room_joined", ({ role, players, match, chatHistory }) => {
        setMyRole(role);
        sonnerToast.success(`Bạn là ${role === "player1" ? "Trắng (White)" : "Đen (Black)"}`);

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

        if (chatHistory) setChatHistory(chatHistory);

        if (match) {
            setMatchId(match.match_id);
            if (match.currentTurn) setCurrentTurnUserId(match.currentTurn);

            if (match.moves && match.moves.length > 0) {
                let currentBoard = INITIAL_CHESS_BOARD.map(r => [...r]);
                let currentHistory = [];
                
                match.moves.forEach(m => {
                    const moveData = typeof m.move_data === "string" ? JSON.parse(m.move_data) : m.move_data;
                    if (moveData && moveData.from && moveData.to) {
                        const { from, to } = moveData;
                        const piece = currentBoard[from.row][from.col];

                        if (piece) {
                            let pieceToPlace = piece;
                            if (piece.toLowerCase() === 'p' && (to.row === 0 || to.row === 7)) {
                                pieceToPlace = piece === 'P' ? 'Q' : 'q';
                            }

                            if (piece.toLowerCase() === 'k' && Math.abs(to.col - from.col) === 2) {
                                const backRank = to.row;
                                if (to.col === 6) { 
                                    currentBoard[backRank][5] = currentBoard[backRank][7];
                                    currentBoard[backRank][7] = null;
                                } else if (to.col === 2) { 
                                    currentBoard[backRank][3] = currentBoard[backRank][0];
                                    currentBoard[backRank][0] = null;
                                }
                            }

                            if (piece.toLowerCase() === 'p' && from.col !== to.col && !currentBoard[to.row][to.col]) {
                                currentBoard[from.row][to.col] = null;
                            }

                            currentBoard[to.row][to.col] = pieceToPlace;
                            currentBoard[from.row][from.col] = null;

                            currentHistory.push({
                                piece, from, to,
                                san: getNotation(piece, from.row, from.col, to.row, to.col)
                            });
                        }
                    }
                });
                
                setBoard(currentBoard);
                setHistory(currentHistory);
                if (currentHistory.length > 0) setLastMove(currentHistory[currentHistory.length - 1]);
                setTurn(currentHistory.length % 2 === 0 ? 'white' : 'black');
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

      socket.on("match_started", ({ match_id, firstTurn, players }) => {
        setMatchId(match_id);
        setCurrentTurnUserId(firstTurn);
        sonnerToast.success("Trận đấu bắt đầu! Lượt: " + (firstTurn === myUserId ? "Của bạn" : "Đối thủ"));

        if (players) {
            setPlayer1Name(players.player1.username);
            setPlayer2Name(players.player2.username);
        }
      });

      socket.on("turn_changed", ({ currentTurn, player1Time, player2Time }) => {
        setCurrentTurnUserId(currentTurn);
        if (player1Time !== undefined) setPlayer1Time(player1Time);
        if (player2Time !== undefined) setPlayer2Time(player2Time);
      });

      socket.on("receive_move", ({ moveData }) => {
        if (moveData && moveData.from && moveData.to) {
            setLastMove(moveData);
            executeMove(moveData.from.row, moveData.from.col, moveData.to.row, moveData.to.col, false, true); 
        }
      });

      socket.on("receive_draw_offer", ({ username }) => {
          sonnerToast(`Đối thủ [${username}] cầu hòa. Bạn có đồng ý không?`, {
              duration: 10000,
              action: {
                  label: "Đồng ý",
                  onClick: () => {
                      const duration = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;
                      socket.emit("accept_draw", { 
                          roomId, matchId, duration,
                          p1Captures: whiteCaptures, p2Captures: blackCaptures
                      });
                  }
              },
              cancel: {
                  label: "Từ chối",
                  onClick: () => socket.emit("reject_draw", { roomId })
              }
          });
      });

      socket.on("receive_time_limit", ({ minutes }) => {
          setMatchTimeLimit(minutes);
          setPlayer1Time(minutes * 60);
          setPlayer2Time(minutes * 60);
          sonnerToast.info(`Thời gian trận đấu: ${minutes} phút`);
      });

      socket.on("receive_game_over", ({ result, winnerId, message }) => {
          confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
          const isWin = winnerId === myUserId;
          const modalStatus = result === "draw" ? "draw" : (result === "resign" ? (isWin ? "win" : "resign") : (isWin ? "win" : "lose"));
          
          setIsGameOver(true);
          setModalResult(modalStatus);
          setModalMessage(message);
          setIsModalOpen(true);
          playSfx('game-over');
      });

      socket.on("undo_executed", ({ currentTurn }) => {
          handleUndo();
          setCurrentTurnUserId(currentTurn);
          sonnerToast.success("Nước đi đã được thu hồi.");
      });

      socket.on("undo_rejected", ({ message }) => {
          sonnerToast.error(message);
      });

      return () => {
        socket.off("game_room_joined");
        socket.off("player_joined");
        socket.off("player_left");
        socket.off("match_started");
        socket.off("turn_changed");
        socket.off("receive_move");
        socket.off("receive_draw_offer");
        socket.off("receive_time_limit");
        socket.off("receive_game_over");
        socket.off("undo_executed");
        socket.off("undo_rejected");
        socket.disconnect();
      };
    }
  }, [roomId, myUserId, matchId]);

  // Matchmaking poll
  useEffect(() => {
    let interval, timerInterval;
    if (isSearching) {
      setSearchTime(0);
      timerInterval = setInterval(() => setSearchTime(prev => prev + 1), 1000);
      interval = setInterval(async () => {
        try {
          const data = await matchmakingService.checkStatus();
          if (data.matched) {
            clearInterval(interval); clearInterval(timerInterval);
            setIsSearching(false);
            sonnerToast.success("Đã tìm thấy đối thủ!");
            if (data.room?.room_id) navigate(`/game/chess?roomId=${data.room.room_id}&code=${data.room.room_code}`);
          }
        } catch (error) {
          clearInterval(interval); clearInterval(timerInterval);
          setIsSearching(false);
        }
      }, 3000);
    }
    return () => { clearInterval(interval); clearInterval(timerInterval); };
  }, [isSearching, navigate]);

  // AI Trigger
  useEffect(() => {
    if (mode === 'ai' && turn === 'black' && !isAiThinking && !isGameOver) {
        const timer = setTimeout(() => fetchAiMove(), 1200);
        return () => clearTimeout(timer);
    }
  }, [turn, mode, isGameOver]);

  const fetchAiMove = async () => {
      setIsAiThinking(true);
      setHintMove(null);
      try {
          const data = await aiService.makeMove("chess", board, [], "player2", difficulty);
          if (data.move?.from && data.move?.to) {
              executeMove(data.move.from.row, data.move.from.col, data.move.to.row, data.move.to.col, false);
          }
      } catch (error) {
          setTurn('white');
      } finally {
          setIsAiThinking(false);
      }
  };

  const handleSquareClick = (row, col) => {
    if (isGameOver) return;
    if (roomId && !matchId) return;
    if (mode === 'ai' && !isAiGameStarted) return;
    if (mode === 'ai' && turn === 'black') return;
    if (isAiThinking) return;
    if (roomId && currentTurnUserId && currentTurnUserId !== myUserId) return;

    if (selectedSquare) {
      if (validMoves.some(m => m.row === row && m.col === col)) {
        executeMove(selectedSquare.row, selectedSquare.col, row, col);
        return;
      }
    }

    const piece = board[row][col];
    if (piece && getPieceColor(piece) === turn) {
      setSelectedSquare({ row, col });
      setValidMoves(getValidMoves(board, row, col, history));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const executeMove = (fromRow, fromCol, toRow, toCol, shouldEmit = true, isForce = false) => {
    const currentBoard = boardRef.current;
    const currentHistory = historyRef.current;
    const currentTurn = turnRef.current;
    
    if (!gameStartTime) setGameStartTime(Date.now());

    const capturedPiece = currentBoard[toRow][toCol];
    if (capturedPiece) {
        if (currentTurn === 'white') setWhiteCaptures(prev => prev + 1);
        else setBlackCaptures(prev => prev + 1);
    }

    const newBoard = currentBoard.map(row => [...row]);
    const piece = newBoard[fromRow][fromCol];
    if (!piece) return;

    let moveInfo = null;
    if (!isForce) {
        const movesOnSquare = getValidMoves(currentBoard, fromRow, fromCol, currentHistory);
        moveInfo = movesOnSquare.find(m => m.row === toRow && m.col === toCol);
        if (!moveInfo) return; 
    } else {
        moveInfo = {
            row: toRow, col: toCol,
            isCastling: (piece.toLowerCase() === 'k' && Math.abs(toCol - fromCol) === 2) ? (toCol === 6 ? 'king' : 'queen') : null,
            isEnPassant: (piece.toLowerCase() === 'p' && fromCol !== toCol && !currentBoard[toRow][toCol])
        };
    }

    setLastMove({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } });
    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = null;

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

    if (moveInfo.isEnPassant) newBoard[fromRow][toCol] = null;

    if (currentBoard[toRow][toCol]) playSfx('capture'); else playSfx('move');

    if (piece.toLowerCase() === 'p' && (toRow === 0 || toRow === 7)) {
      newBoard[toRow][toCol] = piece === 'P' ? 'Q' : 'q';
    }

    const nextTurn = currentTurn === 'white' ? 'black' : 'white';
    const newHistory = [...currentHistory, {
      piece, from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol },
      captured: capturedPiece, isCastling: moveInfo.isCastling, isEnPassant: moveInfo.isEnPassant,
      san: getNotation(piece, fromRow, fromCol, toRow, toCol)
    }];

    if (isCheckmate(newBoard, nextTurn, newHistory)) {
        playSfx('game-over');
        handleGameOver("win", myUserId, `Chiếu bí! ${currentTurn === 'white' ? 'Trắng' : 'Đen'} giành chiến thắng!`);
    } else if (isCheck(newBoard, nextTurn)) {
        sonnerToast.warning(`Chiếu tướng! ${nextTurn === 'white' ? 'Trắng' : 'Đen'} đang bị chiếu.`);
    }

    if (shouldEmit && roomId) {
        socket.emit("make_move", { 
           roomId, matchId,
           moveData: { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } },
           remainingTime: myRole === 'player1' ? player1Time : player2Time
        });
    }

    setBoard(newBoard); setHistory(newHistory); setTurn(nextTurn);
    setSelectedSquare(null); setValidMoves([]); setHintMove(null);
  };

  useEffect(() => {
    if ((!matchId && !(mode === 'ai' && isAiGameStarted)) || isGameOver) return;
    const interval = setInterval(() => {
      if (turn === 'white') setPlayer1Time(prev => { if (prev <= 1) { handleTimeout("player1"); return 0; } return prev - 1; });
      else setPlayer2Time(prev => { if (prev <= 1) { handleTimeout("player2"); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [matchId, isGameOver, turn]);

  const handleTimeout = (timeLeftRole) => {
      const amIPlayer1 = myRole === "player1";
      const isLose = (timeLeftRole === "player1" && amIPlayer1) || (timeLeftRole === "player2" && !amIPlayer1);
      handleGameOver(isLose ? "lose" : "win", isLose ? (myRole === 'player1' ? 'player2' : 'player1') : myUserId, "Hết thời gian! Bạn đã " + (isLose ? "thua." : "thắng."));
  };

  const handleGameOver = (result, winnerId, message) => {
      const duration = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;
      setIsGameOver(true); setModalResult(result); setModalMessage(message); setIsModalOpen(true);
      if (roomId && matchId) {
          socket.emit("game_over", { roomId, matchId, result, winnerId, duration, p1Captures: whiteCaptures, p2Captures: blackCaptures });
      }
      playSfx('game-over');
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
  };

  const getNotation = (piece, fromRow, fromCol, toRow, toCol) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const p = piece.toLowerCase() === 'p' ? '' : piece.toUpperCase();
    return `${p}${files[toCol]}${8 - toRow}`;
  };

  const resetGame = () => {
    setBoard(INITIAL_CHESS_BOARD); setTurn('white'); setHistory([]);
    setSelectedSquare(null); setValidMoves([]); setIsGameOver(false);
    setLastMove(null); setHintMove(null); setWhiteCaptures(0); setBlackCaptures(0); setGameStartTime(null);
  };

  const handleGetHint = async () => {
    if (isGameOver || isHintLoading || (mode === 'ai' && turn === 'black')) return;
    setIsHintLoading(true);
    try {
      const botRole = turn === 'white' ? "player1" : "player2";
      const data = await aiService.makeMove("chess", board, [], botRole, "hard");
      setHintMove(data.move);
      sonnerToast.success("AI gợi ý nước đi cho bạn!");
    } catch (error) {
      sonnerToast.error("Không thể lấy gợi ý.");
    } finally { setIsHintLoading(false); }
  };

  const handleOfferDraw = () => {
    if (!isGameOver && roomId) {
      socket.emit("offer_draw", { roomId });
      sonnerToast.info("Đã gửi lời cầu hòa đến đối thủ.");
    }
  };

  const handleResign = () => {
    if (!isGameOver && window.confirm("Bạn chắc chắn muốn đầu hàng không?")) {
        if (roomId) {
          const duration = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;
          socket.emit("resign", { roomId, matchId, duration, p1Captures: whiteCaptures, p2Captures: blackCaptures });
        } else {
            handleGameOver("resign", null, "Bạn đã đầu hàng!");
        }
    }
  };

  const handleRequestUndo = () => {
    if (isGameOver || history.length === 0) return;
    if (mode === 'ai') { handleUndo(); if (!isAiThinking) handleUndo(); sonnerToast.success("Đã lùi lại nước đi."); }
    else if (roomId) { socket.emit("request_undo", { roomId }); sonnerToast.info("Đã gửi yêu cầu đi lại."); }
  };

  const handleUndo = () => {
    setHistory(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1]; const newHistory = prev.slice(0, -1);
        setBoard(currentBoard => {
            const newBoard = currentBoard.map(r => [...r]);
            newBoard[last.from.row][last.from.col] = last.piece;
            newBoard[last.to.row][last.to.col] = last.captured || null;
            if (last.isCastling) {
                const br = last.to.row;
                if (last.isCastling === 'king') { newBoard[br][7] = newBoard[br][5]; newBoard[br][5] = null; }
                else { newBoard[br][0] = newBoard[br][3]; newBoard[br][3] = null; }
            }
            if (last.isEnPassant) newBoard[last.from.row][last.to.col] = (last.piece.toLowerCase() === 'p' ? 'P' : 'p');
            return newBoard;
        });
        setTurn(getPieceColor(last.piece)); setLastMove(newHistory.length > 0 ? newHistory[newHistory.length-1] : null);
        return newHistory;
    });
  };

  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({ num: Math.floor(i / 2) + 1, white: history[i].san, black: history[i + 1] ? history[i + 1].san : "" });
  }

  const handleStartGame = async () => {
    if (playerCount >= 2) { socket.emit("start_match", { roomId }); }
    else if (mode === 'ai') { setIsAiGameStarted(true); setGameStartTime(Date.now()); sonnerToast.success("Trận đấu bắt đầu!"); }
    else {
      try {
        await matchmakingService.joinQueue("chess"); setIsSearching(true); sonnerToast.success("Đang tìm đối thủ...");
      } catch (error) { sonnerToast.error("Lỗi ghép trận."); }
    }
  };

  const handleCancelSearch = async () => {
    try { await matchmakingService.cancelQueue(); setIsSearching(false); sonnerToast.success("Đã hủy tìm trận."); }
    catch (error) { sonnerToast.error("Lỗi hủy tìm trận."); }
  };

  return (
    <>
      <div className="h-full flex flex-col p-1 sm:p-2">
        <div className="flex-1 flex flex-col gap-2 lg:flex-row min-h-0">
          <div className="flex-1 flex flex-col gap-1 min-h-0">
            <PlayerInfoBar 
                name={myRole === 'player1' ? player2Name : player1Name} 
                rating={myRole === 'player1' ? player2Stats.elo : player1Stats.elo} 
                rank={myRole === 'player1' ? player2Stats.rank : player1Stats.rank}
                timer={myRole === 'player1' ? formatTime(player2Time) : formatTime(player1Time)} 
            />
            <div className="flex-1 min-h-0 relative">
              <GameBoard
                gameType="chess"
                boardState={board.map(r => r.map(p => p ? { type: p.toLowerCase(), color: getPieceColor(p), label: p } : null))}
                selectedSquare={selectedSquare}
                validMoves={validMoves}
                lastMove={lastMove}
                hintMove={hintMove}
                flipped={myRole === 'player2'}
                onSquareClick={handleSquareClick}
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
            <PlayerInfoBar 
                name={myRole === 'player1' ? player1Name : player2Name} 
                rating={myRole === 'player1' ? player1Stats.elo : player2Stats.elo} 
                rank={myRole === 'player1' ? player1Stats.rank : player2Stats.rank}
                timer={myRole === 'player1' ? formatTime(player1Time) : formatTime(player2Time)} 
            />
          </div>

          <div className="w-full lg:w-80 min-h-0">
            <UnifiedSidePanel 
              gameType="chess" history={history} movePairs={movePairs}
              currentTurnUserId={currentTurnUserId} myUserId={myUserId} myRole={myRole}
              isGameOver={isGameOver} matchId={matchId} roomId={roomId} code={code}
              onResign={handleResign} onOfferDraw={handleOfferDraw} onReset={resetGame}
              onGetHint={handleGetHint} isHintLoading={isHintLoading} difficulty={difficulty} setDifficulty={setDifficulty}
              mode={mode} matchTimeLimit={matchTimeLimit} setMatchTimeLimit={setMatchTimeLimit}
              setPlayer1Time={setPlayer1Time} setPlayer2Time={setPlayer2Time} chatHistory={chatHistory}
              onStartGame={handleStartGame} isGameStarted={mode === 'ai' ? isAiGameStarted : !!matchId}
              playerCount={playerCount} isMusicEnabled={isMusicEnabled} setIsMusicEnabled={setIsMusicEnabled}
              isSfxEnabled={isSfxEnabled} setIsSfxEnabled={setIsSfxEnabled} pieceColor={pieceColor} setPieceColor={setPieceColor} playSfx={playSfx}
            />
          </div>
        </div>
      </div>
      <GameOverModal 
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} 
        result={modalResult} winnerName={modalResult === "win" ? player1Name : (modalResult === "lose" ? player2Name : null)} message={modalMessage}
        eloChange={eloResult?.eloChange} newElo={eloResult?.newElo}
        captures={myRole === 'player1' ? whiteCaptures : blackCaptures}
        duration={gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0}
        onExit={() => navigate('/dashboard')}
      />

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
            <Button variant="destructive" className="w-full py-6 font-bold uppercase tracking-widest gap-2" onClick={handleCancelSearch}>
              <X className="h-4 w-4" /> Hủy tìm trận
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChessGame;
