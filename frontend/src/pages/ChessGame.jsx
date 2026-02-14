import { useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import { PlayerInfoBar } from "@/components/PlayerInfoBar";

const ChessGame = () => {
  const [game, setGame] = useState(new Chess());

  function makeAMove(move) {
    const gameCopy = new Chess(game.fen());
    try {
      const result = gameCopy.move(move);
      setGame(gameCopy);
      return result; // null if the move was illegal, the move object if the move was legal
    } catch (e) {
      return null;
    }
  }

  function onDrop(sourceSquare, targetSquare) {
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q", // always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return false;
    return true;
  }

  const resetGame = () => {
    setGame(new Chess());
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Board Area */}
          <div className="flex-1 space-y-3">
            <PlayerInfoBar name="DragonKnight" rating={2290} timer="09:42" />

            <div className="aspect-square w-full max-w-[560px] mx-auto">
              <div className="h-full w-full rounded-lg overflow-hidden border bg-background shadow-md">
                <Chessboard position={game.fen()} onPieceDrop={onDrop} boardWidth={560} />
              </div>
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
                      {/* Placeholder for history - can be implemented later based on game.history() */}
                      <tr className="border-b last:border-0">
                        <td className="px-4 py-1.5 text-muted-foreground" colSpan={3}>Start playing...</td>
                      </tr>
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
