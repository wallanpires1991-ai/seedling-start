# Roadmap

## Em aberto
- [x] Conexão Z-API: chaves corrigidas (ID, Token e Client-Token da aba Segurança), número 553591653797 já pareado e reconhecido, webhooks de recebimento registrados; tela mostra "Conectado".
- [ ] Teste real ponta a ponta: usuário envia mensagem de outro celular para (35) 99165-3797 e confere resposta da IA e pedido registrado; só então declarar atendimento real pronto.
- [ ] Simplificar conexão: QR dentro da WALPIC, estado confirmado e falhas claras; não automatizar a página do WhatsApp Web.
- [ ] Respostas em áudio em pt-BR com voz de atendimento: implementar geração/envio durável e validar áudio recebido no aparelho; não declarar disponível antes disso.
- [ ] Evolução da qualidade do atendimento: usar cardápio e instruções aprovadas, preservar preços/confirmacão expressa e não prometer aprendizado automático sem supervisão.
- [ ] Evolução completa: fases 2–9 ainda não concluídas; usuário autorizou integração oficial Meta individual, que depende de aplicativo e permissões Meta. Pagamentos dependem de habilitação e preços; impressão depende do equipamento.
- [x] Auditoria inicial da evolução: painel autenticado, quatro testes, RLS e estrutura de pedidos conferidos; dados preservados.
- [x] Reforços da fase 1: isolamento de chaves, preços e permissões corrigidos; 22 testes passaram; pedido da IA confirmado e lido na cozinha como TESTE.
- [ ] Validação de produção da fase 1: callbacks reais, revisão de envios incertos, todos os papéis e isolamento entre dois restaurantes autorizados aguardam configuração e contas adequadas; ver AUDIT.md.
- [x] Renomear a marca para WALPIC AI em todo o app, mantendo a logo do gato e removendo "POWERED BY WPC" (feito em 27/10/2026).

- [ ] Integrações reais de pagamentos e impressão (pendentes).
- [ ] Painel superadmin, configuração avançada, importação, CRM/fidelidade, convites, edição de produto, revisão LGPD (fases pendentes do prompt mestre).

## Concluído
- [x] Fase 1 do MVP: perfis, cardápio, pedidos, cozinha, dashboard, simulador de IA, branding WEPIC AI.
