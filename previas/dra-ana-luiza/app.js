/* PAINEL CLÍNICA · Studio Evolution Tech (modelo Painel Serviços)
   Mesmo padrão da Gestão do Studio: programa público, dados num arquivo JSON dentro de um repositório PRIVADO do GitHub,
   chave do GitHub no cofre (cofre.json) criptografada com a senha. Iguais em todos os aparelhos.
   Para cada cliente, troque só o bloco CONFIG abaixo. */
(()=>{
'use strict';
const CONFIG={
 APP_NAME:'Dra. Ana Luiza Costa',      // nome que aparece no topo e nas mensagens
 PRO_NAME:'Dra. Ana Luiza',                   // quem assina as mensagens
 OWNER:'arnoldsuheth',                           // dono dos repositórios no GitHub
 REPO:'dra-ana-luiza-app',                // repositório público com o programa (e o cofre.json)
 COFRE_PATH:'cofre.json',
 DATA_REPO:'dra-ana-luiza-dados',          // repositório PRIVADO com os dados
 DATA_FILE:'dados.json',
 SLUG:'ana-luiza',
 RETORNO_MESES:6,                                // alerta de retorno
 COR:'#8b5a2b',                                  // cor principal
 SITE_URL:'https://arnoldsuheth.github.io/dra-ana-luiza-app/', // endereço do painel (a página de agendamento fica em agendar/)
 PUBLIC_FILE:'agenda-publica.json',
 DEMO:true                                       // true = prévia com dados de exemplo, sem nuvem               // só horários ocupados, sem nomes (lido pela página de agendamento)
};
const APP_NAME=CONFIG.APP_NAME,OWNER=CONFIG.OWNER,REPO=CONFIG.REPO,COFRE_PATH=CONFIG.COFRE_PATH,DATA_REPO=CONFIG.DATA_REPO,DATA_FILE=CONFIG.DATA_FILE;
const DATA_API=`/repos/${OWNER}/${DATA_REPO}/contents/${DATA_FILE}`;
const DEMO=CONFIG.DEMO||/[?&]demo\b/.test(location.search);
const LS={demo:'clin_'+CONFIG.SLUG+'_demo_v2',pub:'clin_'+CONFIG.SLUG+'_pub_v1',sess:'clin_'+CONFIG.SLUG+'_sessao_v1',cache:'clin_'+CONFIG.SLUG+'_cache_v1',cofre:'clin_'+CONFIG.SLUG+'_cofre_v1'};
const ITER=250000,DAY=864e5;
const $=s=>document.querySelector(s),app=$('#app'),dlg=$('#dlg');
const te=new TextEncoder(),td=new TextDecoder();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const b64=u=>{u=new Uint8Array(u);let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const ls={get(k){try{return JSON.parse(localStorage.getItem(k))}catch{return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}},del(k){try{localStorage.removeItem(k)}catch{}}};
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const today=()=>iso(new Date());
const addDias=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return iso(d)};
const addMeses=(s,n)=>{const d=new Date(s+'T12:00:00');const dia=d.getDate();d.setMonth(d.getMonth()+n);if(d.getDate()<dia)d.setDate(0);return iso(d)};
const money=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const toCents=v=>Math.round(Number(String(v).replace(/\./g,'').replace(',','.'))*100)||0;
const fromCents=c=>c?(c/100).toFixed(2).replace('.',','):'';
const dataBR=s=>s?new Date(s+'T12:00:00').toLocaleDateString('pt-BR'):'';
const diaSemana=s=>new Date(s+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'});
const mesKey=s=>(s||'').slice(0,7);
const mesNome=k=>new Date(k+'-15T12:00:00').toLocaleDateString('pt-BR',{month:'short'}).replace('.','');
const primeiro=n=>(n||'').trim().split(/\s+/)[0]||'';
const LOGO='mono-t.png',LOGO_FULL='logo-t.png';

/* ---------- cripto ---------- */
async function deriveKey(pw,salt,iter){const base=await crypto.subtle.importKey('raw',te.encode(pw),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},true,['encrypt','decrypt'])}
async function enc(k,obj){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,te.encode(JSON.stringify(obj)));return {iv:b64(iv),ct:b64(ct)}}
async function dec(k,box){return JSON.parse(td.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(box.iv)},k,unb64(box.ct))))}
const exportKey=async k=>b64(await crypto.subtle.exportKey('raw',k));
const importKey=s=>crypto.subtle.importKey('raw',unb64(s),{name:'AES-GCM'},true,['encrypt','decrypt']);

/* ---------- GitHub ---------- */
let SESS=null,KEY=null,COFRE=null;
async function gh(path,opts={},token){const t=token||SESS?.token;const r=await fetch('https://api.github.com'+path,{...opts,cache:'no-store',headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',Authorization:'Bearer '+t,...(opts.body?{'Content-Type':'application/json'}:{})}});if(!r.ok){const e=Error('GitHub '+r.status);e.status=r.status;throw e}return r.status===204?null:r.json()}
async function fetchCofre(){
 try{const r=await fetch('cofre.json?t='+Date.now(),{cache:'no-store'});if(r.ok){const j=await r.json();ls.set(LS.cofre,j);return j}
  const r2=await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${COFRE_PATH}`,{headers:{Accept:'application/vnd.github.raw+json'},cache:'no-store'});
  if(r2.ok){const j=await r2.json();ls.set(LS.cofre,j);return j}
  if(r.status===404&&r2.status===404)return null;return ls.get(LS.cofre)}
 catch{return ls.get(LS.cofre)||'offline'}}
async function putCofre(cofre,token){let sha;try{sha=(await gh(`/repos/${OWNER}/${REPO}/contents/${COFRE_PATH}`,{},token)).sha}catch(e){if(e.status!==404)throw e}
 await gh(`/repos/${OWNER}/${REPO}/contents/${COFRE_PATH}`,{method:'PUT',body:JSON.stringify({message:'Cofre do painel (criptografado)',content:b64(te.encode(JSON.stringify(cofre,null,1))),sha})},token);ls.set(LS.cofre,cofre)}


/* ---------- dados da clínica ---------- */
const KINDS=['patients','appointments','treatments','entries','tasks'];
function emptyState(){return {v:1,updatedAt:Date.now(),deleted:{},agenda:{...AG_PADRAO,updatedAt:0},care:{updatedAt:0},patients:[],appointments:[],treatments:[],entries:[],tasks:[]}}
let S=null;
/* ---------- página de agendamento (horários publicados sem nomes) ---------- */
const AG_PADRAO={ativo:true,whatsapp:'',dias:[1,2,3,4,5],inicio:'08:00',fim:'18:00',intervalo:30,pausaIni:'12:00',pausaFim:'13:30',antecedenciaH:12,semanas:3,folgas:[],endereco:'',procedimentos:['Avaliação','Limpeza','Revisão','Clareamento','Dor / urgência','Outro']};
const agCfg=()=>({...AG_PADRAO,...(S&&S.agenda||{})});
let pubLast=ls.get(LS.pub)||'';
async function publicarAgenda(force){if(DEMO||!SESS||!S)return false;const g=agCfg();
 const corpo={v:1,cfg:{ativo:g.ativo,whatsapp:g.whatsapp,dias:g.dias,inicio:g.inicio,fim:g.fim,intervalo:+g.intervalo,pausaIni:g.pausaIni,pausaFim:g.pausaFim,antecedenciaH:+g.antecedenciaH,semanas:+g.semanas,folgas:g.folgas,endereco:g.endereco,procedimentos:g.procedimentos},
  ocupados:S.appointments.filter(a=>a.date>=today()&&a.status!=='Cancelado'&&a.status!=='Faltou').map(a=>({d:a.date,h:a.time,m:+a.duration||30})).sort((x,y)=>(x.d+x.h).localeCompare(y.d+y.h))};
 const txt=JSON.stringify(corpo);if(!force&&txt===pubLast)return true;
 const path=`/repos/${OWNER}/${REPO}/contents/${CONFIG.PUBLIC_FILE}`;
 for(let i=0;i<3;i++){let sha;try{sha=(await gh(path+'?t='+Date.now())).sha}catch(e){if(e.status!==404)throw e}
  try{await gh(path,{method:'PUT',body:JSON.stringify({message:'Atualiza horários livres da página de agendamento',content:b64(te.encode(JSON.stringify({...corpo,atualizado:new Date().toISOString()},null,1))),...(sha?{sha}:{})})});pubLast=txt;ls.set(LS.pub,txt);return true}
  catch(e){if(e.status!==409&&e.status!==422)throw e}}
 return false}

function merge(a,b){ // junta dois estados: vence a versão mais nova de cada item; exclusões valem
 if(!a)return b;if(!b)return a;const deleted={...a.deleted,...b.deleted};for(const k in b.deleted)deleted[k]=Math.max(a.deleted?.[k]||0,b.deleted[k]);
 const out={v:1,updatedAt:Math.max(a.updatedAt||0,b.updatedAt||0),deleted,agenda:((b.agenda?.updatedAt||0)>(a.agenda?.updatedAt||0)?b.agenda:a.agenda)||{...AG_PADRAO,updatedAt:0},care:((b.care?.updatedAt||0)>(a.care?.updatedAt||0)?b.care:a.care)||{updatedAt:0}};
 for(const kind of KINDS){const m=new Map();for(const x of [...(a[kind]||[]),...(b[kind]||[])]){const cur=m.get(x.id);if(!cur||(x.updatedAt||0)>(cur.updatedAt||0))m.set(x.id,x)}
  out[kind]=[...m.values()].filter(x=>!(deleted[x.id]&&deleted[x.id]>=(x.updatedAt||0)))}
 return out}
async function cacheLocal(){if(KEY)ls.set(LS.cache,await enc(KEY,S))}
let syncState='ok',pushT=null,pushing=false,again=false;
function setSync(s){syncState=s;const el=$('#sync');if(el){el.className='sync '+(s==='ok'?'':s==='busy'?'busy':'off');el.innerHTML='<i></i>'+(DEMO?'Prévia':s==='ok'?'Salvo na nuvem':s==='busy'?'Salvando…':'Sem internet: salvo no aparelho')}}

async function pull(){ // devolve {state,sha}; arquivo ainda não criado = {state:null,sha:''}
 try{const j=await gh(DATA_API+'?t='+Date.now());const raw=td.decode(unb64(j.content.replace(/\n/g,'')));return {state:JSON.parse(raw),sha:j.sha}}
 catch(e){if(e.status===404)return {state:null,sha:''};throw e}}
async function push(){if(pushing){again=true;return}pushing=true;setSync('busy');
 try{for(let i=0;i<3;i++){const r=await pull();S=merge(S,r.state);await cacheLocal();
   try{await gh(DATA_API,{method:'PUT',body:JSON.stringify({message:'Atualiza dados do consultório',content:b64(te.encode(JSON.stringify(S,null,1))),...(r.sha?{sha:r.sha}:{})})});setSync('ok');render();publicarAgenda().catch(()=>{});return}
   catch(e){if(e.status!==409&&e.status!==422)throw e}}
  throw Error('conflito')}
 catch(e){setSync('off');if(e.status===401||e.status===403)toast('A chave do GitHub venceu ou foi removida. Vá em Ajustes → Trocar chave.')}
 finally{pushing=false;if(again){again=false;push()}}}
function persist(){S.updatedAt=Date.now();if(DEMO){ls.set(LS.demo,S);setSync('ok');return}cacheLocal();setSync('busy');clearTimeout(pushT);pushT=setTimeout(push,1200)}
function upsert(kind,obj){obj.updatedAt=Date.now();const i=S[kind].findIndex(x=>x.id===obj.id);if(i>=0)S[kind][i]=obj;else S[kind].push(obj);persist()}
function remove(kind,id){S[kind]=S[kind].filter(x=>x.id!==id);S.deleted[id]=Date.now();persist()}

const waLink=(phone,texto)=>{let n=(phone||'').replace(/\D/g,'');if(n&&n.length<=11)n='55'+n;return 'https://wa.me/'+n+'?text='+encodeURIComponent(texto)};
const MSG={
 confirmar:(p,a)=>`Olá, ${primeiro(p.name)}! Aqui é do consultório da ${APP_NAME}. 😊\nPassando para confirmar sua consulta ${a.date===today()?'hoje':a.date===addDias(today(),1)?'amanhã':'em '+diaSemana(a.date)}, às ${a.time}${a.procedure?' ('+a.procedure+')':''}.\nPosso confirmar sua presença?`,
 retorno:p=>`Olá, ${primeiro(p.name)}! Tudo bem? Aqui é do consultório da ${APP_NAME}. 😊\nJá faz ${CONFIG.RETORNO_MESES} meses da sua última consulta. Que tal agendar sua revisão para manter o sorriso em dia?\nMe diga o melhor dia e horário para você.`,
 aniversario:p=>`Feliz aniversário, ${primeiro(p.name)}! 🎉\nA ${CONFIG.PRO_NAME} e toda a equipe desejam um ano cheio de saúde e muitos sorrisos!`,
 agendado:(p,a)=>{const e=agCfg().endereco;return `Olá, ${primeiro(p.name)}! Aqui é do consultório da ${APP_NAME}. 😊\nSua consulta está confirmada para ${diaSemana(a.date)}, às ${a.time}${a.procedure?' ('+a.procedure+')':''}.${e?'\nEndereço: '+e:''}\nSe precisar remarcar, é só me avisar por aqui. Até lá!`},
 recusar:(nome,d,h)=>`Olá, ${primeiro(nome)}! Aqui é do consultório da ${APP_NAME}. Recebemos seu pedido para ${diaSemana(d)} às ${h}, mas esse horário não está mais disponível. Posso te oferecer outro horário?`,
 faltou:(p,a)=>`Olá, ${primeiro(p.name)}! Sentimos sua falta na consulta de ${dataBR(a.date)} às ${a.time}. Quer remarcar? Me diga o melhor horário para você.`
};
const pac=id=>S.patients.find(p=>p.id===id);
const STATUS=['Agendado','Confirmado','Atendido','Faltou','Cancelado'];
const tagStatus=s=>s==='Atendido'?'ok':s==='Confirmado'?'ok':s==='Faltou'||s==='Cancelado'?'bad':'warn';
function ultimaConsulta(pid){return S.appointments.filter(a=>a.patientId===pid&&a.status==='Atendido').map(a=>a.date).sort().pop()||''}
function proxConsulta(pid){return S.appointments.filter(a=>a.patientId===pid&&a.date>=today()&&(a.status==='Agendado'||a.status==='Confirmado')).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))[0]}
function retornos(dias=30){ // ninguém some: aparece até ter consulta marcada (contato só muda o aviso)
 return S.patients.map(p=>{const u=ultimaConsulta(p.id);if(!u)return null;const vence=addMeses(u,CONFIG.RETORNO_MESES);return {p,u,vence,atraso:diffDias(vence,today()),contato:p.returnContactedAt&&p.returnContactedAt>=u?p.returnContactedAt:''}}).filter(x=>x&&x.vence<=addDias(today(),dias)&&!proxConsulta(x.p.id)).sort((a,b)=>a.vence.localeCompare(b.vence))}
function aniversariantes(){const m=today().slice(5,7);return S.patients.filter(p=>p.birth&&p.birth.slice(5,7)===m).sort((a,b)=>a.birth.slice(8).localeCompare(b.birth.slice(8)))}
function mesResumo(k){const ent=S.entries.filter(e=>mesKey(e.date)===k);const rec=ent.filter(e=>e.type==='Entrada'&&e.paid).reduce((a,e)=>a+e.value,0),sai=ent.filter(e=>e.type==='Saída'&&e.paid).reduce((a,e)=>a+e.value,0);return {rec,sai,saldo:rec-sai}}
/* ======================================================================
   INTERFACE · versão 2 (vidro, menu flutuante, quase tudo com botões)
   ====================================================================== */

/* ---------- ícones ---------- */
const ico={
 home:'<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
 cal:'<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M16 4.3a3.5 3.5 0 0 1 0 7M18 14.2c2.4.7 3.8 2.8 3.8 5.8"/>',
 tooth:'<path d="M7 3c-3 0-5 2.5-5 6 0 4 2.5 6 3 11 .3 2 1.3 3 2.3 3 1.7 0 1.7-3.5 2.7-6 .5-1.3 1-2 2-2s1.5.7 2 2c1 2.5 1 6 2.7 6 1 0 2-1 2.3-3 .5-5 3-7 3-11 0-3.5-2-6-5-6-2.5 0-4 1.5-5 1.5S9.5 3 7 3Z"/>',
 money:'<rect x="2.5" y="6" width="19" height="12.5" rx="3"/><circle cx="12" cy="12.2" r="2.6"/><path d="M6 10v4.5M18 10v4.5"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
 heart:'<path d="M12 20.5S3 15 3 8.8A4.8 4.8 0 0 1 12 6.5a4.8 4.8 0 0 1 9 2.3C21 15 12 20.5 12 20.5Z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',x:'<path d="M18 6 6 18M6 6l12 12"/>',
 wa:'<path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3Z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1.5-1.5-2-1-1 1c-1.5-.5-2.5-1.5-3-3l1-1-1-2Z"/>',
 bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4Z"/><path d="M10 21h4"/>',
 drop:'<path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3Z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
 moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
 book:'<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M4 21.5V4.5M8 7h8"/>',
 grid:'<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
 left:'<path d="m15 6-6 6 6 6"/>',right:'<path d="m9 6 6 6-6 6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 refresh:'<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/>',
 list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
 sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z"/>',
 out:'<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/>',
 link:'<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
 down:'<path d="M12 4v12M6 11l6 6 6-6M4 20h16"/>',
 cake:'<path d="M4 21h16v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2Z"/><path d="M4 16c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5M12 11V8M12 5.5c.8-.6.8-1.8 0-2.5-.8.7-.8 1.9 0 2.5"/>',
 phone:'<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
};
const svg=(n,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ico[n]||''}</svg>`;
let toastT;function toast(m){const t=$('#toast');t.textContent=m;t.classList.remove('hidden');t.classList.remove('pop');void t.offsetWidth;t.classList.add('pop');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.add('hidden'),3200)}
function bindPw(root){root.querySelectorAll('[data-pw]').forEach(b=>b.onclick=()=>{const i=root.querySelector('#'+b.dataset.pw);i.type=i.type==='password'?'text':'password'})}
const pwField=(id,label,auto)=>`<label class="field">${label}<span class="pw"><input id="${id}" type="password" autocomplete="${auto}" required><button type="button" data-pw="${id}" aria-label="Mostrar senha">${svg('eye',18)}</button></span></label>`;
const diffDias=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/DAY);
const diaCurto=s=>{if(s===today())return 'Hoje';if(s===addDias(today(),1))return 'Amanhã';if(s===addDias(today(),-1))return 'Ontem';return new Date(s+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'}).replace('.','')};
const iniciais=n=>{const p=(n||'').trim().split(/\s+/);return ((p[0]||'')[0]||'').toUpperCase()+((p.length>1?p[p.length-1][0]:'')||'').toUpperCase()};
const hmin=h=>{const[a,b]=(h||'0:0').split(':').map(Number);return a*60+b},hfmt=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');

/* efeito de toque (onda) em botões */
document.addEventListener('pointerdown',e=>{const b=e.target.closest('.btn,.chip,.dock button,.fab,.tile,.icon-btn,.slot,.check-btn');if(!b)return;const r=b.getBoundingClientRect();const s=document.createElement('span');s.className='ripple';const d=Math.max(r.width,r.height)*2;s.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;b.appendChild(s);setTimeout(()=>s.remove(),600)},{passive:true});

/* ---------- versículos (trocam a cada 3 horas) ---------- */
const VERSOS=[
 ['O Senhor é o meu pastor; nada me faltará.','Salmos 23:1'],
 ['Tudo posso naquele que me fortalece.','Filipenses 4:13'],
 ['Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.','Salmos 37:5'],
 ['Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.','Mateus 11:28'],
 ['Não temas, porque eu sou contigo.','Isaías 41:10'],
 ['O choro pode durar uma noite, mas a alegria vem pela manhã.','Salmos 30:5'],
 ['Os que esperam no Senhor renovam as suas forças.','Isaías 40:31'],
 ['Lancem sobre ele toda a sua ansiedade, porque ele tem cuidado de vocês.','1 Pedro 5:7'],
 ['Este é o dia que o Senhor fez; regozijemo-nos e alegremo-nos nele.','Salmos 118:24'],
 ['Sejam fortes e corajosos. O Senhor, o seu Deus, estará com vocês por onde forem.','Josué 1:9'],
 ['Tudo o que fizerem, façam de todo o coração, como para o Senhor.','Colossenses 3:23'],
 ['A minha graça te basta, porque o meu poder se aperfeiçoa na fraqueza.','2 Coríntios 12:9'],
 ['Deleita-te no Senhor, e ele atenderá aos desejos do teu coração.','Salmos 37:4'],
 ['Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.','Provérbios 3:5'],
 ['Em paz me deito e logo pego no sono, porque só tu, Senhor, me fazes viver em segurança.','Salmos 4:8'],
 ['As misericórdias do Senhor se renovam a cada manhã; grande é a tua fidelidade.','Lamentações 3:23'],
 ['Deixo-vos a paz, a minha paz vos dou.','João 14:27'],
 ['O coração alegre é bom remédio.','Provérbios 17:22'],
 ['Aquietai-vos e sabei que eu sou Deus.','Salmos 46:10'],
 ['Porque sou eu que conheço os planos que tenho para vocês: planos de paz e de esperança.','Jeremias 29:11'],
 ['Graças te dou, porque fui feita de modo especial e admirável.','Salmos 139:14'],
 ['O Senhor te abençoe e te guarde.','Números 6:24'],
 ['Não se cansem de fazer o bem.','Gálatas 6:9'],
 ['Alegrem-se na esperança, sejam pacientes na tribulação, perseverem na oração.','Romanos 12:12'],
 ['O amor é paciente, o amor é bondoso.','1 Coríntios 13:4'],
 ['Sobre tudo o que se deve guardar, guarda o teu coração.','Provérbios 4:23'],
 ['Busquem primeiro o Reino de Deus, e todas essas coisas lhes serão acrescentadas.','Mateus 6:33'],
 ['Eu sou a luz do mundo; quem me segue não andará em trevas.','João 8:12'],
 ['O Senhor é a minha força e o meu escudo; nele o meu coração confia.','Salmos 28:7'],
 ['Força e dignidade são os seus vestidos, e sorri diante do futuro.','Provérbios 31:25'],
 ['Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus.','Romanos 8:28'],
 ['Sede bondosos uns para com os outros.','Efésios 4:32'],
 ['Ainda que eu ande pelo vale da sombra da morte, não temerei mal algum, porque tu estás comigo.','Salmos 23:4'],
 ['Cria em mim, ó Deus, um coração puro.','Salmos 51:10'],
 ['O Senhor guardará a tua saída e a tua entrada, desde agora e para sempre.','Salmos 121:8'],
 ['A paz de Deus, que excede todo o entendimento, guardará o vosso coração.','Filipenses 4:7']
];
let versoExtra=0;
const BLOCO_VERSO=3*36e5;
function versoAtual(){const i=(Math.floor(Date.now()/BLOCO_VERSO)+versoExtra)%VERSOS.length;return VERSOS[(i+VERSOS.length)%VERSOS.length]}
function proxVersoEm(){const ms=BLOCO_VERSO-(Date.now()%BLOCO_VERSO);const h=Math.floor(ms/36e5),m=Math.round(ms%36e5/6e4);return h?`${h}h${m?String(m).padStart(2,'0'):''}`:`${m} min`}
function cardVerso(grande){const [t,r]=versoAtual();return `<section class="verse ${grande?'big':''}"><span class="verse-ico">${svg('book',16)}</span><blockquote>“${esc(t)}”</blockquote><div class="verse-foot"><cite>${esc(r)}</cite><button class="icon-btn ghost" data-act="outro-verso" aria-label="Outro versículo">${svg('refresh',16)}</button></div>${grande?`<small class="muted">Um novo versículo aparece em ${proxVersoEm()}.</small>`:''}</section>`}

/* ---------- cuidado pessoal ---------- */
const CARE_PADRAO={aguaMeta:8,agua:{},aguaUlt:0,lembrarAgua:true,aguaIntervalo:90,ciclo:28,duracao:5,menstruacoes:[]};
const care=()=>({...CARE_PADRAO,...(S&&S.care||{})});
function setCare(patch){S.care={...care(),...patch,updatedAt:Date.now()};persist()}
function beberAgua(n=1){const c=care();const v=Math.max(0,(c.agua[today()]||0)+n);const agua={};Object.keys(c.agua).filter(k=>k>=addDias(today(),-60)).forEach(k=>agua[k]=c.agua[k]);agua[today()]=v;setCare({agua,aguaUlt:n>0?Date.now():c.aguaUlt});
 if(n>0)toast(v>=c.aguaMeta?'Meta de água do dia batida! 💧':'Mais um copo. Faltam '+(c.aguaMeta-v)+'.');fecharBanner()}
function cicloInfo(){const c=care();const ms=[...new Set(c.menstruacoes)].sort();if(!ms.length)return null;
 const ints=[];for(let i=1;i<ms.length;i++){const d=diffDias(ms[i-1],ms[i]);if(d>=20&&d<=45)ints.push(d)}
 const usar=ints.slice(-6);const len=usar.length?Math.round(usar.reduce((a,b)=>a+b,0)/usar.length):+c.ciclo;
 const ult=ms[ms.length-1],dia=diffDias(ult,today())+1,prox=addDias(ult,len),ov=len-14;
 let fase,desc,cor;
 if(dia<1){fase='Registro futuro';desc='';cor='lutea'}
 else if(dia>len){fase='Atrasada '+(dia-len)+' dia'+(dia-len>1?'s':'');desc='Se a menstruação já veio, toque em "Começou hoje".';cor='menstrual'}
 else if(dia<=+c.duracao){fase='Menstruação';desc='Mais descanso, água e alimentação leve ajudam nestes dias.';cor='menstrual'}
 else if(dia<ov-4){fase='Fase folicular';desc='Energia em alta: bom momento para tarefas que pedem foco.';cor='folicular'}
 else if(dia<=ov+1){fase='Período fértil';desc='Ovulação prevista para '+dataBR(addDias(ult,ov-1))+'.';cor='fertil'}
 else{fase='Fase lútea';desc='Pode haver mais cansaço ou sensibilidade. Pegue leve com você.';cor='lutea'}
 return {len,ult,dia,prox,faltam:diffDias(today(),prox),fase,desc,cor,ov,media:usar.length?len:null,hist:ms}}

/* ---------- tarefas do dia ---------- */
const SUGESTOES_TAREFA=['Conferir agenda de amanhã','Confirmar consultas','Repor materiais','Esterilizar instrumentais','Pedido ao laboratório','Pagar contas','Postar no Instagram','Responder mensagens'];
function tarefasHoje(){return S.tasks.filter(t=>t.date===today()||(!t.done&&t.date<today())).sort((a,b)=>(a.done-b.done)||(a.date.localeCompare(b.date))||((a.createdAt||0)-(b.createdAt||0)))}
function addTarefa(title){title=(title||'').trim().slice(0,120);if(!title)return;upsert('tasks',{id:uid(),title,date:today(),done:false,createdAt:Date.now()});toast('Tarefa adicionada.')}
function itemTarefa(t){return `<div class="task ${t.done?'done':''}"><button class="check-btn" data-task="${t.id}" aria-label="${t.done?'Desmarcar':'Concluir'}">${svg('check',15)}</button><span class="grow"><b>${esc(t.title)}</b>${t.date<today()&&!t.done?`<small>desde ${diaCurto(t.date).toLowerCase()}</small>`:''}</span><button class="icon-btn ghost sm" data-del-task="${t.id}" aria-label="Apagar">${svg('x',14)}</button></div>`}
function cardTarefas(){const l=tarefasHoje(),f=l.filter(t=>t.done).length;
 return `<section class="card glass"><div class="card-h"><h3>${svg('list',18)} Tarefas de hoje</h3><span class="pill">${f}/${l.length}</span></div>
 ${l.length?`<div class="progress"><i style="width:${l.length?Math.round(f/l.length*100):0}%"></i></div><div class="tasks">${l.map(itemTarefa).join('')}</div>`:'<p class="muted center">Nada por aqui. Toque em + para adicionar.</p>'}
 <form class="task-add" data-form="tarefa"><input name="t" placeholder="Nova tarefa…" maxlength="120" autocomplete="off"><button class="icon-btn main" aria-label="Adicionar">${svg('plus',18)}</button></form>
 <div class="chips scroll">${SUGESTOES_TAREFA.filter(s=>!l.some(t=>t.title===s)).slice(0,5).map(s=>`<button class="chip sm" data-sug-task="${esc(s)}">${svg('plus',12)} ${esc(s)}</button>`).join('')}</div></section>`}

/* ---------- horários livres (mesma regra da página de agendamento) ---------- */
function slotsDoDia(dia,ignorarId){const g=agCfg();const step=+g.intervalo||30;
 const ocup=S.appointments.filter(a=>a.date===dia&&a.id!==ignorarId&&a.status!=='Cancelado'&&a.status!=='Faltou').map(a=>[hmin(a.time),hmin(a.time)+(+a.duration||step)]);
 const trabalha=g.dias.includes(new Date(dia+'T12:00:00').getDay())&&!(g.folgas||[]).includes(dia);
 const out=[];if(!trabalha)return {trabalha,livres:out};
 const pI=g.pausaIni&&g.pausaFim?hmin(g.pausaIni):null,pF=pI!==null?hmin(g.pausaFim):null;
 const agora=dia===today()?new Date().getHours()*60+new Date().getMinutes():-1;
 for(let t=hmin(g.inicio);t+step<=hmin(g.fim);t+=step){if(pI!==null&&t<pF&&t+step>pI)continue;if(ocup.some(([a,b])=>t<b&&t+step>a))continue;if(t<agora)continue;out.push(hfmt(t))}
 return {trabalha,livres:out}}
function proxDiasUteis(n){const g=agCfg(),out=[];for(let i=0;out.length<n&&i<40;i++){const d=addDias(today(),i);if(g.dias.includes(new Date(d+'T12:00:00').getDay())&&!(g.folgas||[]).includes(d))out.push(d)}return out}


/* ---------- acompanhamento do paciente (árvore do início ao fim) ---------- */
const ETAPAS_SUG=['Avaliação','Limpeza','Restauração','Obturação','Canal','Extração','Clareamento','Prótese','Implante','Ortodontia','Revisão'];
const etapas=p=>(p&&p.etapas)||[];
const proxEtapa=p=>etapas(p).find(e=>e.status!=='feito');
const normTxt=t=>(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
function syncEtapa(a){const p=pac(a.patientId);if(!p||!etapas(p).length)return;const ets=etapas(p).map(e=>({...e}));
 let e=ets.find(x=>x.appointmentId===a.id);
 if(!e&&a.procedure&&a.status!=='Cancelado'&&a.status!=='Faltou')e=ets.find(x=>x.status!=='feito'&&!x.appointmentId&&normTxt(x.title)===normTxt(a.procedure));
 if(!e)return;
 if(a.status==='Atendido'){e.status='feito';e.date=a.date;e.appointmentId=a.id}
 else if(a.status==='Agendado'||a.status==='Confirmado'){e.status='agendado';e.date=a.date;e.appointmentId=a.id}
 else{e.status='pendente';e.date='';e.appointmentId=''}
 upsert('patients',{...p,etapas:ets})}
function arvoreHTML(ets,p,podeAgendar){const u=p?ultimaConsulta(p.id):'';const fim=ets.length&&ets.every(e=>e.status==='feito');
 return `<div class="tree">${ets.length?ets.map((e,i)=>`<div class="node ${e.status}"><button type="button" class="dotn" data-et-toggle="${e.id}" aria-label="Marcar como feito">${e.status==='feito'?svg('check',14):i+1}</button><div class="grow"><b>${esc(e.title)}</b><small>${e.status==='feito'?'Feito em '+dataBR(e.date):e.status==='agendado'?'Agendado · '+diaCurto(e.date):'A fazer'}</small></div>${e.status==='pendente'&&podeAgendar?`<button type="button" class="chip xs" data-et-agendar="${e.id}">${svg('cal',12)} Agendar</button>`:''}<button type="button" class="icon-btn ghost sm" data-et-del="${e.id}" aria-label="Tirar etapa">${svg('x',13)}</button></div>`).join(''):'<p class="muted">Monte o caminho do tratamento tocando nas etapas abaixo, na ordem.</p>'}
 <div class="node fim ${fim?'ativo':''}"><span class="dotn">${svg('refresh',14)}</span><div class="grow"><b>Retorno de ${CONFIG.RETORNO_MESES} meses</b><small>${u?'Previsto para '+dataBR(addMeses(u,CONFIG.RETORNO_MESES)):'Depois da última etapa'}</small></div></div></div>
 <div class="chips">${ETAPAS_SUG.map(t=>`<button type="button" class="chip sm add" data-et-add="${esc(t)}">${svg('plus',12)} ${t}</button>`).join('')}</div>`}
function bindArvore(root,st,p,repaint){
 const salvar=()=>{if(p&&pac(p.id))upsert('patients',{...pac(p.id),etapas:st.etapas});repaint()};
 root.querySelectorAll('[data-et-add]').forEach(b=>b.onclick=()=>{st.etapas=[...st.etapas,{id:uid(),title:b.dataset.etAdd,status:'pendente',date:'',appointmentId:''}];salvar()});
 root.querySelectorAll('[data-et-del]').forEach(b=>b.onclick=()=>{st.etapas=st.etapas.filter(e=>e.id!==b.dataset.etDel);salvar()});
 root.querySelectorAll('[data-et-toggle]').forEach(b=>b.onclick=()=>{st.etapas=st.etapas.map(e=>e.id!==b.dataset.etToggle?e:e.status==='feito'?{...e,status:'pendente',date:'',appointmentId:''}:{...e,status:'feito',date:e.date||today()});salvar()});
 root.querySelectorAll('[data-et-agendar]').forEach(b=>b.onclick=()=>{const e=st.etapas.find(x=>x.id===b.dataset.etAgendar);dlg.close();formConsulta(null,p.id,'',{procedure:e.title})})}

/* ---------- colar pedido (WhatsApp ou convênio) ---------- */
const ROTULOS=[
 ['name',/^(nome( completo)?( do paciente| do beneficiario)?|paciente|beneficiario|titular|cliente)$/],
 ['phone',/^(telefone|tel|celular|cel|whats ?app|whats|contato|fone|telefone de contato)$/],
 ['plan',/^(convenio|plano|operadora|plano de saude|plano odontologico)$/],
 ['card',/^(carteirinha|carteira|n(o|º|°|umero)? ?(da)? ?carteir(a|inha)|matricula|codigo do beneficiario|cartao|numero do cartao)$/],
 ['procedure',/^(procedimento|procedimentos|tratamento|servico|atendimento|especialidade|motivo|motivo da consulta)$/],
 ['date',/^(data|dia|data desejada|data preferencial|data da consulta|data sugerida)$/],
 ['time',/^(horario|hora|horario desejado|horario preferencial|periodo|turno)$/],
 ['auth',/^(guia|n(o|º|°|umero)? ?(da)? ?guia|senha|autorizacao|n(o|º|°|umero)? ?(da)? ?autorizacao|protocolo)$/],
 ['notes',/^(obs|observacao|observacoes|queixa|descricao)$/]];
const DIAS_SEM=['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
function lerData(v){v=normTxt(v);if(!v)return '';if(v.includes('hoje'))return today();if(v.includes('amanha'))return addDias(today(),1);
 let m=v.match(/(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?/);if(m){const y=m[3]?(m[3].length===2?'20'+m[3]:m[3]):today().slice(0,4);let d=y+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');if(!m[3]&&d<today())d=(+y+1)+d.slice(4);return d}
 m=v.match(/(\d{4})-(\d{2})-(\d{2})/);if(m)return m[0];
 const i=DIAS_SEM.findIndex(d=>v.includes(d));if(i>=0){for(let k=1;k<=7;k++){const d=addDias(today(),k);if(new Date(d+'T12:00:00').getDay()===i)return d}}return ''}
function lerHora(v){const m=normTxt(v).match(/\b(\d{1,2})\s*(?:[:h]\s*(\d{2})?|horas?\b)/);if(!m)return '';const h=+m[1];if(h>23)return '';return String(h).padStart(2,'0')+':'+(m[2]||'00')}
function lerPedidoTexto(txt){
 const link=txt.match(/#pedido=([\w-]+)/);if(link){try{const j=JSON.parse(td.decode(unb64(link[1].replace(/-/g,'+').replace(/_/g,'/'))));if(j&&j.n)return {doLink:j}}catch{}}
 const r={name:'',phone:'',plan:'',card:'',procedure:'',date:'',time:'',auth:'',notes:''};
 for(const linha of txt.split(/\n+/)){const m=linha.replace(/[*_~]/g,'').match(/^\s*[-•▪️✅👉🔹]*\s*([^:：]{2,40})[:：]\s*(.+)$/u);if(!m)continue;const rot=normTxt(m[1]).replace(/[^a-z0-9º° ]/g,'').replace(/\s+/g,' ').trim();
  const alvo=ROTULOS.find(([,re])=>re.test(rot));if(alvo&&!r[alvo[0]])r[alvo[0]]=m[2].trim()}
 const limpo=txt.replace(/[*_~]/g,'');
 if(!r.phone){const m=limpo.match(/(?:\+?55\s?)?\(?\d{2}\)?\s?9?\s?\d{4}[-\s.]?\d{4}/);if(m)r.phone=m[0]}
 const data=lerData(r.date||limpo),hora=lerHora(r.time||'')||(!r.time?lerHora((limpo.match(/\b\d{1,2}(:\d{2}|h\d{0,2})\b/)||[''])[0]):'');
 if(!r.procedure){const lista=[...new Set([...PROCS(),...ETAPAS_SUG])];r.procedure=lista.find(p=>normTxt(limpo).includes(normTxt(p)))||''}
 else{const lista=[...new Set([...PROCS(),...ETAPAS_SUG])];r.procedure=lista.find(p=>normTxt(r.procedure).includes(normTxt(p)))||r.procedure.slice(0,100)}
 r.date=data;r.time=hora;r.phone=r.phone.replace(/[^\d()+\s-]/g,'').trim();r.name=r.name.replace(/\s+/g,' ').slice(0,100);
 return r}
function acharPaciente(r){const tel=soNum(r.phone);return S.patients.find(p=>tel&&soNum(p.phone)===tel)||S.patients.find(p=>r.card&&p.card&&p.card.replace(/\D/g,'')===r.card.replace(/\D/g,''))||S.patients.find(p=>r.name&&normTxt(p.name)===normTxt(r.name))}
function formColar(){
 openSheet('Colar pedido',`<p class="muted">No WhatsApp, segure a mensagem do paciente ou do convênio, toque em <b>Copiar</b> e depois aqui em <b>Colar</b>. O painel lê nome, telefone, convênio, carteirinha, procedimento, data e horário.</p>
  <button class="btn main full big" data-colar>${svg('down',18)} Colar do WhatsApp</button>
  <textarea id="txtPedido" placeholder="Ou cole/escreva a mensagem aqui…" style="min-height:120px"></textarea>
  <button class="btn ghost full" data-ler>${svg('search',18)} Ler pedido</button><div id="lido"></div>`,d=>{
  const ta=d.querySelector('#txtPedido'),out=d.querySelector('#lido');
  const ler=()=>{const r=lerPedidoTexto(ta.value||'');if(r.doLink){fecharDlg();PEDIDO=r.doLink;setTimeout(abrirPedido,220);return}
   if(!r.name&&!r.phone){out.innerHTML='<p class="err">Não encontrei nome nem telefone. Confira o texto colado.</p>';return}
   const ex=acharPaciente(r);
   out.innerHTML=`<div class="lido glass"><p class="sheet-sub">${ex?'Paciente já cadastrado: '+esc(ex.name):'Novo paciente'}</p>
    <div class="grid2"><label class="field">Nome<input data-k="name" value="${esc(ex?.name||r.name)}"></label><label class="field">WhatsApp<input data-k="phone" value="${esc(r.phone||ex?.phone||'')}"></label></div>
    <div class="grid2"><label class="field">Convênio<input data-k="plan" value="${esc(r.plan||ex?.plan||'')}" placeholder="Particular"></label><label class="field">Carteirinha<input data-k="card" value="${esc(r.card||ex?.card||'')}"></label></div>
    <div class="grid2"><label class="field">Procedimento<input data-k="procedure" value="${esc(r.procedure)}"></label><label class="field">Guia / senha<input data-k="auth" value="${esc(r.auth)}"></label></div>
    <div class="grid2"><label class="field">Data<input type="date" data-k="date" value="${r.date}"></label><label class="field">Horário<input type="time" data-k="time" value="${r.time}"></label></div>
    <button class="btn main full big" data-ok>${svg('check',18)} Cadastrar e marcar consulta</button></div>`;
   out.querySelector('[data-ok]').onclick=()=>{const v={};out.querySelectorAll('[data-k]').forEach(i=>v[i.dataset.k]=i.value.trim());if(!v.name)return toast('Falta o nome.');
    const p0=acharPaciente(v)||ex;const conv=!!v.plan&&normTxt(v.plan)!=='particular';
    const p={...(p0||{id:uid(),birth:'',notes:'',etapas:[]}),name:v.name.slice(0,100),phone:v.phone||p0?.phone||'',type:conv?'Convênio':(p0?.type||'Particular'),plan:conv?v.plan.slice(0,60):(p0?.plan||''),card:v.card.slice(0,40)||p0?.card||''};
    if(v.procedure&&!etapas(p).some(e=>e.status!=='feito'&&normTxt(e.title)===normTxt(v.procedure)))p.etapas=[...etapas(p),{id:uid(),title:v.procedure.slice(0,60),status:'pendente',date:'',appointmentId:''}];
    upsert('patients',p);dlg.close();toast(p0?'Cadastro atualizado.':'Paciente cadastrado.');
    formConsulta(null,p.id,v.time,{date:v.date||'',procedure:v.procedure,notes:[v.auth?'Guia/senha: '+v.auth:'',r.notes].filter(Boolean).join(' · ').slice(0,300)})}};
  d.querySelector('[data-ler]').onclick=ler;
  d.querySelector('[data-colar]').onclick=async()=>{try{const t=await navigator.clipboard.readText();if(!t)throw 0;ta.value=t;ler()}catch{toast('Toque na caixa de texto, segure e escolha Colar.');ta.focus()}}})}

/* ---------- casca: topo, menu flutuante, botão + ---------- */
const PAGES={inicio:['Início','home'],agenda:['Agenda','cal'],pacientes:['Pacientes','users'],financeiro:['Finanças','money'],cuidar:['Para mim','heart'],tratamentos:['Tratamentos','tooth'],ajustes:['Ajustes','gear']};
const DOCK=['inicio','agenda','pacientes','financeiro','cuidar'];
let tab=(location.hash.slice(1)||'inicio');if(!PAGES[tab])tab='inicio';
let filtro={dia:today(),busca:'',pacFiltro:'Todos',trat:'Em andamento',fin:'',finTipo:'Tudo'};
function ir(t){if(!PAGES[t])return;const mudou=t!==tab;tab=t;history.replaceState(null,'','#'+t);render(mudou);if(mudou)scrollTo({top:0,behavior:'instant'})}
function shell(){
 app.innerHTML=`<div class="bg" aria-hidden="true"><i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i></div>
 <header class="top glass"><span class="mono-ouro top-mono" aria-hidden="true"></span><div class="top-t"><small>${esc(CONFIG.PRO_NAME)}</small><b id="topTitle">${PAGES[tab][0]}</b></div><span class="sync" id="sync"></span></header>
 ${DEMO?'<div class="demo-bar">Prévia com dados de exemplo · nada aqui é salvo na nuvem</div>':''}
 <div id="banner"></div>
 <main id="main"></main>
 <nav class="dock glass" aria-label="Menu"><span class="dock-ind" id="dockInd"></span>${DOCK.map(id=>`<button data-tab="${id}" aria-label="${PAGES[id][0]}">${svg(PAGES[id][1],22)}<span>${PAGES[id][0]}</span></button>`).join('')}<button data-act="mais" aria-label="Mais">${svg('grid',22)}<span>Mais</span></button></nav>
 <button class="fab" data-act="fab" aria-label="Adicionar">${svg('plus',28)}</button>`;
 app.querySelectorAll('.dock [data-tab]').forEach(b=>b.onclick=()=>ir(b.dataset.tab));
 app.querySelector('.dock [data-act=mais]').onclick=menuMais;app.querySelector('.fab').onclick=menuMais.bind(null,true);
 addEventListener('resize',moverInd);setSync(syncState)}
function moverInd(){const b=app.querySelector(`.dock [data-tab="${tab}"]`)||app.querySelector('.dock [data-act=mais]');const ind=$('#dockInd');if(!b||!ind)return;const d=b.parentElement.getBoundingClientRect(),r=b.getBoundingClientRect();ind.style.cssText=`width:${r.width}px;height:${r.height}px;transform:translate(${r.left-d.left}px,${r.top-d.top}px)`}
const VIEWS={};
function render(anim){const m=$('#main');if(!m||!S)return;
 app.querySelectorAll('.dock [data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));app.querySelector('.dock [data-act=mais]')?.classList.toggle('on',!DOCK.includes(tab));moverInd();const tt=$('#topTitle');if(tt)tt.textContent=tab==='inicio'?'Consultório':PAGES[tab][0];
 m.innerHTML=VIEWS[tab]();if(anim){m.classList.remove('enter');void m.offsetWidth;m.classList.add('enter')}bindMain(m)}

/* folha (sheet) simples para menus */
function openSheet(title,html,bind){dlg.innerHTML=`<div class="sheet"><div class="grab"></div><div class="mh"><h2>${esc(title)}</h2><button type="button" class="icon-btn ghost" data-close aria-label="Fechar">${svg('x',18)}</button></div><div class="mb">${html}</div></div>`;
 dlg.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>fecharDlg());if(bind)bind(dlg);abrirDlg()}
function abrirDlg(){dlg.classList.remove('closing');if(!dlg.open)dlg.showModal()}
function fecharDlg(){if(!dlg.open)return;dlg.classList.add('closing');setTimeout(()=>{dlg.close();dlg.classList.remove('closing')},180)}
function menuMais(soAcoes){
 const acoes=`<button class="tile wide" data-go="colar">${svg('wa',22)}<span><b>Colar pedido do WhatsApp</b><small>paciente ou convênio · o painel preenche</small></span></button><div class="tiles">
  <button class="tile" data-go="tarefa">${svg('list',22)}<b>Tarefa do dia</b></button>
  <button class="tile" data-go="consulta">${svg('cal',22)}<b>Consulta</b></button>
  <button class="tile" data-go="paciente">${svg('users',22)}<b>Paciente</b></button>
  <button class="tile" data-go="recebimento">${svg('money',22)}<b>Recebimento</b></button>
  <button class="tile" data-go="despesa">${svg('down',22)}<b>Despesa</b></button>
  <button class="tile" data-go="agua">${svg('drop',22)}<b>Copo d'água</b></button></div>`;
 const paginas=`<div class="menu-list">${['tratamentos','ajustes'].map(p=>`<button class="menu-item" data-page="${p}"><span class="mi-ico">${svg(PAGES[p][1],20)}</span><b>${PAGES[p][0]}</b>${svg('right',16)}</button>`).join('')}
  <a class="menu-item" href="${LINK_AGENDAR}" target="_blank" rel="noopener"><span class="mi-ico">${svg('link',20)}</span><b>Página de agendamento</b>${svg('right',16)}</a></div>`;
 openSheet(soAcoes===true?'Adicionar':'Menu',soAcoes===true?acoes:`<p class="sheet-sub">Adicionar</p>${acoes}<p class="sheet-sub">Mais páginas</p>${paginas}`,d=>{
  d.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{fecharDlg();ir(b.dataset.page)});
  d.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{const g=b.dataset.go;dlg.close();
   if(g==='colar')formColar();else if(g==='tarefa')formTarefa();else if(g==='consulta')formConsulta();else if(g==='paciente')formPaciente();else if(g==='recebimento')formEntradaFin(null,'Entrada');else if(g==='despesa')formEntradaFin(null,'Saída');else if(g==='agua'){beberAgua(1);render()}})})}
function formTarefa(){openSheet('Nova tarefa',`<form class="task-add big" id="ft"><input name="t" placeholder="O que precisa fazer hoje?" maxlength="120" autocomplete="off" autofocus><button class="icon-btn main" aria-label="Adicionar">${svg('plus',20)}</button></form><p class="sheet-sub">Sugestões</p><div class="chips">${SUGESTOES_TAREFA.map(s=>`<button class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>`,d=>{
 d.querySelector('#ft').onsubmit=e=>{e.preventDefault();addTarefa(e.target.t.value);fecharDlg();render()};
 d.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{addTarefa(b.dataset.s);fecharDlg();render()})})}

/* ---------- itens ---------- */
const corAvatar=n=>{let h=0;for(const c of n||'')h=(h*31+c.charCodeAt(0))%360;return `hsl(${20+h%40} 45% ${62+h%12}%)`};
const avatar=n=>`<span class="avatar" style="--av:${corAvatar(n)}">${esc(iniciais(n))}</span>`;
function itemConsulta(a,opts={}){const p=pac(a.patientId);const nome=p?.name||'Paciente excluído';
 const acoes=[];
 if(p&&a.status==='Agendado')acoes.push(`<a class="icon-btn wa" href="${waLink(p.phone,MSG.confirmar(p,a))}" target="_blank" rel="noopener" data-confirmou="${a.id}" aria-label="Confirmar pelo WhatsApp">${svg('wa',17)}</a>`);
 if((a.status==='Confirmado'||a.status==='Agendado')&&a.date<=today())acoes.push(`<button class="icon-btn ok" data-atendido="${a.id}" aria-label="Atendido">${svg('check',17)}</button><button class="icon-btn bad" data-faltou="${a.id}" aria-label="Faltou">${svg('x',17)}</button>`);
 if(p&&a.status==='Faltou')acoes.push(`<a class="icon-btn wa" href="${waLink(p.phone,MSG.faltou(p,a))}" target="_blank" rel="noopener" aria-label="Remarcar">${svg('wa',17)}</a>`);
 return `<div class="appt st-${a.status.toLowerCase()}"><div class="appt-time"><b>${esc(a.time)}</b><small>${a.duration||30} min</small></div><button class="appt-body" data-edit-cons="${a.id}"><b>${esc(nome)}</b><small>${opts.data?diaCurto(a.date)+' · ':''}${esc(a.procedure||'Consulta')}</small><span class="tag ${tagStatus(a.status)}">${a.status}</span></button><div class="appt-act">${acoes.join('')}</div></div>`}
function itemPaciente(p){const u=ultimaConsulta(p.id),pr=proxConsulta(p.id);const venc=u&&addMeses(u,CONFIG.RETORNO_MESES)<=addDias(today(),30)&&!pr;
 return `<button class="row-item" data-edit-pac="${p.id}">${avatar(p.name)}<span class="grow"><b>${esc(p.name)}</b><small>${pr?'Próxima: '+diaCurto(pr.date)+' '+pr.time:u?'Última: '+dataBR(u):'Sem consultas ainda'}</small>${etapas(p).length?`<small class="et-line">${svg('tooth',12)} ${proxEtapa(p)?'Próxima etapa: '+esc(proxEtapa(p).title):'Tratamento concluído'} · ${etapas(p).filter(e=>e.status==='feito').length}/${etapas(p).length}</small>`:''}</span>${venc?'<span class="tag warn">Retorno</span>':p.type==='Convênio'?`<span class="tag">${esc(p.plan||'Convênio')}</span>`:''}${svg('right',16)}</button>`}
function itemTrat(t){const p=pac(t.patientId),pct=t.sessions?Math.round((t.done||0)/t.sessions*100):0;
 return `<div class="row-item trat"><button class="grow ilink" data-edit-trat="${t.id}"><b>${esc(t.title)}</b><small>${esc(p?.name||'Paciente excluído')} · ${t.done||0} de ${t.sessions||1} sessões${t.budget?' · '+money(t.budget):''}</small><span class="progress sm"><i style="width:${pct}%"></i></span></button>${t.status==='Em andamento'?`<button class="icon-btn ok" data-sessao="${t.id}" aria-label="Mais uma sessão feita">${svg('plus',17)}</button>`:`<span class="tag ${t.status==='Concluído'?'ok':'bad'}">${t.status}</span>`}</div>`}
function itemEntrada(e){const late=!e.paid&&e.date<today();
 return `<div class="row-item"><span class="fin-ico ${e.type==='Entrada'?'in':'out'}">${svg(e.type==='Entrada'?'money':'down',18)}</span><button class="grow ilink" data-edit-ent="${e.id}"><b>${esc(e.desc)}</b><small>${diaCurto(e.date)} · ${esc(e.category||'Geral')}</small></button><span class="fin-v"><b class="${e.type==='Entrada'?'pos':''}">${e.type==='Entrada'?'+':'−'} ${money(e.value)}</b>${e.paid?`<small>${e.type==='Entrada'?'Recebido':'Pago'}</small>`:`<button class="chip xs ${late?'bad':'warn'}" data-pago="${e.id}">${svg('check',12)} ${late?'Atrasado':'Pendente'}</button>`}</span></div>`}

/* ---------- Início ---------- */
VIEWS.inicio=function(){const hoje=S.appointments.filter(a=>a.date===today()&&a.status!=='Cancelado').sort((a,b)=>a.time.localeCompare(b.time));
 const amanha=S.appointments.filter(a=>a.date===addDias(today(),1)&&a.status==='Agendado');
 const ret=retornos(),aniv=aniversariantes().filter(p=>p.birth.slice(5)===today().slice(5)),r=mesResumo(mesKey(today()));
 const atras=S.entries.filter(e=>e.type==='Entrada'&&!e.paid&&e.date<today());
 const c=care(),ag=c.agua[today()]||0,ci=cicloInfo();
 const h=new Date().getHours(),saud=h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';
 const atencao=[
  ...amanha.map(a=>({ico:'bell',t:'Confirmar '+primeiro(pac(a.patientId)?.name)+' · amanhã '+a.time,act:`<a class="chip sm wa" href="${waLink(pac(a.patientId)?.phone,MSG.confirmar(pac(a.patientId),a))}" target="_blank" rel="noopener" data-confirmou="${a.id}">${svg('wa',14)} Enviar</a>`})),
  ...aniv.map(p=>({ico:'cake',t:'Aniversário de '+primeiro(p.name)+' hoje',act:`<a class="chip sm wa" href="${waLink(p.phone,MSG.aniversario(p))}" target="_blank" rel="noopener">${svg('wa',14)} Parabéns</a>`})),
  ...atras.slice(0,3).map(e=>({ico:'money',t:e.desc+' · '+money(e.value)+' em atraso',act:`<button class="chip sm" data-pago="${e.id}">${svg('check',14)} Recebi</button>`}))];
 return `<section class="hero"><div class="hero-logo"><span class="logo-ouro" role="img" aria-label="${esc(APP_NAME)}"></span></div>
  <p class="eyebrow">${diaSemana(today())}</p><h1 class="title">${saud}, <em>${esc(CONFIG.PRO_NAME)}</em></h1></section>
 <div class="stats">
  <button class="stat glass" data-page="agenda"><small>Consultas hoje</small><strong>${hoje.length}</strong><span>${hoje.filter(a=>a.status==='Confirmado'||a.status==='Atendido').length} confirmada(s)</span></button>
  <button class="stat glass ${ret.some(x=>x.atraso>=0)?'alerta':''}" data-page="pacientes" data-pf="Retorno"><small>Retornos</small><strong>${ret.filter(x=>x.atraso>=0).length}</strong><span>${ret.filter(x=>x.atraso<0).length} vencem em 30 dias</span></button>
  <button class="stat glass" data-page="financeiro"><small>Recebido no mês</small><strong>${money(r.rec).replace(',00','')}</strong><span>saldo ${money(r.saldo).replace(',00','')}</span></button>
 </div>
 ${!agCfg().whatsapp?`<section class="card glass cta"><span class="mi-ico">${svg('link',20)}</span><span class="grow"><b>Ligue a página de agendamento</b><small>Informe o WhatsApp do consultório e os pacientes pedem horário sozinhos.</small></span><button class="btn sm main" data-act="cfg-agenda">Ligar</button></section>`:''}
 ${cardProximo()}
 ${cardRetornos(ret)}
 <div class="cols">
 <div class="col">
 <section class="card glass"><div class="card-h"><h3>${svg('cal',18)} Agenda de hoje</h3><button class="link" data-page="agenda">Ver agenda ${svg('right',14)}</button></div>
  ${hoje.length?`<div class="appts">${hoje.map(a=>itemConsulta(a)).join('')}</div>`:`<p class="muted center">Nenhuma consulta hoje.</p>`}
  <button class="btn main full" data-act="nova-consulta">${svg('plus',18)} Marcar consulta</button></section>
 ${atencao.length?`<section class="card glass"><div class="card-h"><h3>${svg('bell',18)} Precisa de você</h3><span class="pill">${atencao.length}</span></div><div class="att">${atencao.map(x=>`<div class="att-i"><span class="mi-ico sm">${svg(x.ico,16)}</span><span class="grow">${esc(x.t)}</span>${x.act}</div>`).join('')}</div></section>`:''}
 </div>
 <div class="col">
 ${cardTarefas()}
 <section class="card glass mini-care" data-page="cuidar"><div class="mc"><span class="ring sm" style="--p:${Math.min(100,ag/c.aguaMeta*100)}">${svg('drop',18)}</span><span class="grow"><b>Água · ${ag} de ${c.aguaMeta} copos</b><small>${c.aguaUlt?(tempoDesde(c.aguaUlt)==='agora'?'Último agora mesmo':'Último há '+tempoDesde(c.aguaUlt)):'Comece com um copo agora'}</small></span><button class="icon-btn main" data-act="agua" aria-label="Bebi um copo">${svg('plus',18)}</button></div>
  ${ci?`<div class="mc"><span class="ring sm fase-${ci.cor}" style="--p:${Math.min(100,ci.dia/ci.len*100)}">${svg('moon',18)}</span><span class="grow"><b>Dia ${Math.max(1,ci.dia)} do ciclo · ${esc(ci.fase)}</b><small>${ci.faltam>0?'Próxima menstruação em '+ci.faltam+' dia'+(ci.faltam>1?'s':''):ci.faltam===0?'Menstruação prevista para hoje':'Prevista para '+dataBR(ci.prox)}</small></span></div>`:''}</section>
 ${cardVerso()}
 </div></div>`};
function cardProximo(){const agora=new Date().getHours()*60+new Date().getMinutes();
 const futuras=S.appointments.filter(a=>(a.status==='Agendado'||a.status==='Confirmado')&&(a.date>today()||(a.date===today()&&hmin(a.time)+(+a.duration||30)>agora))).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const a=futuras[0];if(!a)return '';const p=pac(a.patientId);const depois=futuras[1];const e=proxEtapa(p);
 const falta=a.date===today()?hmin(a.time)-agora:null;
 const quando=a.date===today()?(falta<=0?'agora':falta<60?'em '+falta+' min':'hoje às '+a.time):diaCurto(a.date)+' às '+a.time;
 return `<section class="next-card"><div class="next-top"><span class="eyebrow light">Próximo paciente · ${esc(quando)}</span><span class="tag light">${a.status}</span></div>
  <button class="next-main" data-edit-cons="${a.id}">${avatar(p?.name||'?')}<span class="grow"><b>${esc(p?.name||'')}</b><small>${esc(a.time)} · ${esc(a.procedure||'Consulta')}${p&&p.type==='Convênio'?' · '+esc(p.plan||'Convênio'):''}</small>${p&&etapas(p).length?`<small class="et-line">${svg('tooth',12)} ${e?'Etapa: '+esc(e.title)+' ('+(etapas(p).filter(x=>x.status==='feito').length+1)+' de '+etapas(p).length+')':'Tratamento concluído'}</small>`:''}</span></button>
  <div class="next-act">${p&&a.status==='Agendado'?`<a class="btn sm wa" href="${waLink(p.phone,MSG.confirmar(p,a))}" target="_blank" rel="noopener" data-confirmou="${a.id}">${svg('wa',16)} Confirmar</a>`:''}${a.date===today()?`<button class="btn sm light" data-atendido="${a.id}">${svg('check',16)} Atendido</button>`:''}<button class="btn sm light" data-edit-pac="${a.patientId}">${svg('users',16)} Ficha</button></div>
  ${depois?`<div class="next-after">Depois: <b>${esc(pac(depois.patientId)?.name||'')}</b> · ${depois.date===today()?depois.time:diaCurto(depois.date)+' '+depois.time}</div>`:''}</section>`}
function cardRetornos(ret){const venc=ret.filter(x=>x.atraso>=0),prox=ret.filter(x=>x.atraso<0);
 return `<section class="card glass ret-card ${venc.length?'alerta':''}"><div class="card-h"><h3>${svg('refresh',18)} Ninguém esquecido</h3><span class="pill">${venc.length?venc.length+' passou de '+CONFIG.RETORNO_MESES+' meses':'tudo em dia'}</span></div>
 ${ret.length?`<div class="att">${ret.slice(0,filtro.verRet?99:5).map(x=>`<div class="att-i">${avatar(x.p.name)}<span class="grow"><b class="nm">${esc(x.p.name)}</b><small class="${x.atraso>=0?'txt-bad':'txt-warn'}">${x.atraso>0?'Sem consulta há '+Math.round(diffDias(x.u,today())/30)+' meses · '+x.atraso+' dias de atraso':x.atraso===0?'Completa '+CONFIG.RETORNO_MESES+' meses hoje':'Completa '+CONFIG.RETORNO_MESES+' meses em '+(-x.atraso)+' dias'}${x.contato?' · chamado '+diaCurto(x.contato).toLowerCase():''}</small></span><a class="chip sm wa" href="${waLink(x.p.phone,MSG.retorno(x.p))}" target="_blank" rel="noopener" data-contatado="${x.p.id}">${svg('wa',14)} ${x.contato?'De novo':'Chamar'}</a><button class="icon-btn sm" data-marcar-pac="${x.p.id}" aria-label="Marcar consulta">${svg('cal',15)}</button></div>`).join('')}</div>${ret.length>5&&!filtro.verRet?`<button class="link" data-ver-ret>Ver todos (${ret.length}) ${svg('right',14)}</button>`:''}`
 :`<p class="muted">Nenhum paciente perto dos ${CONFIG.RETORNO_MESES} meses sem consulta. O painel avisa aqui sozinho, e o paciente só sai da lista quando tiver consulta marcada.</p>`}</section>`}
const tempoDesde=ts=>{const m=Math.round((Date.now()-ts)/6e4);return m<1?'agora':m<60?m+' min':Math.floor(m/60)+'h'+(m%60?String(m%60).padStart(2,'0'):'')};

/* ---------- Agenda ---------- */
VIEWS.agenda=function(){const d=filtro.dia;const ini=addDias(d,-((new Date(d+'T12:00:00').getDay()+6)%7));const semana=[...Array(7)].map((_,i)=>addDias(ini,i));
 const list=S.appointments.filter(a=>a.date===d&&a.status!=='Cancelado').sort((a,b)=>a.time.localeCompare(b.time));
 const canc=S.appointments.filter(a=>a.date===d&&a.status==='Cancelado');
 const {trabalha,livres}=slotsDoDia(d);
 const linhas=[...list.map(a=>({t:a.time,h:itemConsulta(a)})),...livres.filter(t=>!list.some(a=>a.time===t)).map(t=>({t,h:`<button class="slot" data-slot="${t}"><b>${t}</b><span>Horário livre</span>${svg('plus',16)}</button>`}))].sort((a,b)=>a.t.localeCompare(b.t));
 const mes=new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
 return `<section class="page-h"><p class="eyebrow">${esc(mes)}</p><h1 class="title">Agenda</h1></section>
 <section class="card glass week-card"><div class="week-nav"><button class="icon-btn ghost" data-sem="-7" aria-label="Semana anterior">${svg('left',18)}</button><button class="chip sm ${filtro.dia===today()?'on':''}" data-dia="${today()}">Hoje</button><button class="icon-btn ghost" data-sem="7" aria-label="Próxima semana">${svg('right',18)}</button></div>
 <div class="week">${semana.map(s=>{const n=S.appointments.filter(a=>a.date===s&&a.status!=='Cancelado').length;return `<button data-dia="${s}" class="${s===d?'on':''} ${s===today()?'hoje':''}"><small>${new Date(s+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')}</small><b>${s.slice(8)}</b><i>${n?'•'.repeat(Math.min(n,3)):''}</i></button>`}).join('')}</div></section>
 <section class="card glass"><div class="card-h"><h3>${esc(diaSemana(d))}</h3><span class="pill">${list.length} consulta${list.length===1?'':'s'}${trabalha?' · '+livres.length+' livre'+(livres.length===1?'':'s'):''}</span></div>
 ${!trabalha&&!list.length?'<p class="muted center">Dia sem atendimento.</p>':''}
 ${linhas.length?`<div class="appts">${linhas.map(x=>x.h).join('')}</div>`:trabalha?'<p class="muted center">Dia cheio ou já encerrado.</p>':''}
 ${canc.length?`<details class="more"><summary>${canc.length} cancelada(s)</summary><div class="appts">${canc.map(a=>itemConsulta(a)).join('')}</div></details>`:''}
 <div class="row2"><button class="btn main" data-act="nova-consulta">${svg('plus',18)} Outro horário</button><button class="btn ghost" data-act="colar">${svg('wa',18)} Colar pedido</button></div></section>`};

/* seletor de paciente (busca + toque) usado nos formulários */
function pickerHTML(st){const q=(st.q||'').toLowerCase().trim();const sel=st.pid&&pac(st.pid);
 if(sel)return `<div class="picked">${avatar(sel.name)}<span class="grow"><b>${esc(sel.name)}</b><small>${esc(sel.phone||'sem telefone')}</small></span><button type="button" class="chip sm" data-pick-clear>Trocar</button></div>`;
 const recentes=[...new Set(S.appointments.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).map(a=>a.patientId))].map(pac).filter(Boolean).slice(0,6);
 const achados=q?S.patients.filter(p=>(p.name+' '+(p.phone||'')).toLowerCase().includes(q)).slice(0,8):recentes;
 return `<div class="search-box">${svg('search',18)}<input data-pick-q placeholder="Buscar paciente pelo nome ou telefone" value="${esc(st.q||'')}" autocomplete="off"></div>
 <div class="chips">${achados.map(p=>`<button type="button" class="chip" data-pick="${p.id}">${esc(p.name)}</button>`).join('')}${q&&!S.patients.some(p=>p.name.toLowerCase()===q)?`<button type="button" class="chip add" data-pick-new>${svg('plus',14)} Cadastrar “${esc(st.q.trim())}”</button>`:''}</div>
 ${st.novo?`<div class="novo-pac"><label class="field">WhatsApp do novo paciente<input data-novo-tel inputmode="tel" placeholder="(27) 99999-0000" value="${esc(st.tel||'')}"></label></div>`:''}`}
function bindPicker(root,st,repaint){
 const q=root.querySelector('[data-pick-q]');if(q)q.oninput=()=>{st.q=q.value;st.novo=false;const pos=q.selectionStart;repaint();const n=root.querySelector('[data-pick-q]');if(n){n.focus();n.setSelectionRange(pos,pos)}};
 root.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{st.pid=b.dataset.pick;st.novo=false;if(st.onPick)st.onPick();repaint()});
 const nw=root.querySelector('[data-pick-new]');if(nw)nw.onclick=()=>{st.novo=true;repaint();root.querySelector('[data-novo-tel]')?.focus()};
 const t=root.querySelector('[data-novo-tel]');if(t)t.oninput=()=>st.tel=t.value;
 const c=root.querySelector('[data-pick-clear]');if(c)c.onclick=()=>{st.pid='';st.q='';repaint()}}
function pacienteDoPicker(st){if(st.pid)return pac(st.pid);if(st.novo&&(st.q||'').trim()){const p={id:uid(),name:st.q.trim().slice(0,100),phone:(st.tel||'').trim(),birth:'',type:'Particular',plan:'',notes:''};upsert('patients',p);return p}return null}
const chipsSel=(name,vals,cur,fmt=v=>v)=>`<div class="chips" data-chips="${name}">${vals.map(v=>`<button type="button" class="chip ${String(v)===String(cur)?'on':''}" data-v="${esc(v)}">${esc(fmt(v))}</button>`).join('')}</div>`;
function bindChips(root,st,repaint){root.querySelectorAll('[data-chips]').forEach(g=>g.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{const k=g.dataset.chips;st[k]=b.dataset.v;if(k==='date'&&st.time&&!slotsDoDia(st.date,st.id).livres.includes(st.time))st.time='';if(k==='procedure'&&!st.valorMexido){const v=ultimoValor(st.procedure);if(v)st.value=v}repaint()}))}
function ultimoValor(proc){const a=S.appointments.filter(x=>x.procedure===proc&&x.value>0).sort((x,y)=>(y.updatedAt||0)-(x.updatedAt||0))[0];return a?a.value:0}

/* ---------- Consulta: quase tudo com toques ---------- */
const PROCS=()=>[...new Set([...agCfg().procedimentos.filter(p=>p!=='Outro'),'Avaliação','Limpeza','Restauração','Canal','Extração','Clareamento','Revisão'])].slice(0,10);
function formConsulta(a,pidPadrao,horaPadrao,preset){const n=!a;
 const st=a?{...a,q:''}:{id:uid(),patientId:pidPadrao||'',pid:pidPadrao||'',date:filtro.dia>=today()?filtro.dia:today(),time:horaPadrao||'',duration:+agCfg().intervalo||30,procedure:'',status:'Agendado',value:0,notes:'',q:''};
 if(preset)for(const k in preset)if(preset[k])st[k]=preset[k];
 if(n&&!st.procedure&&st.pid){const e=proxEtapa(pac(st.pid));if(e)st.procedure=e.title}
 if(st.procedure&&!st.value){const v=ultimoValor(st.procedure);if(v)st.value=v}
 st.onPick=()=>{if(n&&!st.procedure){const e=proxEtapa(pac(st.pid));if(e){st.procedure=e.title;const v=ultimoValor(e.title);if(v&&!st.valorMexido)st.value=v}}};
 if(a)st.pid=a.patientId;
 openDlg(n?'Nova consulta':'Consulta','<div id="fc"></div>',async f=>{
   const p=pacienteDoPicker(st);if(!p)return 'Escolha o paciente (ou cadastre tocando no nome).';
   const time=st.time||f.querySelector('[name=outraHora]')?.value;const date=st.date;if(!date||!time)return 'Escolha o dia e o horário.';
   const conflito=S.appointments.find(x=>x.id!==st.id&&x.date===date&&x.time===time&&x.status!=='Cancelado'&&x.status!=='Faltou');if(conflito&&!confirm('Já existe consulta neste horário ('+(pac(conflito.patientId)?.name||'')+'). Salvar mesmo assim?'))return 'Escolha outro horário.';
   const proc=st.procedure==='__outro'?(f.querySelector('[name=outroProc]')?.value.trim()||''):st.procedure;
   const na={id:st.id,reqId:st.reqId||'',patientId:p.id,date,time,duration:+st.duration,procedure:proc,status:st.status,value:toCents(f.querySelector('[name=value]').value),notes:(f.querySelector('[name=notes]')?.value||'').trim()};
   upsert('appointments',na);syncEtapa(na);if(na.status==='Atendido')lancarRecebimento(na);filtro.dia=na.date;
   toast(n?'Consulta marcada.':'Consulta atualizada.');if(n&&p.phone)setTimeout(()=>avisarPaciente(p,na),80)},
  n?null:()=>{if(!confirm('Excluir esta consulta?'))return false;remove('appointments',a.id);toast('Consulta excluída.');return true},
  f=>{const box=f.querySelector('#fc');const paint=()=>{
   const dias=[...new Set([...(st.date&&!proxDiasUteis(6).includes(st.date)?[st.date]:[]),...proxDiasUteis(6)])];
   const {livres}=slotsDoDia(st.date,st.id);const horas=[...new Set([...(st.time?[st.time]:[]),...livres])].sort();
   const procs=PROCS();const outroProc=st.procedure&&st.procedure!=='__outro'&&!procs.includes(st.procedure);
   const pe=st.pid&&proxEtapa(pac(st.pid));const pp=st.pid&&pac(st.pid);
   box.innerHTML=`<div class="fstep"><span class="fl">Paciente</span>${pickerHTML(st)}${pp&&etapas(pp).length?`<div class="mini-tree">${etapas(pp).map(e=>`<span class="mt ${e.status}">${e.status==='feito'?svg('check',11):''}${esc(e.title)}</span>`).join('<i></i>')}</div>`:''}</div>
   <div class="fstep"><span class="fl">Dia</span>${chipsSel('date',dias,st.date,diaCurto)}<label class="mini">ou escolha outra data <input type="date" data-outra-data value="${dias.includes(st.date)?'':st.date}"></label></div>
   <div class="fstep"><span class="fl">Horário</span>${horas.length?`<div class="chips times" data-chips="time">${horas.map(h=>`<button type="button" class="chip ${h===st.time?'on':''}" data-v="${h}">${h}</button>`).join('')}</div>`:'<p class="muted">Sem horários livres neste dia.</p>'}<label class="mini">outro horário <input type="time" name="outraHora" value="${st.time&&!horas.includes(st.time)?st.time:''}"></label></div>
   <div class="fstep"><span class="fl">Procedimento</span>${chipsSel('procedure',[...procs,...(outroProc?[st.procedure]:[]),'__outro'],st.procedure,v=>v==='__outro'?'Outro…':v)}${st.procedure==='__outro'?'<input name="outroProc" placeholder="Qual procedimento?" maxlength="100">':''}</div>
   <div class="fstep"><span class="fl">Duração</span>${chipsSel('duration',[15,30,45,60,90,120],st.duration,v=>v+' min')}</div>
   ${n?'':`<div class="fstep"><span class="fl">Situação</span>${chipsSel('status',STATUS,st.status)}</div>`}
   <div class="grid2"><label class="field">Valor (opcional)<input name="value" inputmode="decimal" value="${fromCents(st.value)}" placeholder="0,00"></label><label class="field">Observação<input name="notes" value="${esc(st.notes||'')}" maxlength="300" placeholder="Opcional"></label></div>
   <p class="note">Guarde aqui só o necessário para a agenda. O prontuário clínico fica no sistema oficial.</p>`;
   bindPicker(box,st,paint);bindChips(box,st,paint);
   const od=box.querySelector('[data-outra-data]');od.onchange=()=>{if(od.value){st.date=od.value;st.time='';paint()}};
   const v=box.querySelector('[name=value]');v.oninput=()=>{st.valorMexido=true;st.value=toCents(v.value)};
   const no=box.querySelector('[name=notes]');no.oninput=()=>st.notes=no.value};paint()})}
function lancarRecebimento(a){if(!(a.value>0)||S.entries.some(e=>e.appointmentId===a.id))return;upsert('entries',{id:uid(),date:a.date,desc:(a.procedure||'Consulta')+' · '+(pac(a.patientId)?.name||''),type:'Entrada',category:'Consultas',value:a.value,paid:true,patientId:a.patientId,appointmentId:a.id});toast('Consulta atendida. Recebimento de '+money(a.value)+' lançado.')}

/* ---------- Pacientes ---------- */
VIEWS.pacientes=function(){const q=filtro.busca.toLowerCase();const mesAtual=today().slice(5,7);
 const retIds=new Set(retornos().map(x=>x.p.id));
 const emTrat=new Set(S.treatments.filter(t=>t.status==='Em andamento').map(t=>t.patientId));
 const list=S.patients.filter(p=>!q||(p.name+' '+(p.phone||'')+' '+(p.plan||'')).toLowerCase().includes(q))
  .filter(p=>filtro.pacFiltro==='Todos'||(filtro.pacFiltro==='Retorno'&&retIds.has(p.id))||(filtro.pacFiltro==='Aniversário'&&p.birth&&p.birth.slice(5,7)===mesAtual)||(filtro.pacFiltro==='Em tratamento'&&emTrat.has(p.id)))
  .sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 return `<section class="page-h"><p class="eyebrow">${S.patients.length} cadastrado${S.patients.length===1?'':'s'}</p><h1 class="title">Pacientes</h1></section>
 <div class="search-box glass">${svg('search',18)}<input type="search" placeholder="Buscar por nome, telefone ou convênio" value="${esc(filtro.busca)}" data-filtro="busca"></div>
 <div class="chips scroll seg-chips">${['Todos','Retorno','Em tratamento','Aniversário'].map(v=>`<button class="chip ${filtro.pacFiltro===v?'on':''}" data-pf="${v}">${v}${v==='Retorno'&&retIds.size?` <i class="badge">${retIds.size}</i>`:''}</button>`).join('')}</div>
 <section class="card glass list-card">${list.length?list.map(itemPaciente).join(''):'<p class="muted center">Nenhum paciente aqui.</p>'}</section>
 <div class="row2"><button class="btn main" data-act="novo-paciente">${svg('plus',18)} Novo paciente</button><button class="btn ghost" data-act="importar">${svg('down',18)} Importar</button></div>`};
function formPaciente(p){const n=!p;p=p||{id:uid(),name:'',phone:'',birth:'',type:'Particular',plan:'',notes:''};
 const hist=n?[]:S.appointments.filter(a=>a.patientId===p.id).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
 const trats=n?[]:S.treatments.filter(t=>t.patientId===p.id);const st={type:p.type||'Particular',etapas:etapas(p).map(e=>({...e}))};
 const u=n?'':ultimaConsulta(p.id);
 openDlg(n?'Novo paciente':p.name,`${n?'':`<div class="pac-head">${avatar(p.name)}<div class="grow"><small>${u?'Última consulta '+dataBR(u)+' · retorno '+dataBR(addMeses(u,CONFIG.RETORNO_MESES)):'Sem consultas atendidas'}</small></div></div>
  <div class="quick">${p.phone?`<a class="btn sm wa" href="${waLink(p.phone,'Olá, '+primeiro(p.name)+'! Aqui é do consultório da '+APP_NAME+'. ')}" target="_blank" rel="noopener">${svg('wa',16)} WhatsApp</a>`:''}<button type="button" class="btn sm" data-nova-cons-pac="${p.id}">${svg('cal',16)} Marcar</button><button type="button" class="btn sm" data-novo-trat-pac="${p.id}">${svg('tooth',16)} Tratamento</button></div>`}
  <label class="field">Nome completo<input name="name" value="${esc(p.name)}" required maxlength="100" autocomplete="off"></label>
  <div class="grid2"><label class="field">WhatsApp<input name="phone" type="tel" value="${esc(p.phone)}" maxlength="20" placeholder="(27) 99999-0000"></label><label class="field">Nascimento<input name="birth" type="date" value="${p.birth||''}"></label></div>
  <div class="fstep"><span class="fl">Atendimento</span><div id="tp"></div></div>
  <div class="fstep"><span class="fl">Acompanhamento · do início ao fim</span><div id="arv"></div></div>
  <label class="field">Observações (preferências, melhor horário)<textarea name="notes" maxlength="1000" placeholder="Opcional">${esc(p.notes||'')}</textarea></label>
  ${n?'':`<div class="fstep"><span class="fl">Histórico</span><div class="hist">${hist.length?hist.slice(0,12).map(a=>`<div><b>${dataBR(a.date)} · ${a.time}</b><span>${esc(a.procedure||'Consulta')}</span><span class="tag ${tagStatus(a.status)}">${a.status}</span></div>`).join(''):'<p class="muted">Nenhuma consulta ainda.</p>'}</div></div>
  ${trats.length?`<div class="fstep"><span class="fl">Tratamentos</span><div class="hist">${trats.map(t=>`<div><b>${esc(t.title)}</b><span>${t.done||0}/${t.sessions} sessões</span><span class="tag">${t.status}</span></div>`).join('')}</div></div>`:''}`}`,
  async f=>{const name=f.name.value.trim();if(!name)return 'Informe o nome.';if(S.patients.some(x=>x.id!==p.id&&x.name.toLowerCase()===name.toLowerCase())&&!confirm('Já existe um paciente com esse nome. Salvar mesmo assim?'))return 'Confira o nome.';
   upsert('patients',{...p,...(pac(p.id)||{}),name,phone:f.phone.value.trim(),birth:f.birth.value,type:st.type,plan:f.plan?f.plan.value.trim():'',card:f.card?f.card.value.trim():(p.card||''),notes:f.notes.value.trim(),etapas:st.etapas});toast(n?'Paciente cadastrado.':'Cadastro atualizado.')},
  n?null:()=>{const c=S.appointments.filter(a=>a.patientId===p.id).length,t=S.treatments.filter(x=>x.patientId===p.id).length;if(!confirm('Excluir '+p.name+'?'+(c||t?'\n\nTambém serão excluídos: '+c+' consulta(s) e '+t+' tratamento(s). Os lançamentos do financeiro continuam.':'')+'\n\nIsso não pode ser desfeito.'))return false;
   S.appointments.filter(a=>a.patientId===p.id).forEach(a=>remove('appointments',a.id));S.treatments.filter(x=>x.patientId===p.id).forEach(x=>remove('treatments',x.id));remove('patients',p.id);toast('Paciente excluído.');return true},
  form=>{const tp=form.querySelector('#tp');const paint=()=>{tp.innerHTML=chipsSel('type',['Particular','Convênio'],st.type)+(st.type==='Convênio'?`<div class="grid2" style="margin-top:8px"><input name="plan" value="${esc(p.plan||'')}" maxlength="60" placeholder="Qual convênio?"><input name="card" value="${esc(p.card||'')}" maxlength="40" placeholder="Carteirinha"></div>`:'');bindChips(tp,st,paint)};paint();
   const arv=form.querySelector('#arv');const pa=()=>{arv.innerHTML=arvoreHTML(st.etapas,n?null:p,!n);bindArvore(arv,st,n?null:p,pa)};pa();
   form.querySelectorAll('[data-nova-cons-pac]').forEach(b=>b.onclick=()=>{dlg.close();formConsulta(null,b.dataset.novaConsPac)});form.querySelectorAll('[data-novo-trat-pac]').forEach(b=>b.onclick=()=>{dlg.close();formTrat(null,b.dataset.novoTratPac)})})}

/* ---------- Tratamentos ---------- */
VIEWS.tratamentos=function(){const list=S.treatments.filter(t=>filtro.trat==='Todos'||t.status===filtro.trat).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
 return `<section class="page-h"><p class="eyebrow">Processos com várias sessões</p><h1 class="title">Tratamentos</h1></section>
 <div class="chips scroll seg-chips">${['Em andamento','Pausado','Concluído','Todos'].map(v=>`<button class="chip ${filtro.trat===v?'on':''}" data-seg-trat="${v}">${v}</button>`).join('')}</div>
 <section class="card glass list-card">${list.length?list.map(itemTrat).join(''):'<p class="muted center">Nenhum tratamento aqui.</p>'}</section>
 <button class="btn main full" data-act="novo-trat">${svg('plus',18)} Novo tratamento</button>`};
const TRATS=['Canal','Clareamento','Ortodontia','Implante','Prótese','Restaurações','Lentes de contato dental','Periodontia'];
function formTrat(t,pidPadrao){const n=!t;
 const st=t?{...t,pid:t.patientId,q:''}:{id:uid(),pid:pidPadrao||'',q:'',title:'',sessions:3,done:0,budget:0,status:'Em andamento',approvedAt:today(),notes:''};
 openDlg(n?'Novo tratamento':'Tratamento','<div id="ftr"></div>',async f=>{const p=pacienteDoPicker(st);if(!p)return 'Escolha o paciente.';
   const title=(st.title==='__outro'?f.querySelector('[name=outroT]')?.value:st.title||'').trim();if(!title)return 'Escolha o tratamento.';
   const sessions=Math.max(1,+st.sessions||1),done=Math.min(sessions,Math.max(0,+st.done||0));
   const nt={id:st.id,patientId:p.id,title,sessions,done,status:done>=sessions&&st.status==='Em andamento'?'Concluído':st.status,budget:toCents(f.querySelector('[name=budget]').value),approvedAt:st.approvedAt||today(),notes:(f.querySelector('[name=notes]')?.value||'').trim()};upsert('treatments',nt);
   if(n&&f.querySelector('[name=lancar]')?.checked&&nt.budget>0)upsert('entries',{id:uid(),date:nt.approvedAt,desc:'Tratamento: '+title+' · '+p.name,type:'Entrada',category:'Tratamentos',value:nt.budget,paid:false,patientId:p.id});
   toast(n?'Tratamento cadastrado.':'Tratamento atualizado.')},
  n?null:()=>{if(!confirm('Excluir o tratamento "'+t.title+'"?'))return false;remove('treatments',t.id);toast('Tratamento excluído.');return true},
  f=>{const box=f.querySelector('#ftr');const paint=()=>{const outros=st.title&&st.title!=='__outro'&&!TRATS.includes(st.title);
   box.innerHTML=`<div class="fstep"><span class="fl">Paciente</span>${pickerHTML(st)}</div>
   <div class="fstep"><span class="fl">Tratamento</span>${chipsSel('title',[...TRATS,...(outros?[st.title]:[]),'__outro'],st.title,v=>v==='__outro'?'Outro…':v)}${st.title==='__outro'?'<input name="outroT" placeholder="Ex.: Canal no dente 36" maxlength="100">':''}</div>
   <div class="grid2"><div class="fstep"><span class="fl">Sessões</span><div class="stepper"><button type="button" data-step="sessions:-1">${svg('minus',16)}</button><b>${st.sessions}</b><button type="button" data-step="sessions:1">${svg('plus',16)}</button></div></div>
   <div class="fstep"><span class="fl">Feitas</span><div class="stepper"><button type="button" data-step="done:-1">${svg('minus',16)}</button><b>${st.done||0}</b><button type="button" data-step="done:1">${svg('plus',16)}</button></div></div></div>
   ${n?'':`<div class="fstep"><span class="fl">Situação</span>${chipsSel('status',['Em andamento','Pausado','Concluído'],st.status)}</div>`}
   <div class="grid2"><label class="field">Orçamento aprovado (R$)<input name="budget" inputmode="decimal" value="${fromCents(st.budget)}" placeholder="0,00"></label><label class="field">Observação<input name="notes" value="${esc(st.notes||'')}" maxlength="300" placeholder="Opcional"></label></div>
   ${n?`<label class="switch"><input type="checkbox" name="lancar" checked><i></i> Lançar o orçamento como “a receber” nas finanças</label>`:''}`;
   bindPicker(box,st,paint);bindChips(box,st,paint);
   box.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{const [k,d]=b.dataset.step.split(':');st[k]=Math.max(k==='sessions'?1:0,Math.min(99,(+st[k]||0)+ +d));if(st.done>st.sessions)st.done=st.sessions;paint()});
   const bu=box.querySelector('[name=budget]');bu.oninput=()=>st.budget=toCents(bu.value);const no=box.querySelector('[name=notes]');no.oninput=()=>st.notes=no.value};paint()})}

/* ---------- Finanças ---------- */
VIEWS.financeiro=function(){const k=filtro.fin||mesKey(today()),r=mesResumo(k);
 let list=S.entries.filter(e=>mesKey(e.date)===k||(!e.paid&&mesKey(e.date)<k));
 if(filtro.finTipo==='A receber')list=list.filter(e=>e.type==='Entrada'&&!e.paid);else if(filtro.finTipo==='Entradas')list=list.filter(e=>e.type==='Entrada');else if(filtro.finTipo==='Despesas')list=list.filter(e=>e.type==='Saída');
 list.sort((a,b)=>b.date.localeCompare(a.date));
 const aRec=S.entries.filter(e=>e.type==='Entrada'&&!e.paid).reduce((a,e)=>a+e.value,0);
 const meses=[...Array(6)].map((_,i)=>{const d=new Date();d.setDate(15);d.setMonth(d.getMonth()-5+i);return iso(d).slice(0,7)}),vals=meses.map(m=>mesResumo(m).rec),max=Math.max(...vals,1);
 const nomeMes=new Date(k+'-15T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
 return `<section class="page-h"><p class="eyebrow">Finanças do consultório</p><h1 class="title">Finanças</h1></section>
 <div class="month-nav glass"><button class="icon-btn ghost" data-mes="-1" aria-label="Mês anterior">${svg('left',18)}</button><b>${esc(nomeMes)}</b><button class="icon-btn ghost" data-mes="1" aria-label="Próximo mês">${svg('right',18)}</button></div>
 <section class="fin-hero"><small>Saldo do mês</small><strong class="${r.saldo<0?'neg':''}">${money(r.saldo)}</strong><div class="fin-split"><span><i class="dot in"></i>Recebido ${money(r.rec)}</span><span><i class="dot out"></i>Despesas ${money(r.sai)}</span></div>${aRec?`<span class="fin-pend">${money(aRec)} a receber</span>`:''}</section>
 <div class="row2"><button class="btn main" data-act="nova-entrada">${svg('plus',18)} Recebimento</button><button class="btn" data-act="nova-saida">${svg('down',18)} Despesa</button></div>
 <section class="card glass"><div class="card-h"><h3>Recebido · 6 meses</h3></div><div class="chart">${meses.map((m,i)=>`<button class="${m===k?'cur':''}" data-mes-k="${m}"><small>${vals[i]?money(vals[i]).replace(',00','').replace('R$','').trim():''}</small><i style="height:${Math.max(3,vals[i]/max*100)}%"></i><span>${mesNome(m)}</span></button>`).join('')}</div></section>
 <div class="chips scroll seg-chips">${['Tudo','Entradas','Despesas','A receber'].map(v=>`<button class="chip ${filtro.finTipo===v?'on':''}" data-ft="${v}">${v}</button>`).join('')}</div>
 <section class="card glass list-card">${list.length?list.map(itemEntrada).join(''):'<p class="muted center">Nenhum lançamento.</p>'}</section>`};
function formEntradaFin(e,type){const n=!e;e=e||{id:uid(),date:today(),desc:'',type,category:type==='Saída'?'Materiais':'Consultas',value:0,paid:true,patientId:''};
 const st={category:e.category,paid:e.paid?'1':'0',date:e.date,pid:e.patientId||'',q:''};
 const cats=e.type==='Saída'?['Materiais','Laboratório','Aluguel','Funcionários','Impostos','Equipamentos','Marketing','Outros']:['Consultas','Tratamentos','Convênio','Outros'];
 openDlg(n?(e.type==='Saída'?'Nova despesa':'Novo recebimento'):'Lançamento',`<label class="field big-money">Valor<span class="money-in"><b>R$</b><input name="value" inputmode="decimal" value="${fromCents(e.value)}" placeholder="0,00" required autocomplete="off"></span></label><div id="ffin"></div>`,
  async f=>{const value=toCents(f.value.value);if(value<=0)return 'Informe o valor.';const p=e.type==='Entrada'?pacienteDoPicker(st):null;
   const desc=(f.querySelector('[name=desc]').value.trim())||(st.category+(p?' · '+p.name:''));
   upsert('entries',{...e,desc,value,date:st.date||today(),category:st.category,paid:st.paid==='1',patientId:p?.id||''});toast('Lançamento salvo.')},
  n?null:()=>{if(!confirm('Excluir este lançamento?'))return false;remove('entries',e.id);toast('Lançamento excluído.');return true},
  f=>{const box=f.querySelector('#ffin');let desc=e.desc;const paint=()=>{const dias=[today(),addDias(today(),-1),addDias(today(),-2)];
   box.innerHTML=`<div class="fstep"><span class="fl">Categoria</span>${chipsSel('category',cats,st.category)}</div>
   <div class="fstep"><span class="fl">Situação</span>${chipsSel('paid',['1','0'],st.paid,v=>v==='1'?(e.type==='Saída'?'Pago':'Recebido'):'Pendente')}</div>
   <div class="fstep"><span class="fl">Data</span>${chipsSel('date',[...new Set([...dias,...(dias.includes(st.date)?[]:[st.date])])],st.date,diaCurto)}<label class="mini">outra data <input type="date" data-od value=""></label></div>
   ${e.type==='Entrada'?`<div class="fstep"><span class="fl">Paciente (opcional)</span>${pickerHTML(st)}</div>`:''}
   <label class="field">Descrição (opcional)<input name="desc" value="${esc(desc)}" maxlength="140" placeholder="Preenchida sozinha se ficar em branco"></label>`;
   bindChips(box,st,paint);if(e.type==='Entrada')bindPicker(box,st,paint);
   const od=box.querySelector('[data-od]');od.onchange=()=>{if(od.value){st.date=od.value;paint()}};const de=box.querySelector('[name=desc]');de.oninput=()=>desc=de.value};paint()})}

/* ---------- Para mim (cuidado pessoal) ---------- */
VIEWS.cuidar=function(){const c=care(),ag=c.agua[today()]||0,pct=Math.min(100,Math.round(ag/c.aguaMeta*100)),ci=cicloInfo();
 const semana=[...Array(7)].map((_,i)=>addDias(today(),i-6));
 const notif=('Notification' in window)?Notification.permission:'indisponivel';
 return `<section class="page-h"><p class="eyebrow">Seu momento</p><h1 class="title">Cuidar de <em>mim</em></h1></section>
 ${cardVerso(true)}
 <div class="cols"><div class="col">
 <section class="card glass water"><div class="card-h"><h3>${svg('drop',18)} Água</h3><span class="pill">meta ${c.aguaMeta} copos</span></div>
  <div class="water-main"><div class="ring big" style="--p:${pct}"><div><strong>${ag}</strong><small>de ${c.aguaMeta}</small></div></div>
   <div class="water-btns"><button class="btn main big" data-act="agua">${svg('plus',20)} Bebi um copo</button><button class="btn ghost sm" data-act="agua-menos">${svg('minus',16)} Desfazer</button><small class="muted">${c.aguaUlt?'Último copo '+(tempoDesde(c.aguaUlt)==='agora'?'agora mesmo':'há '+tempoDesde(c.aguaUlt)):'Nenhum copo ainda hoje'}</small></div></div>
  <div class="glasses">${[...Array(c.aguaMeta)].map((_,i)=>`<i class="${i<ag?'on':''}"></i>`).join('')}</div>
  <div class="water-week">${semana.map(d=>{const v=c.agua[d]||0;return `<span><i style="height:${Math.min(100,v/c.aguaMeta*100)}%"></i><small>${new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'narrow'})}</small></span>`}).join('')}</div>
  <div class="fstep"><span class="fl">Meta diária</span><div class="chips">${[6,8,10,12].map(v=>`<button class="chip sm ${c.aguaMeta===v?'on':''}" data-meta="${v}">${v} copos</button>`).join('')}</div></div>
  <label class="switch"><input type="checkbox" data-lembrar ${c.lembrarAgua?'checked':''}><i></i> Me lembrar de beber água</label>
  ${c.lembrarAgua?`<div class="chips">${[60,90,120].map(v=>`<button class="chip sm ${+c.aguaIntervalo===v?'on':''}" data-int="${v}">a cada ${v===60?'1 hora':v===90?'1h30':'2 horas'}</button>`).join('')}</div>
  ${notif==='default'?`<button class="btn ghost sm" data-act="notif">${svg('bell',16)} Permitir avisos no celular</button>`:notif==='denied'?'<p class="note">Os avisos estão bloqueados nos ajustes do celular. O lembrete aparece dentro do painel.</p>':''}`:''}
 </section></div>
 <div class="col">
 <section class="card glass cycle"><div class="card-h"><h3>${svg('moon',18)} Ciclo menstrual</h3>${ci?`<span class="pill">ciclo de ${ci.len} dias${ci.media?' (média)':''}</span>`:''}</div>
  ${ci?`<div class="cycle-main"><div class="ring big fase-${ci.cor}" style="--p:${Math.max(0,Math.min(100,ci.dia/ci.len*100))}"><div><small>dia</small><strong>${Math.max(1,ci.dia)}</strong><small>de ${ci.len}</small></div></div>
   <div class="grow"><b class="fase">${esc(ci.fase)}</b><p class="muted">${esc(ci.desc)}</p>
   <div class="cycle-facts"><span><small>Próxima</small><b>${dataBR(ci.prox).slice(0,5)}</b></span><span><small>Faltam</small><b>${Math.max(0,ci.faltam)} dia${Math.abs(ci.faltam)===1?'':'s'}</b></span><span><small>Fértil</small><b>${dataBR(addDias(ci.ult,ci.ov-5)).slice(0,5)}–${dataBR(addDias(ci.ult,ci.ov+1)).slice(0,5)}</b></span></div></div></div>
   <div class="cycle-bar">${[...Array(ci.len)].map((_,i)=>{const d=i+1;const cl=d<=c.duracao?'m':d>=ci.ov-4&&d<=ci.ov+1?'f':'';return `<i class="${cl} ${d===ci.dia?'hoje':''}"></i>`}).join('')}</div>
   <div class="legend"><span><i class="m"></i>Menstruação</span><span><i class="f"></i>Período fértil</span><span><i class="hoje"></i>Hoje</span></div>`
  :`<p class="muted">Registre o primeiro dia da última menstruação e o painel calcula a fase, a próxima data e o período fértil. Com o tempo, ele aprende a duração do seu ciclo.</p>`}
  <div class="row2"><button class="btn main" data-act="menstru-hoje">${svg('moon',18)} Começou hoje</button><label class="btn ghost file-like">${svg('cal',18)} Outro dia<input type="date" data-menstru-dia max="${today()}"></label></div>
  <div class="grid2"><div class="fstep"><span class="fl">Ciclo costuma ter</span><div class="stepper"><button data-cic="ciclo:-1">${svg('minus',16)}</button><b>${c.ciclo} dias</b><button data-cic="ciclo:1">${svg('plus',16)}</button></div></div>
  <div class="fstep"><span class="fl">Menstruação dura</span><div class="stepper"><button data-cic="duracao:-1">${svg('minus',16)}</button><b>${c.duracao} dias</b><button data-cic="duracao:1">${svg('plus',16)}</button></div></div></div>
  ${ci&&ci.hist.length?`<details class="more"><summary>Histórico (${ci.hist.length})</summary><div class="hist">${ci.hist.slice().reverse().slice(0,12).map((d,i,arr)=>`<div><b>${dataBR(d)}</b><span>${arr[i+1]?diffDias(arr[i+1],d)+' dias de ciclo':'primeiro registro'}</span><button class="icon-btn ghost sm" data-del-men="${d}" aria-label="Apagar">${svg('x',14)}</button></div>`).join('')}</div></details>`:''}
  <p class="note">Estimativa para organização pessoal; não serve como método contraceptivo.</p>
 </section></div></div>`};

/* ---------- Ajustes ---------- */
VIEWS.ajustes=function(){return `<section class="page-h"><p class="eyebrow">${DEMO?'Prévia':'Conta: '+esc(COFRE?.user||'')}</p><h1 class="title">Ajustes</h1></section>
 ${cardAgendamento()}
 <section class="card glass"><div class="card-h"><h3>${svg('down',18)} Importar agenda antiga</h3></div><p class="muted">Traga pacientes e consultas do sistema que você usava (Excel, CSV, Google Agenda). Pode repetir para atualizar: nada é duplicado.</p><button class="btn main" data-act="importar">${svg('down',18)} Importar arquivo</button></section>
 <section class="card glass"><div class="card-h"><h3>${svg('phone',18)} Instalar no iPhone</h3></div><p class="muted">No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”. O painel vira um app com ícone próprio.</p></section>
 <section class="card glass"><div class="card-h"><h3>${svg('down',18)} Cópia dos dados</h3></div><p class="muted">Baixe uma cópia uma vez por mês e guarde em local seguro.</p><button class="btn ghost" data-act="export">${svg('down',18)} Baixar cópia</button></section>
 ${DEMO?`<section class="card glass"><div class="card-h"><h3>${svg('refresh',18)} Prévia</h3></div><p class="muted">Esta é uma prévia com pacientes de exemplo. Pode mexer à vontade.</p><button class="btn ghost" data-act="demo-reset">${svg('refresh',18)} Voltar ao exemplo</button></section>`:`
 <form class="card glass" id="fsenha"><div class="card-h"><h3>Trocar senha</h3></div>${pwField('ns1','Nova senha','new-password')}${pwField('ns2','Repita a nova senha','new-password')}<button class="btn ghost">Trocar senha</button></form>
 <form class="card glass" id="ftok"><div class="card-h"><h3>Trocar chave do GitHub</h3></div><p class="muted">Use quando a chave vencer (validade de 1 ano). Mesmas permissões do primeiro acesso.</p><input id="ntok" type="password" placeholder="github_pat_…" autocomplete="off"><button class="btn ghost">Salvar nova chave</button></form>
 <button class="btn danger full" data-act="sair">${svg('out',18)} Sair deste aparelho</button>`}
 <p class="note center">Privacidade (LGPD): aqui ficam só dados de agenda e gestão. O prontuário clínico oficial continua no sistema do consultório.<br>Feito pelo Studio Evolution Tech.</p>`};
const LINK_AGENDAR=DEMO?'agendar/':CONFIG.SITE_URL+'agendar/';
function cardAgendamento(){const g=agCfg();const nomes=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];const ligada=g.ativo&&g.whatsapp;
 return `<section class="card glass"><div class="card-h"><h3>${svg('link',18)} Página de agendamento</h3><span class="tag ${ligada?'ok':'bad'}">${ligada?'Ligada':'Desligada'}</span></div>
 <p class="muted">${ligada?'O paciente escolhe um horário livre e o pedido chega no seu WhatsApp com um link que lança a consulta aqui.':'Informe o WhatsApp do consultório em “Configurar” para ligar.'}</p>
 <p class="note">${g.dias.map(d=>nomes[d]).join(', ')} · ${g.inicio} às ${g.fim}${g.pausaIni&&g.pausaFim?' · pausa '+g.pausaIni+'–'+g.pausaFim:''} · ${g.intervalo} min</p>
 <div class="row2"><button class="btn ghost" data-act="cfg-agenda">${svg('gear',16)} Configurar</button><button class="btn ghost" data-act="copiar-link">${svg('link',16)} Copiar link</button></div>
 <a class="btn ghost full" href="${LINK_AGENDAR}" target="_blank" rel="noopener">${svg('eye',16)} Ver a página</a></section>`}

/* ---------- lembretes (água e próxima consulta) ---------- */
let bannerAtual='',avisadas=new Set();
function mostrarBanner(id,html){if(bannerAtual===id)return;bannerAtual=id;const b=$('#banner');if(!b)return;b.innerHTML=`<div class="banner glass">${html}<button class="icon-btn ghost sm" data-fechar-banner aria-label="Fechar">${svg('x',14)}</button></div>`;
 b.querySelector('[data-fechar-banner]').onclick=fecharBanner;const bb=b.querySelector('[data-banner-agua]');if(bb)bb.onclick=()=>{beberAgua(1);render()}}
function fecharBanner(){bannerAtual='';const b=$('#banner');if(b)b.innerHTML=''}
async function notificar(titulo,corpo){try{if(!('Notification' in window)||Notification.permission!=='granted')return;const reg=await navigator.serviceWorker?.getRegistration();if(reg)reg.showNotification(titulo,{body:corpo,icon:'icon-180.png',badge:'icon-180.png'});else new Notification(titulo,{body:corpo,icon:'icon-180.png'})}catch{}}
function checarLembretes(){if(!S)return;const c=care(),h=new Date().getHours();
 if(c.lembrarAgua&&h>=8&&h<21&&(c.agua[today()]||0)<c.aguaMeta){const ult=Math.max(c.aguaUlt||0,new Date().setHours(8,0,0,0));const ms=(+c.aguaIntervalo||90)*6e4;
  if(Date.now()-ult>=ms){const id='agua-'+Math.floor(Date.now()/ms);mostrarBanner(id,`<span class="mi-ico sm">${svg('drop',16)}</span><span class="grow"><b>Hora de um copo d'água</b><small>${c.agua[today()]||0} de ${c.aguaMeta} hoje</small></span><button class="chip sm on" data-banner-agua>${svg('plus',14)} Bebi</button>`);if(!avisadas.has(id)){avisadas.add(id);notificar("Hora de um copo d'água 💧",'Você está em '+(c.agua[today()]||0)+' de '+c.aguaMeta+' copos hoje.')}}}
 const agora=new Date().getHours()*60+new Date().getMinutes();
 S.appointments.filter(a=>a.date===today()&&(a.status==='Confirmado'||a.status==='Agendado')).forEach(a=>{const f=hmin(a.time)-agora;if(f>0&&f<=15&&!avisadas.has('c'+a.id)){avisadas.add('c'+a.id);const p=pac(a.patientId);notificar('Próxima consulta às '+a.time,(p?.name||'')+(a.procedure?' · '+a.procedure:''));mostrarBanner('c'+a.id,`<span class="mi-ico sm">${svg('clock',16)}</span><span class="grow"><b>Às ${a.time}: ${esc(primeiro(p?.name))}</b><small>${esc(a.procedure||'Consulta')}</small></span>`)}})}
setInterval(checarLembretes,60e3);
let ultY=0;addEventListener('scroll',()=>{const f=$('.fab');if(!f)return;const y=scrollY;f.classList.toggle('esconde',y>ultY+4&&y>120);if(y<ultY-4)f.classList.remove('esconde');ultY=y},{passive:true});
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});


/* ---------- importar a agenda antiga (CSV, Excel, Google Agenda .ics ou cópia .json) ---------- */
const CAMPOS_IMP=[['name','Nome do paciente',/^(nome|paciente|cliente|nome do paciente|nome completo|titulo|summary|assunto)$/],['phone','Telefone',/(telefone|celular|whats|fone|contato)/],['birth','Nascimento',/(nascimento|data de nasc|aniversario|dt nasc)/],['plan','Convênio',/(convenio|plano|operadora)/],['card','Carteirinha',/(carteir|matricula)/],['date','Data da consulta',/^(data|dia|data da consulta|data do agendamento|inicio|start|dtstart|data inicio|agendamento)$/],['time','Hora',/^(hora|horario|hora inicio|inicio hora)$/],['procedure','Procedimento',/(procedimento|servico|tratamento|tipo|descricao|motivo)/]];
function csvLinhas(txt){const d=(txt.split('\n')[0].match(/;/g)||[]).length>(txt.split('\n')[0].match(/,/g)||[]).length?';':(txt.split('\n')[0].includes('\t')?'\t':',');
 const out=[];let row=[],cur='',q=false;for(let i=0;i<txt.length;i++){const c=txt[i];if(q){if(c==='"'&&txt[i+1]==='"'){cur+='"';i++}else if(c==='"')q=false;else cur+=c}else if(c==='"')q=true;else if(c===d){row.push(cur);cur=''}else if(c==='\n'){row.push(cur);out.push(row);row=[];cur=''}else if(c!=='\r')cur+=c}
 if(cur||row.length){row.push(cur);out.push(row)}return out.filter(r=>r.some(x=>x.trim()))}
function icsLinhas(txt){const un=txt.replace(/\r?\n[ \t]/g,'');const evs=un.split('BEGIN:VEVENT').slice(1);const rows=[['nome','data','hora','procedimento','telefone']];
 for(const ev of evs){const g=k=>{const m=ev.match(new RegExp('\\n'+k+'[^:\\n]*:([^\\n]*)'));return m?m[1].replace(/\\n/g,' ').replace(/\\,/g,',').trim():''};
  const dt=g('DTSTART');const m=dt.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?(Z?)/);if(!m)continue;let d=new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0));if(m[6])d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0)));
  const sum=g('SUMMARY'),desc=g('DESCRIPTION');const partes=sum.split(/\s[-–|]\s|:\s/);
  rows.push([partes[0]||sum,iso(d),m[4]?String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'):'',partes.slice(1).join(' ')||'',(desc.match(/(?:\+?55\s?)?\(?\d{2}\)?\s?9?\s?\d{4}[-\s.]?\d{4}/)||[''])[0]])}
 return rows}
async function xlsxLinhas(buf){if(!window.XLSX){toast('Abrindo a planilha…');await new Promise((ok,er)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';sc.onload=ok;sc.onerror=er;document.head.appendChild(sc)})}
 const wb=XLSX.read(buf,{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];return XLSX.utils.sheet_to_json(ws,{header:1,raw:false,dateNF:'dd/mm/yyyy'}).map(r=>r.map(x=>x==null?'':String(x))).filter(r=>r.some(x=>x.trim()))}
function dataImp(v){v=(v||'').trim();if(!v)return '';let m=v.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[0];m=v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);if(m)return (m[3].length===2?'20'+m[3]:m[3])+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');return ''}
function horaImp(v){const m=(v||'').match(/(\d{1,2})[:h](\d{2})/);return m?m[1].padStart(2,'0')+':'+m[2]:''}
function formImportar(){
 openSheet('Importar agenda antiga',`<p class="muted">No sistema antigo, procure <b>Exportar</b> (pacientes ou agenda) e salve o arquivo. Funciona com planilha <b>Excel/CSV</b>, <b>Google Agenda (.ics)</b> ou a cópia <b>.json</b> deste painel. Pode importar de novo quando quiser: o que já existe é atualizado, nada é duplicado.</p>
 <label class="btn main full big file-like">${svg('down',18)} Escolher arquivo<input type="file" id="fimp" accept=".csv,.txt,.xlsx,.xls,.ics,.json,text/csv,text/calendar,application/json"></label><div id="impOut"></div>`,d=>{
 const out=d.querySelector('#impOut');
 d.querySelector('#fimp').onchange=async e=>{const f=e.target.files[0];if(!f)return;out.innerHTML='<p class="muted center">Lendo o arquivo…</p>';
  try{const nome=f.name.toLowerCase();let rows;
   if(nome.endsWith('.json')){const j=JSON.parse(await f.text());const dados=j.dados||j;if(!dados.patients)throw Error('json');S=merge(S,{...dados,updatedAt:Date.now()});persist();fecharDlg();render();return toast('Cópia importada: '+dados.patients.length+' pacientes.')}
   if(nome.endsWith('.xlsx')||nome.endsWith('.xls'))rows=await xlsxLinhas(await f.arrayBuffer());
   else{let t=await f.text();if(t.includes('�')){t=new TextDecoder('windows-1252').decode(await f.arrayBuffer())}rows=nome.endsWith('.ics')||t.includes('BEGIN:VCALENDAR')?icsLinhas(t):csvLinhas(t)}
   if(rows.length<2)throw Error('vazio');mostrarMapa(rows)}catch(x){out.innerHTML='<p class="err">Não consegui ler esse arquivo. Me mande um exemplo que eu ajusto.</p>'}};
 function mostrarMapa(rows){const cab=rows[0].map(h=>normTxt(h).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim());const mapa={};
  for(const [k,,re] of CAMPOS_IMP){const i=cab.findIndex((h,ix)=>re.test(h)&&!Object.values(mapa).includes(ix));if(i>=0)mapa[k]=i}
  const corpo=rows.slice(1);
  const paint=()=>{const prev=corpo.slice(0,3);
   out.innerHTML=`<div class="lido glass"><p class="sheet-sub">${corpo.length} linhas encontradas · confira as colunas</p>
   ${CAMPOS_IMP.map(([k,l])=>`<label class="field">${l}<select data-map="${k}"><option value="">— não tem —</option>${rows[0].map((h,i)=>`<option value="${i}" ${mapa[k]===i?'selected':''}>${esc(h||'Coluna '+(i+1))}${prev[0]&&prev[0][i]?' · ex.: '+esc(String(prev[0][i]).slice(0,24)):''}</option>`).join('')}</select></label>`).join('')}
   <button class="btn main full big" data-imp-ok>${svg('check',18)} Importar e salvar</button></div>`;
   out.querySelectorAll('[data-map]').forEach(sel=>sel.onchange=()=>{mapa[sel.dataset.map]=sel.value===''?undefined:+sel.value});
   out.querySelector('[data-imp-ok]').onclick=()=>{if(mapa.name==null)return toast('Escolha a coluna do nome.');let np=0,up=0,nc=0;
    const g=(r,k)=>mapa[k]==null?'':String(r[mapa[k]]||'').trim();
    for(const r of corpo){const name=g(r,'name').replace(/\s+/g,' ').slice(0,100);if(!name)continue;const v={name,phone:g(r,'phone'),plan:g(r,'plan'),card:g(r,'card')};
     let p=acharPaciente(v);const birth=dataImp(g(r,'birth'));
     if(!p){p={id:uid(),name,phone:v.phone,birth,type:v.plan&&normTxt(v.plan)!=='particular'?'Convênio':'Particular',plan:v.plan&&normTxt(v.plan)!=='particular'?v.plan.slice(0,60):'',card:v.card,notes:'Importado da agenda antiga',etapas:[]};upsert('patients',p);np++}
     else{const upd={...p};let mud=false;for(const k of ['phone','card'])if(!upd[k]&&v[k]){upd[k]=v[k];mud=true}if(!upd.birth&&birth){upd.birth=birth;mud=true}if(mud){upsert('patients',upd);up++}}
     const date=dataImp(g(r,'date')),time=horaImp(g(r,'time'))||horaImp(g(r,'date'));
     if(date){if(!S.appointments.some(a=>a.patientId===p.id&&a.date===date&&(!time||a.time===time))){upsert('appointments',{id:uid(),patientId:p.id,date,time:time||'08:00',duration:+agCfg().intervalo||30,procedure:g(r,'procedure').slice(0,100),status:date<today()?'Atendido':'Agendado',value:0,notes:'Importado'});nc++}}}
    fecharDlg();render();toast(`Importado: ${np} paciente(s) novo(s), ${up} atualizado(s), ${nc} consulta(s).`)}};
  paint()}})}

/* ---------- ligações ---------- */
function bindMain(m){
 m.querySelectorAll('[data-act]').forEach(b=>b.onclick=e=>{const a=b.dataset.act;
  if(a==='nova-consulta')formConsulta();else if(a==='colar')formColar();else if(a==='importar')formImportar();else if(a==='novo-paciente')formPaciente();else if(a==='novo-trat')formTrat();
  else if(a==='nova-saida')formEntradaFin(null,'Saída');else if(a==='nova-entrada')formEntradaFin(null,'Entrada');
  else if(a==='cfg-agenda')formAgendaCfg();
  else if(a==='copiar-link'){navigator.clipboard?.writeText(LINK_AGENDAR).then(()=>toast('Link copiado. Coloque na bio do Instagram e no WhatsApp.'),()=>prompt('Copie o link:',LINK_AGENDAR))}
  else if(a==='agua'){e.stopPropagation();beberAgua(1);render()}else if(a==='agua-menos'){beberAgua(-1);render()}
  else if(a==='outro-verso'){e.stopPropagation();versoExtra++;render()}
  else if(a==='notif'){Notification.requestPermission().then(()=>render())}
  else if(a==='menstru-hoje'){const c=care();if(c.menstruacoes.includes(today()))return toast('Hoje já está registrado.');setCare({menstruacoes:[...c.menstruacoes,today()].sort()});toast('Registrado. O ciclo foi recalculado.');render()}
  else if(a==='demo-reset'){if(confirm('Voltar aos dados de exemplo?')){ls.del(LS.demo);location.reload()}}
  else if(a==='export'){const bl=new Blob([JSON.stringify({app:APP_NAME,exportedAt:new Date().toISOString(),dados:S},null,2)],{type:'application/json'});const l=document.createElement('a');l.href=URL.createObjectURL(bl);l.download=CONFIG.SLUG+'-'+today()+'.json';l.click();URL.revokeObjectURL(l.href);toast('Cópia baixada.')}
  else if(a==='sair'){if(confirm('Sair deste aparelho? Para voltar, use a senha.'))sair()}});
 m.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',e=>{if(e.target.closest('[data-act],a,input'))return;if(b.dataset.pf)filtro.pacFiltro=b.dataset.pf;ir(b.dataset.page)}));
 m.querySelectorAll('[data-edit-cons]').forEach(b=>b.onclick=()=>formConsulta(S.appointments.find(x=>x.id===b.dataset.editCons)));
 m.querySelectorAll('[data-edit-pac]').forEach(b=>b.onclick=()=>formPaciente(pac(b.dataset.editPac)));
 m.querySelectorAll('[data-edit-trat]').forEach(b=>b.onclick=()=>formTrat(S.treatments.find(x=>x.id===b.dataset.editTrat)));
 m.querySelectorAll('[data-edit-ent]').forEach(b=>b.onclick=()=>formEntradaFin(S.entries.find(x=>x.id===b.dataset.editEnt)));
 m.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>formConsulta(null,'',b.dataset.slot));
 m.querySelectorAll('[data-confirmou]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{if(confirm('O paciente confirmou? Marcar como "Confirmado"?')){const a=S.appointments.find(x=>x.id===b.dataset.confirmou);upsert('appointments',{...a,status:'Confirmado'});render()}},500)));
 m.querySelectorAll('[data-atendido]').forEach(b=>b.onclick=()=>{const a=S.appointments.find(x=>x.id===b.dataset.atendido);const na={...a,status:'Atendido'};upsert('appointments',na);syncEtapa(na);if(na.value>0)lancarRecebimento(na);else toast('Consulta marcada como atendida.');render()});
 m.querySelectorAll('[data-faltou]').forEach(b=>b.onclick=()=>{const a=S.appointments.find(x=>x.id===b.dataset.faltou);const nf={...a,status:'Faltou'};upsert('appointments',nf);syncEtapa(nf);toast('Marcado como falta. Use o botão verde para remarcar.');render()});
 m.querySelectorAll('[data-contatado]').forEach(b=>b.addEventListener('click',()=>{const p=pac(b.dataset.contatado);upsert('patients',{...p,returnContactedAt:today()});setTimeout(render,400)}));
 m.querySelectorAll('[data-pago]').forEach(b=>b.onclick=()=>{const e=S.entries.find(x=>x.id===b.dataset.pago);upsert('entries',{...e,paid:true,date:e.date<=today()?e.date:today()});toast(e.type==='Entrada'?'Marcado como recebido.':'Marcado como pago.');render()});
 m.querySelectorAll('[data-sessao]').forEach(b=>b.onclick=()=>{const t=S.treatments.find(x=>x.id===b.dataset.sessao);const done=Math.min(t.sessions,(t.done||0)+1);upsert('treatments',{...t,done,status:done>=t.sessions?'Concluído':t.status});toast(done>=t.sessions?'Tratamento concluído! 🎉':'Sessão '+done+' de '+t.sessions+' registrada.');render()});
 m.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>{const t=S.tasks.find(x=>x.id===b.dataset.task);b.closest('.task')?.classList.toggle('done');setTimeout(()=>{upsert('tasks',{...t,done:!t.done,doneAt:!t.done?Date.now():0,date:!t.done&&t.date<today()?today():t.date});render()},260)});
 m.querySelectorAll('[data-del-task]').forEach(b=>b.onclick=()=>{remove('tasks',b.dataset.delTask);render()});
 m.querySelectorAll('[data-sug-task]').forEach(b=>b.onclick=()=>{addTarefa(b.dataset.sugTask);render()});
 m.querySelectorAll('[data-form=tarefa]').forEach(f=>f.onsubmit=e=>{e.preventDefault();addTarefa(f.t.value);render();setTimeout(()=>$('[data-form=tarefa] input')?.focus(),50)});
 m.querySelectorAll('[data-dia]').forEach(b=>b.onclick=()=>{filtro.dia=b.dataset.dia;render()});
 m.querySelectorAll('[data-marcar-pac]').forEach(b=>b.onclick=()=>formConsulta(null,b.dataset.marcarPac));
 m.querySelectorAll('[data-ver-ret]').forEach(b=>b.onclick=()=>{filtro.verRet=true;render()});
 m.querySelectorAll('[data-sem]').forEach(b=>b.onclick=()=>{filtro.dia=addDias(filtro.dia,+b.dataset.sem);render()});
 m.querySelectorAll('[data-seg-trat]').forEach(b=>b.onclick=()=>{filtro.trat=b.dataset.segTrat;render()});
 m.querySelectorAll('[data-pf]').forEach(b=>{if(!b.dataset.page)b.onclick=()=>{filtro.pacFiltro=b.dataset.pf;render()}});
 m.querySelectorAll('[data-ft]').forEach(b=>b.onclick=()=>{filtro.finTipo=b.dataset.ft;render()});
 m.querySelectorAll('[data-mes]').forEach(b=>b.onclick=()=>{const k=filtro.fin||mesKey(today());const d=new Date(k+'-15T12:00:00');d.setMonth(d.getMonth()+ +b.dataset.mes);filtro.fin=iso(d).slice(0,7);render()});
 m.querySelectorAll('[data-mes-k]').forEach(b=>b.onclick=()=>{filtro.fin=b.dataset.mesK;render()});
 m.querySelectorAll('[data-meta]').forEach(b=>b.onclick=()=>{setCare({aguaMeta:+b.dataset.meta});render()});
 m.querySelectorAll('[data-int]').forEach(b=>b.onclick=()=>{setCare({aguaIntervalo:+b.dataset.int});render()});
 const lb=m.querySelector('[data-lembrar]');if(lb)lb.onchange=()=>{setCare({lembrarAgua:lb.checked});render()};
 m.querySelectorAll('[data-cic]').forEach(b=>b.onclick=()=>{const [k,d]=b.dataset.cic.split(':');const c=care();const v=k==='ciclo'?Math.max(21,Math.min(40,c.ciclo+ +d)):Math.max(2,Math.min(10,c.duracao+ +d));setCare({[k]:v});render()});
 const md=m.querySelector('[data-menstru-dia]');if(md)md.onchange=()=>{if(!md.value||md.value>today())return;const c=care();if(!c.menstruacoes.includes(md.value))setCare({menstruacoes:[...c.menstruacoes,md.value].sort()});toast('Registrado: '+dataBR(md.value)+'.');render()};
 m.querySelectorAll('[data-del-men]').forEach(b=>b.onclick=()=>{if(!confirm('Apagar o registro de '+dataBR(b.dataset.delMen)+'?'))return;const c=care();setCare({menstruacoes:c.menstruacoes.filter(x=>x!==b.dataset.delMen)});render()});
 const fb=m.querySelector('[data-filtro=busca]');if(fb)fb.oninput=()=>{filtro.busca=fb.value;const pos=fb.selectionStart;render();const n=$('[data-filtro=busca]');n.focus();n.setSelectionRange(pos,pos)};
 bindPw(m);
 const fs=m.querySelector('#fsenha');if(fs)fs.onsubmit=async e=>{e.preventDefault();const a=$('#ns1').value,b=$('#ns2').value;if(a.length<6)return toast('A senha precisa de pelo menos 6 caracteres.');if(a!==b)return toast('As senhas não são iguais.');
  try{toast('Trocando a senha…');const salt=crypto.getRandomValues(new Uint8Array(16));const k=await deriveKey(a,salt,ITER);const cofre={v:1,salt:b64(salt),iter:ITER,user:COFRE.user,box:await enc(k,{token:SESS.token})};
   await putCofre(cofre);KEY=k;COFRE=cofre;await cacheLocal();if(ls.get(LS.sess))ls.set(LS.sess,{token:SESS.token,key:await exportKey(k)});fs.reset();toast('Senha trocada. Use a nova senha nos outros aparelhos.')}catch{toast('Não consegui trocar a senha. Verifique a internet.')}};
 const ft=m.querySelector('#ftok');if(ft)ft.onsubmit=async e=>{e.preventDefault();const t=$('#ntok').value.trim();if(!/^(github_pat_|ghp_)/.test(t))return toast('Isso não parece uma chave do GitHub.');
  try{await gh(DATA_API,{},t);const cofre={...COFRE,box:await enc(KEY,{token:t})};await putCofre(cofre,t);SESS.token=t;COFRE=cofre;if(ls.get(LS.sess))ls.set(LS.sess,{token:t,key:await exportKey(KEY)});ft.reset();toast('Chave atualizada.')}catch{toast('Chave sem permissão. Confira os dois repositórios com Contents.')}};
}

function formAgendaCfg(){const g=agCfg();const nomes=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
 openDlg('Página de agendamento',`<label class="check"><input type="checkbox" name="ativo" ${g.ativo?'checked':''}> Página ligada (pacientes podem pedir horário)</label>
  <label class="field">WhatsApp do consultório (com DDD)<input name="whatsapp" inputmode="tel" value="${esc(g.whatsapp)}" placeholder="(11) 99999-9999" required></label>
  <div class="field">Dias de atendimento<div class="row">${nomes.map((n,i)=>`<label class="check" style="gap:5px"><input type="checkbox" name="dia" value="${i}" ${g.dias.includes(i)?'checked':''}>${n}</label>`).join('')}</div></div>
  <div class="grid3"><label class="field">Começa<input type="time" name="inicio" value="${g.inicio}" required></label><label class="field">Termina<input type="time" name="fim" value="${g.fim}" required></label><label class="field">Cada consulta<select name="intervalo">${[20,30,40,45,60].map(m=>`<option value="${m}" ${+g.intervalo===m?'selected':''}>${m} min</option>`).join('')}</select></label></div>
  <div class="grid2"><label class="field">Pausa (início)<input type="time" name="pausaIni" value="${g.pausaIni}"></label><label class="field">Pausa (fim)<input type="time" name="pausaFim" value="${g.pausaFim}"></label></div>
  <div class="grid2"><label class="field">Antecedência mínima<select name="antecedenciaH">${[[2,'2 horas'],[12,'12 horas'],[24,'1 dia'],[48,'2 dias']].map(([v,l])=>`<option value="${v}" ${+g.antecedenciaH===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="field">Mostrar horários de<select name="semanas">${[1,2,3,4,6].map(v=>`<option value="${v}" ${+g.semanas===v?'selected':''}>${v} semana${v>1?'s':''}</option>`).join('')}</select></label></div>
  <label class="field">Dias sem atendimento (feriados, férias)<input name="folgas" value="${esc(g.folgas.map(dataBR).join(', '))}" placeholder="Ex.: 20/11/2026, 24/12/2026"></label>
  <label class="field">Procedimentos que o paciente pode escolher (um por linha)<textarea name="procedimentos">${esc(g.procedimentos.join('\n'))}</textarea></label>
  <label class="field">Endereço (vai na mensagem de confirmação, opcional)<input name="endereco" value="${esc(g.endereco)}" maxlength="160"></label>
  <p class="note">A página mostra só os horários livres. Nomes e dados dos pacientes nunca ficam públicos.</p>`,
 async f=>{const tel=soNum(f.whatsapp.value);if(f.ativo.checked&&tel.length<10)return 'Informe o WhatsApp com DDD.';
  const dias=[...f.querySelectorAll('[name=dia]:checked')].map(x=>+x.value);if(!dias.length)return 'Escolha pelo menos um dia.';
  if(f.fim.value<=f.inicio.value)return 'O horário de término precisa ser depois do começo.';
  const folgas=f.folgas.value.split(/[,;\s]+/).map(x=>x.trim()).filter(Boolean).map(x=>{const m=x.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);if(!m)return null;const y=m[3]?(m[3].length===2?'20'+m[3]:m[3]):today().slice(0,4);return y+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0')});
  if(folgas.includes(null))return 'Escreva os dias sem atendimento assim: 20/11/2026.';
  const procs=f.procedimentos.value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,12);
  S.agenda={ativo:f.ativo.checked,whatsapp:tel,dias,inicio:f.inicio.value,fim:f.fim.value,intervalo:+f.intervalo.value,pausaIni:f.pausaIni.value,pausaFim:f.pausaFim.value,antecedenciaH:+f.antecedenciaH.value,semanas:+f.semanas.value,folgas:[...new Set(folgas)].sort(),endereco:f.endereco.value.trim(),procedimentos:procs.length?procs:AG_PADRAO.procedimentos,updatedAt:Date.now()};
  persist();toast('Página de agendamento atualizada. Em 1 minuto já aparece para os pacientes.')})}

/* ---------- pedido que chegou pelo WhatsApp ---------- */
function lerPedido(){const m=location.hash.match(/pedido=([\w-]+)/);if(!m)return null;
 try{const j=JSON.parse(td.decode(unb64(m[1].replace(/-/g,'+').replace(/_/g,'/'))));if(!j||!j.n||!j.d||!j.h)return null;return j}catch{return null}}
let PEDIDO=lerPedido();if(PEDIDO){try{sessionStorage.setItem('clin_pedido',JSON.stringify(PEDIDO))}catch{}history.replaceState(null,'',location.pathname+'#inicio')}
else{try{PEDIDO=JSON.parse(sessionStorage.getItem('clin_pedido'))}catch{}}
addEventListener('hashchange',()=>{const r=lerPedido();if(!r)return;PEDIDO=r;try{sessionStorage.setItem('clin_pedido',JSON.stringify(r))}catch{}history.replaceState(null,'',location.pathname+'#inicio');if(S&&$('#main')){if(dlg.open)dlg.close();abrirPedido()}});
const soNum=t=>(t||'').replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'');
function abrirPedido(){const r=PEDIDO;PEDIDO=null;try{sessionStorage.removeItem('clin_pedido')}catch{}if(!r)return;
 const ja=S.appointments.find(a=>a.reqId&&a.reqId===r.id);if(ja){toast('Esse pedido já foi lançado na agenda.');tab='agenda';filtro.dia=ja.date;render();return}
 const tel=soNum(r.t),existente=S.patients.find(p=>tel&&soNum(p.phone)===tel);
 const ocupado=S.appointments.find(a=>a.date===r.d&&a.time===r.h&&a.status!=='Cancelado'&&a.status!=='Faltou');
 openDlg('Pedido de agendamento',`<div class="card" style="display:grid;gap:4px"><b>${esc(r.n)}</b><small class="note">${esc(r.t||'')} · ${existente?'paciente já cadastrado':'novo paciente (será cadastrado)'}</small>${r.o?`<small class="note">Obs.: ${esc(r.o)}</small>`:''}</div>
  ${ocupado?`<p class="err" style="text-align:left">Atenção: esse horário já está ocupado (${esc(pac(ocupado.patientId)?.name||'')}). Troque o horário abaixo ou recuse o pedido.</p>`:''}
  <div class="grid3"><label class="field">Dia<input name="date" type="date" value="${esc(r.d)}" required></label><label class="field">Hora<input name="time" type="time" value="${esc(r.h)}" required></label><label class="field">Duração<select name="duration">${[15,30,45,60,90,120].map(m=>`<option value="${m}" ${+(agCfg().intervalo)===m?'selected':''}>${m} min</option>`).join('')}</select></label></div>
  <label class="field">Procedimento<input name="procedure" value="${esc(r.s||'')}" maxlength="100"></label>
  <a class="btn small" href="${waLink(r.t,MSG.recusar(r.n,r.d,r.h))}" target="_blank" rel="noopener">${svg('wa',15)} Recusar e oferecer outro horário</a>
  <p class="note">Ao salvar, a consulta entra na agenda como <b>Confirmado</b> e o horário some da página de agendamento.</p>`,
 async f=>{const c=S.appointments.find(a=>a.date===f.date.value&&a.time===f.time.value&&a.status!=='Cancelado'&&a.status!=='Faltou');if(c&&!confirm('Esse horário já está ocupado. Lançar mesmo assim?'))return 'Escolha outro horário.';
  let p=existente;if(!p){p={id:uid(),name:r.n.trim().slice(0,100),phone:r.t||'',birth:'',type:'Particular',plan:'',notes:'Veio pela página de agendamento'};upsert('patients',p)}
  const a={id:uid(),reqId:r.id||'',patientId:p.id,date:f.date.value,time:f.time.value,duration:+f.duration.value,procedure:f.procedure.value.trim(),status:'Confirmado',value:0,notes:r.o?('Pedido: '+r.o).slice(0,300):''};upsert('appointments',a);syncEtapa(a);
  filtro.dia=a.date;setTimeout(()=>avisarPaciente(p,a),60)})}
function avisarPaciente(p,a){
 openSheet('Consulta marcada',`<div class="done-anim">${svg('check',34)}</div><p class="center"><b>${esc(p.name)}</b><br><span class="muted">${esc(diaSemana(a.date))} às ${a.time}${a.procedure?' · '+esc(a.procedure):''}</span></p>
  ${p.phone?`<a class="btn wa full big" href="${waLink(p.phone,MSG.agendado(p,a))}" target="_blank" rel="noopener">${svg('wa',18)} Enviar confirmação ao paciente</a>`:''}<button class="btn ghost full" data-close>Fechar</button>`,d=>d.querySelectorAll('a.wa').forEach(b=>b.addEventListener('click',()=>setTimeout(fecharDlg,300))))}
/* ---------- cadeado ---------- */
function telaLogin(){
 app.innerHTML=`<div class="lock"><form class="lock-box" id="f">
  <span class="logo-ouro lock-logo" role="img" aria-label="${esc(APP_NAME)}"></span><h1>GESTÃO DO CONSULTÓRIO</h1>
  <p class="sub">Digite sua senha para abrir.</p>
  ${pwField('pw','Senha','current-password')}
  <label class="check"><input type="checkbox" id="lembrar" checked> Lembrar neste aparelho</label>
  <div class="err" id="err" role="alert"></div>
  <button class="btn main full" id="go">Entrar</button></form></div>`;
 bindPw(app);
 $('#f').onsubmit=async e=>{e.preventDefault();const b=$('#go');b.disabled=true;b.textContent='Abrindo…';$('#err').textContent='';
  try{const k=await deriveKey($('#pw').value,unb64(COFRE.salt),COFRE.iter||ITER);const sec=await dec(k,COFRE.box);KEY=k;SESS={token:sec.token};
   if($('#lembrar').checked)ls.set(LS.sess,{token:SESS.token,key:await exportKey(KEY)});await entrar()}
  catch{b.disabled=false;b.textContent='Entrar';$('#err').textContent='Senha incorreta. Tente de novo.'}}}
function telaSetup(){
 const url='https://github.com/settings/personal-access-tokens/new';
 app.innerHTML=`<div class="lock"><form class="lock-box" id="f" style="max-width:520px">
  <span class="logo-ouro lock-logo" role="img" aria-label="${esc(APP_NAME)}"></span><h1>GESTÃO DO CONSULTÓRIO</h1>
  <h2>Primeiro acesso</h2><p class="sub">É uma vez só. Depois, em qualquer aparelho, você entra só com a senha.</p>
  <section class="card" style="display:grid;gap:12px"><b>1. Crie a senha</b>${pwField('s1','Senha (mínimo 6 caracteres)','new-password')}${pwField('s2','Repita a senha','new-password')}</section>
  <section class="card" style="display:grid;gap:12px"><b>2. Cole a chave de salvamento do GitHub</b>
   <ol class="steps"><li>Abra <a href="${url}" target="_blank" rel="noopener">github.com → Fine-grained token</a>.</li><li>Nome: <code>${CONFIG.SLUG}-gestao</code>. Validade: 1 ano.</li><li>Repository access: <b>Only select repositories</b> → <code>${REPO}</code> e <code>${DATA_REPO}</code>.</li><li>Permissions → Repository: <b>Contents: Read and write</b>.</li><li>Toque em Generate token, copie e cole aqui.</li></ol>
   <label class="field">Chave<input id="tok" type="password" autocomplete="off" placeholder="github_pat_…" required></label>
   <p class="note">A chave fica guardada criptografada com a sua senha. Sem a senha, ninguém usa.</p></section>
  <div class="err" id="err" role="alert"></div>
  <button class="btn main full" id="go">Criar cadeado e entrar</button></form></div>`;
 bindPw(app);
 $('#f').onsubmit=async e=>{e.preventDefault();const a=$('#s1').value,b2=$('#s2').value,tok=$('#tok').value.trim(),er=$('#err'),b=$('#go');er.textContent='';
  if(a.length<6)return er.textContent='A senha precisa de pelo menos 6 caracteres.';
  if(a!==b2)return er.textContent='As senhas não são iguais.';
  if(!/^(github_pat_|ghp_)/.test(tok))return er.textContent='Isso não parece uma chave do GitHub (começa com github_pat_).';
  b.disabled=true;
  try{b.textContent='Conferindo a chave…';const u=await gh('/user',{},tok);for(const rp of [REPO,DATA_REPO]){const r=await gh(`/repos/${OWNER}/${rp}`,{},tok);if(!r.permissions?.push)throw Object.assign(Error(),{status:403})}
   b.textContent='Criando o cofre…';const salt=crypto.getRandomValues(new Uint8Array(16));const k=await deriveKey(a,salt,ITER);
   const cofre={v:1,salt:b64(salt),iter:ITER,user:u.login,box:await enc(k,{token:tok})};
   COFRE=cofre;KEY=k;SESS={token:tok};
   b.textContent='Preparando os dados…';const r0=await pull();S=r0.state||emptyState();if(!r0.state)await gh(DATA_API,{method:'PUT',body:JSON.stringify({message:'Inicia dados do consultório',content:b64(te.encode(JSON.stringify(S,null,1)))})},tok);
   b.textContent='Guardando no GitHub…';await putCofre(cofre,tok);
   ls.set(LS.sess,{token:tok,key:await exportKey(k)});await entrar(false);toast('Cadeado criado. O GitHub leva cerca de 1 minuto para publicar.')}
  catch(x){b.disabled=false;b.textContent='Criar cadeado e entrar';er.textContent=x.status===401?'Chave inválida. Gere de novo e cole.':(x.status===403||x.status===404)?`Chave sem permissão. Confira: repositórios ${REPO} e ${DATA_REPO}, com Contents em leitura e escrita.`:'Não consegui falar com o GitHub. Verifique a internet.'}}}


async function entrar(fazerPull=true){
 const c=ls.get(LS.cache);let local=null;if(c&&KEY){try{local=await dec(KEY,c)}catch{}}
 S=merge(S,local);
 if(fazerPull){setSync('busy');try{const r=await pull();S=merge(S,r.state||emptyState());setSync('ok')}catch(e){setSync('off');if(e.status===401||e.status===403)toast('A chave do GitHub venceu. Vá em Ajustes → Trocar chave.')}}
 if(!S){app.innerHTML='<div class="lock"><div class="lock-box"><h2>Sem conexão</h2><p class="sub">Não consegui carregar os dados e não há cópia neste aparelho. Conecte à internet e tente de novo.</p><button class="btn main full" onclick="location.reload()">Tentar de novo</button></div></div>';return}
 await cacheLocal();shell();render(true);if(PEDIDO)abrirPedido();publicarAgenda().catch(()=>{});setTimeout(checarLembretes,1500)}
function sair(){ls.del(LS.sess);ls.del(LS.cache);location.reload()}


function openDlg(title,body,onSave,onDelete,onOpen){
 dlg.innerHTML=`<form method="dialog" id="df" class="sheet"><div class="grab"></div><div class="mh"><h2>${esc(title)}</h2><button type="button" class="icon-btn ghost" data-close aria-label="Fechar">${svg('x',18)}</button></div><div class="mb">${body}<div class="err" id="derr" role="alert"></div></div><div class="mf">${onDelete?`<button type="button" class="btn danger" data-del>${svg('trash',16)} Excluir</button>`:''}<div class="right"><button type="button" class="btn" data-close>Cancelar</button><button class="btn main" type="submit">Salvar</button></div></div></form>`;
 const f=dlg.querySelector('#df');dlg.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>fecharDlg());
 f.onsubmit=async e=>{e.preventDefault();const err=await onSave(f);if(err){dlg.querySelector('#derr').textContent=err;return}dlg.close();render()};
 const d=dlg.querySelector('[data-del]');if(d)d.onclick=()=>{if(onDelete()){dlg.close();render()}};
 if(onOpen)onOpen(f);abrirDlg()}
dlg.addEventListener('click',e=>{if(e.target===dlg)fecharDlg()});
addEventListener('online',()=>{if(SESS&&syncState==='off')push()});
document.addEventListener('visibilitychange',async()=>{if(document.visibilityState==='visible'&&SESS&&KEY&&!pushing){try{const r=await pull();S=merge(S,r.state);await cacheLocal();setSync('ok');if(!dlg.open)render()}catch{}}});



/* ---------- prévia com dados de exemplo ---------- */
function exemplo(){const s=emptyState();const P=(name,phone,birth,type='Particular',plan='')=>{const p={id:uid(),name,phone,birth,type,plan,notes:'',updatedAt:Date.now()};s.patients.push(p);return p.id};
 const mes=today().slice(5,7),ano=+today().slice(0,4);
 const ids=[P('Mariana Alves','27999990001',(ano-34)+'-'+mes+'-'+today().slice(8)),P('João Pedro Lima','27999990002','1988-03-14'),P('Carla Dias','27999990003','1979-07-22','Convênio','Uniodonto'),P('Beatriz Souza','27999990004','1995-12-02'),P('Rafael Nunes','27999990005','1990-05-30'),P('Luciana Prado','27999990006','1984-'+mes+'-27'),P('Henrique Matos','27999990007','2001-09-09','Convênio','OdontoPrev'),P('Sofia Ribeiro','27999990008','2012-02-18')];
 const A=(pi,date,time,procedure,status,value=0,duration=30)=>s.appointments.push({id:uid(),patientId:ids[pi],date,time,duration,procedure,status,value,notes:'',updatedAt:Date.now()});
 const t=today(),d=n=>addDias(t,n);
 // hoje e próximos dias
 A(0,t,'08:30','Avaliação','Confirmado',15000);A(1,t,'10:00','Restauração','Agendado',28000,60);A(3,t,'14:00','Limpeza','Confirmado',18000);A(4,t,'16:30','Clareamento','Agendado',45000,60);
 const amanha=proxDiasUteis(2).find(x=>x>t)||d(1);A(5,amanha,'09:00','Revisão','Agendado');A(6,amanha,'11:00','Canal','Agendado',0,90);
 // passado (histórico e retornos)
 A(2,addMeses(t,-7),'10:00','Limpeza','Atendido',18000);A(7,addMeses(t,-6),'15:00','Revisão','Atendido',12000);A(0,d(-20),'09:00','Limpeza','Atendido',18000);A(1,d(-12),'10:00','Avaliação','Atendido',15000);A(4,d(-5),'14:00','Avaliação','Faltou');
 s.treatments.push({id:uid(),patientId:ids[1],title:'Canal',sessions:3,done:1,budget:90000,status:'Em andamento',approvedAt:d(-12),notes:'Dente 36',updatedAt:Date.now()});
 s.treatments.push({id:uid(),patientId:ids[4],title:'Clareamento',sessions:2,done:0,budget:90000,status:'Em andamento',approvedAt:d(-5),notes:'',updatedAt:Date.now()});
 const E=(date,desc,type,category,value,paid,pi)=>s.entries.push({id:uid(),date,desc,type,category,value,paid,patientId:pi!=null?ids[pi]:'',updatedAt:Date.now()});
 E(d(-20),'Limpeza · Mariana Alves','Entrada','Consultas',18000,true,0);E(d(-12),'Avaliação · João Pedro Lima','Entrada','Consultas',15000,true,1);E(d(-12),'Tratamento: Canal · João Pedro Lima','Entrada','Tratamentos',90000,false,1);
 E(d(-8),'Resinas e anestésicos','Saída','Materiais',42000,true);E(d(-3),'Laboratório de prótese','Saída','Laboratório',35000,false);E(d(-15),'Aluguel da sala','Saída','Aluguel',150000,true);
 for(let i=1;i<=5;i++){const dd=new Date();dd.setDate(10);dd.setMonth(dd.getMonth()-i);E(iso(dd),'Consultas do mês','Entrada','Consultas',[620000,540000,710000,480000,590000][i-1],true)}
 ['Conferir agenda de amanhã','Pedido ao laboratório','Esterilizar instrumentais','Postar no Instagram'].forEach((title,i)=>s.tasks.push({id:uid(),title,date:t,done:i===0,createdAt:Date.now()+i,updatedAt:Date.now()}));
 s.care={...CARE_PADRAO,agua:{[t]:3,[d(-1)]:7,[d(-2)]:8,[d(-3)]:5,[d(-4)]:6,[d(-5)]:8,[d(-6)]:4},aguaUlt:Date.now()-50*6e4,menstruacoes:[d(-73),d(-45),d(-17)],updatedAt:Date.now()};
 s.agenda={...AG_PADRAO,whatsapp:'27999999999',endereco:'Rua Exemplo, 100 · Centro',updatedAt:Date.now()};
 return s}

/* ---------- início ---------- */
(async function boot(){
 if(DEMO){S=ls.get(LS.demo)||exemplo();ls.set(LS.demo,S);shell();render(true);if(PEDIDO)abrirPedido();setTimeout(checarLembretes,1500);return}
 if(!crypto.subtle){app.innerHTML='<div class="lock"><div class="lock-box"><h2>Abra pelo endereço seguro</h2><p class="sub">Abra o link que você recebeu, com https.</p></div></div>';return}
 app.innerHTML='<div class="lock"><div class="lock-box"><span class="logo-ouro lock-logo" role="img" aria-label="Dra. Ana Luiza Costa"></span><p class="sub">Carregando…</p></div></div>';
 const cofreP=fetchCofre();const sess=ls.get(LS.sess);
 if(sess?.key){try{KEY=await importKey(sess.key);SESS={token:sess.token};COFRE=ls.get(LS.cofre);await entrar();cofreP.then(c=>{if(c&&c!=='offline')COFRE=c});return}catch{ls.del(LS.sess)}}
 COFRE=await cofreP;
 if(COFRE==='offline'){app.innerHTML='<div class="lock"><div class="lock-box"><h2>Sem internet</h2><p class="sub">Conecte o aparelho e tente de novo.</p><button class="btn main full" onclick="location.reload()">Tentar de novo</button></div></div>';return}
 if(!COFRE)telaSetup();else telaLogin()})();
})();
