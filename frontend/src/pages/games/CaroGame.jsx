import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerInfoBar } from "@/components/PlayerInfoBar";
import { GameBoard } from "@/components/GameBoard";

const CaroGame = () => {
  const [board, setBoard] = useState(Array(15).fill(null).map(() => Array(15).fill(null)));
  const [isBlackTurn, setIsBlackTurn] = useState(true);
  const [moves, setMoves] = useState([]);

  const handleSquareClick = (row, col) => {
    if (board[row][col]) return; // Already occupied

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = { color: isBlackTurn ? 'black' : 'white' };
    setBoard(newBoard);
    setIsBlackTurn(!isBlackTurn);
    setMoves([...moves, { color: isBlackTurn ? 'Black' : 'White', row, col }]);
  };

  const resetGame = () => {
    setBoard(Array(15).fill(null).map(() => Array(15).fill(null)));
    setIsBlackTurn(true);
    setMoves([]);
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
              <PlayerInfoBar name="Black Shadow" rating={1800} timer="10:00" />
            </div>

            <div className="flex-1 min-h-0 relative">
              <GameBoard gameType="caro" boardState={board} onSquareClick={handleSquareClick} />
            </div>

            <div className="shrink-0">
              <PlayerInfoBar name="White Lotus" rating={1750} timer="10:00" />
            </div>
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
              <Button variant="outline" size="sm" className="w-full">Offer Draw</Button>
              <Button variant="destructive" size="sm" className="w-full">Resign</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CaroGame;
