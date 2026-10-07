-- Run as the database owner after the security migration. All session changes are rolled back.
BEGIN;

DO $$
DECLARE
    table_name TEXT;
    action TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['employees', 'work_schedules', 'daily_break_settings']
    LOOP
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = format('public.%I', table_name)::regclass) THEN
            RAISE EXCEPTION 'RLS is disabled on %', table_name;
        END IF;
        FOREACH action IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']
        LOOP
            IF has_table_privilege('anon', format('public.%I', table_name), action) THEN
                RAISE EXCEPTION 'Anonymous role has % access to %', action, table_name;
            END IF;
        END LOOP;
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name
            AND policyname = 'break_timer_admin_only' AND permissive = 'RESTRICTIVE'
        ) THEN
            RAISE EXCEPTION 'Restrictive administrator policy missing on %', table_name;
        END IF;
    END LOOP;
    IF has_table_privilege('authenticated', 'break_timer_private.admin_users', 'INSERT')
       OR has_table_privilege('authenticated', 'break_timer_private.admin_users', 'UPDATE')
       OR has_table_privilege('authenticated', 'break_timer_private.admin_users', 'DELETE') THEN
        RAISE EXCEPTION 'Clients can modify the administrator allowlist';
    END IF;
END;
$$;

SELECT set_config('request.jwt.claims', json_build_object(
    'sub', user_id::text, 'role', 'authenticated'
)::text, true), set_config('request.jwt.claim.sub', user_id::text, true)
FROM break_timer_private.admin_users
WHERE user_id = (SELECT id FROM auth.users WHERE lower(email) = lower('admin@test.com'));
SET LOCAL ROLE authenticated;
DO $$
BEGIN
    IF NOT break_timer_private.is_admin() THEN
        RAISE EXCEPTION 'Registered administrator cannot access data';
    END IF;
    PERFORM 1 FROM public.employees LIMIT 1;
    PERFORM 1 FROM public.work_schedules LIMIT 1;
    PERFORM 1 FROM public.daily_break_settings LIMIT 1;
END;
$$;
RESET ROLE;

-- A UUID not present in the allowlist represents an unrelated authenticated user.
SELECT set_config('request.jwt.claims', json_build_object(
    'sub', candidate::text, 'role', 'authenticated'
)::text, true), set_config('request.jwt.claim.sub', candidate::text, true)
FROM (SELECT gen_random_uuid() AS candidate) AS test_user
WHERE NOT EXISTS (SELECT 1 FROM break_timer_private.admin_users WHERE user_id = candidate);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
    IF break_timer_private.is_admin() THEN
        RAISE EXCEPTION 'Unregistered user has administrator access';
    END IF;
    IF EXISTS (SELECT 1 FROM public.employees)
       OR EXISTS (SELECT 1 FROM public.work_schedules)
       OR EXISTS (SELECT 1 FROM public.daily_break_settings) THEN
        RAISE EXCEPTION 'Unregistered user can read application data';
    END IF;
END;
$$;

ROLLBACK;
SELECT 'Administrator access checks passed' AS result;
