import React, { useMemo, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Group, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';

// Cờ Vua: Component render SVG chuẩn
const ChessPieceImage = ({ type, color, size, skin = 'classic', pieceColorTheme = 'auto' }) => {
    const [image, setImage] = useState(null);

    useEffect(() => {
        const img = new window.Image();
        img.crossOrigin = 'Anonymous';
        // Always load classic for now, we'll apply filters/effects to change style
        img.src = `/chess-pieces/${color}-${type}.png`;
        img.onload = () => setImage(img);
        img.onerror = () => console.error("Failed to load image:", img.src);
    }, [type, color]);

    const effects = useMemo(() => {
        let base = { opacity: 1, shadowOpacity: 0 };
        
        if (skin === 'glass') {
            base = {
                opacity: 0.6,
                shadowColor: color === 'white' ? '#fff' : '#000',
                shadowBlur: 8,
                shadowOpacity: 0.4,
                shadowOffset: { x: 2, y: 2 }
            };
        } else if (skin === 'anime') {
            base = {
                opacity: 1,
                shadowColor: color === 'white' ? '#FFD700' : '#4B0082',
                shadowBlur: 12,
                shadowOpacity: 0.9,
                shadowOffset: { x: 0, y: 0 }
            };
        } else if (skin === 'cyberpunk' || skin === 'neon') {
            base = {
                opacity: 0.9,
                shadowColor: color === 'white' ? '#00F0FF' : '#FF00FF',
                shadowBlur: 20,
                shadowOpacity: 1,
                shadowOffset: { x: 0, y: 0 }
            };
        }

        // Apply pieceColorTheme adjustments if strictly dark/light
        if (pieceColorTheme === 'dark' && skin === 'classic') {
            base.opacity = 0.85;
        }

        return base;
    }, [skin, color, pieceColorTheme]);

    return image ? (
        <KonvaImage 
            image={image} 
            x={-size / 2} 
            y={-size / 2} 
            width={size} 
            height={size} 
            {...effects}
        />
    ) : null;
};

const AnimatedPiece = ({ children, x, y, isLastMoveTo, fromX, fromY }) => {
    const groupRef = React.useRef();
    const [pos, setPos] = useState({ x: isLastMoveTo ? fromX : x, y: isLastMoveTo ? fromY : y });

    useEffect(() => {
        if (isLastMoveTo) {
            const node = groupRef.current;
            if (node) {
                node.to({
                    x: x,
                    y: y,
                    duration: 0.3,
                    easing: Konva.Easings.EaseInOut
                });
            }
        } else {
            const node = groupRef.current;
            if (node) {
                node.setAttrs({ x, y });
            }
            setPos({ x, y });
        }
    }, [x, y, isLastMoveTo]);

    return (
        <Group ref={groupRef} x={pos.x} y={pos.y}>
            {children}
        </Group>
    );
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
    theme = null, // Theme configuration from hook
    boardTheme = 'classic', // Legacy theme string
    skin = 'classic', // Piece skin ID
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
                setContainerSize({
                    width: Math.max(100, clientWidth - 5),
                    height: Math.max(100, clientHeight - 5)
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
        const role = myRole || 'player1';
        
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

    const config = useMemo(() => {
        const baseRows = gameType === 'xiangqi' ? 10 : (gameType === 'chess' ? 8 : 15);
        const baseCols = gameType === 'xiangqi' ? 9 : (gameType === 'chess' ? 8 : 15);

        const paddingValue = gameType === 'chess' ? 0 : (gameType === 'caro' ? 20 : 25);
        const availableW = containerSize.width - paddingValue * 2;
        const availableH = containerSize.height - paddingValue * 2;

        const cellW = Math.max(0, availableW / (gameType === 'caro' || gameType === 'xiangqi' ? baseCols - 1 : baseCols));
        const cellH = Math.max(0, availableH / (gameType === 'caro' || gameType === 'xiangqi' ? baseRows - 1 : baseRows));

        const calculatedCellSize = Math.max(1, Math.floor(Math.min(cellW, cellH, gameType === 'caro' ? 50 : 80)));
        const themeData = theme ? theme[gameType] : null;

        // Default colors
        let pColors = { p1: '#3b82f6', p2: '#ef4444' };
        if (gameType === 'xiangqi') {
            pColors = { p1: '#D32F2F', p2: '#000000' };
        }

        switch (gameType) {
            case 'xiangqi':
                return { 
                  rows: 10, cols: 9, isIntersectionBased: true, 
                  bg: themeData?.bg || '#f1e0c5', 
                  line: themeData?.line || '#a67c52',
                  lastMoveColor: themeData?.lastMove || 'rgba(255, 235, 59, 0.3)',
                  cellSize: calculatedCellSize, padding: calculatedCellSize / 2,
                  pColors
                };
            case 'chess':
                return { 
                  rows: 8, cols: 8, isIntersectionBased: false, 
                  bg: '#333', 
                  lastMoveColor: themeData?.lastMove || 'rgba(255, 235, 59, 0.3)',
                  cellSize: calculatedCellSize, padding: 0, 
                  light: themeData?.light || '#ebecd0', 
                  dark: themeData?.dark || '#779556',
                  pColors
                };
            case 'caro':
            default:
                return { 
                  rows: 15, cols: 15, isIntersectionBased: true, 
                  bg: themeData?.bg || '#ffffff', 
                  line: themeData?.line || '#cbd5e1',
                  lastMoveColor: themeData?.lastMove || 'rgba(255, 235, 59, 0.3)',
                  cellSize: calculatedCellSize, padding: calculatedCellSize * 0.5,
                  pColors: pieceColor !== 'auto' ? (myRole === 'player1' ? (pieceColor === 'light' ? {p1:'#f8fafc', p2:'#1e293b'} : {p1:'#1e293b', p2:'#f8fafc'}) : (pieceColor === 'light' ? {p1:'#1e293b', p2:'#f8fafc'} : {p1:'#f8fafc', p2:'#1e293b'})) : pColors
                };
        }
    }, [gameType, containerSize, theme, pieceColor, myRole]);

    const { rows, cols, isIntersectionBased, bg, line, cellSize, padding, light, dark, lastMoveColor, pColors } = config;

    const gridWidth = isIntersectionBased ? (cols - 1) * cellSize : cols * cellSize;
    const gridHeight = isIntersectionBased ? (rows - 1) * cellSize : rows * cellSize;

    const stageWidth = gridWidth + padding * 2;
    const stageHeight = gridHeight + padding * 2;

    const handleCanvasClick = (e) => {
        if (e.evt.button !== 0 && e.evt.type !== 'touchstart') return;
        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();
        if (!pointerPosition) return;

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

        if (flipped) {
            col = cols - 1 - col;
            row = rows - 1 - row;
        }

        if (row >= 0 && row < rows && col >= 0 && col < cols) {
            if (onSquareClick) onSquareClick(row, col);
        }
    };

    const renderCaroGrid = () => {
        const lines = [];
        for (let c = 0; c < cols; c++) {
            lines.push(<Line key={`v-${c}`} points={[c * cellSize, 0, c * cellSize, gridHeight]} stroke={line} strokeWidth={1} />);
        }
        for (let r = 0; r < rows; r++) {
            lines.push(<Line key={`h-${r}`} points={[0, r * cellSize, gridWidth, r * cellSize]} stroke={line} strokeWidth={1} />);
        }
        return lines;
    };

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

        return (
            <Group>
                {lines}
                <Text text="楚 河" x={gridWidth * 0.15} y={4 * cellSize + 15} fontSize={pageSize => cellSize * 0.6} fontFamily="KaiTi, serif" fill={line} />
                <Text text="漢 界" x={gridWidth * 0.60} y={4 * cellSize + 15} fontSize={pageSize => cellSize * 0.6} fontFamily="KaiTi, serif" fill={line} />
            </Group>
        );
    };

    const renderChessGrid = () => {
        const squares = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const isLight = (r + c) % 2 === 0;
                squares.push(
                    <Rect key={`sq-${r}-${c}`} x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill={isLight ? light : dark} />
                );
            }
        }
        return squares;
    };

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
                        <Circle radius={cellSize * 0.4} stroke="rgba(239, 68, 68, 0.7)" strokeWidth={4} />
                    ) : (
                        <Circle radius={cellSize * 0.15} fill="rgba(14, 165, 233, 0.6)" />
                    )}
                </Group>
            );
        });
    };

    const renderHint = () => {
        if (!hintMove) return null;
        const isCaro = gameType === 'caro';
        if (isCaro) {
            const renderC = flipped ? cols - 1 - hintMove.col : hintMove.col;
            const renderR = flipped ? rows - 1 - hintMove.row : hintMove.row;
            const centerX = isIntersectionBased ? renderC * cellSize : renderC * cellSize + cellSize / 2;
            const centerY = isIntersectionBased ? renderR * cellSize : renderR * cellSize + cellSize / 2;
            return (
                <Group x={centerX} y={centerY}>
                    <Circle radius={cellSize * 0.35} fill="rgba(255, 193, 7, 0.2)" stroke="#ffc107" strokeWidth={2} dash={[4, 4]} />
                    <Circle radius={4} fill="#ffc107" />
                </Group>
            );
        }
        if (!hintMove.from || !hintMove.to) return null;
        const pts = [
            (flipped ? cols - 1 - hintMove.from.col : hintMove.from.col) * cellSize + (isIntersectionBased ? 0 : cellSize/2),
            (flipped ? rows - 1 - hintMove.from.row : hintMove.from.row) * cellSize + (isIntersectionBased ? 0 : cellSize/2),
            (flipped ? cols - 1 - hintMove.to.col : hintMove.to.col) * cellSize + (isIntersectionBased ? 0 : cellSize/2),
            (flipped ? rows - 1 - hintMove.to.row : hintMove.to.row) * cellSize + (isIntersectionBased ? 0 : cellSize/2)
        ];
        return (
            <Group>
                <Line points={pts} stroke="#ffc107" strokeWidth={4} dash={[10, 5]} opacity={0.6} />
                <Circle x={pts[2]} y={pts[3]} radius={cellSize * 0.2} fill="rgba(255, 193, 7, 0.4)" stroke="#ffc107" strokeWidth={2} />
            </Group>
        );
    };

    const renderSinglePiece = (type, piece) => {
        if (type === 'caro') {
            const isBlack = (piece === 'black' || piece?.color === 'black');
            const color = isBlack ? pColors.p1 : pColors.p2;
            
            if (skin === 'glass') {
                return (
                    <Group>
                        <Circle radius={cellSize * 0.4} fillRadialGradientStartPoint={{ x: 0, y: 0 }} fillRadialGradientStartRadius={0} fillRadialGradientEndPoint={{ x: 0, y: 0 }} fillRadialGradientEndRadius={cellSize * 0.4} fillRadialGradientColorStops={[0, isBlack ? 'rgba(80,80,80,0.8)' : 'rgba(255,255,255,0.8)', 1, isBlack ? 'rgba(0,0,0,0.9)' : 'rgba(200,200,200,0.9)']} shadowBlur={10} stroke="#444" strokeWidth={0.5} />
                    </Group>
                );
            }
            return <Circle radius={cellSize * 0.4} fill={color} stroke="#444" strokeWidth={1} shadowBlur={4} shadowOpacity={0.4} shadowOffset={{ x: 2, y: 2 }} />;
        }
        if (type === 'xiangqi') {
            const systemColor = piece?.color === 'red' ? 'red' : 'black';
            const visualColor = getVisualColor(systemColor, 'xiangqi');
            const isRed = visualColor === 'red';
            const textColor = isRed ? '#D32F2F' : '#000000';
            
            if (skin === 'anime') {
                return (
                    <Group>
                        <Circle radius={cellSize * 0.45} fill={isRed ? '#FFEBEE' : '#F5F5F5'} stroke={textColor} strokeWidth={3} />
                        <Text text={piece?.label || '兵'} x={-cellSize / 2} y={-cellSize / 2 + 2} width={cellSize} height={cellSize} fontSize={cellSize * 0.6} fontFamily="'STKaiti', 'KaiTi', 'serif'" fontWeight="bold" fill={textColor} align="center" verticalAlign="middle" shadowBlur={2} />
                    </Group>
                );
            }
            return (
                <Group>
                    <Circle radius={cellSize * 0.45} fill="white" stroke={textColor} strokeWidth={2} shadowBlur={3} />
                    <Circle radius={cellSize * 0.38} fill="navajowhite" stroke={textColor} strokeWidth={1.2} />
                    <Text text={piece?.label || '兵'} x={-cellSize / 2} y={-cellSize / 2} width={cellSize} height={cellSize} fontSize={cellSize * 0.58} fontFamily="'STKaiti', 'KaiTi', 'serif'" fontWeight="bold" fill={textColor} align="center" verticalAlign="middle" />
                </Group>
            );
        }
        if (type === 'chess') {
            const systemColor = piece?.color === 'white' ? 'white' : 'black';
            const visualColor = getVisualColor(systemColor, 'chess');
            return <ChessPieceImage type={piece?.type || 'p'} color={visualColor} size={cellSize * 0.9} skin={skin} pieceColorTheme={pieceColor} />;
        }
        return null;
    };

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

                const isLastMoveTo = lastMove && (lastMove.to ? (lastMove.to.row === r && lastMove.to.col === c) : (lastMove.row === r && lastMove.col === c));
                const fromX = lastMove && lastMove.from ? (isIntersectionBased ? (flipped ? (cols - 1 - lastMove.from.col) : lastMove.from.col) * cellSize : (flipped ? (cols - 1 - lastMove.from.col) : lastMove.from.col) * cellSize + cellSize / 2) : centerX;
                const fromY = lastMove && lastMove.from ? (isIntersectionBased ? (flipped ? (rows - 1 - lastMove.from.row) : lastMove.from.row) * cellSize : (flipped ? (rows - 1 - lastMove.from.row) : lastMove.from.row) * cellSize + cellSize / 2) : centerY;

                elements.push(
                    <AnimatedPiece 
                        key={`p-${r}-${c}`} 
                        x={centerX} y={centerY}
                        isLastMoveTo={isLastMoveTo}
                        fromX={fromX} fromY={fromY}
                    >
                        {renderSinglePiece(gameType, piece)}
                    </AnimatedPiece>
                );
            }
        }
        return elements;
    };

    const renderWinningLine = () => {
        if (!winningLine || winningLine.length < 5) return null;
        const points = winningLine.flatMap(pos => {
            const renderC = flipped ? cols - 1 - pos.col : pos.col;
            const renderR = flipped ? rows - 1 - pos.row : pos.row;
            return [renderC * cellSize, renderR * cellSize];
        });
        return <Line points={points} stroke="red" strokeWidth={6} lineCap="round" lineJoin="round" opacity={0.8} shadowBlur={10} />;
    };

    return (
        <div ref={containerRef} className="flex justify-center items-center w-full h-full min-h-0 overflow-hidden">
            <Stage width={stageWidth} height={stageHeight} onMouseDown={handleCanvasClick} onTouchStart={handleCanvasClick}>
                <Layer>
                    <Rect x={0} y={0} width={stageWidth} height={stageHeight} fill={bg} shadowColor="#000" shadowBlur={10} shadowOpacity={0.3} cornerRadius={8} />
                    <Group x={padding} y={padding}>
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

                        {lastMove && (
                           <>
                             {lastMove.from && (
                                 <Rect
                                     x={(flipped ? cols - 1 - lastMove.from.col : lastMove.from.col) * cellSize - (isIntersectionBased ? cellSize / 2 : 0)}
                                     y={(flipped ? rows - 1 - lastMove.from.row : lastMove.from.row) * cellSize - (isIntersectionBased ? cellSize / 2 : 0)}
                                     width={cellSize}
                                     height={cellSize}
                                     fill={lastMoveColor}
                                 />
                             )}
                             {(lastMove.to || lastMove.col !== undefined) && (
                                 <Rect
                                     x={(flipped ? cols - 1 - (lastMove.to?.col ?? lastMove.col) : (lastMove.to?.col ?? lastMove.col)) * cellSize - (isIntersectionBased ? cellSize / 2 : 0)}
                                     y={(flipped ? rows - 1 - (lastMove.to?.row ?? lastMove.row) : (lastMove.to?.row ?? lastMove.row)) * cellSize - (isIntersectionBased ? cellSize / 2 : 0)}
                                     width={cellSize}
                                     height={cellSize}
                                     fill={lastMoveColor}
                                     opacity={1.2}
                                 />
                             )}
                           </>
                        )}
                        
                        {renderHints()}
                        {renderPieces()}
                        {renderHint()}
                        {gameType === 'caro' && renderWinningLine()}
                    </Group>
                </Layer>
            </Stage>
        </div>
    );
};
