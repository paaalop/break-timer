-- Run as the database owner in the break-timer project (pqqelfnsulqfdjrwlbly).
-- No employee/schedule data is changed. Missing administrator accounts abort the transaction.
BEGIN;

CREATE SCHEMA IF NOT EXISTS break_timer_private;
REVOKE ALL ON SCHEMA break_timer_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA break_timer_private TO authenticated;

CREATE TABLE IF NOT EXISTS break_timer_private.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
REVOKE ALL ON TABLE break_timer_private.admin_users FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT id INTO STRICT admin_id
    FROM auth.users
    WHERE lower(email) = lower('admin@test.com')
      AND email_confirmed_at IS NOT NULL
      AND NOT coalesce(is_anonymous, false);

    INSERT INTO break_timer_private.admin_users (user_id)
    VALUES (admin_id)
    ON CONFLICT (user_id) DO NOTHING;
EXCEPTION
    WHEN no_data_found THEN
        RAISE EXCEPTION 'Confirmed app administrator admin@test.com was not found in Supabase Auth. No security changes were applied.';
    WHEN too_many_rows THEN
        RAISE EXCEPTION 'Administrator email matched multiple Auth users. No security changes were applied.';
END;
$$;

CREATE OR REPLACE FUNCTION break_timer_private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM break_timer_private.admin_users
        WHERE user_id = (SELECT auth.uid())
    );
$$;
REVOKE ALL ON FUNCTION break_timer_private.is_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION break_timer_private.is_admin() TO authenticated;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['employees', 'work_schedules', 'daily_break_settings']
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', table_name);

        EXECUTE format('DROP POLICY IF EXISTS break_timer_admin_only ON public.%I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS break_timer_admin_access ON public.%I', table_name);

        -- The restrictive gate also constrains any pre-existing permissive policies.
        EXECUTE format(
            'CREATE POLICY break_timer_admin_only ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT break_timer_private.is_admin())) WITH CHECK ((SELECT break_timer_private.is_admin()))',
            table_name
        );
        EXECUTE format(
            'CREATE POLICY break_timer_admin_access ON public.%I AS PERMISSIVE FOR ALL TO authenticated USING ((SELECT break_timer_private.is_admin())) WITH CHECK ((SELECT break_timer_private.is_admin()))',
            table_name
        );
    END LOOP;
END;
$$;

COMMIT;
