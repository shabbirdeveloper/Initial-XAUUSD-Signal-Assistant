select
  to_regclass('public.signals') as signals_table,
  to_regclass('public.backtests') as backtests_table,
  has_schema_privilege('anon', 'public', 'usage') as anon_public_usage,
  has_schema_privilege('authenticated', 'public', 'usage') as authenticated_public_usage,
  has_schema_privilege('service_role', 'public', 'usage') as service_role_public_usage,
  has_table_privilege('anon', 'public.signals', 'select') as anon_signals_select,
  has_table_privilege('anon', 'public.signals', 'insert') as anon_signals_insert,
  has_table_privilege('service_role', 'public.signals', 'select') as service_role_signals_select,
  has_table_privilege('service_role', 'public.signals', 'insert') as service_role_signals_insert,
  has_table_privilege('anon', 'public.backtests', 'select') as anon_backtests_select,
  has_table_privilege('anon', 'public.backtests', 'insert') as anon_backtests_insert,
  has_table_privilege('service_role', 'public.backtests', 'select') as service_role_backtests_select,
  has_table_privilege('service_role', 'public.backtests', 'insert') as service_role_backtests_insert,
  case when exists (select 1 from pg_roles where rolname = 'authenticator')
    then has_schema_privilege('authenticator', 'public', 'usage')
    else null
  end as authenticator_public_usage,
  case when exists (select 1 from pg_roles where rolname = 'authenticator')
    then has_table_privilege('authenticator', 'public.signals', 'select')
    else null
  end as authenticator_signals_select,
  case when exists (select 1 from pg_roles where rolname = 'authenticator')
    then has_table_privilege('authenticator', 'public.backtests', 'select')
    else null
  end as authenticator_backtests_select,
  current_setting('pgrst.db_schemas', true) as pgrst_db_schemas,
  current_setting('pgrst.db_extra_search_path', true) as pgrst_extra_search_path;

select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('signals', 'backtests')
order by tablename, policyname;

select pg_notify('pgrst', 'reload schema') as schema_reload_requested;
select pg_notify('pgrst', 'reload config') as config_reload_requested;
