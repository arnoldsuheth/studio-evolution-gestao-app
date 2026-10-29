/* Service worker só para avisos (água e consultas). Não guarda cache: atualizações chegam na hora. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window'}).then(l=>{if(l[0])return l[0].focus();return self.clients.openWindow('./')}))});
