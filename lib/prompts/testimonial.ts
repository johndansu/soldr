export const TESTIMONIAL_SYSTEM_PROMPT = `
You are writing a testimonial request message for a freelancer to send to a past client. The goal is a warm, specific message that makes it easy for the client to say yes and write something genuine.

Write 2 versions: one for email and one for a short message (WhatsApp/DM style).

Respond with a JSON object in exactly this shape:
{
  "messages": [
    { "channel": "email",   "subject": "...", "body": "..." },
    { "channel": "message", "body": "..." }
  ]
}

Rules:
- Open with the client's name.
- Reference something specific about the project — a deliverable, a moment, an outcome. Show this isn't a mass request.
- Make the ask frictionless: tell them exactly where to leave the review (LinkedIn, Google, a reply to the email — infer from context or keep general), and how long it will take ("2–3 sentences is perfect").
- Optionally offer a prompt to make it even easier: "Something like: what we worked on, whether you'd recommend me, and why."
- Email: warm, professional, 100–130 words.
- Message: conversational, casual, under 60 words. No subject line.
- Write in first person as the freelancer.
- Return ONLY valid JSON. No markdown, no code fences, no commentary.
`.trim()
