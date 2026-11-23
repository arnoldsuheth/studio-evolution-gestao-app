/* Formulário de briefing no topo de "Pacotes e preços" (23/11/2026, pedido do Arnold).
   Arquivo separado: o app.js publicado tem código mais novo que o repositório-fonte, então não reconstruímos ele.
   Mesma mensagem e mesmos formulários da janela "Enviar formulário" do app. */
(function(){
  var BASE='https://arnoldsuheth.github.io/studio-evolution-formulario/';
  var DDD=new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
  function numero(v){var d=String(v).replace(/\D/g,'');if((d.length===12||d.length===13)&&d.indexOf('55')===0)d=d.slice(2);
    if(!DDD.has(d.slice(0,2))||!(/^[1-9]\d9\d{8}$/.test(d)||/^[1-9]\d[2-5]\d{7}$/.test(d)))return null;return '55'+d}
  function link(t){return BASE+(t==='life'?'index.html':t==='followup'?'acompanhamento.html':'sites.html')}
  function nome(t){return t==='life'?'Life Trail':t==='followup'?'Acompanhamento de proposta':'Criação de sites'}
  function msg(t){return 'Oi! Tudo bem? Aqui é o Arnold, do *Studio Evolution Tech*.\n\nVamos criar seu projeto? Preparei um briefing específico para conhecer o que você precisa. A maioria das respostas é de clicar.\n\n'+
    (t==='life'?'Briefing Life Trail':t==='followup'?'Acompanhamento de proposta — validade de 1 mês':'Briefing de criação de sites')+'\n'+link(t)+'\n\nAo terminar, você pode revisar as respostas e enviá-las para mim pelo WhatsApp. Vamos dar o próximo passo?'}
  var ic={chat:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>',
    send:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></svg>',
    ext:'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    copy:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16V4a2 2 0 0 1 2-2h10"/></svg>'};
  var css=document.createElement('style');css.textContent=
   '.bt-card{padding:22px;margin:0 0 22px;display:grid;gap:14px;border-radius:16px}'+
   '.bt-card .share-intro{display:flex;gap:13px;align-items:center}.bt-card .share-intro h2{font-size:19px;margin:2px 0 0;letter-spacing:-.3px}.bt-card .share-intro .eyebrow{margin:0}'+
   '.bt-card .form-field{display:grid;gap:7px}.bt-card .form-field input,.bt-card .form-field select{width:100%;min-height:46px;padding:0 12px;font-size:16px}'+
   '.bt-foot{display:flex;gap:10px;flex-wrap:wrap}.bt-foot>.button{flex:1 1 160px;min-height:46px;justify-content:center;display:inline-flex;align-items:center;gap:8px}'+
   '.bt-more summary{cursor:pointer;color:#67e8f9;font-size:13px;padding:6px 0;min-height:32px}.bt-more textarea{width:100%;margin-top:8px}'+
   '.bt-grid{display:grid;gap:14px}@media(min-width:900px){.bt-grid{grid-template-columns:1fr 1fr}}';
  document.head.appendChild(css);
  function monta(){
    var el=document.createElement('section');el.className='card share-modal bt-card';el.id='briefingTopo';el.setAttribute('aria-labelledby','btTitle');
    el.innerHTML='<div class="share-intro"><span class="share-icon">'+ic.chat+'</span><div><p class="eyebrow">1º PASSO · ANTES DOS VALORES</p><h2 id="btTitle">Enviar formulário ao cliente</h2></div></div>'+
     '<div class="bt-grid"><label class="form-field" for="btType">Qual briefing deseja enviar?<select id="btType"><option value="sites">Criação de sites</option><option value="life">Life Trail — rotina e organização</option><option value="followup">Acompanhamento de proposta</option></select></label>'+
     '<label class="form-field" for="btPhone">WhatsApp do cliente com DDD <span class="required">*</span><input id="btPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="22" placeholder="(27) 99999-0000" aria-describedby="btHint"></label></div>'+
     '<p class="small muted" id="btHint">Número brasileiro com DDD. Também aceita +55.</p>'+
     '<div class="share-link"><span class="briefing-file">'+ic.send+'</span><div><b id="btName"></b><span>Briefing rápido · maioria de clique</span></div><a id="btOpen" target="_blank" rel="noopener noreferrer" aria-label="Abrir formulário">'+ic.ext+'</a></div>'+
     '<details class="bt-more"><summary>Ver a mensagem que vai junto</summary><textarea id="btMsg" class="message-preview" readonly rows="7"></textarea></details>'+
     '<p class="form-error" id="btErr" role="alert" hidden></p>'+
     '<div class="bt-foot"><button type="button" class="button subtle" id="btCopy">'+ic.copy+'<span>Copiar mensagem</span></button><a class="button primary whatsapp-button" id="btWa" target="_blank" rel="noopener noreferrer">'+ic.send+'Abrir WhatsApp</a></div>';
    var $=function(id){return el.querySelector('#'+id)};
    function atualiza(){var t=$('btType').value;$('btName').textContent=nome(t);$('btOpen').href=link(t);$('btMsg').value=msg(t)}
    function erro(s){$('btErr').textContent=s;$('btErr').hidden=!s}
    $('btType').onchange=atualiza;$('btPhone').oninput=function(){erro('')};
    $('btWa').onclick=function(e){var n=numero($('btPhone').value);if(!n){e.preventDefault();erro('Informe um número válido com DDD, como (27) 99999-0000.');$('btPhone').focus();return}
      this.href='https://wa.me/'+n+'?text='+encodeURIComponent(msg($('btType').value))};
    $('btCopy').onclick=function(){var t=msg($('btType').value),b=this;function ok(){b.querySelector('span').textContent='Mensagem copiada';erro('')}
      if(navigator.clipboard)navigator.clipboard.writeText(t).then(ok,function(){erro('Não foi possível copiar. Abra "Ver a mensagem que vai junto" e copie manualmente.')});else erro('Abra "Ver a mensagem que vai junto" e copie manualmente.')};
    atualiza();return el}
  function coloca(){
    var h=document.querySelector('.page-heading h1');var ok=h&&h.textContent.trim()==='Pacotes e preços';var ja=document.getElementById('briefingTopo');
    if(!ok){if(ja)ja.remove();return}
    if(ja)return;var ph=document.querySelector('.page-heading');if(!ph||!ph.parentNode)return;ph.parentNode.insertBefore(monta(),ph.nextSibling)}
  var t=0;new MutationObserver(function(){clearTimeout(t);t=setTimeout(coloca,50)}).observe(document.documentElement,{childList:true,subtree:true});
  coloca();
})();
