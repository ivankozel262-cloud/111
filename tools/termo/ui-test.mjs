// Прогон тренажёра в браузере на экране телефона: каждый тип — верный ответ, неверный ответ, прогресс в localStorage
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url=process.argv[2]||'file:///home/claude/termo-src/termo.html',per=+(process.argv[3]||3);
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await ctx.route(/^https?:/,r=>r.abort());
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(url);await p.waitForTimeout(400);
const fill=async(pref,c,right)=>p.evaluate(([pref,c,right])=>{
 const wrong=s=>s.split('').map(d=>d==='1'?'2':'1').join('');
 if(c.kind==='num'){document.getElementById(pref+'in').value=right?String(c.ans).replace('.',','):String(c.ans+1);return;}
 if(c.kind==='multi'){const a=right?c.ans:(c.ans.includes('1')?c.ans.replace('1',''):c.ans+'1');for(const d of a)document.querySelector(`input[name="${pref}m"][value="${d}"]`).checked=true;return;}
 if(c.kind==='choice'){const a=right?c.ans:(c.ans==='1'?'2':'1');document.querySelector(`input[name="${pref}o"][value="${a}"]`).checked=true;return;}
 const a=right?c.ans:wrong(c.ans),n=c.kind==='change'?'c':'x';a.split('').forEach((d,i)=>document.querySelector(`input[name="${pref}${n}${i}"][value="${d}"]`).checked=true);},[pref,c,right]);
let n=0,bad=[],wide=0;
const types=await p.evaluate(()=>G.map(g=>g.id));
for(const id of types)for(let k=0;k<per;k++){const right=k!==1;
 const c=await p.evaluate(id=>{show('train');S={list:[id],i:0,results:[],filter:'all',onlyErr:false};nextCard();const x=S.card;return {kind:x.kind,ans:x.ans};},id);
 await fill('a',c,right);await p.click('#train button.pri');await p.waitForTimeout(20);
 const v=await p.evaluate(()=>{const f=document.querySelector('#train .fb');return {ok:!!(f&&f.classList.contains('ok')),bad:!!(f&&f.classList.contains('bad')),w:document.documentElement.scrollWidth};});
 n++;if(v.ok!==right||v.bad===right)bad.push(`${id}: ответ ${right?'верный':'неверный'}, а показано ${v.ok?'Верно':v.bad?'Неверно':'ничего'}`);if(v.w>392){wide++;bad.push(`${id}: страница шире экрана (${v.w}px)`);}
 if(k===0&&['cpt','cpv','tq2','ice','form','wpv','tab'].includes(id))await p.screenshot({path:`m_${id}.png`,fullPage:true});}
// вариант «как на ЕГЭ» с верными ответами — 6 из 6
for(let t=0;t<5;t++){await p.evaluate(()=>{show('exam');examStart();});const cs=await p.evaluate(()=>EX.cards.map(x=>({kind:x.c.kind,ans:x.c.ans})));
 for(let i=0;i<cs.length;i++)await fill('e'+i,cs[i],true);await p.click('#exchk');const r=await p.evaluate(()=>document.getElementById('exres').textContent);if(!/6 из 6/.test(r))bad.push('вариант: '+r);}
await p.screenshot({path:'m_exam.png',fullPage:true});
const store=await p.evaluate(()=>{const k=Object.keys(localStorage);return {keys:k,size:(localStorage.getItem('termo_7_10_v1')||'').length};});
for(const tab of ['errors','stats','theory','help']){await p.evaluate(t=>show(t),tab);await p.waitForTimeout(50);const w=await p.evaluate(()=>document.documentElement.scrollWidth);if(w>392)bad.push(tab+': шире экрана '+w);await p.screenshot({path:`m_tab_${tab}.png`,fullPage:true});}
// перезагрузка: прогресс цел
await p.reload();await p.waitForTimeout(300);const after=await p.evaluate(()=>(localStorage.getItem('termo_7_10_v1')||'').length);
console.log(`карточек: ${n}, ошибок интерфейса: ${bad.length}, ошибок в консоли: ${errs.length}`);console.log('localStorage:',store,'после перезагрузки:',after);
if(bad.length)console.log(bad.slice(0,20).join('\n'));if(errs.length)console.log(errs.slice(0,10).join('\n'));
await b.close();
