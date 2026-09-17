/* Wach0ss Home - finestra di conferma / avviso interna alla pagina.
   Dentro la WebView dell'app iOS confirm() e alert() del browser NON vengono mostrati
   (confirm risponde sempre "annulla"): eliminare, salvare o eseguire non partiva mai.
   Le pagine usano queste due funzioni al posto loro:
     chiedi(testo, {titolo, si, no, pericolo, icona})  -> Promise<boolean>   (al posto di confirm)
     avvisa(testo, {titolo, ok, icona})                -> Promise<void>      (al posto di alert)
   Non tocca nient'altro della pagina: la finestra si costruisce da sola al primo uso,
   prende chiaro/scuro dallo sfondo della pagina e sul telefono sale dal basso.
   I testi passano nel DOM come nodi di testo, quindi i18n.js li traduce come tutto il resto. */
(function () {
    'use strict';
    if (window.chiedi && window.avvisa) return;

    var CSS = '' +
        '.wh-pop{position:fixed;top:0;left:0;right:0;bottom:0;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:rgba(20,20,30,0.45);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .18s;font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:15px;line-height:1.45;text-align:left;-webkit-font-smoothing:antialiased}' +
        '.wh-pop.wh-pop-on{opacity:1}' +
        '.wh-pop *{box-sizing:border-box}' +
        '.wh-pop-card{width:100%;max-width:400px;background:#FFFFFF;color:#1C1C1E;border-radius:20px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 24px 60px -16px rgba(20,20,30,0.35),0 6px 18px -6px rgba(20,20,30,0.12);padding:22px 22px 18px;display:flex;flex-direction:column;gap:8px;transform:translateY(8px) scale(.98);transition:transform .18s cubic-bezier(.2,.8,.2,1)}' +
        '.wh-pop-on .wh-pop-card{transform:none}' +
        '.wh-pop-scuro .wh-pop-card{background:#1C1C1E;color:#F5F5F7;border-color:rgba(255,255,255,0.10);box-shadow:0 24px 60px -12px rgba(0,0,0,0.8)}' +
        '.wh-pop-maniglia{display:none}' +
        '.wh-pop-ico{width:44px;height:44px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;background:#E8F1FF;color:#0066CC;margin:0 0 4px;flex-shrink:0}' +
        '.wh-pop-ico svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
        '.wh-pop-scuro .wh-pop-ico{background:rgba(10,132,255,0.18);color:#5AA9FF}' +
        '.wh-pop-pericolo .wh-pop-ico{background:#FDE8EA;color:#DC3545}' +
        '.wh-pop-scuro.wh-pop-pericolo .wh-pop-ico{background:rgba(255,69,58,0.18);color:#FF453A}' +
        '.wh-pop h2{margin:0;padding:0;font-size:17px;font-weight:700;letter-spacing:-.01em;line-height:1.3;color:inherit;text-transform:none}' +
        '.wh-pop p{margin:0;padding:0;font-size:15px;color:inherit;opacity:.72;line-height:1.45;white-space:pre-line;overflow-wrap:anywhere;max-height:50vh;overflow:auto}' +
        '.wh-pop-azioni{display:flex;gap:10px;justify-content:flex-end;margin-top:12px}' +
        '.wh-pop button{font-family:inherit;display:inline-flex;align-items:center;justify-content:center;height:40px;min-width:100px;width:auto;margin:0;padding:0 16px;border-radius:12px;border:none;outline:none;box-shadow:none;font-weight:600;font-size:14px;line-height:1;letter-spacing:normal;text-transform:none;cursor:pointer;white-space:nowrap;color:inherit;background:#ECECF1;transition:filter .15s,transform .08s;-webkit-appearance:none;appearance:none}' +
        '.wh-pop button:hover{filter:brightness(.96)} .wh-pop button:active{transform:scale(.98)}' +
        '.wh-pop-scuro button{background:#2C2C2E} .wh-pop-scuro button:hover{filter:brightness(1.15)}' +
        '.wh-pop button.wh-pop-si{background:#0066CC;color:#FFFFFF;box-shadow:0 6px 16px -6px rgba(0,86,179,0.45)} .wh-pop button.wh-pop-si:hover{filter:brightness(1.1)}' +
        '.wh-pop-pericolo button.wh-pop-si{background:#DC3545;box-shadow:0 6px 16px -6px rgba(220,53,69,0.45)}' +
        '.wh-pop button:focus-visible{outline:3px solid #0A84FF;outline-offset:2px}' +
        '@media (max-width:767px){' +
            '.wh-pop{align-items:flex-end;padding:0}' +
            '.wh-pop-card{max-width:none;border-radius:22px 22px 0 0;border:none;padding:14px 20px calc(16px + env(safe-area-inset-bottom,0px));transform:translateY(100%);transition:transform .25s cubic-bezier(.2,.8,.2,1)}' +
            '.wh-pop-on .wh-pop-card{transform:none}' +
            '.wh-pop-maniglia{display:block;width:36px;height:5px;border-radius:3px;background:rgba(127,127,127,0.35);margin:0 auto 10px}' +
            '.wh-pop-azioni{flex-direction:column-reverse;gap:8px;margin-top:16px}' +
            '.wh-pop button{width:100%;height:48px;font-size:15px;border-radius:14px}' +
        '}' +
        '@media (prefers-reduced-motion:reduce){.wh-pop,.wh-pop-card{transition:none}}';

    /* icone (tracciati Lucide): non si dipende dalla libreria della pagina */
    var ICONE = {
        'help-circle': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
        'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
        'trash-2': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
        'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
        'alert-circle': '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
        'play': '<polygon points="6 3 20 12 6 21 6 3"/>',
        'power': '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>',
        'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
        'refresh-cw': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
        'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
        'map-pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
        'shield-off': '<path d="m2 2 20 20"/><path d="M5 5a1 1 0 0 0-1 1v7c0 5 3.5 7.5 7.67 8.94a1 1 0 0 0 .67.01c2.35-.82 4.48-1.97 5.9-3.71"/><path d="M9.3 3.65A12.25 12.25 0 0 0 11.24 2.28a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1v7a9.78 9.78 0 0 1-.08 1.26"/>',
        'link-2-off': '<path d="M9 17H7A5 5 0 0 1 7 7"/><path d="M15 7h2a5 5 0 0 1 4 8"/><line x1="8" x2="12" y1="12" y2="12"/><line x1="2" x2="22" y1="2" y2="22"/>'
    };
    function svg(nome) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (Object.prototype.hasOwnProperty.call(ICONE, nome) ? ICONE[nome] : ICONE['help-circle']) + '</svg>'; }

    /* chiaro o scuro? Si legge lo sfondo della pagina, cosi' la finestra non stona mai. */
    function pagineScura() {
        var col = '';
        try {
            col = getComputedStyle(document.body).backgroundColor;
            if (!col || col === 'transparent' || /rgba\(\s*0,\s*0,\s*0,\s*0\)/.test(col)) col = getComputedStyle(document.documentElement).backgroundColor;
        } catch (e) {}
        var m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s\/]+([\d.]+))?/.exec(col || '');
        if (m && (m[4] === undefined || parseFloat(m[4]) > 0.2)) return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255 < 0.5;
        return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    var stile = null, aperta = null, coda = [];
    function costruisci() {
        if (!stile) { stile = document.createElement('style'); stile.textContent = CSS; document.head.appendChild(stile); }
        var d = document.createElement('div');
        d.className = 'wh-pop'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
        d.innerHTML = '<div class="wh-pop-card"><div class="wh-pop-maniglia"></div><div class="wh-pop-ico"></div><h2></h2><p></p><div class="wh-pop-azioni"><button type="button" class="wh-pop-no"></button><button type="button" class="wh-pop-si"></button></div></div>';
        return d;
    }

    /* Una finestra alla volta: una richiesta arrivata mentre un'altra e' aperta si mette in fila
       e compare quando quella si chiude (come facevano i dialoghi nativi, che si accodavano). */
    function apri(testo, o, soloOk) {
        return new Promise(function (risolvi) {
            coda.push({ testo: testo, o: o || {}, soloOk: soloOk, risolvi: risolvi });
            if (!aperta) prossima();
        });
    }
    function prossima() { var q = coda.shift(); if (q) mostra(q.testo, q.o, q.soloOk, q.risolvi); }

    /* costruisce e mostra la finestra; con soloOk c'e' un solo pulsante (avviso) */
    function mostra(testo, o, soloOk, risolvi) {
        var d = costruisci();
        var pericolo = !!o.pericolo && !soloOk;
        d.classList.toggle('wh-pop-scuro', pagineScura());
        d.classList.toggle('wh-pop-pericolo', pericolo);
        d.querySelector('.wh-pop-ico').innerHTML = svg(o.icona || (soloOk ? 'info' : pericolo ? 'trash-2' : 'help-circle'));
        var h = d.querySelector('h2'), p = d.querySelector('p'), si = d.querySelector('.wh-pop-si'), no = d.querySelector('.wh-pop-no');
        h.textContent = o.titolo || (soloOk ? 'Avviso' : 'Conferma');
        d.setAttribute('aria-label', h.textContent);
        p.textContent = String(testo == null ? '' : testo);
        si.textContent = soloOk ? (o.ok || 'OK') : (o.si || 'Conferma');
        if (soloOk) no.parentNode.removeChild(no); else no.textContent = o.no || 'Annulla';
        var prima = document.activeElement;
        var vivo = true;
        function chiudi(esito) {
            if (!vivo) return; vivo = false;
            document.removeEventListener('keydown', tasti, true);
            d.classList.remove('wh-pop-on');
            // la finestra resta "aperta" finche' non e' sparita: la prossima in fila parte solo dopo
            setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); aperta = null; prossima(); }, 300);
            if (prima && prima.focus && document.contains(prima)) { try { prima.focus(); } catch (e) {} }
            risolvi(soloOk ? undefined : !!esito);
        }
        function tasti(e) {
            e.stopPropagation();                         // la pagina sotto non deve reagire (Esc, Cmd+S...)
            if (e.key === 'Escape') { e.preventDefault(); chiudi(false); }
            else if (e.key === 'Enter') { e.preventDefault(); if (e.repeat) return; if (soloOk || document.activeElement === si) chiudi(true); else if (document.activeElement === no) chiudi(false); }
            else if (e.key === 'Tab') { e.preventDefault(); if (!soloOk) (document.activeElement === si ? no : si).focus(); }
        }
        aperta = chiudi;
        si.onclick = function () { chiudi(true); };
        if (!soloOk) no.onclick = function () { chiudi(false); };
        d.onclick = function (e) { if (e.target === d) chiudi(false); };
        document.addEventListener('keydown', tasti, true);
        document.body.appendChild(d);
        requestAnimationFrame(function () { if (vivo) d.classList.add('wh-pop-on'); });
        setTimeout(function () { if (vivo) d.classList.add('wh-pop-on'); }, 60);   // se la pagina e' in secondo piano il frame non arriva
        setTimeout(function () { if (!vivo) return; try { ((pericolo && !soloOk) ? no : si).focus(); } catch (e) {} }, 30);
    }

    window.chiedi = function (testo, o) { return apri(testo, o, false); };
    window.avvisa = function (testo, o) { return apri(testo, o, true); };
})();
