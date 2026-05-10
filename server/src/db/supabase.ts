import { createClient } from '@supabase/supabase-js';
import type { Room } from '../rooms.js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export async function saveMatchResult(room: Room, winner: string | null) {
  if (!supabase) {
    console.warn('[db] Supabase credentials missing. Match not saved.');
    return;
  }

  let result = 'draw';
  if (winner) {
    result = winner;
  }

  try {
    const { error } = await supabase.from('matches').insert({
      room_id: room.id,
      white_socket: room.white,
      black_socket: room.black,
      winner: result,
      moves: room.gameState.moveHistory,
    });

    if (error) {
      console.error('[db] Error saving match:', error);
    } else {
      console.log(`[db] Match ${room.id} saved. Winner: ${result}`);
    }
  } catch (err) {
    console.error('[db] Failed to save match:', err);
  }
}
