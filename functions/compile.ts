import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  // 在 Cloudflare 仪表板中设置的变量
  // LLM_API_KEY: string;
  // LLM_MODEL: string;
  // LLM_ENDPOINT: string;
}

interface RequestBody {
  code: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const requestBody = await context.request.json() as RequestBody;
    const userCode = requestBody.code;

    if (!userCode || typeof userCode !== 'string' || userCode.length > 2000) {
      return new Response(JSON.stringify({ error: '无效的代码输入。' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- 模拟 LLM 调用 ---
    // 在实际应用中，这里会向 LLM_ENDPOINT 发送请求
    // const systemPrompt = `You are Parrot, an AI compiler that imitates human language...`;
    // const llmResponse = await fetch(context.env.LLM_ENDPOINT, { ... });
    // const data = await llmResponse.json();
    // let compiled = data.choices[0].message.content;

    // 模拟编译逻辑：简单地将 'pront' 替换为 'console.log'
    const compiled = userCode.replace(/pront/g, 'console.log');
    // --- 模拟结束 ---

    return new Response(JSON.stringify({ compiled }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: '服务器内部错误。' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
