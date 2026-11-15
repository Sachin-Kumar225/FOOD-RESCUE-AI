-- ============================================================================
-- FOOD RESCUE AI — Supabase PostgreSQL Schema, RLS Policies & Storage Setup
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('donor', 'ngo', 'volunteer', 'admin')) default 'donor',
  phone text not null default '',
  city text not null default 'Bengaluru',
  address text not null default '',
  status text not null check (status in ('active', 'suspended')) default 'active',
  created_at timestamptz not null default now()
);

-- Organisations (linked to NGO profile owner)
create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  registration_number text not null,
  type text not null check (type in ('NGO', 'Orphanage', 'Shelter', 'Community Kitchen')) default 'NGO',
  city text not null,
  address text not null,
  contact_phone text not null default '',
  capacity_note text not null default '',
  documents_summary text not null default 'Submitted for verification',
  verification_status text not null check (verification_status in ('pending', 'verified', 'rejected')) default 'pending',
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- Donations
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references public.profiles(id) on delete cascade,
  donor_name text not null,
  donor_type text not null default 'Verified Donor',
  title text not null,
  description text not null,
  category text not null check (category in ('Food', 'Clothing & Warmth', 'Education & Children', 'Household & Daily Needs')),
  sub_category text not null default 'General',
  quantity_value numeric not null check (quantity_value > 0),
  quantity_unit text not null,
  location text not null,
  city text not null,
  available_from timestamptz not null default now(),
  available_until timestamptz not null,
  image_url text not null default '',
  status text not null check (status in ('Available', 'Requested', 'Scheduled', 'Picked Up', 'Delivered')) default 'Available',
  food_details jsonb,
  safety_eligibility jsonb not null,
  flagged_for_moderation boolean not null default false,
  ai_metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- NGO Resource Requirements
create table if not exists public.ngo_needs (
  id uuid primary key default gen_random_uuid(),
  ngo_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid not null references public.organisations(id) on delete cascade,
  org_name text not null,
  category text not null check (category in ('Food', 'Clothing & Warmth', 'Education & Children', 'Household & Daily Needs')),
  title text not null,
  quantity_needed numeric not null check (quantity_needed > 0),
  unit text not null,
  urgency text not null check (urgency in ('Normal', 'High', 'Urgent')) default 'Normal',
  city text not null,
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Donation Requests
create table if not exists public.donation_requests (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donations(id) on delete cascade,
  donation_title text not null,
  donation_category text not null,
  donor_id uuid not null references public.profiles(id) on delete cascade,
  donor_name text not null,
  ngo_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid not null references public.organisations(id) on delete cascade,
  org_name text not null,
  requested_quantity text not null,
  notes text not null default '',
  status text not null check (status in ('Pending', 'Approved', 'Rejected', 'Fulfilled')) default 'Pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Volunteer Pickup Tasks
create table if not exists public.volunteer_tasks (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donations(id) on delete cascade,
  donation_title text not null,
  donation_category text not null,
  quantity_summary text not null,
  request_id uuid not null references public.donation_requests(id) on delete cascade,
  donor_id uuid not null references public.profiles(id) on delete cascade,
  donor_name text not null,
  ngo_id uuid not null references public.profiles(id) on delete cascade,
  org_name text not null,
  pickup_address text not null,
  dropoff_address text not null,
  city text not null,
  volunteer_id uuid references public.profiles(id) on delete set null,
  volunteer_name text,
  status text not null check (status in ('Open', 'Accepted', 'Picked Up', 'Delivered')) default 'Open',
  scheduled_window text not null default 'Same-day pickup window',
  notes text not null default '',
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

-- Delivery Confirmation Records
create table if not exists public.delivery_records (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null unique references public.donations(id) on delete cascade,
  donation_title text not null,
  task_id uuid references public.volunteer_tasks(id) on delete set null,
  request_id uuid not null references public.donation_requests(id) on delete cascade,
  ngo_id uuid not null references public.profiles(id) on delete cascade,
  org_name text not null,
  volunteer_id uuid references public.profiles(id) on delete set null,
  volunteer_name text,
  confirmed_by_ngo_at timestamptz not null default now(),
  condition_rating text not null check (condition_rating in ('Excellent', 'Good', 'Acceptable')) default 'Good',
  quantity_confirmed text not null,
  receiver_notes text not null default ''
);

-- Moderation Reports
create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('donation', 'user', 'organisation')),
  target_id text not null,
  target_title text not null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reporter_name text not null,
  reason text not null,
  status text not null check (status in ('Open', 'Reviewed', 'Resolved')) default 'Open',
  admin_notes text,
  created_at timestamptz not null default now()
);

-- Contact Messages
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  role_interest text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- Platform Activity Logs
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  actor_role text not null,
  action text not null,
  target_type text not null,
  target_title text not null,
  timestamp timestamptz not null default now()
);

-- Editorial Site Settings (Hero & About photos)
create table if not exists public.site_settings (
  id int primary key check (id = 1) default 1,
  hero_image_url text not null default '/images/hero_food_rescue_1794669342092.jpg',
  about_image_url text not null default '/images/about_community_hub_1794669343508.jpg',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- Indexes
create index if not exists idx_donations_status on public.donations(status);
create index if not exists idx_donations_category on public.donations(category);
create index if not exists idx_donations_donor on public.donations(donor_id);
create index if not exists idx_requests_donor on public.donation_requests(donor_id);
create index if not exists idx_requests_ngo on public.donation_requests(ngo_id);
create index if not exists idx_tasks_status on public.volunteer_tasks(status);
create index if not exists idx_tasks_volunteer on public.volunteer_tasks(volunteer_id);

-- ----------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.is_verified_ngo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organisations o
    join public.profiles p on p.id = o.user_id
    where o.user_id = auth.uid()
      and p.role = 'ngo'
      and p.status = 'active'
      and o.verification_status = 'verified'
  );
$$;

-- Signup trigger: automatically populate public.profiles & pending NGO org
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  safe_role text;
  user_name text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'donor');
  -- Prevent self-escalation to admin on public signup
  if requested_role in ('donor', 'ngo', 'volunteer') then
    safe_role := requested_role;
  else
    safe_role := 'donor';
  end if;

  user_name := coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1));

  insert into public.profiles (id, name, email, role, phone, city, address)
  values (
    new.id,
    user_name,
    new.email,
    safe_role,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(nullif(new.raw_user_meta_data->>'city', ''), 'Bengaluru'),
    coalesce(new.raw_user_meta_data->>'address', '')
  )
  on conflict (id) do nothing;

  if safe_role = 'ngo' then
    insert into public.organisations (
      user_id, name, registration_number, type, city, address, contact_phone, capacity_note
    )
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data->>'orgName', ''), user_name),
      coalesce(nullif(new.raw_user_meta_data->>'registrationNumber', ''), 'PENDING-REG'),
      case
        when (new.raw_user_meta_data->>'orgType') in ('NGO', 'Orphanage', 'Shelter', 'Community Kitchen')
        then new.raw_user_meta_data->>'orgType'
        else 'NGO'
      end,
      coalesce(nullif(new.raw_user_meta_data->>'city', ''), 'Bengaluru'),
      coalesce(new.raw_user_meta_data->>'address', ''),
      coalesce(new.raw_user_meta_data->>'phone', ''),
      coalesce(new.raw_user_meta_data->>'capacityNote', 'Community distribution center')
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. ATOMIC WORKFLOW RPCS (Enforcing Role & State Machine Integrity)
-- ----------------------------------------------------------------------------

-- Verified NGO requests an Available donation
create or replace function public.request_donation(
  p_donation_id uuid,
  p_requested_quantity text,
  p_notes text default ''
)
returns public.donation_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organisations;
  v_don public.donations;
  v_req public.donation_requests;
begin
  if not public.is_verified_ngo() then
    raise exception 'Only verified NGO / Receiver organisations can request donations.';
  end if;

  select * into v_org from public.organisations where user_id = auth.uid();
  select * into v_don from public.donations where id = p_donation_id for update;

  if not found then
    raise exception 'Donation not found.';
  end if;
  if v_don.status <> 'Available' then
    raise exception 'Donation is currently % and cannot be requested.', v_don.status;
  end if;

  insert into public.donation_requests (
    donation_id, donation_title, donation_category,
    donor_id, donor_name, ngo_id, org_id, org_name,
    requested_quantity, notes, status
  )
  values (
    v_don.id, v_don.title, v_don.category,
    v_don.donor_id, v_don.donor_name, auth.uid(), v_org.id, v_org.name,
    coalesce(nullif(p_requested_quantity, ''), v_don.quantity_value || ' ' || v_don.quantity_unit),
    coalesce(p_notes, ''),
    'Pending'
  )
  returning * into v_req;

  update public.donations
  set status = 'Requested', updated_at = now()
  where id = v_don.id;

  insert into public.activity_logs (actor_id, actor_name, actor_role, action, target_type, target_title)
  values (auth.uid(), v_org.name, 'ngo', 'Requested donation', 'donation', v_don.title);

  return v_req;
end;
$$;

-- Donor or Admin approves/rejects a pending NGO request
create or replace function public.respond_to_donation_request(
  p_request_id uuid,
  p_decision text,
  p_scheduled_window text default 'Same-day pickup window'
)
returns public.donation_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.donation_requests;
  v_don public.donations;
  v_org public.organisations;
begin
  select * into v_req from public.donation_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found.';
  end if;

  if not public.is_admin() and v_req.donor_id <> auth.uid() then
    raise exception 'Only the owning donor or an administrator can respond to this request.';
  end if;

  if v_req.status <> 'Pending' then
    raise exception 'This request has already been processed.';
  end if;

  select * into v_don from public.donations where id = v_req.donation_id for update;
  select * into v_org from public.organisations where id = v_req.org_id;

  if p_decision = 'reject' then
    update public.donation_requests set status = 'Rejected', updated_at = now() where id = v_req.id returning * into v_req;
    if v_don.status = 'Requested' then
      update public.donations set status = 'Available', updated_at = now() where id = v_don.id;
    end if;
    return v_req;
  elsif p_decision = 'approve' then
    update public.donation_requests set status = 'Approved', updated_at = now() where id = v_req.id returning * into v_req;
    update public.donation_requests set status = 'Rejected', updated_at = now()
      where donation_id = v_req.donation_id and id <> v_req.id and status = 'Pending';

    update public.donations set status = 'Scheduled', updated_at = now() where id = v_don.id;

    insert into public.volunteer_tasks (
      donation_id, donation_title, donation_category, quantity_summary,
      request_id, donor_id, donor_name, ngo_id, org_name,
      pickup_address, dropoff_address, city, status, scheduled_window, notes
    )
    values (
      v_don.id, v_don.title, v_don.category, v_don.quantity_value || ' ' || v_don.quantity_unit,
      v_req.id, v_don.donor_id, v_don.donor_name, v_req.ngo_id, v_req.org_name,
      v_don.location || ', ' || v_don.city,
      coalesce(v_org.address || ', ' || v_org.city, v_req.org_name),
      v_don.city, 'Open', coalesce(nullif(p_scheduled_window, ''), 'Same-day pickup window'),
      coalesce(nullif(v_req.notes, ''), 'Verify condition and count at pickup.')
    );

    insert into public.activity_logs (actor_id, actor_name, actor_role, action, target_type, target_title)
    values (auth.uid(), v_don.donor_name, public.get_my_role(), 'Approved request & scheduled pickup', 'donation', v_don.title);

    return v_req;
  else
    raise exception 'Decision must be approve or reject.';
  end if;
end;
$$;

-- Volunteer accepts an open pickup task
create or replace function public.accept_volunteer_task(p_task_id uuid)
returns public.volunteer_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.volunteer_tasks;
  v_profile public.profiles;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.role <> 'volunteer' or v_profile.status <> 'active' then
    raise exception 'Only active volunteers can accept pickup tasks.';
  end if;

  select * into v_task from public.volunteer_tasks where id = p_task_id for update;
  if not found or v_task.status <> 'Open' then
    raise exception 'Task is no longer open.';
  end if;

  update public.volunteer_tasks
  set status = 'Accepted', volunteer_id = auth.uid(), volunteer_name = v_profile.name, accepted_at = now()
  where id = p_task_id
  returning * into v_task;

  insert into public.activity_logs (actor_id, actor_name, actor_role, action, target_type, target_title)
  values (auth.uid(), v_profile.name, 'volunteer', 'Accepted pickup task', 'task', v_task.donation_title);

  return v_task;
end;
$$;

-- Volunteer advances pickup/delivery status
create or replace function public.update_volunteer_task_status(
  p_task_id uuid,
  p_next_status text
)
returns public.volunteer_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.volunteer_tasks;
begin
  select * into v_task from public.volunteer_tasks where id = p_task_id for update;
  if not found then
    raise exception 'Task not found.';
  end if;

  if not public.is_admin() and v_task.volunteer_id is distinct from auth.uid() then
    raise exception 'Only the assigned volunteer can update this task.';
  end if;

  if p_next_status = 'Picked Up' and v_task.status = 'Accepted' then
    update public.volunteer_tasks set status = 'Picked Up', picked_up_at = now() where id = p_task_id returning * into v_task;
    update public.donations set status = 'Picked Up', updated_at = now() where id = v_task.donation_id;
    insert into public.activity_logs (actor_id, actor_name, actor_role, action, target_type, target_title)
    values (auth.uid(), coalesce(v_task.volunteer_name, 'Volunteer'), public.get_my_role(), 'Picked up donation from donor', 'donation', v_task.donation_title);
  elsif p_next_status = 'Delivered' and v_task.status = 'Picked Up' then
    update public.volunteer_tasks set status = 'Delivered', delivered_at = now() where id = p_task_id returning * into v_task;
    insert into public.activity_logs (actor_id, actor_name, actor_role, action, target_type, target_title)
    values (auth.uid(), coalesce(v_task.volunteer_name, 'Volunteer'), public.get_my_role(), 'Dropped off donation at NGO (awaiting confirmation)', 'donation', v_task.donation_title);
  else
    raise exception 'Invalid task status transition.';
  end if;

  return v_task;
end;
$$;

-- NGO confirms physical receipt -> marks donation Delivered & creates delivery_record
create or replace function public.confirm_delivery_receipt(
  p_donation_id uuid,
  p_condition_rating text default 'Good',
  p_quantity_confirmed text default '',
  p_receiver_notes text default ''
)
returns public.delivery_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_don public.donations;
  v_req public.donation_requests;
  v_task public.volunteer_tasks;
  v_rec public.delivery_records;
begin
  select * into v_don from public.donations where id = p_donation_id for update;
  if not found then
    raise exception 'Donation not found.';
  end if;

  if exists (select 1 from public.delivery_records where donation_id = p_donation_id) then
    raise exception 'Delivery receipt has already been confirmed.';
  end if;

  select * into v_req from public.donation_requests
  where donation_id = p_donation_id
    and status in ('Approved', 'Fulfilled')
    and (public.is_admin() or ngo_id = auth.uid())
  limit 1;

  if not found then
    raise exception 'Only the approved receiving NGO or an administrator can confirm receipt.';
  end if;

  select * into v_task from public.volunteer_tasks where donation_id = p_donation_id limit 1;

  if v_task.id is not null and v_task.status <> 'Delivered' then
    update public.volunteer_tasks set status = 'Delivered', delivered_at = coalesce(delivered_at, now()) where id = v_task.id;
  end if;

  update public.donations set status = 'Delivered', updated_at = now() where id = v_don.id;
  update public.donation_requests set status = 'Fulfilled', updated_at = now() where id = v_req.id;

  insert into public.delivery_records (
    donation_id, donation_title, task_id, request_id,
    ngo_id, org_name, volunteer_id, volunteer_name,
    condition_rating, quantity_confirmed, receiver_notes
  )
  values (
    v_don.id, v_don.title, v_task.id, v_req.id,
    v_req.ngo_id, v_req.org_name, v_task.volunteer_id, v_task.volunteer_name,
    case when p_condition_rating in ('Excellent', 'Good', 'Acceptable') then p_condition_rating else 'Good' end,
    coalesce(nullif(p_quantity_confirmed, ''), v_don.quantity_value || ' ' || v_don.quantity_unit),
    coalesce(nullif(p_receiver_notes, ''), 'Received and inspected by NGO team.')
  )
  returning * into v_rec;

  insert into public.activity_logs (actor_id, actor_name, actor_role, action, target_type, target_title)
  values (auth.uid(), v_req.org_name, coalesce(public.get_my_role(), 'ngo'), 'Confirmed delivery receipt', 'donation', v_don.title);

  return v_rec;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organisations enable row level security;
alter table public.donations enable row level security;
alter table public.ngo_needs enable row level security;
alter table public.donation_requests enable row level security;
alter table public.volunteer_tasks enable row level security;
alter table public.delivery_records enable row level security;
alter table public.moderation_reports enable row level security;
alter table public.contact_messages enable row level security;
alter table public.activity_logs enable row level security;
alter table public.site_settings enable row level security;

-- PROFILES
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "profiles_update_own_safe"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (
    public.is_admin()
    or (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()))
  );

-- ORGANISATIONS
create policy "organisations_select_verified_or_owner_or_admin"
  on public.organisations for select
  using (verification_status = 'verified' or user_id = auth.uid() or public.is_admin());

create policy "organisations_insert_owner_pending"
  on public.organisations for insert
  with check (
    auth.uid() = user_id
    and public.get_my_role() = 'ngo'
    and verification_status = 'pending'
  );

create policy "organisations_update_owner_or_admin"
  on public.organisations for update
  using (auth.uid() = user_id or public.is_admin())
  with check (
    public.is_admin()
    or (
      auth.uid() = user_id
      and verification_status = (select verification_status from public.organisations where user_id = auth.uid())
    )
  );

-- DONATIONS
create policy "donations_select_public"
  on public.donations for select
  using (true);

create policy "donations_insert_donor_or_admin"
  on public.donations for insert
  with check (
    auth.uid() = donor_id
    and public.get_my_role() in ('donor', 'admin')
  );

create policy "donations_update_owner_or_admin"
  on public.donations for update
  using (auth.uid() = donor_id or public.is_admin())
  with check (auth.uid() = donor_id or public.is_admin());

create policy "donations_delete_owner_or_admin"
  on public.donations for delete
  using (
    public.is_admin()
    or (auth.uid() = donor_id and status not in ('Picked Up', 'Delivered'))
  );

-- NGO NEEDS
create policy "ngo_needs_select_active_or_owner_or_admin"
  on public.ngo_needs for select
  using (active = true or ngo_id = auth.uid() or public.is_admin());

create policy "ngo_needs_insert_ngo"
  on public.ngo_needs for insert
  with check (auth.uid() = ngo_id and public.get_my_role() = 'ngo');

create policy "ngo_needs_delete_owner_or_admin"
  on public.ngo_needs for delete
  using (auth.uid() = ngo_id or public.is_admin());

-- DONATION REQUESTS
create policy "requests_select_participants_or_admin"
  on public.donation_requests for select
  using (donor_id = auth.uid() or ngo_id = auth.uid() or public.is_admin());

create policy "requests_insert_verified_ngo"
  on public.donation_requests for insert
  with check (ngo_id = auth.uid() and public.is_verified_ngo());

create policy "requests_update_donor_or_admin"
  on public.donation_requests for update
  using (donor_id = auth.uid() or public.is_admin());

-- VOLUNTEER TASKS
create policy "tasks_select_roles"
  on public.volunteer_tasks for select
  using (
    public.get_my_role() in ('volunteer', 'admin')
    or donor_id = auth.uid()
    or ngo_id = auth.uid()
  );

create policy "tasks_update_volunteer_or_admin"
  on public.volunteer_tasks for update
  using (
    public.is_admin()
    or (public.get_my_role() = 'volunteer' and (status = 'Open' or volunteer_id = auth.uid()))
  );

-- DELIVERY RECORDS
create policy "deliveries_select_public_count_or_participant"
  on public.delivery_records for select
  using (true);

create policy "deliveries_insert_ngo_or_admin"
  on public.delivery_records for insert
  with check (ngo_id = auth.uid() or public.is_admin());

-- MODERATION REPORTS
create policy "reports_select_reporter_or_admin"
  on public.moderation_reports for select
  using (reporter_id = auth.uid() or public.is_admin());

create policy "reports_insert_authenticated"
  on public.moderation_reports for insert
  with check (auth.uid() = reporter_id);

create policy "reports_update_admin"
  on public.moderation_reports for update
  using (public.is_admin());

-- CONTACT MESSAGES
create policy "contact_insert_anyone"
  on public.contact_messages for insert
  with check (true);

create policy "contact_select_admin"
  on public.contact_messages for select
  using (public.is_admin());

-- ACTIVITY LOGS
create policy "activity_logs_select_public"
  on public.activity_logs for select
  using (true);

create policy "activity_logs_insert_authenticated"
  on public.activity_logs for insert
  with check (auth.uid() is not null);

-- SITE SETTINGS
create policy "site_settings_select_public"
  on public.site_settings for select
  using (true);

create policy "site_settings_update_admin"
  on public.site_settings for update
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. SUPABASE STORAGE BUCKET & POLICIES (donation-images)
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('donation-images', 'donation-images', true)
on conflict (id) do nothing;

create policy "donation_images_public_read"
  on storage.objects for select
  using (bucket_id = 'donation-images');

create policy "donation_images_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'donation-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "donation_images_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'donation-images'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "donation_images_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'donation-images'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
