-- Esta função é disparada pelo banco em DDL; clientes jamais devem chamá-la.
-- Alguns projetos hospedados antigos possuem o helper, enquanto uma instalação
-- local limpa não o cria. A revogação precisa ser reproduzível nos dois casos.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable()
      from public, anon, authenticated;
  end if;
end
$$;
