-- Create enum for position types
CREATE TYPE position_type AS ENUM ('president', 'vice_president', 'secretary', 'treasurer', 'member', 'board_member');

-- Create positions table
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type position_type NOT NULL,
  quorum_weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create members table
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  id_number TEXT UNIQUE,
  position_id UUID REFERENCES positions(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create guests table
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  id_number TEXT,
  organization TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assembly sessions table
CREATE TABLE assembly_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  quorum_required INTEGER NOT NULL DEFAULT 50,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create attendance records table
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES assembly_sessions(id) ON DELETE CASCADE,
  attendee_type TEXT NOT NULL CHECK (attendee_type IN ('member', 'guest')),
  member_id UUID REFERENCES members(id),
  guest_id UUID REFERENCES guests(id),
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  is_present BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT attendee_check CHECK (
    (attendee_type = 'member' AND member_id IS NOT NULL AND guest_id IS NULL) OR
    (attendee_type = 'guest' AND guest_id IS NOT NULL AND member_id IS NULL)
  )
);

-- Enable RLS
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your security needs)
CREATE POLICY "Allow public read access to positions" ON positions FOR SELECT USING (true);
CREATE POLICY "Allow public read access to members" ON members FOR SELECT USING (true);
CREATE POLICY "Allow public insert to members" ON members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to members" ON members FOR UPDATE USING (true);
CREATE POLICY "Allow public read access to guests" ON guests FOR SELECT USING (true);
CREATE POLICY "Allow public insert to guests" ON guests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to sessions" ON assembly_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert to sessions" ON assembly_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to sessions" ON assembly_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow public read access to attendance" ON attendance_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert to attendance" ON attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to attendance" ON attendance_records FOR UPDATE USING (true);

-- Insert default positions
INSERT INTO positions (name, type, quorum_weight) VALUES
  ('President', 'president', 1),
  ('Vice President', 'vice_president', 1),
  ('Secretary', 'secretary', 1),
  ('Treasurer', 'treasurer', 1),
  ('Board Member', 'board_member', 1),
  ('General Member', 'member', 1);

-- Create indexes for better performance
CREATE INDEX idx_members_position ON members(position_id);
CREATE INDEX idx_attendance_session ON attendance_records(session_id);
CREATE INDEX idx_attendance_member ON attendance_records(member_id);
CREATE INDEX idx_attendance_guest ON attendance_records(guest_id);
CREATE INDEX idx_attendance_present ON attendance_records(is_present);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for members updated_at
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();