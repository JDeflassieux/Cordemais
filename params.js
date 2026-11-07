/* ============================================================
   Escapades Atlantique — paramètres partagés par toutes les pages.
   Source unique des montants : prix, remises, rémunération de Guillaume, port.
   Prototype : les valeurs modifiées dans « Réglages » (page planning) sont
   enregistrées dans le navigateur. En production, remplacer loadParams()
   par une lecture de la base partagée (et saveParams() par une écriture).
   ============================================================ */
window.ESCAPADES_DEFAULTS = {
  /* Prix par jour (€) */
  PRICE_M_HIGH: 240, PRICE_M_LOW: 190,      /* Maïtika : pleine saison (juillet-août) / hors saison */
  PRICE_P_HIGH: 150, PRICE_P_LOW: 120,      /* Petit Bonheur */
  MIN_M: 5, MIN_P: 3,                       /* durée minimale (jours calendaires) */
  FIRST_FRAC: 1/3, LAST_FRAC: 2/3,          /* jour de remise des clés / jour du retour */
  /* Remises client (%) */
  DISC_ONE: 10, DISC_BOTH: 15, DISC_EARLY: 10, DISC_LAST: 15,
  EARLY_DEADLINE: '2027-04-15', LAST_DAYS: 7,
  /* Rémunération de Guillaume et coûts */
  CONVOY_FEE: 300, TRACTOR: 100, KEY_FEE: 50, PCT_RET: 10, TRAVEL: 90,
  NIGHT: 35, LONG_GAP: 0,                   /* LONG_GAP 0 = seuil automatique */
  /* Notifications e-mail aux propriétaires */
  OWNER_EMAILS: '',                          /* à renseigner dans Réglages : "julien@… ; guillaume@…" */
  EMAILJS_SERVICE: 'service_mp0ywp7', EMAILJS_TEMPLATE: 'template_6xykz1c', EMAILJS_KEY: 'IovFsMwJUgt2_zT7i',   /* EmailJS (clé publique : peut figurer dans le code) */
  SITE_URL: 'https://jdeflassieux.github.io/Cordemais/'   /* adresse GitHub Pages du site (pas celle du dépôt github.com) */
};
window.loadParams = function(){
  const P = Object.assign({}, window.ESCAPADES_DEFAULTS);
  try { Object.assign(P, JSON.parse(localStorage.getItem('escapades-params') || '{}')); } catch(e) {}
  return P;
};
window.saveParams = function(P){ try { localStorage.setItem('escapades-params', JSON.stringify(P)); } catch(e) {} };
window.PARAMS = window.loadParams();
/* dérivés */
window.PARAMS.CONVOY_RETURN = 2 * window.PARAMS.CONVOY_FEE + window.PARAMS.TRACTOR;
window.PARAMS.BREAKEVEN = Math.ceil(window.PARAMS.CONVOY_RETURN / window.PARAMS.NIGHT);
window.PARAMS.GAP = window.PARAMS.LONG_GAP > 0 ? window.PARAMS.LONG_GAP : window.PARAMS.BREAKEVEN;

/* ---------- Envoi d'une notification de réservation aux propriétaires ----------
   data : {kind, boat, client, start, end, days, billed, base, discounts, total, deposit, status, bareme, name, email, phone, exp}
   - EmailJS configuré (service, template, clé publique) : envoi silencieux depuis le navigateur, gabarit HTML aux couleurs du site (email-template.html).
   - Sinon : ouverture du logiciel de messagerie avec le texte prérempli (mailto), pour les tests.
   En production avec une base partagée, cette fonction sera remplacée par un envoi côté serveur. */
window.notifyBooking = function(data){
  const P = window.loadParams(), to = (P.OWNER_EMAILS||'').split(/[;,]/).map(x=>x.trim()).filter(Boolean);
  if(!to.length) return Promise.resolve('no-recipient');
  const base = P.SITE_URL ? P.SITE_URL.replace(/\/?$/,'/') : '';
  const page = data.boat==='Maïtika' ? 'dehler.html' : 'petit-bonheur.html';
  const tpl = Object.assign({}, data, {to_email: to.join(','), link_planning: base+'reservations.html', link_boat: base+page,
    subject: '['+data.boat+'] Réservation '+data.status+' · '+data.start+' → '+data.end+' · '+data.total});
  if(P.EMAILJS_SERVICE && P.EMAILJS_TEMPLATE && P.EMAILJS_KEY){
    const run = ()=>{ emailjs.init({publicKey:P.EMAILJS_KEY}); return emailjs.send(P.EMAILJS_SERVICE, P.EMAILJS_TEMPLATE, tpl); };
    if(window.emailjs) return run();
    return new Promise((res,rej)=>{ const sc=document.createElement('script'); sc.src='https://cdn.jsdelivr.net/npm/@emailjs/browser@4.4.1/dist/email.min.js'; sc.onload=()=>run().then(res,rej); sc.onerror=rej; document.head.appendChild(sc); });
  }
  const body = [
    'Réservation '+data.status+' · '+data.boat, '',
    'Client : '+(data.name||('client n° '+data.client))+(data.email?' · '+data.email:'')+(data.phone?' · '+data.phone:''),
    data.exp?'Expérience : '+data.exp:'',
    'Du '+data.start+' (remise des clés 17 h) au '+data.end+' (retour et état des lieux 16 h)',
    data.days+' jours calendaires · '+data.billed+' jours facturés', '',
    'Prix de base : '+data.base, 'Remises : '+(data.discounts||'aucune'), 'Total : '+data.total, 'Acompte (30 %) : '+data.deposit, '',
    'Barème appliqué : '+data.bareme, '',
    'Planning des deux bateaux : '+(tpl.link_planning||'reservations.html'), 'Fiche du bateau : '+(tpl.link_boat||page)
  ].filter(x=>x!==undefined).join('\n');
  window.location.href = 'mailto:'+to.join(',')+'?subject='+encodeURIComponent(tpl.subject)+'&body='+encodeURIComponent(body);
  return Promise.resolve('mailto');
};
