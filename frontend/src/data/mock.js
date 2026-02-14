// Mock data for Grandmaster Hybrid UI prototype

export const currentUser = {
  id: "u1",
  name: "GrandMaster99",
  avatar: "",
  rank: "Platinum",
  stats: {
    totalGames: 247,
    winRate: 64,
    currentRank: 12,
  },
  gameStats: {
    chess: { played: 102, wins: 68, losses: 34 },
    xiangqi: { played: 85, wins: 52, losses: 33 },
    gomoku: { played: 60, wins: 41, losses: 19 },
  },
};

export const recentMatches = [
  { id: "m1", gameType: "chess", opponent: "DragonKnight", result: "win", date: "2026-02-10", ratingChange: 12 },
  { id: "m2", gameType: "gomoku", opponent: "StoneWall", result: "loss", date: "2026-02-09", ratingChange: -8 },
  { id: "m3", gameType: "xiangqi", opponent: "RedGeneral", result: "win", date: "2026-02-09", ratingChange: 15 },
  { id: "m4", gameType: "chess", opponent: "KnightRider", result: "draw", date: "2026-02-08", ratingChange: 0 },
  { id: "m5", gameType: "gomoku", opponent: "FiveInRow", result: "win", date: "2026-02-07", ratingChange: 10 },
  { id: "m6", gameType: "xiangqi", opponent: "JadeCanon", result: "loss", date: "2026-02-06", ratingChange: -11 },
  { id: "m7", gameType: "chess", opponent: "BishopKing", result: "win", date: "2026-02-05", ratingChange: 9 },
  { id: "m8", gameType: "gomoku", opponent: "BlackStone", result: "win", date: "2026-02-04", ratingChange: 14 },
  { id: "m9", gameType: "xiangqi", opponent: "ElephantEye", result: "win", date: "2026-02-03", ratingChange: 7 },
  { id: "m10", gameType: "chess", opponent: "QueenGambit", result: "loss", date: "2026-02-02", ratingChange: -13 },
];

export const rankings = {
  chess: [
    { rank: 1, name: "QueenGambit", rating: 2450, gamesPlayed: 312 },
    { rank: 2, name: "KnightRider", rating: 2380, gamesPlayed: 289 },
    { rank: 3, name: "BishopKing", rating: 2310, gamesPlayed: 256 },
    { rank: 4, name: "DragonKnight", rating: 2290, gamesPlayed: 301 },
    { rank: 5, name: "RookMaster", rating: 2240, gamesPlayed: 198 },
    { rank: 6, name: "PawnStorm", rating: 2200, gamesPlayed: 275 },
    { rank: 7, name: "CastleWall", rating: 2180, gamesPlayed: 220 },
    { rank: 8, name: "CheckMate01", rating: 2150, gamesPlayed: 190 },
    { rank: 9, name: "EndgameKing", rating: 2100, gamesPlayed: 165 },
    { rank: 10, name: "OpeningPro", rating: 2080, gamesPlayed: 210 },
    { rank: 11, name: "Tactician", rating: 2050, gamesPlayed: 180 },
    { rank: 12, name: "GrandMaster99", rating: 2030, gamesPlayed: 102 },
  ],
  xiangqi: [
    { rank: 1, name: "RedGeneral", rating: 2500, gamesPlayed: 340 },
    { rank: 2, name: "JadeCanon", rating: 2420, gamesPlayed: 290 },
    { rank: 3, name: "ElephantEye", rating: 2350, gamesPlayed: 310 },
    { rank: 4, name: "HorseMaster", rating: 2300, gamesPlayed: 265 },
    { rank: 5, name: "ChariotKing", rating: 2250, gamesPlayed: 230 },
    { rank: 6, name: "AdvisorPro", rating: 2200, gamesPlayed: 195 },
    { rank: 7, name: "GrandMaster99", rating: 2180, gamesPlayed: 85 },
    { rank: 8, name: "CannonFire", rating: 2150, gamesPlayed: 210 },
    { rank: 9, name: "SoldierMarch", rating: 2100, gamesPlayed: 175 },
    { rank: 10, name: "PalaceGuard", rating: 2050, gamesPlayed: 160 },
  ],
  gomoku: [
    { rank: 1, name: "FiveInRow", rating: 2400, gamesPlayed: 280 },
    { rank: 2, name: "StoneWall", rating: 2350, gamesPlayed: 260 },
    { rank: 3, name: "BlackStone", rating: 2300, gamesPlayed: 240 },
    { rank: 4, name: "GrandMaster99", rating: 2280, gamesPlayed: 60 },
    { rank: 5, name: "GridMaster", rating: 2200, gamesPlayed: 220 },
    { rank: 6, name: "LineMaker", rating: 2150, gamesPlayed: 195 },
    { rank: 7, name: "CrossCut", rating: 2100, gamesPlayed: 180 },
    { rank: 8, name: "CornerPlay", rating: 2050, gamesPlayed: 170 },
    { rank: 9, name: "CenterStone", rating: 2000, gamesPlayed: 150 },
    { rank: 10, name: "EdgeRunner", rating: 1950, gamesPlayed: 140 },
  ],
};

// Chess piece unicode characters
export const chessPieces = {
  white: { king: "♔", queen: "♕", rook: "♖", bishop: "♗", knight: "♘", pawn: "♙" },
  black: { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" },
};

export const initialChessBoard = [
  ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"],
  ["♟", "♟", "♟", "♟", "♟", "♟", "♟", "♟"],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ["♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙"],
  ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"],
];

// Xiangqi pieces - Chinese characters
export const xiangqiPieces = {
  red: { general: "帥", advisor: "仕", elephant: "相", horse: "馬", chariot: "車", cannon: "炮", soldier: "兵" },
  black: { general: "將", advisor: "士", elephant: "象", horse: "馬", chariot: "車", cannon: "砲", soldier: "卒" },
};

export const initialXiangqiBoard = [
  ["車", "馬", "象", "士", "將", "士", "象", "馬", "車"],
  [null, null, null, null, null, null, null, null, null],
  [null, "砲", null, null, null, null, null, "砲", null],
  ["卒", null, "卒", null, "卒", null, "卒", null, "卒"],
  [null, null, null, null, null, null, null, null, null],
  // --- river ---
  [null, null, null, null, null, null, null, null, null],
  ["兵", null, "兵", null, "兵", null, "兵", null, "兵"],
  [null, "炮", null, null, null, null, null, "炮", null],
  [null, null, null, null, null, null, null, null, null],
  ["車", "馬", "相", "仕", "帥", "仕", "相", "馬", "車"],
];

export const chessMoveHistory = [
  { move: 1, white: "e4", black: "e5" },
  { move: 2, white: "Nf3", black: "Nc6" },
  { move: 3, white: "Bb5", black: "a6" },
  { move: 4, white: "Ba4", black: "Nf6" },
  { move: 5, white: "O-O", black: "Be7" },
];

export const gameTypeLabels = {
  chess: "Chess",
  xiangqi: "Xiangqi",
  gomoku: "Gomoku",
};
