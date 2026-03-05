import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerInfoBar } from "@/components/PlayerInfoBar";
import { GameBoard } from "@/components/GameBoard";
import { INITIAL_CHESS_BOARD, getValidMoves, getPieceColor, isCheck, isCheckmate } from "@/utils/chessLogic";
import { useToast } from "@/components/ui/use-toast";

const ChessGame = () => {
  const { toast } = useToast();
  const [board, setBoard] = useState(INITIAL_CHESS_BOARD);
  const [turn, setTurn] = useState('white');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [history, setHistory] = useState([]);
  const [isGameOver, setIsGameOver] = useState(false);

  const handleSquareClick = (row, col) => {
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

  const executeMove = (fromRow, fromCol, toRow, toCol) => {
    const newBoard = board.map(r => [...r]);
    const piece = board[fromRow][fromCol];
    const moveInfo = validMoves.find(m => m.row === toRow && m.col === toCol);

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
      toast({ title: "Game Over", description: `Checkmate! ${turn === 'white' ? 'White' : 'Black'} wins!` });
    } else if (isCheck(newBoard, nextTurn)) {
      toast({ title: "Check!", description: `${nextTurn === 'white' ? 'White' : 'Black'} is in check.` });
    }

    setBoard(newBoard);
    setHistory(newHistory);
    setTurn(nextTurn);
    setSelectedSquare(null);
    setValidMoves([]);
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
              <PlayerInfoBar name="DragonKnight" rating={2290} timer="09:42" />
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
                onSquareClick={handleSquareClick}
              />
            </div>
            <div className="shrink-0">
              <PlayerInfoBar name="GrandMaster99" rating={2030} timer="10:00" />
            </div>
          </div>

          <div className="w-full lg:w-64 space-y-4">
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
              <Button variant="outline" size="sm" className="w-full">Offer Draw</Button>
              <Button variant="destructive" size="sm" className="w-full">Resign</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChessGame;

