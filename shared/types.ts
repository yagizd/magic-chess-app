export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type Color = 'white' | 'black';
export type PromotionType = Exclude<PieceType, 'king' | 'pawn'>;

export interface TimeControl {
  id: string;
  label: string;
  minutes: number;
  increment: number;
}

export interface Piece {
  type: PieceType;
  color: Color;
  hasMoved: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export type Board = (Piece | null)[][];

export interface Move {
  from: Position;
  to: Position;
  promotion?: PromotionType;
  isCastling?: boolean;
  isEnPassant?: boolean;
}

export interface GameState {
  board: Board;
  currentTurn: Color;
  moveHistory: Move[];
  enPassantTarget: Position | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isTimeout?: boolean;
  winner: Color | null;
}

export interface Room {
  id: string;
  white: string | null;
  black: string | null;
  gameState: GameState;
  createdAt: Date;
}
