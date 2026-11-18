/* PUXAR PARA ATUALIZAR - Studio Evolution Tech / AI Node
   Serve para QUALQUER app (um arquivo, sem biblioteca). Para usar: cole este bloco
   dentro de uma tag <script> antes do </body>. Funciona no iPhone/Android quando o app
   está instalado na tela inicial (modo app). No navegador comum o próprio navegador já faz. */
(function(){
  if(window.__ptr)return;window.__ptr=1;
  var standalone=window.navigator.standalone||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches);
  if(!standalone&&!window.PTR_FORCE)return;
  var LIM=80,MAX=130,y0=0,dy=0,on=false,go=false;
  var st=document.createElement('style');
  st.textContent='#ptr{position:fixed;left:50%;top:0;z-index:99999;transform:translate(-50%,-60px);padding:7px 14px;font:700 11px ui-monospace,Menlo,monospace;letter-spacing:.04em;color:#c2410c;background:#fff;border:1px solid rgba(249,115,22,.45);box-shadow:0 6px 16px rgba(249,115,22,.22);pointer-events:none;transition:transform .18s ease;white-space:nowrap}#ptr.on{transition:none}';
  document.head.appendChild(st);
  var el=document.createElement('div');el.id='ptr';el.textContent='> puxe para atualizar';document.body.appendChild(el);
  function aberto(t){
    if(t&&t.closest&&t.closest('textarea,input,select,[contenteditable="true"],[contenteditable=""],.cm-editor,.cm-content,.monaco-editor,.ofmain'))return true;
    if(document.querySelector('dialog[open],.modal.on,.sheet.on,.sheet.open,#ov.on,[role=dialog]:not([hidden])'))return true;
    for(var n=t;n&&n!==document.body&&n!==document.documentElement;n=n.parentElement){
      var s=getComputedStyle(n);
      if((s.overflowY==='auto'||s.overflowY==='scroll')&&n.scrollHeight>n.clientHeight&&n.scrollTop>0)return true;
    }
    return false;
  }
  addEventListener('touchstart',function(e){
    if(e.touches.length!==1||(window.scrollY||document.documentElement.scrollTop)>0||aberto(e.target)){on=false;return}
    y0=e.touches[0].clientY;dy=0;on=true;go=false;
  },{passive:true});
  addEventListener('touchmove',function(e){
    if(!on)return;dy=e.touches[0].clientY-y0;
    if(dy<=0){el.classList.remove('on');el.style.transform='translate(-50%,-60px)';return}
    if((window.scrollY||0)>0){on=false;return}
    var d=Math.min(dy*.55,MAX);go=d>=LIM*.55;
    el.classList.add('on');el.style.transform='translate(-50%,'+(Math.min(d,60)-30)+'px)';
    el.textContent=go?'> solte para atualizar':'> puxe para atualizar';
  },{passive:true});
  function fim(){
    if(!on)return;on=false;el.classList.remove('on');
    if(go){el.textContent='> atualizando...';el.style.transform='translate(-50%,18px)';
      setTimeout(function(){var u=location.href.split('#')[0].replace(/([?&])_r=\d+&?/,'$1').replace(/[?&]$/,'');location.replace(u+(u.indexOf('?')>-1?'&':'?')+'_r='+Date.now()+(location.hash||''))},250)}
    else el.style.transform='translate(-50%,-60px)';
  }
  addEventListener('touchend',fim,{passive:true});addEventListener('touchcancel',fim,{passive:true});
})();
