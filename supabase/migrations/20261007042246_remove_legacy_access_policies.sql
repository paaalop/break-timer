-- Apply after 20261007000001_secure_admin_access.sql, as the database owner.
-- Remove obsolete broad policies reported by the Security Advisor.
BEGIN;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['employees', 'work_schedules']
    LOOP
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = format('public.%I', table_name)::regclass)
           OR NOT EXISTS (
               SELECT 1 FROM pg_policies
               WHERE schemaname = 'public' AND tablename = table_name
                 AND policyname = 'break_timer_admin_only'
                 AND permissive = 'RESTRICTIVE' AND cmd = 'ALL'
                 AND 'authenticated'::name = ANY(roles)
                 AND qual LIKE '%break_timer_private.is_admin()%'
                 AND with_check LIKE '%break_timer_private.is_admin()%'
           ) OR NOT EXISTS (
               SELECT 1 FROM pg_policies
               WHERE schemaname = 'public' AND tablename = table_name
                 AND policyname = 'break_timer_admin_access'
                 AND permissive = 'PERMISSIVE' AND cmd = 'ALL'
                 AND 'authenticated'::name = ANY(roles)
                 AND qual LIKE '%break_timer_private.is_admin()%'
                 AND with_check LIKE '%break_timer_private.is_admin()%'
           ) THEN
            RAISE EXCEPTION 'Administrator RLS policies are missing on %. Apply the administrator security migration first.', table_name;
        END IF;

        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.%I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all authenticated users" ON public.%I', table_name);
    END LOOP;
END;
$$;

COMMIT;
