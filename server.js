const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

app.post('/generate', async (req, res) => {
  const { name, company, email, stage, notes } = req.body;

  const prompt = `You are a sales assistant. Generate a concise pre-call brief.

Lead details:
Name: ${name}
Company: ${company}
Email: ${email}
Pipeline Stage: ${stage}
Last Notes: ${notes || 'No previous notes'}

Return ONLY a JSON object with exactly these keys:
{
  "who": "1-2 sentence description of who this person likely is",
  "company": "1-2 sentence overview of what the company does",
  "pain_points": "3 likely pain points as a short list",
  "talking_points": "3 specific talking points tailored to this lead",
  "watch_out": "1 specific thing to watch out for in this call"
}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
  const brief = JSON.parse(text);
  res.json(brief);
});

app.listen(process.env.PORT || 3000);
