-- Run this in your Supabase SQL Editor

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  white_socket TEXT,
  black_socket TEXT,
  winner TEXT, -- 'white', 'black', veya 'draw'
  moves JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- İsteğe bağlı: Tablo için güvenlik (RLS) ayarı (herkese açık ekleme/okuma)
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read"
ON matches FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous insert"
ON matches FOR INSERT
TO anon
WITH CHECK (true);
