import React, { useMemo, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Group, Image as KonvaImage } from 'react-konva';

// Cờ Vua: Component render SVG chuẩn
const ChessPieceImage = ({ type, color, size }) => {
    const [image, setImage] = useState(null);

    useEffect(() => {
        const img = new window.Image();
        img.src = `/chess-pieces/${color}-${type}.png`;
        img.onload = () => setImage(img);
        img.onerror = () => console.error("Failed to load image:", img.src);
    }, [type, color]);

    return image ? <KonvaImage image={image} x={-size / 2} y={-size / 2} width={size} height={size} /> : null;
};

export const GameBoard = ({
    gameType = 'caro',
    boardState = [],
    selectedSquare = null,
    validMoves = [],
    lastMove = null, // Thêm vết nước đi cuối
    flipped = false, // Lật bàn cờ cho người chơi bên kia
    onSquareClick
}) => {
    const [containerSize, setContainerSize] = useState({ width: 800, height: 800 });
    const containerRef = React.useRef(null);

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                // Leave some room for margins/padding
                setContainerSize({
                    width: clientWidth - 40,
                    height: clientHeight - 40
                });
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // 1. Cấu hình kích thước và cơ chế lưới theo từng loại cờ
    const config = useMemo(() => {
        const baseRows = gameType === 'xiangqi' ? 10 : (gameType === 'chess' ? 8 : 15);
        const baseCols = gameType === 'xiangqi' ? 9 : (gameType === 'chess' ? 8 : 15);

        // Calculate adaptive cellSize
        const paddingValue = gameType === 'chess' ? 0 : (gameType === 'caro' ? 30 : 35);
        const availableW = containerSize.width - paddingValue * 2;
        const availableH = containerSize.height - paddingValue * 2;

        const cellW = availableW / (gameType === 'caro' || gameType === 'xiangqi' ? baseCols - 1 : baseCols);
        const cellH = availableH / (gameType === 'caro' || gameType === 'xiangqi' ? baseRows - 1 : baseRows);

        // We want a square cell, and we want it to fit in both directions
        const calculatedCellSize = Math.floor(Math.min(cellW, cellH, gameType === 'caro' ? 45 : 80));

        switch (gameType) {
            case 'xiangqi':
                return { rows: 10, cols: 9, isIntersectionBased: true, bg: '#D46231', cellSize: calculatedCellSize, padding: calculatedCellSize / 2 };
            case 'chess':
                return { rows: 8, cols: 8, isIntersectionBased: false, bg: '#333', cellSize: calculatedCellSize, padding: 0, light: '#ebecd0', dark: '#779556' };
            case 'caro':
            default:
                return { rows: 15, cols: 15, isIntersectionBased: true, bg: '#E1C699', cellSize: calculatedCellSize, padding: calculatedCellSize * 0.6 };
        }
    }, [gameType, containerSize]);

    const { rows, cols, isIntersectionBased, bg, cellSize, padding, light, dark } = config;

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
                <Line key={`v-${c}`} points={[c * cellSize, 0, c * cellSize, gridHeight]} stroke="#000" strokeWidth={1} />
            );
        }
        for (let r = 0; r < rows; r++) {
            lines.push(
                <Line key={`h-${r}`} points={[0, r * cellSize, gridWidth, r * cellSize]} stroke="#000" strokeWidth={1} />
            );
        }
        return lines;
    };

    // 4. UI Lưới Cờ Tướng (Xiangqi)
    const renderXiangqiGrid = () => {
        const lines = [];

        for (let r = 0; r < rows; r++) {
            lines.push(<Line key={`hx-${r}`} points={[0, r * cellSize, gridWidth, r * cellSize]} stroke="#000" strokeWidth={2} />);
        }

        for (let c = 0; c < cols; c++) {
            if (c === 0 || c === cols - 1) {
                lines.push(<Line key={`vx-${c}`} points={[c * cellSize, 0, c * cellSize, gridHeight]} stroke="#000" strokeWidth={2} />);
            } else {
                lines.push(<Line key={`vx-top-${c}`} points={[c * cellSize, 0, c * cellSize, 4 * cellSize]} stroke="#000" strokeWidth={2} />);
                lines.push(<Line key={`vx-bot-${c}`} points={[c * cellSize, 5 * cellSize, c * cellSize, gridHeight]} stroke="#000" strokeWidth={2} />);
            }
        }

        lines.push(<Line key="palace-top-1" points={[3 * cellSize, 0, 5 * cellSize, 2 * cellSize]} stroke="#000" strokeWidth={2} />);
        lines.push(<Line key="palace-top-2" points={[5 * cellSize, 0, 3 * cellSize, 2 * cellSize]} stroke="#000" strokeWidth={2} />);
        lines.push(<Line key="palace-bot-1" points={[3 * cellSize, 7 * cellSize, 5 * cellSize, 9 * cellSize]} stroke="#000" strokeWidth={2} />);
        lines.push(<Line key="palace-bot-2" points={[5 * cellSize, 7 * cellSize, 3 * cellSize, 9 * cellSize]} stroke="#000" strokeWidth={2} />);

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
            const isBlack = (piece === 'black' || piece?.color === 'black');
            return (
                <Circle
                    radius={cellSize * 0.4}
                    fill={isBlack ? '#222' : '#f0f0f0'}
                    stroke="#444"
                    strokeWidth={1}
                    shadowColor="#000"
                    shadowBlur={4}
                    shadowOpacity={0.4}
                    shadowOffset={{ x: 2, y: 2 }}
                />
            );
        }

        if (type === 'xiangqi') {
            const isRed = piece?.color === 'red';
            const textColor = isRed ? '#D32F2F' : '#000000'; // Đỏ tươi và Đen tuyền

            return (
                <Group>
                    <Circle
                        radius={cellSize * 0.45}
                        fill="white"
                        stroke={textColor}
                        strokeWidth={2}
                        shadowColor="#000"
                        shadowBlur={3}
                        shadowOpacity={0.3}
                        shadowOffset={{ x: 1, y: 1 }}
                    />
                    <Circle
                        radius={cellSize * 0.38}
                        fill="navajowhite"
                        stroke={textColor}
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
            return <ChessPieceImage type={piece?.type || 'p'} color={piece?.color === 'white' ? 'white' : 'black'} size={cellSize * 0.9} />;
        }

        return null;
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
                                 fill="rgba(0, 0, 255, 0.15)"
                             />
                         )}
                         {/* Điểm đến hoặc Tọa độ đơn (Caro) */}
                         {(lastMove.to || lastMove.col !== undefined) && (
                             <Rect
                                 x={(flipped ? cols - 1 - (lastMove.to?.col ?? lastMove.col) : (lastMove.to?.col ?? lastMove.col)) * cellSize - (isIntersectionBased ? cellSize / 2 : 0)}
                                 y={(flipped ? rows - 1 - (lastMove.to?.row ?? lastMove.row) : (lastMove.to?.row ?? lastMove.row)) * cellSize - (isIntersectionBased ? cellSize / 2 : 0)}
                                 width={cellSize}
                                 height={cellSize}
                                 fill="rgba(0, 0, 255, 0.25)"
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
                </Layer>
            </Stage>
        </div>
    );
};
