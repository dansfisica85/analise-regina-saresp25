/* Chat LLM module */
const Chat = (() => {
  let summaryText = '';
  let history = [];

  function init(data) {
    summaryText = data.summary_text || '';

    // Restore saved config
    const saved = localStorage.getItem('saresp_chat_config');
    if (saved) {
      try {
        const cfg = JSON.parse(saved);
        if (cfg.endpoint) document.getElementById('chat-endpoint').value = cfg.endpoint;
        if (cfg.model) document.getElementById('chat-model').value = cfg.model;
        if (cfg.apiKey) document.getElementById('chat-api-key').value = cfg.apiKey;
      } catch (e) {}
    }

    document.getElementById('btn-send-chat').addEventListener('click', sendMessage);
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Save config on change
    ['chat-endpoint', 'chat-model', 'chat-api-key'].forEach(id => {
      document.getElementById(id).addEventListener('change', saveConfig);
    });
  }

  function saveConfig() {
    const cfg = {
      endpoint: document.getElementById('chat-endpoint').value,
      model: document.getElementById('chat-model').value,
      apiKey: document.getElementById('chat-api-key').value,
    };
    localStorage.setItem('saresp_chat_config', JSON.stringify(cfg));
  }

  async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    const apiKey = document.getElementById('chat-api-key').value.trim();
    const endpoint = document.getElementById('chat-endpoint').value.trim();
    const model = document.getElementById('chat-model').value.trim();

    if (!apiKey) {
      addMessage('error', 'Configure sua API Key antes de enviar mensagens.');
      return;
    }
    if (!endpoint) {
      addMessage('error', 'Configure o endpoint da API antes de enviar mensagens.');
      return;
    }

    addMessage('user', text);
    input.value = '';

    history.push({ role: 'user', content: text });

    const btn = document.getElementById('btn-send-chat');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    const systemPrompt = `Você é um especialista em educação analisando os dados do SARESP 2025 (Sistema de Avaliação de Rendimento Escolar do Estado de São Paulo).

Abaixo estão os dados completos de 26 escolas estaduais em 8 municípios da Diretoria de Ensino - Região de Sertãozinho.

Responda SEMPRE em português brasileiro. Use os dados abaixo para fundamentar suas respostas com números específicos.
Se o usuário perguntar algo não coberto pelos dados, diga claramente que a informação não está disponível.
Formate as respostas de maneira clara e organizada.

DADOS COMPLETOS:
${summaryText}`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          apiKey,
          systemPrompt,
          model: model || 'claude-sonnet-4-20250514',
          apiEndpoint: endpoint,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      let assistantText = '';

      if (data.content && Array.isArray(data.content)) {
        assistantText = data.content.map(c => c.text || '').join('\n');
      } else if (data.content && typeof data.content === 'string') {
        assistantText = data.content;
      } else if (data.choices && data.choices[0]) {
        assistantText = data.choices[0].message.content;
      } else {
        assistantText = JSON.stringify(data);
      }

      history.push({ role: 'assistant', content: assistantText });
      addMessage('assistant', assistantText);
    } catch (err) {
      addMessage('error', `Erro: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enviar';
    }
  }

  function addMessage(role, text) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.innerHTML = formatText(text);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function formatText(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  }

  return { init };
})();
