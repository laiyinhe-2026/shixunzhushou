const PPIO_CHAT_URL = "https://api.ppio.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "仅支持 POST 请求。" });
    return;
  }

  const apiKey = process.env.PPIO_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "服务端未配置 PPIO_API_KEY。" });
    return;
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch (error) {
    res.status(400).json({ error: "请求体不是有效 JSON。" });
    return;
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (messages.length === 0) {
    res.status(400).json({ error: "缺少 messages 参数。" });
    return;
  }

  try {
    const upstream = await fetch(PPIO_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: body.model || DEFAULT_MODEL,
        messages,
        temperature: Number.isFinite(body.temperature) ? body.temperature : 0.3,
        stream: false,
        response_format: { type: "text" }
      })
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: "PPIO 模型接口调用失败。",
        detail: text
      });
      return;
    }

    const data = JSON.parse(text);
    const answer = data.choices?.[0]?.message?.content?.trim();
    res.status(200).json({
      answer: answer || "模型没有返回有效内容，请稍后再试。"
    });
  } catch (error) {
    res.status(500).json({
      error: "服务端代理调用失败。",
      detail: error.message
    });
  }
};
