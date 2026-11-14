// ====== Интерфейс тренажёра ======
const LINES=[7,8,9,10];
const TOPIC={1:'1. Газ: p, n, T, энергия и скорость молекул',2:'2. Уравнение состояния и изопроцессы',3:'3. Работа газа и первый закон',4:'4. Тепловые машины',5:'5. Теплота и фазовые переходы',6:'6. Пар и влажность',7:'7. Смеси, поршни, перегородки'};
const MAXP=l=>l<=8?1:2;
const TARGET={7:75,8:90,9:120,10:90};
const INTERVAL=[10*60e3,864e5,3*864e5,7*864e5,16*864e5,35*864e5];
const LS='termo_7_10_v1';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
let ST={v:1,t:{},days:{},exams:[]};
function blank(){return {n:0,ok:0,streak:0,box:0,due:0,err:false,last:0,slow:0};}
const T=id=>ST.t[id]||(ST.t[id]=blank());

// ---------- хранение ----------
let dbRef=null,writing=false,dirty=false,timer=null;
function merge(a,b){const r={v:1,t:{},days:{},exams:[]};const ids=new Set(Object.keys(a.t||{}).concat(Object.keys(b.t||{})));
 for(const id of ids){const x=(a.t||{})[id],y=(b.t||{})[id];r.t[id]=!x?y:!y?x:((y.last||0)>(x.last||0)?y:x);}
 const ds=new Set(Object.keys(a.days||{}).concat(Object.keys(b.days||{})));for(const d of ds){const x=(a.days||{})[d]||{n:0,ok:0},y=(b.days||{})[d]||{n:0,ok:0};r.days[d]=x.n>=y.n?x:y;}
 const ex=(a.exams||[]).concat(b.exams||[]);r.exams=ex.filter((e,i)=>ex.findIndex(z=>z.d===e.d)===i).sort((p,q)=>p.d-q.d).slice(-40);return r;}
function setSync(t){const el=$('#sync');if(el)el.textContent=t;}
function save(){try{localStorage.setItem(LS,JSON.stringify(ST));}catch(e){}if(!dbRef)return;dirty=true;clearTimeout(timer);timer=setTimeout(flush,1500);}
async function flush(){if(!dbRef||writing||!dirty)return;writing=true;dirty=false;
 try{await dbRef.set({st:JSON.stringify(ST),at:Date.now()});setSync('Прогресс сохранён в аккаунте');}catch(e){setSync('Не удалось сохранить в аккаунт — прогресс есть в этом браузере');}
 writing=false;if(dirty)flush();}
async function initDb(){try{if(!window.claude||!window.claude.use){setSync('Офлайн-версия: прогресс хранится в этом браузере');return;}
 const db=await window.claude.use('db');if(!db){setSync('Прогресс хранится в этом браузере');return;}
 const ref=db.doc('progress/termo');const to=setTimeout(()=>setSync('Аккаунт пока недоступен — прогресс хранится в браузере'),10000);
 const snap=await ref.get();clearTimeout(to);if(snap.exists){const d=snap.data();if(d&&d.st){try{ST=merge(ST,JSON.parse(d.st));}catch(e){}}}
 dbRef=ref;setSync('Прогресс сохраняется в аккаунте');render();}catch(e){setSync('Прогресс хранится в этом браузере');}}
try{const s=localStorage.getItem(LS);if(s)ST=merge(ST,JSON.parse(s));}catch(e){}

// ---------- данные ----------
const BYID={};G.forEach(g=>BYID[g.id]=g);
function bookLine(g){return `<div class="book">Откуда тип: ${SRC[g.id]||'сборник Демидовой 2027, задание '+g.line}</div>`;}
function acc(st){return st.n?Math.round(100*st.ok/st.n):null;}
function record(id,ok,sec){const st=T(id),g=BYID[id];st.n++;st.last=Date.now();const fast=sec<=TARGET[g.line]*1.5;
 if(ok){st.ok++;st.streak++;if(!fast)st.slow++;
  if(fast){st.box=Math.min(st.box+1,INTERVAL.length);st.due=Date.now()+INTERVAL[st.box-1];}else{st.due=Date.now()+INTERVAL[0];}
  if(st.err&&st.streak>=2)st.err=false;}
 else{st.streak=0;st.box=0;st.err=true;st.due=Date.now()+INTERVAL[0];}
 const d=today();ST.days[d]=ST.days[d]||{n:0,ok:0};ST.days[d].n++;if(ok)ST.days[d].ok++;save();}

// ---------- серия ----------
let S=null; // {list:[ids], i, card, t0, results:[], filter}
function pickSeries(filter,onlyErr,len=12){
 let pool=G.filter(g=>filter==='all'||g.line===+filter||(filter.startsWith('t')&&g.topic===+filter.slice(1)));
 if(onlyErr)pool=pool.filter(g=>T(g.id).err);if(!pool.length)return [];
 const now=Date.now();const errs=SH(pool.filter(g=>T(g.id).err)),due=SH(pool.filter(g=>!T(g.id).err&&T(g.id).n&&T(g.id).due<=now)),
  fresh=SH(pool.filter(g=>!T(g.id).n)),rest=pool.filter(g=>T(g.id).n&&!T(g.id).err&&T(g.id).due>now).sort((a,b)=>(T(a.id).box-T(b.id).box)||((acc(T(a.id))||0)-(acc(T(b.id))||0)));
 let out=[];for(const g of errs.concat(due,fresh,rest))if(!out.includes(g.id))out.push(g.id);
 out=out.slice(0,len);while(out.length<len)out.push(P(pool).id);
 return out;}
function startSeries(filter,onlyErr){const list=pickSeries(filter,onlyErr);if(!list.length){$('#train').innerHTML='<div class="panel">Здесь пока пусто. '+(onlyErr?'Ошибок нет — отлично.':'')+'</div>';return;}
 S={list,i:0,results:[],filter,onlyErr};nextCard();}
function nextCard(){window.scrollTo(0,0);if(S.i>=S.list.length){finishSeries();return;}const g=BYID[S.list[S.i]];S.card=g.gen();S.g=g;S.t0=Date.now();S.done=false;drawCard();}
function answerUI(c,pref){
 if(c.kind==='num')return `<div class="ansrow"><span>Ответ:</span><input id="${pref}in" inputmode="decimal" autocomplete="off" placeholder="число"><span class="unit">${c.unit||''}</span></div>`;
 if(c.kind==='multi')return `<div class="stm">${c.stmts.map((s,i)=>`<label class="st"><input type="checkbox" value="${i+1}" name="${pref}m"><span><b>${i+1})</b> ${s.t}</span></label>`).join('')}</div>`;
 if(c.kind==='change')return `<div class="chg"><div class="leg">1 — увеличится · 2 — уменьшится · 3 — не изменится</div>${c.rows.map((r,i)=>`<div class="chrow"><span>${r}</span><span class="seg">${[1,2,3].map(v=>`<label><input type="radio" name="${pref}c${i}" value="${v}"><b>${v}</b></label>`).join('')}</span></div>`).join('')}</div>`;
 if(c.kind==='choice')return `<div class="opts">${c.opts.map((o,i)=>`<label class="opt"><input type="radio" name="${pref}o" value="${i+1}"><span>${o}</span></label>`).join('')}</div>`;
 if(c.kind==='match')return `<div class="mt"><ol class="mopts">${c.opts.map(o=>`<li>${o}</li>`).join('')}</ol>${c.rows.map((r,i)=>`<div class="chrow"><span><b>${r}</b></span><span class="seg">${[1,2,3,4].map(v=>`<label><input type="radio" name="${pref}x${i}" value="${v}"><b>${v}</b></label>`).join('')}</span></div>`).join('')}</div>`;}
function readAns(c,pref){
 if(c.kind==='num'){const v=($('#'+pref+'in')||{}).value||'';return v.trim();}
 if(c.kind==='multi')return [...document.querySelectorAll(`input[name="${pref}m"]:checked`)].map(x=>x.value).sort().join('');
 if(c.kind==='change')return c.rows.map((r,i)=>{const x=document.querySelector(`input[name="${pref}c${i}"]:checked`);return x?x.value:'_';}).join('');
 if(c.kind==='choice'){const x=document.querySelector(`input[name="${pref}o"]:checked`);return x?x.value:'';}
 if(c.kind==='match')return c.rows.map((r,i)=>{const x=document.querySelector(`input[name="${pref}x${i}"]:checked`);return x?x.value:'_';}).join('');}
function isOk(c,a){if(c.kind==='num'){const x=parseFloat(a.replace(/\s/g,'').replace(',','.').replace('−','-'));return isFinite(x)&&Math.abs(x-c.ans)<=1e-6*Math.max(1,Math.abs(c.ans));}return a===String(c.ans);}
function points(c,a,line){if(MAXP(line)===1)return isOk(c,a)?1:0;if(isOk(c,a))return 2;
 if(c.kind==='multi'){const A=new Set(a.split('').filter(Boolean)),B=new Set(String(c.ans).split(''));let d=0;for(const x of A)if(!B.has(x))d++;for(const x of B)if(!A.has(x))d++;return d===1?1:0;}
 let d=0;for(let i=0;i<String(c.ans).length;i++)if(a[i]!==String(c.ans)[i])d++;return d===1?1:0;}
function fmtAns(c){return c.kind==='num'?f(c.ans)+(c.unit?' '+c.unit:''):c.kind==='choice'?c.opts[+c.ans-1]:String(c.ans);}
function feedback(c,g,ok,given){return `<div class="fb ${ok?'ok':'bad'}"><div class="verdict">${ok?'Верно':'Неверно'}${ok?'':` — правильный ответ: <b>${fmtAns(c)}</b>`}${given&&!ok?` <span class="muted">(твой: ${esc(given)})</span>`:''}</div>
 <div class="sol">${c.sol}</div>${c.trap?`<div class="trap"><b>Ловушка:</b> ${c.trap}</div>`:''}<div class="ref">Вкладка «Конспект»: раздел ${TOPIC[g.topic]}</div>${bookLine(g)}</div>`;}
function drawCard(){const c=S.card,g=S.g;
 $('#train').innerHTML=`<div class="topbar"><button class="back" id="home">← Меню</button><span class="sw">Другой номер:${LINES.map(l=>`<button class="mini${S.filter===String(l)?' on':''}" data-l="${l}">${l}</button>`).join('')}</span></div><div class="panel card"><div class="cardhead"><span class="tag">№${g.line}</span><span class="ttl">${g.title}</span><span class="prog">${S.i+1}/${S.list.length}</span></div>
 <div class="q">${c.q}</div>${c.fig?`<div class="figwrap">${c.fig}</div>`:''}${c.ref?REFD:''}<div id="ansbox">${answerUI(c,'a')}</div>
 <div class="btns"><button id="chk" class="pri">Проверить</button><button id="idk">Не знаю</button><button id="quit" class="ghost">Закончить серию</button></div><div id="fbox"></div></div>`;
 $('#chk').onclick=()=>check(false);$('#idk').onclick=()=>check(true);$('#quit').onclick=()=>finishSeries();$('#home').onclick=goHome;
 document.querySelectorAll('#train .mini').forEach(b=>b.onclick=()=>startSeries(b.dataset.l,false));
 const inp=$('#ain');if(inp)inp.focus();}
function check(idk){if(S.done){S.i++;nextCard();return;}const c=S.card,g=S.g;const a=idk?'':readAns(c,'a');
 if(!idk&&(a===''||a.includes('_'))){$('#fbox').innerHTML='<div class="hint">Сначала дай ответ (или нажми «Не знаю»).</div>';return;}
 const ok=!idk&&isOk(c,a);const sec=(Date.now()-S.t0)/1000;record(g.id,ok,sec);S.results.push({id:g.id,ok,sec});S.done=true;
 if(!ok&&S.list.length<24&&S.list.slice(S.i+1).indexOf(g.id)<0){const pos=Math.min(S.i+P([3,4]),S.list.length);S.list.splice(pos,0,g.id);}
 $('#fbox').innerHTML=feedback(c,g,ok,a)+(ok&&sec>TARGET[g.line]*1.5?`<div class="muted small">Верно, но ${Math.round(sec)} с — цель до ${TARGET[g.line]} с. Карточка вернётся раньше.</div>`:'');
 $('#chk').textContent='Дальше';$('#idk').style.display='none';document.querySelectorAll('#ansbox input').forEach(x=>x.disabled=true);$('#chk').focus();}
function finishSeries(){if(!S)return;const n=S.results.length,ok=S.results.filter(r=>r.ok).length;const bad=[...new Set(S.results.filter(r=>!r.ok).map(r=>r.id))];
 $('#train').innerHTML=`<div class="panel"><h3>Серия окончена</h3><p>Верно: <b>${ok}</b> из ${n}${n?` (${Math.round(100*ok/n)}%)`:''}.</p>
 ${bad.length?`<p>Ошибки (вернутся с другими числами):</p><ul>${bad.map(id=>`<li>№${BYID[id].line} · ${BYID[id].title}</li>`).join('')}</ul>`:'<p>Без ошибок.</p>'}
 <div class="btns"><button class="pri" id="again">Ещё серия</button>${bad.length?'<button id="errs">Прорешать ошибки</button>':''}<button id="tomenu">В меню</button></div></div>`;
 $('#tomenu').onclick=goHome;
 $('#again').onclick=()=>startSeries(S.filter,false);if($('#errs'))$('#errs').onclick=()=>startSeries('all',true);S=null;renderBadges();}
function goHome(){S=null;show('train');}
function trainHome(){const d=ST.days[today()]||{n:0,ok:0};const chips=['all'].concat(LINES.map(String)).map(x=>`<button class="chip" data-f="${x}">${x==='all'?'Все 7–10':'№'+x}</button>`).join('');
 const tchips=Object.keys(TOPIC).map(k=>`<button class="chip sm" data-f="t${k}">${TOPIC[k]}</button>`).join('');
 $('#train').innerHTML=`<div class="panel"><p class="muted">Серия — 12 карточек. Сначала идут ошибки и то, что пора повторить; числа каждый раз новые.</p>
 <div class="lab">По номеру задания</div><div class="chips">${chips}</div><div class="lab">По разделу конспекта</div><div class="chips">${tchips}</div>
 <p class="muted small">Сегодня: ${d.n} карточек${d.n?`, верно ${Math.round(100*d.ok/d.n)}%`:''}.</p></div>`;
 document.querySelectorAll('#train .chip').forEach(b=>b.onclick=()=>startSeries(b.dataset.f,false));}

// ---------- как на ЕГЭ ----------
let EX=null;
function examStart(){const cards=LINES.map(l=>{const g=P(G.filter(x=>x.line===l));return {g,c:g.gen()};});EX={cards,t0:Date.now(),done:false};
 $('#exam').innerHTML=`<div class="topbar"><button class="back" id="exhome">← Меню</button></div><div class="panel"><p class="muted">Четыре задания подряд, как в бланке: №7 и №8 — по 1 баллу, №9 и №10 — по 2 балла (1 балл за одну ошибку). Ориентир — 7 минут.</p></div>`+
 cards.map((x,i)=>`<div class="panel card"><div class="cardhead"><span class="tag">№${x.g.line}</span><span class="ttl">${x.g.title}</span></div><div class="q">${x.c.q}</div>${x.c.fig?`<div class="figwrap">${x.c.fig}</div>`:''}${x.c.ref?REFD:''}<div>${answerUI(x.c,'e'+i)}</div><div id="efb${i}"></div></div>`).join('')+
 `<div class="panel"><button class="pri" id="exchk">Проверить вариант</button> <button id="exback">В меню</button> <span id="exres"></span></div>`;
 $('#exchk').onclick=examCheck;$('#exhome').onclick=$('#exback').onclick=()=>{EX=null;examHome();window.scrollTo(0,0);};}
function examCheck(){if(EX.done){examStart();return;}let sum=0;const sec=(Date.now()-EX.t0)/1000;
 EX.cards.forEach((x,i)=>{const a=readAns(x.c,'e'+i);const p=points(x.c,a,x.g.line);sum+=p;const max=MAXP(x.g.line);record(x.g.id,p===max,sec/4);
  $('#efb'+i).innerHTML=`<div class="pts">${p} из ${max}</div>`+feedback(x.c,x.g,p===max,a.replace(/_/g,'?'));});
 document.querySelectorAll('#exam input').forEach(x=>x.disabled=true);EX.done=true;ST.exams.push({d:Date.now(),s:sum,sec:Math.round(sec)});save();
 $('#exres').innerHTML=`<b>${sum} из 6</b> · ${Math.floor(sec/60)} мин ${Math.round(sec%60)} с`;$('#exchk').textContent='Новый вариант';renderBadges();}
function examHome(){const h=ST.exams.slice(-5).reverse();$('#exam').innerHTML=`<div class="panel"><p>Вариант из четырёх заданий 7–10 — по одному каждого номера, случайные типы и числа. Балл — по правилам ЕГЭ.</p>
 <button class="pri" id="exgo">Начать вариант</button>${h.length?`<div class="lab">Последние варианты</div><ul>${h.map(e=>`<li>${new Date(e.d).toLocaleDateString('ru-RU')} — ${e.s} из 6, ${Math.round(e.sec/60)} мин</li>`).join('')}</ul>`:''}</div>`;$('#exgo').onclick=examStart;}

// ---------- ошибки, итоги ----------
function errorsView(){const e=G.filter(g=>T(g.id).err);
 $('#errors').innerHTML=`<div class="panel">${e.length?`<p>Тип уходит из списка после двух верных ответов подряд (с новыми числами).</p><ul class="elist">${e.map(g=>`<li><span class="tag">№${g.line}</span> ${g.title} <span class="muted small">· верно ${acc(T(g.id))}% из ${T(g.id).n}</span></li>`).join('')}</ul><button class="pri" id="errgo">Прорешать ошибки</button>`:'<p>Ошибок нет. Новые появятся здесь сами.</p>'}</div>`;
 if($('#errgo'))$('#errgo').onclick=()=>{show('train');startSeries('all',true);};}
function statsView(){const now=Date.now();
 const row=(name,gs)=>{let n=0,ok=0,m=0,seen=0;gs.forEach(g=>{const s=T(g.id);n+=s.n;ok+=s.ok;if(s.box>=3)m++;if(s.n)seen++;});
  return `<tr><td>${name}</td><td>${seen}/${gs.length}</td><td>${n?Math.round(100*ok/n)+'%':'—'}</td><td>${m}/${gs.length}</td></tr>`;};
 const lines=LINES.map(l=>row('№'+l,G.filter(g=>g.line===l))).join('');const tops=Object.keys(TOPIC).map(k=>row(TOPIC[k],G.filter(g=>g.topic===+k))).join('');
 const weak=G.filter(g=>{const s=T(g.id);return s.n>=3&&s.ok/s.n<0.7;}).sort((a,b)=>acc(T(a.id))-acc(T(b.id)));
 const days=[];for(let i=34;i>=0;i--){const d=new Date(now-i*864e5);const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');days.push(ST.days[k]?ST.days[k].n:0);}
 let streak=0;for(let i=days.length-1;i>=0;i--){if(days[i]>0)streak++;else if(i<days.length-1)break;}
 const tot=Object.values(ST.t).reduce((a,s)=>a+s.n,0);
 $('#stats').innerHTML=`<div class="panel"><p>Всего ответов: <b>${tot}</b> · дней подряд: <b>${streak}</b></p>
 <div class="heat">${days.map(n=>`<span class="hc l${n===0?0:n<6?1:n<16?2:3}" title="${n}"></span>`).join('')}</div><div class="muted small">Активность за 5 недель</div>
 <table class="st"><tr><th>Номер</th><th>Типы начаты</th><th>Точность</th><th>Освоено</th></tr>${lines}</table>
 <table class="st"><tr><th>Раздел</th><th>Типы начаты</th><th>Точность</th><th>Освоено</th></tr>${tops}</table>
 <div class="muted small">«Освоено» — три верных быстрых ответа подряд с перерывами.</div>
 ${weak.length?`<div class="lab">Слабые места (точность ниже 70%)</div><ul>${weak.map(g=>`<li>№${g.line} · ${g.title} — ${acc(T(g.id))}%</li>`).join('')}</ul>`:''}
 <div class="btns"><button id="reset" class="ghost">Сбросить прогресс</button></div><div id="rconf"></div></div>`;
 $('#reset').onclick=()=>{$('#rconf').innerHTML='<p>Точно стереть весь прогресс? <button id="ry" class="bad">Да, стереть</button> <button id="rn">Нет</button></p>';$('#ry').onclick=()=>{ST={v:1,t:{},days:{},exams:[]};save();statsView();renderBadges();};$('#rn').onclick=()=>$('#rconf').innerHTML='';};}

// ---------- навигация ----------
function renderBadges(){const n=G.filter(g=>T(g.id).err).length;$('#errn').textContent=n?n:'';}
function show(tab){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));document.querySelectorAll('main>section').forEach(s=>s.hidden=s.id!==tab);
 if(tab==='train'){S=null;trainHome();}if(tab==='exam'){EX=null;examHome();}window.scrollTo(0,0);if(tab==='errors')errorsView();if(tab==='stats')statsView();}
function render(){renderBadges();const cur=document.querySelector('nav button.on');if(!cur)return;const t=cur.dataset.tab;if(t==='errors')errorsView();else if(t==='stats')statsView();else if(t==='train'&&!S)trainHome();}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&S&&!$('#train').hidden&&$('#chk')){e.preventDefault();check(false);}});
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.tab));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#train').hidden&&S)goHome();else if(!$('#exam').hidden&&EX){EX=null;examHome();}}});
// ---------- конспект: мини-графики и счётчик типов ----------
(function(){const b={w:170,h:130,ml:22,xmax:4.7,ymax:4.7,xt:[],yt:[],xl:false,yl:false,fw:170},L=(x,y,t,a)=>({x,y,t,a:a||'start'});
 const F=(xn,yn,o,capt)=>`<div>${gr(Object.assign({},b,{xn,yn},o))}${capt}</div>`,el=$('#mg');
 if(el)el.innerHTML=F('T','p',{dash:[[[0,0],[0.7,0.56]]],paths:[{pts:[[0.7,0.56],[3.3,2.64]]},{pts:[[0.5,3.9],[2.3,3.9]]},{pts:[[4.3,0.6],[4.3,3]]}],txt:[L(1.9,0.75,'V = const'),L(0.6,4.15,'p = const'),L(4.45,3.45,'T = const','end')]},'оси <i>p</i>–<i>T</i>')
  +F('T','V',{dash:[[[0,0],[0.7,0.56]]],paths:[{pts:[[0.7,0.56],[3.3,2.64]]},{pts:[[0.5,3.9],[2.3,3.9]]},{pts:[[4.3,0.6],[4.3,3]]}],txt:[L(1.9,0.75,'p = const'),L(0.6,4.15,'V = const'),L(4.45,3.45,'T = const','end')]},'оси <i>V</i>–<i>T</i>')
  +F('V','p',{fns:[{f:x=>2.1/x,x0:0.55,x1:4.3}],paths:[{pts:[[0.9,3.9],[3.2,3.9]]},{pts:[[4.2,1.2],[4.2,3.2]]}],txt:[L(1.5,1.75,'T = const'),L(0.9,4.1,'p = const'),L(4.1,2.6,'V = const','end')]},'оси <i>p</i>–<i>V</i>');
 const c=$('#cnt');if(c)c.innerHTML=`${G.length} типов задач: ${LINES.map(l=>'№'+l+' — '+G.filter(g=>g.line===l).length).join(', ')}. Тип — это отдельный сюжет со своим видом: расчёт, график, таблица, цикл, поршень, «как изменится», соответствие. Внутри типа несколько вариантов вопроса.`;})();
show('train');renderBadges();initDb();

