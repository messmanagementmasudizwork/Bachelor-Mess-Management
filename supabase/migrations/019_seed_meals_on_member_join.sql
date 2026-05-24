-- Trigger: automatically seed meal entries for a new member
-- Fires after INSERT on mess_members
-- Creates meal entries from today to end of mess's current_month
-- based on member's meal_default_breakfast/lunch/dinner

CREATE OR REPLACE FUNCTION fn_seed_meals_for_new_member()
RETURNS TRIGGER AS $$
DECLARE
  v_current_month TEXT;
  v_month_start   DATE;
  v_month_end     DATE;
  v_today         DATE;
  v_day           DATE;
BEGIN
  -- Only seed for active members
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Get the mess's current_month (e.g. '2026-05')
  SELECT current_month INTO v_current_month
  FROM messes
  WHERE id = NEW.mess_id;

  -- Fallback to current month if not set
  IF v_current_month IS NULL THEN
    v_current_month := TO_CHAR(NOW() AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM');
  END IF;

  v_today       := (NOW() AT TIME ZONE 'Asia/Dhaka')::DATE;
  v_month_start := (v_current_month || '-01')::DATE;
  v_month_end   := (v_month_start + INTERVAL '1 month - 1 day')::DATE;

  -- Seed from today (or month start if today is before it) to end of month
  FOR v_day IN
    SELECT gs::DATE
    FROM generate_series(
      GREATEST(v_month_start, v_today),
      v_month_end,
      '1 day'::INTERVAL
    ) gs
  LOOP
    INSERT INTO meals (
      mess_id, member_id, date,
      breakfast, lunch, dinner,
      guest_breakfast, guest_lunch, guest_dinner,
      created_by
    )
    VALUES (
      NEW.mess_id,
      NEW.id,
      v_day,
      COALESCE(NEW.meal_default_breakfast, TRUE),
      COALESCE(NEW.meal_default_lunch,     TRUE),
      COALESCE(NEW.meal_default_dinner,    TRUE),
      0, 0, 0,
      NEW.user_id
    )
    ON CONFLICT (mess_id, member_id, date) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists (safe re-run)
DROP TRIGGER IF EXISTS trg_seed_meals_for_new_member ON mess_members;

CREATE TRIGGER trg_seed_meals_for_new_member
  AFTER INSERT ON mess_members
  FOR EACH ROW
  EXECUTE FUNCTION fn_seed_meals_for_new_member();
