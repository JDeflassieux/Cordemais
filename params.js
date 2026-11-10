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
  NIGHT: 38, LONG_GAP: 0,                   /* nuit de port à Pornichet, gabarit 10 m (fiche 2026) ; LONG_GAP 0 = seuil automatique */
  /* Annulation par le client */
  CANCEL_FREE_DAYS: 30, CANCEL_LATE_DAYS: 7, CANCEL_MID_PCT: 30, CANCEL_LATE_PCT: 100,   /* gratuite ≥ 30 j avant ; 30 % (l'acompte) de 29 à 8 j ; 100 % à 7 j ou moins */
  HOLD_MINUTES: 30,                          /* une période validée mais non payée expire après ce délai (minutes) */
  /* Contrat */
  GUARANTEE: 1500,                            /* dépôt de garantie (caution) demandé à la remise des clés, € */
  OWNER_NAME: '', OWNER_ADDRESS: '',          /* identité du loueur figurant au contrat */
  NAV_ZONE: 'Navigation côtière entre Le Croisic et Les Glénan, à 6 milles maximum d’un abri, de jour',
  /* Notifications e-mail aux propriétaires */
  OWNER_EMAILS: '',                          /* à renseigner dans Réglages : "julien@… ; guillaume@…" */
  EMAILJS_SERVICE: 'service_mp0ywp7', EMAILJS_TEMPLATE: 'template_6xykz1c', EMAILJS_KEY: 'IovFsMwJUgt2_zT7i',   /* EmailJS (clé publique : peut figurer dans le code) */
  SITE_URL: 'https://jdeflassieux.github.io/Cordemais/'   /* adresse GitHub Pages du site (pas celle du dépôt github.com) */
};
window.loadParams = function(){
  const P = Object.assign({}, window.ESCAPADES_DEFAULTS);
  try { const S = JSON.parse(localStorage.getItem('escapades-params') || '{}');
        for (const k in S) if (S[k] !== '' && S[k] !== null && S[k] !== undefined) P[k] = S[k];   /* une case vide dans les réglages = valeur par défaut */
  } catch(e) {}
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

/* ---------- Journal d'audit : ajout seul, horodaté, conservé dans le navigateur (en production : table dédiée côté serveur) ---------- */
window.audit = function(kind, data){ try{ const L = JSON.parse(localStorage.getItem('audit-log')||'[]');
  L.push({ t: new Date().toISOString(), kind, page: (location.pathname.split('/').pop()||'index.html'), client: localStorage.getItem('sim-client')||'', ua: navigator.userAgent.slice(0,60), data: data||{} });
  localStorage.setItem('audit-log', JSON.stringify(L)); }catch(e){} };
/* Périodes non payées expirées : purge et journalisation ; renvoie la liste nettoyée */
window.purgeExpired = function(key, list){ const P = window.loadParams(), ms = (P.HOLD_MINUTES||30)*60000, now = Date.now(); let changed=false;
  const kept = list.filter(x => { if(x[3]==='pending' && x[8] && now - x[8] > ms){ changed=true; window.audit('hold_expired', {key, start:x[0], end:x[1], id:x[4], client:x[5]}); return false; } return true; });
  if(changed){ try{ localStorage.setItem(key, JSON.stringify(kept)); }catch(e){} } return kept; };

/* Accès aux pages : une entrée par page et par session de navigation (pas à chaque rechargement) */
try{ const pg=(location.pathname.split('/').pop()||'index.html'); const k='visited-'+pg; if(!sessionStorage.getItem(k)){ sessionStorage.setItem(k,'1'); window.audit('visit',{page:pg, ref:(document.referrer||'').split('/').pop()||'direct'}); } }catch(e){}
