import React, { useMemo, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Group, Image as KonvaImage } from 'react-konva';

// Cờ Vua: Component render SVG chuẩn
const ChessPieceImage = ({ type, color, size, pieceColorTheme }) => {
    const [image, setImage] = useState(null);

    useEffect(() => {
        const img = new window.Image();
        img.src = `/chess-pieces/${color}-${type}.png`;
        img.onload = () => setImage(img);
        img.onerror = () => console.error("Failed to load image:", img.src);
    }, [type, color]);

    const filter = useMemo(() => {
        if (pieceColorTheme === 'dark') return 'brightness(0.8) contrast(1.2) saturate(0.8)';
        if (pieceColorTheme === 'light') return 'brightness(1.1) contrast(0.9)';
        return '';
    }, [pieceColorTheme]);

    return image ? (
        <Group filters={filter ? [] : [] /* Konva filters are complex, we use native Canvas context filter via custom image drawing or Opacity */}>
            <KonvaImage 
                image={image} 
                x={-size / 2} y={-size / 2} 
                width={size} height={size} 
                opacity={pieceColorTheme === 'dark' ? 0.9 : 1}
            />
        </Group>
    ) : null;
};

export const GameBoard = ({
    gameType = 'caro',
    boardState = [],
    selectedSquare = null,
    validMoves = [],
    lastMove = null, 
    winningLine = [], 
    hintMove = null, 
    flipped = false, 
    boardTheme = 'classic',
    pieceColor = 'auto', 
    onSquareClick,
    myRole = 'player1'
}) => {
    const [containerSize, setContainerSize] = useState({ width: 800, height: 800 });
    const containerRef = React.useRef(null);

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                // Leave some room for margins/padding
                setContainerSize({
                    width: Math.max(0, clientWidth - 5),
                    height: Math.max(0, clientHeight - 5)
                });
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);
    
    const getVisualColor = (systemColor, gameMode) => {
        if (pieceColor === 'auto') return systemColor;
        let isMine = false;
        const role = myRole || 'player1'; // Default to player1 for local/AI games
        
        if (gameMode === 'chess') {
            isMine = (role === 'player1' && systemColor === 'white') || (role === 'player2' && systemColor === 'black');
            return isMine ? (pieceColor === 'light' ? 'white' : 'black') : (pieceColor === 'light' ? 'black' : 'white');
        } else if (gameMode === 'xiangqi') {
            isMine = (role === 'player1' && systemColor === 'red') || (role === 'player2' && systemColor === 'black');
            return isMine ? (pieceColor === 'light' ? 'red' : 'black') : (pieceColor === 'light' ? 'black' : 'red');
        } else if (gameMode === 'caro') {
            isMine = (role === 'player1' && systemColor === 'black') || (role === 'player2' && systemColor === 'white');
            return isMine ? (pieceColor === 'light' ? 'white' : 'black') : (pieceColor === 'light' ? 'black' : 'white');
        }
        return systemColor;
    };

    // 1. Cấu hình kích thước và cơ chế lưới theo từng loại cờ
    const config = useMemo(() => {
        const baseRows = gameType === 'xiangqi' ? 10 : (gameType === 'chess' ? 8 : 15);
        const baseCols = gameType === 'xiangqi' ? 9 : (gameType === 'chess' ? 8 : 15);

        // Calculate adaptive cellSize
        const paddingValue = gameType === 'chess' ? 0 : (gameType === 'caro' ? 15 : 20);
        const availableW = containerSize.width - paddingValue * 2;
        const availableH = containerSize.height - paddingValue * 2;

        const cellW = Math.max(0, availableW / (gameType === 'caro' || gameType === 'xiangqi' ? baseCols - 1 : baseCols));
        const cellH = Math.max(0, availableH / (gameType === 'caro' || gameType === 'xiangqi' ? baseRows - 1 : baseRows));

        const calculatedCellSize = Math.max(1, Math.floor(Math.min(cellW, cellH, gameType === 'caro' ? 100 : 150)));

        // Default colors
        let bg = '#E1C699';
        let line = '#000';
        let light = '#ebecd0';
        let dark = '#779556';
        let pColors = { p1: '#2563eb', p2: '#ef4444' }; // P1, P2

        if (gameType === 'xiangqi') {
            bg = '#f1e0c5'; line = '#a67c52';
            if (boardTheme === 'wood') { bg = '#e1c699'; line = '#5d4037'; }
            if (boardTheme === 'bamboo') { bg = '#d4d8c1'; line = '#5a7d51'; }
            if (boardTheme === 'dark') { bg = '#1a1a1a'; line = '#444'; }
            
            pColors = { p1: '#D32F2F', p2: '#000000' };
            if (pieceColor === 'light') pColors = { p1: '#D32F2F', p2: '#000000' };
            else if (pieceColor === 'dark') pColors = { p1: '#1a1a1a', p2: '#D32F2F' }; 

            return { rows: 10, cols: 9, isIntersectionBased: true, bg, line, cellSize: calculatedCellSize, padding: calculatedCellSize / 2, pColors };
        }

        if (gameType === 'chess') {
            if (boardTheme === 'classic') { light = '#ebecd0'; dark = '#779556'; }
            if (boardTheme === 'wood') { light = '#f0d9b5'; dark = '#b58863'; }
            if (boardTheme === 'blue') { light = '#dee3e6'; dark = '#8ca2ad'; }
            if (boardTheme === 'dark') { light = '#404040'; dark = '#262626'; }
            
            return { rows: 8, cols: 8, isIntersectionBased: false, bg: '#333', cellSize: calculatedCellSize, padding: 0, light, dark, pColors };
        }

        // Caro
        bg = '#ffffff'; line = '#cbd5e1';
        if (boardTheme === 'wood') { bg = '#e3c099'; line = '#8b5e3c'; }
        if (boardTheme === 'dark') { bg = '#1e293b'; line = '#334155'; }
        
        if (pieceColor === 'light') {
            pColors = myRole === 'player1' ? { p1: '#f8fafc', p2: '#1e293b' } : { p1: '#1e293b', p2: '#f8fafc' };
        } else if (pieceColor === 'dark') {
            pColors = myRole === 'player1' ? { p1: '#1e293b', p2: '#f8fafc' } : { p1: '#f8fafc', p2: '#1e293b' };
        } else {
            pColors = { p1: '#3b82f6', p2: '#ef4444' };
        }

        return { rows: 15, cols: 15, isIntersectionBased: true, bg, line, cellSize: calculatedCellSize, padding: calculatedCellSize * 0.5, pColors };
    }, [gameType, containerSize, boardTheme, pieceColor, myRole]);

    const { rows, cols, isIntersectionBased, bg, line, cellSize, padding, light, dark, pColors } = config;

    // Tính toán chiều rộng và chiều cao thực tế của vùng kẻ lưới
    const gridWidth = isIntersectionBased ? (cols - 1) * cellSize : cols * cellSize;
    const gridHeight = isIntersectionBased ? (rows - 1) * cellSize : rows * cellSize;

    // Kích thước của toàn bộ Canvas (bao gồm viền)
    const stageWidth = gridWidth + padding * 2;
    const stageHeight = gridHeight + padding * 2;

    // 2. Logic tương tác
    const handleCanvasClick = (e) => {
        if (e.evt.button !== 0 && e.evt.type !== 'touchstart') return;

        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();

        const x = pointerPosition.x - padding;
        const y = pointerPosition.y - padding;

        let row, col;

        if (isIntersectionBased) {
            col = Math.round(x / cellSize);
            row = Math.round(y / cellSize);
        } else {
            col = Math.floor(x / cellSize);
            row = Math.floor(y / cellSize);
        }

        // Đảo ngược nếu board lật
        if (flipped) {
            col = cols - 1 - col;
            row = rows - 1 - row;
        }

        // Kiểm tra tính hợp lệ của tọa độ trước khi gọi callback
        if (row >= 0 && row < rows && col >= 0 && col < cols) {
            if (onSquareClick) onSquareClick(row, col);
        }
    };

    // 3. UI Lưới Cờ Caro (Gomoku)
    const renderCaroGrid = () => {
        const lines = [];
        for (let c = 0; c < cols; c++) {
            lines.push(
                <Line key={`v-${c}`} points={[c * cellSize, 0, c * cellSize, gridHeight]} stroke={line} strokeWidth={1} />
            );
        }
        for (let r = 0; r < rows; r++) {
            lines.push(
                <Line key={`h-${r}`} points={[0, r * cellSize, gridWidth, r * cellSize]} stroke={line} strokeWidth={1} />
            );
        }
        return lines;
    };

    // 4. UI Lưới Cờ Tướng (Xiangqi)
    const renderXiangqiGrid = () => {
        const lines = [];

        for (let r = 0; r < rows; r++) {
            lines.push(<Line key={`hx-${r}`} points={[0, r * cellSize, gridWidth, r * cellSize]} stroke={line} strokeWidth={2} />);
        }

        for (let c = 0; c < cols; c++) {
            if (c === 0 || c === cols - 1) {
                lines.push(<Line key={`vx-${c}`} points={[c * cellSize, 0, c * cellSize, gridHeight]} stroke={line} strokeWidth={2} />);
            } else {
                lines.push(<Line key={`vx-top-${c}`} points={[c * cellSize, 0, c * cellSize, 4 * cellSize]} stroke={line} strokeWidth={2} />);
                lines.push(<Line key={`vx-bot-${c}`} points={[c * cellSize, 5 * cellSize, c * cellSize, gridHeight]} stroke={line} strokeWidth={2} />);
            }
        }

        lines.push(<Line key="palace-top-1" points={[3 * cellSize, 0, 5 * cellSize, 2 * cellSize]} stroke={line} strokeWidth={2} />);
        lines.push(<Line key="palace-top-2" points={[5 * cellSize, 0, 3 * cellSize, 2 * cellSize]} stroke={line} strokeWidth={2} />);
        lines.push(<Line key="palace-bot-1" points={[3 * cellSize, 7 * cellSize, 5 * cellSize, 9 * cellSize]} stroke={line} strokeWidth={2} />);
        lines.push(<Line key="palace-bot-2" points={[5 * cellSize, 7 * cellSize, 3 * cellSize, 9 * cellSize]} stroke={line} strokeWidth={2} />);

        const drawTick = (r, c) => {
            const x = c * cellSize;
            const y = r * cellSize;
            const d = 5;
            const l = 10;
            const ticks = [];
            const addLines = (dirX, dirY, pos) => {
                ticks.push(
                    <Line key={`t-${r}-${c}-${pos}-h`} points={[x + dirX * d, y + dirY * d, x + dirX * (d + l), y + dirY * d]} stroke="#000" strokeWidth={2} />,
                    <Line key={`t-${r}-${c}-${pos}-v`} points={[x + dirX * d, y + dirY * d, x + dirX * d, y + dirY * (d + l)]} stroke="#000" strokeWidth={2} />
                );
            };
            if (c > 0) { addLines(-1, -1, 'tl'); addLines(-1, 1, 'bl'); }
            if (c < 8) { addLines(1, -1, 'tr'); addLines(1, 1, 'br'); }
            return ticks;
        };

        const marks = [
            [2, 1], [2, 7], [7, 1], [7, 7],
            [3, 0], [3, 2], [3, 4], [3, 6], [3, 8],
            [6, 0], [6, 2], [6, 4], [6, 6], [6, 8]
        ].flatMap(([r, c]) => drawTick(r, c));

        return (
            <Group>
                {lines}
                {marks}
                <Text text="楚 河" x={gridWidth * 0.15} y={4 * cellSize + 15} fontSize={36} fontFamily="KaiTi, serif" fill="#000" />
                <Text text="漢 界" x={gridWidth * 0.60} y={4 * cellSize + 15} fontSize={36} fontFamily="KaiTi, serif" fill="#000" />
            </Group>
        );
    };

    // 5. UI Lưới Cờ Vua (Chess)
    const renderChessGrid = () => {
        const squares = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const isLight = (r + c) % 2 === 0;
                squares.push(
                    <Rect
                        key={`sq-${r}-${c}`}
                        x={c * cellSize}
                        y={r * cellSize}
                        width={cellSize}
                        height={cellSize}
                        fill={isLight ? light : dark}
                    />
                );
            }
        }
        return squares;
    };

    // 6. UI Gợi ý nước đi (Hints)
    const renderHints = () => {
        return validMoves.map((move, idx) => {
            const renderC = flipped ? cols - 1 - move.col : move.col;
            const renderR = flipped ? rows - 1 - move.row : move.row;

            const centerX = isIntersectionBased ? renderC * cellSize : renderC * cellSize + cellSize / 2;
            const centerY = isIntersectionBased ? renderR * cellSize : renderR * cellSize + cellSize / 2;

            const targetPiece = boardState[move.row]?.[move.col];

            return (
                <Group key={`hint-${idx}`} x={centerX} y={centerY}>
                    {targetPiece ? (
                        <Circle radius={isIntersectionBased ? cellSize * 0.4 : cellSize * 0.45} stroke="rgba(239, 68, 68, 0.7)" strokeWidth={4} />
                    ) : (
                        <Circle radius={cellSize * 0.15} fill="rgba(14, 165, 233, 0.6)" />
                    )}
                </Group>
            );
        });
    };

    const renderHint = () => {
        if (!hintMove) return null;

        // Caro hint format is {row, col}, Chess/Xiangqi is {from: {row, col}, to: {row, col}}
        const isCaro = gameType === 'caro';

        if (isCaro) {
            const renderC = flipped ? cols - 1 - hintMove.col : hintMove.col;
            const renderR = flipped ? rows - 1 - hintMove.row : hintMove.row;
            const centerX = isIntersectionBased ? renderC * cellSize : renderC * cellSize + cellSize / 2;
            const centerY = isIntersectionBased ? renderR * cellSize : renderR * cellSize + cellSize / 2;

            return (
                <Group x={centerX} y={centerY}>
                    <Circle
                        radius={cellSize * 0.35}
                        fill="rgba(255, 193, 7, 0.3)"
                        stroke="#ffc107"
                        strokeWidth={2}
                        dash={[4, 4]}
                    />
                    <Circle radius={4} fill="#ffc107" />
                </Group>
            );
        }

        const renderCFrom = flipped ? cols - 1 - hintMove.from.col : hintMove.from.col;
        const renderRFrom = flipped ? rows - 1 - hintMove.from.row : hintMove.from.row;
        const renderCTo = flipped ? cols - 1 - hintMove.to.col : hintMove.to.col;
        const renderRTo = flipped ? rows - 1 - hintMove.to.row : hintMove.to.row;

        const centerXFrom = isIntersectionBased ? renderCFrom * cellSize : renderCFrom * cellSize + cellSize / 2;
        const centerYFrom = isIntersectionBased ? renderRFrom * cellSize : renderRFrom * cellSize + cellSize / 2;
        const centerXTo = isIntersectionBased ? renderCTo * cellSize : renderCTo * cellSize + cellSize / 2;
        const centerYTo = isIntersectionBased ? renderRTo * cellSize : renderRTo * cellSize + cellSize / 2;

        return (
            <Group>
                <Line
                    points={[centerXFrom, centerYFrom, centerXTo, centerYTo]}
                    stroke="#ffc107"
                    strokeWidth={4}
                    dash={[10, 5]}
                    opacity={0.6}
                />
                <Circle
                    x={centerXTo}
                    y={centerYTo}
                    radius={cellSize * 0.2}
                    fill="rgba(255, 193, 7, 0.4)"
                    stroke="#ffc107"
                    strokeWidth={2}
                />
            </Group>
        );
    };

    // 7. UI Vẽ Toàn Bộ Quân Cờ
    const renderPieces = () => {
        if (!boardState || boardState.length === 0) return null;

        const elements = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const piece = boardState[r]?.[c];
                if (!piece) continue;

                const renderC = flipped ? cols - 1 - c : c;
                const renderR = flipped ? rows - 1 - r : r;

                const centerX = isIntersectionBased ? renderC * cellSize : renderC * cellSize + cellSize / 2;
                const centerY = isIntersectionBased ? renderR * cellSize : renderR * cellSize + cellSize / 2;

                elements.push(
                    <Group key={`p-${r}-${c}`} x={centerX} y={centerY}>
                        {renderSinglePiece(gameType, piece)}
                    </Group>
                );
            }
        }
        return elements;
    };

    const renderSinglePiece = (type, piece) => {
        if (type === 'caro') {
            const systemColor = (piece === 'black' || piece?.color === 'black') ? 'black' : 'white';
            const color = systemColor === 'black' ? pColors.p1 : pColors.p2;
            let stroke = '#444';
            
            if (boardTheme === 'dark') {
                stroke = systemColor === 'black' ? '#00aa00' : '#aa00aa';
            }

            return (
                <Circle
                    radius={cellSize * 0.4}
                    fill={color}
                    stroke={stroke}
                    strokeWidth={1}
                    shadowColor="#000"
                    shadowBlur={4}
                    shadowOpacity={0.4}
                    shadowOffset={{ x: 2, y: 2 }}
                />
            );
        }

        if (type === 'xiangqi') {
            const systemColor = piece?.color === 'red' ? 'red' : 'black';
            const visualColor = getVisualColor(systemColor, 'xiangqi');
            const isRed = visualColor === 'red';

            let textColor = isRed ? '#D32F2F' : '#1a1a1a';
            let bgFill = 'navajowhite';
            let strokeColor = textColor;

            if (boardTheme === 'dark') {
                bgFill = '#333333';
            } else if (boardTheme === 'wood') {
                bgFill = '#deb887';
            } else if (boardTheme === 'paper') {
                bgFill = '#fff9c4';
            }

            return (
                <Group>
                    <Circle
                        radius={cellSize * 0.45}
                        fill="white"
                        stroke={strokeColor}
                        strokeWidth={2}
                        shadowColor="#000"
                        shadowBlur={3}
                        shadowOpacity={0.3}
                        shadowOffset={{ x: 1, y: 1 }}
                    />
                    <Circle
                        radius={cellSize * 0.38}
                        fill={bgFill}
                        stroke={strokeColor}
                        strokeWidth={1.2}
                    />
                    <Text
                        text={piece?.label || '兵'}
                        x={-cellSize / 2}
                        y={-cellSize / 2}
                        width={cellSize}
                        height={cellSize}
                        fontSize={cellSize * 0.58}
                        fontFamily="'STKaiti', 'KaiTi', 'serif'"
                        fontWeight="bold"
                        fill={textColor}
                        align="center"
                        verticalAlign="middle"
                    />
                </Group>
            );
        }

        if (type === 'chess') {
            const systemColor = piece?.color === 'white' ? 'white' : 'black';
            const visualColor = getVisualColor(systemColor, 'chess');

            return (
                <ChessPieceImage 
                    type={piece?.type || 'p'} 
                    color={visualColor} 
                    size={cellSize * 0.9} 
                    pieceColorTheme={pieceColor}
                />
            );
        }

        return null;
    };

    const renderWinningLine = () => {
        if (!winningLine || winningLine.length < 5) return null;

        // Chuyển đổi tọa độ board sang tọa độ canvas
        const points = winningLine.flatMap(pos => {
            const renderC = flipped ? cols - 1 - pos.col : pos.col;
            const renderR = flipped ? rows - 1 - pos.row : pos.row;
            return [renderC * cellSize, renderR * cellSize];
        });

        return (
            <Line
                points={points}
                stroke="red"
                strokeWidth={6}
                lineCap="round"
                lineJoin="round"
                opacity={0.8}
                shadowColor="red"
                shadowBlur={10}
            />
        );
    };

    return (
        <div ref={containerRef} className="flex justify-center items-center w-full h-full min-h-0 overflow-hidden">
            <Stage width={stageWidth} height={stageHeight} onMouseDown={handleCanvasClick} onTouchStart={handleCanvasClick}>
                <Layer>
                    <Rect x={0} y={0} width={stageWidth} height={stageHeight} fill={bg} shadowColor="#000" shadowBlur={10} shadowOpacity={0.3} cornerRadius={8} />
                </Layer>

                <Layer x={padding} y={padding}>
                    {gameType === 'caro' && renderCaroGrid()}
                    {gameType === 'xiangqi' && renderXiangqiGrid()}
                    {gameType === 'chess' && renderChessGrid()}

                    {selectedSquare && (
                        <Rect
                            x={(flipped ? cols - 1 - selectedSquare.col : selectedSquare.col) * cellSize - (isIntersectionBased ? cellSize / 2 : 0)}
                            y={(flipped ? rows - 1 - selectedSquare.row : selectedSquare.row) * cellSize - (isIntersectionBased ? cellSize / 2 : 0)}
                            width={cellSize}
                            height={cellSize}
                            fill="rgba(255, 255, 0, 0.3)"
                        />
                    )}

                    {/* Highlight nước đi cuối cùng (Last Move) */}
                    {lastMove && (
                        <>
                            {/* Điểm xuất phát (Chess/Xiangqi) */}
                            {lastMove.from && (
                                <Rect
                                    x={(flipped ? cols - 1 - lastMove.from.col : lastMove.from.col) * cellSize - (isIntersectionBased ? cellSize / 2 : 0)}
                                    y={(flipped ? rows - 1 - lastMove.from.row : lastMove.from.row) * cellSize - (isIntersectionBased ? cellSize / 2 : 0)}
                                    width={cellSize}
                                    height={cellSize}
                                    fill="rgba(255, 235, 59, 0.3)"
                                />
                            )}
                            {/* Điểm đến hoặc Tọa độ đơn (Caro) */}
                            {(lastMove.to || lastMove.col !== undefined) && (
                                <Rect
                                    x={(flipped ? cols - 1 - (lastMove.to?.col ?? lastMove.col) : (lastMove.to?.col ?? lastMove.col)) * cellSize - (isIntersectionBased ? cellSize / 2 : 0)}
                                    y={(flipped ? rows - 1 - (lastMove.to?.row ?? lastMove.row) : (lastMove.to?.row ?? lastMove.row)) * cellSize - (isIntersectionBased ? cellSize / 2 : 0)}
                                    width={cellSize}
                                    height={cellSize}
                                    fill="rgba(255, 235, 59, 0.4)"
                                />
                            )}
                        </>
                    )}
                </Layer>

                <Layer x={padding} y={padding}>
                    {renderHints()}
                </Layer>

                <Layer x={padding} y={padding}>
                    {renderPieces()}
                    {renderHint()}
                    {gameType === 'caro' && renderWinningLine()}
                </Layer>
            </Stage>
        </div>
    );
};
