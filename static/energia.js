/* ============================================================================
   ENERGIA - sezione dell'app (mobile.html), dati veri dagli inverter (inverter.py)
   Design "professionale" approvato il 03/10/2026 (scratchpad/energia_v2/gen.py + scena.py): testata con periodo,
   flussi in due viste (Scena / Schema, scelta per dispositivo), Adesso, cinque indicatori, andamento, batteria,
   contatore, costi, dove va l'energia, chi consuma, ultimi 7 giorni, inverter.
   Caricato SOLO se inverter_attivo (script in mobile.html dentro {% if inverter_attivo %}).

   DATI
     GET /api/inverter/adesso   ogni 3 s (sezione aperta e scheda visibile): flussi vivi, energie e costi di oggi,
                                soglia, stato degli inverter.
     GET /api/energia/dati      all'apertura e ogni 60 s: giornata ogni 15 min, previsione, ieri alla stessa ora,
                                picchi, minuti oltre soglia, alba/tramonto, impianto, consumo recente, CO2, orologio.
     GET /api/inverter/giorni   ?giorni=7 (ultimi 7 giorni, periodo Settimana) e ?mesi=1 (costi del mese, periodo
                                Mese) ogni 60 s; ?mesi=12 solo col periodo Anno (ogni 5 min).
     GET/POST /api/energia/vista  Scena / Schema di questo dispositivo (ripiego: localStorage wh_energia_vista).
   SEGNI (unico punto: adattaSegni): quelli dell'API (inverter/PROGETTO.md sez. 1), che la pagina tiene:
     rete_w + prelievo / - immissione;  batteria_w + carica / - scarica.
   ANIMAZIONI: solo CSS (energia.css), nessun requestAnimationFrame e nessun timer per fotogramma. Qui si mettono
   le classi: en-ferma (scheda nascosta), en-fuori (riquadro dei flussi fuori dallo schermo), en-anima (entrata).
   TESTI: frasi italiane in T; con l'inglese passano da window.WH_T (en.json, per_pagina['/mobile']); le parole che
   nel dizionario hanno gia' un'altra resa (Rete = Network...) hanno una chiave propria (CHIAVI_TR).
   ============================================================================ */
(function () {
    'use strict';
    var root = document.getElementById('room-energia');
    if (!root || window.__whEnergia) return;
    var $ = function (id) { return document.getElementById('en-' + id); };
    var html = document.documentElement;
    var inn = $('in');
    var LINGUA = (window.WH_LINGUA || html.getAttribute('lang') || 'it').slice(0, 2);
    var EN = LINGUA === 'en';
    var DEC = EN ? '.' : ',', MIGL = EN ? ',' : '.';
    var LOCALE = EN ? 'en-GB' : 'it-IT';
    var ridotto = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    function leggera() { return html.classList.contains('wh-leggera'); }

    /* ======================================================================
       TESTI
       ====================================================================== */
    var T = {
        tempoReale: 'In tempo reale', aggS: 'aggiornato {n} s fa', aggMin: 'aggiornato {n} min fa', aggAdesso: 'aggiornato adesso',
        attesaDati: 'In attesa dei dati', offline: 'Inverter non raggiungibile',
        nInverter: '{n} inverter', battKwh: 'batteria {v}', contratto: 'contratto {v}',
        fotovoltaico: 'Fotovoltaico', batteria: 'Batteria', casa: 'Casa', rete: 'Rete',
        produce: 'sta producendo', producePct: 'sta producendo · {p}% del massimo', pocaLuce: 'poca luce', inAttesa: 'in attesa',
        notte: 'notte', notteAlba: 'notte · alba alle {ora}',
        siCarica: 'si carica · {w}', siScarica: 'si scarica · {w}', piena: 'piena', ferma: 'ferma', allaRiserva: 'alla riserva',
        tuttaSole: 'tutta dal sole', tuttaBatt: 'tutta dalla batteria', tuttaRete: 'tutta dalla rete', stimato: 'consumo stimato',
        dalSole: 'sole', dallaBatt: 'batteria', dallaRete: 'rete',
        inImmissione: 'in immissione', inPrelievo: 'in prelievo', inEquilibrio: 'in equilibrio',
        autoOra: 'autosufficienza in questo momento {p}%',
        adBattCarica: 'Batteria · in carica', adBattScarica: 'Batteria · si scarica', adBattFerma: 'Batteria · ferma',
        adReteImm: 'Rete · immissione', adRetePrel: 'Rete · prelievo', adReteEq: 'Rete · in equilibrio',
        prodOggi: 'Prodotta oggi', consOggi: 'Consumata oggi', rispOggi: 'Risparmio oggi',
        prodPer: 'Prodotta', consPer: 'Consumata', rispPer: 'Risparmio',
        rispIeri: '{d}% rispetto a ieri alla stessa ora', ieriOra: "ieri a quest'ora {v}", dalleOre: 'dalle 00:00 alle {ora}', stimata: 'stimata (senza misuratore)',
        presiRete: '{v} presi dalla rete', autoImm: 'autoconsumo + immissione', prezziNo: 'prezzi non impostati',
        co2Nota: '{v} kg di CO₂ per kWh di rete (ISPRA)',
        in7: 'in 7 giorni', daInizioMese: 'da inizio mese', in12: 'in 12 mesi', giorniDati: '{n} giorni con dati', mesiDati: '{n} mesi con dati', giorno1: '1 giorno con dati', mese1: '1 mese con dati', consStima: 'consumati (stima)',
        andOggi: 'Andamento di oggi', andSett: 'Andamento della settimana', andMese: 'Andamento di {mese}', andAnno: 'Andamento degli ultimi 12 mesi',
        consumo: 'Consumo', nessunDatoOggi: 'Ancora nessun dato per oggi', nessunDatoPer: 'Nessun dato per questo periodo',
        caricaA: 'Si carica a <b>{w}</b>', scaricaA: 'Si scarica a <b>{w}</b>', battFerma: 'Ferma', battPiena: 'Piena', battRiserva: 'Alla riserva',
        pienaVerso: 'Piena verso le <b>{ora}</b>', riservaVerso: 'Alla riserva verso le <b>{ora}</b>', autonomia: 'Autonomia stimata <b>{d}</b>',
        riservaPct: 'riserva {p}%',
        suSoglia: 'kW su {v}', prelevati: 'kW prelevati', margine: 'Margine di <b>{w}</b> sulla soglia', oltreSoglia: 'Oltre la soglia · tollerata fino a <b>{w}</b>',
        immettendo: 'Nessun prelievo · stai immettendo <b>{w}</b>', sogliaNo: 'Soglia del contratto non impostata',
        piccoOggi: 'picco di oggi <b>{w}</b> alle {ora}', minOltre: '<b>{n} min</b> oltre la soglia',
        costiMese: 'Costi di {mese}', costi7: 'Costi degli ultimi 7 giorni', costi12: 'Costi degli ultimi 12 mesi',
        spesiMese: 'spesi questo mese', spesi7: 'spesi in 7 giorni', spesi12: 'spesi in 12 mesi', kwhPrel: '{v} kWh prelevati',
        F1q: 'Lun–ven 8–19', F2q: 'Sera e sabato', F3q: 'Notte e festivi', MONOq: 'Tutte le ore', mono: 'Mono',
        costiNota: 'Prezzi non impostati: si vedono solo i kWh prelevati.',
        prodDove: 'Prodotta · {v}', consDove: 'Consumata · {v}', prodDoveOggi: 'Prodotta oggi · {v}', consDoveOggi: 'Consumata oggi · {v}',
        usataCasa: 'Usata subito in casa {p}%', inBatt: 'In batteria {p}%', vendutaRete: 'Venduta alla rete {p}%',
        daSole: 'Dal sole {p}%', daBatt: 'Dalla batteria {p}%', daRete: 'Dalla rete {p}%', nessunaProd: 'Ancora nessuna produzione',
        nessunaPresa: 'Nessuna presa con misura sta consumando',
        oggi: 'Oggi',
        invFunzione: 'In funzione', invAttesa: 'In attesa', invLimitato: 'Produzione limitata', invGuasto: 'Guasto', invOffline: 'Non raggiungibile',
        invAvvio: 'Avvio', invSpento: 'Spento', potenzaAdesso: 'Potenza adesso', piccoDiOggi: 'Picco di oggi', totaleProd: 'Prodotta in totale',
        firmware: 'firmware {v}', alleOra: '{w} alle {ora}', ore: 'h', min: 'min', scena: 'Scena', schema: 'Schema'
    };
    var CHIAVI_TR = { scena: 'Scena (vista)', schema: 'Schema (vista)', rete: 'Rete (energia)', consumo: 'Consumo (energia)', ferma: 'ferma (batteria)', battFerma: 'Ferma (batteria)',
                      dalSole: 'sole (fonte)', dallaBatt: 'batteria (fonte)', dallaRete: 'rete (fonte)', casa: 'Casa (energia)', oggi: 'Oggi (giorno)' };
    if (EN && typeof window.WH_T === 'function') {
        Object.keys(T).forEach(function (k) {
            var chiave = CHIAVI_TR[k] || T[k], v = window.WH_T(chiave);
            if (typeof v === 'string' && v !== chiave) T[k] = v;
        });
    }
    function t(k, v) { return T[k].replace(/\{(\w+)\}/g, function (_, n) { return v && v[n] !== undefined ? v[n] : ''; }); }
    // titoli dei nodi e legenda (zone data-no-tr: la parola "Rete" nel dizionario e' "Network")
    [].forEach.call(root.querySelectorAll('.en-viste .en-eti-t'), function (e) {
        var s = e.textContent.trim(), k = { 'Fotovoltaico': 'fotovoltaico', 'Batteria': 'batteria', 'Casa': 'casa', 'Rete': 'rete' }[s];
        if (k) e.textContent = T[k];
    });
    $('and-l-cons').textContent = T.consumo;
    // tasti Scena / Schema (qui e in Impostazioni): data-no-tr, il dizionario ha gia' "Scene" (plurale italiano) = Scenes
    [].forEach.call(document.querySelectorAll('#en-vista-sel button, [data-en-vista]'), function (b) {
        var v = b.getAttribute('data-v') || b.getAttribute('data-en-vista'); if (T[v]) b.textContent = T[v];
    });

    /* ======================================================================
       NUMERI
       ====================================================================== */
    function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
    function dec(x, n) { var s = x.toFixed(n); var p = s.split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, MIGL); return p.join(DEC); }
    function intero(x) { return dec(Math.round(x), 0); }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
    function wParti(w) { var a = Math.abs(w); if (a < 1000) return [intero(a), 'W']; return [dec(a / 1000, a < 10000 ? 2 : 1), 'kW']; }
    function fmtW(w) { var p = wParti(w); return p[0] + ' ' + p[1]; }
    function fmtKw(w) { var k = w / 1000; return (Math.abs(k - Math.round(k)) < 0.001 ? String(Math.round(k)) : dec(k, 1)) + ' kW'; }
    function kwhParti(x) { return [dec(x, x < 100 ? 1 : 0), 'kWh']; }
    function fmtKwh(x) { return x >= 1000 ? dec(x / 1000, x < 10000 ? 2 : 1) + ' MWh' : dec(x, x < 100 ? 1 : 0) + ' kWh'; }
    function kwhBreve(x) { var r = Math.round(x * 10) / 10; return dec(r, r % 1 ? 1 : 0) + ' kWh'; }
    function fmtEuro(x, n) { n = n === undefined ? 2 : n; return EN ? '€' + dec(x, n) : '€ ' + dec(x, n); }
    function fmtOra(h) { var m = Math.round(h * 60) % 1440; if (m < 0) m += 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
    function fmtDurata(ore) { var m = Math.round(ore * 60); if (m < 60) return m + ' ' + T.min; return Math.floor(m / 60) + ' ' + T.ore + (m % 60 ? ' ' + pad(m % 60) + ' ' + T.min : ''); }
    function hDa(hhmm) { if (!hhmm) return null; var p = String(hhmm).split(':'); return (+p[0]) + (+p[1]) / 60; }
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function maiuscola(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

    /* scritture nel DOM solo se il valore cambia */
    function scrivi(el, s) { if (el && el.__v !== s) { el.__v = s; el.textContent = s; } }
    function scriviHtml(el, s) { if (el && el.__h !== s) { el.__h = s; el.innerHTML = s; } }
    function scriviNum(el, v, u) { scriviHtml(el, esc(v) + (u ? '<small>' + esc(u) + '</small>' : '')); }
    function stile(el, p, v) { if (!el) return; v = String(v); var c = el.__st || (el.__st = {}); if (c[p] === v) return; c[p] = v; el.style.setProperty(p, v); }
    function attr(el, n, v) { if (!el) return; v = String(v); var c = el.__a || (el.__a = {}); if (c[n] === v) return; c[n] = v; el.setAttribute(n, v); }
    function classe(el, c, si) { if (el && el.classList.contains(c) !== !!si) el.classList.toggle(c, !!si); }
    function nascondi(el, si) { if (el && el.hasAttribute('hidden') !== !!si) { if (si) el.setAttribute('hidden', ''); else el.removeAttribute('hidden'); } }   // anche per gli elementi SVG

    /* ======================================================================
       ADATTATORE DEI SEGNI (unico punto): la pagina tiene la convenzione dell'API
       rete + prelievo / - immissione;  batt + carica / - scarica;  casa senza misuratore = stima (pv - carica + scarica)
       ====================================================================== */
    function adattaSegni(pv_w, casa_w, rete_w, batteria_w, soc) {
        var pv = num(pv_w), rete = num(rete_w), batt = num(batteria_w), casa = num(casa_w);
        if (casa === null && pv !== null) casa = Math.max(0, pv - (batt || 0));
        return { pv: pv, casa: casa, rete: rete, batt: batt, soc: num(soc) };
    }

    /* ======================================================================
       STATO
       ====================================================================== */
    var S = { pronto: false, batt: false, rete: false, offline: false, prese: false };
    var API = null, DATI = null, G7 = null, GM = null, GA = null;
    var vivo = { pv: 0, casa: 0, rete: 0, batt: 0, soc: null };
    var fl = {};                                   // flussi ripartiti (W, >= 0)
    var orologio = { h0: null, t0: 0, v: 1, data: null };
    var periodo = 'oggi', vista = null;
    function oraCasa() {
        if (orologio.h0 === null) { var d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; }
        return (orologio.h0 + (Date.now() - orologio.t0) / 3600000 * orologio.v) % 24;
    }
    function dataCasa() {   // Date (mezzogiorno locale) della data di casa
        var s = orologio.data || (DATI && DATI.orologio && DATI.orologio.data);
        if (s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0); }
        return new Date();
    }
    function imp() { return (DATI && DATI.impianto) || {}; }
    function prezzi() { return (DATI && DATI.tariffa && DATI.tariffa.prezzi) || {}; }
    function tipoTariffa() { return (API && API.tariffa && API.tariffa.tipo) || (DATI && DATI.tariffa && DATI.tariffa.tipo) || 'mono'; }
    function fasciaOra() { return (API && API.tariffa && API.tariffa.fascia) || (DATI && DATI.tariffa && DATI.tariffa.fascia) || null; }

    /* alba e tramonto: quelli di /api/energia/dati (storico); senza, una stima astronomica per l'Italia (42 N, 12,5 E,
       ora di casa con l'ora legale europea) */
    function albaTramonto() {
        var s = (DATI && DATI.sole) || {}, a = hDa(s.alba), tr = hDa(s.tramonto);
        if (a !== null && tr !== null && tr > a) return [a, tr];
        var d = dataCasa(), y = d.getFullYear();
        var inizio = new Date(y, 0, 1, 12), n = Math.round((d - inizio) / 86400000) + 1;
        var decl = 23.44 * Math.sin(2 * Math.PI * (284 + n) / 365) * Math.PI / 180, lat = 42 * Math.PI / 180;
        var h0 = Math.acos(clamp(-Math.tan(lat) * Math.tan(decl) - 0.0145, -1, 1)) * 12 / Math.PI;
        function ultimaDomenica(m) { var x = new Date(y, m + 1, 0); return x.getDate() - x.getDay(); }
        var legale = (d.getMonth() > 2 && d.getMonth() < 9) || (d.getMonth() === 2 && d.getDate() >= ultimaDomenica(2)) || (d.getMonth() === 9 && d.getDate() < ultimaDomenica(9));
        var mezzo = 12 + (15 - 12.5) / 15 + (legale ? 1 : 0);
        var A = a !== null ? a : mezzo - h0, B = tr !== null ? tr : mezzo + h0;
        return B > A ? [A, B] : [mezzo - h0, mezzo + h0];
    }

    /* ======================================================================
       SCENA (disegno nativo 668 x 330 di scena.py)
       ====================================================================== */
    (function costruisciScena() {
        var r = '';
        for (var a = 0; a < 360; a += 30) r += '<line x1="0" y1="-46" x2="0" y2="-58" transform="rotate(' + a + ')"/>';
        $('raggi').innerHTML = r;
        var p = '';
        for (var i = 0; i < 4; i++) {
            for (var j = 0; j < 2; j++) {
                var t0 = 0.12 + i * 0.2, t1 = t0 + 0.17, k0 = j, k1 = j + 0.85;
                var pt = function (tt, k) { return [334 + 84 * tt - 9 * k, 178 + 62 * tt + 13 * k]; };
                var A = pt(t0, k0), B = pt(t1, k0), C = pt(t1, k1), D = pt(t0, k1);
                p += '<path d="M' + A[0].toFixed(1) + ' ' + A[1].toFixed(1) + ' L' + B[0].toFixed(1) + ' ' + B[1].toFixed(1) + ' L' + C[0].toFixed(1) + ' ' + C[1].toFixed(1) + ' L' + D[0].toFixed(1) + ' ' + D[1].toFixed(1) + ' Z"/>';
            }
        }
        $('pannelli').innerHTML = p;
        var seme = 7, s = '', b = '';
        function rnd() { seme = (seme * 9301 + 49297) % 233280; return seme / 233280; }
        for (var q = 0; q < 46; q++) {
            var x = rnd() * 668, y = rnd() * 200, rr = 0.6 + rnd() * 1.1;
            if (x < 170 && y < 150) continue;                       // dove sta la luna
            if (x > 214 && x < 470 && y > 16 && y < 130) continue;  // testo del fotovoltaico nel cielo (left 34,7%, top 10,3%) con 25-30 px di aria
            if (q % 7 === 0) b += '<i style="left:' + (x - 1.3).toFixed(1) + 'px;top:' + (y - 1.3).toFixed(1) + 'px;animation-delay:-' + (rnd() * 3).toFixed(2) + 's"></i>';   // stelline che brillano (HTML)
            else s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + rr.toFixed(2) + '" opacity="' + (0.5 + rnd() * 0.5).toFixed(2) + '"/>';
        }
        $('stelle').innerHTML = s;
        $('stelle-b').innerHTML = b;
        var h = '';
        ['sole', 'batt', 'rete'].forEach(function (l) { for (var n = 0; n < 6; n++) h += '<span class="en-pt en-pt-' + l + '" data-l="' + l + '" hidden></span>'; });
        $('pt-strato').insertAdjacentHTML('beforeend', h);
    })();
    var particelleOk = true;
    /* keyframe di transform lungo le tre curve (quadratiche di scena.py): 13 punti, opacita' che entra ed esce come
       'corri' del mockup; quella del sole cambia con l'altezza del sole */
    var CURVE = { sole: [[140, 104], [236, 112], [368, 204]], batt: [[262, 300], [190, 326], [120, 292]], rete: [[406, 296], [478, 326], [548, 288]] };
    function keyframes(nome, c) {
        var s = '@keyframes en-pk-' + nome + ' {';
        for (var i = 0; i <= 12; i++) {
            var u = i / 12, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, d = u * u;
            var x = a * c[0][0] + b * c[1][0] + d * c[2][0], y = a * c[0][1] + b * c[1][1] + d * c[2][1];
            var op = i === 0 || i === 12 ? 0 : (i === 1 || i === 11 ? 0.7 : 1);
            s += ' ' + (u * 100).toFixed(2) + '% { transform: translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px); opacity: ' + op + '; }';
        }
        return s + ' }';
    }
    function scriviKeyframes() { $('pk-stile').textContent = ['sole', 'batt', 'rete'].map(function (k) { return keyframes(k, CURVE[k]); }).join('\n'); }
    scriviKeyframes();
    var linee = { sole: { n: 0, inv: null, prel: null }, batt: { n: 0, inv: null, prel: null }, rete: { n: 0, inv: null, prel: null } };
    var DURATE = { sole: 2.0, batt: 2.4, rete: 2.2 };
    function quante(w) { return w < 40 ? 0 : clamp(2 + Math.floor(w / 2000), 2, 6); }
    function particelle(l, w, inversa, prel) {
        var n = particelleOk ? quante(w) : 0, L = linee[l];
        if (L.n === n && L.inv === inversa && L.prel === prel) return;
        var pts = $('pt-strato').querySelectorAll('.en-pt-' + l);
        for (var i = 0; i < pts.length; i++) {
            var e = pts[i];
            if (i < n) {
                if (L.n !== n) e.style.setProperty('--dl', (-DURATE[l] * i / n).toFixed(2) + 's');
                classe(e, 'en-inv', inversa); classe(e, 'en-prel', prel);
                nascondi(e, false);
            } else nascondi(e, true);
        }
        L.n = n; L.inv = inversa; L.prel = prel;
    }
    // il riquadro cambia larghezza: scala delle particelle (disegnate nelle coordinate native)
    function scalaScena() {
        var q = $('sc-quadro'), w = q.clientWidth;
        if (w) stile(q, '--en-k', (w / 668).toFixed(4));
    }
    var dySole = null;
    function aggiornaCielo() {
        var h = oraCasa(), at = albaTramonto(), A = at[0], B = at[1];
        var f = { notte: 0, alba: 0, giorno: 0, tramonto: 0 };
        var M = 0.75;                                               // tre quarti d'ora prima e dopo
        if (h < A - M || h > B + M) f.notte = 1;
        else if (h < A + M) { var x = (h - (A - M)) / (2 * M); f.alba = 1 - Math.abs(x - 0.5) * 2 * 0.6; f.giorno = clamp((x - 0.5) * 2, 0, 1); }
        else if (h > B - M) { var y = (h - (B - M)) / (2 * M); f.tramonto = 1 - Math.abs(y - 0.5) * 2 * 0.6; f.giorno = clamp(1 - y * 2, 0, 1); }
        else f.giorno = 1;
        attr($('cielo-alba'), 'opacity', f.alba.toFixed(2));
        attr($('cielo-giorno'), 'opacity', f.giorno.toFixed(2));
        attr($('cielo-tramonto'), 'opacity', f.tramonto.toFixed(2));
        var giorno = h > A - 0.25 && h < B + 0.25;
        var luce = giorno ? Math.sin(Math.PI * clamp((h - (A - 0.25)) / (B - A + 0.5), 0, 1)) : 0;   // altezza del sole 0..1
        var st = (f.notte ? 1 : clamp(1 - luce * 4, 0, 1) * 0.5).toFixed(2);
        attr($('stelle'), 'opacity', st); stile($('stelle-b'), 'opacity', st);
        attr($('luna'), 'opacity', giorno ? '0' : '1');
        stile($('sole'), 'opacity', giorno ? '1' : '0');
        var dy = Math.round(88 * Math.pow(1 - luce, 1.6) / 2) * 2;           // basso all'alba e al tramonto (sopra la batteria)
        if (dy !== dySole) {
            dySole = dy;
            stile($('sole'), 'transform', 'translateY(' + dy + 'px)');
            CURVE.sole = [[140, 104 + dy], [236, 112 + dy * 0.5], [368, 204]];
            attr($('sc-via-sole'), 'd', 'M140 ' + (104 + dy) + ' Q236 ' + (112 + dy * 0.5) + ' 368 204');
            stile($('sc-p-sole'), 'top', ((130 + dy * 0.62) / 330 * 100).toFixed(2) + '%');   // la pillola resta sulla linea
            scriviKeyframes();
        }
        stile($('sole-basso'), 'opacity', clamp(1 - luce * 2.2, 0, 0.85).toFixed(2));
        classe($('sc-via-sole'), 'en-notte', !giorno);                         // di notte la linea del sole non c'e'
        var nuv = f.notte ? 0.35 : 1;
        stile($('nuvola1'), 'opacity', nuv); stile($('nuvola2'), 'opacity', nuv);
        return { giorno: giorno, luce: luce, A: A, B: B, h: h };
    }

    /* ======================================================================
       SCHEMA (flussi() di gen.py): sole in alto, batteria, casa, rete
       ====================================================================== */
    var sch = { W: 0, H: 0, mob: null, nodi: null };
    var LINEE_SCH = [   // id, da, a, piega (gen.py), lenta
        ['pv_casa', 'sole', 'casa', 0, false], ['pv_batt', 'sole', 'batt', 40, true], ['pv_rete', 'sole', 'rete', 40, true],
        ['batt_casa', 'batt', 'casa', 0, true], ['rete_casa', 'rete', 'casa', 0, false]
    ];
    function costruisciSchema() {
        var box = $('sch'), bw = box.clientWidth;
        if (!bw) return;
        var mob = bw < 520, W = mob ? 338 : 700, H = mob ? 360 : 420, R = mob ? 34 : 46;
        stile(box, '--en-sk', (bw / W).toFixed(4));
        stile(box, '--en-r', (R * bw / W).toFixed(1) + 'px');
        if (sch.mob === mob && sch.nodi) return;
        sch.mob = mob; sch.W = W; sch.H = H;
        // nodi in basso presenti (senza batteria o senza misuratore si ridistribuiscono: niente buchi)
        var sotto = (S.batt ? ['batt'] : []).concat(['casa'], S.rete ? ['rete'] : []), cy = H * 0.6;
        var POS = { 3: [0.15, 0.5, 0.85], 2: [0.3, 0.7], 1: [0.5] }[sotto.length];
        var N = sch.nodi = { batt: [W * 0.15, cy], casa: [W / 2, cy], rete: [W * 0.85, cy] };
        sotto.forEach(function (k, i) { N[k] = [W * POS[i], cy]; });
        N.sole = [N.casa[0], H * 0.17];
        var serve = { pv_batt: S.batt, batt_casa: S.batt, pv_rete: S.rete, rete_casa: S.rete, pv_casa: true };
        function curva(a, b, piega) { var p = N[a], q = N[b]; return { d: 'M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' Q' + ((p[0] + q[0]) / 2).toFixed(1) + ' ' + ((p[1] + q[1]) / 2 + piega).toFixed(1) + ' ' + q[0].toFixed(1) + ' ' + q[1].toFixed(1), m: [(p[0] + q[0]) / 2 * 0.5 + (p[0] + q[0]) / 4, ((p[1] + q[1]) / 2 + piega) * 0.5 + (p[1] + q[1]) / 4] }; }
        var svg = $('sch-svg'), s = '';
        attr(svg, 'viewBox', '0 0 ' + W + ' ' + H);
        if (S.batt) s += '<path class="en-sch-ferma" d="' + curva('casa', 'batt', 0).d + '"/>';
        if (S.rete) s += '<path class="en-sch-ferma" d="' + curva('casa', 'rete', 0).d + '"/>';
        LINEE_SCH.forEach(function (L) {
            var c = curva(L[1], L[2], L[3]);
            if (!serve[L[0]]) return;
            s += '<path class="en-sch-fondo" id="en-schf-' + L[0] + '" d="' + c.d + '" stroke-width="5"/>';
            s += '<path class="en-sch-via en-zero' + (L[4] ? ' en-lento' : '') + '" id="en-schv-' + L[0] + '" d="' + c.d + '"/>';
            var pill = $('sch-p-' + L[0]);
            var mx = c.m[0], my = c.m[1];
            if (L[0] === 'pv_casa') my = N.sole[1] + (N.casa[1] - N.sole[1]) * 0.55;
            if (L[0] === 'pv_batt') { mx -= mob ? 14 : 18; my += mob ? 14 : 22; }
            if (L[0] === 'pv_rete') { mx += mob ? 14 : 18; my += mob ? 14 : 22; }
            if (L[0] === 'batt_casa' || L[0] === 'rete_casa') my -= mob ? 16 : 20;
            pill.style.left = (mx / W * 100) + '%'; pill.style.top = (my / H * 100) + '%';
        });
        svg.innerHTML = s;
        ['sole', 'batt', 'casa', 'rete'].forEach(function (k) {
            var n = $('n-' + k), e = $('sch-e-' + k), p = N[k];
            n.style.left = (p[0] / W * 100) + '%'; n.style.top = (p[1] / H * 100) + '%';
            if (k === 'sole') { e.style.left = ((p[0] + R + 14) / W * 100) + '%'; e.style.top = (p[1] / H * 100) + '%'; }
            else { e.style.left = (p[0] / W * 100) + '%'; e.style.top = ((p[1] + R + 8) / H * 100) + '%'; }
        });
        stile($('n-sole'), '--en-alone', '34px');
        sch.vie = null;
        aggiornaSchema();
    }

    /* ======================================================================
       AGGIORNAMENTO DEI FLUSSI (entrambe le viste: la nascosta costa solo qualche attributo)
       ====================================================================== */
    function notaSole(c, corta) {
        var pv = vivo.pv;
        if (!c.giorno) return API && DATI && (albaTramonto()[0] > c.h) ? t('notteAlba', { ora: fmtOra(albaTramonto()[0]) }) : T.notte;
        if (pv < 40) return c.luce < 0.25 ? T.pocaLuce : T.inAttesa;
        var mx = num(imp().pv_max_w);
        var pct = mx && mx > 200 ? Math.round(clamp(pv / mx * 100, 0, 100)) : null;
        if (c.luce < 0.25 && (pct === null || pct < 8)) return T.pocaLuce;
        if (pct !== null && !corta) return t('producePct', { p: pct });
        return c.luce < 0.2 ? T.pocaLuce : T.produce;
    }
    function notaBatt() {
        var b = vivo.batt, soc = vivo.soc, ris = num(imp().riserva_pct) || 10;
        if (b > 40) return t('siCarica', { w: fmtW(b) });
        if (b < -40) return t('siScarica', { w: fmtW(-b) });
        if (soc !== null && soc >= 99) return T.piena;
        if (soc !== null && soc <= ris + 1) return T.allaRiserva;
        return T.ferma;
    }
    function notaCasa() {
        if (!S.rete) return T.stimato;
        var c = vivo.casa; if (c < 20) return '—';
        var parti = [[fl.pv_casa || 0, T.dalSole], [fl.batt_casa || 0, T.dallaBatt], [fl.rete_casa || 0, T.dallaRete]].filter(function (x) { return x[0] > 20; });
        if (!parti.length) return '—';
        if (parti.length === 1) return parti[0][1] === T.dalSole ? T.tuttaSole : (parti[0][1] === T.dallaBatt ? T.tuttaBatt : T.tuttaRete);
        var tot = parti.reduce(function (a, x) { return a + x[0]; }, 0);
        parti.sort(function (a, b) { return b[0] - a[0]; });
        return parti.map(function (x) { return Math.round(x[0] / tot * 100) + '% ' + x[1]; }).join(' · ');
    }
    function notaRete() { var r = vivo.rete; return r > 40 ? T.inPrelievo : (r < -40 ? T.inImmissione : T.inEquilibrio); }
    function valRete() { return fmtW(Math.abs(vivo.rete)); }
    function aggiornaFlussi() {
        var c = aggiornaCielo();
        var v = { sole: fmtW(vivo.pv), batt: vivo.soc !== null ? Math.round(vivo.soc) + '%' : '—', casa: fmtW(vivo.casa), rete: valRete() };
        var n = { sole: notaSole(c), batt: notaBatt(), casa: notaCasa(), rete: notaRete() }, corta = notaSole(c, true);
        ['sole', 'batt', 'casa', 'rete'].forEach(function (k) {
            // riga di etichette sotto la scena (solo telefono): note corte, a capo al posto di " · "
            scrivi($('sc-v-' + k), v[k]); scrivi($('sc-n-' + k), (k === 'sole' ? corta : n[k]).split(' · ').join('\n'));
            scrivi($('sch-v-' + k), v[k]); scrivi($('sch-n-' + k), sch.mob ? (k === 'sole' ? corta : n[k].split(' · ').join('\n')) : n[k]);   // telefono: a capo
        });
        scrivi($('sc-v-sole0'), v.sole); scrivi($('sc-n-sole0'), n.sole);
        var prel = vivo.rete > 40;
        ['sc-e-rete', 'sch-e-rete'].forEach(function (id) { stile($(id), '--c', prel ? '#FF7A59' : '#A78BFA'); });
        stile($('n-rete'), '--c', prel ? '#FF7A59' : '#A78BFA');
        // scena: linee, particelle, pillole, batteria, finestre, spia
        var pvC = fl.pv_casa || 0;
        classe($('sc-via-sole'), 'en-zero', vivo.pv < 40);
        particelle('sole', vivo.pv, false, false);
        pill('sc-p-sole', pvC, 35);
        var b = S.batt ? vivo.batt : 0;
        classe($('sc-via-batt'), 'en-zero', Math.abs(b) < 40);
        particelle('batt', Math.abs(b), b < 0, false);
        pill('sc-p-batt', Math.abs(b), b < 0 ? 0 : 180);
        var r = S.rete ? vivo.rete : 0;
        classe($('sc-via-rete'), 'en-zero', Math.abs(r) < 40);
        attr($('sc-via-rete'), 'stroke', r > 40 ? '#FF7A59' : '#A78BFA');
        particelle('rete', Math.abs(r), r > 0, r > 0);
        pill('sc-p-rete', Math.abs(r), r > 0 ? 180 : 0);
        stile($('sc-p-rete'), '--c', r > 40 ? '#FF7A59' : '#A78BFA');
        stile($('sc-livello'), '--en-soc', vivo.soc !== null ? clamp(vivo.soc / 100, 0.02, 1).toFixed(3) : '0.5');
        attr($('sc-livello'), 'fill', vivo.soc !== null && vivo.soc <= (num(imp().riserva_pct) || 10) + 5 ? '#F5B83D' : '#3DDC84');
        classe($('carica-box'), 'en-si', b > 40);
        classe($('finestre'), 'en-spente', vivo.casa < 30);
        var sp = $('spia'), lv = API && API.soglia && API.soglia.livello;
        stile(sp, '--c', r > 40 ? '#FF7A59' : '#A78BFA');
        classe(sp, 'en-zero', Math.abs(r) < 40);
        classe(sp, 'en-allarme', lv === 'superato');
        aggiornaSchema();
        var auto = $('auto-ora');
        if (S.rete && vivo.casa > 20) scrivi(auto, t('autoOra', { p: Math.round(clamp((vivo.casa - Math.max(vivo.rete, 0)) / vivo.casa * 100, 0, 100)) }));
        else scrivi(auto, '');
    }
    function pill(id, w, giro) {
        var p = $(id); if (!p) return;
        classe(p, 'en-zero', w < 40);
        if (w >= 40) scrivi(p.querySelector('span'), fmtW(w));
        if (giro !== undefined) stile(p, '--r', giro + 'deg');
    }
    function aggiornaSchema() {
        if (!sch.nodi) return;
        var v = {
            pv_casa: [fl.pv_casa || 0, false, '#F5B83D'], pv_batt: [fl.pv_batt || 0, false, '#F5B83D'], pv_rete: [fl.pv_rete || 0, false, '#F5B83D'],
            batt_casa: [0, false, '#3DDC84'], rete_casa: [0, false, '#FF7A59']
        };
        var bc = (fl.batt_casa || 0) + (fl.batt_rete || 0), rb = fl.rete_batt || 0;
        v.batt_casa = bc >= rb ? [bc, false, '#3DDC84'] : [rb, true, '#3DDC84'];
        var rc = (fl.rete_casa || 0) + rb, br = fl.batt_rete || 0;
        v.rete_casa = rc >= br ? [rc, false, '#FF7A59'] : [br, true, '#A78BFA'];
        if (!S.batt) { v.pv_batt[0] = 0; v.batt_casa[0] = 0; }
        if (!S.rete) { v.pv_rete[0] = 0; v.rete_casa[0] = 0; }
        Object.keys(v).forEach(function (k) {
            var e = $('schv-' + k), w = v[k][0];
            if (!e) return;
            classe(e, 'en-zero', w < 40);
            classe(e, 'en-inv', v[k][1]);
            attr(e, 'stroke', v[k][2]);
            attr(e, 'stroke-width', (2.2 + Math.min(1.4, w / 3000)).toFixed(2));
            var p = $('sch-p-' + k);
            stile(p, '--c', v[k][2]);
            pill('sch-p-' + k, w, angoloSchema(k, v[k][1]));
        });
        attr($('n-sole-ic'), 'href', (vivo.pv < 40 && !aggiornaCieloCache().giorno) ? '#en-i-luna' : '#en-i-sole');
        classe($('n-sole'), 'en-buio', vivo.pv < 40);
    }
    var cieloCache = { t: 0, v: null };
    function aggiornaCieloCache() { var n = Date.now(); if (!cieloCache.v || n - cieloCache.t > 5000) { var at = albaTramonto(), h = oraCasa(); cieloCache.v = { giorno: h > at[0] - 0.25 && h < at[1] + 0.25 }; cieloCache.t = n; } return cieloCache.v; }
    function angoloSchema(k, inversa) {
        var N = sch.nodi, L = LINEE_SCH.filter(function (x) { return x[0] === k; })[0];
        var a = N[L[1]], b = N[L[2]];
        var ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
        return Math.round(inversa ? ang + 180 : ang);
    }

    /* ======================================================================
       VISTA: Scena / Schema (per dispositivo: server + ripiego localStorage)
       ====================================================================== */
    var CHIAVE_LS = 'wh_energia_vista';
    function lsLeggi() { try { var v = localStorage.getItem(CHIAVE_LS); return v === 'scena' || v === 'schema' ? v : null; } catch (e) { return null; } }
    function lsScrivi(v) { try { localStorage.setItem(CHIAVE_LS, v); } catch (e) { /* niente */ } }
    function segnaTasti(v) {
        [].forEach.call(document.querySelectorAll('#en-vista-sel button, [data-en-vista]'), function (b) {
            var on = (b.getAttribute('data-v') || b.getAttribute('data-en-vista')) === v;
            classe(b, 'en-on', on); attr(b, 'aria-checked', on ? 'true' : 'false');
        });
    }
    var timerVista = 0;
    function mostraVista(v, anima) {
        if (v !== 'scena' && v !== 'schema') v = 'scena';
        segnaTasti(v);
        if (vista === v) return;
        var prima = vista ? $('v-' + vista) : null, dopo = $('v-' + v);
        vista = v;
        clearTimeout(timerVista);
        var subito = !anima || !prima || leggera() || ridotto || !aperta();
        [$('v-scena'), $('v-schema')].forEach(function (e) { if (e !== prima && e !== dopo) { nascondi(e, true); } });
        if (subito) {
            if (prima) { nascondi(prima, true); prima.classList.remove('en-sfuma'); }
            nascondi(dopo, false); dopo.classList.remove('en-sfuma');
            dopoVista();
            return;
        }
        prima.classList.add('en-sfuma');
        timerVista = setTimeout(function () {
            nascondi(prima, true); prima.classList.remove('en-sfuma');
            dopo.classList.add('en-sfuma'); nascondi(dopo, false);
            dopoVista();
            void dopo.offsetWidth;
            dopo.classList.remove('en-sfuma');
        }, 230);
    }
    function dopoVista() { if (vista === 'schema') costruisciSchema(); else scalaScena(); if (S.pronto) aggiornaFlussi(); }
    function scegliVista(v) {
        if (v !== 'scena' && v !== 'schema') return;
        lsScrivi(v);
        mostraVista(v, true);
        fetch('/api/energia/vista', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ vista: v }) }).catch(function () { /* resta il localStorage */ });
    }
    function caricaVista() {
        prendi('/api/energia/vista').then(function (j) {
            var loc = lsLeggi();
            if (j && j.salvata && (j.vista === 'scena' || j.vista === 'schema')) { lsScrivi(j.vista); mostraVista(j.vista, false); }
            else if (loc) { mostraVista(loc, false); fetch('/api/energia/vista', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vista: loc }) }).catch(function () {}); }
            else mostraVista((j && j.vista) || 'scena', false);
        }).catch(function () { mostraVista(lsLeggi() || 'scena', false); });
    }
    $('vista-sel').addEventListener('click', function (e) { var b = e.target.closest('button[data-v]'); if (b) scegliVista(b.getAttribute('data-v')); });
    document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-en-vista]'); if (b) scegliVista(b.getAttribute('data-en-vista')); });

    /* ======================================================================
       ADESSO: valori e mini-curve (ultimi 8 quarti d'ora + adesso)
       ====================================================================== */
    function spark(id, valori, conSegno) {
        var el = $(id), p = el.querySelector('path');
        if (!p.hasAttribute('pathLength')) p.setAttribute('pathLength', '1');
        if (valori.length < 2) { attr(p, 'd', ''); return; }
        var mn = conSegno ? Math.min.apply(null, valori.concat([0])) : 0, mx = Math.max.apply(null, valori.concat([conSegno ? 0 : 1]));
        if (mx - mn < 1) mx = mn + 1;
        var d = valori.map(function (v, i) { return (i ? 'L' : 'M') + (96 * i / (valori.length - 1)).toFixed(1) + ' ' + (30 - 28 * (v - mn) / (mx - mn)).toFixed(1); }).join(' ');
        attr(p, 'd', d);
    }
    function aggiornaAdesso() {
        var g = (DATI && DATI.giornata) || [], ultimi = g.slice(-8);
        function serie(k, vv) { return ultimi.map(function (x) { return num(x[k]) || 0; }).concat([vv]); }
        var pp = wParti(vivo.pv); scriviNum($('ad-pv-v'), pp[0], pp[1]);
        var pc = wParti(vivo.casa); scriviNum($('ad-casa-v'), pc[0], pc[1]);
        var b = vivo.batt, pb = wParti(b);
        scrivi($('ad-batt-t'), b > 40 ? T.adBattCarica : (b < -40 ? T.adBattScarica : T.adBattFerma));
        scriviNum($('ad-batt-v'), (b > 40 ? '+' : (b < -40 ? '−' : '')) + pb[0], pb[1]);
        var r = vivo.rete, pr = wParti(r);
        scrivi($('ad-rete-t'), r > 40 ? T.adRetePrel : (r < -40 ? T.adReteImm : T.adReteEq));
        scriviNum($('ad-rete-v'), pr[0], pr[1]);
        classe($('ad-rete'), 'en-prel', r > 40);
        spark('ad-pv-s', serie('pv_w', vivo.pv), false);
        spark('ad-casa-s', serie('casa_w', vivo.casa), false);
        spark('ad-batt-s', serie('batteria_w', b), true);
        spark('ad-rete-s', serie('rete_w', r).map(function (x) { return -x; }), true);   // su = immissione, come nel mockup
    }

    /* ======================================================================
       PERIODO: totali di oggi (adesso) o somma dei giorni / mesi (inverter_giorni)
       ====================================================================== */
    var CAMPI = ['prodotta_kwh', 'consumata_kwh', 'immessa_kwh', 'prelevata_kwh', 'caricata_kwh', 'scaricata_kwh', 'beneficio_eur', 'costo_eur',
                 'prelevata_f1_kwh', 'prelevata_f2_kwh', 'prelevata_f3_kwh'];
    function somma(lista) {
        var o = { n: 0 };
        CAMPI.forEach(function (k) { o[k] = null; });
        (lista || []).forEach(function (g) {
            o.n++;
            CAMPI.forEach(function (k) { var v = k === 'consumata_kwh' ? consumataDi(g) : num(g[k]); if (v !== null) o[k] = (o[k] || 0) + v; });
        });
        return o;
    }
    function listaPeriodo(p) {   // giorni (o mesi) del periodo, dai dati gia' arrivati; null = non ancora caricati
        if (p === 'settimana') return G7 ? G7.giorni || [] : null;
        if (p === 'mese') { if (!GM) return null; var m = (orologio.data || '').slice(0, 7); return (GM.giorni || []).filter(function (g) { return !m || g.data.slice(0, 7) === m; }); }
        if (p === 'anno') return GA ? GA.mesi || [] : null;
        return null;
    }
    function totaliPeriodo() {
        if (periodo === 'oggi') {
            var o = (API && API.oggi) || {}, r = {};
            CAMPI.forEach(function (k) { r[k] = num(o[k]); });
            if (r.consumata_kwh === null) { r.consumata_kwh = consumataDi(r); if (r.consumata_kwh === null) r.consumata_kwh = consumataStimata(); }
            return r;
        }
        var l = listaPeriodo(periodo);
        return l ? somma(l) : null;
    }
    /* consumata di un giorno (o di un periodo): quella misurata; senza misuratore la stessa stima della casa dei flussi
       (casa = sole - carica + scarica) fatta coi contatori di energia: senza batteria = prodotta, con la batteria
       prodotta - caricata + scaricata. Cosi' l'indicatore, "Dove va" e "Ultimi 7 giorni" tornano fra loro. */
    function consumataDi(g) {
        var c = num(g.consumata_kwh);
        if (c !== null || S.rete) return c;
        var p = num(g.prodotta_kwh);
        if (p === null) return null;
        if (!S.batt) return p;
        var ca = num(g.caricata_kwh), sc = num(g.scaricata_kwh);
        return ca === null || sc === null ? null : Math.max(0, p - ca + sc);
    }
    function consumataStimata() {   // ultima risorsa (contatori della batteria assenti): integrale della giornata stimata
        if (!DATI || !DATI.giornata || !DATI.giornata.length) return null;
        var ora = oraCasa(), e = 0;
        DATI.giornata.forEach(function (g) {
            var dur = clamp(ora - g.h, 0, 0.25);   // il quarto d'ora in corso conta solo per i minuti gia' passati
            var a = adattaSegni(g.pv_w, g.casa_w, g.rete_w, g.batteria_w, g.batteria_soc); e += (a.casa || 0) * dur / 1000;
        });
        return e;
    }
    function nomeMese(d, lungo) { return d.toLocaleDateString(LOCALE, { month: lungo ? 'long' : 'short' }).replace('.', ''); }

    /* ======================================================================
       INDICATORI
       ====================================================================== */
    function aggiornaKpi() {
        var tot = totaliPeriodo(), oggi = periodo === 'oggi';
        scrivi($('k-prod-t'), oggi ? T.prodOggi : T.prodPer);
        scrivi($('k-cons-t'), oggi ? T.consOggi : T.consPer);
        scrivi($('k-risp-t'), oggi ? T.rispOggi : T.rispPer);
        if (!tot) { ['prod', 'cons', 'auto', 'risp', 'co2'].forEach(function (k) { scriviNum($('k-' + k + '-v'), '—', ''); scrivi($('k-' + k + '-n'), ''); }); return; }
        var p = tot.prodotta_kwh, c = tot.consumata_kwh, pr = tot.prelevata_kwh;
        if (p !== null) { var a = kwhParti(p); scriviNum($('k-prod-v'), a[0], a[1]); } else scriviNum($('k-prod-v'), '—', '');
        if (c !== null) { var b = kwhParti(c); scriviNum($('k-cons-v'), b[0], b[1]); } else scriviNum($('k-cons-v'), '—', '');
        var ieri = oggi && DATI && DATI.ieri_stessa_ora;
        function confronto(id, v, vi, alt) {
            var el = $(id);
            // confronto in percentuale solo se ieri a quest'ora c'era abbastanza energia (con pochi Wh viene +3000%)
            if (oggi && v !== null && vi !== null && vi !== undefined && vi >= 0.3 && v / vi <= 4) {
                var d = Math.round((v - vi) / vi * 100);
                scrivi(el, t('rispIeri', { d: (d > 0 ? '+' : (d < 0 ? '−' : '')) + Math.abs(d) }));
                classe(el, 'en-su', d >= 0); classe(el, 'en-giu', d < 0);
            } else { scrivi(el, oggi && vi !== null && vi !== undefined ? t('ieriOra', { v: fmtKwh(vi) }) : alt); classe(el, 'en-su', false); classe(el, 'en-giu', false); }
        }
        var notaPer = periodo === 'settimana' ? T.in7 : (periodo === 'mese' ? T.daInizioMese : (periodo === 'anno' ? T.in12 : t('dalleOre', { ora: fmtOra(oraCasa()) })));
        if (!oggi && tot.n !== undefined) {
            var att = periodo === 'settimana' ? 7 : (periodo === 'mese' ? dataCasa().getDate() : 12);
            if (tot.n < att) notaPer = periodo === 'anno' ? (tot.n === 1 ? T.mese1 : t('mesiDati', { n: tot.n })) : (tot.n === 1 ? T.giorno1 : t('giorniDati', { n: tot.n }));
        }
        confronto('k-prod-n', p, ieri ? num(ieri.prodotta_kwh) : null, notaPer);
        if (!S.rete) { scrivi($('k-cons-n'), T.stimata); classe($('k-cons-n'), 'en-su', false); classe($('k-cons-n'), 'en-giu', false); }
        else confronto('k-cons-n', c, ieri ? num(ieri.consumata_kwh) : null, notaPer);
        // autosufficienza: (consumata - prelevata) / consumata
        if (c !== null && pr !== null && c > 0.01) { scriviNum($('k-auto-v'), String(Math.round(clamp((c - pr) / c * 100, 0, 100))), '%'); scrivi($('k-auto-n'), t('presiRete', { v: fmtKwh(pr) })); }
        else { scriviNum($('k-auto-v'), '—', ''); scrivi($('k-auto-n'), ''); }
        var be = tot.beneficio_eur;
        if (be !== null) { scriviNum($('k-risp-v'), fmtEuro(be), ''); scrivi($('k-risp-n'), T.autoImm); }
        else { scriviNum($('k-risp-v'), '—', ''); scrivi($('k-risp-n'), T.prezziNo); }
        var f = DATI && DATI.co2 && num(DATI.co2.kg_per_kwh);
        if (p !== null && f) {
            var kg = p * f;
            if (kg >= 1000) scriviNum($('k-co2-v'), dec(kg / 1000, kg < 10000 ? 2 : 1), 't'); else scriviNum($('k-co2-v'), dec(kg, kg < 100 ? 1 : 0), 'kg');
            scrivi($('k-co2-n'), t('co2Nota', { v: dec(f, 3) }));
        } else { scriviNum($('k-co2-v'), '—', ''); scrivi($('k-co2-n'), ''); }
    }

    /* ======================================================================
       ANDAMENTO
       ====================================================================== */
    var animaGrafico = false, graficoAnimFino = 0;
    function passoBello(x) { var p = [0.25, 0.5, 1, 2, 2.5, 3, 5, 10, 15, 20, 25, 50, 100, 200, 250, 500, 1000]; for (var i = 0; i < p.length; i++) if (p[i] >= x) return p[i]; return Math.ceil(x / 1000) * 1000; }
    function disegnaAndamento() {
        var box = $('grafico'), w = box.clientWidth, h = box.clientHeight;
        if (!w || !h) return;
        if (Date.now() < graficoAnimFino) return;          // non si ridisegna mentre le linee si stanno disegnando
        var anim = animaGrafico && !leggera() && !ridotto; animaGrafico = false;
        if (anim) graficoAnimFino = Date.now() + 2900;
        var titolo = periodo === 'oggi' ? T.andOggi : (periodo === 'settimana' ? T.andSett : (periodo === 'mese' ? t('andMese', { mese: nomeMese(dataCasa(), true) }) : T.andAnno));
        scrivi($('and-t'), titolo);
        classe($('andamento'), 'en-periodo-lungo', periodo !== 'oggi');
        var svg = $('graf');
        attr(svg, 'viewBox', '0 0 ' + w + ' ' + h);
        var s = periodo === 'oggi' ? graficoOggi(w, h, anim) : graficoBarre(w, h, anim);
        nascondi($('g-vuoto'), !!s);
        if (!s) scrivi($('g-vuoto'), periodo === 'oggi' ? T.nessunDatoOggi : T.nessunDatoPer);
        if (svg.__s !== s) { svg.__s = s; svg.innerHTML = s || ''; }
    }
    function assiY(x0, y0, cw, ch, vmax, passo, unita) {
        var s = '';
        for (var k = 0; k <= vmax + 1e-9; k += passo) {
            var y = y0 + ch - ch * k / vmax;
            s += '<line class="en-graf-griglia" x1="' + x0 + '" y1="' + y.toFixed(1) + '" x2="' + (x0 + cw) + '" y2="' + y.toFixed(1) + '"/>';
            s += '<text class="en-graf-txt" x="' + (x0 - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + (passo < 1 ? dec(k, passo < 0.5 ? 2 : 1) : intero(k)) + ' ' + unita + '</text>';
        }
        return s;
    }
    function graficoOggi(w, h, anim) {
        var g = (DATI && DATI.giornata) || [], pr = (DATI && DATI.previsione) || [], ora = oraCasa();
        if (!g.length && !pr.length) return '';
        var x0 = 44, y0 = 16, cw = w - 60, ch = h - 52;
        var pts = g.map(function (q) { var a = adattaSegni(q.pv_w, q.casa_w, q.rete_w, q.batteria_w, q.batteria_soc); return { h: q.h + 0.125, pv: a.pv || 0, casa: a.casa || 0, soc: num(q.batteria_soc) }; })
                   .filter(function (p) { return p.h <= ora + 0.01; });
        if (S.pronto) pts.push({ h: ora, pv: vivo.pv, casa: vivo.casa, soc: vivo.soc, adesso: true });
        var fut = pr.map(function (q) { return { h: q.h + 0.125, pv: num(q.pv_w) || 0 }; }).filter(function (p) { return p.h > ora; });
        var mx = 400;
        pts.forEach(function (p) { mx = Math.max(mx, p.pv, p.casa); }); fut.forEach(function (p) { mx = Math.max(mx, p.pv); });
        var kmax = mx / 1000 * 1.05, passo = passoBello(kmax / 4), vmax = Math.max(passo * 2, passo * Math.ceil(kmax / passo));
        function X(hh) { return x0 + cw * hh / 24; }
        function Y(wt) { return y0 + ch - ch * (wt / 1000) / vmax; }
        function Ys(soc) { return y0 + ch - ch * soc / 100; }
        var s = '<defs><linearGradient id="en-g-pv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F5B83D" stop-opacity="0.42"/><stop offset="1" stop-color="#F5B83D" stop-opacity="0.02"/></linearGradient></defs>';
        s += assiY(x0, y0, cw, ch, vmax, passo, 'kW');
        var ogni = cw < 460 ? 6 : 3;
        for (var hh = 0; hh <= 24; hh += ogni) s += '<text class="en-graf-txt" x="' + X(hh).toFixed(1) + '" y="' + (h - 10) + '" text-anchor="middle">' + pad(hh) + '</text>';
        var cl = anim ? ' en-graf-disegna' : '', ca = anim ? ' en-graf-disegna-area' : '';
        function linea(arr, k) { return arr.map(function (p, i) { return (i ? 'L' : 'M') + X(p.h).toFixed(1) + ' ' + (k === 'soc' ? Ys(p.soc) : Y(p[k])).toFixed(1); }).join(' '); }
        if (pts.length > 1) {
            var area = linea(pts, 'pv') + ' L' + X(pts[pts.length - 1].h).toFixed(1) + ' ' + (y0 + ch) + ' L' + X(pts[0].h).toFixed(1) + ' ' + (y0 + ch) + ' Z';
            s += '<path class="en-graf-pv-area' + ca + '" d="' + area + '" fill="url(#en-g-pv)"/>';
            s += '<path class="en-graf-linea' + cl + '" pathLength="1" d="' + linea(pts, 'pv') + '" stroke="#F5B83D"/>';
        }
        if (fut.length) { var dprev = (pts.length ? 'M' + X(pts[pts.length - 1].h).toFixed(1) + ' ' + Y(pts[pts.length - 1].pv).toFixed(1) + ' ' : '') + fut.map(function (p, i) { return ((i || pts.length) ? 'L' : 'M') + X(p.h).toFixed(1) + ' ' + Y(p.pv).toFixed(1); }).join(' '); s += '<path class="en-graf-prev" d="' + dprev + '"/>'; }
        if (pts.length > 1) s += '<path class="en-graf-linea' + cl + '" pathLength="1" d="' + linea(pts, 'casa') + '" stroke="#5AC8FA"/>';
        var soc = pts.filter(function (p) { return p.soc !== null && p.soc !== undefined; });
        if (S.batt && soc.length > 1) s += '<path class="en-graf-soc' + cl + '" pathLength="1" d="' + linea(soc, 'soc') + '"/>';
        var xa = X(ora);
        s += '<line class="en-graf-ora" x1="' + xa.toFixed(1) + '" y1="' + y0 + '" x2="' + xa.toFixed(1) + '" y2="' + (y0 + ch) + '"/>';
        if (S.pronto) {
            s += '<circle cx="' + xa.toFixed(1) + '" cy="' + Y(vivo.pv).toFixed(1) + '" r="5" fill="#F5B83D" stroke="#05080F" stroke-width="2"/>';
            s += '<circle cx="' + xa.toFixed(1) + '" cy="' + Y(vivo.casa).toFixed(1) + '" r="4.5" fill="#5AC8FA" stroke="#05080F" stroke-width="2"/>';
        }
        var xp = clamp(xa, x0 + 27, x0 + cw - 27);
        s += '<rect class="en-graf-ora-pill" x="' + (xp - 27).toFixed(1) + '" y="' + (y0 - 2) + '" width="54" height="20" rx="10"/>';
        s += '<text class="en-graf-ora-txt" x="' + xp.toFixed(1) + '" y="' + (y0 + 12) + '" text-anchor="middle">' + fmtOra(ora) + '</text>';
        return s;
    }
    function graficoBarre(w, h, anim) {
        var l = listaPeriodo(periodo), voci = [], oggiStr = orologio.data || '';
        if (l === null) return '';
        if (periodo === 'anno') {
            var d0 = dataCasa();
            var per = {}; l.forEach(function (m) { per[m.mese] = m; });
            for (var i = 11; i >= 0; i--) {
                var d = new Date(d0.getFullYear(), d0.getMonth() - i, 1, 12), k = d.getFullYear() + '-' + pad(d.getMonth() + 1), m = per[k] || {};
                voci.push({ e: maiuscola(nomeMese(d, false)), p: num(m.prodotta_kwh), c: consumataDi(m), oggi: i === 0 });
            }
        } else {
            var per2 = {}; l.forEach(function (g) { per2[g.data] = g; });
            var dc = dataCasa(), n = periodo === 'settimana' ? 7 : dc.getDate();
            for (var j = n - 1; j >= 0; j--) {
                var dd = new Date(dc.getFullYear(), dc.getMonth(), dc.getDate() - j, 12), ks = dd.getFullYear() + '-' + pad(dd.getMonth() + 1) + '-' + pad(dd.getDate()), g = per2[ks] || {};
                voci.push({ e: periodo === 'settimana' ? (j === 0 ? T.oggi : maiuscola(dd.toLocaleDateString(LOCALE, { weekday: 'short' }).replace('.', ''))) : String(dd.getDate()), p: num(g.prodotta_kwh), c: consumataDi(g), oggi: j === 0 });
            }
        }
        if (!voci.some(function (v) { return v.p !== null || v.c !== null; })) return '';
        var x0 = 44, y0 = 12, cw = w - 52, ch = h - 44;
        var mx = 1; voci.forEach(function (v) { mx = Math.max(mx, v.p || 0, v.c || 0); });
        var passo = passoBello(mx * 1.05 / 4), vmax = Math.max(passo * 2, passo * Math.ceil(mx * 1.05 / passo));
        var s = assiY(x0, y0, cw, ch, vmax, passo, 'kWh'), bw = cw / voci.length, ogni = voci.length > 16 ? (cw / voci.length < 22 ? 5 : 2) : 1;
        voci.forEach(function (v, i) {
            var x = x0 + i * bw, base = y0 + ch, op = v.oggi && periodo !== 'anno' ? '0.6' : '1';
            [[v.p, 0.16, '#F5B83D'], [v.c, 0.52, '#5AC8FA']].forEach(function (b, z) {
                if (b[0] === null || b[0] <= 0) return;
                var hh = ch * b[0] / vmax;
                s += '<rect class="en-graf-barra' + (anim ? ' en-cresce' : '') + '" style="animation-delay:' + (0.1 + i * Math.min(0.08, 0.6 / voci.length) + z * 0.04).toFixed(2) + 's" x="' + (x + bw * b[1]).toFixed(1) + '" y="' + (base - hh).toFixed(1) + '" width="' + Math.max(1.5, bw * 0.3).toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="' + Math.min(5, bw * 0.12).toFixed(1) + '" fill="' + b[2] + '" opacity="' + op + '"/>';
            });
            if (i % ogni === 0 || v.oggi) s += '<text class="en-sett-txt' + (v.oggi ? ' en-oggi' : '') + '" x="' + (x + bw / 2).toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle">' + esc(v.e) + '</text>';
        });
        return s;
    }

    /* ======================================================================
       BATTERIA, CONTATORE, COSTI
       ====================================================================== */
    function aggiornaBatteria() {
        var soc = vivo.soc, cap = num(imp().batteria_wh), ris = num(imp().riserva_pct) || 10, b = vivo.batt, C = 433.54;
        var offA = soc !== null ? C * (1 - clamp(soc, 0, 100) / 100) : C;
        stile($('an-pieno'), '--en-off', offA > C - 0.05 ? '435' : offA.toFixed(2));   // vuota: oltre il tratto (niente pallino)
        classe($('anello'), 'en-basso', soc !== null && soc <= ris + 5);
        scrivi($('an-v'), soc !== null ? Math.round(soc) + '%' : '—');
        scrivi($('an-n'), soc !== null && cap ? dec(soc / 100 * cap / 1000, 1) + ' kWh' : (soc !== null ? t('riservaPct', { p: ris }) : ''));
        var r1 = b > 40 ? t('caricaA', { w: esc(fmtW(b)) }) : (b < -40 ? t('scaricaA', { w: esc(fmtW(-b)) }) : (soc !== null && soc >= 99 ? T.battPiena : (soc !== null && soc <= ris + 1 ? T.battRiserva : T.battFerma)));
        var r2 = '', r3 = '', ora = oraCasa();
        if (cap && soc !== null) {
            var usabile = Math.max(0, soc - ris) / 100 * cap, rec = (DATI && DATI.recente) || {};
            if (b > 40 && soc < 99) r2 = t('pienaVerso', { ora: fmtOra(ora + (100 - soc) / 100 * cap / b) });
            if (b < -40) {
                // mentre si scarica: UNA sola base per le due righe, la scarica media dell'ultima ora (quella di adesso
                // se la media non c'e' o e' piu' bassa di 40 W): autonomia = energia sopra la riserva / scarica,
                // "alla riserva verso le" = ora di casa + autonomia
                var sca = num(rec.batteria_scarica_media_w);
                if (sca === null || sca <= 40) sca = -b;
                if (usabile > 0) {
                    var durM = Math.round(usabile / sca * 60);   // stessi minuti nelle due righe (ora di casa al minuto)
                    // oltre le 24 ore l'ora da sola si leggerebbe come "oggi": basta l'autonomia nella riga sotto
                    if (durM < 24 * 60) r2 = t('riservaVerso', { ora: fmtOra(Math.floor(ora * 60) / 60 + durM / 60) });
                    r3 = t('autonomia', { d: esc(fmtDurata(durM / 60)) });
                }
            } else {
                // ferma o in carica: quanto durerebbe se la casa andasse tutta a batteria (consumo medio dell'ultima ora)
                var media = num(rec.casa_media_w);
                if (media === null) media = vivo.casa;
                if (media > 30 && usabile > 0) r3 = t('autonomia', { d: esc(fmtDurata(usabile / media)) });
            }
        }
        scriviHtml($('b-r1'), r1); scriviHtml($('b-r2'), r2); scriviHtml($('b-r3'), r3);
    }
    function aggiornaSoglia() {
        var s = num(imp().soglia_w) || (API && API.soglia && num(API.soglia.potenza_w)), lim = num(imp().limite_w) || (API && API.soglia && num(API.soglia.limite_w));
        var avv = num(imp().avviso_pct) || 90, prel = Math.max(0, vivo.rete), card = $('soglia');
        var piccoW = DATI && DATI.oggi ? num(DATI.oggi.picco_prelievo_w) : null, piccoOra = DATI && DATI.oggi ? DATI.oggi.picco_prelievo_ora : null;
        var scala = s || Math.max(3000, (piccoW || 0) * 1.2, prel * 1.2);
        var f = clamp(prel / scala, 0, 1);
        stile($('g-pieno'), '--en-off', f < 0.0005 ? '101' : (100 - f * 100).toFixed(2));   // 0 W: oltre il tratto (niente pallino)
        var fa = clamp(avv / 100, 0, 1), ang = Math.PI * (1 - fa);
        attr($('g-segno'), 'cx', (130 + 104 * Math.cos(ang)).toFixed(1)); attr($('g-segno'), 'cy', (128 - 104 * Math.sin(ang)).toFixed(1));
        nascondi($('g-segno'), !s);
        scrivi($('g-v'), dec(prel / 1000, 2));
        scrivi($('g-n'), s ? t('suSoglia', { v: fmtKw(s) }) : T.prelevati);
        var oltre = !!(s && prel > s), vicino = !!(s && !oltre && prel / s * 100 >= avv);
        classe(card, 'en-oltre', oltre); classe(card, 'en-vicino', vicino);
        var parti = [];
        if (!s) parti.push(T.sogliaNo);
        else if (vivo.rete < -40) parti.push(t('immettendo', { w: esc(fmtW(-vivo.rete)) }));
        else if (oltre) parti.push(t('oltreSoglia', { w: esc(fmtKw(lim || s * 1.1)) }));
        else parti.push(t('margine', { w: esc(fmtW(s - prel)) }));
        var dett = [];
        if (piccoW && piccoOra) dett.push(t('piccoOggi', { w: esc(fmtW(piccoW)), ora: esc(piccoOra) }));
        var mo = DATI && DATI.oggi ? num(DATI.oggi.minuti_oltre_soglia) : null;
        if (s && mo > 0) dett.push(t('minOltre', { n: mo }));
        scriviHtml($('soglia-nota'), parti.join(' · ') + (dett.length ? '<br>' + dett.join(' · ') : ''));
    }
    function aggiornaCosti() {
        var tit, lab, lista;
        if (periodo === 'settimana') { tit = T.costi7; lab = T.spesi7; lista = listaPeriodo('settimana'); }
        else if (periodo === 'anno') { tit = T.costi12; lab = T.spesi12; lista = listaPeriodo('anno'); }
        else { tit = t('costiMese', { mese: nomeMese(dataCasa(), true) }); lab = T.spesiMese; lista = listaPeriodo('mese'); }
        scrivi($('costi-t'), tit); scrivi($('costi-l'), lab);
        if (!lista) { scriviNum($('costi-v'), '—', ''); scriviHtml($('fasce'), ''); return; }
        var tot = somma(lista), pr = prezzi(), fa = fasciaOra(), tipo = tipoTariffa(), righe = [], euro = 0, prezzoOk = true;
        if (tipo === 'fasce') {
            ['F1', 'F2', 'F3'].forEach(function (f) {
                var kwh = tot['prelevata_' + f.toLowerCase() + '_kwh'] || 0, p = num(pr[f]);
                if (p === null) prezzoOk = false; else euro += kwh * p;
                righe.push([f, T[f + 'q'], kwh, p !== null ? kwh * p : null, f === fa]);
            });
        } else {
            var kw = tot.prelevata_kwh || 0, pm = num(pr.MONO);
            if (pm === null) prezzoOk = false; else euro = kw * pm;
            righe.push([T.mono, T.MONOq, kw, pm !== null ? kw * pm : null, true]);
        }
        scriviNum($('costi-v'), prezzoOk ? fmtEuro(euro) : '—', '');
        nascondi($('costi-nota'), prezzoOk);
        if (!prezzoOk) scrivi($('costi-nota'), T.costiNota);
        scriviHtml($('fasce'), righe.map(function (r) {
            return '<div class="en-fascia' + (r[4] ? ' en-attiva' : '') + '"><span class="en-f">' + esc(r[0]) + '</span><div style="min-width:0"><div class="en-fq">' + esc(r[1]) + '</div><div class="en-fk">' + esc(t('kwhPrel', { v: dec(r[2], 1) })) + '</div></div><span class="en-fe">' + (r[3] !== null ? esc(fmtEuro(r[3])) : '—') + '</span></div>';
        }).join(''));
    }

    /* ======================================================================
       DOVE VA L'ENERGIA, CHI CONSUMA
       ====================================================================== */
    function barra(id, segm) {
        scriviHtml($(id), segm.filter(function (x) { return x[0] > 0.004; }).map(function (x) { return '<i style="--f:' + (x[0] * 1000).toFixed(0) + ';--c:' + x[1] + '"></i>'; }).join(''));
    }
    function legenda(id, segm) {
        scriviHtml($(id), segm.map(function (x) { return '<span style="--c:' + x[1] + '"><i></i>' + esc(x[2]) + '</span>'; }).join(''));
    }
    function aggiornaDove() {
        var tot = totaliPeriodo(), oggi = periodo === 'oggi';
        if (!tot) return;
        var P = tot.prodotta_kwh || 0, I = tot.immessa_kwh || 0, C = S.batt ? (tot.caricata_kwh || 0) : 0, Sc = S.batt ? (tot.scaricata_kwh || 0) : 0, U = tot.consumata_kwh || 0, G = tot.prelevata_kwh || 0;
        // prodotta: alla rete (immessa, misurata), in batteria (caricata, al piu' il resto), in casa il resto
        var pvRete = Math.min(I, P), pvBatt = Math.min(C, P - pvRete), pvCasa = Math.max(0, P - pvRete - pvBatt);
        // consumata: dalla rete (prelevata, misurata), dalla batteria (scaricata), dal sole il resto: somme sempre = 100%
        // anche quando i contatori del produttore non tornano al kWh (perdite, arrotondamenti)
        var daRete = Math.min(G, U), daBatt = Math.min(Sc, U - daRete), daSole = Math.max(0, U - daRete - daBatt);
        scrivi($('dove-t1'), t(oggi ? 'prodDoveOggi' : 'prodDove', { v: fmtKwh(P) }));
        scrivi($('dove-t2'), t(oggi ? 'consDoveOggi' : 'consDove', { v: fmtKwh(U) }));
        function pcs(vv, d) {   // percentuali intere che sommano 100 (resti piu' grandi)
            if (!(d > 0)) return vv.map(function () { return 0; });
            var x = vv.map(function (v) { return v / d * 100; }), f = x.map(Math.floor), r = 100 - f.reduce(function (a, b) { return a + b; }, 0);
            x.map(function (v, i) { return [v - f[i], i]; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, Math.max(0, r)).forEach(function (q) { f[q[1]]++; });
            return f;
        }
        if (P >= 0.05) {   // sotto 0,05 kWh il titolo dice 0,0 kWh: niente percentuali
            var q1 = pcs(S.batt ? [pvCasa, pvBatt, pvRete] : [pvCasa, pvRete], P);
            var s1 = [[pvCasa / P, '#F5B83D', t('usataCasa', { p: q1[0] })]];
            if (S.batt) s1.push([pvBatt / P, '#3DDC84', t('inBatt', { p: q1[1] })]);
            s1.push([pvRete / P, '#A78BFA', t('vendutaRete', { p: q1[q1.length - 1] })]);
            barra('dove-b1', s1); legenda('dove-l1', s1);
        } else { barra('dove-b1', []); scriviHtml($('dove-l1'), '<span>' + esc(T.nessunaProd) + '</span>'); }
        if (U >= 0.05) {
            var q2 = pcs(S.batt ? [daSole, daBatt, daRete] : [daSole, daRete], U);
            var s2 = [[daSole / U, '#F5B83D', t('daSole', { p: q2[0] })]];
            if (S.batt) s2.push([daBatt / U, '#3DDC84', t('daBatt', { p: q2[1] })]);
            s2.push([daRete / U, '#FF7A59', t('daRete', { p: q2[q2.length - 1] })]);
            barra('dove-b2', s2); legenda('dove-l2', s2);
        } else { barra('dove-b2', []); scriviHtml($('dove-l2'), ''); }
    }
    function aggiornaChi() {
        var carte = document.querySelectorAll('.hk-card.type-switch[data-potenza]'), visti = {}, lista = [];
        for (var i = 0; i < carte.length; i++) {
            var c = carte[i], id = c.getAttribute('data-id') || ('n' + i), w = parseFloat(c.getAttribute('data-potenza'));
            if (!isFinite(w) || c.closest('#room-energia')) continue;
            var sez = c.closest('.room-section'), tit = sez && sez.querySelector('.section-title'), stanza = tit ? tit.textContent.trim() : '';
            var nome = c.querySelector('.hk-name'), v = visti[id];
            if (!v) { v = visti[id] = { nome: nome ? nome.textContent.trim() : id, stanza: stanza, w: w }; lista.push(v); }
            else if (/preferit|favorit/i.test(v.stanza) && stanza) v.stanza = stanza;
        }
        S.prese = lista.length > 0;
        nascondi($('chi'), !S.prese);
        if (!S.prese) return;
        lista.sort(function (a, b) { return b.w - a.w; });
        var top = lista.slice(0, 4).filter(function (x) { return x.w >= 1; });
        if (!top.length) { scriviHtml($('chi-righe'), '<div class="en-chi-vuoto">' + esc(T.nessunaPresa) + '</div>'); return; }
        var mx = top[0].w || 1;
        scriviHtml($('chi-righe'), top.map(function (x) {
            return '<div class="en-disp"><span class="en-disp-ico"><svg class="en-ic"><use href="#en-i-presa"/></svg></span><div style="min-width:0"><div class="en-disp-n">' + esc(x.nome) + '</div>' + (x.stanza ? '<div class="en-disp-o">' + esc(x.stanza) + '</div>' : '') + '<div class="en-disp-b"><i style="--p:' + clamp(x.w / mx, 0.02, 1).toFixed(3) + '"></i></div></div><div class="en-disp-w">' + esc(fmtW(x.w)) + '</div></div>';
        }).join(''));
    }

    /* ======================================================================
       ULTIMI 7 GIORNI, INVERTER
       ====================================================================== */
    function aggiornaSett() {
        var box = $('sett-graf'), w = box.clientWidth, h = box.clientHeight, l = G7 ? G7.giorni || [] : null;
        if (!l) return;
        var tot = somma(l);
        if (tot.prodotta_kwh !== null) { var a = [intero(tot.prodotta_kwh), 'kWh']; scriviNum($('sett-prod'), a[0], a[1]); } else scriviNum($('sett-prod'), '—', '');
        if (tot.consumata_kwh !== null) scriviNum($('sett-cons'), intero(tot.consumata_kwh), 'kWh'); else scriviNum($('sett-cons'), '—', '');
        if (!S.rete) scrivi($('sett-cons-l'), T.consStima);   // senza misuratore: prodotta - caricata + scaricata
        scriviNum($('sett-eur'), tot.beneficio_eur !== null ? fmtEuro(tot.beneficio_eur, 0) : '—', '');
        if (!w || !h) return;
        var per = {}; l.forEach(function (g) { per[g.data] = g; });
        var dc = dataCasa(), voci = [];
        for (var j = 6; j >= 0; j--) {
            var dd = new Date(dc.getFullYear(), dc.getMonth(), dc.getDate() - j, 12), ks = dd.getFullYear() + '-' + pad(dd.getMonth() + 1) + '-' + pad(dd.getDate()), g = per[ks] || {};
            voci.push({ e: j === 0 ? T.oggi : maiuscola(dd.toLocaleDateString(LOCALE, { weekday: 'short' }).replace('.', '')), p: num(g.prodotta_kwh), c: consumataDi(g), oggi: j === 0 });
        }
        var mx = 1; voci.forEach(function (v) { mx = Math.max(mx, v.p || 0, v.c || 0); });
        var vmax = mx * 1.1, base = h - 28, bw = (w - 16) / 7, anim = inn.classList.contains('en-anima') && !leggera() && !ridotto, s = '';
        voci.forEach(function (v, i) {
            var x = 8 + i * bw;
            [[v.p, 0.16, '#F5B83D'], [v.c, 0.52, '#5AC8FA']].forEach(function (b, z) {
                if (b[0] === null || b[0] <= 0) return;
                var hh = (base - 6) * b[0] / vmax;
                s += '<rect class="en-graf-barra' + (anim ? ' en-cresce' : '') + '" style="animation-delay:' + (0.1 + i * 0.08 + z * 0.04).toFixed(2) + 's" x="' + (x + bw * b[1]).toFixed(1) + '" y="' + (base - hh).toFixed(1) + '" width="' + (bw * 0.3).toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="5" fill="' + b[2] + '" opacity="' + (v.oggi ? '0.6' : '1') + '"/>';
            });
            s += '<text class="en-sett-txt' + (v.oggi ? ' en-oggi' : '') + '" x="' + (x + bw / 2).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle">' + esc(v.e) + '</text>';
        });
        var svg = $('sett-svg');
        attr(svg, 'viewBox', '0 0 ' + w + ' ' + h);
        if (svg.__s !== s) { svg.__s = s; svg.innerHTML = s; }
    }
    var STATI = { produzione: ['invFunzione', ''], limitato: ['invLimitato', ''], attesa: ['invAttesa', 'en-attesa'], avvio: ['invAvvio', 'en-attesa'], spento: ['invSpento', 'en-attesa'],
                  guasto: ['invGuasto', 'en-guasto'], offline: ['invOffline', 'en-guasto'], sconosciuto: ['invAttesa', 'en-attesa'] };
    function aggiornaInverter() {
        var inv = (API && API.inverter) || [], disp = (DATI && DATI.dispositivi) || [], perId = {};
        disp.forEach(function (d) { perId[d.id] = d; });
        var stati = {}; inv.forEach(function (x) { stati[x.stato] = 1; });
        var st = stati.guasto ? 'guasto' : (stati.produzione ? 'produzione' : (stati.limitato ? 'limitato' : (inv.length && inv.every(function (x) { return x.stato === 'offline'; }) ? 'offline' : (stati.avvio ? 'avvio' : (stati.spento ? 'spento' : 'attesa')))));
        var sv = STATI[st] || STATI.attesa, el = $('inv-stato');
        el.className = 'en-inv-stato' + (sv[1] ? ' ' + sv[1] : '');
        scrivi(el.querySelector('span'), T[sv[0]]);
        var pvMax = num(imp().pv_max_w), righe = '', oggiP = DATI && DATI.oggi;
        if (inv.length <= 1) {
            var x = inv[0] || {}, d = perId[x.id] || {};
            var nome = ((x.marca || d.marca || '') + ' ' + (x.modello || d.modello || '')).trim() || x.nome || d.nome || 'Inverter';
            var sub = [d.seriale, num(x.temperatura_c) !== null ? dec(x.temperatura_c, 0) + ' °C' : null, d.fw ? t('firmware', { v: d.fw }) : null].filter(Boolean).join(' · ');
            righe += '<div class="en-inv-mod">' + esc(nome) + '</div>' + (sub ? '<div class="en-inv-sub">' + esc(sub) + '</div>' : '');
            var pv = num(x.pv_w) || 0;
            righe += '<div class="en-inv-r"><span>' + esc(T.potenzaAdesso) + '</span><div class="en-b"><i style="--p:' + (pvMax ? clamp(pv / pvMax, 0, 1) : 0).toFixed(3) + '"></i></div><span class="en-v">' + esc(fmtW(pv)) + '</span></div>';
        } else {
            righe += '<div class="en-inv-mod">' + esc(t('nInverter', { n: inv.length })) + (imp().modello ? ' · ' + esc(imp().modello) : '') + '</div>';
            var mx = Math.max.apply(null, inv.map(function (x) { return num(x.pv_w) || 0; }).concat([1]));
            inv.forEach(function (x) {
                var pv = num(x.pv_w) || 0;
                righe += '<div class="en-inv-r"><span>' + esc(x.nome || x.modello || ('#' + x.id)) + '</span><div class="en-b"><i style="--p:' + clamp(pv / mx, 0, 1).toFixed(3) + '"></i></div><span class="en-v">' + esc(fmtW(pv)) + '</span></div>';
            });
        }
        if (oggiP && num(oggiP.picco_pv_w)) righe += '<div class="en-inv-r2"><span>' + esc(T.piccoDiOggi) + '</span><b>' + esc(t('alleOra', { w: fmtW(oggiP.picco_pv_w), ora: oggiP.picco_pv_ora || '' })) + '</b></div>';
        var tot = API && API.totali && num(API.totali.prodotta_kwh);
        if (tot) righe += '<div class="en-inv-r2"><span>' + esc(T.totaleProd) + '</span><b>' + esc(fmtKwh(tot)) + '</b></div>';
        scriviHtml($('inv-righe'), righe);
    }

    /* ======================================================================
       TESTATA, STRUTTURA (senza batteria / senza misuratore)
       ====================================================================== */
    function aggiornaTesta() {
        var vivoT = T.tempoReale, spento = false;
        if (!API) { vivoT = T.attesaDati; spento = true; }
        else if (S.offline) { vivoT = T.offline; spento = true; }
        else if (API.aggiornato && API.ts) {
            var sec = Math.max(0, API.ts - API.aggiornato);
            vivoT += ' · ' + (sec < 3 ? T.aggAdesso : (sec < 90 ? t('aggS', { n: sec }) : t('aggMin', { n: Math.round(sec / 60) })));
        }
        scrivi($('vivo'), vivoT);
        classe($('pallino'), 'en-spento', spento);
        scrivi($('data'), maiuscola(dataCasa().toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'long' }).replace('.', '')));
        var im = imp(), parti = [];
        if (im.inverter > 1) parti.push(t('nInverter', { n: im.inverter }));
        if (im.modello) parti.push(im.modello);
        if (S.batt && num(im.batteria_wh)) parti.push(t('battKwh', { v: kwhBreve(im.batteria_wh / 1000) }));
        if (num(im.soglia_w)) parti.push(t('contratto', { v: fmtKw(im.soglia_w) }));
        scrivi($('impianto'), parti.join(' · '));
    }
    var firmaStruttura = '';
    function aggiornaStruttura() {
        var f = (S.batt ? 'b' : '-') + (S.rete ? 'r' : '-');
        if (f === firmaStruttura) return;
        firmaStruttura = f;
        [].forEach.call(root.querySelectorAll('.en-se-batt'), function (e) { nascondi(e, !S.batt); });
        classe(root, 'en-nobatt', !S.batt);
        [].forEach.call(root.querySelectorAll('.en-se-rete'), function (e) { nascondi(e, !S.rete); });
        nascondi($('sc-batt'), !S.batt);
        nascondi($('sc-via-batt'), !S.batt);
        nascondi($('sc-p-batt'), !S.batt);
        nascondi($('sc-via-rete'), !S.rete);
        nascondi($('sc-p-rete'), !S.rete);
        nascondi($('spia'), !S.rete);
        if (!S.batt) particelle('batt', 0, false, false);
        if (!S.rete) particelle('rete', 0, false, false);
        sch.nodi = null; costruisciSchema();
    }
    function calcolaFlussi() {
        var f = (API && API.flussi) || {};
        fl = {
            pv_casa: num(f.pv_casa_w), pv_batt: num(f.pv_batteria_w), pv_rete: num(f.pv_rete_w), rete_casa: num(f.rete_casa_w),
            rete_batt: num(f.rete_batteria_w), batt_casa: num(f.batteria_casa_w), batt_rete: num(f.batteria_rete_w)
        };
        // senza misuratore il modulo non ripartisce la parte della rete: la casa prende il sole e la batteria che scarica
        if (fl.pv_casa === null) fl.pv_casa = Math.max(0, vivo.pv - Math.max(vivo.batt, 0) - (fl.pv_rete || 0));
        if (fl.pv_batt === null) fl.pv_batt = S.batt ? Math.min(vivo.pv, Math.max(vivo.batt, 0)) : 0;
        if (fl.batt_casa === null) fl.batt_casa = S.batt ? Math.max(-vivo.batt, 0) : 0;
    }

    /* ======================================================================
       DISEGNO COMPLETO (a ogni lettura) E ENTRATA
       ====================================================================== */
    function ridisegna() {
        if (!S.pronto) return;
        aggiornaStruttura();
        aggiornaTesta();
        aggiornaFlussi();
        aggiornaAdesso();
        aggiornaKpi();
        disegnaAndamento();
        if (S.batt) aggiornaBatteria();
        if (S.rete) { aggiornaSoglia(); aggiornaCosti(); aggiornaDove(); }
        aggiornaChi();
        aggiornaSett();
        aggiornaInverter();
    }
    var timerAnima = 0;
    function entrata() {
        if (leggera() || ridotto) return;
        inn.classList.remove('en-anima'); void inn.offsetWidth; inn.classList.add('en-anima');
        clearTimeout(timerAnima); timerAnima = setTimeout(function () { inn.classList.remove('en-anima'); }, 2600);
        animaGrafico = true; graficoAnimFino = 0;
        [].forEach.call(root.querySelectorAll('.en-spark'), function (e) { e.classList.remove('en-disegna'); void e.getBoundingClientRect(); e.classList.add('en-disegna'); });
        setTimeout(function () { [].forEach.call(root.querySelectorAll('.en-spark'), function (e) { e.classList.remove('en-disegna'); }); }, 2400);
    }

    /* ======================================================================
       DATI DAL SERVER
       ====================================================================== */
    var POLL_VIVO = 3000, POLL_DATI = 60000, timerVivo = 0, inCorso = false, sbagli = 0, tDati = 0, tAnno = 0, primoDopoApertura = false;
    function aperta() { return root.classList.contains('active'); }
    function prendi(url) {
        return fetch(url, { credentials: 'same-origin', cache: 'no-store', headers: { 'Accept': 'application/json' } })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    }
    function applicaVivo(j) {
        API = j;
        var f = j.flussi || {}, a = adattaSegni(f.pv_w, f.casa_w, f.rete_w, f.batteria_w, f.batteria_soc);
        S.offline = j.stato === 'offline';
        S.batt = !!j.ha_batteria; S.rete = !!j.ha_meter;
        vivo.pv = a.pv || 0; vivo.casa = a.casa || 0; vivo.rete = S.rete ? (a.rete || 0) : 0; vivo.batt = S.batt ? (a.batt || 0) : 0;
        vivo.soc = S.batt ? a.soc : null;
        calcolaFlussi();
        S.pronto = true;
    }
    function applicaDati(j) {
        DATI = j; tDati = Date.now();
        var o = j.orologio || {};
        if (num(o.h) !== null) { orologio.h0 = o.h; orologio.t0 = Date.now(); orologio.v = num(o.velocita) || 1; orologio.data = o.data || null; }
        cieloCache.v = null;
    }
    function passoDati() { return POLL_DATI / Math.max(1, orologio.v > 1 ? Math.min(12, orologio.v / 5) : 1); }
    function carica() {
        timerVivo = 0;
        if (!aperta() || document.hidden || inCorso) { pianifica(); return; }
        inCorso = true;
        var serveDati = !DATI || Date.now() - tDati > passoDati();
        var p = [prendi('/api/inverter/adesso').then(applicaVivo)];
        if (serveDati) {
            p.push(prendi('/api/energia/dati').then(applicaDati));
            p.push(prendi('/api/inverter/giorni?giorni=7').then(function (j) { G7 = j; }).catch(function () {}));
            p.push(prendi('/api/inverter/giorni?mesi=1').then(function (j) { GM = j; }).catch(function () {}));
        }
        if (periodo === 'anno' && (!GA || Date.now() - tAnno > passoDati() * 5)) p.push(prendi('/api/inverter/giorni?mesi=12').then(function (j) { GA = j; tAnno = Date.now(); }).catch(function () {}));
        Promise.all(p).then(function () {
            sbagli = 0;
            if (primoDopoApertura) { primoDopoApertura = false; ridisegna(); entrata(); }
            ridisegna();   // dopo entrata(): grafico che si disegna e barre che crescono
        }).catch(function () { sbagli++; if (S.pronto) { S.offline = S.offline || sbagli > 2; aggiornaTesta(); } })
          .then(function () { inCorso = false; pianifica(); });
    }
    function pianifica() {
        if (timerVivo) { clearTimeout(timerVivo); timerVivo = 0; }
        if (!aperta() || document.hidden) return;
        timerVivo = setTimeout(carica, sbagli ? Math.min(30000, POLL_VIVO * (1 + sbagli)) : POLL_VIVO);
    }
    function scegliPeriodo(p) {
        if (p === periodo) return;
        periodo = p;
        [].forEach.call($('periodo').querySelectorAll('button'), function (b) { var on = b.getAttribute('data-p') === p; classe(b, 'en-on', on); attr(b, 'aria-checked', on ? 'true' : 'false'); });
        if (p === 'anno' && !GA) { prendi('/api/inverter/giorni?mesi=12').then(function (j) { GA = j; tAnno = Date.now(); if (periodo === 'anno') { entrata(); ridisegna(); } }).catch(function () {}); }
        entrata(); ridisegna();
    }
    $('periodo').addEventListener('click', function (e) { var b = e.target.closest('button[data-p]'); if (b) scegliPeriodo(b.getAttribute('data-p')); });

    /* ======================================================================
       APERTURA, CHIUSURA, PAUSE
       ====================================================================== */
    function apri() {
        html.classList.add('wh-energia');
        classe(root, 'en-ferma', document.hidden);
        scalaScena(); if (vista === 'schema') costruisciSchema();
        primoDopoApertura = true;
        if (S.pronto) { primoDopoApertura = false; ridisegna(); entrata(); ridisegna(); }
        carica();
    }
    function chiudi() {
        html.classList.remove('wh-energia');
        if (timerVivo) { clearTimeout(timerVivo); timerVivo = 0; }
    }
    if ('MutationObserver' in window) {
        var eraAperta = aperta();
        new MutationObserver(function () { var a = aperta(); if (a === eraAperta) return; eraAperta = a; if (a) apri(); else chiudi(); }).observe(root, { attributes: true, attributeFilter: ['class'] });
        // Modalita' leggera accesa o spenta con la sezione aperta: subito ridisegnata (frecce, niente animazioni)
        var eraLeggera = leggera();
        new MutationObserver(function () { var l = leggera(); if (l !== eraLeggera) { eraLeggera = l; if (aperta()) ridisegna(); } }).observe(html, { attributes: true, attributeFilter: ['class'] });
    }
    document.addEventListener('visibilitychange', function () {
        classe(root, 'en-ferma', document.hidden);
        if (!aperta()) return;
        if (document.hidden) { if (timerVivo) { clearTimeout(timerVivo); timerVivo = 0; } } else carica();
    });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) { classe($('flussi'), 'en-fuori', !e[e.length - 1].isIntersecting); }, { threshold: 0 }).observe($('flussi'));
        new IntersectionObserver(function (e) { classe(inn.querySelector('.en-testa'), 'en-fuori', !e[e.length - 1].isIntersecting); }, { threshold: 0 }).observe($('pallino'));
    }
    var ridim = 0;
    function suRidimensiona() { clearTimeout(ridim); ridim = setTimeout(function () { if (!aperta()) return; scalaScena(); costruisciSchema(); disegnaAndamento(); aggiornaSett(); }, 120); }
    if ('ResizeObserver' in window) new ResizeObserver(suRidimensiona).observe(inn); else window.addEventListener('resize', suRidimensiona);

    // indirizzo /mobile#energia (anche da /energia): si apre la sezione
    function daIndirizzo() {
        if (location.hash !== '#energia') return;
        var voce = document.querySelector('.wh-nav-energia');
        if (voce && typeof window.switchRoom === 'function' && !aperta()) window.switchRoom('room-energia', voce);
    }
    window.addEventListener('hashchange', daIndirizzo);

    window.__whEnergia = {
        adattaSegni: adattaSegni,
        stato: function () {
            var vis = function (l) { return $('pt-strato').querySelectorAll('.en-pt-' + l + ':not([hidden])').length; };
            return { pronto: S.pronto, aperta: aperta(), vista: vista, periodo: periodo, S: S, vivo: vivo, flussi: fl, h: oraCasa(),
                     cielo: { alba: albaTramonto()[0], tramonto: albaTramonto()[1], giorno: +$('cielo-giorno').getAttribute('opacity'), alba_op: +$('cielo-alba').getAttribute('opacity'),
                              tramonto_op: +$('cielo-tramonto').getAttribute('opacity'), stelle: +$('stelle').getAttribute('opacity'), luna: +$('luna').getAttribute('opacity'), sole: +($('sole').style.opacity || 1), dy: dySole },
                     particelle: { sole: vis('sole'), batt: vis('batt'), rete: vis('rete') },
                     verso: { sole: 'sole->casa', batt: linee.batt.n ? (linee.batt.inv ? 'batteria->casa' : 'casa->batteria') : null, rete: linee.rete.n ? (linee.rete.inv ? 'rete->casa' : 'casa->rete') : null },
                     timer: !!timerVivo, ferma: root.classList.contains('en-ferma'), fuori: $('flussi').classList.contains('en-fuori') };
        },
        dati: function () { return { adesso: API, energia: DATI, giorni7: G7, mese: GM, anno: GA }; },   // per le prove (sola lettura)
        vista: function (v) { scegliVista(v); },
        periodo: function (p) { scegliPeriodo(p); }
    };
    mostraVista(lsLeggi() || 'scena', false);
    caricaVista();
    if (aperta()) apri();
    if (document.readyState === 'complete') daIndirizzo(); else window.addEventListener('load', daIndirizzo);
})();
