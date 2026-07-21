export async function onRequestPost(context) {
  try {
    const { system, messages, max_tokens } = await context.request.json();
    const userMsg = messages[0];
    const parts = [];

    if (typeof userMsg.content === 'string') {
      parts.push({ text: userMsg.content });
    } else if (Array.isArray(userMsg.content)) {
      userMsg.content.forEach(block => {
        if (block.type === 'text') parts.push({ text: block.text });
        else if (block.type === 'image') parts.push({ inline_data: { mime_type: block.source.media_type, data: block.source.data } });
      });
    }

    const geminiBody = {
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { maxOutputTokens: max_tokens || 1000 }
    };

    const model = 'gemini-2.5-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${context.env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) }
    );

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: (data.error && data.error.message) || 'Gemini API error' }), { status: response.status });
    }

    const text = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts
      ? data.candidates[0].content.parts.map(p => p.text || '').join('')
      : '');

    return new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
