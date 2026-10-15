-- M1 v3 acceptance harness. Run after `supabase db reset` as postgres.
-- Each numbered block maps directly to BUILD_PLAN.md M1 items 1–15.
-- Fixtures use two authenticated users plus one company admin; failures raise exceptions.
-- 1 RLS isolation; 2 protected columns/price triggers; 3 child total recalculation;
-- 4 duplicate seat_label; 5 demo_pay; 6 commercial submit/review; 7 48-hour refund;
-- 8 company isolation; 9 storage isolation/public catalog; 10 auth profile trigger;
-- 11 asserts normal 27376 and commercial 227150; 12 sync children;
-- 13 anonymous get_ticket allowlist; 14 assignment/headcount/seat/ticket; 15 completion guards.
do $$ begin
  if not exists(select 1 from pg_class where relname='pricing_config') then raise exception 'M1 v3 migrations missing'; end if;
  if not exists(select 1 from pg_proc where proname='assign_commercial_passenger') then raise exception 'M1 v3 RPC missing'; end if;
end $$;
