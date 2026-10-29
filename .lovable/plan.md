# Evolução da WALPIC AI

## Objetivo
Preservar nome, gatinho verde, aparência e dados atuais, evoluindo o atendimento e a operação por fases. Nenhuma função existente será removida sem autorização. A referência Consumer será usada somente para comparar funcionalidades.

Conforme o documento enviado, a aprovação deste plano autoriza **somente a fase 1**. As demais fases são o roteiro de evolução, não uma promessa de que tudo ficará pronto hoje.

## Auditoria inicial realizada
- O painel, cardápio, simulador, pedidos e cozinha abriram na conta do proprietário, sem erros de execução durante essa navegação. Nenhum pedido ou dado foi alterado.
- Os quatro testes existentes de preços e navegação passaram. Isso não comprova atendimento real completo.
- As 12 tabelas públicas consultadas têm proteção de acesso habilitada e políticas. Existem dois restaurantes, um pedido de teste, nenhum pedido real e nenhum evento de WhatsApp registrado.
- Produtos e adicionais já estão cadastráveis; pedidos usam preços calculados pelo banco. Há simulador de IA e painéis de pedidos/cozinha.
- A conexão atual é Z-API por QR code e usa uma instância compartilhada de teste, limitada a um restaurante. **Não é a integração oficial da Meta nem conexão independente para cada comprador.** A última tentativa conhecida falhou; não foi feita nova tentativa de envio nesta auditoria.
- Áudios, voz, estoque automático, caixa de entrada humana, pagamentos integrados, assinaturas e superadmin ainda não estão implementados de forma completa.
- A referência pública de bot descreve pedidos, encaminhamento humano e cozinha; áudio e pagamentos não foram confirmados nas páginas acessíveis.

## Fase 1 — Segurança e estrutura dos pedidos
1. Registrar inventário do que existe, está parcial e falta, com evidências e critérios de teste.
2. Corrigir proteção contra repetição de pedidos entre restaurantes e em solicitações simultâneas, preservando os pedidos existentes.
3. Restringir alterações de pedidos: preços e situação de pagamento não podem ser livremente modificados pelos funcionários; mudanças de etapa seguem funções autorizadas e transições válidas.
4. Validar produtos, adicionais, quantidades, modalidade, endereço e pedido mínimo no cálculo definitivo. Harmonizar o cálculo de prévia com o cálculo salvo.
5. Revisar recebimento de mensagens: verificar erros de gravação, impedir processamento simultâneo repetido, respeitar conversa assumida por humano e manter falhas recuperáveis sem reenviar mensagens de resultado incerto.
6. Criar e executar testes de isolamento, preços, repetição e permissões. Conferir o fluxo autenticado do simulador até um pedido de teste na cozinha, claramente identificado e sem cobrança comercial.

**Entrega:** base mais segura, relatório de verificação e pendências explícitas. A fase 1 não ativa WhatsApp oficial, pagamentos ou assinaturas.

## Roteiro das fases seguintes
| Fase | Entrega |
| --- | --- |
| 2 | Cardápio com variações, combos, estoque, importação revisada, carrinho persistente e simulador ampliado. |
| 3 | WhatsApp oficial: autorização por restaurante, estado real, recebimento e envio, histórico durável e diagnóstico. |
| 4 | IA contextual com texto e transcrição de áudio, produtos reais e confirmação expressa. |
| 5 | Respostas por voz, personalidade e preferências de áudio, com acompanhamento dos custos. |
| 6 | Caixa de entrada, assumir/devolver conversa, cozinha, alertas e impressão com conector local quando necessário. |
| 7 | Pagamentos confirmados pelo provedor, entrega configurável, atualizações permitidas por WhatsApp e relatórios exportáveis. |
| 8 | Funcionários e permissões, assinaturas, limites, teste configurável e painel superadmin. |
| 9 | Testes completos, monitoramento, revisão LGPD e preparação para comercialização. |

## Autorizações e dependências externas
- **WhatsApp por restaurante:** não há um conector individual de WhatsApp no catálogo consultado. O cadastro incorporado oficial exige integração própria e requisitos/aprovações da Meta. Essa alternativa será apresentada para autorização antes da fase 3; a Z-API atual não será removida agora.
- **Meta:** acesso empresarial, aplicativo e permissões aplicáveis, número comercial e configuração da autorização oficial. Credenciais serão solicitadas em formulário seguro, nunca na conversa.
- **Mensagens proativas:** consentimento e modelos aprovados quando exigidos; aceitação de envio não significa entrega.
- **Pagamentos e assinaturas:** conta e autorização do provedor antes de aceitar cobranças reais. Plano, preço e período de teste não serão inventados.
- **Impressão:** depende do equipamento e, para impressão automática, de um conector local adequado.
- Publicação das alterações será uma etapa explícita; nenhuma integração será anunciada funcionando sem configuração e teste real.

## Detalhes técnicos da fase 1
- Manter TanStack Start e Lovable Cloud. Alterações de estrutura serão aditivas, sem apagar tabelas, colunas ou histórico.
- `place_order` continua sendo a autoridade de preços. Busca por idempotência deve incluir `establishment_id`; concorrência precisa ser resolvida no banco, não só na tela.
- Conferir permissões de coluna e substituir atualizações amplas de pedidos por operações autorizadas que não aceitem totais ou confirmação de pagamento enviados pelo cliente.
- Adicionais devem pertencer ao produto e ao restaurante; validar duplicatas, disponibilidade, mínimos e valores de entrada antes de salvar.
- Manter RLS e verificação de papéis no servidor; testar acessos com usuários de restaurantes diferentes.
- Webhook privilegiado só grava após validação do remetente. Erros não devem ser tratados como sucesso; recuperação deve ser durável e executável, respeitando envio ambíguo.
- Não trocar o modelo de IA atual durante esta fase. Não usar dados inventados nem substituir o cardápio cadastrado.

## Critério para encerrar a fase 1
Testes novos e existentes passando; pedidos repetidos sem duplicação ou retorno de outro restaurante; valores protegidos no banco; pedido de teste visível na cozinha; falhas e bloqueios de integração documentados. Toda checagem não realizada será marcada como não verificada.