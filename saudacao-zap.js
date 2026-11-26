/* 26/11/2026 (Arnold): toda mensagem de WhatsApp sai com "Bom dia", "Boa tarde" ou "Boa noite",
   conforme o horário em que ele toca para enviar. Arquivo à parte, sem mexer no app.js. */
(function(){
 function saud(){var h=Number(new Date().toLocaleString('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',hour12:false}))%24;return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'}
 // troca o "Oi"/"Olá" do começo; se começa pelo nome, põe a saudação antes; senão, numa linha própria
 /* regra do Arnold (24/11): mensagens sem emoji */
 function semEmoji(t){return String(t||'').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/gu,'').replace(/[ \t]+\n/g,'\n').replace(/[ \t]{2,}/g,' ')}
 function comSaud(t){t=semEmoji(t);var s=saud(),m=t.match(/^\s*(oi|olá|ola|bom dia|boa tarde|boa noite)(?![a-zà-ÿ])/i);
  if(m)return s+t.slice(m[0].length);if(/^\s*[A-Za-zÀ-ÿ]/.test(t))return s+', '+t.replace(/^\s+/,'');return s+'!\n\n'+t}
 function arruma(url){try{if(!/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(url||''))return url;var u=new URL(url),t=u.searchParams.get('text');if(!t)return url;u.searchParams.set('text',comSaud(t));return u.toString().replace(/\+/g,'%20')}catch(e){return url}}
 // links <a href="https://wa.me/...">
 document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href*="wa.me/"],a[href*="api.whatsapp.com/"]');if(a)a.href=arruma(a.href)},true);
 // aberturas por código
 var abre=window.open;window.open=function(url){var args=[].slice.call(arguments);if(typeof url==='string')args[0]=arruma(url);return abre.apply(window,args)};
 // "Copiar mensagem": só ajusta o que é mensagem (começa com saudação ou com o cabeçalho do Studio)
 try{var cb=navigator.clipboard,orig=cb&&cb.writeText&&cb.writeText.bind(cb);if(orig)cb.writeText=function(t){if(/^\s*(oi|olá|ola|bom dia|boa tarde|boa noite)(?![a-zà-ÿ])|^\*Studio Evolution Tech/i.test(String(t||'')))t=comSaud(t);return orig(t)}}catch(e){}
 window.__comSaudacao=comSaud;
})();
