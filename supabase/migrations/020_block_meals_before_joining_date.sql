-- Block meal entries for dates before member's joining_date
-- Fires BEFORE INSERT OR UPDATE on meals table

CREATE OR REPLACE FUNCTION fn_block_meal_before_joining()
RETURNS TRIGGER AS $$
DECLARE
  v_joining_date DATE;
BEGIN
  SELECT joining_date INTO v_joining_date
  FROM mess_members
  WHERE id = NEW.member_id;

  IF v_joining_date IS NOT NULL AND NEW.date < v_joining_date THEN
    RAISE EXCEPTION
      'Meal date (%) is before member joining date (%). Cannot add meal before joining.',
      NEW.date, v_joining_date
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_block_meal_before_joining ON meals;

CREATE TRIGGER trg_block_meal_before_joining
  BEFORE INSERT OR UPDATE ON meals
  FOR EACH ROW
  EXECUTE FUNCTION fn_block_meal_before_joining();
