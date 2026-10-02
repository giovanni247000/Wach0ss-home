/* ============================================================================
   ENERGIA - sezione dell'app (mobile.html), dati veri dagli inverter (inverter.py)
   Riproduce il mockup approvato "finale" (scratchpad/mockup/energia/finale/energia.html): stessa scena, stesse
   card, stessi stati, stessa resa in Modalita' leggera e senza batteria / senza misuratore.
   Caricato SOLO se inverter_attivo (script in mobile.html dentro {% if inverter_attivo %}).

   DATI
     GET /api/inverter/adesso  ogni 3 s (solo con la sezione aperta e la scheda visibile): flussi vivi, energie di
                               oggi, costi, soglia, stato degli inverter.
     GET /api/energia/dati     all'apertura e ogni 60 s: curva della giornata ogni 15 min, previsione, ieri alla
                               stessa ora, picchi con l'ora, minuti oltre la soglia, settimana, prezzi, orologio di casa.
   SEGNI (unico punto di conversione: adattaSegni)
     API (inverter.py, PROGETTO.md sez. 1): rete_w + prelievo / - immissione;  batteria_w + CARICA / - SCARICA.
     Pagina (mockup):                       rete   + prelievo / - immissione;  batt       + SCARICA / - CARICA
                                            (+ = energia che va verso la casa, come la rete).
   ANIMAZIONE
     Un solo requestAnimationFrame (frame). Fermo con: sezione non aperta, scheda nascosta, scena fuori dallo
     schermo (IntersectionObserver sulla fascia delle linee), pannello aperto (html.wh-dietro), Modalita' leggera
     (html.wh-leggera: immagine ferma con le frecce) e prefers-reduced-motion. Fermo ma visibile: tick da 1 s.
   TESTI
     Frasi italiane nell'oggetto T; con la lingua inglese passano da window.WH_T (dizionario en.json,
     per_pagina['/mobile']). Dove una parola italiana ha gia' nel dizionario un'altra resa (es. "Rete" = Network)
     la chiave di traduzione e' una frase distinta (CHIAVI_TR) e in italiano si legge la parola semplice.
   ============================================================================ */
(function () {
    'use strict';
    var root = document.getElementById('room-energia');
    if (!root || window.__whEnergia) return;
    var $ = function (id) { return document.getElementById('en-' + id); };
    var html = document.documentElement;
    var leggera = function () { return html.classList.contains('wh-leggera'); };
    var dietro = function () { return html.classList.contains('wh-dietro'); };
    var ridotto = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var LINGUA = (window.WH_LINGUA || html.getAttribute('lang') || 'it').slice(0, 2);
    var EN = LINGUA === 'en';
    var DEC = EN ? '.' : ',';
    var LOCALE = EN ? 'en-GB' : 'it-IT';

    /* ======================================================================
       TESTI
       ====================================================================== */
    var T = {
        siCarica: 'Si carica', siScarica: 'Si scarica', ferma: 'Ferma', piena: 'Piena', riserva: 'Alla riserva',
        immissione: 'Immissione', prelievo: 'Prelievo', equilibrio: 'In equilibrio', batteria: 'Batteria', rete: 'Rete',
        dalSole: 'dal sole', dallaBatt: 'dalla batteria', dallaRete: 'dalla rete', tuttaDalSole: 'Tutta dal sole', stimata: 'Consumo stimato',
        notte: 'Notte', albaAlle: 'Alba alle {ora}', tramontoAlle: 'tramonto alle {ora}', produce: 'Sta producendo', nuvole: 'Qualche nuvola', bassaLuce: 'Poca luce',
        flusso: 'Flusso in tempo reale', flussoFermo: 'Flusso (immagine ferma)', flussoStimato: 'Flusso · consumo stimato', flussoOffline: 'Flusso · inverter non raggiungibile', inAttesaDati: 'In attesa dei dati',
        avvisoVicino: 'Stai per superare i {kw}', avvisoSopra: 'Superata la soglia di {kw}',
        strT1Sopra: 'Stai superando la soglia di {kw}', strT2Sopra: 'Prelievo {w}. Spegni qualcosa per evitare il distacco.',
        strT1Vicino: 'Stai per superare la soglia di {kw}', strT2Vicino: 'Prelievo {w}. Evita di accendere altro.',
        sgSotto: 'Sotto la soglia · liberi {w}', sgVicino: 'Stai per superare i {kw} · liberi {w}', sgImm: 'Nessun prelievo · stai immettendo {w}',
        sg3: 'Oltre {kw} · tollerato fino a {lim}', sg33: 'Oltre {lim} · rischio distacco: spegni qualcosa', sg4: 'Oltre {st} · il contatore stacca subito',
        oltre: 'Oltre {kw}', alle: 'alle {ora}', nessuno: 'ancora nessuno', min: 'min', ore: 'h',
        pienaFra: 'Piena fra {d} (verso le {ora})', autonomia: 'Autonomia {d} con questo consumo (fino alle {ora})', inAttesaSole: 'Alla riserva · in attesa del sole',
        daCaricare: '{kwh} da caricare', disponibili: '{kwh} disponibili', riservaPct: 'riserva {p}%',
        spesi: '{kwh} spesi', incassati: '{kwh} incassati', risparmiati: '{kwh} tenuti in casa',   /* autoconsumata = prodotta - immessa: usata in casa + messa in batteria */
        oggiDalle: 'dalle 00:00 alle {ora}', ieri: 'ieri {v}',
        invFunzione: 'In funzione', invAttesaNotte: 'In attesa (notte)', invBassaLuce: 'In funzione · poca luce', invAttesa: 'In attesa',
        invLimitato: 'Produzione limitata', invGuasto: 'Guasto', invOffline: 'Non raggiungibile', invAvvio: 'Avvio', invSpento: 'Spento',
        inFunzione: 'in funzione', inAttesa: 'in attesa', inGuasto: 'in guasto', nonRaggiungibile: 'non raggiungibile',
        adesso: 'adesso', agg: 'agg. {t}', secFa: '{n} s fa', minFa: '{n} min fa',
        ogni15: 'ogni 15 min · max {w}', previsione: 'previsione', produzione: 'Produzione', consumo: 'Consumo',
        carica: 'carica', scarica: 'scarica', mono: 'Mono',
        F1q: 'Lun–Ven 8–19', F2q: 'Sera, mattina e sabato', F3q: 'Notte e festivi', MONOq: 'Tutte le ore',
        nInverter: '{n} inverter'
    };
    // parole che nel dizionario hanno gia' un'altra resa: si traducono con una chiave propria
    var CHIAVI_TR = { rete: 'Rete (energia)', consumo: 'Consumo (energia)', ferma: 'Ferma (batteria)' };
    if (EN && typeof window.WH_T === 'function') {
        Object.keys(T).forEach(function (k) {
            var chiave = CHIAVI_TR[k] || T[k], v = window.WH_T(chiave);
            if (typeof v === 'string' && v !== chiave) T[k] = v;
        });
    }
    function t(k, v) { return T[k].replace(/\{(\w+)\}/g, function (_, n) { return v[n]; }); }
    (function () { var lc = $('g-leg-casa'); if (lc) lc.textContent = T.consumo; })();   // legenda: "Consumo" del mockup

    /* ======================================================================
       NUMERI
       ====================================================================== */
    function dec(x, n) { return x.toFixed(n).replace('.', DEC); }
    function kwParti(w) { var a = Math.abs(w); if (a < 1000) return [String(Math.round(a)), 'W']; return [dec(a / 1000, a < 10000 ? 2 : 1), 'kW']; }
    function fmtW(w) { var p = kwParti(w); return p[0] + ' ' + p[1]; }
    function fmtKWhTxt(x) { return dec(x, 1) + ' kWh'; }
    function fmtKWhN(x) { return dec(x, 1); }
    function fmtEuro(x) { return EN ? '€' + dec(x, 2) : dec(x, 2) + ' €'; }
    function fmtKw2(w) { return dec(w / 1000, 2) + ' kW'; }
    function fmtKwSoglia(w) { var k = w / 1000; return (Math.abs(k - Math.round(k)) < 0.001 ? String(Math.round(k)) : dec(k, 1)) + ' kW'; }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function fmtOra(h) { var m = Math.floor(h * 60 + 0.5) % 1440; if (m < 0) m += 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
    function fmtDurata(ore) { if (!isFinite(ore) || ore <= 0) return '—'; var m = Math.round(ore * 60); if (m < 60) return m + ' ' + T.min; return Math.floor(m / 60) + ' ' + T.ore + ' ' + pad(m % 60); }
    function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
    function lerp(a, b, k) { return a + (b - a) * k; }
    function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
    function hDa(hhmm) { if (!hhmm) return null; var p = String(hhmm).split(':'); return (+p[0]) + (+p[1]) / 60; }

    /* scritture nel DOM solo se il valore cambia; i testi cambiano il nodo di testo esistente (niente childList) */
    function scrivi(el, s) {
        if (!el || el.__v === s) return; el.__v = s;
        var n = el.firstChild;
        if (n && n.nodeType === 3 && !n.nextSibling) n.nodeValue = s; else el.textContent = s;
    }
    function scriviNum(el, valore, unita) {   // "3,96<small>kW</small>" senza innerHTML a ogni giro
        if (!el) return;
        var k = valore + '|' + unita; if (el.__v === k) return; el.__v = k;
        if (!el.__n) { el.textContent = ''; el.__n = document.createTextNode(''); el.__s = document.createElement('small'); el.__s.appendChild(document.createTextNode('')); el.appendChild(el.__n); el.appendChild(el.__s); }
        el.__n.nodeValue = valore; el.__s.firstChild.nodeValue = unita; el.__s.style.display = unita ? '' : 'none';
    }
    function scriviW(el, w) { var p = kwParti(w); scriviNum(el, p[0], p[1]); }
    function scriviKWh(el, x) { if (x === null) scriviNum(el, '—', ''); else scriviNum(el, dec(x, x < 10 ? 1 : 0), 'kWh'); }
    function attr(el, n, v) { if (!el) return; v = String(v); var c = el.__a || (el.__a = {}); if (c[n] === v) return; c[n] = v; el.setAttribute(n, v); }
    function stile(el, p, v) { if (!el) return; v = String(v); var c = el.__st || (el.__st = {}); if (c[p] === v) return; c[p] = v; el.style.setProperty(p, v); }
    function classe(el, c, si) { if (el && el.classList.contains(c) !== !!si) el.classList.toggle(c, !!si); }
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

    /* ======================================================================
       ADATTATORE DEI SEGNI (unico punto): API inverter.py -> convenzione della pagina
       ====================================================================== */
    function adattaSegni(pv_w, casa_w, rete_w, batteria_w, soc) {
        var pv = num(pv_w), rete = num(rete_w), bApi = num(batteria_w), casa = num(casa_w);
        var batt = bApi === null ? null : -bApi;                       // + carica (API) -> - carica (pagina)
        if (casa === null && pv !== null) casa = Math.max(0, pv + (batt || 0));   // senza misuratore: stima (pv - carica + scarica)
        return { pv: pv, casa: casa, rete: rete, batt: batt, soc: num(soc) };
    }

    /* ======================================================================
       STATO
       ====================================================================== */
    var S = { batteria: false, rete: false, soglia: false, offline: false, pronto: false };
    var IMP = { cap: null, riserva: 10, soglia: 3000, limite: 3300, stacco: 4000, avviso: 90, pvMax: null, modello: null };
    var vivo = { pv: 0, casa: 0, batt: 0, rete: 0, soc: 0 };     // ultima lettura (pagina)
    var API = null, DATI = null, tVivo = 0, tDati = 0;
    var orologio = { h0: null, t0: 0, v: 1 };
    var ALBA = 7, TRAMONTO = 19, albaNota = false, tramontoNota = false;
    function oraCasa() {
        if (orologio.h0 === null) { var d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; }
        return (orologio.h0 + (Date.now() - orologio.t0) / 3600000 * orologio.v) % 24;
    }
    function fasciaOra() { return API && API.tariffa && API.tariffa.fascia ? API.tariffa.fascia : (DATI && DATI.tariffa ? DATI.tariffa.fascia : null); }
    function tipoTariffa() { return (API && API.tariffa && API.tariffa.tipo) || (DATI && DATI.tariffa && DATI.tariffa.tipo) || 'mono'; }
    function prezzi() { return (DATI && DATI.tariffa && DATI.tariffa.prezzi) || {}; }

    /* ======================================================================
       LA SCENA: due disposizioni (larga 1000x400, stretta 400x460 sotto i 620 px di scena)
       ====================================================================== */
    var scena = $('scena'), film = $('film'), tela = $('tela'), ctx = tela.getContext('2d');
    var LAY = {
        larga: {
            vb: [1000, 400], suolo: 330, sole: [180, 112], soleS: 1, casa: [500, 330], casaS: 1, batt: [250, 330], battS: 1, rete: [820, 330], reteS: 1, luna: [890, 70], stelle: 60,
            via: { sole: 'M 222 150 C 300 210, 350 215, 452 224', batt: 'M 282 298 C 330 298, 380 294, 436 292', rete: 'M 792 285 C 720 285, 650 290, 564 292' },
            eti: { sole: [120, 230], casa: [500, 372], batt: [250, 372], rete: [820, 372], lsole: [335, 185], lbatt: [358, 272], lrete: [678, 262], avviso: [820, 170] }, passoFrecce: 22
        },
        stretta: {
            vb: [400, 460], suolo: 390, sole: [92, 112], soleS: 0.82, casa: [200, 390], casaS: 0.82, batt: [56, 390], battS: 0.9, rete: [352, 390], reteS: 0.85, luna: [340, 58], stelle: 34,
            via: { sole: 'M 118 140 C 160 190, 176 240, 174 300', batt: 'M 84 358 C 104 352, 126 352, 148 356', rete: 'M 334 356 C 310 350, 280 350, 252 356' },
            eti: { sole: [262, 112], casa: [200, 430], batt: [64, 430], rete: [346, 430], lsole: [160, 224], lbatt: [114, 334], lrete: [288, 332], avviso: [300, 262] }, passoFrecce: 17
        }
    };
    var lay = null, campioni = {}, scala = 1;
    function pathPunti(d) {   // curva campionata una volta (120 punti): niente getPointAtLength per fotogramma
        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d);
        var L = p.getTotalLength(), N = 120, pts = [];
        for (var i = 0; i <= N; i++) { var q = p.getPointAtLength(L * i / N); pts.push([q.x, q.y]); }
        return { pts: pts, L: L };
    }
    function puntoSu(c, tt) {
        tt = tt < 0 ? 0 : (tt > 1 ? 1 : (tt || 0));
        var N = c.pts.length - 1, f = tt * N, i = Math.floor(f), g = f - i;
        if (i >= N) return c.pts[N];
        var a = c.pts[i], b = c.pts[i + 1];
        return [a[0] + (b[0] - a[0]) * g, a[1] + (b[1] - a[1]) * g];
    }
    var frecceDati = {};
    function frecceStatiche(gruppo, c, passoU) {   // frecce ferme lungo la linea (Modalita' leggera)
        var n = Math.max(2, Math.floor(c.L / passoU)), s = '', dati = [];
        for (var i = 1; i < n; i++) {
            var tt = i / n, p = puntoSu(c, tt), q = puntoSu(c, Math.min(1, tt + 0.02)), ang = Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;
            dati.push([p[0], p[1], ang]); s += '<path d="M-4 -4 L1 0 L-4 4"/>';
        }
        gruppo.innerHTML = s; frecceDati[gruppo.id] = { dati: dati, inverse: null };
        orientaFrecce(gruppo, false);
    }
    function orientaFrecce(gruppo, inverse) {
        var fd = frecceDati[gruppo.id]; if (!fd || fd.inverse === inverse) return; fd.inverse = inverse;
        var paths = gruppo.children;
        for (var i = 0; i < paths.length; i++) { var d = fd.dati[i]; paths[i].setAttribute('transform', 'translate(' + d[0].toFixed(1) + ' ' + d[1].toFixed(1) + ') rotate(' + (d[2] + (inverse ? 180 : 0)).toFixed(1) + ')'); }
    }
    function stelleCasuali(n, w, h) {
        var s = '', seed = 7;
        function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
        for (var i = 0; i < n; i++) s += '<circle cx="' + (rnd() * w).toFixed(0) + '" cy="' + (rnd() * h * 0.6).toFixed(0) + '" r="' + (0.6 + rnd() * 1.1).toFixed(1) + '" opacity="' + (0.3 + rnd() * 0.6).toFixed(2) + '"/>';
        return s;
    }
    function skyline(w, suolo) {
        var d = 'M0 ' + suolo, x = 0, seed = 3, luci = '';
        function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
        while (x < w) {
            var lw = 18 + rnd() * 46, hh = 14 + rnd() * 52;
            d += ' V' + (suolo - hh).toFixed(0) + ' H' + (x + lw).toFixed(0);
            for (var k = 0; k < lw / 12; k++) if (rnd() < 0.35) luci += '<rect x="' + (x + 4 + k * 10).toFixed(0) + '" y="' + (suolo - hh + 6 + Math.floor(rnd() * (hh - 10) / 8) * 8).toFixed(0) + '" width="1.8" height="2.4" opacity="' + (0.3 + rnd() * 0.6).toFixed(2) + '"/>';
            x += lw;
        }
        return { d: d + ' V' + suolo + ' Z', luci: luci };
    }
    function pos(el, xy) { el.style.left = (xy[0] / lay.vb[0] * 100) + '%'; el.style.top = (xy[1] / lay.vb[1] * 100) + '%'; }
    function tr(id, xy, s) { $(id).setAttribute('transform', 'translate(' + xy[0] + ' ' + xy[1] + ')' + (s && s !== 1 ? ' scale(' + s + ')' : '')); }
    function impaginaScena() {
        var w = scena.clientWidth, h = scena.clientHeight;
        if (!w) return false;                                   // sezione nascosta: si impagina all'apertura
        var stretta = w < 620, nuovo = stretta ? LAY.stretta : LAY.larga;
        if (nuovo !== lay) {
            lay = nuovo;
            scena.classList.toggle('en-stretta', stretta);
            film.setAttribute('viewBox', '0 0 ' + lay.vb[0] + ' ' + lay.vb[1]);
            film.querySelectorAll('#en-cielo, .en-cielo-sera, .en-cielo-giorno').forEach(function (r) { r.setAttribute('width', lay.vb[0]); r.setAttribute('height', lay.vb[1]); });
            $('suolo').setAttribute('y', lay.suolo); $('suolo').setAttribute('width', lay.vb[0]); $('suolo').setAttribute('height', lay.vb[1] - lay.suolo);
            $('orizzonte').setAttribute('y1', lay.suolo); $('orizzonte').setAttribute('y2', lay.suolo); $('orizzonte').setAttribute('x2', lay.vb[0]);
            $('stelle').innerHTML = stelleCasuali(lay.stelle, lay.vb[0], lay.suolo);
            var sk = skyline(lay.vb[0], lay.suolo); $('skyline').setAttribute('d', sk.d); $('skyline-luci').innerHTML = sk.luci;
            tr('luna', lay.luna); tr('nodo-sole', lay.sole, lay.soleS); tr('nodo-casa', lay.casa, lay.casaS); tr('nodo-batt', lay.batt, lay.battS); tr('nodo-rete', lay.rete, lay.reteS);
            [['alone-casa', lay.casa], ['alone-batt', lay.batt], ['alone-rete', lay.rete], ['alone-rete-rosso', lay.rete]].forEach(function (a) { $(a[0]).setAttribute('cx', a[1][0]); $(a[0]).setAttribute('cy', a[1][1] + 2); });
            $('fili').style.display = stretta ? 'none' : '';
            ['sole', 'batt', 'rete'].forEach(function (k) {
                $('via-' + k).setAttribute('d', lay.via[k]); $('glow-' + k).setAttribute('d', lay.via[k]); $('glow2-' + k).setAttribute('d', lay.via[k]);
                campioni[k] = pathPunti(lay.via[k]);
                frecceStatiche($('frecce-' + k), campioni[k], lay.passoFrecce);
            });
            pos($('e-sole'), lay.eti.sole); pos($('e-casa'), lay.eti.casa); pos($('e-batt'), lay.eti.batt); pos($('e-rete'), lay.eti.rete);
            pos($('l-sole'), lay.eti.lsole); pos($('l-batt'), lay.eti.lbatt); pos($('l-rete'), lay.eti.lrete); pos($('avviso'), lay.eti.avviso);
        }
        var dpr = Math.min(stretta ? 1.5 : 2, window.devicePixelRatio || 1);
        if (tela.width !== Math.round(w * dpr) || tela.height !== Math.round(h * dpr)) { tela.width = Math.round(w * dpr); tela.height = Math.round(h * dpr); }
        scala = w * dpr / lay.vb[0];
        primoDisegno = true;
        return true;
    }

    /* ======================================================================
       PARTICELLE (canvas): sprite radiale pre-disegnato, scia di 5 fantasmi
       ====================================================================== */
    var sprites = {};
    function sprite(col) {
        if (sprites[col]) return sprites[col];
        var c = document.createElement('canvas'); c.width = c.height = 32; var g = c.getContext('2d');
        var r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
        r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, col + '1)'); r.addColorStop(0.45, col + '0.45)'); r.addColorStop(1, col + '0)');
        g.fillStyle = r; g.fillRect(0, 0, 32, 32);
        return (sprites[col] = c);
    }
    var COL = { sole: 'rgba(255,214,10,', batt: 'rgba(48,209,88,', imm: 'rgba(191,90,242,', prel: 'rgba(255,93,85,' };
    var flussi = { sole: { w: 0, col: 'sole', p: [], n: 0, dir: 1, v: 0 }, batt: { w: 0, col: 'batt', p: [], n: 0, dir: 1, v: 0 }, rete: { w: 0, col: 'imm', p: [], n: 0, dir: 1, v: 0 } };
    var MAX_P = 10;
    function aggiornaFlussi(r, dt) {
        var def = [['sole', r.pv, 'sole'], ['batt', S.batteria ? r.batt : 0, 'batt'], ['rete', S.rete ? r.rete : 0, r.rete > 0 ? 'prel' : 'imm']];
        for (var j = 0; j < 3; j++) {
            var d = def[j], f = flussi[d[0]], w = d[1] || 0, a = Math.abs(w);
            f.w = w; f.col = d[2];
            f.dir = (d[0] === 'sole' || w >= 0) ? 1 : -1;            // +1: verso la casa; -1: dalla casa al nodo
            f.n = a < 40 ? 0 : clamp(Math.round(1 + a / 320), 1, MAX_P);
            f.v = a < 40 ? 0 : 0.10 + Math.min(a, 6000) / 6000 * 0.42;  // giri di linea al secondo
            if (f.n === 0) { f.p.length = 0; continue; }
            while (f.p.length < f.n) f.p.push({ t: Math.random(), s: 0.85 + Math.random() * 0.3 });
            for (var i = f.p.length - 1; i >= 0; i--) {
                var q = f.p[i]; q.t += f.v * q.s * dt;
                if (q.t >= 1) { if (f.p.length > f.n) { f.p.splice(i, 1); continue; } q.t -= 1; }
            }
        }
    }
    function disegnaParticelle() {
        ctx.setTransform(scala, 0, 0, scala, 0, 0);
        ctx.clearRect(0, 0, lay.vb[0], lay.vb[1]);
        ctx.globalCompositeOperation = 'lighter';
        var chiavi = ['sole', 'batt', 'rete'];
        for (var j = 0; j < 3; j++) {
            var f = flussi[chiavi[j]], c = campioni[chiavi[j]]; if (!c || !f.p.length) continue;
            var sp = sprite(COL[f.col]), r = 5.5 + Math.min(Math.abs(f.w), 5000) / 5000 * 3.5;
            for (var i = 0; i < f.p.length; i++) {
                var tt = f.dir > 0 ? f.p[i].t : 1 - f.p[i].t;
                for (var g = 5; g >= 1; g--) {
                    var tb = tt - f.dir * g * 0.022; if (tb < 0 || tb > 1) continue;
                    var p = puntoSu(c, tb), rr = r * (1 - g * 0.14);
                    ctx.globalAlpha = 0.55 - g * 0.09;
                    ctx.drawImage(sp, p[0] - rr, p[1] - rr, rr * 2, rr * 2);
                }
                var hh = puntoSu(c, tt); ctx.globalAlpha = 1;
                ctx.drawImage(sp, hh[0] - r, hh[1] - r, r * 2, r * 2);
            }
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function pulisciTela() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, tela.width, tela.height); }

    /* ======================================================================
       STRUTTURA: cosa c'e' e cosa no (batteria, misuratore, soglia)
       ====================================================================== */
    var strutturaFirma = '';
    function aggiornaStruttura() {
        var b = S.batteria, r = S.rete, sg = S.rete && S.soglia;
        var firma = [b, r, sg, tipoTariffa()].join('|');
        if (firma === strutturaFirma) return;
        strutturaFirma = firma;
        ['nodo-batt', 'link-batt', 'e-batt', 'l-batt'].forEach(function (id) { $(id).classList.toggle('en-assente', !b); });
        ['nodo-rete', 'link-rete', 'e-rete', 'l-rete'].forEach(function (id) { $(id).classList.toggle('en-assente', !r); });
        $('c-batt').classList.toggle('en-nascosta', !b); $('pill-batt').classList.toggle('en-nascosta', !b);
        $('c-soglia').classList.toggle('en-nascosta', !sg); $('pill-rete').classList.toggle('en-nascosta', !r);
        $('c-costo').classList.toggle('en-senza-rete', !r);
        $('griglia').classList.toggle('en-cfg-nobatt', !b); $('griglia').classList.toggle('en-cfg-norete', !sg);
        root.querySelectorAll('.en-se-rete').forEach(function (e) { e.style.display = r ? '' : 'none'; });
        $('avviso').classList.remove('en-attento', 'en-superata'); scena.classList.remove('en-sopra-soglia');
        disegnaTariffe(); disegnaTachimetro(); disegnaGrafico(); disegnaSettimana();
    }
    function notaStato() {
        if (!S.pronto) return T.inAttesaDati;
        if (S.offline) return T.flussoOffline;
        if (fermo()) return T.flussoFermo;
        return S.rete ? T.flusso : T.flussoStimato;
    }

    /* ======================================================================
       AGGIORNAMENTO: scena (etichette, aloni, cielo, pillole) e card
       ====================================================================== */
    var vis = { pv: 0, casa: 0, batt: 0, rete: 0, soc: 0 }, primoDisegno = true;
    function previsioneA(h) {
        if (!DATI || !DATI.previsione) return null;
        var q = Math.floor(h * 4) / 4, p = DATI.previsione;
        for (var i = 0; i < p.length; i++) if (Math.abs(p[i].h - q) < 0.01) return num(p[i].pv_w);
        return null;
    }
    function statoSole(pv, h) {
        var ref = pvRiferimento() || 0;
        if (pv >= 30) {
            var prev = previsioneA(h);
            if (prev !== null && ref && prev > ref * 0.15 && pv < prev * 0.6) return T.nuvole;
            return (ref && pv < ref * 0.08) ? T.bassaLuce : T.produce;
        }
        if (albaNota && h < ALBA) return t('albaAlle', { ora: fmtOra(ALBA) });
        if (tramontoNota && h >= TRAMONTO - 0.3 && h < TRAMONTO + 2) return T.notte + ' · ' + t('tramontoAlle', { ora: fmtOra(TRAMONTO) });
        return T.notte;
    }
    function aggiornaScena() {
        var h = oraCasa(), pv = vis.pv, casa = vis.casa, batt = vis.batt, rete = vis.rete, soc = vis.soc, fermoOra = fermo();
        var giorno = clamp(Math.min(h - ALBA, TRAMONTO - h) / 1.4, 0, 1), sera = clamp(1 - Math.abs(Math.min(Math.abs(h - ALBA), Math.abs(h - TRAMONTO)) / 1.6), 0, 1) * 0.85;
        stile(scena, '--o-giorno', giorno.toFixed(2)); stile(scena, '--o-sera', sera.toFixed(2)); stile(scena, '--o-luna', (1 - giorno).toFixed(2));
        classe(scena, 'en-notte', pv < 30);
        scrivi($('scena-ora'), fmtOra(h)); var fo = fasciaOra(); scrivi($('scena-fascia'), S.rete && fo && tipoTariffa() === 'fasce' ? fo : '');
        [['sole', pv], ['batt', S.batteria ? batt : 0], ['rete', S.rete ? rete : 0]].forEach(function (d) {
            var a = Math.abs(d[1]), viva = a >= 40;
            stile($('glow-' + d[0]), 'opacity', viva ? clamp(0.12 + a / 8000, 0.12, 0.45).toFixed(3) : 0);
            stile($('glow2-' + d[0]), 'opacity', viva ? clamp(0.3 + a / 4000, 0.3, 0.9).toFixed(3) : 0);
            stile($('frecce-' + d[0]), 'opacity', (fermoOra && viva) ? clamp(0.55 + a / 4000, 0.55, 1).toFixed(3) : 0);
        });
        var colRete = rete > 0 ? '#FF5D55' : '#BF5AF2', rgbRete = rete > 0 ? 'var(--c-prel)' : 'var(--c-imm)';
        attr($('glow-rete'), 'stroke', colRete); attr($('glow2-rete'), 'stroke', colRete); attr($('frecce-rete'), 'stroke', colRete);
        stile($('l-rete'), '--lc', rgbRete); stile($('e-rete'), '--nc', rgbRete); stile($('pill-rete'), '--pc', rgbRete);
        if (fermoOra) { orientaFrecce($('frecce-batt'), batt < 0); orientaFrecce($('frecce-rete'), rete < 0); }
        stile($('finestre'), 'opacity', clamp(0.35 + casa / 3000, 0.35, 1).toFixed(3));
        attr($('alone-casa'), 'opacity', clamp(casa / 4000, 0.15, 0.8).toFixed(3));
        attr($('alone-batt'), 'opacity', S.batteria ? clamp(0.12 + Math.abs(batt) / 3000, 0.12, 0.8).toFixed(3) : 0);
        attr($('alone-rete'), 'opacity', S.rete && rete < -40 ? clamp(-rete / 4000, 0.15, 0.7).toFixed(3) : 0);
        attr($('alone-rete-rosso'), 'opacity', S.rete && rete > 40 ? clamp(rete / 4000, 0.12, 0.8).toFixed(3) : 0);
        var SOG = IMP.soglia, sgOk = S.rete && S.soglia;
        var sopra = sgOk && rete > SOG, vicino = sgOk && !sopra && rete > SOG * IMP.avviso / 100;
        classe(scena, 'en-sopra-soglia', sopra);
        classe($('avviso'), 'en-superata', sopra); classe($('avviso'), 'en-attento', vicino);
        scrivi($('avviso-testo'), t(sopra ? 'avvisoSopra' : 'avvisoVicino', { kw: fmtKwSoglia(SOG) }));
        var hL = 54 * soc / 100; attr($('batt-livello'), 'height', hL.toFixed(1)); attr($('batt-livello'), 'y', (-15 - hL).toFixed(1));
        var colB = soc <= 15 ? '#FF9F0A' : '#30D158'; attr($('batt-livello'), 'fill', colB); attr($('batt-led'), 'fill', colB);
        var stretta = lay === LAY.stretta;
        scriviW($('v-sole'), pv); scrivi($('s-sole'), S.pronto ? statoSole(pv, h) : '');
        scriviW($('v-casa'), casa);
        var fonte = [];
        if (pv > 40) fonte.push([Math.min(pv, casa), T.dalSole]);
        if (S.batteria && batt > 40) fonte.push([batt, T.dallaBatt]);
        if (S.rete && rete > 40) fonte.push([rete, T.dallaRete]);
        fonte.sort(function (a, b) { return b[0] - a[0]; });
        if (stretta) fonte = fonte.slice(0, 1);
        var sCasa;
        if (!S.pronto) sCasa = '';
        else if (!S.rete) sCasa = T.stimata;
        else if (fonte.length === 1 && fonte[0][1] === T.dalSole && fonte[0][0] >= casa * 0.995) sCasa = T.tuttaDalSole;
        else sCasa = casa > 0 ? (fonte.map(function (f) { return Math.round(clamp(f[0] / casa * 100, 0, 100)) + '% ' + f[1]; }).join(' · ') || '—') : '—';
        scrivi($('s-casa'), sCasa); classe($('e-casa'), 'en-rosso', sopra);
        scriviNum($('v-batt'), String(Math.round(soc)), '%');
        var RIS = IMP.riserva;
        scrivi($('s-batt'), batt < -40 ? T.siCarica + (stretta ? '' : ' · ' + fmtW(batt)) : batt > 40 ? T.siScarica + (stretta ? '' : ' · ' + fmtW(batt)) : (soc >= 99 ? T.piena : soc <= RIS + 0.5 ? T.riserva : T.ferma));
        scriviW($('v-rete'), rete);
        scrivi($('lbl-rete'), T.rete);
        scrivi($('s-rete'), rete > 40 ? T.prelievo : rete < -40 ? T.immissione : T.equilibrio);
        scrivi($('lv-sole'), fmtW(pv)); scrivi($('lv-batt'), fmtW(batt)); scrivi($('lv-rete'), fmtW(rete));
        classe($('l-sole'), 'en-ferma', pv < 40); classe($('l-batt'), 'en-ferma', Math.abs(batt) < 40); classe($('l-rete'), 'en-ferma', Math.abs(rete) < 40);
        classe($('l-batt'), 'en-inversa', batt < 0); classe($('l-rete'), 'en-inversa', rete < 0);
        // pillole
        scrivi($('p-sole'), fmtW(pv)); classe($('pill-sole'), 'active', pv > 40);
        scrivi($('p-batt'), Math.round(soc) + '%'); scrivi($('p-batt-w'), Math.abs(batt) > 40 ? ' · ' + fmtW(batt) : '');
        scrivi($('p-batt-l'), batt < -40 ? T.siCarica : batt > 40 ? T.siScarica : T.batteria); classe($('pill-batt'), 'active', Math.abs(batt) > 40);
        scrivi($('p-rete'), fmtW(rete)); scrivi($('p-rete-l'), rete > 40 ? T.prelievo : rete < -40 ? T.immissione : T.rete); classe($('pill-rete'), 'active', Math.abs(rete) > 40);
        // striscione in cima (frase d'azione)
        var str = $('striscione'), prel = S.rete ? Math.max(0, rete) : 0, stato = !sgOk ? 'ok' : prel > SOG ? 'sopra' : prel > SOG * IMP.avviso / 100 ? 'quasi' : 'ok';
        classe(str, 'en-visibile', stato !== 'ok'); classe(str, 'en-quasi', stato === 'quasi');
        if (stato !== 'ok') { scrivi($('str-t1'), t(stato === 'sopra' ? 'strT1Sopra' : 'strT1Vicino', { kw: fmtKwSoglia(SOG) })); scrivi($('str-t2'), t(stato === 'sopra' ? 'strT2Sopra' : 'strT2Vicino', { w: fmtW(prel) })); }
        scrivi($('nota-stato'), notaStato()); classe($('pip'), 'en-attesa', !S.pronto || S.offline);
    }
    function ieriTxt(id, v) { var el = $(id); if (v === null || v === undefined) { if (el.__v !== '') { el.__v = ''; el.textContent = ''; } return; } var k = 'i' + v; if (el.__v === k) return; el.__v = k; el.innerHTML = t('ieri', { v: '<b>' + esc(fmtKWhN(v)) + '</b>' }); }
    /* picco di oggi: il massimo fra il picco istantaneo del modulo (API.oggi, sopravvive alle ricariche), il massimo
       delle medie al minuto dello storico (DATI.oggi, con l'ora) e le letture viste da questa pagina (con l'ora).
       Se vince il modulo, che l'ora non la registra, si mostra l'ora del minuto piu' alto dello storico. */
    var piccoVisto = { pv: { w: 0, ora: null }, prelievo: { w: 0, ora: null }, giorno: null };
    function notaPicchi() {
        var g = DATI && DATI.orologio ? DATI.orologio.data : null;
        if (g && piccoVisto.giorno !== g) {   // giorno nuovo: si riparte (al primo dato si prende solo la data)
            if (piccoVisto.giorno !== null) { piccoVisto.pv = { w: 0, ora: null }; piccoVisto.prelievo = { w: 0, ora: null }; }
            piccoVisto.giorno = g;
        }
        var h = fmtOra(oraCasa());
        if (vivo.pv > piccoVisto.pv.w) piccoVisto.pv = { w: vivo.pv, ora: h };
        if (S.rete && vivo.rete > piccoVisto.prelievo.w) piccoVisto.prelievo = { w: vivo.rete, ora: h };
    }
    function piccoOggi(tipo) {
        var od = (DATI && DATI.oggi) || {}, ao = (API && API.oggi) || {}, k = 'picco_' + tipo + '_w';
        var dW = num(od[k]) || 0, dOra = od['picco_' + tipo + '_ora'] || null, aW = num(ao[k]) || 0, v = piccoVisto[tipo];
        var r = { w: dW, ora: dOra };
        if (aW > r.w + 0.5) r = { w: aW, ora: dOra };
        if (v.w > r.w + 0.5) r = { w: v.w, ora: v.ora };
        return r;
    }
    function pvRiferimento() { return Math.max(IMP.pvMax || 0, piccoOggi('pv').w) || null; }
    function oggiVal(k) { var o = API && API.oggi; return o && num(o[k]) !== null ? o[k] : null; }
    function consumataStimata() {   // senza misuratore e senza consumo del vendor: integrale della giornata stimata
        if (!DATI || !DATI.giornata) return null;
        var e = 0; DATI.giornata.forEach(function (g) { var a = adattaSegni(g.pv_w, g.casa_w, g.rete_w, g.batteria_w, g.batteria_soc); e += (a.casa || 0) * 0.25 / 1000; });
        return e;
    }
    function aggiornaCard() {
        var h = oraCasa(), soc = vis.soc, rete = vis.rete, batt = vis.batt, pv = vis.pv;
        var ie = (DATI && DATI.ieri_stessa_ora) || {};
        var prod = oggiVal('prodotta_kwh'), cons = oggiVal('consumata_kwh'), imm = oggiVal('immessa_kwh'), prel = oggiVal('prelevata_kwh');
        if (cons === null && !S.rete) cons = consumataStimata();
        // OGGI
        var auto = num(API && API.oggi && API.oggi.autoconsumo_pct), suff = num(API && API.oggi && API.oggi.autosufficienza_pct);
        if (!S.rete || auto === null || suff === null) {
            var p0 = prod || 0, c0 = cons || 0;
            if (!S.rete) { auto = p0 > 0.01 ? clamp(Math.min(p0, c0) / p0 * 100, 0, 100) : 0; suff = c0 > 0.01 ? clamp(Math.min(p0, c0) / c0 * 100, 0, 100) : 0; }
            else { auto = auto === null ? (p0 > 0.01 ? clamp((p0 - (imm || 0)) / p0 * 100, 0, 100) : 0) : auto; suff = suff === null ? (c0 > 0.01 ? clamp((c0 - (prel || 0)) / c0 * 100, 0, 100) : 0) : suff; }
        }
        scriviKWh($('o-prod'), prod); scriviKWh($('o-cons'), cons); scriviKWh($('o-imm'), imm); scriviKWh($('o-prel'), prel);
        ieriTxt('o-prod-i', ie.prodotta_kwh); ieriTxt('o-cons-i', ie.consumata_kwh); ieriTxt('o-imm-i', ie.immessa_kwh); ieriTxt('o-prel-i', ie.prelevata_kwh);
        attr($('an-auto'), 'stroke-dasharray', (auto / 100 * 314.2).toFixed(1) + ' 314.2'); scrivi($('an-auto-v'), String(Math.round(auto)));
        attr($('an-suff'), 'stroke-dasharray', (suff / 100 * 263.9).toFixed(1) + ' 263.9'); scrivi($('an-suff-v'), String(Math.round(suff)));
        classe($('c-oggi'), 'en-vuota', (prod || 0) < 0.05);
        scrivi($('oggi-meta'), t('oggiDalle', { ora: fmtOra(h) }));
        // COSTO (saldo = incasso - spesa; il risparmio resta a parte)
        var PZ = prezzi(), f = fasciaOra(), tipo = tipoTariffa(), prezzoOra = API && API.tariffa ? num(API.tariffa.prezzo_kwh) : null;
        var autoKWh = S.rete ? Math.max(0, (prod || 0) - (imm || 0)) : Math.min(prod || 0, cons || 0);
        var risp = num(API && API.oggi && API.oggi.risparmio_eur);
        if (risp === null && prezzoOra !== null) risp = autoKWh * prezzoOra;
        scrivi($('costo-risp'), risp === null ? '—' : fmtEuro(risp)); scrivi($('costo-risp-s'), t('risparmiati', { kwh: fmtKWhTxt(autoKWh) }));
        if (S.rete) {
            var spesa = num(API && API.oggi && API.oggi.costo_eur), incasso = num(API && API.oggi && API.oggi.guadagno_eur);
            scrivi($('costo-fascia'), tipo === 'fasce' ? (f || '—') : T.mono);
            scrivi($('costo-prezzo'), prezzoOra === null ? '' : (EN ? '€' + dec(prezzoOra, 2) + '/kWh' : dec(prezzoOra, 2) + ' €/kWh'));
            scrivi($('costo-prel'), spesa === null ? '—' : fmtEuro(spesa)); scrivi($('costo-prel-s'), t('spesi', { kwh: fmtKWhTxt(prel || 0) }));
            scrivi($('costo-imm'), incasso === null ? '—' : fmtEuro(incasso)); scrivi($('costo-imm-s'), t('incassati', { kwh: fmtKWhTxt(imm || 0) }));
            var saldoEl = $('costo-saldo');
            if (spesa === null && incasso === null) scriviNum(saldoEl, '—', '');
            else { var saldo = (incasso || 0) - (spesa || 0), s = (saldo < -0.005 ? '−' : '+') + dec(Math.abs(saldo), 2); if (EN) scriviNum(saldoEl, s.charAt(0) + '€' + s.slice(1), ''); else scriviNum(saldoEl, s, '€'); classe(saldoEl, 'en-neg', saldo < -0.005); }
            var righe = $('tariffe').children;
            for (var i = 0; i < righe.length; i++) {
                var r = righe[i], ff = r.getAttribute('data-f'), kwh = ff === 'MONO' ? (prel || 0) : (oggiVal('prelevata_' + ff.toLowerCase() + '_kwh') || 0), pz = num(PZ[ff]);
                classe(r, 'en-ora', ff === (tipo === 'fasce' ? f : 'MONO'));
                scrivi(r.lastElementChild, fmtKWhTxt(kwh) + (pz === null ? '' : ' · ' + fmtEuro(kwh * pz)));
            }
        }
        // BATTERIA
        if (S.batteria) {
            var cb = $('c-batt'), carica = batt < -40, scarica = batt > 40, CAP = IMP.cap, RIS = IMP.riserva;
            scrivi($('b-soc'), String(Math.round(soc))); stile($('batt-pila-liv'), 'height', soc.toFixed(0) + '%');
            classe(cb, 'en-carica', carica); classe(cb, 'en-bassa', soc <= 15);
            scrivi($('b-stato-t'), carica ? T.siCarica + ' · ' + fmtW(batt) : scarica ? T.siScarica + ' · ' + fmtW(batt) : (soc >= 99 ? T.piena : soc <= RIS + 0.5 ? T.riserva : T.ferma));
            stile($('b-stato-i'), 'transform', carica ? 'rotate(180deg)' : 'none');
            var s1 = '', s2 = '';
            if (CAP) {
                var utile = Math.max(0, soc - RIS) / 100 * CAP / 1000;
                if (carica) { var oreP = (100 - soc) / 100 * CAP / -batt; s1 = t('pienaFra', { d: fmtDurata(oreP), ora: fmtOra(h + oreP) }); s2 = t('daCaricare', { kwh: fmtKWhTxt((100 - soc) / 100 * CAP / 1000) }) + ' · ' + t('riservaPct', { p: RIS }); }
                else if (scarica) { var oreV = (soc - RIS) / 100 * CAP / batt; s1 = oreV > 0 ? t('autonomia', { d: fmtDurata(oreV), ora: fmtOra(h + oreV) }) : T.riserva; s2 = t('disponibili', { kwh: fmtKWhTxt(utile) }) + ' · ' + t('riservaPct', { p: RIS }); }
                else { s1 = soc <= RIS + 0.5 ? T.inAttesaSole : t('disponibili', { kwh: fmtKWhTxt(utile) }); s2 = t('riservaPct', { p: RIS }) + ' · ' + fmtKWhTxt(CAP / 1000).replace(DEC + '0 kWh', ' kWh'); }
            } else {
                s1 = soc <= RIS + 0.5 && !carica ? T.inAttesaSole : ''; s2 = t('riservaPct', { p: RIS });
            }
            scrivi($('b-sub'), s1); scrivi($('b-sub2'), s2);
            scrivi($('batt-meta'), CAP ? fmtKWhTxt(CAP / 1000).replace(DEC + '0 kWh', ' kWh') : '');
        }
        // SOGLIA (tachimetro 0 - 1,5 x potenza contrattuale)
        if (S.rete && S.soglia) {
            var cs = $('c-soglia'), pr = Math.max(0, rete), SOG = IMP.soglia, LIM = IMP.limite, ST = IMP.stacco, MAXT = SOG * 1.5;
            stile($('ago'), 'transform', 'rotate(' + (clamp(pr / MAXT, 0, 1) * 180).toFixed(1) + 'deg)');
            scriviW($('sg-val'), pr);
            var st = 'en-ok', ico = 'en-i-ok', txt, kw = fmtKwSoglia(SOG), lim = fmtKwSoglia(LIM), stc = fmtKwSoglia(ST);
            if (pr > ST) { st = 'en-superata'; ico = 'en-i-alert'; txt = t('sg4', { st: stc }); }
            else if (pr > LIM) { st = 'en-superata'; ico = 'en-i-alert'; txt = t('sg33', { lim: lim }); }
            else if (pr > SOG) { st = 'en-superata'; ico = 'en-i-alert'; txt = t('sg3', { kw: kw, lim: lim }); }
            else if (pr > SOG * IMP.avviso / 100) { st = 'en-attento'; ico = 'en-i-alert'; txt = t('sgVicino', { kw: kw, w: fmtW(SOG - pr) }); }
            else if (rete < -40) txt = t('sgImm', { w: fmtW(-rete) });
            else txt = t('sgSotto', { w: fmtW(SOG - pr) });
            ['en-ok', 'en-attento', 'en-superata'].forEach(function (c) { classe(cs, c, c === st); });
            attr($('sg-ico'), 'href', '#' + ico); scrivi($('sg-stato-t'), txt);
            var od = (DATI && DATI.oggi) || {}, pkP = piccoOggi('prelievo');
            scrivi($('sg-picco'), pkP.w > 40 ? fmtKw2(pkP.w) + (pkP.ora ? ' ' + t('alle', { ora: pkP.ora }) : '') : T.nessuno);
            scrivi($('sg-oltre-l'), t('oltre', { kw: kw }));
            scrivi($('sg-min'), (num(od.minuti_oltre_soglia) || 0) + ' ' + T.min);
            scrivi($('soglia-kw'), kw);
        }
        // INVERTER e testata
        var inv = (API && API.inverter) || [], temp = null, stati = {};
        inv.forEach(function (x) { if (num(x.temperatura_c) !== null && (temp === null || x.temperatura_c > temp)) temp = x.temperatura_c; stati[x.stato] = 1; });
        var notte = pv < 30, ref = pvRiferimento() || 0, bassa = !notte && ref && pv < ref * 0.08;
        var testoInv, meta, metaCl;
        if (!S.pronto) { testoInv = '—'; meta = '—'; metaCl = 'en-attesa'; }
        else if (S.offline) { testoInv = T.invOffline; meta = T.nonRaggiungibile; metaCl = 'en-guasto'; }
        else if (stati.guasto) { testoInv = T.invGuasto; meta = T.inGuasto; metaCl = 'en-guasto'; }
        else if (stati.produzione || (!notte && !stati.limitato)) { testoInv = bassa ? T.invBassaLuce : T.invFunzione; meta = T.inFunzione; metaCl = 'en-ok'; }
        else if (stati.limitato) { testoInv = T.invLimitato; meta = T.inFunzione; metaCl = 'en-ok'; }
        else if (stati.avvio && !notte) { testoInv = T.invAvvio; meta = T.inAttesa; metaCl = 'en-attesa'; }
        else if (stati.spento) { testoInv = T.invSpento; meta = T.inAttesa; metaCl = 'en-attesa'; }
        else { testoInv = notte ? T.invAttesaNotte : T.invAttesa; meta = T.inAttesa; metaCl = 'en-attesa'; }
        scrivi($('inv-stato'), testoInv);
        ['en-ok', 'en-attesa', 'en-guasto'].forEach(function (c) { classe($('inv-meta'), c, c === metaCl); });
        var mi = $('meta-inv'); if (mi.__v !== meta) { mi.__v = meta; mi.innerHTML = 'Inverter <b>' + esc(meta) + '</b>'; }
        classe($('meta-dot'), 'en-attesa', metaCl === 'en-attesa'); classe($('meta-dot'), 'en-guasto', metaCl === 'en-guasto');
        scrivi($('inv-temp'), temp === null ? '—' : Math.round(temp) + ' °C'); stile($('inv-temp-b'), '--p', (temp === null ? 0 : clamp(temp / 70 * 100, 5, 100)).toFixed(0) + '%');
        scrivi($('meta-temp'), temp === null ? '' : Math.round(temp) + ' °C'); $('meta-temp-sep').style.display = temp === null ? 'none' : '';
        var modello = IMP.modello || (inv[0] ? (inv[0].marca + ' ' + inv[0].modello).trim() : '');
        if (inv.length > 1 && !IMP.modello) modello = t('nInverter', { n: inv.length });
        scrivi($('inv-modello'), modello || '—');
        var pkV = piccoOggi('pv'), rif = pvRiferimento();   // picco massimo = max(giornate registrate, picco di oggi)
        scrivi($('inv-max'), rif ? fmtKw2(rif) : '—');
        scrivi($('inv-picco'), pkV.w > 40 ? fmtKw2(pkV.w) + (pkV.ora ? ' ' + t('alle', { ora: pkV.ora }) : '') : T.nessuno);
        var tot = API && API.totali ? num(API.totali.prodotta_kwh) : null;
        scrivi($('inv-tot'), tot === null ? '—' : Math.round(tot).toLocaleString(LOCALE) + ' kWh');
        // aggiornamento
        var agg = '—';
        if (API && API.ts) {
            var eta = API.aggiornato ? Math.max(0, API.ts - API.aggiornato) + (Date.now() - tVivo) / 1000 : null;
            agg = eta === null ? '—' : eta < 15 ? T.adesso : eta < 90 ? t('secFa', { n: Math.round(eta) }) : t('minFa', { n: Math.round(eta / 60) });
        }
        scrivi($('meta-agg'), t('agg', { t: agg }));
        var dd = document.getElementById('date-display'); if (dd) scrivi($('data'), dd.textContent);
        aggiornaGraficoAdesso(); aggiornaSettimanaOggi();
    }
    function disegnaTariffe() {
        var box = $('tariffe'), ff = tipoTariffa() === 'fasce' ? ['F1', 'F2', 'F3'] : ['MONO'], s = '';
        ff.forEach(function (f) { s += '<div class="en-tar" data-f="' + f + '"><span class="en-f">' + esc(f === 'MONO' ? T.mono : f) + '</span><span class="en-q">' + esc(T[f + 'q']) + '</span><span class="en-v">—</span></div>'; });
        box.innerHTML = s;
    }
    /* tachimetro: zone e tacche ricalcolate dalla potenza contrattuale (0 - 1,5 x soglia) */
    function puntoArco(k, MAXT, r) { var a = Math.PI * (1 - clamp(k / MAXT, 0, 1)); return [100 + r * Math.cos(a), 100 - r * Math.sin(a)]; }
    function arco(k1, k2, MAXT) { var a = puntoArco(k1, MAXT, 80), b = puntoArco(k2, MAXT, 80); return 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' A80 80 0 0 1 ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1); }
    function disegnaTachimetro() {
        if (!S.soglia) return;
        var SOG = IMP.soglia, MAXT = SOG * 1.5, z = [0, SOG, IMP.limite, IMP.stacco, MAXT];
        for (var i = 1; i <= 4; i++) $('zona-' + i).setAttribute('d', arco(Math.min(z[i - 1], MAXT), Math.min(z[i], MAXT), MAXT));
        var kmax = MAXT / 1000, passo = kmax <= 6 ? 0.5 : (kmax <= 12 ? 1 : 2), eti = kmax <= 6 ? 1 : (kmax <= 12 ? 2 : 4), s = '';
        for (var k = 0; k <= kmax + 1e-6; k += passo) {
            var a = Math.PI * (1 - k / kmax), c = Math.cos(a), si = Math.sin(a), lab = Math.abs(k / eti - Math.round(k / eti)) < 1e-6, ri = lab ? 66 : 71;
            s += '<line class="en-tacca" x1="' + (100 + 80 * c).toFixed(1) + '" y1="' + (100 - 80 * si).toFixed(1) + '" x2="' + (100 + ri * c).toFixed(1) + '" y2="' + (100 - ri * si).toFixed(1) + '"/>';
            if (lab) s += '<text x="' + (100 + 56 * c).toFixed(1) + '" y="' + (103 - 56 * si).toFixed(1) + '">' + Math.round(k) + '</text>';
        }
        $('tacche').innerHTML = s;
    }

    /* --- grafico della giornata (campioni ogni 15 min + previsione) --- */
    var G = { w: 400, h: 150, top: 8, bottom: 20, max: 1 }, serieG = [];
    function gx(h) { return h / 24 * G.w; }
    // viewBox = misura reale del riquadro in pixel (vedi "proporzioni del grafico" piu' sotto): true se e' cambiata
    function proporzioniGrafico() {
        var box = $('grafico'), svg = $('graf'), r = box ? box.getBoundingClientRect() : null;
        if (!svg || !r || !(r.width > 0 && r.height > 0)) return false;   // sezione chiusa o nascosta: alla prossima apertura
        var w = Math.round(r.width * 10) / 10, h = Math.round(Math.max(r.height, 40) * 10) / 10;
        if (Math.abs(w - G.w) < 0.5 && Math.abs(h - G.h) < 0.5) return false;
        G.w = w; G.h = h; svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); G.sporco = true;
        return true;
    }
    function gy(w) { return G.top + (G.h - G.top - G.bottom) * (1 - w / G.max); }
    function disegnaGrafico() {
        if (!window.ResizeObserver) proporzioniGrafico();
        var ora = oraCasa(); serieG = [];
        ((DATI && DATI.giornata) || []).forEach(function (g) {
            var a = adattaSegni(g.pv_w, g.casa_w, g.rete_w, g.batteria_w, g.batteria_soc);
            serieG.push({ h: Math.min(g.h + 0.125, ora), ora: g.ora, pv: a.pv || 0, casa: a.casa || 0, batt: a.batt, rete: a.rete, soc: a.soc });
        });
        ((DATI && DATI.previsione) || []).forEach(function (p) { if (p.h + 0.125 > ora) serieG.push({ h: p.h + 0.125, ora: p.ora, pv: num(p.pv_w) || 0, casa: num(p.casa_w) || 0, fut: true }); });
        serieG.sort(function (a, b) { return a.h - b.h; });
        var fPv = vivo.pv, fCasa = vivo.casa;   // fine del tracciato su "adesso" = ultima lettura (vis e' l'inseguimento animato)
        G.max = 400; serieG.forEach(function (p) { G.max = Math.max(G.max, p.pv, p.casa); }); G.max = Math.max(G.max, fPv, fCasa) * 1.12;
        var pvP = '', caP = '', pvF = '', caF = '';
        serieG.forEach(function (p) {
            var x = gx(p.h).toFixed(1), y1 = gy(p.pv).toFixed(1), y2 = gy(p.casa).toFixed(1);
            if (!p.fut) { pvP += (pvP ? ' L' : 'M') + x + ' ' + y1; caP += (caP ? ' L' : 'M') + x + ' ' + y2; }
        });
        var xo = gx(ora).toFixed(1), yP = gy(fPv).toFixed(1), yC = gy(fCasa).toFixed(1), y0 = gy(0).toFixed(1);
        pvF = 'M' + xo + ' ' + yP; caF = 'M' + xo + ' ' + yC;
        serieG.forEach(function (p) { if (p.fut) { pvF += ' L' + gx(p.h).toFixed(1) + ' ' + gy(p.pv).toFixed(1); caF += ' L' + gx(p.h).toFixed(1) + ' ' + gy(p.casa).toFixed(1); } });
        var inizio = serieG.length && !serieG[0].fut ? '' : null;
        // giornata senza campioni (primo avvio, dopo mezzanotte prima del primo quarto d'ora): il tracciato parte da "adesso",
        // nessuna area finta da mezzanotte al valore attuale (prima: 'M0 ' = blocco piatto dalle 00:00) (02/10/2026)
        if (inizio === null) { pvP = 'M' + xo + ' ' + yP; caP = 'M' + xo + ' ' + yC; }
        attr($('g-area-pv'), 'd', pvP + ' L' + xo + ' ' + yP + ' L' + xo + ' ' + y0 + ' L' + (serieG.length && !serieG[0].fut ? gx(serieG[0].h).toFixed(1) : xo) + ' ' + y0 + ' Z');
        attr($('g-area-casa'), 'd', caP + ' L' + xo + ' ' + yC + ' L' + xo + ' ' + y0 + ' L' + (serieG.length && !serieG[0].fut ? gx(serieG[0].h).toFixed(1) : xo) + ' ' + y0 + ' Z');
        attr($('g-linea-pv'), 'd', pvP + ' L' + xo + ' ' + yP); attr($('g-linea-casa'), 'd', caP + ' L' + xo + ' ' + yC);
        attr($('g-fut-pv'), 'd', pvF.indexOf(' L') > 0 ? pvF : ''); attr($('g-fut-casa'), 'd', caF.indexOf(' L') > 0 ? caF : '');
        var assi = '', eti = '';
        [0, 6, 12, 18, 24].forEach(function (hh) { assi += '<line class="en-asse" x1="' + gx(hh) + '" y1="' + G.top + '" x2="' + gx(hh) + '" y2="' + y0 + '"/>'; eti += '<text x="' + (hh === 24 ? gx(hh) - 2 : hh === 0 ? 2 : gx(hh)) + '" y="' + (G.h - 6) + '" text-anchor="' + (hh === 24 ? 'end' : hh === 0 ? 'start' : 'middle') + '">' + pad(hh) + '</text>'; });
        assi += '<line class="en-asse" x1="0" y1="' + y0 + '" x2="' + G.w + '" y2="' + y0 + '"/>';
        var passoK = G.max > 9000 ? 2000 : 1000;
        for (var w = passoK; w < G.max; w += passoK) { assi += '<line class="en-asse" x1="0" y1="' + gy(w).toFixed(1) + '" x2="' + G.w + '" y2="' + gy(w).toFixed(1) + '" stroke-dasharray="2 4"/>'; eti += '<text x="2" y="' + (gy(w) - 3).toFixed(1) + '">' + (w / 1000) + ' kW</text>'; }
        var firma = assi + eti; if ($('graf-assi').__v !== firma) { $('graf-assi').__v = firma; $('graf-assi').innerHTML = assi; $('graf-etichette').innerHTML = eti; }
        var pk = piccoOggi('pv').w;
        scrivi($('g-picco'), pk > 40 ? fmtW(pk) : '—');
        scrivi($('graf-meta'), t('ogni15', { w: fmtW(G.max / 1.12) }));
        G.disegnatoA = ora; G.sporco = false;
        aggiornaGraficoAdesso();
    }
    function aggiornaGraficoAdesso() {
        var h = oraCasa(), x = gx(h).toFixed(1);
        if (G.sporco || (G.disegnatoA !== undefined && Math.abs(h - G.disegnatoA) > 0.05)) { disegnaGrafico(); return; }   // nuova lettura o la linea "adesso" avanza (ogni 3 min)   // la linea "adesso" avanza: ogni 3 min si ridisegna
        attr($('g-adesso'), 'x1', x); attr($('g-adesso'), 'x2', x); attr($('g-adesso'), 'y1', G.top); attr($('g-adesso'), 'y2', gy(0).toFixed(1));
        attr($('g-punto-pv'), 'cx', x); attr($('g-punto-pv'), 'cy', gy(vis.pv).toFixed(1)); attr($('g-punto-casa'), 'cx', x); attr($('g-punto-casa'), 'cy', gy(vis.casa).toFixed(1));
        stile($('g-punto-pv'), 'opacity', vis.pv > 30 ? 1 : 0);
    }
    /* tooltip al tocco / al passaggio sul grafico */
    (function () {
        var box = $('grafico'), tip = $('g-tip'), cur = $('g-cursore'), timer = 0;
        function mostra(ev) {
            if (!serieG.length) return;
            var r = box.getBoundingClientRect(), x = clamp(ev.clientX - r.left, 0, r.width), h = x / r.width * 24, best = serieG[0];
            for (var i = 1; i < serieG.length; i++) if (Math.abs(serieG[i].h - h) < Math.abs(best.h - h)) best = serieG[i];
            var xx = gx(best.h); cur.setAttribute('x1', xx); cur.setAttribute('x2', xx); cur.setAttribute('y1', G.top); cur.setAttribute('y2', gy(0)); cur.style.opacity = 0.6;
            var s = '<div class="en-ora">' + esc(best.ora || fmtOra(best.h)) + (best.fut ? ' · ' + esc(T.previsione) : '') + '</div>';
            s += '<div class="en-r" style="--c: var(--c-sole)"><span><i></i>' + esc(T.produzione) + '</span><b>' + fmtW(best.pv) + '</b></div>';
            s += '<div class="en-r" style="--c: var(--c-casa)"><span><i></i>' + esc(T.consumo) + '</span><b>' + fmtW(best.casa) + '</b></div>';
            if (!best.fut && S.batteria && best.batt !== null && best.batt !== undefined) s += '<div class="en-r" style="--c: var(--c-batt)"><span><i></i>' + esc(T.batteria) + '</span><b>' + (best.batt < -40 ? esc(T.carica) + ' ' : best.batt > 40 ? esc(T.scarica) + ' ' : '') + fmtW(best.batt) + (best.soc !== null ? ' · ' + Math.round(best.soc) + '%' : '') + '</b></div>';
            if (!best.fut && S.rete && best.rete !== null && best.rete !== undefined) s += '<div class="en-r" style="--c: ' + (best.rete > 40 ? 'var(--c-prel)' : 'var(--c-imm)') + '"><span><i></i>' + esc(T.rete) + '</span><b>' + (best.rete > 40 ? esc(T.prelievo) + ' ' : best.rete < -40 ? esc(T.immissione) + ' ' : '') + fmtW(best.rete) + '</b></div>';
            tip.innerHTML = s; tip.classList.add('en-on');
            var px = xx / G.w * r.width, tw = tip.offsetWidth; tip.style.left = clamp(px, tw / 2 + 2, r.width - tw / 2 - 2) + 'px';
        }
        function nascondi() { tip.classList.remove('en-on'); cur.style.opacity = 0; }
        box.addEventListener('pointermove', mostra); box.addEventListener('pointerdown', mostra);
        // col dito: dopo pointerup il browser manda anche pointerleave (il dito "esce"), che chiudeva subito il riquadro e
        // rendeva inutile l'attesa di 1,8 s: col tocco lo chiude solo il tempo, o pointercancel (il dito scorre la pagina) (giro 2)
        box.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') nascondi(); });
        box.addEventListener('pointercancel', function () { clearTimeout(timer); nascondi(); });
        box.addEventListener('pointerdown', function () { clearTimeout(timer); });
        box.addEventListener('pointerup', function () { clearTimeout(timer); timer = setTimeout(nascondi, 1800); });
    })();
    /* proporzioni del grafico (02/10/2026, giro 2 della fusione): il viewBox e' la misura REALE del riquadro in pixel
       (G.w x G.h, seguita da ResizeObserver), cosi' con preserveAspectRatio='none' la scala e' 1 in orizzontale e in
       verticale: le misure del CSS (etichette 9px, tratti 1,6, punti r 2,6) sono pixel veri su ogni schermo. Prima era
       fisso 400x150 e il disegno si stirava col riquadro: schermo largo 1440 (riquadro 390x214) etichette e punti alti il
       45% in piu'; telefono (308x150) e iPad (348x150) etichette strette (6,9 e 7,8 px di larghezza su 9 di altezza). */
    (function () {
        var box = $('grafico');
        if (!box) return;
        var misura = function () { if (proporzioniGrafico() && S.pronto) disegnaGrafico(); };   // prima dei dati lo disegna il primo aggiornamento
        if (window.ResizeObserver) new ResizeObserver(misura).observe(box);
        else window.addEventListener('resize', misura);           // (senza ResizeObserver misura anche disegnaGrafico)
        misura();
    })();
    /* --- settimana --- */
    function nomeGiorno(data) {
        var p = String(data).split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]), s = d.toLocaleDateString(LOCALE, { weekday: 'short' }).replace('.', '');
        return s.charAt(0).toUpperCase() + s.slice(1, 3);
    }
    var settMax = 1;
    function disegnaSettimana() {
        var sett = (DATI && DATI.settimana) || [], s = '';
        settMax = 1; sett.forEach(function (d) { settMax = Math.max(settMax, num(d.prodotta_kwh) || 0, num(d.consumata_kwh) || 0); });
        settMax = Math.max(settMax, oggiVal('prodotta_kwh') || 0, oggiVal('consumata_kwh') || 0) * 1.1;
        sett.forEach(function (d) {
            var oggi = !!d.oggi;
            s += '<div class="en-giorno' + (oggi ? ' en-oggi' : '') + '"><div class="en-barre"><div class="en-barra en-pv" style="--h:' + (oggi ? 0 : (num(d.prodotta_kwh) || 0) / settMax * 100).toFixed(1) + '%"></div><div class="en-barra en-cons" style="--h:' + (oggi ? 0 : (num(d.consumata_kwh) || 0) / settMax * 100).toFixed(1) + '%"></div></div><div class="en-g-lbl">' + esc(nomeGiorno(d.data)) + '</div></div>';
        });
        $('sett').innerHTML = s; aggiornaSettimanaOggi();
    }
    function aggiornaSettimanaOggi() {
        var sett = (DATI && DATI.settimana) || [], i = -1;
        for (var k = 0; k < sett.length; k++) if (sett[k].oggi) i = k;
        var g = i >= 0 ? $('sett').children[i] : null; if (!g) return;
        var b = g.querySelectorAll('.en-barra'), p = oggiVal('prodotta_kwh'), c = oggiVal('consumata_kwh');
        if (c === null && !S.rete) c = consumataStimata();
        if (p === null) p = num(sett[i].prodotta_kwh) || 0; if (c === null) c = num(sett[i].consumata_kwh) || 0;
        stile(b[0], '--h', clamp(p / settMax * 100, 1, 100).toFixed(1) + '%'); stile(b[1], '--h', clamp(c / settMax * 100, 1, 100).toFixed(1) + '%');
        var tp = 0, tc = 0; sett.forEach(function (d, j) { if (j !== i) { tp += num(d.prodotta_kwh) || 0; tc += num(d.consumata_kwh) || 0; } }); tp += p; tc += c;
        scrivi($('sett-tot'), tp.toFixed(0) + ' / ' + tc.toFixed(0) + ' kWh');
    }

    /* ======================================================================
       DATI DAL SERVER
       ====================================================================== */
    var POLL_VIVO = 3000, POLL_DATI = 60000, timerVivo = 0, inCorso = false, sbagli = 0;
    function aperta() { return root.classList.contains('active'); }
    function prendi(url) {
        return fetch(url, { credentials: 'same-origin', cache: 'no-store', headers: { 'Accept': 'application/json' } })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    }
    function applicaVivo(j) {
        API = j; tVivo = Date.now();
        var f = j.flussi || {}, a = adattaSegni(f.pv_w, f.casa_w, f.rete_w, f.batteria_w, f.batteria_soc);
        S.offline = j.stato === 'offline' || (a.pv === null && j.installato);
        S.batteria = !!j.ha_batteria; S.rete = !!j.ha_meter;
        S.soglia = !!(j.soglia && num(j.soglia.potenza_w));
        if (S.soglia) { IMP.soglia = j.soglia.potenza_w; IMP.limite = num(j.soglia.limite_w) || IMP.soglia * 1.1; }
        vivo.pv = a.pv || 0; vivo.casa = a.casa || 0; vivo.batt = S.batteria ? (a.batt || 0) : 0; vivo.rete = S.rete ? (a.rete || 0) : 0;
        if (a.soc !== null) vivo.soc = a.soc;
        if (!S.pronto) { S.pronto = true; primoDisegno = true; }
        notaPicchi(); G.sporco = true;   // il grafico riprende la lettura nuova al prossimo aggiornamento delle card
        aggiornaStruttura();
    }
    function applicaDati(j) {
        DATI = j; tDati = Date.now();
        var o = j.orologio || {};
        if (num(o.h) !== null) { orologio.h0 = o.h; orologio.t0 = Date.now(); orologio.v = num(o.velocita) || 1; }
        var im = j.impianto || {};
        IMP.cap = num(im.batteria_wh); IMP.riserva = num(im.riserva_pct) !== null ? im.riserva_pct : 10;
        IMP.pvMax = num(im.pv_max_w); IMP.modello = im.modello || null; IMP.avviso = num(im.avviso_pct) || 90;
        if (num(im.soglia_w)) { IMP.soglia = im.soglia_w; IMP.limite = num(im.limite_w) || IMP.soglia * 1.1; IMP.stacco = num(im.stacco_w) || IMP.soglia * 4 / 3; }
        stile($('batt-riserva'), '--r', IMP.riserva + '%');
        var sole = j.sole || {}, a = hDa(sole.alba), tr2 = hDa(sole.tramonto);
        albaNota = a !== null; tramontoNota = tr2 !== null; ALBA = a !== null ? a : 7; TRAMONTO = tr2 !== null ? tr2 : 19;
        strutturaFirma = '';
        aggiornaStruttura();
    }
    function caricaVivo() {
        timerVivo = 0;
        if (!aperta() || document.hidden || inCorso) { pianifica(); return; }
        inCorso = true;
        var serveDati = !DATI || Date.now() - tDati > POLL_DATI / Math.max(1, orologio.v > 1 ? Math.min(12, orologio.v / 5) : 1);
        var p = [prendi('/api/inverter/adesso').then(applicaVivo)];
        if (serveDati) p.push(prendi('/api/energia/dati').then(applicaDati));
        Promise.all(p).then(function () { sbagli = 0; if (!lay) impaginaScena(); decidi(); if (!attivoCiclo) ridisegnaSubito(); tickLentoDecidi(); })
            .catch(function () { sbagli++; })
            .then(function () { inCorso = false; pianifica(); });
    }
    function pianifica() {
        if (timerVivo) { clearTimeout(timerVivo); timerVivo = 0; }
        if (!aperta() || document.hidden) return;
        timerVivo = setTimeout(caricaVivo, sbagli ? Math.min(30000, POLL_VIVO * (1 + sbagli)) : POLL_VIVO);
    }

    /* ======================================================================
       IL CICLO: un solo requestAnimationFrame
       ====================================================================== */
    var attivoCiclo = false, visibile = !document.hidden, inVista = false, ultimoT = 0, raf = 0, tickCard = 0;
    var perf = { fotogrammi: 0, ms: 0, max: 0 };
    function fermo() { return leggera() || ridotto; }
    function puoGirare() { return S.pronto && aperta() && visibile && inVista && !dietro() && !fermo(); }
    function frame(ts) {
        raf = 0;
        if (!attivoCiclo) return;
        if (!puoGirare()) { decidi(); return; }       // leggera / pannello / sezione chiusa arrivati a ciclo avviato
        var t0 = performance.now();
        var dt = clamp((ts - ultimoT) / 1000 || 0.016, 0, 0.1); ultimoT = ts;
        var k = primoDisegno ? 1 : 1 - Math.pow(0.001, dt);   // i numeri inseguono la lettura (~1 s)
        vis.pv = lerp(vis.pv, vivo.pv, k); vis.casa = lerp(vis.casa, vivo.casa, k); vis.batt = lerp(vis.batt, vivo.batt, k); vis.rete = lerp(vis.rete, vivo.rete, k); vis.soc = lerp(vis.soc, vivo.soc, k);
        aggiornaFlussi(vis, dt); disegnaParticelle();
        tickCard += dt;
        if (primoDisegno || tickCard > 0.25) { aggiornaScena(); aggiornaCard(); tickCard = 0; }
        primoDisegno = false;
        var d = performance.now() - t0; perf.fotogrammi++; perf.ms += d; if (d > perf.max) perf.max = d;
        raf = requestAnimationFrame(frame);
    }
    function avvia() { if (attivoCiclo) return; attivoCiclo = true; ultimoT = performance.now(); if (!raf) raf = requestAnimationFrame(frame); tickLentoDecidi(); }
    function ferma() { attivoCiclo = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } tickLentoDecidi(); }
    function decidi() {
        if (puoGirare()) { avvia(); return; }
        ferma();
        if (!aperta() || !S.pronto) return;
        if (fermo()) disegnaFermo(); else if (!inVista || dietro()) pulisciTela();
    }
    /* tick lento (1 s): ciclo fermo ma sezione aperta e scheda visibile (leggera, scena fuori schermo, pannello) */
    var tickLento = 0;
    function tickLentoDecidi() { var serve = visibile && aperta() && !attivoCiclo && S.pronto; if (serve && !tickLento) tickLento = setInterval(tickLentoFn, 1000); if (!serve && tickLento) { clearInterval(tickLento); tickLento = 0; } }
    function tickLentoFn() { if (attivoCiclo || !visibile || !aperta()) { tickLentoDecidi(); return; } if (fermo()) disegnaFermo(); else ridisegnaSubito(); }
    function ridisegnaSubito() { vis.pv = vivo.pv; vis.casa = vivo.casa; vis.batt = vivo.batt; vis.rete = vivo.rete; vis.soc = vivo.soc; if (lay) { aggiornaScena(); aggiornaCard(); } }
    function disegnaFermo() { ridisegnaSubito(); pulisciTela(); }

    function apri() {
        html.classList.add('wh-energia');
        if (!lay || !scena.clientWidth) impaginaScena(); else impaginaScena();
        caricaVivo();
        decidi(); tickLentoDecidi();
    }
    function chiudi() {
        html.classList.remove('wh-energia');
        if (timerVivo) { clearTimeout(timerVivo); timerVivo = 0; }
        ferma(); pulisciTela();
    }
    if ('MutationObserver' in window) {
        new MutationObserver(function () { if (aperta()) apri(); else chiudi(); }).observe(root, { attributes: true, attributeFilter: ['class'] });
        new MutationObserver(function () { if (!aperta()) return; decidi(); }).observe(html, { attributes: true, attributeFilter: ['class'] });
    }
    document.addEventListener('visibilitychange', function () { visibile = !document.hidden; if (aperta()) { if (visibile) caricaVivo(); else if (timerVivo) { clearTimeout(timerVivo); timerVivo = 0; } } decidi(); tickLentoDecidi(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { inVista = e[e.length - 1].isIntersecting; decidi(); }, { threshold: 0 }).observe($('sentinella'));
    else inVista = true;
    var ridim = 0;
    window.addEventListener('resize', function () { if (!aperta()) return; clearTimeout(ridim); ridim = setTimeout(function () { impaginaScena(); if (!attivoCiclo) ridisegnaSubito(); }, 120); });

    // indirizzo /mobile#energia (anche da /energia): si apre la sezione
    function daIndirizzo() {
        if (location.hash !== '#energia') return;
        var voce = document.querySelector('.wh-nav-energia');
        if (voce && typeof window.switchRoom === 'function' && !aperta()) window.switchRoom('room-energia', voce);
    }
    window.addEventListener('hashchange', daIndirizzo);

    window.__whEnergia = {
        perf: perf, adattaSegni: adattaSegni, piccoOggi: piccoOggi,
        stato: function () { return { aperta: aperta(), ciclo: attivoCiclo, inVista: inVista, fermo: fermo(), S: S, IMP: IMP, vivo: vivo, vis: vis, h: oraCasa(), particelle: { sole: flussi.sole.p.length, batt: flussi.batt.p.length, rete: flussi.rete.p.length }, dir: { sole: flussi.sole.dir, batt: flussi.batt.dir, rete: flussi.rete.dir }, raf: !!raf, tick: !!tickLento, timer: !!timerVivo }; },
        azzeraPerf: function () { perf.fotogrammi = 0; perf.ms = 0; perf.max = 0; }
    };
    if (aperta()) apri();
    if (document.readyState === 'complete') daIndirizzo(); else window.addEventListener('load', daIndirizzo);
})();
