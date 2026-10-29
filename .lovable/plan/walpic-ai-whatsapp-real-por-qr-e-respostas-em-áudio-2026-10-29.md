# WALPIC AI — WhatsApp real por QR e respostas em áudio

Preservar a marca, o gato verde, os dados e as telas existentes. Priorizar a conexão Z-API solicitada agora, sem apresentar demonstrações como atendimento real.

## Entrega
1. **Conectar por QR dentro da WALPIC:** botão abre o código, com atualização automática, tempo de validade e mensagens claras de falha. Ler o código em WhatsApp → Aparelhos conectados. Não abrir nem automatizar a página do WhatsApp Web: ela não conecta a IA.
2. **Ativar atendimento real somente após confirmação:** atualizar as três chaves pelo formulário seguro, confirmar a conexão do número no aparelho e configurar o recebimento das mensagens. Separar “número conectado” de “atendimento verificado”. Não desconectar outro número sem autorização.
3. **Conversas e pedidos:** manter o atendimento existente com produtos do cardápio, valores calculados pelo sistema, confirmação expressa do cliente e envio para pedidos/cozinha. Atendimento humano continua interrompendo a IA.
4. **Respostas em áudio:** acrescentar opção de responder por áudio em português brasileiro, com voz de atendimento, geração de fala e envio pela Z-API. Manter texto disponível e registrar falhas sem reenviar mensagens incertas automaticamente.
5. **Qualidade contínua:** usar informações e instruções aprovadas do restaurante, sem alterar automaticamente preços, produtos ou regras com base nas conversas. Não prometer treinamento automático ou inteligência que se melhora sozinha.
6. **Verificar e colocar no ar:** conferir QR, conexão, mensagem recebida, resposta da IA, pedido confirmado lido na cozinha e áudio recebido no aparelho; publicar a versão verificada. As verificações são necessárias para produção, não um modo de demonstração.

## Dependências e limites
- As chaves atuais ainda não foram atualizadas: o formulário anterior foi cancelado. É necessário informar ID da instância, token da instância e Client-Token da conta em formulário seguro, nunca no chat.
- A leitura do QR no celular só pode ser feita por quem tem o aparelho. O número conectado será o da conta que ler o código; digitar um telefone não o conecta.
- Z-API é uma conexão não oficial por aparelho vinculado e pode sofrer desconexões ou bloqueio do WhatsApp. Cada restaurante precisa de sua própria instância; esta entrega não torna uma única instância compartilhável entre clientes.
- Se houver falha de credenciais, plano da Z-API, geração de fala ou recebimento das mensagens, informar o bloqueio e não declarar o atendimento pronto.

## Detalhes técnicos
- Preservar `createServerFn` autenticado, verificações de dono e isolamento por estabelecimento; não expor credenciais ao navegador.
- Corrigir tratamento de exceções, limpeza de carregamento, validação da imagem QR e atualização do estado de conexão. Só marcar configuração pronta depois de verificar gravações e configuração do callback.
- Integrar áudio ao processamento durável existente: configuração por estabelecimento, geração de fala no servidor, armazenamento protegido e checkpoints de envio com identificador do provedor. Falhas/resultado incerto devem permanecer rastreáveis.
- Preservar preços em `place_order`, idempotência e leases. Adicionar testes de regras novas e executar os testes relevantes; validar mensagens reais, não somente compilação ou estado “Conectado”.
- Publicar apenas alterações concluídas; descrever explicitamente qualquer recurso que permanecer dependente de configuração externa.