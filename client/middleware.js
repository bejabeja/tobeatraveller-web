const BOT_PATTERN = /whatsapp|telegram|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|applebot|imessage|viber/i;

export const config = {
  matcher: '/itinerary/:id*',
};

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!BOT_PATTERN.test(ua)) return;

  const url = new URL(request.url);
  const id = url.pathname.replace('/itinerary/', '').split('/')[0];
  if (!id) return;

  const apiUrl = process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:3000';
  return new Response(null, {
    status: 302,
    headers: { Location: `${apiUrl}/og/itinerary/${id}` },
  });
}
