-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Enums / Types
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('admin', 'agent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE country_code AS ENUM ('JO', 'SA', 'AE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_stage AS ENUM ('imported', 'assigned', 'contacted', 'follow_up_due', 'follow_up_sent', 'meeting_booked', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_type AS ENUM ('initial', 'follow_up');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'scheduled', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE meeting_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Create Tables

-- public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    role app_role NOT NULL,
    is_active boolean DEFAULT true,
    daily_quota integer NULL CHECK (daily_quota > 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- public.system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    id integer PRIMARY KEY CHECK (id = 1),
    followup_delay_days integer DEFAULT 3,
    timezone text DEFAULT 'Asia/Amman',
    initial_task_points integer DEFAULT 1,
    follow_up_points integer DEFAULT 1,
    meeting_points integer DEFAULT 3,
    follow_up_templates jsonb DEFAULT '{"JO": "مرحباً، أتابع بخصوص رسالتي السابقة", "SA": "أهلاً بك، أتابع لمعرفة رأيكم", "AE": "السلام عليكم، أتمنى أن تكونوا بخير. أتابع بخصوص..."}'::jsonb,
    updated_by uuid REFERENCES public.profiles(id),
    updated_at timestamptz DEFAULT now()
);
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
INSERT INTO public.system_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- public.import_batches
CREATE TABLE IF NOT EXISTS public.import_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_name text NOT NULL,
    source_hash text NOT NULL UNIQUE,
    assignment_date date NOT NULL,
    total_records integer DEFAULT 0,
    valid_records integer DEFAULT 0,
    imported_records integer DEFAULT 0,
    duplicate_records integer DEFAULT 0,
    error_records integer DEFAULT 0,
    status text DEFAULT 'committed',
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now(),
    committed_at timestamptz DEFAULT now()
);

-- public.instagram_accounts
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL CHECK (username <> '' AND username NOT LIKE '%@%'),
    profile_url text NOT NULL,
    business_name text,
    contact_name text,
    niche text,
    country country_code NOT NULL,
    stage account_stage DEFAULT 'imported',
    imported_by uuid REFERENCES public.profiles(id),
    import_batch_id uuid REFERENCES public.import_batches(id),
    admin_notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_instagram_accounts_username_lower ON public.instagram_accounts (lower(username));
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_country ON public.instagram_accounts (country);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_stage ON public.instagram_accounts (stage);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_batch ON public.instagram_accounts (import_batch_id);
DROP TRIGGER IF EXISTS update_instagram_accounts_updated_at ON public.instagram_accounts;
CREATE TRIGGER update_instagram_accounts_updated_at BEFORE UPDATE ON public.instagram_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- public.outreach_tasks
CREATE TABLE IF NOT EXISTS public.outreach_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid NOT NULL REFERENCES public.instagram_accounts(id),
    task_type task_type NOT NULL,
    assigned_to uuid NOT NULL REFERENCES public.profiles(id),
    assigned_by uuid REFERENCES public.profiles(id),
    assignment_date date,
    due_date date,
    status task_status DEFAULT 'pending',
    message_1 text,
    message_2 text,
    follow_up_message text,
    profile_opened_at timestamptz,
    follow_confirmed boolean DEFAULT false,
    message_1_copied_at timestamptz,
    message_1_sent_at timestamptz,
    message_2_copied_at timestamptz,
    message_2_sent_at timestamptz,
    follow_up_copied_at timestamptz,
    follow_up_sent_at timestamptz,
    completed_at timestamptz,
    cancelled_at timestamptz,
    cancel_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CHECK (
        (task_type = 'initial' AND message_1 IS NOT NULL AND message_2 IS NOT NULL) OR
        (task_type = 'follow_up' AND follow_up_message IS NOT NULL)
    )
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_tasks_one_initial ON public.outreach_tasks (account_id) WHERE task_type = 'initial';
CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_tasks_one_active_followup ON public.outreach_tasks (account_id) WHERE task_type = 'follow_up' AND status NOT IN ('completed', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_assigned_to ON public.outreach_tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_status ON public.outreach_tasks (status);
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_assignment_date ON public.outreach_tasks (assignment_date);
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_due_date ON public.outreach_tasks (due_date);
DROP TRIGGER IF EXISTS update_outreach_tasks_updated_at ON public.outreach_tasks;
CREATE TRIGGER update_outreach_tasks_updated_at BEFORE UPDATE ON public.outreach_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- public.meetings
CREATE TABLE IF NOT EXISTS public.meetings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid NOT NULL REFERENCES public.instagram_accounts(id),
    contact_name text NOT NULL,
    phone text NOT NULL,
    niche text NOT NULL,
    scheduled_at timestamptz NOT NULL,
    notes text,
    status meeting_status DEFAULT 'scheduled',
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meetings_one_active ON public.meetings (account_id) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at ON public.meetings (scheduled_at);
DROP TRIGGER IF EXISTS update_meetings_updated_at ON public.meetings;
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- public.points_ledger
CREATE TABLE IF NOT EXISTS public.points_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id),
    event_type text NOT NULL,
    task_id uuid REFERENCES public.outreach_tasks(id),
    meeting_id uuid REFERENCES public.meetings(id),
    points integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    CHECK (task_id IS NOT NULL OR meeting_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_ledger_task ON public.points_ledger (user_id, event_type, task_id) WHERE task_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_ledger_meeting ON public.points_ledger (user_id, event_type, meeting_id) WHERE meeting_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON public.points_ledger (user_id);

-- public.audit_events
CREATE TABLE IF NOT EXISTS public.audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES public.profiles(id),
    event_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events (entity_type, entity_id);


-- 4. Helper Security Functions (SECURITY DEFINER to bypass RLS securely if needed, mostly SECURITY INVOKER though)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'agent' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE USING (public.is_admin());

-- import_batches
DROP POLICY IF EXISTS "batches_admin_all" ON public.import_batches;
CREATE POLICY "batches_admin_all" ON public.import_batches FOR ALL USING (public.is_admin());

-- instagram_accounts
DROP POLICY IF EXISTS "accounts_admin_all" ON public.instagram_accounts;
CREATE POLICY "accounts_admin_all" ON public.instagram_accounts FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "accounts_agent_select" ON public.instagram_accounts;
CREATE POLICY "accounts_agent_select" ON public.instagram_accounts FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.outreach_tasks WHERE outreach_tasks.account_id = instagram_accounts.id AND outreach_tasks.assigned_to = auth.uid())
);

-- outreach_tasks
DROP POLICY IF EXISTS "tasks_admin_all" ON public.outreach_tasks;
CREATE POLICY "tasks_admin_all" ON public.outreach_tasks FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "tasks_agent_select" ON public.outreach_tasks;
CREATE POLICY "tasks_agent_select" ON public.outreach_tasks FOR SELECT USING (assigned_to = auth.uid());
DROP POLICY IF EXISTS "tasks_agent_update" ON public.outreach_tasks;
CREATE POLICY "tasks_agent_update" ON public.outreach_tasks FOR UPDATE USING (assigned_to = auth.uid());

-- meetings
DROP POLICY IF EXISTS "meetings_admin_all" ON public.meetings;
CREATE POLICY "meetings_admin_all" ON public.meetings FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "meetings_agent_select" ON public.meetings;
CREATE POLICY "meetings_agent_select" ON public.meetings FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.outreach_tasks WHERE outreach_tasks.account_id = meetings.account_id AND outreach_tasks.assigned_to = auth.uid())
);
DROP POLICY IF EXISTS "meetings_agent_insert" ON public.meetings;
CREATE POLICY "meetings_agent_insert" ON public.meetings FOR INSERT WITH CHECK (created_by = auth.uid());

-- points_ledger
DROP POLICY IF EXISTS "points_read_all" ON public.points_ledger;
CREATE POLICY "points_read_all" ON public.points_ledger FOR SELECT USING (true);

-- audit_events
DROP POLICY IF EXISTS "audit_admin_read" ON public.audit_events;
CREATE POLICY "audit_admin_read" ON public.audit_events FOR SELECT USING (public.is_admin());

-- system_settings
DROP POLICY IF EXISTS "settings_read_all" ON public.system_settings;
CREATE POLICY "settings_read_all" ON public.system_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "settings_admin_update" ON public.system_settings;
CREATE POLICY "settings_admin_update" ON public.system_settings FOR UPDATE USING (public.is_admin());


-- 6. RPC Functions

-- record_task_step
CREATE OR REPLACE FUNCTION public.record_task_step(task_id uuid, step text)
RETURNS public.outreach_tasks AS $$
DECLARE
    v_task public.outreach_tasks;
BEGIN
    SELECT * INTO v_task FROM public.outreach_tasks WHERE id = task_id AND assigned_to = auth.uid();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found or not owned by user';
    END IF;
    
    IF v_task.status = 'completed' THEN
        RETURN v_task; -- idempotent
    END IF;

    IF step = 'opened' THEN
        UPDATE public.outreach_tasks SET profile_opened_at = COALESCE(profile_opened_at, now()), status = 'in_progress' WHERE id = task_id RETURNING * INTO v_task;
    ELSIF step = 'confirmed' THEN
        UPDATE public.outreach_tasks SET follow_confirmed = true WHERE id = task_id RETURNING * INTO v_task;
    ELSIF step = 'msg1' THEN
        UPDATE public.outreach_tasks SET message_1_copied_at = COALESCE(message_1_copied_at, now()) WHERE id = task_id RETURNING * INTO v_task;
    ELSIF step = 'msg2' THEN
        UPDATE public.outreach_tasks SET message_2_copied_at = COALESCE(message_2_copied_at, now()) WHERE id = task_id RETURNING * INTO v_task;
    END IF;
    
    RETURN v_task;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- complete_initial_task
CREATE OR REPLACE FUNCTION public.complete_initial_task(task_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_task public.outreach_tasks;
    v_settings public.system_settings;
    v_account public.instagram_accounts;
    v_points integer;
    v_template text;
    v_follow_up_due date;
BEGIN
    SELECT * INTO v_task FROM public.outreach_tasks WHERE id = task_id AND assigned_to = auth.uid() AND task_type = 'initial';
    IF NOT FOUND THEN RAISE EXCEPTION 'Task not found or unauthorized'; END IF;
    
    IF v_task.status = 'completed' THEN
        RETURN jsonb_build_object('status', 'already_completed');
    END IF;

    -- Update Task
    UPDATE public.outreach_tasks 
    SET status = 'completed', completed_at = now(), message_1_sent_at = COALESCE(message_1_sent_at, now()), message_2_sent_at = COALESCE(message_2_sent_at, now())
    WHERE id = task_id;
    
    -- Update Account
    SELECT * INTO v_account FROM public.instagram_accounts WHERE id = v_task.account_id;
    UPDATE public.instagram_accounts SET stage = 'contacted' WHERE id = v_account.id;

    -- Settings & Points
    SELECT * INTO v_settings FROM public.system_settings WHERE id = 1;
    v_points := COALESCE(v_settings.initial_task_points, 1);
    
    INSERT INTO public.points_ledger (user_id, event_type, task_id, points)
    VALUES (auth.uid(), 'initial_task_completed', task_id, v_points)
    ON CONFLICT DO NOTHING;

    -- Audit
    INSERT INTO public.audit_events (actor_id, event_type, entity_type, entity_id)
    VALUES (auth.uid(), 'task_completed', 'outreach_tasks', task_id);

    -- Create Follow Up
    v_template := v_settings.follow_up_templates->>v_account.country::text;
    IF v_template IS NULL THEN v_template := 'مرحباً، أتابع بخصوص رسالتي السابقة.'; END IF;
    
    v_follow_up_due := CURRENT_DATE + COALESCE(v_settings.followup_delay_days, 3);
    
    INSERT INTO public.outreach_tasks (account_id, task_type, assigned_to, assigned_by, due_date, follow_up_message)
    VALUES (v_account.id, 'follow_up', auth.uid(), auth.uid(), v_follow_up_due, v_template)
    ON CONFLICT (account_id) WHERE task_type = 'follow_up' AND status NOT IN ('completed', 'cancelled') DO NOTHING;

    RETURN jsonb_build_object('status', 'success', 'points_earned', v_points);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- complete_follow_up_task
CREATE OR REPLACE FUNCTION public.complete_follow_up_task(task_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_task public.outreach_tasks;
    v_settings public.system_settings;
    v_points integer;
BEGIN
    SELECT * INTO v_task FROM public.outreach_tasks WHERE id = task_id AND assigned_to = auth.uid() AND task_type = 'follow_up';
    IF NOT FOUND THEN RAISE EXCEPTION 'Task not found or unauthorized'; END IF;
    
    IF v_task.status = 'completed' THEN RETURN jsonb_build_object('status', 'already_completed'); END IF;
    IF v_task.status = 'cancelled' THEN RAISE EXCEPTION 'Task is cancelled'; END IF;

    UPDATE public.outreach_tasks 
    SET status = 'completed', completed_at = now(), follow_up_sent_at = COALESCE(follow_up_sent_at, now())
    WHERE id = task_id;
    
    UPDATE public.instagram_accounts SET stage = 'follow_up_sent' WHERE id = v_task.account_id;

    SELECT * INTO v_settings FROM public.system_settings WHERE id = 1;
    v_points := COALESCE(v_settings.follow_up_points, 1);
    
    INSERT INTO public.points_ledger (user_id, event_type, task_id, points)
    VALUES (auth.uid(), 'follow_up_completed', task_id, v_points)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.audit_events (actor_id, event_type, entity_type, entity_id)
    VALUES (auth.uid(), 'task_completed', 'outreach_tasks', task_id);

    RETURN jsonb_build_object('status', 'success', 'points_earned', v_points);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- create_meeting_and_cancel_follow_up
CREATE OR REPLACE FUNCTION public.create_meeting_and_cancel_follow_up(
    p_account_id uuid, p_contact_name text, p_phone text, p_niche text, p_scheduled_at timestamptz, p_notes text
)
RETURNS jsonb AS $$
DECLARE
    v_meeting_id uuid;
    v_settings public.system_settings;
    v_points integer;
BEGIN
    -- Ensure authorized
    IF NOT public.is_admin() AND NOT EXISTS (SELECT 1 FROM public.outreach_tasks WHERE account_id = p_account_id AND assigned_to = auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized to book meeting for this account';
    END IF;

    INSERT INTO public.meetings (account_id, contact_name, phone, niche, scheduled_at, notes, created_by)
    VALUES (p_account_id, p_contact_name, p_phone, p_niche, p_scheduled_at, p_notes, auth.uid())
    RETURNING id INTO v_meeting_id;
    
    UPDATE public.instagram_accounts SET stage = 'meeting_booked' WHERE id = p_account_id;
    
    -- Cancel follow ups
    UPDATE public.outreach_tasks 
    SET status = 'cancelled', cancelled_at = now(), cancel_reason = 'Meeting booked'
    WHERE account_id = p_account_id AND task_type = 'follow_up' AND status NOT IN ('completed', 'cancelled');

    SELECT * INTO v_settings FROM public.system_settings WHERE id = 1;
    v_points := COALESCE(v_settings.meeting_points, 3);
    
    INSERT INTO public.points_ledger (user_id, event_type, meeting_id, points)
    VALUES (auth.uid(), 'meeting_booked', v_meeting_id, v_points)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.audit_events (actor_id, event_type, entity_type, entity_id)
    VALUES (auth.uid(), 'meeting_created', 'meetings', v_meeting_id);

    RETURN jsonb_build_object('status', 'success', 'meeting_id', v_meeting_id, 'points_earned', v_points);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- admin_import_and_assign
CREATE OR REPLACE FUNCTION public.admin_import_and_assign(
    p_payload jsonb, p_selected_agent_ids uuid[], p_assignment_date date
)
RETURNS jsonb AS $$
DECLARE
    v_batch_id uuid;
    v_account_record jsonb;
    v_acc_id uuid;
    v_assigned_agent uuid;
    v_idx integer := 0;
    v_agent_count integer;
    v_imported_count integer := 0;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
    
    v_agent_count := array_length(p_selected_agent_ids, 1);
    IF v_agent_count IS NULL OR v_agent_count = 0 THEN RAISE EXCEPTION 'No agents provided'; END IF;

    INSERT INTO public.import_batches (batch_name, source_hash, assignment_date, created_by)
    VALUES (p_payload->>'batch_name', md5(p_payload::text), p_assignment_date, auth.uid())
    RETURNING id INTO v_batch_id;
    
    FOR v_account_record IN SELECT * FROM jsonb_array_elements(p_payload->'accounts')
    LOOP
        -- Basic round robin for this batch (can be improved with load balancing logic)
        v_assigned_agent := p_selected_agent_ids[(v_idx % v_agent_count) + 1];
        
        INSERT INTO public.instagram_accounts (username, profile_url, business_name, country, import_batch_id, imported_by)
        VALUES (
            v_account_record->>'username', 
            COALESCE(v_account_record->>'profile_url', 'https://www.instagram.com/' || (v_account_record->>'username') || '/'),
            v_account_record->>'business_name', 
            (v_account_record->>'country')::public.country_code,
            v_batch_id, auth.uid()
        )
        ON CONFLICT (lower(username)) DO NOTHING
        RETURNING id INTO v_acc_id;

        IF v_acc_id IS NOT NULL THEN
            INSERT INTO public.outreach_tasks (account_id, task_type, assigned_to, assigned_by, assignment_date, message_1, message_2)
            VALUES (v_acc_id, 'initial', v_assigned_agent, auth.uid(), p_assignment_date, v_account_record->>'message_1', v_account_record->>'message_2');
            
            v_imported_count := v_imported_count + 1;
            v_idx := v_idx + 1;
        END IF;
    END LOOP;
    
    UPDATE public.import_batches SET imported_records = v_imported_count WHERE id = v_batch_id;
    
    INSERT INTO public.audit_events (actor_id, event_type, entity_type, entity_id)
    VALUES (auth.uid(), 'batch_imported', 'import_batches', v_batch_id);

    RETURN jsonb_build_object('status', 'success', 'batch_id', v_batch_id, 'imported_count', v_imported_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.admin_import_and_assign FROM public;
GRANT EXECUTE ON FUNCTION public.admin_import_and_assign TO authenticated;

-- admin_reassign_task
CREATE OR REPLACE FUNCTION public.admin_reassign_task(p_task_id uuid, p_new_agent_id uuid, p_reason text)
RETURNS jsonb AS $$
DECLARE
    v_old_agent_id uuid;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_new_agent_id AND role = 'agent' AND is_active = true) THEN
        RAISE EXCEPTION 'Invalid target agent';
    END IF;

    SELECT assigned_to INTO v_old_agent_id FROM public.outreach_tasks WHERE id = p_task_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Task not found'; END IF;
    
    UPDATE public.outreach_tasks SET assigned_to = p_new_agent_id WHERE id = p_task_id;
    
    INSERT INTO public.audit_events (actor_id, event_type, entity_type, entity_id, metadata)
    VALUES (auth.uid(), 'task_reassigned', 'outreach_tasks', p_task_id, jsonb_build_object('from', v_old_agent_id, 'to', p_new_agent_id, 'reason', p_reason));

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
