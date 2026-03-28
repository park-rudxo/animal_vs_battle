const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const cheerio = require('cheerio');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchPageContent(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LaterAI/1.0)',
      },
    });
    const $ = cheerio.load(response.data);

    // Remove scripts, styles, nav, footer for cleaner content
    $('script, style, nav, footer, header, aside, .ad, #ad').remove();

    const title = $('title').text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('h1').first().text().trim() || '';

    const ogDescription = $('meta[property="og:description"]').attr('content') || '';
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const bodyText = $('article, main, .content, .post, body').first().text()
      .replace(/\s+/g, ' ').trim().slice(0, 8000);

    return { title, description: ogDescription || metaDescription, bodyText };
  } catch {
    return { title: '', description: '', bodyText: '' };
  }
}

async function analyzeContent(url, pageTitle = '') {
  const { title, description, bodyText } = await fetchPageContent(url);
  const effectiveTitle = pageTitle || title;

  const prompt = `You are an AI assistant helping users manage their "read/watch later" list.

Analyze this content and respond in JSON format only.

URL: ${url}
Title: ${effectiveTitle}
Description: ${description}
Content preview: ${bodyText.slice(0, 3000)}

Respond with this exact JSON structure:
{
  "title": "clean, readable title (use provided title if good, otherwise improve it)",
  "summary": "2-3 sentence summary in Korean of what this content is about and why it's worth reading/watching",
  "category": "one of: article, video, tool, tutorial, news, research, entertainment, shopping, other",
  "tags": ["tag1", "tag2", "tag3"],
  "reading_time_min": <estimated minutes to consume this content, integer>,
  "remind_hours": <suggested hours from now to remind the user, based on urgency and content type, integer between 1 and 168>,
  "why_save": "one sentence in Korean explaining why this is worth the user's time"
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text.trim();
  // Extract JSON from response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI did not return valid JSON');

  return JSON.parse(jsonMatch[0]);
}

module.exports = { analyzeContent };
