import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {validateAccessToken} from './access-token.mjs';

export async function getAdminUser() {
  const h = await headers();
  // The admin Worker is protected in its entirety by Cloudflare Access.
  // Public API requests go through a separate Worker that strips identity headers.
  return validateAccessToken(h.get('Cf-Access-Jwt-Assertion'), env);
}
