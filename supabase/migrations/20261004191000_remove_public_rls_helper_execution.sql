-- Esta função é disparada pelo banco em DDL; clientes jamais devem chamá-la.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
