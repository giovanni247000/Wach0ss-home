/* ============================================================================
   CALENDARI - pagina dell'app (mobile.html, solo con l'integrazione Calendari attiva nello Store)
   04/10/2026. Caricato SOLO se calendari_attivo (script in mobile.html dentro {% if calendari_attivo %}).
   Si apre come una stanza (switchRoom('room-calendari')) dalla voce "Calendari" della barra o da /mobile#calendari.

   DATI (calendari.py, contratto in calendari/API.md): /api/calendari/info (oggi e ora DI CASA: mai l'orologio del
   telefono), /api/calendari (elenco con riassunto), /api/calendari/prossimi?giorni=2, /api/calendari/<id>/giorni?dal&al
   (griglia del mese anche a cavallo di due mesi), spunta, eventi, rifiuti, persone.
   NESSUN LAVORO A SEZIONE CHIUSA: niente richieste ne' timer finche' la sezione non e' aperta; aperta, si rilegge ogni
   2 minuti solo con la scheda visibile (spunte delle altre persone, cambio di giorno).
   TESTI: la sezione e i fogli sono data-no-tr (nomi dei calendari, titoli e note sono del cliente): le frasi fisse
   passano da T() -> window.WH_T (en.json, per_pagina['/mobile']); le parole brevi ambigue hanno una chiave propria
   (CHIAVI). Popup: chiedi()/avvisa() di static/popup.js (mai confirm/alert: nella WebView iOS non compaiono).
   ANIMAZIONI: solo transform/opacity (entrata dei pannelli, foglio che sale, cambio di mese); niente in Modalita'
   leggera (html.wh-leggera) ne' con prefers-reduced-motion.
   SENZA SFARFALLIO (05/10/2026, vedi disegna): #cal-in non si rifa' piu' con innerHTML ma si aggiorna (solo attributi e
   testi cambiati, tessere e pannelli riconosciuti da data-k); l'entrata solo sui pannelli nuovi della prima apertura e
   dell'apertura di un calendario; tornando all'elenco (e riaprendo la sezione) le tessere compaiono subito, ferme, e
   l'elenco torna allo scorrimento di prima.
   SENZA SALTI (05/10/2026 sera, 2026-10-05b, vedi primaDelCambio/dopoIlCambio): in un aggiornamento della stessa vista
   lo scorrimento resta fermo sul primo pannello visibile, i pannelli spostati scivolano al posto nuovo (transform .25 s)
   e le righe nuove dei Prossimi (ora con chiave data-k) entrano con una breve opacita'; in leggera solo l'ancoraggio.
   CHI LO VEDE (04/10 sera): ogni calendario ha accesso {modo: tutti|privato|persone, utenti} e, per chi chiede,
   modificabile e creato_da_nome (calendari.py 2026-10-04c). Lucchetto (privato) o persone (scelte) sulla tessera e
   nella testata; "Creato da" quando non e' tuo; tasto Modifica solo se modificabile. Nel foglio Crea/Modifica la scelta
   Tutti / Solo io / Persone scelte (righe da 52 px da spuntare col dito; chi l'ha creato sempre dentro): "Chi avvisare"
   mostra solo chi ha accesso e Telegram/Sonos (canali di tutta la casa) si spengono come proposta, con l'avviso se li
   si riaccende. Calendario sparito (accesso tolto, cancellato) = 404 non_trovato: si torna all'elenco con un toast,
   mai un popup d'errore. S.info.persone resta SEMPRE l'elenco di tutti gli utenti (serve alle scelte): i dati di un
   calendario portano solo le persone con accesso e da li' si prendono solo i colori.
   CORREZIONI (04/10 notte, calendari.py 2026-10-04d): "Chi avvisare" manda SEMPRE telegram/sonos per i calendari non di
   tutti (anche col canale spento nella card: il valore salvato, o false); il colore preso si guarda su TUTTI gli utenti
   (il server rifiuta un colore di chiunque); infoAccesso(): oltre 3 persone "Tu, anna e altri 2" (elenco intero nel
   title e al tocco del chip in testata), "Solo tu" col lucchetto se fra gli utenti esistenti resti solo tu, "e gli
   amministratori" quando chi l'ha creato non c'e' piu' (lo vedono anche loro, per gestirlo).
   ============================================================================ */
(function () {
    'use strict';
    var root = document.getElementById('room-calendari');
    if (!root || window.__whCalendari) return;
    var inn = document.getElementById('cal-in');
    var html = document.documentElement;
    var LINGUA = (window.WH_LINGUA || html.getAttribute('lang') || 'it').slice(0, 2);
    var EN = LINGUA === 'en';
    var ridotto = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    function leggera() { return html.classList.contains('wh-leggera') || ridotto; }

    /* ======================================================================
       TESTI
       ====================================================================== */
    // chiave nel dizionario: le parole singole hanno sempre il suffisso " (calendari)" (in per_pagina['/mobile'] varrebbero
    // per tutta la pagina e cambierebbero altre traduzioni: Ora, Nota, Tipo...); qui le frasi che ne servono una propria
    var CHIAVI = { 'Ogni settimana': 'Ogni settimana (ripeti)', 'Ogni mese': 'Ogni mese (ripeti)', 'Ogni anno': 'Ogni anno (ripeti)' };
    // Le frasi inglesi della pagina NON stanno nel dizionario in linea di /mobile (peserebbero sull'HTML anche a integrazione
    // spenta): arrivano da /api/calendari/frasi (en.json per_pagina['/api/calendari/frasi']) quando la sezione si apre.
    var DIZ = null, frasiChieste = !EN;
    function T(s, v) {
        var r = s;
        if (EN) {
            var k = CHIAVI[s] || (/^[^\s{]+$/.test(s) ? s + ' (calendari)' : s), x = k;
            if (DIZ && Object.prototype.hasOwnProperty.call(DIZ, k)) x = DIZ[k];
            else if (typeof window.WH_T === 'function') x = window.WH_T(k);
            if (typeof x === 'string' && x !== k) r = x;
        }
        return v ? r.replace(/\{(\w+)\}/g, function (_, n) { return v[n] !== undefined ? v[n] : ''; }) : r;
    }
    var MESI = EN ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                  : ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    var MESI_B = EN ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                    : ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
    var GIORNI = EN ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                    : ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
    var GIORNI_B = EN ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
    var GIORNI_1 = EN ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
    function maiu(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
    var NOME_TIPO = { spunta: 'Spunta i giorni', agenda: 'Agenda con promemoria', rifiuti: 'Raccolta rifiuti' };
    var NOME_BREVE = { spunta: 'Spunta i giorni', agenda: 'Agenda', rifiuti: 'Raccolta rifiuti' };   // testata e tessere (non si tagliano)
    var DESC_TIPO = { spunta: 'Abitudini da segnare ogni giorno: ognuno spunta i suoi',
                      agenda: 'Impegni scritti nei giorni, con promemoria',
                      rifiuti: 'Il calendario del comune e l\'avviso la sera prima' };
    var ICONA_TIPO = { spunta: 'calendar-check', agenda: 'calendar-clock', rifiuti: 'recycle' };
    var COLORI = ['#30D158', '#0A84FF', '#FF9F0A', '#FF453A', '#BF5AF2', '#64D2FF', '#FF375F', '#FFD60A', '#5E5CE6', '#AC8E68', '#8B5E3C', '#8E8E93'];
    var ICONE = ['calendar-check', 'calendar-clock', 'calendar-days', 'recycle', 'trash-2', 'leaf', 'pill', 'dumbbell', 'droplet', 'book-open', 'footprints',
                 'heart', 'bike', 'dog', 'stethoscope', 'cake', 'briefcase', 'star', 'music', 'baby', 'sprout', 'coffee', 'moon', 'apple'];

    /* ======================================================================
       UTILITA'
       ====================================================================== */
    function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function colore(c) { return /^#[0-9A-Fa-f]{6}$/.test(c || '') ? c : '#8E8E93'; }
    function icona(n) { return /^[a-z0-9-]{1,40}$/.test(n || '') ? n : 'calendar-days'; }
    function due(n) { return (n < 10 ? '0' : '') + n; }
    function dataD(s) { var p = String(s).split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
    function isoD(d) { return d.getUTCFullYear() + '-' + due(d.getUTCMonth() + 1) + '-' + due(d.getUTCDate()); }
    function piuGiorni(s, n) { var d = dataD(s); d.setUTCDate(d.getUTCDate() + n); return isoD(d); }
    function dow(s) { return (dataD(s).getUTCDay() + 6) % 7; }      // 0 = lunedi'
    function lunedi(s) { return piuGiorni(s, -dow(s)); }
    function giornoLungo(s) { var d = dataD(s); return maiu(EN ? GIORNI[dow(s)] + ' ' + d.getUTCDate() + ' ' + MESI[d.getUTCMonth()] : GIORNI[dow(s)] + ' ' + d.getUTCDate() + ' ' + MESI[d.getUTCMonth()]); }
    function giornoBreve(s) {
        if (S.info && s === S.info.oggi) return T('Oggi');
        if (S.info && s === piuGiorni(S.info.oggi, 1)) return T('Domani');
        var d = dataD(s); return maiu(GIORNI_B[dow(s)]) + ' ' + d.getUTCDate() + ' ' + MESI_B[d.getUTCMonth()];
    }
    function dataCompleta(s) { var d = dataD(s); return d.getUTCDate() + ' ' + MESI[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
    function titoloMese(a, m) { return maiu(MESI[m - 1]) + ' ' + a; }
    function elenco(nomi) { nomi = nomi.filter(Boolean); return nomi.length <= 1 ? nomi.join('') : T('{a} e {b}', { a: nomi.slice(0, -1).join(', '), b: nomi[nomi.length - 1] }); }
    function icone(el) { if (el && typeof lucide !== 'undefined' && lucide && lucide.createIcons) { try { lucide.createIcons({ root: el }); } catch (e) { /* icone non essenziali */ } } }
    function I(n, cls) { return '<i data-lucide="' + icona(n) + '"' + (cls ? ' class="' + cls + '"' : '') + '></i>'; }
    function toast(t) { if (typeof window.hkToast === 'function') window.hkToast(t); }
    function avviso(t) { if (typeof window.avvisa === 'function') return window.avvisa(t, { titolo: T('Calendari') }); toast(t); return Promise.resolve(); }
    function domanda(t, o) { return typeof window.chiedi === 'function' ? window.chiedi(t, o || {}) : Promise.resolve(false); }
    function persona(id) { var p = (S.info && S.info.persone || []).filter(function (x) { return x.id === id; })[0]; return p || { id: id, nome: '?', colore: '#8E8E93' }; }
    /* chi lo vede */
    function mioId() { return S.info && S.info.io ? S.info.io.id : null; }
    function accesso(c) { var a = c && c.accesso; return a && a.modo ? a : { modo: 'tutti', utenti: [] }; }
    function esiste(id) { return (S.info && S.info.persone || []).some(function (x) { return x.id === id; }); }
    function nomeCreatore(c) { return c && c.creato_da_nome ? c.creato_da_nome : T('un utente eliminato'); }
    function mio(c) { return !c || c.creato_da === mioId(); }
    function orfano(c) { return !!c && !esiste(c.creato_da); }   // chi l'ha creato non c'e' piu': lo vedono gli amministratori
    // chi lo vede, per la tessera e la testata: null per i calendari di tutti; {ico, corto (tessera), breve (testata),
    // intero (title, aria-label, tocco sul chip)}. Contano solo gli
    // utenti che esistono: se resti solo tu e' "Solo tu" (lucchetto) anche a persone scelte
    function infoAccesso(c) {
        var a = accesso(c); if (a.modo === 'tutti') return null;
        var me = mioId(), orf = orfano(c), chi = [];
        (a.modo === 'persone' ? (a.utenti || []) : []).concat([c.creato_da]).forEach(function (id) { if (esiste(id) && chi.indexOf(id) < 0) chi.push(id); });
        var peso = function (id) { return id === me ? 0 : id === c.creato_da ? 1 : 2; };   // tu, poi chi l'ha creato, poi gli altri
        chi.sort(function (x, y) { return peso(x) - peso(y) || x - y; });
        var nomi = chi.map(function (id) { return id === me ? T('tu') : persona(id).nome; });
        if (orf) nomi.push(T('gli amministratori'));
        if (nomi.length === 1) {
            var solo = orf ? T('Solo gli amministratori') : chi[0] === me ? T('Solo tu') : T('Solo {n}', { n: nomi[0] });
            return { ico: 'lock', corto: solo, breve: solo, intero: solo };
        }
        var intero = maiu(elenco(nomi));
        return { ico: 'users', intero: intero, breve: nomi.length > 3 ? maiu(T('{a} e altri {n}', { a: nomi.slice(0, 2).join(', '), n: nomi.length - 2 })) : intero,
                 corto: nomi.length > 2 ? maiu(T('{a} e altri {n}', { a: nomi[0], n: nomi.length - 1 })) : intero };
    }
    function opzioniOre(passo, da, a, scelta, prime) {
        var o = prime || '', trovata = false;
        for (var m = da * 60; m <= a * 60 + 59; m += passo) {
            var v = due(Math.floor(m / 60)) + ':' + due(m % 60);
            if (v === scelta) trovata = true;
            o += '<option value="' + v + '"' + (v === scelta ? ' selected' : '') + '>' + v + '</option>';
        }
        if (scelta && !trovata) o += '<option value="' + esc(scelta) + '" selected>' + esc(scelta) + '</option>';
        return o;
    }

    /* ======================================================================
       RETE
       ====================================================================== */
    function api(metodo, url, corpo) {
        var o = { method: metodo, credentials: 'same-origin', cache: 'no-store', headers: { 'Accept': 'application/json' } };
        if (corpo !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(corpo); }
        return fetch(url, o).then(function (r) {
            return r.json().catch(function () { return null; }).then(function (j) {
                if (!j) throw { message: r.redirected || r.status === 401 ? T('Sessione scaduta: ricarica la pagina') : T('Nessuna risposta dal server'), http: r.status };
                if (!r.ok || j.status === 'error') throw { message: j.message || j.error || T('Operazione non riuscita'), codice: j.codice, http: r.status };
                return j;
            });
        }, function () { throw { message: T('Nessuna risposta dal server'), http: 0 }; });
    }
    function errore(e) {
        if (e && e.codice === 'inattivo') { S.inattivo = true; disegna(); return; }
        if (e && e.codice === 'non_trovato') { sparito(e); return; }
        avviso((e && e.message) || T('Operazione non riuscita'));
    }
    // calendario o impegno che non c'e' piu' (cancellato, o l'accesso e' stato tolto): niente popup d'errore, si
    // rilegge tutto; se era il calendario aperto si torna all'elenco (cosi' non si riprova all'infinito)
    function sparito(e, calId) {
        chiudiFoglio();
        if (calId) {
            S.calendari = S.calendari.filter(function (x) { return x.id !== calId; });
            if (S.cal === calId) { S.vista = 'elenco'; S.dati = null; }
            disegna(false);
            toast(T('Questo calendario non è più disponibile'));
            caricaTutto(true);
            return;
        }
        // impegno sparito, o il calendario aperto: se la rilettura toglie il calendario lo dice lei (un toast solo)
        S.avvisato = false;
        caricaTutto(true).then(function () { if (!S.avvisato) toast((e && e.message) || T('Operazione non riuscita')); });
    }

    /* ======================================================================
       STATO
       ====================================================================== */
    var S = { info: null, calendari: [], prossimi: [], vista: 'elenco', cal: null, anno: 0, mese: 0, dati: null, sel: null,
              inattivo: false, errore: '', carico: false, tCarico: 0, giro: 0, yElenco: null };
    function calDi(id) { return S.calendari.filter(function (c) { return c.id === id; })[0] || null; }

    function caricaTutto(silenzioso) {
        var g = ++S.giro;
        return Promise.all([api('GET', '/api/calendari/info'), api('GET', '/api/calendari').catch(function (e) { return e; }),
                            api('GET', '/api/calendari/prossimi?giorni=2').catch(function (e) { return e; })])
            .then(function (r) {
                if (g !== S.giro) return;
                var vecchioOggi = S.info && S.info.oggi;
                S.info = r[0]; S.errore = ''; S.carico = true; S.tCarico = Date.now();
                S.inattivo = !r[0].attivo || (r[1] && r[1].codice === 'inattivo');
                if (r[1] && r[1].status === 'success') S.calendari = r[1].calendari || [];
                if (r[2] && r[2].status === 'success') S.prossimi = r[2].prossimi || [];
                if (!S.anno || (vecchioOggi && vecchioOggi !== S.info.oggi && S.vista === 'elenco')) { S.anno = +S.info.oggi.slice(0, 4); S.mese = +S.info.oggi.slice(5, 7); }
                if (S.vista === 'cal' && !calDi(S.cal)) { S.vista = 'elenco'; S.dati = null; S.avvisato = true; toast(T('Questo calendario non è più disponibile')); chiudiFoglio(); }
                if (S.vista === 'cal' && !S.inattivo) return caricaMese(!silenzioso);
                disegna(!silenzioso);
            })
            .catch(function (e) {
                if (g !== S.giro) return;
                S.errore = (e && e.message) || T('Nessuna risposta dal server');
                if (!S.carico) disegna(true);
                else if (!silenzioso) toast(S.errore);
            });
    }
    function griglia(a, m) {
        var primo = a + '-' + due(m) + '-01', ultimo = isoD(new Date(Date.UTC(a, m, 0)));
        return { dal: lunedi(primo), al: piuGiorni(lunedi(ultimo), 6), primo: primo, ultimo: ultimo };
    }
    function caricaMese(entrata, verso) {
        var c = calDi(S.cal); if (!c) { S.vista = 'elenco'; disegna(); return Promise.resolve(); }
        var gr = griglia(S.anno, S.mese), g = ++S.giro;
        return api('GET', '/api/calendari/' + c.id + '/giorni?dal=' + gr.dal + '&al=' + gr.al + '&anno=' + S.anno + '&mese=' + S.mese)
            .then(function (j) {
                if (g !== S.giro) return;
                S.dati = j; colori(j.persone);
                if (j.calendario) { for (var i = 0; i < S.calendari.length; i++) if (S.calendari[i].id === j.calendario.id) { j.calendario.riassunto = S.calendari[i].riassunto; S.calendari[i] = j.calendario; } }
                disegna(entrata, verso);
            })
            .catch(function (e) { if (g !== S.giro) return; if (e && e.codice === 'non_trovato') sparito(e, c.id); else errore(e); });
    }
    // i dati di un calendario hanno solo le persone con accesso: da li' si prendono i colori, l'elenco resta di tutti
    function colori(lista) {
        if (!lista || !S.info) return;
        lista.forEach(function (p) { var q = (S.info.persone || []).filter(function (x) { return x.id === p.id; })[0]; if (q) q.colore = p.colore; else S.info.persone.push(p); });
    }

    /* ======================================================================
       DISEGNO
       ====================================================================== */
    /* SENZA SFARFALLIO (05/10/2026). Prima ogni disegna() rifaceva #cal-in con innerHTML e l'entrata era una classe sul
       contenitore (.cal-anima > *): tornando all'elenco si disegnava con l'entrata e, ~100-300 ms dopo, la rilettura
       (caricaTutto) rifaceva tutto da capo con la classe ancora su -> le tessere, a meta' dissolvenza, tornavano a
       opacita' 0 e ripartivano (lo sfarfallio segnalato); lo stesso alla riapertura della sezione dopo 20 s, e ogni
       rilettura (spunta, foglio salvato, ritorno sulla scheda, cambio mese) ricreava tutti i pannelli di vetro.
       Ora: l'HTML nuovo si costruisce fuori pagina (icone comprese) e #cal-in si AGGIORNA (figli()): i nodi uguali restano
       quelli di prima, di quelli cambiati si cambiano solo attributi e testi; le tessere e i pannelli si riconoscono dalla
       chiave data-k (tessera = id del calendario). L'animazione d'entrata (cal-entra) va solo sui pannelli NUOVI di un
       disegno con entrata (prima apertura, apertura di un calendario): un pannello che c'e' gia' non riparte mai.
       Le classi passeggere (entrata, giorno spuntato, cambio di mese) restano finche' la loro animazione finisce. */
    var PASSEGGERE = ['cal-entra', 'cal-pop', 'cal-da-dx', 'cal-da-sx', 'cal-nuova'];
    function chiave(n) { return n.nodeType === 1 ? n.getAttribute('data-k') : null; }
    function attributi(v, n) {
        var a = n.attributes, i, x;
        for (i = 0; i < a.length; i++) { x = a[i]; if (x.name !== 'class' && v.getAttribute(x.name) !== x.value) v.setAttribute(x.name, x.value); }
        for (i = v.attributes.length - 1; i >= 0; i--) { x = v.attributes[i].name; if (x !== 'class' && !n.hasAttribute(x)) v.removeAttribute(x); }
        var cls = n.getAttribute('class') || '', parti = cls ? cls.split(' ') : [];
        PASSEGGERE.forEach(function (t) { if (v.classList.contains(t) && parti.indexOf(t) < 0) parti.push(t); });
        cls = parti.join(' ');
        if ((v.getAttribute('class') || '') !== cls) { if (cls) v.setAttribute('class', cls); else v.removeAttribute('class'); }
    }
    function morfa(v, n) {   // v: nodo della pagina, n: nodo nuovo dello stesso tipo
        if (v.nodeType !== 1) { if (v.nodeValue !== n.nodeValue) v.nodeValue = n.nodeValue; return; }
        if (v.isEqualNode(n)) return;
        attributi(v, n);
        figli(v, n);
    }
    // porta i figli di 'par' (pagina) a essere quelli di 'np' (nuovo): con chiave si cercano per chiave, senza si prende il
    // nodo nella stessa posizione se e' dello stesso tag; quelli che non servono piu' si tolgono. Rende i nodi NUOVI.
    function figli(par, np) {
        var vecchi = {}, x, k, pos, creati = [];
        for (x = par.firstChild; x; x = x.nextSibling) { k = chiave(x); if (k) vecchi[k] = x; }
        pos = par.firstChild;
        [].slice.call(np.childNodes).forEach(function (n) {
            var kn = chiave(n), m = null;
            if (kn) { m = vecchi[kn] || null; if (m && m.nodeName !== n.nodeName) m = null; if (m) delete vecchi[kn]; }
            else if (pos && !chiave(pos) && pos.nodeName === n.nodeName) m = pos;
            if (m) { if (m === pos) pos = pos.nextSibling; else par.insertBefore(m, pos); morfa(m, n); }
            else { par.insertBefore(n, pos); creati.push(n); }
        });
        while (pos) { x = pos.nextSibling; par.removeChild(pos); pos = x; }
        return creati;
    }
    // la pagina scorre in #app-wrapper (mobile.html), non nella finestra: prima window.scrollTo(0, 0) all'apertura di un
    // calendario non faceva niente (si apriva a meta', con lo scorrimento dell'elenco). Salto secco, senza la scorrevolezza
    // (scroll-behavior: smooth) di #app-wrapper: e' un cambio di vista, non uno scorrimento da guardare.
    function scorritore() { return document.getElementById('app-wrapper') || document.scrollingElement || html; }
    function scorri(y) { var w = scorritore(), b = w.style.scrollBehavior; w.style.scrollBehavior = 'auto'; w.scrollTop = y; w.style.scrollBehavior = b; }
    function rianima(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
    // fine di un'animazione passeggera: la classe si toglie (il nodo resta, la prossima volta riparte da capo)
    inn.addEventListener('animationend', function (e) {
        PASSEGGERE.forEach(function (t) { var el = e.target.closest ? e.target.closest('.' + t) : null; if (el && inn.contains(el) && (el === e.target || t === 'cal-pop')) el.classList.remove(t); });
    });
    /* SENZA SALTI (05/10/2026 sera). Un aggiornamento della STESSA vista (la rilettura dopo il ritorno all'elenco, una
       spunta, un foglio salvato, il ritorno sulla scheda) puo' cambiare l'altezza di un pannello: se un altro utente ha
       aggiunto un impegno di oggi, la riga nuova dei Prossimi spingeva giu' di colpo tutte le tessere (+58 px in un
       fotogramma a 390 px). Ora:
       - lo scorrimento resta fermo sul primo pannello visibile (come lo scroll anchoring di Chrome, che Safari/WKWebView
         non hanno): se il cambio e' sopra lo schermo, quel che si guarda non si muove; durante l'aggiornamento
         l'ancoraggio del browser e' spento (overflow-anchor) perche' non si sommi a questo;
       - (FLIP) i pannelli che si spostano partono da dove erano e scivolano al posto nuovo: solo transform, .25 s;
       - le righe nuove dei Prossimi entrano con una breve opacita' (cal-nuova).
       In Modalita' leggera e con reduced-motion solo l'ancoraggio dello scorrimento, niente movimento. */
    var giroFlip = 0;
    function primaDelCambio() {
        var w = scorritore(), alto = (w === html || w === document.body || w === document.scrollingElement) ? 0 : w.getBoundingClientRect().top;
        var pos = [], ancora = null, prox = inn.querySelector('[data-k="prossimi"]'), righe = [];
        [].forEach.call(inn.querySelectorAll('[data-k]'), function (el) {
            var r = el.getBoundingClientRect();
            pos.push([el, r.top]);
            if (!ancora && r.height > 0 && r.top >= alto - 0.5 && r.top < alto + w.clientHeight) ancora = [el, r.top];
        });
        if (prox) righe = [].slice.call(prox.querySelectorAll('[data-k]'));
        var oa = w.style.overflowAnchor; w.style.overflowAnchor = 'none';
        return { w: w, oa: oa, pos: pos, ancora: ancora, prox: prox, righe: righe };
    }
    function dopoIlCambio(p) {
        var w = p.w;
        if (p.ancora && p.ancora[0].isConnected) {
            var d = p.ancora[0].getBoundingClientRect().top - p.ancora[1];
            if (Math.abs(d) >= 1) scorri(w.scrollTop + d);
        }
        requestAnimationFrame(function () { w.style.overflowAnchor = p.oa; });
        if (leggera()) return;
        var mossi = [], giro = ++giroFlip;
        p.pos.forEach(function (x) {
            var el = x[0];
            if (!el.isConnected || PASSEGGERE.some(function (t) { return el.classList.contains(t); })) return;
            // il rettangolo comprende gia' lo spostamento dato al pannello che lo contiene: chi si muove con lui resta fermo
            var d = x[1] - el.getBoundingClientRect().top;
            if (Math.abs(d) < 2) return;
            el.style.transition = 'none'; el.style.transform = 'translateY(' + Math.round(d) + 'px)';
            el.__calFlip = giro; mossi.push(el);
        });
        if (p.prox && p.prox.isConnected) {
            [].forEach.call(p.prox.querySelectorAll('[data-k]'), function (el) { if (p.righe.indexOf(el) < 0) rianima(el, 'cal-nuova'); });
            setTimeout(function () { [].forEach.call(inn.querySelectorAll('.cal-nuova'), function (el) { el.classList.remove('cal-nuova'); }); }, 450);
        }
        if (!mossi.length) return;
        void inn.offsetWidth;
        requestAnimationFrame(function () {
            mossi.forEach(function (el) { if (el.__calFlip === giro) { el.style.transition = 'transform .25s var(--cal-curva)'; el.style.transform = ''; } });
            setTimeout(function () { mossi.forEach(function (el) { if (el.__calFlip === giro) { el.style.transition = ''; el.__calFlip = 0; } }); }, 320);
        });
    }
    var tEntrata = 0, tVerso = 0, vistaFatta = '';
    function disegna(entrata, verso) {
        var h, vista = 'elenco';
        if (S.inattivo) { vista = 'inattivo'; h = testata() + '<section class="cal-pan cal-vuoto" data-k="inattivo">' + I('calendar-x-2') + '<h3>' + esc(T('L\'integrazione Calendari non e\' attiva')) + '</h3><p>' + esc(T('Si attiva dallo Store delle integrazioni. I calendari restano salvati.')) + '</p></section>'; }
        else if (!S.carico) { vista = 'attesa'; h = testata() + '<section class="cal-pan cal-vuoto" data-k="' + (S.errore ? 'errore' : 'attesa') + '">' + (S.errore ? I('wifi-off') + '<h3>' + esc(S.errore) + '</h3><button type="button" class="cal-btn" data-az="riprova">' + I('refresh-cw') + '<span>' + esc(T('Riprova')) + '</span></button>' : '<div class="cal-attesa"></div><p>' + esc(T('Caricamento…')) + '</p>') + '</section>'; }
        else if (S.vista === 'cal' && calDi(S.cal) && S.dati) { vista = 'cal' + S.cal; h = vistaCal(calDi(S.cal)); }
        else h = vistaElenco();
        var nuovo = document.createElement('div');
        nuovo.innerHTML = h;
        icone(nuovo);                       // icone gia' fatte fuori pagina: si confrontano svg con svg
        var misura = (vista === vistaFatta && root.classList.contains('active')) ? primaDelCambio() : null;   // stessa vista: senza salti
        var creati = figli(inn, nuovo);
        // cambio di vista: il calendario si apre dall'alto, l'elenco torna dove era (adesso, non al tocco: niente salti)
        if (vista !== vistaFatta) {
            if (vista.slice(0, 3) === 'cal') scorri(0);
            else if (vista === 'elenco' && vistaFatta.slice(0, 3) === 'cal' && S.yElenco !== null) { scorri(S.yElenco); S.yElenco = null; }
            vistaFatta = vista;
        } else if (misura) dopoIlCambio(misura);
        if (entrata && !leggera() && creati.length) {
            creati.forEach(function (n) { if (n.nodeType === 1) rianima(n, 'cal-entra'); });
            clearTimeout(tEntrata); tEntrata = setTimeout(function () { [].forEach.call(inn.querySelectorAll(':scope > .cal-entra'), function (n) { n.classList.remove('cal-entra'); }); }, 900);
        }
        if (verso && !leggera()) {
            var gr = document.getElementById('cal-giorni');
            if (gr) {
                gr.classList.remove('cal-da-dx', 'cal-da-sx'); rianima(gr, verso > 0 ? 'cal-da-dx' : 'cal-da-sx');
                clearTimeout(tVerso); tVerso = setTimeout(function () { gr.classList.remove('cal-da-dx', 'cal-da-sx'); }, 400);
            }
        }
    }
    function testata(sotto) {
        var oggi = S.info ? giornoLungo(S.info.oggi) : '';
        return '<header class="cal-testa" data-k="testa"><div class="cal-testa-txt"><div class="cal-eyebrow">' + I('calendar-days', 'cal-ic') + '<span>' + esc(oggi) + '</span></div>' +
               '<h1 class="cal-titolo">' + esc(T('Calendari')) + '</h1></div>' + (sotto || '') + '</header>';
    }

    /* ---------------------------------------------------------------- elenco */
    function vistaElenco() {
        var nuovo = '<button type="button" class="cal-btn cal-btn-pri" data-az="nuovo">' + I('plus') + '<span>' + esc(T('Nuovo calendario')) + '</span></button>';
        var h = testata(nuovo);
        if (!S.calendari.length) {
            return h + '<section class="cal-pan cal-vuoto cal-primo" data-k="primo">' + I('calendar-plus') + '<h3>' + esc(T('Nessun calendario')) + '</h3>' +
                '<p>' + esc(T('Crea il primo: spunta i giorni, agenda con promemoria o raccolta rifiuti.')) + '</p>' +
                '<div class="cal-tipi-vuoto">' + ['spunta', 'agenda', 'rifiuti'].map(function (t) {
                    return '<button type="button" class="cal-tipo-scelta" data-az="nuovo" data-tipo="' + t + '"><span class="cal-tile-ico" style="--c:' + ({ spunta: '#30D158', agenda: '#0A84FF', rifiuti: '#8E8E93' })[t] + '">' + I(ICONA_TIPO[t]) + '</span>' +
                        '<span class="cal-tipo-txt"><b>' + esc(T(NOME_TIPO[t])) + '</b><small>' + esc(T(DESC_TIPO[t])) + '</small></span></button>';
                }).join('') + '</div></section>';
        }
        return h + '<div class="cal-el" data-k="elenco">' + pannelloProssimi() + '<section class="cal-tiles" data-k="tessere" aria-label="' + esc(T('Calendari')) + '">' + S.calendari.map(tile).join('') + '</section></div>';
    }
    function pannelloProssimi() {
        var oggi = S.info.oggi, domani = piuGiorni(oggi, 1);
        var voci = S.prossimi.filter(function (p) { return p.tipo === 'agenda' ? (p.giorno === oggi || p.giorno === domani) : p.giorno === domani; });
        var h = '<section class="cal-pan cal-prossimi" data-k="prossimi"><div class="cal-pan-testa"><div class="cal-eyebrow">' + I('bell', 'cal-ic') + '<span>' + esc(T('Prossimi')) + '</span></div><span class="cal-nota-dx">' + esc(T('oggi e domani')) + '</span></div>';
        if (!voci.length) return h + '<div class="cal-prox-vuoto" data-k="vuoto">' + I('sun') + '<span>' + esc(T('Niente in programma per oggi e domani')) + '</span></div></section>';
        var gruppi = [[oggi, T('Oggi')], [domani, T('Domani')]], viste = {};
        // chiavi (05/10 sera): una riga nuova entra al suo posto e le altre restano gli stessi nodi (senza, si riconoscevano
        // per posizione e una riga aggiunta in mezzo riscriveva tutte quelle sotto)
        function kRiga(p) { var k = 'r' + [p.tipo, p.calendario_id, p.giorno, p.ora || '', p.titolo].join('|'); viste[k] = (viste[k] || 0) + 1; return esc(viste[k] > 1 ? k + '#' + viste[k] : k); }
        gruppi.forEach(function (g) {
            var del = voci.filter(function (p) { return p.giorno === g[0]; });
            if (!del.length) return;
            h += '<div class="cal-prox-g" data-k="g' + g[0] + '">' + esc(g[1]) + '</div><ul class="cal-prox" data-k="u' + g[0] + '">';
            del.forEach(function (p) {
                if (p.tipo === 'rifiuti') {
                    h += '<li data-k="' + kRiga(p) + '"><button type="button" class="cal-prox-v" data-az="apri" data-id="' + p.calendario_id + '" data-g="' + p.giorno + '" style="--c:' + colore(p.colore) + '">' +
                        '<span class="cal-prox-ora cal-prox-pall">' + (p.raccolte || []).map(function (r) { return '<i style="--c:' + colore(r.colore) + '"></i>'; }).join('') + '</span>' +
                        '<span class="cal-prox-t"><b>' + esc(p.titolo) + '</b><small>' + esc(p.calendario) + ' · ' + esc(T('da portare fuori stasera')) + '</small></span></button></li>';
                } else {
                    h += '<li data-k="' + kRiga(p) + '"><button type="button" class="cal-prox-v" data-az="apri" data-id="' + p.calendario_id + '" data-g="' + p.giorno + '" style="--c:' + colore(p.colore) + '">' +
                        '<span class="cal-prox-ora">' + (p.ora ? esc(p.ora) : '<small>' + esc(T('tutto il giorno')) + '</small>') + '</span>' +
                        '<span class="cal-prox-t"><b>' + esc(p.titolo) + '</b><small>' + esc(p.calendario) + '</small></span></button></li>';
                }
            });
            h += '</ul>';
        });
        return h + '</section>';
    }
    function tile(c) {
        var r = c.riassunto || {}, riga = '', extra = '', col = colore(c.colore);
        if (c.tipo === 'spunta') {
            riga = '<span class="cal-tile-stat"><b>' + (r.serie || 0) + '</b> ' + esc(r.serie === 1 ? T('giorno di fila') : T('giorni di fila')) + '</span><span class="cal-tile-stat"><b>' + (r.percentuale || 0) + '%</b> ' + esc(T('nel mese')) + '</span>';
            extra = '<button type="button" class="cal-spunta-rapida' + (r.fatto_oggi ? ' cal-on' : '') + '" data-az="spunta-oggi" data-id="' + c.id + '" aria-pressed="' + (r.fatto_oggi ? 'true' : 'false') + '" aria-label="' + esc(r.fatto_oggi ? T('Fatto oggi') : T('Segna oggi')) + '">' + I('check') + '</button>';
            riga = '<span class="cal-tile-sotto">' + esc(r.fatto_oggi ? T('Fatto oggi') : T('Da fare oggi')) + '</span><span class="cal-tile-stats">' + riga + '</span>';
        } else if (c.tipo === 'agenda') {
            var p = (r.prossimi || [])[0];
            riga = p ? '<span class="cal-tile-sotto">' + esc(giornoBreve(p.giorno) + (p.ora ? ' · ' + p.ora : '')) + '</span><span class="cal-tile-prox">' + esc(p.titolo) + '</span>'
                     : '<span class="cal-tile-sotto">' + esc(T('Nessun impegno in arrivo')) + '</span>';
        } else {
            var domani = piuGiorni(S.info.oggi, 1);
            var pr = S.prossimi.filter(function (x) { return x.tipo === 'rifiuti' && x.calendario_id === c.id && x.giorno === domani; })[0];
            riga = pr ? '<span class="cal-tile-sotto">' + esc(T('Domani')) + '</span><span class="cal-tile-prox"><span class="cal-pall-inl">' + (pr.raccolte || []).map(function (x) { return '<i style="--c:' + colore(x.colore) + '"></i>'; }).join('') + '</span>' + esc(pr.titolo) + '</span>'
                      : '<span class="cal-tile-sotto">' + esc(r.tipi ? T('Domani nessuna raccolta') : T('Giorni da impostare')) + '</span>';
        }
        var ia = infoAccesso(c);   // il tipo resta sempre leggibile; dopo, lucchetto (solo tu) o persone; niente per i calendari di tutti
        var sotto = '<span class="cal-tile-tipo">' + esc(T(NOME_BREVE[c.tipo])) + '</span>' + (ia ? '<span class="cal-acc-sep">·</span><span class="cal-acc" title="' + esc(ia.intero) + '">' + I(ia.ico, 'cal-ic') + '<span>' + esc(ia.corto) + '</span></span>' : '');
        return '<div class="cal-pan cal-tile" data-k="t' + c.id + '" style="--c:' + col + '"><button type="button" class="cal-tile-apri" data-az="apri" data-id="' + c.id + '" aria-label="' + esc(c.nome + (ia ? ', ' + ia.intero : '')) + '"></button>' +
               '<div class="cal-tile-testa"><span class="cal-tile-ico">' + I(c.icona) + '</span><span class="cal-tile-nomi"><b>' + esc(c.nome) + '</b><small>' + sotto + '</small></span>' + extra + '</div>' +
               '<div class="cal-tile-riga">' + riga + '</div></div>';
    }

    /* ---------------------------------------------------------------- calendario */
    function vistaCal(c) {
        var col = colore(c.colore), ia = infoAccesso(c);
        var h = '<header class="cal-testa cal-testa-cal" data-k="testa-cal" style="--c:' + col + '">' +
            '<button type="button" class="cal-ico-btn" data-az="indietro" aria-label="' + esc(T('Indietro')) + '">' + I('chevron-left') + '</button>' +
            '<span class="cal-tile-ico cal-testa-ico">' + I(c.icona) + '</span>' +
            '<div class="cal-testa-txt"><div class="cal-eyebrow"><span>' + esc(T(NOME_BREVE[c.tipo])) + '</span>' +
            (ia ? '<button type="button" class="cal-acc-chip" data-az="chi-lo-vede" title="' + esc(ia.intero) + '" aria-label="' + esc(T('Chi lo vede: {x}', { x: ia.intero })) + '">' + I(ia.ico, 'cal-ic') + '<span>' + esc(ia.breve) + '</span></button>' : '') + '</div>' +
            '<h1 class="cal-titolo cal-titolo-cal">' + esc(c.nome) + '</h1>' + (mio(c) ? '' : '<div class="cal-creato">' + esc(T('Creato da {n}', { n: nomeCreatore(c) })) + '</div>') + '</div>' +
            (c.modificabile ? '<button type="button" class="cal-ico-btn" data-az="modifica" aria-label="' + esc(T('Modifica')) + '">' + I('pencil') + '</button>' : '') + '</header>';
        h += '<div class="cal-corpo" data-k="corpo"><section class="cal-pan cal-mese" data-k="mese" style="--c:' + col + '">' + testaMese() + grigliaMese(c) + '</section><div class="cal-lato" data-k="lato-' + c.tipo + '" style="--c:' + col + '">';
        if (c.tipo === 'spunta') h += latoSpunta(c);
        else if (c.tipo === 'agenda') h += latoAgenda(c);
        else h += latoRifiuti(c);
        return h + '</div></div>';
    }
    function testaMese() {
        var gr = griglia(S.anno, S.mese), qui = S.info.oggi >= gr.primo && S.info.oggi <= gr.ultimo;
        return '<div class="cal-mese-testa"><button type="button" class="cal-ico-btn" data-az="mese" data-v="-1" aria-label="' + esc(T('Mese prima')) + '">' + I('chevron-left') + '</button>' +
               '<h2>' + esc(titoloMese(S.anno, S.mese)) + '</h2>' +
               '<button type="button" class="cal-ico-btn" data-az="mese" data-v="1" aria-label="' + esc(T('Mese dopo')) + '">' + I('chevron-right') + '</button>' +
               '<button type="button" class="cal-btn cal-btn-pic' + (qui ? ' cal-nascosto' : '') + '" data-az="mese-oggi">' + esc(T('Oggi')) + '</button></div>';
    }
    function grigliaMese(c) {
        var gr = griglia(S.anno, S.mese), d = S.dati, oggi = S.info.oggi, h = '<div class="cal-sett" aria-hidden="true">';
        for (var i = 0; i < 7; i++) h += '<span>' + esc(GIORNI_B[i]) + '</span>';
        h += '</div><div class="cal-giorni" id="cal-giorni" role="grid">';
        var occ = {};
        if (c.tipo === 'agenda') (d.occorrenze || []).forEach(function (o) { (occ[o.giorno] = occ[o.giorno] || []).push(o); });
        var tipi = {}; if (c.tipo === 'rifiuti') (d.tipi || []).forEach(function (t) { tipi[t.id] = t; });
        var io = d.io || (S.info.io && S.info.io.id), mioCol = colore(persona(io).colore);
        for (var g = gr.dal; g <= gr.al; g = piuGiorni(g, 1)) {
            var cls = 'cal-g', dentro = '', etich = giornoLungo(g), fuori = g < gr.primo || g > gr.ultimo, extra = '';
            if (fuori) cls += ' cal-fuori';
            if (g === oggi) cls += ' cal-oggi';
            if (S.sel === g && c.tipo !== 'spunta') cls += ' cal-g-sel';
            if (c.tipo === 'spunta') {
                var chi = (d.spunte || {})[g] || [], mio = chi.indexOf(io) >= 0, altri = chi.filter(function (u) { return u !== io; });
                if (g > oggi) { cls += ' cal-futuro'; extra = ' disabled aria-disabled="true"'; }
                if (mio) { cls += ' cal-fatto'; etich += ' · ' + T('fatto'); }
                dentro = '<span class="cal-g-p">' + altri.slice(0, 4).map(function (u) { return '<i style="--c:' + colore(persona(u).colore) + '"></i>'; }).join('') + (altri.length > 4 ? '<em>+</em>' : '') + '</span>';
                if (altri.length) etich += ' · ' + altri.map(function (u) { return persona(u).nome; }).join(', ');
                extra += ' aria-pressed="' + (mio ? 'true' : 'false') + '" style="--io:' + mioCol + '"';
            } else if (c.tipo === 'agenda') {
                var e = occ[g] || [];
                dentro = '<span class="cal-g-p">' + e.slice(0, 3).map(function () { return '<i></i>'; }).join('') + (e.length > 3 ? '<em>+</em>' : '') + '</span>';
                if (e.length) etich += ' · ' + e.length + ' ' + (e.length === 1 ? T('impegno') : T('impegni'));
            } else {
                var rr = ((d.raccolte || {})[g] || []).map(function (id) { return tipi[id]; }).filter(Boolean);
                dentro = '<span class="cal-g-p">' + rr.slice(0, 4).map(function (t) { return '<i style="--c:' + colore(t.colore) + '"></i>'; }).join('') + '</span>';
                if (rr.length) etich += ' · ' + elenco(rr.map(function (t) { return t.nome; }));
            }
            h += '<button type="button" role="gridcell" class="' + cls + '" data-az="giorno" data-g="' + g + '" aria-label="' + esc(etich) + '"' + extra + '><span class="cal-g-n">' + (+g.slice(8)) + '</span>' + dentro + '</button>';
        }
        return h + '</div>';
    }

    /* spunta */
    function latoSpunta(c) {
        var d = S.dati, io = d.io || S.info.io.id, st = (d.statistiche || {})[String(io)] || {}, oggi = S.info.oggi;
        var fatto = ((d.spunte || {})[oggi] || []).indexOf(io) >= 0;
        var mioCol = colore(persona(io).colore);
        var h = '<section class="cal-pan cal-oggi-pan" data-k="oggi" style="--io:' + mioCol + '"><button type="button" class="cal-grande' + (fatto ? ' cal-on' : '') + '" data-az="spunta" data-g="' + oggi + '" aria-pressed="' + (fatto ? 'true' : 'false') + '">' +
            '<span class="cal-grande-ico">' + I('check') + '</span><span class="cal-grande-t"><b>' + esc(fatto ? T('Fatto oggi') : T('Segna oggi')) + '</b><small>' + esc(fatto ? T('Tocca di nuovo per togliere la spunta') : T('Oppure tocca un giorno del mese')) + '</small></span></button></section>';
        var meseNome = titoloMese(S.anno, S.mese);
        h += '<section class="cal-pan cal-stat" data-k="stat"><div class="cal-pan-testa"><div class="cal-eyebrow">' + I('flame', 'cal-ic') + '<span>' + esc(T('Le tue spunte')) + '</span></div></div><div class="cal-numeri">' +
            numero(st.serie || 0, T('Serie'), (st.serie === 1 ? T('giorno di fila') : T('giorni di fila'))) +
            numero(st.serie_migliore || 0, T('Migliore'), T('la serie più lunga')) +
            numero((st.percentuale || 0) + '%', meseNome, T('{f} su {g} giorni', { f: st.fatti || 0, g: st.giorni || 0 })) + '</div>' +
            '<div class="cal-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + (st.percentuale || 0) + '"><i style="transform:scaleX(' + Math.min(1, (st.percentuale || 0) / 100) + ');background:' + mioCol + '"></i></div></section>';
        var pers = (d.persone || S.info.persone || []);
        h += '<section class="cal-pan cal-persone" data-k="persone"><div class="cal-pan-testa"><div class="cal-eyebrow">' + I(accesso(c).modo === 'tutti' ? 'users' : infoAccesso(c).ico, 'cal-ic') + '<span>' + esc(accesso(c).modo === 'tutti' ? T('Tutta la casa') : T('Chi lo vede')) + '</span></div><span class="cal-nota-dx">' + esc(meseNome) + '</span></div><ul class="cal-pers">';
        pers.forEach(function (p) {
            var s = (d.statistiche || {})[String(p.id)] || {}, f = ((d.spunte || {})[oggi] || []).indexOf(p.id) >= 0;
            h += '<li style="--c:' + colore(p.colore) + '"><i class="cal-pers-dot"></i><span class="cal-pers-n">' + esc(p.nome) + (p.id === io ? ' <small>(' + esc(T('tu')) + ')</small>' : '') + '</span>' +
                 '<span class="cal-pers-oggi' + (f ? ' cal-on' : '') + '" title="' + esc(f ? T('Fatto oggi') : T('Da fare oggi')) + '">' + I(f ? 'check' : 'minus') + '</span>' +
                 '<span class="cal-pers-v"><b>' + (s.percentuale || 0) + '%</b><small>' + esc(T('serie {n}', { n: s.serie || 0 })) + '</small></span></li>';
        });
        // colori gia' di un'altra persona (di TUTTA la casa, anche senza accesso a questo calendario: il server rifiuta un
        // colore di chiunque, e i nomi degli utenti sono gia' nel foglio "Chi lo vede")
        var presi = {};
        (S.info.persone || []).forEach(function (p) { if (p.id !== io && p.colore) presi[String(p.colore).toUpperCase()] = p.nome; });
        h += '</ul><div class="cal-sotto-t">' + esc(T('Il tuo colore')) + '</div><div class="cal-colori" role="radiogroup" aria-label="' + esc(T('Il tuo colore')) + '">' +
             COLORI.slice(0, 10).map(function (k) {
                 var su = k.toUpperCase() === mioCol.toUpperCase(), di = !su && presi[k.toUpperCase()];
                 return '<button type="button" class="cal-col' + (su ? ' cal-on' : '') + (di ? ' cal-preso' : '') + '" data-az="mio-colore" data-v="' + k + '" style="--c:' + k + '" role="radio" aria-checked="' + su + '"' +
                        (di ? ' disabled aria-label="' + esc(T('Colore di {n}', { n: di })) + '" title="' + esc(T('Colore di {n}', { n: di })) + '"' : ' aria-label="' + k + '"') + '></button>';
             }).join('') + '</div></section>';
        return h;
    }
    function numero(v, eti, sotto) { return '<div class="cal-num"><small>' + esc(eti) + '</small><b>' + esc(v) + '</b><span>' + esc(sotto) + '</span></div>'; }

    /* agenda */
    function latoAgenda(c) {
        var g = S.sel || S.info.oggi, del = (S.dati.occorrenze || []).filter(function (o) { return o.giorno === g; });
        var h = '<section class="cal-pan cal-giorno-pan" data-k="giorno"><div class="cal-pan-testa"><div class="cal-giorno-tit"><small>' + esc(g === S.info.oggi ? T('Oggi') : g === piuGiorni(S.info.oggi, 1) ? T('Domani') : MESI[dataD(g).getUTCMonth()] + ' ' + dataD(g).getUTCFullYear()) + '</small><b>' + esc(giornoLungo(g)) + '</b></div>' +
            '<button type="button" class="cal-btn cal-btn-pri" data-az="evento-nuovo" data-g="' + g + '">' + I('plus') + '<span>' + esc(T('Aggiungi')) + '</span></button></div>';
        if (!del.length) h += '<div class="cal-prox-vuoto">' + I('calendar') + '<span>' + esc(T('Nessun impegno in questo giorno')) + '</span></div>';
        else {
            h += '<ul class="cal-eventi">';
            del.forEach(function (o) {
                var segni = (o.ricorrente ? I('repeat', 'cal-ic') : '') + (o.promemoria && o.promemoria !== 'nessuno' ? I('bell', 'cal-ic') : '');
                h += '<li><button type="button" class="cal-ev" data-az="evento" data-id="' + o.evento_id + '" data-g="' + o.giorno + '">' +
                     '<span class="cal-ev-ora">' + (o.ora ? esc(o.ora) : '<small>' + esc(T('tutto il giorno')) + '</small>') + '</span>' +
                     '<span class="cal-ev-t"><b>' + esc(o.titolo) + '</b>' + (o.nota ? '<small>' + esc(o.nota) + '</small>' : '') + '</span><span class="cal-ev-segni">' + segni + '</span></button></li>';
            });
            h += '</ul>';
        }
        h += '</section>';
        var pr = ((calDi(S.cal) || {}).riassunto || {}).prossimi || [];
        if (pr.length) {
            h += '<section class="cal-pan" data-k="arrivo"><div class="cal-pan-testa"><div class="cal-eyebrow">' + I('bell', 'cal-ic') + '<span>' + esc(T('In arrivo')) + '</span></div><span class="cal-nota-dx">' + esc(T('prossimi 30 giorni')) + '</span></div><ul class="cal-prox">';
            pr.forEach(function (p) {
                h += '<li><button type="button" class="cal-prox-v" data-az="vai-giorno" data-g="' + p.giorno + '"><span class="cal-prox-ora">' + (p.ora ? esc(p.ora) : '<small>' + esc(T('tutto il giorno')) + '</small>') + '</span>' +
                     '<span class="cal-prox-t"><b>' + esc(p.titolo) + '</b><small>' + esc(giornoBreve(p.giorno)) + '</small></span></button></li>';
            });
            h += '</ul></section>';
        }
        return h;
    }

    /* rifiuti */
    function latoRifiuti(c) {
        var d = S.dati, oggi = S.info.oggi, domani = piuGiorni(oggi, 1), tipi = {};
        (d.tipi || []).forEach(function (t) { tipi[t.id] = t; });
        function di(g) {
            var ids = (d.raccolte || {})[g];
            if (ids === undefined) {   // domani fuori dalla griglia (ultimo giorno del mese mostrato): dai Prossimi
                var p = S.prossimi.filter(function (x) { return x.tipo === 'rifiuti' && x.calendario_id === c.id && x.giorno === g; })[0];
                return p ? (p.raccolte || []).map(function (r) { return tipi[r.id] || r; }) : [];
            }
            return ids.map(function (id) { return tipi[id]; }).filter(Boolean);
        }
        var dom = di(domani), og = di(oggi), imp = (c.impostazioni || {});
        var h = '<section class="cal-pan cal-domani" data-k="domani"><div class="cal-eyebrow">' + I('moon', 'cal-ic') + '<span>' + esc(T('Stasera da portare fuori')) + '</span></div>' +
            '<div class="cal-domani-t">' + (dom.length ? esc(T('Domani: {x}', { x: elenco(dom.map(function (t) { return t.nome; })) })) : esc(T('Domani nessuna raccolta'))) + '</div>' +
            (dom.length ? '<div class="cal-chips">' + dom.map(function (t) { return '<span class="cal-chip" style="--c:' + colore(t.colore) + '"><i></i>' + esc(t.nome) + '</span>'; }).join('') + '</div>' : '') +
            (og.length ? '<div class="cal-domani-oggi">' + esc(T('Oggi: {x}', { x: elenco(og.map(function (t) { return t.nome; })) })) + '</div>' : '') +
            '<div class="cal-domani-avv">' + I(imp.avviso === false ? 'bell-off' : 'bell', 'cal-ic') + '<span>' + esc(imp.avviso === false ? T('Avviso della sera prima spento') : T('Avviso la sera prima alle {ora}', { ora: imp.ora || S.info.ora_sera || '20:00' })) + '</span></div></section>';
        if (S.sel) {
            var sg = di(S.sel);
            h += '<section class="cal-pan cal-giorno-pan" data-k="scelto"><div class="cal-giorno-tit"><small>' + esc(T('Giorno scelto')) + '</small><b>' + esc(giornoLungo(S.sel)) + '</b></div>' +
                 '<div class="cal-giorno-r">' + (sg.length ? '<div class="cal-chips">' + sg.map(function (t) { return '<span class="cal-chip" style="--c:' + colore(t.colore) + '"><i></i>' + esc(t.nome) + '</span>'; }).join('') + '</div>' : esc(T('Nessuna raccolta'))) + '</div></section>';
        }
        h += '<section class="cal-pan cal-tipi-pan" data-k="tipi"><div class="cal-pan-testa"><div class="cal-eyebrow">' + I('recycle', 'cal-ic') + '<span>' + esc(T('Giorni di raccolta')) + '</span></div>' +
             '<button type="button" class="cal-btn" data-az="rifiuti">' + I('settings-2') + '<span>' + esc(T('Imposta')) + '</span></button></div><ul class="cal-tipi">';
        var conGiorni = (d.tipi || []).filter(function (t) { return (t.giorni || []).length; });
        if (!conGiorni.length) h += '<li class="cal-tipi-vuoto"><span>' + esc(T('Nessun giorno impostato: tocca Imposta e scegli i giorni di ogni raccolta.')) + '</span></li>';
        conGiorni.forEach(function (t) {
            h += '<li style="--c:' + colore(t.colore) + '"><i class="cal-pers-dot"></i><span class="cal-pers-n">' + esc(t.nome) + '</span><span class="cal-tipi-g">' +
                 esc(t.giorni.map(function (x) { return GIORNI_B[x]; }).join(', ')) + (t.alterna ? ' · ' + esc(T('a settimane alterne')) : '') + '</span></li>';
        });
        return h + '</ul></section>';
    }

    /* ======================================================================
       AZIONI
       ====================================================================== */
    var occupato = {};
    function spunta(calId, g, nuovo) {
        var chiave = calId + '|' + g; if (occupato[chiave]) return; occupato[chiave] = true;
        var c = calDi(calId), io = S.info.io.id, d = S.dati && S.cal === calId ? S.dati : null, prima = null;
        if (d) {   // subito sullo schermo, poi il server conferma (o si torna indietro)
            var chi = (d.spunte = d.spunte || {})[g] = ((d.spunte || {})[g] || []).slice(), i = chi.indexOf(io);
            prima = chi.slice();
            if (nuovo === undefined) nuovo = i < 0;
            if (nuovo && i < 0) chi.push(io); else if (!nuovo && i >= 0) chi.splice(i, 1);
            if (S.vista === 'cal') { var cella = inn.querySelector('.cal-g[data-g="' + g + '"]'); if (cella) { cella.classList.toggle('cal-fatto', nuovo); cella.setAttribute('aria-pressed', nuovo ? 'true' : 'false'); if (nuovo && !leggera()) { cella.classList.remove('cal-pop'); void cella.offsetWidth; cella.classList.add('cal-pop'); } } }
        }
        var corpo = { giorno: g }; if (nuovo !== undefined) corpo.fatto = nuovo;
        api('POST', '/api/calendari/' + calId + '/spunta', corpo).then(function (j) {
            if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* niente */ } }
            if (d) { d.spunte[g] = j.chi || []; if (j.statistiche && (j.statistiche.mese === S.mese && j.statistiche.anno === S.anno)) d.statistiche[String(io)] = j.statistiche; }
            if (c && g === S.info.oggi && c.riassunto) { c.riassunto.fatto_oggi = !!j.fatto; if (j.statistiche) { c.riassunto.serie = j.statistiche.serie; if (j.statistiche.mese === +S.info.oggi.slice(5, 7)) c.riassunto.percentuale = j.statistiche.percentuale; } }
            if (S.vista === 'cal' && S.cal === calId) disegna(false); else if (S.vista === 'elenco') disegna(false);
            if (S.vista === 'cal') caricaTutto(true);
        }).catch(function (e) {
            if (d && prima) { d.spunte[g] = prima; if (S.vista === 'cal') disegna(false); }
            if (e && e.codice === 'non_trovato') sparito(e, calId); else errore(e);
        }).then(function () { delete occupato[chiave]; });
    }
    function apriCal(id, g) {
        var c = calDi(id); if (!c) return;
        S.vista = 'cal'; S.cal = id;
        var base = g || S.info.oggi;
        S.anno = +base.slice(0, 4); S.mese = +base.slice(5, 7);
        S.sel = c.tipo === 'spunta' ? null : (g || (c.tipo === 'agenda' ? S.info.oggi : null));
        S.dati = null;
        try { localStorage.setItem('wh_cal_ultimo', String(id)); } catch (e) { /* niente */ }
        // l'elenco resta fermo dov'e' finche' arriva il mese: si va in cima quando il calendario si disegna (disegna)
        if (vistaFatta === 'elenco') S.yElenco = scorritore().scrollTop || 0;
        caricaMese(true);
    }
    function cambiaMese(n) {
        var m = S.mese + n, a = S.anno;
        if (m < 1) { m = 12; a--; } else if (m > 12) { m = 1; a++; }
        S.anno = a; S.mese = m;
        var c = calDi(S.cal);
        if (c && c.tipo === 'agenda') { var gr = griglia(a, m); S.sel = S.info.oggi >= gr.primo && S.info.oggi <= gr.ultimo ? S.info.oggi : gr.primo; }
        else if (c && c.tipo === 'rifiuti') S.sel = null;
        caricaMese(false, n);
    }

    inn.addEventListener('click', function (e) {
        var b = e.target.closest('[data-az]'); if (!b || !inn.contains(b) || b.disabled) return;
        var az = b.getAttribute('data-az'), id = +b.getAttribute('data-id') || 0, g = b.getAttribute('data-g');
        if (az === 'riprova') { S.errore = ''; disegna(); caricaTutto(); }
        else if (az === 'nuovo') foglioCalendario(null, b.getAttribute('data-tipo') || 'spunta');
        else if (az === 'apri') apriCal(id, g);
        else if (az === 'indietro') { S.vista = 'elenco'; S.dati = null; disegna(false); caricaTutto(true); }   // tessere subito, ferme, coi dati che ci sono: la rilettura aggiorna solo cio' che e' cambiato
        else if (az === 'spunta-oggi') spunta(id, S.info.oggi);
        else if (az === 'spunta') spunta(S.cal, g);
        else if (az === 'mese') cambiaMese(+b.getAttribute('data-v'));
        else if (az === 'mese-oggi') { S.anno = +S.info.oggi.slice(0, 4); S.mese = +S.info.oggi.slice(5, 7); var c0 = calDi(S.cal); S.sel = c0 && c0.tipo === 'agenda' ? S.info.oggi : null; caricaMese(false, 0); }
        else if (az === 'modifica') { var cm = calDi(S.cal); if (cm && cm.modificabile) foglioCalendario(cm); }
        else if (az === 'chi-lo-vede') {
            var ca = calDi(S.cal), ib = infoAccesso(ca); if (!ib) return;
            var testo = ib.intero + (mio(ca) ? '' : '\n' + T('Creato da {n}', { n: nomeCreatore(ca) }));
            if (typeof window.avvisa === 'function') window.avvisa(testo, { titolo: T('Chi lo vede') }); else toast(ib.intero);
        }
        else if (az === 'giorno') {
            var c = calDi(S.cal); if (!c) return;
            if (c.tipo === 'spunta') { if (g <= S.info.oggi) spunta(c.id, g); return; }
            var meseOra = S.anno + '-' + due(S.mese); if (g.slice(0, 7) !== meseOra) { S.anno = +g.slice(0, 4); S.mese = +g.slice(5, 7); S.sel = g; caricaMese(false, g.slice(0, 7) < meseOra ? -1 : 1); return; }
            if (c.tipo === 'rifiuti' && S.sel === g) S.sel = null; else S.sel = g;
            disegna(false);
            if (window.innerWidth < 1024) { var p = inn.querySelector('.cal-giorno-pan'); if (p && p.getBoundingClientRect().top > window.innerHeight - 120) p.scrollIntoView({ behavior: leggera() ? 'auto' : 'smooth', block: 'nearest' }); }
        }
        else if (az === 'vai-giorno') { S.anno = +g.slice(0, 4); S.mese = +g.slice(5, 7); S.sel = g; caricaMese(false); }
        else if (az === 'evento-nuovo') foglioEvento(null, g);
        else if (az === 'evento') {
            api('GET', '/api/calendari/eventi/' + id).then(function (j) { foglioEvento(j.evento, g); }).catch(errore);
        }
        else if (az === 'rifiuti') foglioRifiuti(calDi(S.cal));
        else if (az === 'mio-colore') {
            api('POST', '/api/calendari/persone', { colore: b.getAttribute('data-v') }).then(function (j) {
                S.info.persone = j.persone || S.info.persone;
                if (S.dati && S.dati.persone) S.dati.persone = S.dati.persone.map(function (p) { return persona(p.id); });
                var io = persona(S.info.io.id); S.info.io.colore = io.colore; disegna(false);
            }).catch(errore);
        }
    });
    // cambio di mese strisciando sulla griglia (solo in orizzontale, il resto scorre come sempre)
    var tx = null;
    inn.addEventListener('touchstart', function (e) { var gr = e.target.closest('.cal-giorni'); tx = gr && e.touches.length === 1 ? [e.touches[0].clientX, e.touches[0].clientY, Date.now()] : null; }, { passive: true });
    inn.addEventListener('touchend', function (e) {
        if (!tx || !e.changedTouches.length) return;
        var dx = e.changedTouches[0].clientX - tx[0], dy = e.changedTouches[0].clientY - tx[1], dt = Date.now() - tx[2]; tx = null;
        if (Math.abs(dx) > 60 && Math.abs(dy) < 40 && dt < 700) { e.preventDefault(); cambiaMese(dx < 0 ? 1 : -1); }
    });

    /* ======================================================================
       FOGLI (creazione e modifica): salgono dal basso sul telefono, al centro da 768 px.
       Lo scorrimento interno e' .modal-scroll-area: il blocco del rimbalzo dell'app la lascia passare.
       ====================================================================== */
    var foglio = null;
    function apriFoglio(titolo, corpo, salva, opz) {
        chiudiFoglio(true);
        var velo = document.createElement('div');
        velo.className = 'cal-velo'; velo.setAttribute('data-no-tr', '');
        velo.innerHTML = '<div class="cal-foglio" role="dialog" aria-modal="true" aria-label="' + esc(titolo) + '"><div class="cal-maniglia"></div>' +
            '<div class="cal-foglio-testa"><button type="button" class="cal-btn cal-btn-chiaro" data-f="annulla">' + esc(T('Annulla')) + '</button><h3>' + esc(titolo) + '</h3>' +
            '<button type="button" class="cal-btn cal-btn-pri" data-f="salva">' + esc((opz && opz.salva) || T('Salva')) + '</button></div>' +
            '<div class="cal-foglio-corpo modal-scroll-area">' + corpo + '</div></div>';
        document.body.appendChild(velo);
        icone(velo);
        var f = { el: velo, salva: salva, opz: opz || {} };
        foglio = f;
        html.classList.add('cal-foglio-aperto');
        velo.addEventListener('click', function (e) {
            if (e.target === velo) { chiudiFoglio(); return; }
            var b = e.target.closest('[data-f]'); if (!b) return;
            var a = b.getAttribute('data-f');
            if (a === 'annulla') chiudiFoglio();
            else if (a === 'salva') { if (f.lavora) return; f.lavora = true; b.disabled = true; Promise.resolve(salva(velo)).then(function (ok) { if (ok !== false) chiudiFoglio(); }).catch(errore).then(function () { f.lavora = false; b.disabled = false; }); }
            else if (f.opz.azione) f.opz.azione(a, b, velo);
        });
        velo.addEventListener('change', function (e) { if (f.opz.cambio) f.opz.cambio(e.target, velo); });
        void velo.offsetWidth;            // stato iniziale calcolato: la transizione (solo transform/opacity) parte da li'
        velo.classList.add('cal-on');
        return velo;
    }
    function chiudiFoglio(subito) {
        if (!foglio) return;
        var el = foglio.el; foglio = null;
        html.classList.remove('cal-foglio-aperto');
        el.classList.remove('cal-on');
        if (subito || leggera()) el.remove(); else setTimeout(function () { el.remove(); }, 300);
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && foglio) chiudiFoglio(); });
    function campo(et, dentro, nota) { return '<div class="cal-campo"><div class="cal-campo-et">' + esc(et) + '</div>' + dentro + (nota ? '<div class="cal-campo-nota">' + esc(nota) + '</div>' : '') + '</div>'; }
    function interruttore(nome, on, testo) { return '<label class="cal-int"><span>' + esc(testo) + '</span><input type="checkbox" name="' + nome + '"' + (on ? ' checked' : '') + '><i aria-hidden="true"></i></label>'; }
    function segmenti(nome, voci, val) {
        return '<div class="cal-seg" role="radiogroup">' + voci.map(function (v) {
            return '<label class="cal-seg-v"><input type="radio" name="' + nome + '" value="' + esc(v[0]) + '"' + (v[0] === val ? ' checked' : '') + '><span>' + esc(v[1]) + '</span></label>';
        }).join('') + '</div>';
    }
    function sceltaColori(nome, val) {
        val = colore(val).toUpperCase();
        var lista = COLORI.slice(); if (lista.map(function (k) { return k.toUpperCase(); }).indexOf(val) < 0) lista.unshift(val);
        return '<div class="cal-colori" role="radiogroup">' + lista.map(function (k) {
            return '<label class="cal-col-l"><input type="radio" name="' + nome + '" value="' + k + '"' + (k.toUpperCase() === val ? ' checked' : '') + ' aria-label="' + k + '"><i style="--c:' + k + '"></i></label>';
        }).join('') + '</div>';
    }
    function sceltaIcone(val) {
        var lista = ICONE.slice(); if (val && lista.indexOf(val) < 0) lista.unshift(icona(val));
        return '<div class="cal-icone" role="radiogroup">' + lista.map(function (n) {
            return '<label class="cal-icona-l"><input type="radio" name="icona" value="' + n + '"' + (n === val ? ' checked' : '') + ' aria-label="' + n + '"><span>' + I(n) + '</span></label>';
        }).join('') + '</div>';
    }
    function valore(el, nome) { var x = el.querySelector('[name="' + nome + '"]'); if (!x) return undefined; if (x.type === 'radio') { x = el.querySelector('[name="' + nome + '"]:checked'); return x ? x.value : undefined; } return x.type === 'checkbox' ? x.checked : x.value; }
    function mostra(el, sel, si) { [].forEach.call(el.querySelectorAll(sel), function (x) { x.hidden = !si; }); }

    /* destinatari: {app: 'tutti' | [id] | false, telegram, sonos}. acc = chi vede il calendario {modo, utenti, creato_da}:
       le persone senza accesso non si possono scegliere; Telegram e Sonos (di tutta la casa) per un calendario non di tutti
       partono spenti e, se accesi, hanno sotto l'avviso che li sentiranno/vedranno anche gli altri */
    function ammessiDi(modo, utenti, creatore) {   // null = tutti
        if (!modo || modo === 'tutti') return null;
        var s = modo === 'persone' ? (utenti || []).slice() : [];
        if (creatore !== null && creatore !== undefined && s.indexOf(creatore) < 0) s.push(creatore);
        return s;
    }
    function accDi(c) { var a = accesso(c); return { modo: a.modo, utenti: a.utenti || [], creato_da: c ? c.creato_da : mioId() }; }
    function editorDestinatari(d, conEredita, acc) {
        var can = S.info.canali || {}, eredita = conEredita && !d;
        var ammessi = acc ? ammessiDi(acc.modo, acc.utenti, acc.creato_da) : null, casa = ammessi === null;
        d = d || {}; var app = d.app === undefined ? 'tutti' : d.app, modo = app === false ? 'no' : Array.isArray(app) ? 'scegli' : 'tutti';
        var scelti = Array.isArray(app) ? app : [], tg = d.telegram === undefined ? casa : d.telegram !== false, so = d.sonos === undefined ? false : !!d.sonos;
        var h = '';
        if (conEredita) h += interruttore('dest_eredita', eredita, T('Come il calendario'));
        h += '<div class="cal-dest" data-casa="' + (casa ? '1' : '0') + '"' + (eredita ? ' hidden' : '') + '>';
        if (can.app) {
            h += '<div class="cal-sotto-t">' + esc(T('Notifica sull\'app iPhone')) + '</div>' + segmenti('dest_app', [['tutti', casa ? T('Tutti') : T('Chi lo vede')], ['scegli', T('Scegli')], ['no', T('Nessuno')]], modo) +
                 '<div class="cal-persone-sc"' + (modo === 'scegli' ? '' : ' hidden') + '>' + (S.info.persone || []).map(function (p) {
                     var si = casa || ammessi.indexOf(p.id) >= 0;
                     return '<label class="cal-chip-l" style="--c:' + colore(p.colore) + '"' + (si ? '' : ' hidden') + '><input type="checkbox" name="dest_p" value="' + p.id + '"' + (si && scelti.indexOf(p.id) >= 0 ? ' checked' : '') + '><span><i></i>' + esc(p.nome) + '</span></label>';
                 }).join('') + '</div>';
        }
        if (can.telegram) h += interruttore('dest_tg', tg, T('Messaggio su Telegram')) + avvisoCasa('dest_tg', casa || !tg, T('Telegram arriva alla chat di tutta la casa: lo vedranno anche gli altri.'));
        else h += '<input type="hidden" name="dest_tg_fisso" value="' + (tg ? '1' : '0') + '">';   // canale spento nella card: si rimanda com'e'
        if (can.sonos) h += interruttore('dest_sonos', so, T('Annuncio a voce sui Sonos')) + avvisoCasa('dest_sonos', casa || !so, T('L\'annuncio si sente in tutta la casa: lo sentiranno anche gli altri.'));
        else h += '<input type="hidden" name="dest_sonos_fisso" value="' + (so ? '1' : '0') + '">';
        if (!can.app && !can.telegram && !can.sonos) h += '<div class="cal-campo-nota">' + esc(T('Nessun canale acceso: i promemoria si attivano nella card Calendari dello Store.')) + '</div>';
        return h + '</div>';
    }
    function avvisoCasa(nome, nascosto, testo) { return '<div class="cal-avv-casa" data-avv="' + nome + '" role="note"' + (nascosto ? ' hidden' : '') + '>' + I('triangle-alert', 'cal-ic') + '<span>' + esc(testo) + '</span></div>'; }
    function avvisiCasa(el) {
        var w = el.querySelector('.cal-dest'); if (!w) return;
        var casa = w.getAttribute('data-casa') === '1';
        ['dest_tg', 'dest_sonos'].forEach(function (n) { var x = el.querySelector('[name="' + n + '"]'), a = el.querySelector('[data-avv="' + n + '"]'); if (x && a) a.hidden = casa || !x.checked; });
    }
    // dopo un cambio di "Chi lo vede" nel foglio: chi non ha accesso sparisce da "Scegli"; da tutti a non tutti Telegram e
    // Sonos si spengono (proposta: si possono riaccendere, con l'avviso)
    function aggiornaDest(el, ammessi, eraCasa) {
        var w = el.querySelector('.cal-dest'); if (!w) return;
        var casa = ammessi === null;
        w.setAttribute('data-casa', casa ? '1' : '0');
        [].forEach.call(el.querySelectorAll('[name="dest_p"]'), function (x) { var si = casa || ammessi.indexOf(+x.value) >= 0; x.closest('.cal-chip-l').hidden = !si; if (!si) x.checked = false; });
        var tutti = el.querySelector('[name="dest_app"][value="tutti"]'); if (tutti) tutti.nextElementSibling.textContent = casa ? T('Tutti') : T('Chi lo vede');
        if (eraCasa && !casa) ['dest_tg', 'dest_sonos'].forEach(function (n) { var x = el.querySelector('[name="' + n + '"]'), f = el.querySelector('[name="' + n + '_fisso"]'); if (x) x.checked = false; if (f) f.value = '0'; });
        avvisiCasa(el);
    }
    function leggiDestinatari(el, conEredita) {
        if (conEredita && valore(el, 'dest_eredita')) return null;
        var can = S.info.canali || {}, d = {}, modo = valore(el, 'dest_app');
        if (can.app) d.app = modo === 'no' ? false : modo === 'scegli' ? [].map.call(el.querySelectorAll('[name="dest_p"]:checked'), function (x) { return +x.value; }) : 'tutti';
        // Telegram e Sonos sono canali di tutta la casa: per un calendario non di tutti si mandano SEMPRE (anche col canale
        // spento nella card o Telegram non configurato: il valore salvato, o false), cosi' il server non mette i suoi predefiniti
        var w = el.querySelector('.cal-dest'), casa = !w || w.getAttribute('data-casa') === '1';
        [['telegram', 'dest_tg'], ['sonos', 'dest_sonos']].forEach(function (k) {
            if (can[k[0]]) d[k[0]] = !!valore(el, k[1]);
            else if (!casa) { var f = el.querySelector('[name="' + k[1] + '_fisso"]'); d[k[0]] = !!f && f.value === '1'; }
        });
        return d;
    }
    function cambioDestinatari(t, el) {
        if (t.name === 'dest_eredita') mostra(el, '.cal-dest', !t.checked);
        if (t.name === 'dest_app') mostra(el, '.cal-persone-sc', t.value === 'scegli');
        if (t.name === 'dest_tg' || t.name === 'dest_sonos') avvisiCasa(el);
    }

    /* chi lo vede (foglio Crea/Modifica): Tutti / Solo io / Persone scelte, chi l'ha creato sempre dentro */
    function sceltaAccesso(c) {
        var a = accesso(c), me = mioId(), creatore = c ? c.creato_da : me, adotta = false;
        if (c && orfano(c) && S.info.io && S.info.io.admin) { creatore = me; adotta = true; }   // orfano: l'admin che lo modifica lo adotta
        var suo = creatore === me, modo = c ? a.modo : 'tutti', scelti = a.utenti || [];
        var h = segmenti('accesso', [['tutti', T('Tutti')], ['privato', suo ? T('Solo io') : T('Solo {n}', { n: nomeCreatore(c) })], ['persone', T('Persone scelte')]], modo) +
            '<div class="cal-campo-nota cal-acc-nota" data-acc-nota aria-live="polite"></div>' +
            '<div class="cal-acc-lista" data-acc-lista role="group" aria-label="' + esc(T('Persone scelte')) + '"' + (modo === 'persone' ? '' : ' hidden') + '>' + (S.info.persone || []).map(function (p) {
                var cr = p.id === creatore, on = cr || scelti.indexOf(p.id) >= 0;
                var sotto = cr ? (p.id === me ? (adotta ? T('tu: salvando diventa tuo') : T('tu, l\'hai creato')) : T('l\'ha creato')) : p.id === me ? T('tu') : '';
                return '<label class="cal-acc-p' + (cr ? ' cal-acc-fisso' : '') + '" style="--c:' + colore(p.colore) + '"><input type="checkbox" name="acc_p" value="' + p.id + '"' + (on ? ' checked' : '') + (cr ? ' disabled' : '') + '>' +
                       '<span class="cal-acc-av" aria-hidden="true">' + esc((p.nome || '?').charAt(0).toUpperCase()) + '</span><span class="cal-acc-n"><b>' + esc(p.nome) + '</b>' + (sotto ? '<small>' + esc(sotto) + '</small>' : '') + '</span>' +
                       '<span class="cal-acc-ck" aria-hidden="true">' + I('check') + '</span></label>';
            }).join('') + '</div>';
        return { html: h, creatore: creatore, suo: suo, c: c, modo: modo };
    }
    function statoAccesso(el, sa) {
        var modo = valore(el, 'accesso') || 'tutti';
        var utenti = [].map.call(el.querySelectorAll('[name="acc_p"]:checked'), function (x) { return +x.value; });
        return { modo: modo, utenti: utenti, ammessi: ammessiDi(modo, utenti, sa.creatore) };
    }
    function notaAccesso(el, sa) {
        var st = statoAccesso(el, sa), n = el.querySelector('[data-acc-nota]'), txt;
        if (st.modo === 'tutti') txt = T('Lo vedono e lo usano tutte le persone di casa.');
        else if (st.modo === 'privato') txt = sa.suo ? T('Lo vedi solo tu: nessun altro, nemmeno l\'amministratore.') : T('Lo vede solo {n}: nessun altro, nemmeno l\'amministratore.', { n: nomeCreatore(sa.c) });
        else if (st.ammessi.length < 2) txt = T('Spunta chi lo può vedere: senza nessuno è come Solo io.');
        else txt = T('Lo vedono solo le persone spuntate: nessun altro, nemmeno l\'amministratore.');
        if (n) n.textContent = txt;
        mostra(el, '[data-acc-lista]', st.modo === 'persone');
        aggiornaDest(el, st.ammessi, sa.modo === 'tutti');
        sa.modo = st.modo;
    }

    /* ---------------------------------------------------------------- calendario: nuovo / modifica */
    function foglioCalendario(c, tipo) {
        if (c && !c.modificabile) return;   // le impostazioni le cambia solo chi l'ha creato o un amministratore
        var nuovo = !c; tipo = c ? c.tipo : tipo;
        var imp = (c && c.impostazioni) || {};
        var sa = sceltaAccesso(c);
        var corpo = '';
        if (nuovo) corpo += campo(T('Tipo'), '<div class="cal-tipi-sc">' + ['spunta', 'agenda', 'rifiuti'].map(function (t) {
            return '<label class="cal-tipo-l"><input type="radio" name="tipo" value="' + t + '"' + (t === tipo ? ' checked' : '') + '><span class="cal-tipo-scelta"><span class="cal-tile-ico" style="--c:' + ({ spunta: '#30D158', agenda: '#0A84FF', rifiuti: '#8E8E93' })[t] + '">' + I(ICONA_TIPO[t]) + '</span>' +
                   '<span class="cal-tipo-txt"><b>' + esc(T(NOME_TIPO[t])) + '</b><small>' + esc(T(DESC_TIPO[t])) + '</small></span></span></label>';
        }).join('') + '</div>');
        corpo += campo(T('Nome'), '<input type="text" class="cal-in-t" name="nome" maxlength="40" autocomplete="off" value="' + esc(c ? c.nome : '') + '" placeholder="' + esc(T('Per esempio: Pillola, Palestra, Famiglia')) + '">');
        corpo += campo(T('Chi lo vede'), sa.html);
        corpo += campo(T('Colore'), sceltaColori('colore', c ? c.colore : { spunta: '#30D158', agenda: '#0A84FF', rifiuti: '#8E8E93' }[tipo]));
        corpo += campo(T('Icona'), sceltaIcone(c ? c.icona : ICONA_TIPO[tipo]));
        corpo += '<div class="cal-solo" data-solo="spunta"' + (tipo === 'spunta' ? '' : ' hidden') + '>' + campo(T('Promemoria'), '<select class="cal-sel" name="promemoria_ora">' + opzioniOre(15, 0, 23, imp.promemoria_ora || '', '<option value="">' + esc(T('Nessun promemoria')) + '</option>') + '</select>',
            T('Se a quell\'ora oggi non e\' ancora spuntato, arriva un avviso.')) + '</div>';
        corpo += '<div class="cal-solo" data-solo="rifiuti"' + (tipo === 'rifiuti' ? '' : ' hidden') + '><div class="cal-campo-nota">' + esc(T('I giorni di raccolta e l\'ora dell\'avviso si impostano dopo, con il tasto Imposta.')) + '</div></div>';
        corpo += campo(T('Chi avvisare'), editorDestinatari(c ? c.destinatari : (tipo === 'rifiuti' ? { app: 'tutti', telegram: true, sonos: true } : { app: 'tutti', telegram: true, sonos: false }), false, accDi(c)));
        if (!nuovo) corpo += '<div class="cal-pericolo"><button type="button" class="cal-btn cal-btn-rosso" data-f="elimina">' + I('trash-2') + '<span>' + esc(T('Elimina calendario')) + '</span></button></div>';
        var velo = apriFoglio(nuovo ? T('Nuovo calendario') : T('Modifica calendario'), corpo, function (el) {
            var t = nuovo ? valore(el, 'tipo') : tipo, nome = (valore(el, 'nome') || '').trim();
            if (!nome) { avviso(T('Scrivi il nome del calendario')); return false; }
            var st = statoAccesso(el, sa);
            var d = { nome: nome, colore: valore(el, 'colore'), icona: valore(el, 'icona'), destinatari: leggiDestinatari(el, false),
                      accesso: st.modo === 'persone' ? { modo: 'persone', utenti: st.utenti } : { modo: st.modo } };
            if (t === 'spunta') d.impostazioni = { promemoria_ora: valore(el, 'promemoria_ora') || '' };
            if (!nuovo && st.ammessi && st.ammessi.indexOf(mioId()) < 0) {
                // es. l'amministratore che lo rende privato di chi l'ha creato: dopo non lo vede piu'
                return domanda(T('Dopo il salvataggio non vedrai più «{n}». Continuare?', { n: c.nome }), { titolo: T('Chi lo vede'), si: T('Salva'), no: T('Annulla') })
                    .then(function (si) { return si ? salvaModifica(d) : false; });
            }
            if (nuovo) {
                d.tipo = t;
                return api('POST', '/api/calendari', d).then(function (j) {
                    S.calendari.push(j.calendario);
                    apriCal(j.calendario.id);
                    if (t === 'rifiuti') setTimeout(function () { if (S.dati && S.cal === j.calendario.id) foglioRifiuti(calDi(j.calendario.id)); else { var x = setInterval(function () { if (S.dati && S.cal === j.calendario.id) { clearInterval(x); foglioRifiuti(calDi(j.calendario.id)); } }, 150); setTimeout(function () { clearInterval(x); }, 5000); } }, 350);
                    caricaTutto(true);
                });
            }
            return salvaModifica(d);
        }, {
            salva: nuovo ? T('Crea') : T('Salva'),
            cambio: function (t, el) {
                cambioDestinatari(t, el);
                if (t.name === 'accesso' || t.name === 'acc_p') notaAccesso(el, sa);
                if (t.name === 'tipo' && nuovo) {
                    [].forEach.call(el.querySelectorAll('.cal-solo'), function (x) { x.hidden = x.getAttribute('data-solo') !== t.value; });
                    var cc = el.querySelector('[name="colore"][value="' + { spunta: '#30D158', agenda: '#0A84FF', rifiuti: '#8E8E93' }[t.value] + '"]'); if (cc) cc.checked = true;
                    var ii = el.querySelector('[name="icona"][value="' + ICONA_TIPO[t.value] + '"]'); if (ii) ii.checked = true;
                    var dsn = el.querySelector('[name="dest_sonos"]'); if (dsn) dsn.checked = t.value === 'rifiuti' && sa.modo === 'tutti';
                    avvisiCasa(el);
                }
            },
            azione: function (a) {
                if (a !== 'elimina') return;
                domanda(T('Eliminare il calendario «{n}»? Spunte, impegni e giorni di raccolta si perdono.', { n: c.nome }), { titolo: T('Elimina calendario'), si: T('Elimina'), no: T('Annulla'), pericolo: true }).then(function (si) {
                    if (!si) return;
                    api('DELETE', '/api/calendari/' + c.id).then(function () {
                        chiudiFoglio(); S.calendari = S.calendari.filter(function (x) { return x.id !== c.id; });
                        S.vista = 'elenco'; S.dati = null; disegna(false); caricaTutto(true); toast(T('Calendario eliminato'));
                    }).catch(errore);
                });
            }
        });
        notaAccesso(velo, sa);
        function salvaModifica(d) {
            return api('PUT', '/api/calendari/' + c.id, d).then(function (j) {
                if (!j.calendario) {   // dopo la modifica non lo vedo piu'
                    S.calendari = S.calendari.filter(function (x) { return x.id !== c.id; });
                    S.vista = 'elenco'; S.dati = null; disegna(false); caricaTutto(true); toast(T('Salvato: ora non lo vedi più'));
                    return;
                }
                for (var i = 0; i < S.calendari.length; i++) if (S.calendari[i].id === c.id) { j.calendario.riassunto = S.calendari[i].riassunto; S.calendari[i] = j.calendario; }
                disegna(false); caricaTutto(true);
            });
        }
    }

    /* ---------------------------------------------------------------- selettore di data proprio (niente input type=date) */
    function miniCal(nome, val, minimo) {
        return '<div class="cal-data" data-nome="' + nome + '"><input type="hidden" name="' + nome + '" value="' + esc(val || '') + '">' +
               '<button type="button" class="cal-data-btn" data-f="data-apri" data-nome="' + nome + '">' + I('calendar', 'cal-ic') + '<span>' + esc(val ? giornoLungo(val) + ' ' + dataD(val).getUTCFullYear() : T('Per sempre')) + '</span>' + I('chevron-down', 'cal-ic cal-giu') + '</button>' +
               '<div class="cal-mini" hidden data-min="' + esc(minimo || '') + '"></div></div>';
    }
    function disegnaMini(box, a, m) {
        var wrap = box.closest('.cal-data'), val = wrap.querySelector('input').value, gr = griglia(a, m), min = box.getAttribute('data-min');
        box.setAttribute('data-a', a); box.setAttribute('data-m', m);
        var h = '<div class="cal-mini-testa"><button type="button" class="cal-ico-btn" data-f="mini-mese" data-v="-1" aria-label="' + esc(T('Mese prima')) + '">' + I('chevron-left') + '</button><b>' + esc(titoloMese(a, m)) + '</b>' +
                '<button type="button" class="cal-ico-btn" data-f="mini-mese" data-v="1" aria-label="' + esc(T('Mese dopo')) + '">' + I('chevron-right') + '</button></div><div class="cal-sett cal-mini-sett">';
        for (var i = 0; i < 7; i++) h += '<span>' + GIORNI_1[i] + '</span>';
        h += '</div><div class="cal-mini-g">';
        for (var g = gr.dal; g <= gr.al; g = piuGiorni(g, 1)) {
            var no = min && g < min;
            h += '<button type="button" class="cal-mg' + (g < gr.primo || g > gr.ultimo ? ' cal-fuori' : '') + (g === S.info.oggi ? ' cal-oggi' : '') + (g === val ? ' cal-mg-sel' : '') + '" data-f="mini-g" data-g="' + g + '"' + (no ? ' disabled' : '') + ' aria-label="' + esc(giornoLungo(g)) + '">' + (+g.slice(8)) + '</button>';
        }
        box.innerHTML = h + '</div>';
        icone(box);
    }
    function azioneMini(a, b, el) {
        if (a === 'data-apri') {
            var w = b.closest('.cal-data'), box = w.querySelector('.cal-mini'), v = w.querySelector('input').value || S.info.oggi;
            if (box.hidden) { disegnaMini(box, +v.slice(0, 4), +v.slice(5, 7)); box.hidden = false; } else box.hidden = true;
            return true;
        }
        if (a === 'mini-mese') {
            var bx = b.closest('.cal-mini'), aa = +bx.getAttribute('data-a'), mm = +bx.getAttribute('data-m') + +b.getAttribute('data-v');
            if (mm < 1) { mm = 12; aa--; } else if (mm > 12) { mm = 1; aa++; }
            disegnaMini(bx, aa, mm); return true;
        }
        if (a === 'mini-g') {
            var ww = b.closest('.cal-data'), g = b.getAttribute('data-g');
            ww.querySelector('input').value = g;
            ww.querySelector('.cal-data-btn span').textContent = giornoLungo(g) + ' ' + dataD(g).getUTCFullYear();
            ww.querySelector('.cal-mini').hidden = true;
            ww.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }
        return false;
    }

    /* ---------------------------------------------------------------- impegno dell'agenda */
    function foglioEvento(ev, giorno) {
        var nuovo = !ev, oc = giorno, ricorre = ev && ev.ripeti && ev.ripeti !== 'mai';
        var tutto = ev ? !ev.ora : true, ora = ev && ev.ora ? ev.ora : '09:00', pr = ev ? ev.promemoria || 'nessuno' : 'nessuno';
        var prOra = ev && ev.promemoria_ora ? ev.promemoria_ora : '';
        var h = campo(T('Titolo'), '<input type="text" class="cal-in-t" name="titolo" maxlength="80" autocomplete="off" value="' + esc(ev ? ev.titolo : '') + '" placeholder="' + esc(T('Per esempio: Dentista')) + '">');
        h += campo(ricorre ? T('Primo giorno') : T('Giorno'), miniCal('giorno', ev ? ev.giorno : giorno));
        h += campo(T('Ora'), interruttore('tutto', tutto, T('Tutto il giorno')) +
            '<div class="cal-ora" data-ora' + (tutto ? ' hidden' : '') + '><select class="cal-sel" name="ora_h" aria-label="' + esc(T('Ore')) + '">' + (function () { var o = ''; for (var i = 0; i < 24; i++) o += '<option' + (due(i) === ora.slice(0, 2) ? ' selected' : '') + '>' + due(i) + '</option>'; return o; })() + '</select><b>:</b>' +
            '<select class="cal-sel" name="ora_m" aria-label="' + esc(T('Minuti')) + '">' + (function () { var o = '', mm = ora.slice(3, 5), c = false; for (var i = 0; i < 60; i += 5) { if (due(i) === mm) c = true; o += '<option' + (due(i) === mm ? ' selected' : '') + '>' + due(i) + '</option>'; } if (!c) o += '<option selected>' + esc(mm) + '</option>'; return o; })() + '</select></div>');
        h += campo(T('Ripeti'), segmenti('ripeti', [['mai', T('Mai')], ['settimana', T('Ogni settimana')], ['mese', T('Ogni mese')], ['anno', T('Ogni anno')]], ev ? ev.ripeti || 'mai' : 'mai') +
            '<div class="cal-fino" data-fino' + (ricorre ? '' : ' hidden') + '>' + interruttore('per_sempre', !(ev && ev.fino_al), T('Per sempre')) +
            '<div data-fino-data' + (ev && ev.fino_al ? '' : ' hidden') + '>' + miniCal('fino_al', ev && ev.fino_al ? ev.fino_al : '', ev ? ev.giorno : giorno) + '</div></div>');
        h += campo(T('Promemoria'), '<select class="cal-sel cal-sel-largo" name="promemoria">' + opzioniPromemoria(pr, tutto) + '</select>' +
            '<div class="cal-ora" data-pr-ora' + (pr === 'giorno_prima' || (pr === 'ora' && tutto) ? '' : ' hidden') + '><span class="cal-ora-et">' + esc(T('alle')) + '</span><select class="cal-sel" name="promemoria_ora">' +
            opzioniOre(15, 0, 23, prOra || (pr === 'giorno_prima' ? S.info.ora_sera || '20:00' : '09:00')) + '</select></div>');
        h += campo(T('Nota'), '<textarea class="cal-in-t cal-area" name="nota" maxlength="300" rows="2" placeholder="' + esc(T('Facoltativa')) + '">' + esc(ev ? ev.nota || '' : '') + '</textarea>');
        h += campo(T('Chi avvisare'), editorDestinatari(ev ? ev.destinatari : null, true, accDi(calDi(S.cal))));
        if (!nuovo) {
            h += '<div class="cal-pericolo">' + (ricorre ? '<button type="button" class="cal-btn cal-btn-rosso" data-f="elimina-uno">' + I('calendar-x-2') + '<span>' + esc(T('Elimina solo {g}', { g: giornoBreve(oc) })) + '</span></button>' : '') +
                 '<button type="button" class="cal-btn cal-btn-rosso" data-f="elimina-tutto">' + I('trash-2') + '<span>' + esc(ricorre ? T('Elimina tutta la serie') : T('Elimina impegno')) + '</span></button></div>';
        }
        apriFoglio(nuovo ? T('Nuovo impegno') : T('Modifica impegno'), h, function (el) {
            var titolo = (valore(el, 'titolo') || '').trim();
            if (!titolo) { avviso(T('Scrivi il titolo dell\'impegno')); return false; }
            var rip = valore(el, 'ripeti'), tt = valore(el, 'tutto'), p = valore(el, 'promemoria');
            var d = { titolo: titolo, giorno: valore(el, 'giorno'), ora: tt ? '' : valore(el, 'ora_h') + ':' + valore(el, 'ora_m'), nota: valore(el, 'nota') || '', ripeti: rip,
                      fino_al: rip !== 'mai' && !valore(el, 'per_sempre') ? valore(el, 'fino_al') || '' : '', promemoria: p,
                      promemoria_ora: p === 'giorno_prima' || (p === 'ora' && tt) ? valore(el, 'promemoria_ora') : '', destinatari: leggiDestinatari(el, true) };
            var vai = nuovo ? api('POST', '/api/calendari/' + S.cal + '/eventi', d) : api('PUT', '/api/calendari/eventi/' + ev.id, d);
            return vai.then(function (j) {
                var g = j.evento.giorno; if (nuovo || g !== ev.giorno) { S.sel = g; S.anno = +g.slice(0, 4); S.mese = +g.slice(5, 7); }
                toast(nuovo ? T('Impegno aggiunto') : T('Impegno salvato'));
                caricaTutto(true);
            });
        }, {
            cambio: function (t, el) {
                cambioDestinatari(t, el);
                var tt = valore(el, 'tutto'), p = valore(el, 'promemoria');
                if (t.name === 'tutto') {
                    mostra(el, '[data-ora]', !tt);
                    var s = el.querySelector('[name="promemoria"]'); s.innerHTML = opzioniPromemoria(p, tt); p = s.value;
                }
                if (t.name === 'ripeti') mostra(el, '[data-fino]', t.value !== 'mai');
                if (t.name === 'per_sempre') mostra(el, '[data-fino-data]', !t.checked);
                if (t.name === 'tutto' || t.name === 'promemoria') {
                    var vedi = p === 'giorno_prima' || (p === 'ora' && tt);
                    mostra(el, '[data-pr-ora]', vedi);
                    if (vedi && t.name === 'promemoria') { var po = el.querySelector('[name="promemoria_ora"]'); po.value = p === 'giorno_prima' ? (S.info.ora_sera || '20:00') : '09:00'; }
                }
                if (t.classList && t.classList.contains('cal-data')) {   // primo giorno cambiato: "fino al" non puo' venire prima
                    var gg = valore(el, 'giorno'), fm = el.querySelector('.cal-data[data-nome="fino_al"] .cal-mini'); if (fm) fm.setAttribute('data-min', gg);
                }
            },
            azione: function (a, b) {
                if (azioneMini(a, b)) return;
                if (a === 'elimina-uno') {
                    domanda(T('Togliere l\'impegno «{t}» solo da {g}? Gli altri giorni restano.', { t: ev.titolo, g: giornoLungo(oc) }), { titolo: T('Elimina'), si: T('Elimina'), no: T('Annulla'), pericolo: true }).then(function (si) {
                        if (!si) return;
                        api('DELETE', '/api/calendari/eventi/' + ev.id + '?giorno=' + oc).then(function () { chiudiFoglio(); toast(T('Impegno tolto da quel giorno')); caricaTutto(true); }).catch(errore);
                    });
                } else if (a === 'elimina-tutto') {
                    domanda(ricorre ? T('Eliminare «{t}» in tutti i giorni in cui si ripete?', { t: ev.titolo }) : T('Eliminare l\'impegno «{t}»?', { t: ev.titolo }), { titolo: T('Elimina'), si: T('Elimina'), no: T('Annulla'), pericolo: true }).then(function (si) {
                        if (!si) return;
                        api('DELETE', '/api/calendari/eventi/' + ev.id).then(function () { chiudiFoglio(); toast(T('Impegno eliminato')); caricaTutto(true); }).catch(errore);
                    });
                }
            }
        });
    }
    function opzioniPromemoria(val, tutto) {
        var v = [['nessuno', T('Nessuno')], ['ora', tutto ? T('Il giorno stesso') : T('All\'ora dell\'impegno')]];
        if (!tutto) v.push(['15m', T('15 minuti prima')], ['1h', T('1 ora prima')]);
        v.push(['giorno_prima', T('Il giorno prima')]);
        if (tutto && (val === '15m' || val === '1h')) val = 'ora';
        return v.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === val ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('');
    }

    /* ---------------------------------------------------------------- raccolta rifiuti */
    function settimanaSi(t) {   // questa settimana e' una "si'"? (riferimento = lunedi' di una settimana si')
        if (!t.alterna || !t.riferimento) return true;
        var n = Math.round((dataD(lunedi(S.info.oggi)) - dataD(lunedi(t.riferimento))) / 864e5 / 7);
        return n % 2 === 0;
    }
    function rigaTipo(t, i) {
        var giorni = t.giorni || [];
        return '<div class="cal-rt" data-i="' + i + '"' + (t.id ? ' data-id="' + t.id + '"' : '') + ' style="--c:' + colore(t.colore) + '">' +
            '<div class="cal-rt-testa"><button type="button" class="cal-rt-col" data-f="rt-colore" aria-label="' + esc(T('Colore')) + '"><i></i></button>' +
            '<input type="text" class="cal-in-t" name="rt_nome" maxlength="30" value="' + esc(t.nome || '') + '" placeholder="' + esc(T('Nome della raccolta')) + '" aria-label="' + esc(T('Nome della raccolta')) + '">' +
            '<button type="button" class="cal-ico-btn" data-f="rt-togli" aria-label="' + esc(T('Togli')) + '">' + I('x') + '</button></div>' +
            '<input type="hidden" name="rt_colore" value="' + colore(t.colore) + '">' +
            '<div class="cal-rt-pal" hidden>' + COLORI.map(function (k) { return '<button type="button" class="cal-col" data-f="rt-col" data-v="' + k + '" style="--c:' + k + '" aria-label="' + k + '"></button>'; }).join('') + '</div>' +
            '<div class="cal-rt-giorni" role="group">' + GIORNI_B.map(function (n, d) {
                return '<label class="cal-gs"><input type="checkbox" name="rt_g" value="' + d + '"' + (giorni.indexOf(d) >= 0 ? ' checked' : '') + ' aria-label="' + esc(GIORNI[d]) + '"><span>' + esc(n) + '</span></label>';
            }).join('') + '</div>' +
            interruttore('rt_alterna', !!t.alterna, T('Una settimana sì e una no')) +
            '<div class="cal-rt-alt"' + (t.alterna ? '' : ' hidden') + '><span class="cal-ora-et">' + esc(T('Questa settimana')) + '</span>' + segmenti('rt_questa_' + i, [['si', T('Sì')], ['no', T('No')]], settimanaSi(t) ? 'si' : 'no') + '</div></div>';
    }
    function foglioRifiuti(c) {
        if (!c || !S.dati) return;
        var tipi = (S.dati.tipi || []).slice(), imp = c.impostazioni || {}, n = tipi.length;
        var h = '<div class="cal-campo-nota cal-nota-alta">' + esc(T('Scegli i giorni di ogni raccolta come nel calendario del comune. Le raccolte senza giorni non compaiono.')) + '</div>';
        h += '<div class="cal-rts">' + tipi.map(rigaTipo).join('') + '</div>';
        h += '<button type="button" class="cal-btn cal-btn-largo" data-f="rt-nuovo">' + I('plus') + '<span>' + esc(T('Aggiungi una raccolta')) + '</span></button>';
        h += campo(T('Avviso la sera prima'), interruttore('avviso', imp.avviso !== false, T('Avvisa la sera prima')) +
            '<div class="cal-ora" data-avv' + (imp.avviso === false ? ' hidden' : '') + '><span class="cal-ora-et">' + esc(T('alle')) + '</span><select class="cal-sel cal-sel-largo" name="ora">' +
            opzioniOre(15, 12, 23, imp.ora || '', '<option value="">' + esc(T('Come nella card ({ora})', { ora: S.info.ora_sera || '20:00' })) + '</option>') + '</select></div>',
            T('Per esempio «Domani: Plastica e Carta». A chi arriva si sceglie in Modifica.'));
        apriFoglio(T('Calendario del comune'), h, function (el) {
            var lun = lunedi(S.info.oggi), fuori = [], vuoto = false;
            [].forEach.call(el.querySelectorAll('.cal-rt'), function (r) {
                var nome = r.querySelector('[name="rt_nome"]').value.trim(); if (!nome) { vuoto = true; return; }
                var t = { nome: nome, colore: r.querySelector('[name="rt_colore"]').value, giorni: [].map.call(r.querySelectorAll('[name="rt_g"]:checked'), function (x) { return +x.value; }),
                          alterna: r.querySelector('[name="rt_alterna"]').checked };
                if (r.getAttribute('data-id')) t.id = +r.getAttribute('data-id');
                if (t.alterna) { var q = r.querySelector('.cal-rt-alt input:checked'); t.riferimento = q && q.value === 'no' ? piuGiorni(lun, 7) : lun; }
                fuori.push(t);
            });
            if (vuoto) { avviso(T('Ogni raccolta deve avere un nome')); return false; }
            return api('PUT', '/api/calendari/' + c.id + '/rifiuti', { tipi: fuori, impostazioni: { avviso: !!valore(el, 'avviso'), ora: valore(el, 'ora') || '' } }).then(function (j) {
                c.impostazioni = Object.assign({}, c.impostazioni || {}, j.impostazioni || {});
                toast(T('Calendario del comune salvato'));
                caricaTutto(true);
            });
        }, {
            cambio: function (t, el) {
                if (t.name === 'avviso') mostra(el, '[data-avv]', t.checked);
                if (t.name === 'rt_alterna') { var a = t.closest('.cal-rt').querySelector('.cal-rt-alt'); a.hidden = !t.checked; }
            },
            azione: function (a, b, el) {
                var r = b.closest('.cal-rt');
                if (a === 'rt-colore') { var p = r.querySelector('.cal-rt-pal'); p.hidden = !p.hidden; }
                else if (a === 'rt-col') { r.querySelector('[name="rt_colore"]').value = b.getAttribute('data-v'); r.style.setProperty('--c', b.getAttribute('data-v')); r.querySelector('.cal-rt-pal').hidden = true; }
                else if (a === 'rt-togli') {
                    var nome = r.querySelector('[name="rt_nome"]').value.trim() || T('questa raccolta');
                    domanda(T('Togliere «{n}» dal calendario?', { n: nome }), { titolo: T('Togli'), si: T('Togli'), no: T('Annulla'), pericolo: true }).then(function (si) { if (si) r.remove(); });
                } else if (a === 'rt-nuovo') {
                    var box = el.querySelector('.cal-rts'), usati = [].map.call(el.querySelectorAll('[name="rt_colore"]'), function (x) { return x.value.toUpperCase(); });
                    var col = COLORI.filter(function (k) { return usati.indexOf(k.toUpperCase()) < 0; })[0] || COLORI[0];
                    box.insertAdjacentHTML('beforeend', rigaTipo({ nome: '', colore: col, giorni: [] }, n++));
                    icone(box.lastElementChild);
                    var inp = box.lastElementChild.querySelector('[name="rt_nome"]'); if (inp) inp.focus();
                }
            }
        });
    }

    /* ======================================================================
       APERTURA, CHIUSURA, PAUSE
       ====================================================================== */
    var timer = 0, GIRO_MS = 120000;
    function aperta() { return root.classList.contains('active'); }
    function pianifica() {
        clearTimeout(timer); timer = 0;
        if (!aperta() || document.hidden) return;
        timer = setTimeout(function () { if (!foglio) caricaTutto(true); pianifica(); }, GIRO_MS);
    }
    function apri() {
        html.classList.add('wh-calendari');
        if (!frasiChieste) {          // inglese: prima le frasi (una volta), poi tutto il resto
            frasiChieste = true;
            var fallite = false;    // frasi non arrivate: la pagina va in italiano adesso, si riprova alla prossima apertura
            api('GET', '/api/calendari/frasi?lingua=en').then(function (j) { DIZ = (j && j.frasi) || {}; }, function () { fallite = true; })
                .then(function () { if (aperta()) apri(); if (fallite) frasiChieste = false; });
            return;
        }
        // prima volta: attesa e poi i pannelli con l'entrata; le volte dopo il contenuto c'e' gia' (la sezione entra con la
        // sua dissolvenza di mobile.html): niente seconda entrata, la rilettura aggiorna solo cio' che e' cambiato
        if (!S.carico) disegna(true);
        caricaTutto(!S.carico ? false : true);
        pianifica();
    }
    function chiudi() {
        html.classList.remove('wh-calendari');
        clearTimeout(timer); timer = 0;
        chiudiFoglio(true);
    }
    if ('MutationObserver' in window) {
        var eraAperta = aperta();
        new MutationObserver(function () { var a = aperta(); if (a === eraAperta) return; eraAperta = a; if (a) apri(); else chiudi(); }).observe(root, { attributes: true, attributeFilter: ['class'] });
    }
    document.addEventListener('visibilitychange', function () {
        if (!aperta()) return;
        if (document.hidden) { clearTimeout(timer); timer = 0; }
        else { if (Date.now() - S.tCarico > 30000 && !foglio) caricaTutto(true); pianifica(); }
    });
    // indirizzo /mobile#calendari: si apre la sezione
    function daIndirizzo() {
        if (location.hash !== '#calendari') return;
        var voce = document.querySelector('.wh-nav-calendari');
        if (voce && typeof window.switchRoom === 'function' && !aperta()) window.switchRoom('room-calendari', voce);
    }
    window.addEventListener('hashchange', daIndirizzo);

    window.__whCalendari = {   // per le prove (sola lettura) e per riaprire un calendario
        stato: function () { return { aperta: aperta(), vista: S.vista, cal: S.cal, anno: S.anno, mese: S.mese, sel: S.sel, carico: S.carico, inattivo: S.inattivo, timer: !!timer, foglio: !!foglio, n: S.calendari.length, oggi: S.info && S.info.oggi }; },
        apri: function (id, g) { apriCal(id, g); },
        ricarica: function () { return caricaTutto(true); }
    };
    if (aperta()) apri();
    if (document.readyState === 'complete') daIndirizzo(); else window.addEventListener('load', daIndirizzo);
})();
