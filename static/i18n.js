/* Wach0ss Home — traduzione a schermo.
   Non modifica il funzionamento della pagina: cambia solo il testo che si legge.
   Se il dizionario non c'e' (lingua italiana) questo file esce subito e non fa nulla.

   Il dizionario lo mette il server prima di questo script:
     window.__WH_DIZ__ = { lingua:'en', frasi:{...}, modelli:[[regex, sostituzione], ...], esclusi:['selettore', ...] }
*/
(function () {
  'use strict';
  var D = window.__WH_DIZ__;
  if (!D || !D.frasi) return;                       // italiano: non si tocca niente

  var FRASI = D.frasi;
  var CONTESTI = D.contesti || [];   // stessa parola, resa diversa a seconda di cosa la precede
  var CODE = D.code || [];           // code fisse in fondo alla riga, tradotte a parte

  /* MODO DIAGNOSTICA (solo per il collaudo: si accende con ?wh_debug=1 nell'indirizzo).
     Raccoglie in window.__WH_MANCA__ ogni testo che sembra italiano e che NON siamo riusciti
     a tradurre. Serve a non lasciare niente indietro. Spento non costa nulla. */
  var DIAG = /[?&]wh_debug=1/.test(location.search);
  var MANCA = window.__WH_MANCA__ = [];
  var VISTI = {};
  var PARE_ITALIANO = new RegExp(
    '[\\u00e0\\u00e8\\u00e9\\u00ec\\u00f2\\u00f9]'                       // accenti: solo italiano
    + '|\\b(?:l|d|un|dell|nell|all|sull|dall|quell|c|s|n|m|t|v)[\'\\u2019]'      // elisioni: l\'alba, dell\'app
    + '|(?:^|[^A-Za-z\\u00c0-\\u00ff])(?:il|lo|gli|dello|della|dei|degli|delle|dalla|dai|nel|nella|nei|nelle'
    + '|sul|sulla|col|che|una|uno|questo|questa|quello|quella|questi|queste'
    + '|nessun|nessuna|nessuno|tutti|tutte|tutto|ogni|anche|senza|adesso|quando|oppure|invece|perche'
    + '|sono|siamo|hanno|essere|viene|vengono|deve|devi|puoi|manca|mancano|scegli|premi|tocca|clicca'
    + '|prima|ancora|almeno|soltanto|sempre|troppo|poco|quanto)(?![A-Za-z\\u00c0-\\u00ff])'
    + '|(?:zione|zioni|mento|menti|aggio|aggi)', 'i');
  function segnala(t, dove) {
    if (!DIAG || !t) return;
    var s = t.replace(/\s+/g, ' ').trim();
    if (s.length < 2 || VISTI[s] || !PARE_ITALIANO.test(s)) return;
    if (/^[\d\s.,:%\u00b0+\-\/()]*$/.test(s)) return;
    VISTI[s] = 1; MANCA.push({ t: s, dove: dove });
  }
  var MODELLI = (D.modelli || []).map(function (m) { return [new RegExp(m[0]), m[1]]; });
  var ESCL = (D.esclusi || []).join(',');           // selettori CSS da non tradurre mai
  var ATTR = ['placeholder', 'title', 'aria-label', 'alt', 'data-lab', 'data-titolo', 'data-testo', 'data-tip'];

  function trad(t) {
    var s = t.trim();
    if (!s) return null;
    var v = FRASI[s];
    if (v !== undefined) return v;
    for (var i = 0; i < MODELLI.length; i++) {
      if (!MODELLI[i][0].test(s)) continue;
      // «$1» rimette il pezzo com'era; «$*1» prova a tradurlo anche lui: serve per le code
      // composte al volo, tipo «azione 3: manca il dispositivo» (il numero resta, la frase cambia)
      var rep = MODELLI[i][1];
      return s.replace(MODELLI[i][0], function () {
        var g = arguments;
        return rep.replace(/\$(\*?)(\d)/g, function (_, stella, n) {
          var x = g[+n];
          if (x === undefined || x === null) return '';
          if (!stella || x.length >= s.length) return x;
          var w = tradPezzo(x);
          return w === null ? x : w;
        });
      });
    }
    return null;
  }

  function escluso(el) {
    if (!ESCL) return false;
    // closest() guarda l'elemento E tutti i suoi antenati: cosi' «non tradurre» protegge
    // anche il contenuto, non solo il contenitore (prima bastava che il testo lo scrivesse
    // il JavaScript dentro un ramo escluso per farlo tradurre lo stesso).
    try { return !!el.closest(ESCL); } catch (e) { return false; }
  }

  var BORDI = /^([\s«»\u201c\u201d"'(\[.,;:!?·]*)([\s\S]*?)([\s«»\u201c\u201d"'.,;:!?)\]·]*)$/;
  function tradPezzo(core) {
    // coda nota in fondo (es. «(prova, non eseguito)»): prima si stacca, poi si traduce la testa
    for (var y0 = 0; y0 < CODE.length; y0++) {
      var q0 = CODE[y0][0];
      if (core.length > q0.length + 1 && core.slice(-q0.length) === q0) {
        var t0 = core.slice(0, core.length - q0.length).replace(/\s+$/, '');
        var r0 = trad(t0);
        if (r0 === null) r0 = trad(t0.replace(/\s+/g, ' '));
        if (r0 !== null) return r0 + ' ' + CODE[y0][1];
      }
    }
    var v = trad(core);
    if (v !== null) return v;
    // testo su piu' righe (il registro delle automazioni): si traduce riga per riga
    if (core.indexOf('\n') >= 0) {
      var righe = core.split('\n'), cambiata = false;
      var tradotte = righe.map(function (r) {
        var t = r.trim(); if (!t) return r;
        var x = tradPezzo(t); if (x === null) return r;
        cambiata = true; return r.replace(t, x);
      });
      if (cambiata) return '' + tradotte.join('\n') + '';
    }
    var piatto = core.replace(/\s+/g, ' ');            // testo andato a capo nel file: una riga sola
    if (piatto !== core) { v = trad(piatto); if (v !== null) return v; }
    var m = core.match(BORDI);                       // riprova senza virgolette e punteggiatura ai bordi
    if (m && m[2] && (m[1] || m[3])) {
      var c = trad(m[2]);
      if (c === null) c = trad(m[2].replace(/\s+/g, ' '));
      if (c !== null) return m[1] + c + m[3];
      core = m[2];
    }
    // «Etichetta: valore» costruito al volo (Errore: xyz, Versione: 1.2): si traduce l'etichetta
    var due = core.replace(/\s+/g, ' ').indexOf(': ');
    if (due > 0) {
      var testa2 = core.replace(/\s+/g, ' ').slice(0, due + 1), coda2 = core.replace(/\s+/g, ' ').slice(due + 2);
      var t2 = trad(testa2);
      if (t2 === null) { var t2b = trad(testa2.slice(0, -1)); if (t2b !== null) t2 = t2b + ':'; }
      if (t2 !== null) { var c2 = trad(coda2); return (m ? m[1] : '') + t2 + ' ' + (c2 === null ? coda2 : c2) + (m ? m[3] : ''); }
    }
    // elenchi separati da virgola o da punto medio: se si traducono tutti i pezzi, si traduce
    var SEP = [', ', ' \u00b7 ', ' \u2014 '];
    for (var z = 0; z < SEP.length; z++) {
      var sp = core.replace(/\s+/g, ' ');
      if (sp.indexOf(SEP[z]) <= 0) continue;
      var pezzi = sp.split(SEP[z]), fuori = [], k;
      for (k = 0; k < pezzi.length; k++) { var p = trad(pezzi[k]); if (p === null) break; fuori.push(p); }
      if (k === pezzi.length) return (m ? m[1] : '') + fuori.join(SEP[z]) + (m ? m[3] : '');
    }
    return null;
  }

  function testo(n) {
    if (n.__whFatto === n.nodeValue) return;        // gia' tradotto da noi: non rientrare
    var raw = n.nodeValue, core = raw.trim();
    if (!core) return;
    // 1) regole che dipendono da cosa viene prima (es. «è» dopo un «non» in corsivo)
    for (var q = 0; q < CONTESTI.length; q++) {
      var r = CONTESTI[q];
      if (r.t !== raw) continue;
      var pr = n.previousElementSibling;
      if (r.dopo && (!pr || pr.tagName !== r.dopo)) continue;
      if (!r.dopo && pr) continue;
      n.nodeValue = r.v; n.__whFatto = r.v; return;
    }
    // 2) frase con gli spazi esattamente com'e' (serve a distinguere « è » da «è »)
    var esatta = FRASI[raw];
    if (esatta !== undefined) { n.nodeValue = esatta; n.__whFatto = esatta; return; }
    var v = tradPezzo(core);
    if (v === null) { segnala(core, 'testo'); return; }
    var nuovo = raw.slice(0, raw.indexOf(core)) + v + raw.slice(raw.indexOf(core) + core.length);
    n.nodeValue = nuovo; n.__whFatto = nuovo;
  }

  function attributi(el) {
    for (var i = 0; i < ATTR.length; i++) {
      var a = ATTR[i];
      if (!el.hasAttribute || !el.hasAttribute(a)) continue;
      var x = el.getAttribute(a), v = tradPezzo(x.trim());
      if (v !== null && v !== x) el.setAttribute(a, v);
      else if (v === null) segnala(x, a);
    }
  }

  // «Richiedi Licenza via Email»: oggetto e testo del messaggio stanno dentro un mailto:
  // in un onclick. Sono parole che il cliente legge nel suo programma di posta, quindi
  // si traducono; del resto dell'onclick (che e' codice) non si tocca niente.
  var MAILTO = /([?&](?:subject|body)=)([^'"&]+)/g;
  function posta(el) {
    if (!el.getAttribute) return;
    var s = el.getAttribute('onclick');
    if (!s || s.indexOf('mailto:') < 0) return;
    var v = s.replace(MAILTO, function (tutto, testa, pezzo) {
      var grezzo;
      try { grezzo = decodeURIComponent(pezzo); } catch (e) { grezzo = pezzo; }
      var x = tradPezzo(grezzo.trim());
      return x === null ? tutto : testa + x;
    });
    if (v !== s) el.setAttribute('onclick', v);
  }

  var MAI = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1, SVG: 1, TEMPLATE: 1 };
  function cammina(n) {
    if (!n) return;
    if (n.nodeType === 3) {                          // nodo di testo: si guarda chi lo contiene
      if (!n.parentElement || !escluso(n.parentElement)) testo(n);
      return;
    }
    if (n.nodeType !== 1) return;
    if (MAI[n.tagName]) {                            // codice e testo scritto dall'utente: mai
      // dentro non si entra, ma il placeholder e gli altri attributi visibili si traducono
      if (n.tagName === 'TEXTAREA' && !escluso(n)) attributi(n);
      return;
    }
    if (escluso(n)) return;                          // salta tutto il ramo
    attributi(n);
    posta(n);
    for (var c = n.firstChild; c; c = c.nextSibling) cammina(c);
  }

  // 1) quello che c'e' gia' (di solito poco: il testo fisso lo ha gia' tradotto il server)
  function primaPassata() {
    cammina(document.body);
    var t = trad(document.title); if (t !== null) document.title = t;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', primaPassata);
  else primaPassata();

  // 2) quello che il JavaScript aggiunge dopo: si guardano SOLO i nodi nuovi
  var oss = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'childList') { for (var j = 0; j < m.addedNodes.length; j++) cammina(m.addedNodes[j]); }
      else if (m.type === 'characterData') { var p = m.target.parentElement; if (p && !MAI[p.tagName] && !escluso(p)) testo(m.target); }
      else if (m.type === 'attributes' && m.target.nodeType === 1 && !escluso(m.target)) attributi(m.target);
    }
  });
  function avvia() {
    oss.observe(document.body, { childList: true, subtree: true, characterData: true,
                                 attributes: true, attributeFilter: ATTR });
  }
  if (document.body) avvia(); else document.addEventListener('DOMContentLoaded', avvia);

  // 3) i messaggi di sistema del browser (Elimina «X»? / Ci sono modifiche non salvate...)
  ['alert', 'confirm', 'prompt'].forEach(function (nome) {
    var orig = window[nome];
    if (typeof orig !== 'function') return;
    window[nome] = function (msg) {
      var v = (typeof msg === 'string') ? tradPezzo(String(msg).trim()) : null;
      if (v === null && typeof msg === 'string') segnala(msg, nome);
      var args = Array.prototype.slice.call(arguments);
      if (v !== null) args[0] = v;
      return orig.apply(window, args);
    };
  });

  // 4) a disposizione delle pagine, se un giorno servisse tradurre a mano
  window.WH_T = function (t) { var v = tradPezzo(String(t).trim()); return v === null ? t : v; };
  window.WH_LINGUA = D.lingua;
})();
