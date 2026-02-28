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
    gameType = 'gomoku',
    boardState = [],
    selectedSquare = null,
    validMoves = [],
    onSquareClick
}) => {
    // 1. Cấu hình kích thước và cơ chế lưới theo từng loại cờ
    const config = useMemo(() => {
        switch (gameType) {
            case 'xiangqi':
                return { rows: 10, cols: 9, isIntersectionBased: true, bg: '#D46231', cellSize: 70, padding: 35 };
            case 'chess':
                // Cờ Vua: Màu y gốc Chess.com, không viền (padding: 0)
                return { rows: 8, cols: 8, isIntersectionBased: false, bg: '#333', cellSize: 80, padding: 0, light: '#ebecd0', dark: '#779556' };
            case 'gomoku':
            default:
                return { rows: 15, cols: 15, isIntersectionBased: true, bg: '#E1C699', cellSize: 45, padding: 30 };
        }
    }, [gameType]);

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

        // Kiểm tra tính hợp lệ của tọa độ trước khi gọi callback
        if (row >= 0 && row < rows && col >= 0 && col < cols) {
            if (onSquareClick) onSquareClick(row, col);
        }
    };

    // 3. UI Lưới Cờ Caro (Gomoku)
    const renderGomokuGrid = () => {
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
            const centerX = isIntersectionBased ? move.col * cellSize : move.col * cellSize + cellSize / 2;
            const centerY = isIntersectionBased ? move.row * cellSize : move.row * cellSize + cellSize / 2;

            const targetPiece = boardState[move.row]?.[move.col];

            return (
                <Group key={`hint-${idx}`} x={centerX} y={centerY}>
                    {targetPiece ? (
                        <Circle radius={cellSize * 0.4} stroke="rgba(0, 255, 0, 0.4)" strokeWidth={4} />
                    ) : (
                        <Circle radius={cellSize * 0.15} fill="rgba(0, 255, 0, 0.4)" />
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

                const centerX = isIntersectionBased ? c * cellSize : c * cellSize + cellSize / 2;
                const centerY = isIntersectionBased ? r * cellSize : r * cellSize + cellSize / 2;

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
        if (type === 'gomoku') {
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
        <div className="flex justify-center items-center w-full overflow-auto">
            <Stage width={stageWidth} height={stageHeight} onMouseDown={handleCanvasClick} onTouchStart={handleCanvasClick}>
                <Layer>
                    <Rect x={0} y={0} width={stageWidth} height={stageHeight} fill={bg} shadowColor="#000" shadowBlur={10} shadowOpacity={0.3} cornerRadius={8} />
                </Layer>

                <Layer x={padding} y={padding}>
                    {gameType === 'gomoku' && renderGomokuGrid()}
                    {gameType === 'xiangqi' && renderXiangqiGrid()}
                    {gameType === 'chess' && renderChessGrid()}

                    {selectedSquare && (
                        <Rect
                            x={(isIntersectionBased ? selectedSquare.col : selectedSquare.col) * cellSize - (isIntersectionBased ? cellSize / 2 : 0)}
                            y={(isIntersectionBased ? selectedSquare.row : selectedSquare.row) * cellSize - (isIntersectionBased ? cellSize / 2 : 0)}
                            width={cellSize}
                            height={cellSize}
                            fill="rgba(255, 255, 0, 0.3)"
                        />
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
