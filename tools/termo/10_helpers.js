// ====== Генераторы задач 7–10 (МКТ и термодинамика) ======
const R=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const P=a=>a[Math.floor(Math.random()*a.length)];
const SH=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const rnd=(x,d=6)=>Math.round(x*10**d)/10**d;
const isNice=(x,d=3)=>Math.abs(x*10**d-Math.round(x*10**d))<1e-6;
const f=(x,d=3)=>{x=rnd(x,d);let s=String(x);if(s.includes('e'))s=x.toFixed(d);return s.replace('.',',').replace('-','−');};
function retry(fn,n=3000){for(let i=0;i<n;i++){const r=fn();if(r)return r;}throw new Error('retry failed');}
function raz(k){const s=f(k);if(s.includes(','))return 'в '+s+' раза';const n=Math.round(k)%100,l=n%10;return 'в '+s+((l>=2&&l<=4&&!(n>=12&&n<=14))?' раза':' раз');}
const END={f:'ась',m:'ся',n:'ось',p:'ись'};
function chg(k,g){const e=END[g];if(Math.abs(k-1)<1e-9)return 'не изменил'+e;return (k>1?'увеличил':'уменьшил')+e+' '+raz(k>1?k:rnd(1/k,6));}
const sgn=x=>x>0?1:x<0?-1:0;
// «увеличили в 3 раза» / «уменьшили в 2 раза»
const up=(k,a='увеличили',b='уменьшили')=>k>1?a+' '+raz(k):b+' '+raz(rnd(1/k,6));
// множитель в решении: 3; 1,5; 1/4
const fr=k=>k>=1?f(k):isNice(1/k,2)?'1/'+f(rnd(1/k,6)):f(k);
// код ответа «как изменится»: 1 — увеличится, 2 — уменьшится, 3 — не изменится
const CH=k=>k>1+1e-9?1:k<1-1e-9?2:3;
const CHD=d=>d>0?1:d<0?2:3;
const W3=(x,a='увеличивается',b='уменьшается',c='не изменяется')=>x>0?a:x<0?b:c;
const cap=s=>s[0].toUpperCase()+s.slice(1);
const tC=T=>f(T-273)+' °C';
const U0=(k,s)=>(k===1?'':f(k))+s;
const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a);
// целочисленное отношение для набора дробей [числитель, знаменатель]
function ratioStr(fracs){const L=fracs.reduce((a,x)=>a*x[1]/gcd(a,x[1]),1);let v=fracs.map(x=>Math.round(x[0]*L/x[1]));const g=v.reduce((a,x)=>gcd(a,x),0)||1;return v.map(x=>x/g).join(' : ');}
const EKIN='средняя кинетическая энергия теплового движения молекул';

// ---------- рисунки ----------
function arrow(x1,y1,x2,y2,cls='ax'){const a=Math.atan2(y2-y1,x2-x1),L=7,w=3.5;
 const p1=[x2-L*Math.cos(a)+w*Math.sin(a),y2-L*Math.sin(a)-w*Math.cos(a)],p2=[x2-L*Math.cos(a)-w*Math.sin(a),y2-L*Math.sin(a)+w*Math.cos(a)];
 return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/><polygon points="${x2},${y2} ${rnd(p1[0],1)},${rnd(p1[1],1)} ${rnd(p2[0],1)},${rnd(p2[1],1)}" class="ah"/>`;}
// график: o = {xmax,ymax,ymin,xt,yt,xn,yn,xl,yl, paths:[{pts,close,arr,cls}], dash:[[a,b]], fns:[{f,x0,x1,cls}], pts:[{x,y,t,d}], txt:[{x,y,t,dx,dy,a}]}
function gr(o){
 const W=o.w||320,H=o.h||215,ml=o.ml||48,mr=26,mt=18,mb=30,y0=o.ymin||0;
 const X=x=>rnd(ml+x/o.xmax*(W-ml-mr),2),Y=y=>rnd(mt+(o.ymax-y)/(o.ymax-y0)*(H-mt-mb),2);
 let s=`<svg viewBox="0 0 ${W} ${H}" class="fig" xmlns="http://www.w3.org/2000/svg"${o.fw?` style="--fw:${o.fw}px"`:''}>`;
 for(const x of o.xt)s+=`<line x1="${X(x)}" y1="${Y(y0)}" x2="${X(x)}" y2="${Y(o.ymax)}" class="g"/>`;
 for(const y of o.yt)s+=`<line x1="${X(0)}" y1="${Y(y)}" x2="${X(o.xmax)}" y2="${Y(y)}" class="g"/>`;
 s+=arrow(X(0),Y(y0),W-6,Y(y0))+arrow(X(0),Y(y0),X(0),6);
 const xl=o.xl===undefined?(x=>f(x)):o.xl,yl=o.yl===undefined?(y=>f(y)):o.yl;
 if(xl)for(const x of o.xt)s+=`<text x="${X(x)}" y="${Y(y0)+13}" class="tk" text-anchor="middle">${xl(x)}</text>`;
 if(yl)for(const y of o.yt)if(y0<0||Math.abs(y)>1e-12)s+=`<text x="${X(0)-4}" y="${Y(y)+4}" class="tk" text-anchor="end">${yl(y)}</text>`;
 if(y0===0)s+=`<text x="${X(0)-4}" y="${Y(0)+13}" class="tk" text-anchor="end">0</text>`;
 s+=`<text x="${W-4}" y="${Y(y0)-6}" class="lb" text-anchor="end">${o.xn}</text><text x="${X(0)+6}" y="12" class="lb">${o.yn}</text>`;
 for(const d of o.dash||[])s+=`<line x1="${X(d[0][0])}" y1="${Y(d[0][1])}" x2="${X(d[1][0])}" y2="${Y(d[1][1])}" class="g2"/>`;
 for(const fn of o.fns||[]){const pts=[];for(let i=0;i<=60;i++){const x=fn.x0+(fn.x1-fn.x0)*i/60;pts.push(X(x)+','+Y(fn.f(x)));}s+=`<polyline points="${pts.join(' ')}" class="${fn.cls||'cv'}"/>`;}
 for(const p of o.paths||[]){const q=p.close?p.pts.concat([p.pts[0]]):p.pts;s+=`<polyline points="${q.map(a=>X(a[0])+','+Y(a[1])).join(' ')}" class="${p.cls||'cv'}"/>`;
  if(p.arr)for(let i=0;i<q.length-1;i++){const x1=X(q[i][0]),y1=Y(q[i][1]),x2=X(q[i+1][0]),y2=Y(q[i+1][1]),a=Math.atan2(y2-y1,x2-x1),mx=(x1+x2)/2+4.5*Math.cos(a),my=(y1+y2)/2+4.5*Math.sin(a),L=9,w=4;
   s+=`<polygon points="${rnd(mx,1)},${rnd(my,1)} ${rnd(mx-L*Math.cos(a)+w*Math.sin(a),1)},${rnd(my-L*Math.sin(a)-w*Math.cos(a),1)} ${rnd(mx-L*Math.cos(a)-w*Math.sin(a),1)},${rnd(my-L*Math.sin(a)+w*Math.cos(a),1)}" class="${p.cls==='cv2'?'ah':'ah2'}"/>`;}}
 const pp=o.pts||[];if(pp.length){const cx=pp.reduce((a,p)=>a+X(p.x),0)/pp.length,cy=pp.reduce((a,p)=>a+Y(p.y),0)/pp.length;
  for(const p of pp){const px=X(p.x),py=Y(p.y);let dx=px-cx,dy=py-cy;const L=Math.hypot(dx,dy);if(p.d){dx=p.d[0];dy=p.d[1];}else if(L<2){dx=9;dy=-9;}else{dx=dx/L*13;dy=dy/L*13;}
   s+=`<circle cx="${px}" cy="${py}" r="2.8" class="dot"/>`;if(p.t!==undefined&&p.t!=='')s+=`<text x="${rnd(px+dx,1)}" y="${rnd(py+dy+4,1)}" class="lb" text-anchor="middle" style="font-weight:600">${p.t}</text>`;}}
 for(const t of o.txt||[])s+=`<text x="${rnd(X(t.x)+(t.dx||0),1)}" y="${rnd(Y(t.y)+(t.dy||0),1)}" class="lb" text-anchor="${t.a||'middle'}" style="font-weight:600">${t.t}</text>`;
 return s+'</svg>';}
// p–V в единицах p₀ и V₀
function pvUnits(o){return gr(Object.assign({xt:[1,2,3,4,5],yt:[1,2,3,4],xmax:5.8,ymax:4.8,xn:'V',yn:'p',xl:k=>U0(k,'V₀'),yl:k=>U0(k,'p₀')},o));}
// горизонтальный цилиндр с подвижным поршнем; share — доля объёма слева
function svgPist(share,l1,l2){const x0=20,x1=280,px=rnd(x0+(x1-x0)*Math.min(0.78,Math.max(0.22,share)),1);
 return `<svg viewBox="0 0 300 96" class="fig" style="--fw:300px" xmlns="http://www.w3.org/2000/svg"><rect x="${x0}" y="24" width="${x1-x0}" height="52" class="el"/><rect x="${px-4}" y="24" width="8" height="52" style="fill:var(--muted);stroke:var(--fg);stroke-width:1.2"/><text x="${rnd((x0+px)/2,1)}" y="54" class="lb" text-anchor="middle">${l1}</text><text x="${rnd((px+x1)/2,1)}" y="54" class="lb" text-anchor="middle">${l2}</text></svg>`;}
// вертикальный цилиндр с поршнем
function svgCyl(sand){let s=`<svg viewBox="0 0 220 170" class="fig" style="--fw:220px" xmlns="http://www.w3.org/2000/svg"><polyline points="60,18 60,150 150,150 150,18" class="w"/><rect x="61" y="66" width="88" height="11" style="fill:var(--muted);stroke:var(--fg);stroke-width:1.2"/><text x="105" y="118" class="lb" text-anchor="middle">газ</text><text x="160" y="76" class="lb">поршень</text>`;
 if(sand)s+=`<path d="M 78 66 Q 105 42 132 66 Z" style="fill:var(--line);stroke:var(--fg);stroke-width:1"/><text x="160" y="52" class="lb">песок</text>`;
 return s+'</svg>';}
// сосуд с перегородкой
function svgPor(l,r){return `<svg viewBox="0 0 300 110" class="fig" style="--fw:300px" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="20" width="260" height="70" class="el"/><line x1="150" y1="20" x2="150" y2="90" style="stroke:var(--fg);stroke-width:1.8;stroke-dasharray:5 4"/><text x="85" y="59" class="lb" text-anchor="middle">${l}</text><text x="215" y="59" class="lb" text-anchor="middle">${r}</text></svg>`;}

// ---------- банк типов ----------
// карточка: {q, fig, ref, kind:'num'|'multi'|'change'|'choice'|'match', ans, unit, rows, stmts, opts, sol, trap, m}
// m — «паспорт» карточки для независимой проверки (tests/termo-check.mjs): вариант и исходные числа
const G=[];
const SRC={};
const add=(id,line,topic,title,gen)=>G.push({id,line,topic,title,gen});
// вариант вопроса выбирается заранее, чтобы редкие (с жёсткими условиями на числа) не вытеснялись частыми
const vary=(list,fn)=>()=>{const v=P(list);return retry(()=>fn(v));};
// пять утверждений из пула: верных 2 или 3, тексты разные, не больше одного утверждения на тему (ключ k)
function pick5(pool){const seen=new Set(),list=SH(pool).filter(s=>s&&!seen.has(s.t)&&seen.add(s.t));
 for(const nT of SH([2,2,3]).filter((x,i,a)=>a.indexOf(x)===i)){const out=[],keys=new Set();let t=0,fl=0;
  for(const want of [true,false])for(const s of list){if(s.ok!==want||(s.k&&keys.has(s.k)))continue;if(want?t>=nT:fl>=5-nT)continue;out.push(s);if(s.k)keys.add(s.k);want?t++:fl++;}
  if(t===nT&&fl===5-nT){const ch=SH(out);return {stmts:ch,ans:ch.map((s,i)=>s.ok?i+1:0).filter(x=>x).join('')};}}
 return null;}
// справочные данные из КИМ ЕГЭ (как в начале варианта)
const REFD=`<details class="refd"><summary>Справочные данные (как в КИМ)</summary><table class="tbl"><tr><td>Удельная теплоёмкость, Дж/(кг·К)</td><td>вода 4,2·10<sup>3</sup>; лёд 2,1·10<sup>3</sup>; алюминий 900; железо 460; медь 380; свинец 130; чугун 500</td></tr><tr><td>Удельная теплота, Дж/кг</td><td>парообразования воды 2,3·10<sup>6</sup>; плавления льда 3,3·10<sup>5</sup>; плавления свинца 2,5·10<sup>4</sup></td></tr><tr><td>Молярная масса, г/моль</td><td>гелий 4; неон 20; аргон 40; азот 28; кислород 32</td></tr><tr><td>Постоянные</td><td><i>R</i> = 8,31 Дж/(моль·К); 0 °C = 273 К</td></tr></table></details>`;
