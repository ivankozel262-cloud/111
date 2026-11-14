// Независимая проверка тренажёра «МКТ и термодинамика 7–10».
// Запуск из корня репозитория:  node tests/termo-check.mjs [путь к termo.html] [число запусков]
// Скрипт берёт генераторы прямо из HTML-файла и каждую карточку пересчитывает заново — своими формулами,
// написанными отдельно от генераторов (численное интегрирование работы, баланс энергий, подстановка ответа в уравнение).
import fs from 'fs';
const file=process.argv[2]||'trainers/termo.html',N=+(process.argv[3]||600);
const html=fs.readFileSync(file,'utf8');
const src=html.slice(html.indexOf('<script>')+8,html.indexOf('// ====== Интерфейс тренажёра ======'));
const {G,f}=new Function(src+';return {G,f};')();
const strip=s=>String(s).replace(/<sup>(.*?)<\/sup>/g,'^$1').replace(/<[^>]+>/g,'').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&nbsp;/g,' ');
const near=(a,b,e=1e-6)=>Math.abs(a-b)<=e*Math.max(1,Math.abs(a),Math.abs(b));
const sg=x=>x>1e-9?1:x<-1e-9?-1:0,mx=x=>x>1?x:1/x,RG=8.31;
const numBefore=(q,unit)=>{const m=strip(q).match(new RegExp('(−?\\d+(?:,\\d+)?)\\s*'+unit.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));return m?+m[1].replace(',','.').replace('−','-'):NaN;};
const matC=q=>{const t=strip(q);return /люмини/i.test(t)?900:/елезн/i.test(t)?460:/[Мм]едн/.test(t)?380:/винц/i.test(t)?130:/угунн/i.test(t)?500:/[Вв]од[уеа]/.test(t)?4200:NaN;};

// ---------- газ: состояния и численная работа ----------
const lin=(a,b,t)=>a+(b-a)*t;
// работа ∫p dV вдоль отрезка в плоскости диаграммы; map(x,y) -> {p,V,T}
function segNum(a,b,map){let A=0,pv=null,vmin=1e9,vmax=-1e9,pmin=1e9,pmax=-1e9,tmin=1e9,tmax=-1e9;const n=4000;
 for(let i=0;i<=n;i++){const s=map(lin(a[0],b[0],i/n),lin(a[1],b[1],i/n));if(pv)A+=(s.p+pv.p)/2*(s.V-pv.V);pv=s;vmin=Math.min(vmin,s.V);vmax=Math.max(vmax,s.V);pmin=Math.min(pmin,s.p);pmax=Math.max(pmax,s.p);tmin=Math.min(tmin,s.T);tmax=Math.max(tmax,s.T);}
 const s1=map(a[0],a[1]),s2=map(b[0],b[1]),dU=1.5*(s2.T-s1.T);if(Math.abs(A)<1e-7)A=0;
 return {s1,s2,A,dU,Q:dU+A,type:vmax-vmin<1e-9?'V':pmax-pmin<1e-9?'p':tmax-tmin<1e-9?'T':'x'};}
const MAP={pT:(x,y)=>({T:x,p:y,V:x/y}),VT:(x,y)=>({T:x,V:y,p:x/y}),pV:(x,y)=>({V:x,p:y,T:x*y}),UV:(x,y)=>({V:x,T:y,p:y/x})};
const qv=(s,q)=>q==='n'||q==='rho'?1/s.V:(q==='U'||q==='E')?s.T:s[q];
const psat=T=>0.611*Math.exp(17.27*(T-273)/(T-35.7)); // давление насыщенного пара растёт с температурой

// ---------- №7, №8: независимый пересчёт ответа ----------
// возвращает {exp} — ожидаемое число, либо {ok} — ответ подставлен в уравнение, либо {expS} — строка
const NUM={
 pnT:(m)=>m.v==='p'?{exp:m.p0*m.a*m.b}:m.v==='ratio'?{exp:mx(m.a*m.b)}:m.v==='n'?{exp:mx(m.k/m.b)}:{exp:mx((m.p2/m.p1)/m.a)},
 pnE:(m)=>m.v==='p'?{exp:m.p0*m.a*m.b}:m.v==='dp'?{exp:Math.abs(m.p0*m.a*m.b-m.p0)}:m.v==='E'?{exp:mx(m.k/m.a)}:{exp:mx(m.k/m.b)},
 ET:(m)=>m.v==='EC'?{exp:mx((m.t2+273)/(m.t1+273))}:(m.v==='vK'||m.v==='vC')?{exp:Math.sqrt(mx(m.T2/m.T1))}:{exp:(m.dir>0?(m.t1+273)*m.k:(m.t1+273)/m.k)-273},
 vT:(m)=>m.v==='T2'?{exp:m.T1*m.s*m.s}:m.v==='tC'?{exp:(m.t1+273)*m.s*m.s-273}:m.v==='k'?{exp:m.s}:{exp:m.s*m.s},
 dT:(m,c)=>{const T0=c.ans,k=m.k; // подставляем ответ: начальная/конечная температуры должны отличаться на ΔT и в k раз
  const [Ti,Tf]=m.fin?(m.dir>0?[c.ans-m.dT,c.ans]:[c.ans+m.dT,c.ans]):(m.dir>0?[c.ans,c.ans+m.dT]:[c.ans,c.ans-m.dT]);return {ok:near(m.dir>0?Tf/Ti:Ti/Tf,k)};},
 iso:(m)=>m.v==='pT'||m.v==='VT'?{exp:m.dir>0?m.T2/m.k:m.T2*m.k}:m.v==='pV'?{exp:m.dir>0?m.V2*m.k:m.V2/m.k}:m.v==='CpT'?{exp:m.p1*(m.t2+273)/(m.t1+273)}:{exp:m.V1*(m.t2+273)/(m.t1+273)},
 pv2:(m)=>{const k=m.p2*m.V2/(m.p1*m.V1);return m.v==='T2'?{exp:m.T1*k}:m.v==='v'?{exp:Math.sqrt(mx(k))}:{exp:mx(k)};},
 tab:(m,c)=>{const U=(m.hs==='A'?m.A:m.B).slice(),K=m.hs==='A'?m.B:m.A;U[m.hi]=c.ans;return {ok:near(U[0]*U[1]/U[2],K[0]*K[1]/K[2])};},
 pist:(m,c)=>m.v==='E'?{exp:m.k}:m.v==='n'?{ok:near(c.ans*m.T1,m.T2)}:m.v==='T'?{ok:near(m.nu1*c.ans/m.V1,m.nu2*1/m.V2)}:{ok:near(m.nu1*m.T1/c.ans,m.nu2*m.T2/(m.Vt-c.ans))},
 mk:(m,c)=>{const V=m.form==='A'?8.31*m.mm:m.nu*m.T/(10*m.mm),p=m.form==='A'?m.nu*m.T/m.mm:83.1*m.mm; // л и кПа
  const v={p,V,T:m.T,nu:m.nu};v[m.ask]=m.ask==='T'&&m.cel?c.ans+273:c.ans;return {ok:near(v.p*1e3*v.V*1e-3,v.nu*RG*v.T)};},
 phi:(m)=>m.v==='c'?{exp:Math.min(100,m.p1*m.k)}:m.v==='k'?{exp:100/m.p1}:m.v==='e'?{exp:m.p1/m.k}:{exp:Math.min(100,m.pv/m.pn*100*m.k)},
 cmt:(m,c)=>{const cc=matC(c.q),dt=m.t2-m.t1;if(m.v==='Q'||m.v==='cool')return {exp:cc*m.mass*dt/1000};const Q=numBefore(c.q,'кДж')*1000;return m.v==='m'?{exp:Q/(cc*dt)}:{exp:m.t1+Q/(cc*m.mass)};},
 tq:(m,c)=>{const dQ=m.qs*m.i*1000,dt=m.ts*m.j;return m.v==='c'?{exp:dQ/(m.mass*dt)}:m.v==='m'?{exp:dQ/(matC(c.q)*dt)}:{exp:dQ/dt*m.D/1000};},
 plat:(m)=>{const dQ=m.qs*(m.i2-m.i1);if(m.v==='lam'||m.v==='L')return {exp:dQ/m.mass};if(m.v==='m')return {exp:dQ/m.lamG};const cs=m.qs*m.i1/(m.ts*m.jm),cl=m.qs*(m.i3-m.i2)/(m.ts*(m.j3-m.jm));return {exp:mx(cl/cs)};},
 law1:(m,c)=>{const t=strip(c.q);let r; // Q = ΔU + A (A — работа газа)
  if(m.v==='ext')r=m.x-(-m.y);else if(m.v==='give')r=-m.x-(-m.y);else if(m.v==='dUA')r=m.x+m.y;else if(m.v==='dUdown')r=-m.x+m.y;else if(m.v==='two')r=m.x-m.y;else r=m.x-(-m.y);
  const word=m.v==='give'||m.v==='two'?(/увеличилась внутренняя/.test(t)?1:-1):m.v==='dUdown'?(/получил газ/.test(t)?1:-1):1;return {exp:Math.abs(r),ok:sg(r)===word};},
 adi:(m)=>m.v==='U12'?{exp:m.U1-m.U2}:m.v==='Ucomp'?{exp:m.U1+m.A}:m.v==='mono'?{exp:1.5*m.nu*RG*m.dT}:{exp:m.A/(1.5*m.nu*RG)},
 eng:(m)=>{const A=m.Qn*m.eta/100,Qx=m.Qn-A;return m.v==='eta'||m.v==='etaA'?{exp:(1-Qx/m.Qn)*100}:m.v==='A'?{exp:A}:m.v==='Qx'?{exp:Qx}:{exp:A*m.n/1000};},
 car:(m)=>{const e=1-m.Tx/m.Tn;return m.v==='etaC'?{exp:e*100}:m.v==='A'?{exp:m.Qn*e}:m.v==='TxC'?{exp:m.Tx-273}:m.v==='TnC'?{exp:m.Tn-273}:{exp:m.Qx/(1-e)};},
 wpv:(m)=>{const cf=m.sys?m.pu*m.vu*100:m.pu*m.vu,W=(a,b)=>segNum(a,b,MAP.pV).A,P_=m.pts;
  if(m.v==='isobar'||m.v==='slope')return {exp:Math.abs(W(P_[0],P_[1]))*cf};
  if(m.v==='path')return {exp:Math.abs(W(P_[0],P_[1])+W(P_[1],P_[2]))*cf};
  if(m.v==='cycle'){let s=0;P_.forEach((a,i)=>{s+=W(a,P_[(i+1)%P_.length]);});return {exp:Math.abs(s)*cf};}
  if(m.v==='ratio')return {exp:mx(W(P_[0],P_[1])/W(P_[2],P_[3]))};
  const w=[0,1,2].map(i=>W(P_[2*i],P_[2*i+1]));return {expS:String(w.indexOf(Math.max(...w))+1)};},
 isoq:(m)=>{const k={QA:1/2.5,QU:1.5/2.5,AQ:2.5,UA:1/1.5,UQ:2.5/1.5}[m.v];return k?{exp:m.x*k}:m.v==='pdV'?{exp:m.p*(m.V2-m.V1)+1.5*m.p*(m.V2-m.V1)}:{exp:m.nu*RG*m.dT+1.5*m.nu*RG*m.dT};},
 melt:(m,c)=>{const per=m.v==='pb'||m.v==='mpb'?130*(327-m.t1)+2.5e4:m.v==='ice'||m.v==='mice'?2100*m.t1+3.3e5:m.v==='steam'?4200*(100-m.t1)+2.3e6:m.v==='icew'?3.3e5+4200*m.t2:2.3e6+4200*(100-m.t2);
  return m.v==='mpb'||m.v==='mice'?{exp:numBefore(c.q,'кДж')*1000/per}:{exp:per*m.mass/1000};},
 bal:(m,c)=>m.v==='mix'?{ok:near(m.m1*(m.t1-c.ans),m.m2*(c.ans-m.t2))}:m.v==='mixm'?{ok:near(c.ans*(m.t1-m.th),m.m2*(m.th-m.t2))}:m.v==='metc'?{ok:near(c.ans*m.mm*(m.tm-m.th),4200*m.mw*(m.th-m.tw))}
  :m.v==='mett'?{ok:near(matC(c.q.replace(/вод[а-я]+/g,''))*m.mm*(c.ans-m.th),4200*m.mw*(m.th-m.tw))}:{ok:near(c.ans/1000*3.3e5,4200*m.mw*m.tw)},
};
// числа из «паспорта», которые обязаны стоять в тексте вопроса
const SHOWN={pnT:m=>m.v==='p'?[m.p0]:m.v==='T'?[m.p1,m.p2]:[],pnE:m=>m.p0?[m.p0]:[],ET:m=>m.v==='EC'?[m.t1,m.t2]:m.v==='vK'?[m.T1,m.T2]:m.v==='vC'?[m.T1-273,m.T2-273]:[m.t1,m.k],
 vT:m=>m.v==='T2'?[m.T1]:m.v==='tC'?[m.t1]:m.v==='k'?[m.s*m.s]:[m.s],dT:m=>[m.dT,m.k],iso:m=>m.T2?[m.T2,m.k]:m.V2?[m.V2,m.k]:m.p1?[m.t1,m.t2,m.p1]:[m.t1,m.t2,m.V1],
 pist:m=>m.v==='E'?[m.k]:m.v==='n'?[m.T1,m.T2]:m.v==='T'?[m.nu1,m.nu2,m.V1,m.V2]:[m.nu1,m.nu2,m.T1,m.T2,m.Vt],phi:m=>m.v==='pp'?[m.pv,m.pn,m.k]:m.v==='k'?[m.p1]:[m.p1,m.k],
 cmt:m=>m.v==='t2'?[m.mass,m.t1]:m.v==='m'?[m.t1,m.t2]:[m.mass,m.t1,m.t2],law1:m=>[m.x,m.y],adi:m=>m.v==='U12'?[m.U1,m.U2]:m.v==='Ucomp'?[m.U1,m.A]:m.v==='mono'?[m.nu,m.dT]:[m.nu,m.A],
 eng:m=>{const A=m.Qn*m.eta/100,Qx=m.Qn-A;return m.v==='eta'?[m.Qn,Qx]:m.v==='etaA'?[A,Qx]:m.v==='A'?[m.eta,Qx]:m.v==='Qx'?[m.eta,A]:[m.eta,m.Qn,m.n];},
 car:m=>{const e=Math.round((1-m.Tx/m.Tn)*100);return m.v==='etaC'?[m.Tn-273,m.Tx-273]:m.v==='A'?[m.Tn,m.Tx,m.Qn]:m.v==='TxC'?[e,m.Tn-273]:m.v==='TnC'?[e,m.Tx-273]:[m.Tn,m.Tx,m.Qx];},
 isoq:m=>m.x?[m.x]:m.p?[m.p,m.V1,m.V2]:[m.nu,m.dT],melt:m=>m.v==='mpb'||m.v==='mice'?[m.t1]:[m.mass,m.t1!==undefined?m.t1:m.t2],
 bal:m=>m.v==='mix'?[m.m1,m.m2,m.t1,m.t2]:m.v==='mixm'?[m.m2,m.t1,m.t2,m.th]:m.v==='metc'?[m.mm,m.tm,m.mw,m.tw,m.th]:m.v==='mett'?[m.mm,m.mw,m.tw,m.th]:[m.mw,m.tw]};

// ---------- №9: истинность каждого утверждения считается отдельно, численно ----------
const cyc=(m)=>{const map=MAP[m.ax],n=m.v.length;return {n,seg:(i,j)=>segNum(m.v[i],m.v[j],map),st:i=>map(m.v[i][0],m.v[i][1])};};
function gasClaim(sg_,c){ // общие утверждения об участке
 if(c.y==='type')return sg_.type===c.v&&sg(c.v==='V'?sg_.s2.T-sg_.s1.T:sg_.s2.V-sg_.s1.V)===c.d;
 if(c.y==='chg')return sg(qv(sg_.s2,c.q)-qv(sg_.s1,c.q))===c.d;
 if(c.y==='A'&&c.val===undefined)return sg(sg_.A)===c.d;
 if(c.y==='Q')return sg(sg_.Q)===c.d;
 if(c.y==='dU=Q')return near(sg_.dU,sg_.Q)&&sg_.Q>1e-9;
 if(c.y==='Q=A')return near(sg_.Q,sg_.A)&&sg_.Q>1e-9;
 throw new Error('claim? '+JSON.stringify(c));}
const MULTI={
 cpt:(m,c)=>{const C=cyc(m);if(c.y==='cmp'){const a=qv(C.st(c.i),c.q),b=qv(C.st(c.j),c.q);return c.r!==undefined?near(a/b,c.r):sg(a-b)===c.rel;}
  if(c.y==='cyc'){let s=0;for(let i=0;i<C.n;i++)s+=C.seg(i,(i+1)%C.n).A;return sg(s)===c.d;}return gasClaim(C.seg(c.s[0],c.s[1]),c);},
 cpv:(m,c)=>{const P_=m.c,S=P_.map(q=>MAP.pV(q[0],q[1])),seg=(i,j)=>segNum(P_[i],P_[j],MAP.pV),Ts=m.num?m.Tmax/Math.max(...S.map(s=>s.T)):1;let W=0;for(let i=0;i<4;i++)W+=seg(i,(i+1)%4).A;
  if(c.y==='W')return near(W,c.val);if(c.y==='Wsign')return sg(W)===c.d;if(c.y==='Tr')return near(Math.max(...S.map(s=>s.T))/Math.min(...S.map(s=>s.T)),c.r);
  if(c.y==='Tmin')return near(Ts*Math.min(...S.map(s=>s.T)),c.val);if(c.y==='Tat')return near(Ts*S[c.i].T,c.val);if(c.y==='Teq')return near(S[c.i].T,S[c.j].T);
  const g=seg(c.s[0],c.s[1]);if(c.y==='Q')return sg(g.Q)===c.d;if(c.y==='A')return near(g.A,c.val);if(c.y==='dU')return near(g.dU,c.val);throw new Error('claim? '+c.y);},
 two:(m,c)=>{const S=m.pts.map(q=>MAP.pV(q[0],q[1])),A=[segNum(m.pts[0],m.pts[1],MAP.pV).A,segNum(m.pts[2],m.pts[3],MAP.pV).A],cf=m.pu*m.vu;
  if(c.y==='Acmp')return sg(A[0]-A[1])===c.rel;if(c.y==='Aval')return near(A[c.pr]*cf,c.val);if(c.y==='Apos')return A[c.pr]>1e-9;
  const s1=S[2*c.pr],s2=S[2*c.pr+1],tr=c.q==='V'?s2.V/s1.V:(c.q==='n'||c.q==='rho')?s1.V/s2.V:(c.q==='T'||c.q==='U')?s2.T/s1.T:Math.sqrt(s2.T/s1.T);return near(tr,c.r);},
 p123:(m,c)=>{const S=m.c.map(q=>MAP.pV(q[0],q[1]));if(c.y==='cmp13')return sg(S[2].T-S[0].T)===c.rel;if(c.y==='r13')return near(S[2].T/S[0].T,c.r);
  const g=segNum(m.c[c.s[0]],m.c[c.s[1]],MAP.pV);if(c.y==='r')return near(c.q==='T'?g.s2.T/g.s1.T:Math.sqrt(g.s2.T/g.s1.T),c.r);if(c.y==='Q')return sg(g.Q)===c.d;if(c.y==='A')return near(g.A,c.val);if(c.y==='Apos')return g.A>1e-9;throw new Error('claim? '+c.y);},
 ice:(m,c)=>{const y=m.pts.map(p=>p[1]),plat=i=>y[i]===0&&y[i+1]===0,cont=i=>plat(i)?'mix':Math.min(y[i],y[i+1])<0?'ice':'water';
  const heat=i=>plat(i)?(y[i-1]<0?1:-1):sg(y[i+1]-y[i]); // на площадке: до неё был лёд — плавление (теплоту подводят), была вода — кристаллизация
  if(c.y==='cont')return cont(c.s)===c.v;if(c.y==='U'||c.y==='heat')return heat(c.s)===c.d;if(c.y==='Ek')return sg(y[c.s+1]-y[c.s])===c.d;if(c.y==='proc')return (heat(c.s)>0)===(c.v==='melt');
  if(c.y==='pt'){const other=y[c.i-1]!==0?y[c.i-1]:y[c.i+1];return (other<0?'ice':'water')===c.v;}throw new Error('claim? '+c.y);},
 tq2:(m,c)=>{const pts=b=>m.cool?[[0,b.a+b.j3],[b.i1,b.a+b.jm],[b.i2,b.a+b.jm],[b.i3,b.a]]:[[0,b.a],[b.i1,b.a+b.jm],[b.i2,b.a+b.jm],[b.i3,b.a+b.j3]];
  const D=m.B.map(b=>{const p=pts(b);return {c1:(p[1][0]-p[0][0])/Math.abs(p[1][1]-p[0][1]),c2:(p[3][0]-p[2][0])/Math.abs(p[3][1]-p[2][1]),lam:p[2][0]-p[1][0],tm:p[1][1],q1:p[1][0],q2:p[2][0]};});
  const R2=(a,b)=>c.r!==undefined?near(a/b,c.r):sg(a-b)===c.rel;
  if(c.y==='cr')return R2(D[0]['c'+c.ph],D[1]['c'+c.ph]);if(c.y==='lr')return R2(D[0].lam,D[1].lam);if(c.y==='tm')return sg(D[0].tm-D[1].tm)===c.rel;
  if(c.y==='Qfull')return near(m.qs*D[c.b].q2,c.val);if(c.y==='lam')return near(m.qs*D[c.b].lam/m.mass,c.val);if(c.y==='self')return sg(D[c.b].c2-D[c.b].c1)===c.rel;
  if(c.y==='state')return c.v==='done'?c.x>D[c.b].q2:c.x<D[c.b].q1;throw new Error('claim? '+c.y);},
 por:(m,c)=>{const X0=m.n1,Y0=m.n2,heX=m.n2/2,heY=m.n2/2,X1=m.n1+heX,Y1=heY; // равные объёмы и температура: давление, число частиц, энергия ~ ν
  switch(c.code){case 'nHeEq':return near(heX,heY);case 'allHe':return near(heX,m.n2);case 'pY':return near(Y1/Y0,c.val);case 'pX':return near(X1/X0,c.val);case 'pXgtY':case 'NXgtY':return X1>Y1+1e-9;case 'pEq':return near(X1,Y1);
   case 'pXY':return near(X1/Y1,c.val);case 'Uheavy':return near(m.n1/m.n1,c.val);case 'UY':return near(Y1/Y0,c.val);case 'UHe':return near((heX+heY)/m.n2,c.val);case 'Utot':return near((X1+Y1)/(X0+Y0),c.val);case 'nHeavy':return sg(m.n1-m.n1)===c.val;case 'ppHe':return near(heX,Y1);}throw new Error('code? '+c.code);},
 fpis:(m,c)=>{const E={heat:[2,2],cool:[.5,.5],sandT:[.5,1],unsandT:[2,1],sandAd:[.5,Math.pow(.5,-2/3)]}[m.sc],V2=E[0],T2=E[1],p2=T2/V2,dU=1.5*(T2-1);
  const A=m.sc==='heat'||m.sc==='cool'?1*(V2-1):m.sc==='sandAd'?-dU:1*Math.log(V2),Q=dU+A,val={p:[1,p2],V:[1,V2],n:[1,1/V2],U:[1,T2],F:[1,p2],E:[1,T2]};
  if(c.y==='chg')return sg(val[c.q][1]-val[c.q][0])===c.d;if(c.y==='A')return sg(A)===c.d;if(c.y==='Q')return sg(Q)===c.d;
  if(c.y==='law')return c.v==='Q=dU'?near(Q,dU):c.v==='Q>A'?Q>A+1e-9:c.v==='Q=A'?near(Q,A):near(A,-dU);throw new Error('claim? '+c.y);},
 hum:(m,c)=>{if(m.sc==='T'){const ph=[m.pA/m.pn*100,m.pB/m.pn*100],p=[m.pA,m.pB];
   if(c.y==='phi')return near(ph[c.day],c.val);if(c.y==='sat')return near(p[c.day],m.pn);if(c.y==='ratio')return near(p[1]/p[0],c.r);
   if(c.y==='cmp')return c.q==='phi'?sg(ph[1]-ph[0])===c.rel:c.q==='pn'?0===c.rel:sg(p[1]-p[0])===c.rel;throw new Error('claim? '+c.y);}
  const T1=288,T2=m.warm>0?298:278,p=1.0,v={phi:[p/psat(T1),p/psat(T2)],pn:[psat(T1),psat(T2)],dew:[p,p],n:[p/T1,p/T2],rho:[p/T1,p/T2]}[c.q];return sg(v[1]-v[0])===c.rel;},
};
MULTI.cvt=MULTI.cpt;

// ---------- №10 ----------
const dg=(a,b)=>near(a,b)?'3':b>a?'1':'2';
const CHANGE={
 carn:(m)=>{const st=(Tn,Tx,fix,val)=>{const e=1-Tx/Tn;return fix==='Qx'?{eta:e,Qx:val,Qn:val/(1-e),A:val/(1-e)-val}:{eta:e,Qn:val,A:e*val,Qx:(1-e)*val};};let a,b;
  if(m.v==='scale'){a=st(500,300,'Qn',1000);b=st(1000,600,'Qn',m.qd>0?1500:500);}else{const k=m.dir>0?1.2:1/1.2;a=st(500,300,m.v,600);b=m.what==='Tn'?st(500*k,300,m.v,600):st(500,300*k,m.v,600);}
  return m.keys.map(k=>dg(a[k],b[k])).join('');},
 path:(m)=>m.qs.map((q,i)=>{const map=MAP[m.ax],a=map(m.c[i][0],m.c[i][1]),b=map(m.c[i+1][0],m.c[i+1][1]);return dg(qv(a,q),qv(b,q));}).join(''),
 mix:(m)=>{const A0=m.n1,B0=m.n2,A1=(m.half?m.n1/2:m.n1)+m.dn,B1=m.half?m.n2/2:m.n2;return m.keys.map(k=>k[1]==='A'?dg(A0,A1):k[1]==='B'?dg(B0,B1):dg(A0+B0,A1+B1)).join('');},
 isoc:(m)=>{const E={Vh:[1,2],Vc:[1,.5],pe:[2,2],pc:[.5,.5],Te:[2,1],Tc:[.5,1],Ae:[2,Math.pow(2,-2/3)],Ac:[.5,Math.pow(.5,-2/3)]}[m.id],a={V:1,T:1,p:1},b={V:E[0],T:E[1],p:E[1]/E[0]};return m.qs.map(q=>dg(qv(a,q),qv(b,q))).join('');},
 sat:(m)=>{const M=10,rs=1,V0=4,V1=m.dir>0?2:8,v=V=>({p:rs,rho:rs,n:rs,mv:rs*V,ml:M-rs*V});return m.keys.map(k=>dg(v(V0)[k],v(V1)[k])).join('');},
 addg:(m)=>{const k=m.k,F={a:[k,k,1],b:[k,1,1],c:[1/k,1,1],d:[k,1,1/k],e:[1/k,1,k],g:[1/k,1/k,1]}[m.id],[nu,V,T]=F,b={p:nu*T/V,U:nu*T,n:nu/V,rho:nu/V,E:T};return m.qs.map(q=>dg(1,b[q])).join('');},
 uns:(m)=>{const T0=293,T1=m.dir>0?313:283,n=1,v=T=>({n,rho:n,m:n,p:n*T,pn:psat(T),phi:n*T/psat(T)/1000});return m.keys.map(k=>dg(v(T0)[k],v(T1)[k])).join('');},
};
// «величина — формула»: значения величин и формул считаются отдельно и сравниваются численно
const V_={nu:2.3,V:0.7,T:310,N:5e22,p:1.3e5,V1:0.2,V2:0.9,Qn:900,Qx:350,Tn:640,Tx:290,Q:770,m:1.7,lam:3.3e5,c:4200,dt:23,R:8.31,k:1.38e-23,NA:6.02e23};
const QUANT={nuVT:{'давление газа':v=>v.nu*v.R*v.T/v.V,'внутренняя энергия газа':v=>1.5*v.nu*v.R*v.T,'концентрация молекул газа':v=>v.nu*v.NA/v.V,'средняя кинетическая энергия теплового движения одной молекулы':v=>1.5*v.k*v.T},
 NVT:{'давление газа':v=>v.N*v.k*v.T/v.V,'внутренняя энергия газа':v=>1.5*v.N*v.k*v.T,'концентрация молекул газа':v=>v.N/v.V},
 isob:{'работа газа':v=>v.p*(v.V2-v.V1),'изменение внутренней энергии газа':v=>1.5*v.p*(v.V2-v.V1),'количество теплоты, полученное газом':v=>v.p*(v.V2-v.V1)+1.5*v.p*(v.V2-v.V1)},
 eng:{'работа, совершаемая машиной за цикл':v=>v.Qn-v.Qx,'КПД тепловой машины':v=>1-v.Qx/v.Qn},
 carnot:{'КПД машины':v=>1-v.Tx/v.Tn,'работа машины за цикл':v=>v.Q*(1-v.Tx/v.Tn),'количество теплоты, отданное холодильнику за цикл':v=>v.Q-v.Q*(1-v.Tx/v.Tn)},
 melt:{'количество теплоты, пошедшее на плавление льда':v=>v.lam*v.m,'количество теплоты, пошедшее на нагревание воды':v=>v.c*v.m*v.dt,'всё количество теплоты, полученное веществом':v=>v.lam*v.m+v.c*v.m*v.dt}};
const FORMS={'νRT/V':v=>v.nu*v.R*v.T/v.V,'(3/2)νRT':v=>1.5*v.nu*v.R*v.T,'νNA/V':v=>v.nu*v.NA/v.V,'(3/2)kT':v=>1.5*v.k*v.T,'νRT':v=>v.nu*v.R*v.T,'(3/2)νRT/V':v=>1.5*v.nu*v.R*v.T/v.V,'νV/(RT)':v=>v.nu*v.V/(v.R*v.T),'kT/V':v=>v.k*v.T/v.V,
 'NkT/V':v=>v.N*v.k*v.T/v.V,'(3/2)NkT':v=>1.5*v.N*v.k*v.T,'N/V':v=>v.N/v.V,'NkT':v=>v.N*v.k*v.T,'(3/2)kT/V':v=>1.5*v.k*v.T/v.V,'NV/(kT)':v=>v.N*v.V/(v.k*v.T),'N/(kT)':v=>v.N/(v.k*v.T),
 'p(V2 − V1)':v=>v.p*(v.V2-v.V1),'(3/2)p(V2 − V1)':v=>1.5*v.p*(v.V2-v.V1),'(5/2)p(V2 − V1)':v=>2.5*v.p*(v.V2-v.V1),'(1/2)p(V2 − V1)':v=>.5*v.p*(v.V2-v.V1),'2p(V2 − V1)':v=>2*v.p*(v.V2-v.V1),'p(V2 + V1)':v=>v.p*(v.V2+v.V1),
 'Qн − Qх':v=>v.Qn-v.Qx,'(Qн − Qх)/Qн':v=>(v.Qn-v.Qx)/v.Qn,'Qх/Qн':v=>v.Qx/v.Qn,'(Qн − Qх)/Qх':v=>(v.Qn-v.Qx)/v.Qx,'Qн + Qх':v=>v.Qn+v.Qx,
 '1 − Tх/Tн':v=>1-v.Tx/v.Tn,'Q(1 − Tх/Tн)':v=>v.Q*(1-v.Tx/v.Tn),'QTх/Tн':v=>v.Q*v.Tx/v.Tn,'Tх/Tн':v=>v.Tx/v.Tn,'QTн/Tх':v=>v.Q*v.Tn/v.Tx,'Q(Tн − Tх)/Tх':v=>v.Q*(v.Tn-v.Tx)/v.Tx,
 'λm':v=>v.lam*v.m,'cmΔt':v=>v.c*v.m*v.dt,'m(λ + cΔt)':v=>v.m*(v.lam+v.c*v.dt),'λmΔt':v=>v.lam*v.m*v.dt,'cm/Δt':v=>v.c*v.m/v.dt,'λ/m':v=>v.lam/v.m};
const SHAPE={isobar:{V:T=>T,U:T=>T,p:T=>1,n:T=>1/T,v:T=>Math.sqrt(T)},isochor:{p:T=>T,U:T=>T,V:T=>1,n:T=>1,v:T=>Math.sqrt(T)}};
const shp=fn=>{const r=fn(4)/fn(1);return near(r,4)?'lin0':near(r,1)?'const':near(r,.25)?'hyp':near(r,2)?'sqrt':'?';};
function formCheck(m,c){const errs=[],near=(a,b)=>Math.abs(a-b)<=1e-9*Math.max(Math.abs(a),Math.abs(b)); // величины бывают порядка 1e-21 — только относительное сравнение
 if(m.v==='f'){c.rows.forEach((row,i)=>{const want=QUANT[m.set][m.names[i]](V_),vals=c.opts.map(o=>{const k=strip(o);if(!FORMS[k])errs.push('нет формулы в проверке: '+k);return FORMS[k]?FORMS[k](V_):NaN;}),hit=vals.map((x,j)=>near(x,want)?j+1:0).filter(Boolean);
   if(hit.length!==1||String(hit[0])!==c.ans[i])errs.push(`соответствие ${m.names[i]}: подходят ${hit}, в ответе ${c.ans[i]}`);});}
 else{const all=SHAPE[m.pr];[0,1].forEach(i=>{const hit=m.opts.map((k,j)=>shp(all[k])===m.sh[i]?j+1:0).filter(Boolean);if(hit.length!==1||String(hit[0])!==c.ans[i])errs.push(`график ${i}: подходят ${hit}, в ответе ${c.ans[i]}`);});
  const QN={V:'объём газа',U:'внутренняя энергия газа',p:'давление газа',n:'концентрация молекул газа',v:'среднеквадратичная скорость теплового движения молекул'};if(m.opts.some((k,j)=>QN[k]!==c.opts[j]))errs.push('подписи вариантов не совпадают с величинами');}
 return errs;}

// ---------- прогон ----------
const fails=[],rep=[];let total=0,claims=0;
const bad=(g,c,msg)=>{if(fails.length<60)fails.push(`[${g.id}] ${msg}\n     Q: ${strip(c&&c.q||'').slice(0,300)}\n     ans: ${c&&c.ans}  m: ${JSON.stringify(c&&c.m).slice(0,300)}`);else fails.push('…');};
const ids=new Set();
for(const g of G){
 if(ids.has(g.id))fails.push('повтор id '+g.id);ids.add(g.id);
 const vars={},digits=new Set(),answers=new Set();let ex=0,nfig=0,kind='';
 for(let r=0;r<N;r++){let c;try{c=g.gen();}catch(e){if(ex++<3)bad(g,null,'исключение: '+e.message);continue;}
  total++;kind=c.kind;const m=c.m||{},vv=typeof m.v==='string'?m.v:(m.ask||m.sc||m.ax||m.id||(m.cool!==undefined?'cool'+m.cool:m.half!==undefined?'half'+m.half:m.num!==undefined?'num'+m.num:m.dir!==undefined?'dir'+m.dir:'-'));vars[vv]=(vars[vv]||0)+1;
  const txt=[c.q,c.sol,c.trap,c.fig||'',c.unit||''].concat((c.stmts||[]).map(s=>s.t),c.rows||[],c.opts||[]).join(' ');
  if(/undefined|NaN|null|\[object|Infinity/.test(txt))bad(g,c,'мусор в тексте: '+(txt.match(/.{20}(undefined|NaN|null|\[object|Infinity).{20}/)||[''])[0]);
  if(!c.q||!c.sol||!c.trap||!c.m)bad(g,c,'нет q/sol/trap/m');if(c.fig){nfig++;if(!/^<(svg|table|div)/.test(c.fig))bad(g,c,'странный рисунок');}
  if(strip(c.sol).length<40)bad(g,c,'слишком короткое решение');
  if(c.kind==='num'||c.kind==='choice'){
   if(!NUM[g.id]){bad(g,c,'нет независимой формулы');continue;}
   const e=NUM[g.id](m,c);
   if(c.kind==='num'){if(!(Number.isFinite(c.ans)&&c.ans>=0))bad(g,c,'ответ не число или отрицательный');if(typeof c.unit!=='string')bad(g,c,'нет единиц');
    if(Math.abs(c.ans*1000-Math.round(c.ans*1000))>1e-6)bad(g,c,'ответ — не конечная десятичная дробь до 3 знаков');
    if(!strip(c.sol).includes(f(c.ans)))bad(g,c,'в решении нет числа ответа '+f(c.ans));
    if(e.exp!==undefined&&!near(e.exp,c.ans))bad(g,c,`независимый пересчёт: ${e.exp}`);if(e.ok===false)bad(g,c,'ответ не удовлетворяет уравнению');
    if(e.exp===undefined&&e.ok===undefined)bad(g,c,'проверка ничего не вернула');
    if(e.exp!==undefined&&!Number.isFinite(e.exp))bad(g,c,'пересчёт дал не число');
    for(const x of (SHOWN[g.id]?SHOWN[g.id](m):[]))if(x!==undefined&&!strip(c.q).includes(f(x)))bad(g,c,'числа '+f(x)+' нет в тексте вопроса');answers.add(c.ans);}
   else{if(e.expS!==c.ans)bad(g,c,'выбор: ожидалось '+e.expS);if(!c.opts||+c.ans<1||+c.ans>c.opts.length)bad(g,c,'номер варианта вне списка');}}
  else if(c.kind==='multi'){
   const T=c.stmts.filter(s=>s.ok).length;if(c.stmts.length!==5)bad(g,c,'утверждений не 5');if(T<2||T>3)bad(g,c,'верных '+T);if(new Set(c.stmts.map(s=>s.t)).size!==5)bad(g,c,'повтор утверждения');
   if(c.ans!==c.stmts.map((s,i)=>s.ok?i+1:0).filter(Boolean).join(''))bad(g,c,'ответ не соответствует утверждениям');
   for(const s of c.stmts){claims++;let t;try{t=MULTI[g.id](m,s.c);}catch(e){bad(g,c,'утверждение без проверки: '+s.t+' / '+e.message);continue;}if(t!==s.ok)bad(g,c,`утверждение «${strip(s.t)}»: в карточке ${s.ok}, пересчёт ${t}`);}answers.add(c.ans);}
  else if(c.kind==='change'){
   if(String(c.ans).length!==c.rows.length||!/^[123]+$/.test(c.ans))bad(g,c,'длина или цифры ответа');const e=CHANGE[g.id](m);if(e!==c.ans)bad(g,c,'пересчёт: '+e);for(const d of c.ans)digits.add(d);answers.add(c.ans);}
  else if(c.kind==='match'){
   if(String(c.ans).length!==c.rows.length||c.opts.length!==4||new Set(c.opts.map(strip)).size!==4||!/^[1-4]+$/.test(c.ans)||new Set(c.ans).size!==c.ans.length)bad(g,c,'форма соответствия');for(const e of formCheck(m,c))bad(g,c,e);answers.add(c.ans);}
  else bad(g,c,'неизвестный вид '+c.kind);}
 if(ex)fails.push(`[${g.id}] исключений: ${ex}`);
 if(kind==='change'&&digits.size<3)fails.push(`[${g.id}] в ответах встречаются не все цифры 1, 2, 3: ${[...digits]}`);
 rep.push(`№${g.line} ${g.id.padEnd(5)} вариантов ${String(Object.keys(vars).length).padStart(2)} · разных ответов ${String(answers.size).padStart(3)} · с рисунком ${Math.round(100*nfig/N)}% · ${g.title}`);}
console.log(rep.join('\n'));
const by=l=>G.filter(g=>g.line===l).length;
console.log(`\nТипов: ${G.length} (№7 — ${by(7)}, №8 — ${by(8)}, №9 — ${by(9)}, №10 — ${by(10)}). Карточек проверено: ${total}, утверждений пересчитано: ${claims}.`);
if(fails.length){console.log('\nОШИБКИ: '+fails.length+'\n'+fails.slice(0,40).join('\n'));process.exit(1);}
console.log('Все проверки пройдены.');
