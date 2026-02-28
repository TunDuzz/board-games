import { useState } from "react";
import { Chess } from "chess.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import { PlayerInfoBar } from "@/components/PlayerInfoBar";
import { GameBoard } from "@/components/GameBoard";

const fenToBoardState = (fen) => {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  const pieces = fen.split(' ')[0];
  const rows = pieces.split('/');

  const pieceMap = {
    'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
    'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
  };

  const colorMap = {
    'p': 'black', 'r': 'black', 'n': 'black', 'b': 'black', 'q': 'black', 'k': 'black',
    'P': 'white', 'R': 'white', 'N': 'white', 'B': 'white', 'Q': 'white', 'K': 'white'
  };

  for (let r = 0; r < 8; r++) {
    let c = 0;
    for (let char of rows[r]) {
      if (!isNaN(char)) {
        c += parseInt(char);
      } else {
        board[r][c] = {
          color: colorMap[char],
          label: pieceMap[char],
          type: char.toLowerCase()
        };
        c++;
      }
    }
  }
  return board;
};

const rowColToNotation = (row, col) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  return `${files[col]}${8 - row}`;
};

const notationToRowCol = (notation) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const col = files.indexOf(notation[0]);
  const row = 8 - parseInt(notation[1]);
  return { row, col };
};

const ChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);

  const handleSquareClick = (row, col) => {
    const notation = rowColToNotation(row, col);

    // Nếu đã chọn một ô trước đó
    if (selectedSquare) {
      const moveResult = tryMove(row, col);
      if (moveResult) {
        // Di chuyển thành công
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }
    }

    // Chọn quân mới hoặc đổi quân chọn
    const piece = game.get(notation);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare({ row, col });
      const moves = game.moves({ square: notation, verbose: true });
      setValidMoves(moves.map(m => notationToRowCol(m.to)));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const tryMove = (row, col) => {
    const from = rowColToNotation(selectedSquare.row, selectedSquare.col);
    const to = rowColToNotation(row, col);

    try {
      const move = game.move({ from, to, promotion: 'q' });
      if (move) {
        setGame(new Chess(game.fen())); // Trigger re-render
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  };

  const resetGame = () => {
    setGame(new Chess());
    setSelectedSquare(null);
    setValidMoves([]);
  };

  const history = game.history({ verbose: true });
  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: history[i].san,
      black: history[i + 1] ? history[i + 1].san : ""
    });
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Board Area */}
          <div className="flex-1 space-y-3">
            <PlayerInfoBar name="DragonKnight" rating={2290} timer="09:42" />

            <div className="w-full flex justify-center">
              <GameBoard
                gameType="chess"
                boardState={fenToBoardState(game.fen())}
                selectedSquare={selectedSquare}
                validMoves={validMoves}
                onSquareClick={handleSquareClick}
              />
            </div>

            <PlayerInfoBar name="GrandMaster99" rating={2030} timer="10:00" />
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

export default ChessGame;
