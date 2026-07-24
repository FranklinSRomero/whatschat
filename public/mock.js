(() => {
  'use strict';

  const isGitHubPages = window.location.hostname.endsWith('.github.io');
  const isForcedDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
  const isStandaloneDemo = isGitHubPages || window.location.protocol === 'file:' || isForcedDemo;

  window.__WHATSCHAT_DEMO_MODE__ = isStandaloneDemo;

  if (!isStandaloneDemo) {
    return;
  }

  document.documentElement.dataset.demoMode = 'true';

  const now = Date.now();
  const timestamp = (minutesAgo) => new Date(now - minutesAgo * 60_000).toISOString();
  const demoState = {
    conversations: [
      {
        id: 'conv-lucia',
        contact: { name: 'Lucía Fernández', waId: '5491123456789' },
        lastMessage: { text: 'Perfecto, te confirmo apenas salga el pedido.', createdAt: timestamp(8) },
        updatedAt: timestamp(8),
      },
      {
        id: 'conv-casa-verde',
        contact: { name: 'Casa Verde Deco', waId: '5491139876543' },
        lastMessage: { text: 'El set de macetas Terracota está disponible.', createdAt: timestamp(42) },
        updatedAt: timestamp(42),
      },
      {
        id: 'conv-martin',
        contact: { name: 'Martín Suárez', waId: '5491165432109' },
        lastMessage: { text: 'Gracias por la recomendación 🙌', createdAt: timestamp(125) },
        updatedAt: timestamp(125),
      },
    ],
    messages: {
      'conv-lucia': [
        { id: 'msg-1', direction: 'INBOUND', text: 'Hola, ¿todavía tienen disponible el molinillo Barista Mini?', status: 'RECEIVED', createdAt: timestamp(28) },
        { id: 'msg-2', direction: 'OUTBOUND', text: '¡Hola Lucía! Sí, nos quedan tres unidades en color negro.', status: 'READ', createdAt: timestamp(24) },
        { id: 'msg-3', direction: 'INBOUND', text: 'Genial. ¿Podés enviarlo a Palermo?', status: 'RECEIVED', createdAt: timestamp(17) },
        { id: 'msg-4', direction: 'OUTBOUND', text: 'Claro, el envío llega mañana entre las 14 y las 18 hs.', status: 'READ', createdAt: timestamp(12) },
        { id: 'msg-5', direction: 'INBOUND', text: 'Perfecto, te confirmo apenas salga el pedido.', status: 'RECEIVED', createdAt: timestamp(8) },
      ],
      'conv-casa-verde': [
        { id: 'msg-6', direction: 'OUTBOUND', text: 'Hola, quería consultar por el set de macetas Terracota.', status: 'READ', createdAt: timestamp(65) },
        { id: 'msg-7', direction: 'INBOUND', text: '¡Hola! Sí, viene con tres tamaños y bandeja de bambú.', status: 'RECEIVED', createdAt: timestamp(57) },
        { id: 'msg-8', direction: 'INBOUND', text: 'El set de macetas Terracota está disponible.', status: 'RECEIVED', createdAt: timestamp(42) },
      ],
      'conv-martin': [
        { id: 'msg-9', direction: 'INBOUND', text: '¿Qué café me recomendás para prensa francesa?', status: 'RECEIVED', createdAt: timestamp(146) },
        { id: 'msg-10', direction: 'OUTBOUND', text: 'El Colombia Sierra Nevada tiene notas de chocolate y queda excelente.', status: 'READ', createdAt: timestamp(133) },
        { id: 'msg-11', direction: 'INBOUND', text: 'Gracias por la recomendación 🙌', status: 'RECEIVED', createdAt: timestamp(125) },
      ],
    },
  };

  const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

  const requestBody = async (input, init) => {
    const body = init?.body ?? (input instanceof Request ? input.clone().body : null);
    if (!body) return {};
    if (typeof body === 'string') return JSON.parse(body);
    return JSON.parse(await new Response(body).text());
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const requestUrl = input instanceof Request ? input.url : input;
    const url = new URL(requestUrl, window.location.origin);

    if (!url.pathname.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    const method = (init.method || (input instanceof Request && input.method) || 'GET').toUpperCase();
    const messagesMatch = url.pathname.match(/^\/api\/chat\/conversations\/([^/]+)\/messages$/);

    if (method === 'GET' && url.pathname === '/api/health') {
      return jsonResponse({ status: 'ok', mode: 'demo', timestamp: new Date().toISOString() });
    }

    if (method === 'GET' && url.pathname === '/api/chat/conversations') {
      return jsonResponse(demoState.conversations);
    }

    if (method === 'GET' && messagesMatch) {
      return jsonResponse(demoState.messages[messagesMatch[1]] || []);
    }

    if (method === 'POST' && url.pathname === '/api/chat/send') {
      const { conversationId, text } = await requestBody(input, init);
      const conversation = demoState.conversations.find((item) => item.id === conversationId);
      if (!conversation || !String(text || '').trim()) {
        return jsonResponse({ message: 'Conversación o mensaje inválido.' }, 400);
      }

      const message = {
        id: `msg-${Date.now()}`,
        direction: 'OUTBOUND',
        text: String(text).trim(),
        status: 'READ',
        createdAt: new Date().toISOString(),
      };
      demoState.messages[conversationId].push(message);
      conversation.lastMessage = { text: message.text, createdAt: message.createdAt };
      conversation.updatedAt = message.createdAt;
      return jsonResponse(message, 201);
    }

    if (method === 'POST' && url.pathname === '/api/chat/conversations') {
      const { waId } = await requestBody(input, init);
      const normalizedWaId = String(waId || '').replace(/\D/g, '');
      if (!normalizedWaId) {
        return jsonResponse({ message: 'Número de WhatsApp inválido.' }, 400);
      }

      const existing = demoState.conversations.find((item) => item.contact.waId === normalizedWaId);
      if (existing) return jsonResponse(existing);

      const conversation = {
        id: `conv-${Date.now()}`,
        contact: { name: null, waId: normalizedWaId },
        lastMessage: null,
        updatedAt: new Date().toISOString(),
      };
      demoState.conversations.unshift(conversation);
      demoState.messages[conversation.id] = [];
      return jsonResponse(conversation, 201);
    }

    return jsonResponse({ message: 'Endpoint no disponible en el demo.' }, 404);
  };
})();
