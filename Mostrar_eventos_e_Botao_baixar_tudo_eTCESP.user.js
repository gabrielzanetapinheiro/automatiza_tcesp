// ==UserScript==
// @name         E-TCESP - Evento + Baixar Todos
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Exibe (ev. X.X) antes do nome do arquivo e adiciona botão para baixar todos
// @match        https://e-processo.tce.sp.gov.br/*
// @noframes     true
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    var scriptCode = '(' + function() {

        // ── EVENT NUMBERS ──
        function showEventNumbers() {
            var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT, null, false);
            var node;
            while (node = walker.nextNode()) {
                var text = node.textContent.trim();
                if (/^\d+\.\d+$/.test(text)) {
                    var td = node.parentElement;
                    if (!td || td.getAttribute('data-evt-done')) continue;
                    td.setAttribute('data-evt-done', '1');
                    var tr = td.closest('tr');
                    if (!tr) continue;
                    var fileLink = tr.querySelector('a[href*="DownloadArquivo"]');
                    if (fileLink && !fileLink.parentElement.querySelector('.evt-num')) {
                        var span = document.createElement('span');
                        span.className = 'evt-num';
                        span.textContent = '(ev. ' + text + ') | ';
                        span.style.cssText = 'font-weight:bold;color:#1a5276;font-size:12px;';
                        fileLink.insertAdjacentElement('beforebegin', span);
                    }
                }
            }
        }

        // ── DOWNLOAD BUTTON ──
        function getEvNum(linkEl) {
            var tr = linkEl.closest('tr');
            if (!tr) return '';
            var w = document.createTreeWalker(tr, NodeFilter.SHOW_COMMENT, null, false);
            var n;
            while (n = w.nextNode()) {
                var t = n.textContent.trim();
                if (/^\d+\.\d+$/.test(t)) return t;
            }
            return '';
        }

        function addDownloadButton() {
            if (document.getElementById('tce-dl-btn')) return;
            var navLink = null;
            document.querySelectorAll('a.btAtividade').forEach(function(a) {
                if (a.textContent.indexOf('Navegar') > -1) navLink = a;
            });
            if (!navLink) return;

            var btn = document.createElement('a');
            btn.id = 'tce-dl-btn';
            btn.href = 'javascript:void(0);';
            btn.className = 'btAtividade linkBt';
            btn.textContent = 'Baixar Todos os Arquivos';
            btn.style.cssText = 'margin-left:10px;background:#1a5276;color:#fff;padding:4px 14px;text-decoration:none;font-weight:bold;font-size:12px;border-radius:4px;cursor:pointer;';

            navLink.parentElement.appendChild(document.createTextNode(' '));
            navLink.parentElement.appendChild(btn);

            btn.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('span[id^="subMostra"]').forEach(function(s) { s.style.display = 'block'; });

                setTimeout(function() {
                    var allLinks = document.querySelectorAll('a[href*="DownloadArquivo"]');
                    var toDownload = [];
                    allLinks.forEach(function(a) {
                        var name = a.textContent.trim();
                        var lower = name.toLowerCase();
                        if (!lower.endsWith('.html') && !lower.endsWith('.htm') && !lower.endsWith('.lnk')) {
                            var ev = getEvNum(a);
                            toDownload.push({ url: a.getAttribute('href'), name: ev ? '(' + 'ev. ' + ev + ') ' + name : name });
                        }
                    });

                    if (!toDownload.length) { alert('Nenhum arquivo encontrado.'); return; }
                    if (!confirm('Baixar ' + toDownload.length + ' arquivo(s)?\n(Arquivos .html e .lnk serão ignorados)')) return;

                    var idx = 0;
                    function next() {
                        if (idx >= toDownload.length) {
                            btn.textContent = 'Concluído!'; btn.style.background = '#065f46';
                            setTimeout(function() { btn.textContent = 'Baixar Todos os Arquivos'; btn.style.background = '#1a5276'; }, 3000);
                            return;
                        }
                        var item = toDownload[idx];
                        btn.textContent = 'Baixando ' + (idx + 1) + '/' + toDownload.length + '...';
                        btn.style.background = '#78350f';

                        fetch(item.url).then(function(r) { return r.blob(); }).then(function(blob) {
                            var u = URL.createObjectURL(blob);
                            var a = document.createElement('a'); a.href = u; a.download = item.name; a.style.display = 'none';
                            document.body.appendChild(a); a.click();
                            setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(u); }, 200);
                            idx++; setTimeout(next, 700);
                        }).catch(function() { idx++; setTimeout(next, 700); });
                    }
                    next();
                }, 500);
            });
        }

        // ── RUN ──
        if (document.body) { showEventNumbers(); addDownloadButton(); }
        setInterval(showEventNumbers, 2000);
        setInterval(addDownloadButton, 2000);

    } + ')();';

    function injectIntoFrame(win) {
        try {
            var doc = win.document;
            if (!doc || !doc.body) return;
            if (doc.body.getAttribute('data-tce-combo')) return;
            doc.body.setAttribute('data-tce-combo', '1');
            var s = doc.createElement('script');
            s.textContent = scriptCode;
            doc.body.appendChild(s);
        } catch(e) {}
    }

    function scan() {
        for (var i = 0; i < window.frames.length; i++) {
            try { injectIntoFrame(window.frames[i]); for (var j = 0; j < window.frames[i].frames.length; j++) { try { injectIntoFrame(window.frames[i].frames[j]); } catch(e) {} } } catch(e) {}
        }
        injectIntoFrame(window);
    }

    scan(); setInterval(scan, 3000);
})();
