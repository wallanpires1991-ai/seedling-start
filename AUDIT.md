# WALPIC AI — auditoria e primeira fase

## Verificado
- Bateria final: 22 testes passaram em quatro arquivos, incluindo oito verificações autenticadas e três testes de recuperação/pausa de mensagens.
- Navegação autenticada: painel, cardápio, simulador, pedidos e cozinha sem erros de execução observados.
- IA real: conversa com dois X-Burger Clássico, confirmação explícita, pedido de teste #1002 salvo e lido na cozinha. Não houve envio real pelo WhatsApp.
- Testes de cálculo: preços de cardápio, retirada sem taxa, produtos indisponíveis, adicionais inválidos/repetidos e quantidade.
- Testes autenticados: confirmações simultâneas retornam um pedido; restaurante não autorizado é rejeitado; atualização direta de totais/pagamento é rejeitada; endereço obrigatório; simulador não cria pedido real; etapas inválidas são rejeitadas.
- Tabelas existentes mantidas. Chave de pedido agora vinculada ao restaurante; registros antigos preservados.

## Reforços implementados
- Preços definitivos e validações em `place_order`; bloqueio de atualização direta de pedidos por funcionários.
- Etapas autorizadas por `transition_order`, com auditoria. Cozinha pode iniciar preparo e marcar pronto; entregadores só podem executar etapas de entrega.
- Prévia rejeita quantidades e adicionais inválidos em vez de cobrar silenciosamente um carrinho diferente.
- Recebimento Z-API com inserção idempotente, reserva com token, gravação durável antes de envio e finalização atômica da conversa/evento.
- Identificadores de envios aceitos ficam no checkpoint. Envios incertos ficam em revisão e não são reenviados automaticamente.
- Conversas em atendimento humano não invocam IA nem enviam respostas automáticas.
- Recuperação limitada é invocada em novas mensagens verificadas; tentativas adiadas não bloqueiam outros telefones. Na ausência de novas mensagens, a recuperação aguarda tráfego. Não há agendamento independente configurado.

## Limites e pendências — não está pronto para comercialização completa
- WhatsApp real e entrega de mensagens **não verificados**: credenciais Z-API anteriores falharam; nenhum número foi conectado nesta fase. Conexão atual aceita apenas uma instância de teste.
- Integração oficial Meta por restaurante, áudio, voz, caixa de entrada com controles de operador, pagamentos, assinaturas, estoque/importação/CRM e impressão ainda são fases futuras.
- Estados de envio incerto exigem revisão operacional; ainda não há tela de reconciliação nem callbacks de entrega do Z-API.
- Testes de lease expirado em banco, todas as combinações de papéis e dois restaurantes autorizados simultaneamente não foram executados; proteção está implementada, mas não foi comprovada integralmente nesses cenários.
- Cadastro/recuperação por e-mail e configurações hospedadas de autenticação não foram alterados nem verificados nesta fase.
- Não houve publicação durante a auditoria. Alterações da aplicação exigem publicação para aparecer no site publicado.

## Dependências para avançar
Autorizar e configurar cadastro oficial Meta independente por restaurante; habilitar provedor de cobranças e definir preços; escolher equipamento para impressão. Não solicitar nem guardar credenciais na conversa.