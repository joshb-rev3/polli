-- Cashout lifecycle helpers (status only — balance moves via initiate/reverse_cashout).

create or replace function attach_cashout_transfer(
  p_payout_id uuid,
  p_stripe_transfer_id text,
  p_mark_paid boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p payouts;
begin
  select * into p from payouts where id = p_payout_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'payout_not_found');
  end if;

  if p.stripe_transfer_id is not null and p.stripe_transfer_id = p_stripe_transfer_id then
    return jsonb_build_object('ok', true, 'idempotent', true, 'payout_id', p.id, 'status', p.status);
  end if;

  update payouts
  set stripe_transfer_id = p_stripe_transfer_id,
      status = case when p_mark_paid then 'paid'::payout_status else 'in_transit'::payout_status end,
      completed_at = case when p_mark_paid then now() else completed_at end
  where id = p.id
  returning * into p;

  return jsonb_build_object('ok', true, 'payout_id', p.id, 'status', p.status);
end;
$$;

revoke all on function attach_cashout_transfer(uuid, text, boolean) from public, anon, authenticated;
grant execute on function attach_cashout_transfer(uuid, text, boolean) to service_role;
