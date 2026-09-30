import Club from '../club';
import {getAdminUser} from '@/lib/access-auth';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getAdminUser();if(!user)return <main className="admin-gate"><h1>Нямате достъп</h1><p>Влезте с разрешения администраторски имейл чрез Cloudflare Access.</p><a className="button" href="/cdn-cgi/access/logout">Смени профила</a></main>;return <Club page="admin"/>}
