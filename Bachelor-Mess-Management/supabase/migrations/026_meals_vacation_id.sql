-- Add vacation_id to meals to track which meals were turned off by vacation system
ALTER TABLE meals ADD COLUMN IF NOT EXISTS vacation_id UUID REFERENCES mess_vacations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meals_vacation_id ON meals(vacation_id) WHERE vacation_id IS NOT NULL;
