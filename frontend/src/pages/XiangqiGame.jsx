import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import { PlayerInfoBar } from "@/components/PlayerInfoBar";
import { GameBoard } from "@/components/GameBoard";

import { getValidMoves } from "@/utils/xiangqiLogic";

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
  const [board, setBoard] = useState(initialXiangqiBoard());
  const [turn, setTurn] = useState('red');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [history, setHistory] = useState([]);

  const handleSquareClick = (row, col) => {
    // Nếu đang chọn một quân, thử di chuyển
    if (selectedSquare) {
      const isMoveValid = validMoves.some(m => m.row === row && m.col === col);
      if (isMoveValid) {
        executeMove(selectedSquare.row, selectedSquare.col, row, col);
        return;
      }
    }

    // Chọn quân mới (phải đúng lượt)
    const piece = board[row][col];
    if (piece && piece.color === turn) {
      setSelectedSquare({ row, col });
      setValidMoves(getValidMoves(board, row, col));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const executeMove = (fromRow, fromCol, toRow, toCol) => {
    const newBoard = board.map(r => [...r]);
    const piece = newBoard[fromRow][fromCol];
    const targetPiece = newBoard[toRow][toCol];

    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = null;

    setBoard(newBoard);
    setTurn(turn === 'red' ? 'black' : 'red');
    setSelectedSquare(null);
    setValidMoves([]);

    // Add to history
    const moveStr = `${piece.label} (${fromCol},${fromRow}) -> (${toCol},${toRow})`;
    setHistory(prev => [...prev, { color: turn, desc: moveStr }]);
  };

  const resetGame = () => {
    setBoard(initialXiangqiBoard());
    setTurn('red');
    setSelectedSquare(null);
    setValidMoves([]);
    setHistory([]);
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
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Board Area */}
          <div className="flex-1 space-y-3">
            <PlayerInfoBar name="Black Tiger" rating={1950} timer="15:00" />

            <div className="w-full flex justify-center">
              <GameBoard
                gameType="xiangqi"
                boardState={board}
                selectedSquare={selectedSquare}
                validMoves={validMoves}
                onSquareClick={handleSquareClick}
              />
            </div>

            <PlayerInfoBar name="Red Dragon" rating={2100} timer="15:00" />
          </div>

          {/* Side Panel */}
          <div className="w-full lg:w-64 space-y-4">
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
              <Button variant="outline" size="sm" className="w-full">Offer Draw</Button>
              <Button variant="destructive" size="sm" className="w-full">Resign</Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default XiangqiGame;
