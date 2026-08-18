-- =============================================================================
-- Alongsiders Attendance — Supabase schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
--
-- Security model: the browser app NEVER talks to Supabase directly and never
-- holds a Supabase key. Every read/write goes through a Netlify Function,
-- which uses the SERVICE ROLE key (kept only in Netlify environment
-- variables). Row Level Security is turned ON on every table as a second
-- line of defense in case a key ever leaks or a function has a bug — with no
-- policies defined, RLS blocks all access by anon/authenticated roles by
-- default, and only the service role (which bypasses RLS) can read or write.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- users: one row per staff member (includes admins)
-- ---------------------------------------------------------------------------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'staff' check (role in ('staff', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_email on users (lower(email));

-- ---------------------------------------------------------------------------
-- webauthn_credentials: passkeys registered per user.
-- Only the public key and metadata are stored — never biometric data itself,
-- which never leaves the user's device.
-- ---------------------------------------------------------------------------
create table if not exists webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  device_type text,
  backed_up boolean not null default false,
  transports text[],
  nickname text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists idx_webauthn_user on webauthn_credentials (user_id);

-- Temporary WebAuthn challenges (registration or login), short-lived.
create table if not exists webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id) on delete cascade,
  challenge text not null,
  challenge_type text not null check (challenge_type in ('registration', 'authentication')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- attendance: one row per staff member per calendar date
-- ---------------------------------------------------------------------------
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  work_date date not null,
  check_in timestamptz,
  check_out timestamptz,
  status text not null default 'checked_out' check (status in ('checked_in', 'checked_out')),
  edited_by_admin uuid references users (id),
  edited_at timestamptz,
  edit_note text,
  created_at timestamptz not null default now(),
  unique (user_id, work_date)
);

create index if not exists idx_attendance_date on attendance (work_date);
create index if not exists idx_attendance_user on attendance (user_id);

-- ---------------------------------------------------------------------------
-- qr_tokens: rotating, expiring tokens shown on the admin QR screen
-- ---------------------------------------------------------------------------
create table if not exists qr_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  expires_at timestamptz not null,
  created_by uuid references users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_qr_tokens_expires on qr_tokens (expires_at desc);

-- ---------------------------------------------------------------------------
-- audit_logs: append-only trail of security-relevant events
-- ---------------------------------------------------------------------------
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id),
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_user on audit_logs (user_id);
create index if not exists idx_audit_logs_created on audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- app_settings: single-row configuration (work hours, timezone, etc.)
-- ---------------------------------------------------------------------------
create table if not exists app_settings (
  id int primary key default 1,
  timezone text not null default 'Asia/Phnom_Penh',
  work_start time not null default '08:00',
  work_end time not null default '17:00',
  late_threshold_minutes int not null default 15,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into app_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security — locked down by default.
-- No policies are created, which means only the service role (used
-- exclusively by Netlify Functions) can read or write these tables.
-- ---------------------------------------------------------------------------
alter table users enable row level security;
alter table webauthn_credentials enable row level security;
alter table webauthn_challenges enable row level security;
alter table attendance enable row level security;
alter table qr_tokens enable row level security;
alter table audit_logs enable row level security;
alter table app_settings enable row level security;

-- ---------------------------------------------------------------------------
-- Housekeeping: automatically drop expired WebAuthn challenges and old QR
-- tokens so the tables don't grow forever. Safe to run on a schedule
-- (e.g. a Supabase cron job / pg_cron) or simply left — old rows are
-- ignored by the app because it always checks expires_at.
-- ---------------------------------------------------------------------------
create or replace function cleanup_expired_rows() returns void as $$
begin
  delete from webauthn_challenges where expires_at < now() - interval '1 day';
  delete from qr_tokens where expires_at < now() - interval '7 days';
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Seed the first administrator account.
-- IMPORTANT: replace the email below, then generate a real password hash —
-- see README.md "Admin account setup" for the exact command to run. Do not
-- leave a placeholder hash in a production database.
-- ---------------------------------------------------------------------------
-- insert into users (name, email, password_hash, role)
-- values ('Admin Name', 'admin@alongsiders.org', '<bcrypt-hash-here>', 'admin');
