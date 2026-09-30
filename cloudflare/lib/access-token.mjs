const caches = new Map();
const decode = (value) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const json = (value) => JSON.parse(new TextDecoder().decode(decode(value)));

// Validate identity at the origin too: service bindings do not pass through Access.
export async function validateAccessToken(token, config, fetcher = fetch) {
  try {
    const team = String(config.ACCESS_TEAM_DOMAIN || '');
    const audience = String(config.ACCESS_AUD || '');
    if (!token || !audience || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team)) return null;
    const parts = token.split('.');
    if (parts.length !== 3 || token.length > 16000) return null;
    const header = json(parts[0]);
    const claims = json(parts[1]);
    const now = Math.floor(Date.now() / 1000);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;
    if (claims.iss !== 'https://' + team || !Number.isFinite(claims.exp) || claims.exp <= now) return null;
    if (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now)) return null;
    if (!(Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes(audience)) return null;
    if (typeof claims.email !== 'string' || !claims.email.trim() || typeof claims.sub !== 'string' || !claims.sub) return null;
    let cached = caches.get(team);
    if (!cached || cached.expires <= Date.now()) {
      const response = await fetcher('https://' + team + '/cdn-cgi/access/certs', {signal: AbortSignal.timeout(5000)});
      if (!response.ok) return null;
      const data = await response.json();
      if (!Array.isArray(data.keys) || data.keys.length > 32) return null;
      cached = {keys: data.keys, expires: Date.now() + 300000};
      caches.set(team, cached);
    }
    const jwk = cached.keys.find(k => k.kid === header.kid && k.kty === 'RSA');
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, ['verify']);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]))) return null;
    const email = claims.email.trim().toLowerCase();
    const allowed = String(config.ADMIN_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    return allowed.includes(email) ? {userId:claims.sub,email,displayName:email} : null;
  } catch { return null; }
}
