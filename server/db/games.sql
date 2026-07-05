CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(6),
  white_player VARCHAR(50),
  black_player VARCHAR(50),
  winner VARCHAR(10), -- 'white', 'black', 'draw'
  end_reason VARCHAR(20), -- 'checkmate', 'timeout', 'resign', 'draw'
  moves JSONB, -- RecordedMove[] dizisi
  total_moves INTEGER,
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert" ON games FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon read" ON games FOR SELECT TO anon USING (true);
