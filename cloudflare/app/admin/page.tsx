import Club from '../club';
import {getAdminUser} from '@/lib/access-auth';
import Login from './login';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getAdminUser();if(!user)return <Login/>;return <><div style={{padding:'12px',textAlign:'right'}}><a href="/admin/accounts">Администратори</a> · <form action="/api/auth/logout" method="post" style={{display:'inline'}}><button className="button">Изход</button></form></div><Club page="admin"/></>}
