-- ============================================================
-- DATABASE FUNCTIONS & TRIGGERS
-- ============================================================

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER messes_updated_at BEFORE UPDATE ON messes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER mess_members_updated_at BEFORE UPDATE ON mess_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER meals_updated_at BEFORE UPDATE ON meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER deposits_updated_at BEFORE UPDATE ON deposits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- GENERATE INVITE CODE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate invite code for new messes
CREATE OR REPLACE FUNCTION auto_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    LOOP
      NEW.invite_code := generate_invite_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM messes WHERE invite_code = NEW.invite_code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messes_auto_invite_code BEFORE INSERT ON messes
  FOR EACH ROW EXECUTE FUNCTION auto_invite_code();

-- ============================================================
-- JOIN MESS BY INVITE CODE
-- ============================================================

CREATE OR REPLACE FUNCTION join_mess_by_invite(
  p_invite_code TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_mess_id UUID;
  v_existing UUID;
BEGIN
  -- Find mess by invite code
  SELECT id INTO v_mess_id
  FROM messes
  WHERE invite_code = UPPER(p_invite_code) AND status = 'active';

  IF v_mess_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code or mess not found';
  END IF;

  -- Check if already a member
  SELECT id INTO v_existing
  FROM mess_members
  WHERE mess_id = v_mess_id AND user_id = p_user_id;

  IF v_existing IS NOT NULL THEN
    -- Reactivate if removed
    UPDATE mess_members
    SET status = 'active', updated_at = NOW()
    WHERE id = v_existing AND status = 'removed';
    RETURN v_mess_id;
  END IF;

  -- Add as new member
  INSERT INTO mess_members (mess_id, user_id, role, status, joining_date)
  VALUES (v_mess_id, p_user_id, 'member', 'active', CURRENT_DATE);

  -- Create notification
  INSERT INTO notifications (user_id, mess_id, type, title, body)
  VALUES (
    p_user_id, v_mess_id, 'member_joined',
    'মেসে যোগ দিয়েছেন',
    'আপনি সফলভাবে মেসে যোগ দিয়েছেন'
  );

  RETURN v_mess_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CALCULATE MEAL RATE
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_meal_rate(
  p_mess_id UUID,
  p_month TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  v_total_variable NUMERIC;
  v_total_meals INTEGER;
  v_rate NUMERIC;
BEGIN
  -- Get total variable expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_total_variable
  FROM expenses
  WHERE mess_id = p_mess_id AND month = p_month
    AND is_variable = TRUE AND status = 'approved';

  -- Get total meals
  SELECT COALESCE(
    SUM(
      (CASE WHEN breakfast THEN 1 ELSE 0 END) +
      (CASE WHEN lunch THEN 1 ELSE 0 END) +
      (CASE WHEN dinner THEN 1 ELSE 0 END) +
      guest_breakfast + guest_lunch + guest_dinner
    ), 0
  ) INTO v_total_meals
  FROM meals m
  JOIN mess_members mm ON m.member_id = mm.id
  WHERE mm.mess_id = p_mess_id
    AND TO_CHAR(m.date, 'YYYY-MM') = p_month;

  IF v_total_meals = 0 THEN
    RETURN 0;
  END IF;

  v_rate := ROUND(v_total_variable / v_total_meals, 2);
  RETURN v_rate;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- GET MEMBER BALANCE
-- ============================================================

CREATE OR REPLACE FUNCTION get_member_balance(
  p_member_id UUID,
  p_mess_id UUID,
  p_month TEXT
)
RETURNS TABLE(
  total_deposited NUMERIC,
  total_meal_cost NUMERIC,
  total_fixed_share NUMERIC,
  total_cost NUMERIC,
  balance NUMERIC,
  due_amount NUMERIC,
  advance_amount NUMERIC
) AS $$
DECLARE
  v_meal_rate NUMERIC;
  v_total_meals INTEGER;
  v_meal_cost NUMERIC;
  v_total_deposited NUMERIC;
  v_total_fixed NUMERIC;
  v_active_members INTEGER;
  v_fixed_share NUMERIC;
  v_balance NUMERIC;
BEGIN
  -- Get meal rate
  v_meal_rate := calculate_meal_rate(p_mess_id, p_month);

  -- Get member's total meals
  SELECT COALESCE(SUM(
    (CASE WHEN breakfast THEN 1 ELSE 0 END) +
    (CASE WHEN lunch THEN 1 ELSE 0 END) +
    (CASE WHEN dinner THEN 1 ELSE 0 END) +
    guest_breakfast + guest_lunch + guest_dinner
  ), 0) INTO v_total_meals
  FROM meals
  WHERE member_id = p_member_id AND TO_CHAR(date, 'YYYY-MM') = p_month;

  v_meal_cost := ROUND(v_total_meals * v_meal_rate, 2);

  -- Get total deposits
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposited
  FROM deposits
  WHERE member_id = p_member_id AND month = p_month AND status = 'confirmed';

  -- Get fixed expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_total_fixed
  FROM expenses
  WHERE mess_id = p_mess_id AND month = p_month
    AND is_variable = FALSE AND status = 'approved';

  -- Count active members
  SELECT COUNT(*) INTO v_active_members
  FROM mess_members
  WHERE mess_id = p_mess_id AND status = 'active';

  IF v_active_members > 0 THEN
    v_fixed_share := ROUND(v_total_fixed / v_active_members, 2);
  ELSE
    v_fixed_share := 0;
  END IF;

  v_balance := v_total_deposited - (v_meal_cost + v_fixed_share);

  RETURN QUERY SELECT
    v_total_deposited,
    v_meal_cost,
    v_fixed_share,
    ROUND(v_meal_cost + v_fixed_share, 2),
    ROUND(v_balance, 2),
    CASE WHEN v_balance < 0 THEN ROUND(ABS(v_balance), 2) ELSE 0 END,
    CASE WHEN v_balance > 0 THEN ROUND(v_balance, 2) ELSE 0 END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- VIEWS
-- ============================================================

-- Daily meal summary view
CREATE OR REPLACE VIEW daily_meal_summary AS
SELECT
  mm.mess_id,
  m.date,
  COUNT(*) FILTER (WHERE m.breakfast) AS total_breakfast,
  COUNT(*) FILTER (WHERE m.lunch) AS total_lunch,
  COUNT(*) FILTER (WHERE m.dinner) AS total_dinner,
  SUM(m.guest_breakfast + m.guest_lunch + m.guest_dinner) AS total_guest,
  COUNT(*) FILTER (WHERE m.breakfast) +
  COUNT(*) FILTER (WHERE m.lunch) +
  COUNT(*) FILTER (WHERE m.dinner) +
  SUM(m.guest_breakfast + m.guest_lunch + m.guest_dinner) AS total_meals
FROM meals m
JOIN mess_members mm ON m.member_id = mm.id
GROUP BY mm.mess_id, m.date;

-- Monthly expense summary view
CREATE OR REPLACE VIEW monthly_expense_summary AS
SELECT
  mess_id,
  month,
  SUM(amount) FILTER (WHERE is_variable AND status = 'approved') AS total_variable,
  SUM(amount) FILTER (WHERE NOT is_variable AND status = 'approved') AS total_fixed,
  SUM(amount) FILTER (WHERE status = 'approved') AS total_expense
FROM expenses
GROUP BY mess_id, month;

-- ============================================================
-- CLOSE MONTH FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION close_month(
  p_mess_id UUID,
  p_month TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_next_month TEXT;
BEGIN
  -- Verify caller is admin
  IF NOT is_mess_admin(p_mess_id, p_user_id) THEN
    RAISE EXCEPTION 'Only admins can close a month';
  END IF;

  -- Update mess current month
  v_next_month := TO_CHAR(
    TO_DATE(p_month || '-01', 'YYYY-MM-DD') + INTERVAL '1 month',
    'YYYY-MM'
  );

  UPDATE messes
  SET
    is_month_closed = TRUE,
    current_month = v_next_month,
    updated_at = NOW()
  WHERE id = p_mess_id AND current_month = p_month;

  -- Log to audit
  INSERT INTO audit_logs (mess_id, user_id, action, entity_type, entity_id)
  VALUES (p_mess_id, p_user_id, 'month_closed', 'mess', p_mess_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- AUDIT LOG TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value)
    VALUES (auth.uid(), 'delete', TG_TABLE_NAME, OLD.id, row_to_json(OLD));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (auth.uid(), 'update', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (auth.uid(), 'create', TG_TABLE_NAME, NEW.id, row_to_json(NEW));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to financial tables
CREATE TRIGGER expenses_audit AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER deposits_audit AFTER INSERT OR UPDATE OR DELETE ON deposits
  FOR EACH ROW EXECUTE FUNCTION log_audit();
