import { createClient } from '@supabase/supabase-js';
import type { Room } from '../rooms.js';
import { buildRecordedMoveHistory } from '../../../shared/notation.js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export type EndReason = 'checkmate' | 'timeout' | 'resign' | 'draw';

export async function saveGameResult(room: Room, winner: string | null, endReason: EndReason) {
  if (!supabase) {
    console.warn('[db] Supabase credentials missing. Game not saved.');
    return;
  }

  const result = winner ?? 'draw';

  try {
    const { error } = await supabase.from('games').insert({
      room_code: room.id,
      white_player: room.white,
      black_player: room.black,
      winner: result,
      end_reason: endReason,
      moves: buildRecordedMoveHistory(room.gameState.moveHistory),
      total_moves: room.gameState.moveHistory.length,
      duration_seconds: Math.round((Date.now() - room.createdAt.getTime()) / 1000),
    });

    if (error) {
      console.error('[db] Error saving game:', error);
    } else {
      console.log(`[db] Game ${room.id} saved. Winner: ${result}`);
    }
  } catch (err) {
    console.error('[db] Failed to save game:', err);
  }
}
