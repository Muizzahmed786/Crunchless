-- PostgreSQL reference schema for the PRD data model.
-- Apply deliberately with your deployment's migration process; the demo API does not apply it.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  date_order text CHECK (date_order IN ('MM/DD', 'DD/MM')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#007AFF',
  estimate_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS availability (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  hours numeric(5,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
  PRIMARY KEY (user_id, weekday)
);

CREATE TABLE IF NOT EXISTS availability_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  hours numeric(5,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
  note text NOT NULL DEFAULT '',
  CHECK (end_date >= start_date),
  UNIQUE (user_id, start_date, end_date)
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  depends_on uuid REFERENCES tasks(id) ON DELETE SET NULL,
  title text NOT NULL,
  task_type text NOT NULL,
  due_at timestamptz NOT NULL,
  optimistic_hours numeric(7,2) NOT NULL CHECK (optimistic_hours >= 0),
  likely_hours numeric(7,2) NOT NULL CHECK (likely_hours >= 0),
  pessimistic_hours numeric(7,2) NOT NULL CHECK (pessimistic_hours >= 0),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  grade_weight numeric(5,2),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'cancelled', 'archived')),
  status_before_cancel text,
  status_before_archive text,
  remaining_hours numeric(7,2) CHECK (remaining_hours >= 0),
  remaining_reported_at timestamptz,
  source text NOT NULL DEFAULT 'manual',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (depends_on IS NULL OR depends_on <> id)
);
CREATE INDEX IF NOT EXISTS tasks_user_status_due_idx ON tasks (user_id, status, due_at);
CREATE INDEX IF NOT EXISTS tasks_title_trgm_idx ON tasks USING gin (lower(title) gin_trgm_ops);

CREATE TABLE IF NOT EXISTS imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'discarded')),
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  UNIQUE (user_id, content_hash)
);

CREATE TABLE IF NOT EXISTS task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  import_id uuid REFERENCES imports(id) ON DELETE SET NULL,
  action text NOT NULL,
  source text NOT NULL,
  before_values jsonb,
  after_values jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS task_history_task_created_idx ON task_history (task_id, created_at DESC);

CREATE TABLE IF NOT EXISTS work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_minutes integer CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  source text NOT NULL CHECK (source IN ('timer', 'manual', 'completion_adjustment')),
  voided_at timestamptz,
  correction_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS work_sessions_one_running_timer_idx ON work_sessions (user_id) WHERE source = 'timer' AND ended_at IS NULL AND voided_at IS NULL;
CREATE INDEX IF NOT EXISTS work_sessions_task_started_idx ON work_sessions (task_id, started_at);

CREATE TABLE IF NOT EXISTS allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  hours numeric(7,2) NOT NULL CHECK (hours > 0),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'missed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, local_date)
);
CREATE INDEX IF NOT EXISTS allocations_user_day_idx ON allocations (user_id, local_date);

CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  channel text NOT NULL,
  sent_at timestamptz,
  delivery_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  join_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS class_members (
  calendar_id uuid NOT NULL REFERENCES class_calendars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (calendar_id, user_id)
);
CREATE TABLE IF NOT EXISTS class_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL REFERENCES class_calendars(id) ON DELETE CASCADE,
  title text NOT NULL,
  course_name text,
  due_at timestamptz NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
