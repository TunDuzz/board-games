import React, { createContext, useContext, useState, useEffect } from 'react';

const THEMES = {
  wood: {
    name: 'Gỗ Cổ Điển',
    caro: { bg: '#E1C699', line: '#5D4037', lastMove: 'rgba(93, 64, 55, 0.3)' },
    chess: { light: '#ebecd0', dark: '#779556', lastMove: 'rgba(255, 235, 59, 0.3)' },
    xiangqi: { bg: '#D46231', line: '#3E2723', lastMove: 'rgba(62, 39, 35, 0.4)' },
  },
  marble: {
    name: 'Đá Cẩm Thạch',
    caro: { bg: '#F5F5F5', line: '#9E9E9E', lastMove: 'rgba(158, 158, 158, 0.3)' },
    chess: { light: '#E0E0E0', dark: '#757575', lastMove: 'rgba(33, 150, 243, 0.3)' },
    xiangqi: { bg: '#E3F2FD', line: '#1976D2', lastMove: 'rgba(25, 118, 210, 0.3)' },
  },
  cyberpunk: {
    name: 'Cyberpunk',
    caro: { bg: '#0D0221', line: '#00F0FF', lastMove: 'rgba(0, 240, 255, 0.3)' },
    chess: { light: '#1A1A2E', dark: '#16213E', lastMove: 'rgba(233, 69, 96, 0.4)' },
    xiangqi: { bg: '#1A1A2E', line: '#E94560', lastMove: 'rgba(233, 69, 96, 0.3)' },
  }
};

const SKINS = [
  { id: 'classic', name: 'Cổ điển' },
  { id: 'anime', name: 'Anime' },
  { id: 'glass', name: 'Thủy tinh' }
];

const GameThemeContext = createContext();

export const GameThemeProvider = ({ children }) => {
  const [boardTheme, setBoardTheme] = useState(() => {
    return localStorage.getItem('game_board_theme') || 'wood';
  });

  const [pieceSkin, setPieceSkin] = useState(() => {
    return localStorage.getItem('game_piece_skin') || 'classic';
  });

  useEffect(() => {
    localStorage.setItem('game_board_theme', boardTheme);
  }, [boardTheme]);

  useEffect(() => {
    localStorage.setItem('game_piece_skin', pieceSkin);
  }, [pieceSkin]);

  const value = {
    boardTheme,
    setBoardTheme,
    pieceSkin,
    setPieceSkin,
    themeConfig: THEMES[boardTheme],
    themes: THEMES,
    skins: SKINS
  };

  return (
    <GameThemeContext.Provider value={value}>
      {children}
    </GameThemeContext.Provider>
  );
};

export const useGameTheme = () => {
  const context = useContext(GameThemeContext);
  if (!context) {
    throw new Error('useGameTheme must be used within a GameThemeProvider');
  }
  return context;
};
