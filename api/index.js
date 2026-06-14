const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());

app.post('/generate', async (req, res) => {
  const { name, company, email, stage, notes } = req.body;

  let companyInfo = 'No additional enrichment data available.';
  try {
    const domain = email.split('@')[1];
    if (domain) {
      const hunterRes = await fetch(`https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=714a52c4ea3741cbd1675021f89bc541ee82b426`);
      const hunterData = await hunterRes.json();
      if (hunterData.data) {
        companyInfo = `Organization: ${hunterData.data.organization || 'unknown'}. Industry: ${hunterData.data.industry || 'unknown'}. Contacts found in database: ${hunterData.data.emails ? hunterData.data.emails.length : 0}.`;
      }
    }
  } catch (e) {}

  const prompt = `You are a sales assistant. Generate a concise pre-call brief.

Lead details:
Name: ${name}
Company: ${company}
Email: ${email}
Pipeline Stage: ${stage}
Last Notes: ${notes || 'No previous notes'}

Enrichment data from Hunter.io:
${companyInfo}

Return ONLY a JSON object with exactly these keys:
{
  "who": "1-2 sentence description of who this person likely is",
  "company": "1-2 sentence overview of what the company does, using the enrichment data if available",
  "pain_points": "3 likely pain points as a short list",
  "talking_points": "3 specific talking points tailored to this lead",
  "watch_out": "1 specific thing to watch out for in this call"
}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] })
  });

  const data = await response.json();

  try {
    const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const brief = JSON.parse(jsonMatch[0]);
    res.json(brief);
  } catch (err) {
    res.status(500).json({ error: 'Parse error', raw: data.choices[0].message.content });
  }
});

module.exports = app;
