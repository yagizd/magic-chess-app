import { describe, it, expect } from 'vitest';
import type { Board, Color, Piece, PieceType } from './types.js';
import {
  getMovementType,
  getValidMoves,
  isKingInCheck,
  isCheckmate,
  isStalemate,
  applyMove,
  createInitialGameState,
} from './rules.js';

const empty = (): Board =>
  Array.from({ length: 8 }, () => Array<Piece | null>(8).fill(null));

const place = (
  board: Board,
  row: number,
  col: number,
  type: PieceType,
  color: Color,
  hasMoved = false,
): void => {
  board[row][col] = { type, color, hasMoved };
};

const has = (
  moves: ReturnType<typeof getValidMoves>,
  row: number,
  col: number,
): boolean => moves.some((m) => m.to.row === row && m.to.col === col);

describe('getMovementType — sütun kuralı', () => {
  const w: Color = 'white';
  it('king/queen/pawn sütundan bağımsız, her zaman kendi tipi', () => {
    expect(getMovementType({ type: 'king', color: w, hasMoved: false }, 0)).toBe('king');
    expect(getMovementType({ type: 'queen', color: w, hasMoved: false }, 0)).toBe('queen');
    expect(getMovementType({ type: 'pawn', color: w, hasMoved: false }, 0)).toBe('pawn');
    expect(getMovementType({ type: 'king', color: w, hasMoved: false }, 3)).toBe('king');
    expect(getMovementType({ type: 'queen', color: w, hasMoved: false }, 7)).toBe('queen');
  });

  it('rook/bishop/knight: a (0) ve h (7) sütunu → rook', () => {
    expect(getMovementType({ type: 'bishop', color: w, hasMoved: false }, 0)).toBe('rook');
    expect(getMovementType({ type: 'knight', color: w, hasMoved: false }, 7)).toBe('rook');
  });

  it('rook/bishop/knight: b (1) ve g (6) sütunu → knight', () => {
    expect(getMovementType({ type: 'rook', color: w, hasMoved: false }, 1)).toBe('knight');
    expect(getMovementType({ type: 'bishop', color: w, hasMoved: false }, 6)).toBe('knight');
  });

  it('rook/bishop/knight: c (2) ve f (5) sütunu → bishop', () => {
    expect(getMovementType({ type: 'rook', color: w, hasMoved: false }, 2)).toBe('bishop');
    expect(getMovementType({ type: 'knight', color: w, hasMoved: false }, 5)).toBe('bishop');
  });

  it('rook/bishop/knight: d (3) ve e (4) sütunu → kendi doğal hareketi', () => {
    expect(getMovementType({ type: 'rook', color: w, hasMoved: false }, 3)).toBe('rook');
    expect(getMovementType({ type: 'bishop', color: w, hasMoved: false }, 4)).toBe('bishop');
    expect(getMovementType({ type: 'knight', color: w, hasMoved: false }, 3)).toBe('knight');
  });
});

describe('Sütun kuralı hareket testleri', () => {
  it("b sütunundaki Kale, L şeklinde (knight) hareket eder", () => {
    const b = empty();
    place(b, 7, 4, 'king', 'white');
    place(b, 0, 4, 'king', 'black');
    place(b, 4, 1, 'rook', 'white'); // b sütunu (col=1)
    const moves = getValidMoves(b, 4, 1, null);
    // Knight hamleleri: (4±1, 1±2) ve (4±2, 1±1) içinde sınırlar dahilinde olanlar
    expect(has(moves, 6, 0)).toBe(true);
    expect(has(moves, 6, 2)).toBe(true);
    expect(has(moves, 2, 0)).toBe(true);
    expect(has(moves, 2, 2)).toBe(true);
    expect(has(moves, 5, 3)).toBe(true);
    expect(has(moves, 3, 3)).toBe(true);
    // Düz hareket yapamaz (rook hareketi yasak)
    expect(has(moves, 4, 0)).toBe(false);
    expect(has(moves, 4, 7)).toBe(false);
    expect(has(moves, 0, 1)).toBe(false);
  });

  it("a sütunundaki At, kale gibi hareket eder", () => {
    const b = empty();
    place(b, 7, 4, 'king', 'white');
    place(b, 0, 4, 'king', 'black');
    place(b, 4, 0, 'knight', 'white'); // a sütunu
    const moves = getValidMoves(b, 4, 0, null);
    // Sütunda her yere
    expect(has(moves, 0, 0)).toBe(true);
    expect(has(moves, 7, 0)).toBe(true);
    // Satırda her yere (sınırlamasız, boş tahta)
    expect(has(moves, 4, 7)).toBe(true);
    // L hareketi yok artık
    expect(has(moves, 6, 1)).toBe(false);
    expect(has(moves, 2, 1)).toBe(false);
  });

  it("c sütunundaki Kale, fil gibi hareket eder; aynı sütundaki şahı tehdit etmez", () => {
    const b = empty();
    place(b, 7, 7, 'king', 'white');
    place(b, 5, 2, 'king', 'black');     // siyah şah c3 (row 5, col 2)
    place(b, 2, 2, 'rook', 'white');     // beyaz "kale" c6 (row 2, col 2) → bishop hareketi
    // Beyaz Kale c6'dan c3'teki şahı düz aşağı tehdit edemez (çapraz değil)
    expect(isKingInCheck(b, 'black')).toBe(false);
  });

  it("c sütunundaki Kale, çapraz boyunca rakip şahı tehdit eder", () => {
    const b = empty();
    place(b, 7, 7, 'king', 'white');
    place(b, 5, 5, 'king', 'black');     // siyah şah f3
    place(b, 2, 2, 'rook', 'white');     // beyaz "kale" c6 → bishop hareketi
    // c6 → f3 çaprazı (Δrow=+3, Δcol=+3) bishop için geçerli
    expect(isKingInCheck(b, 'black')).toBe(true);
  });

  it("d sütununda Kale, kendi doğal hareketiyle (kale gibi) gider", () => {
    const b = empty();
    place(b, 7, 7, 'king', 'white');
    place(b, 0, 0, 'king', 'black');
    place(b, 4, 3, 'rook', 'white'); // d sütunu
    const moves = getValidMoves(b, 4, 3, null);
    expect(has(moves, 4, 0)).toBe(true);
    expect(has(moves, 4, 7)).toBe(true);
    expect(has(moves, 0, 3)).toBe(true);
    expect(has(moves, 7, 3)).toBe(true);
    // Çapraz hareket yok
    expect(has(moves, 5, 4)).toBe(false);
    expect(has(moves, 3, 2)).toBe(false);
  });

  it("Vezir sütundan bağımsızdır — a sütununda bile vezir gibi (çapraz) hareket eder", () => {
    const b = empty();
    place(b, 7, 7, 'king', 'white');
    place(b, 0, 7, 'king', 'black');
    place(b, 4, 0, 'queen', 'white'); // a sütununda vezir
    const moves = getValidMoves(b, 4, 0, null);
    // Çapraz hamleler vezirin işareti — kale olsaydı yapamazdı
    expect(has(moves, 0, 4)).toBe(true);
    expect(has(moves, 7, 3)).toBe(true);
    expect(has(moves, 5, 1)).toBe(true);
  });

  it("Promosyon: Vezire yükselen piyon sütundan bağımsız vezir gibi hareket eder", () => {
    // Beyaz piyon a7'den a8'e ilerleyip vezire yükseliyor.
    const b = empty();
    place(b, 7, 4, 'king', 'white');
    place(b, 0, 7, 'king', 'black');
    place(b, 1, 0, 'pawn', 'white');
    const state = {
      board: b,
      currentTurn: 'white' as Color,
      moveHistory: [],
      enPassantTarget: null,
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      winner: null,
    };
    const next = applyMove(state, {
      from: { row: 1, col: 0 },
      to: { row: 0, col: 0 },
      promotion: 'queen',
    });
    expect(next.board[0][0]?.type).toBe('queen');
    // a sütunundayken bile vezir gibi: çapraz hamleler mevcut olmalı
    const qMoves = getValidMoves(next.board, 0, 0, next.enPassantTarget);
    expect(qMoves.some((m) => m.to.row === 6 && m.to.col === 6)).toBe(true);  // a8→g2 çaprazı
    expect(qMoves.some((m) => m.to.row === 1 && m.to.col === 1)).toBe(true);  // a8→b7 çaprazı
    // Düz hatlar da var
    expect(qMoves.some((m) => m.to.row === 0 && m.to.col === 6)).toBe(true);
    expect(qMoves.some((m) => m.to.row === 6 && m.to.col === 0)).toBe(true);
  });

  it("Promosyon: Kaleye yükselen piyon sütun kuralına tabi kalır", () => {
    // Beyaz piyon b7'den b8'e ilerleyip kaleye yükseliyor.
    const b = empty();
    place(b, 7, 0, 'king', 'white');
    place(b, 0, 7, 'king', 'black');
    place(b, 1, 1, 'pawn', 'white');
    const state = {
      board: b,
      currentTurn: 'white' as Color,
      moveHistory: [],
      enPassantTarget: null,
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      winner: null,
    };
    const next = applyMove(state, {
      from: { row: 1, col: 1 },
      to: { row: 0, col: 1 },
      promotion: 'rook',
    });
    expect(next.board[0][1]?.type).toBe('rook');
    // b8 = col 1 → knight hareketi
    const moves = getValidMoves(next.board, 0, 1, next.enPassantTarget);
    expect(moves.some((m) => m.to.row === 2 && m.to.col === 0)).toBe(true);
    expect(moves.some((m) => m.to.row === 2 && m.to.col === 2)).toBe(true);
    // Düz hat (kale) hareketi yapamaz
    expect(moves.some((m) => m.to.row === 0 && m.to.col === 7)).toBe(false);
    expect(moves.some((m) => m.to.row === 7 && m.to.col === 1)).toBe(false);
  });
});

describe('Şah / Mat / Pat', () => {
  it('Başlangıç durumunda şah yok ve hamleler hesaplanabilir', () => {
    const s = createInitialGameState();
    expect(s.isCheck).toBe(false);
    expect(s.isCheckmate).toBe(false);
    expect(isKingInCheck(s.board, 'white')).toBe(false);
    expect(isKingInCheck(s.board, 'black')).toBe(false);
  });

  it('Klasik back-rank mat: siyah şah a8, beyaz kale h8 → mat', () => {
    const b = empty();
    place(b, 0, 0, 'king', 'black', true);
    place(b, 7, 4, 'king', 'white', true);
    place(b, 0, 7, 'rook', 'white', true); // h8: col 7 → kale gibi
    place(b, 1, 0, 'pawn', 'black', true);
    place(b, 1, 1, 'pawn', 'black', true);
    expect(isKingInCheck(b, 'black')).toBe(true);
    expect(isCheckmate(b, 'black')).toBe(true);
  });

  it('Klasik pat: sadece şah, hareket edemez ama tehdit altında değil', () => {
    const b = empty();
    place(b, 0, 0, 'king', 'black', true);
    place(b, 2, 1, 'king', 'white', true);
    place(b, 1, 2, 'queen', 'white', true);
    expect(isKingInCheck(b, 'black')).toBe(false);
    expect(isStalemate(b, 'black')).toBe(true);
  });
});

describe('Rok', () => {
  it('Beyaz kısa rok yapabilir (boş tahta, koşullar uygunsa)', () => {
    const b = empty();
    place(b, 7, 4, 'king', 'white');
    place(b, 7, 7, 'rook', 'white');
    place(b, 7, 0, 'rook', 'white');
    place(b, 0, 4, 'king', 'black');
    const moves = getValidMoves(b, 7, 4, null);
    expect(moves.some((m) => m.isCastling && m.to.col === 6)).toBe(true);
    expect(moves.some((m) => m.isCastling && m.to.col === 2)).toBe(true);
  });

  it('Şah önceden hareket etmişse rok yapılamaz', () => {
    const b = empty();
    place(b, 7, 4, 'king', 'white', true);
    place(b, 7, 7, 'rook', 'white');
    place(b, 0, 4, 'king', 'black');
    const moves = getValidMoves(b, 7, 4, null);
    expect(moves.some((m) => m.isCastling)).toBe(false);
  });
});

describe('En Passant', () => {
  it('Siyah piyon iki kare ilerlerse, beyaz piyon en passant ile alabilir', () => {
    // Beyaz piyon e5 (row 3, col 4); siyah piyon d7→d5 hamlesi yapılır.
    const b = empty();
    place(b, 7, 0, 'king', 'white');
    place(b, 0, 7, 'king', 'black');
    place(b, 3, 4, 'pawn', 'white', true);
    place(b, 1, 3, 'pawn', 'black');
    const state = {
      board: b,
      currentTurn: 'black' as Color,
      moveHistory: [],
      enPassantTarget: null,
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      winner: null,
    };
    const after = applyMove(state, {
      from: { row: 1, col: 3 },
      to: { row: 3, col: 3 },
    });
    expect(after.enPassantTarget).toEqual({ row: 2, col: 3 });
    const wMoves = getValidMoves(after.board, 3, 4, after.enPassantTarget);
    const ep = wMoves.find((m) => m.isEnPassant);
    expect(ep).toBeDefined();
    expect(ep?.to).toEqual({ row: 2, col: 3 });
  });
});

describe('Başlangıç hamle sayısı (klasik 20)', () => {
  it('Başlangıçta beyazın 20 yasal hamlesi vardır', () => {
    const s = createInitialGameState();
    let count = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = s.board[r][c];
        if (p && p.color === 'white') {
          count += getValidMoves(s.board, r, c, s.enPassantTarget).length;
        }
      }
    }
    expect(count).toBe(20);
  });
});
