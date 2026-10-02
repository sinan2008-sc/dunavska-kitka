import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import Club from './app/club';
import './app/globals.css';

function BackToTop(){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const update=()=>setVisible(window.scrollY>300);
    update();
    window.addEventListener('scroll',update,{passive:true});
    return()=>window.removeEventListener('scroll',update);
  },[]);
  if(!visible)return null;
  return <button type="button" className="back-to-top" aria-label="Обратно най-горе" title="Обратно най-горе" onClick={()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 12 6-6 6 6M12 6v13"/></svg>
  </button>;
}

function App(){
  const [path,setPath]=useState(location.hash.slice(1)||'/');
  useEffect(()=>{const onChange=()=>{setPath(location.hash.slice(1)||'/');window.scrollTo(0,0)};window.addEventListener('hashchange',onChange);return()=>window.removeEventListener('hashchange',onChange)},[]);
  const route=path.split('?')[0];
  const page=({ '/':'home','/about':'about','/groups':'groups','/lessons':'lessons','/rehearsals':'rehearsals','/polls':'polls','/join':'join','/admin':'admin'} as Record<string,string>)[route]||'custom';
  return <><Club page={page} slug={route.slice(1)}/><BackToTop/></>;
}

createRoot(document.getElementById('root')!).render(<App/>);
