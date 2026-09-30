export function publicRequest(request) {
  const headers = new Headers(request.headers);
  for (const name of Array.from(headers.keys())) {
    if (/^(cf-access-|oai-)/i.test(name) || /^(authorization|cookie)$/i.test(name)) headers.delete(name);
  }
  return new Request(request, {headers});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const media = /^\/api\/media\/[a-zA-Z0-9-]+$/.test(url.pathname);
    if (media && ['GET','HEAD'].includes(request.method)) return env.SERVER.fetch(publicRequest(request));
    if (url.pathname !== '/api/data') return new Response('Not found', {status:404});
    if (request.method === 'OPTIONS') return env.SERVER.fetch(publicRequest(request));
    if (request.method === 'POST') {
      try {
        if (Number(request.headers.get('content-length')) > 20000) throw Error();
        const body = await request.clone().text();
        if (body.length > 20000 || !['register','vote'].includes(JSON.parse(body).action)) throw Error();
      } catch { return new Response('Forbidden', {status:403}); }
    } else if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405});
    // Anonymous GET can never expose registrations, results or an admin session.
    return env.SERVER.fetch(publicRequest(request));
  }
};
