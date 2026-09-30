import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import Club from './app/club';
import './app/globals.css';

function App(){
  const [path,setPath]=useState(location.hash.slice(1)||'/');
  useEffect(()=>{const onChange=()=>{setPath(location.hash.slice(1)||'/');window.scrollTo(0,0)};window.addEventListener('hashchange',onChange);return()=>window.removeEventListener('hashchange',onChange)},[]);
  const route=path.split('?')[0];
  const page=({ '/':'home','/about':'about','/groups':'groups','/lessons':'lessons','/rehearsals':'rehearsals','/polls':'polls','/join':'join','/admin':'admin'} as Record<string,string>)[route]||'custom';
  return <Club page={page} slug={route.slice(1)}/>;
}

createRoot(document.getElementById('root')!).render(<App/>);
