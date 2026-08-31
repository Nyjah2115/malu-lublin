/* Studio Urody Malu — interakcje */
(function () {
  'use strict';

  /* --------------------------------------------------------------
     Widoczność elementu. Nie polegam na samym IntersectionObserver —
     w części osadzonych przeglądarek nigdy nie odpala, a wtedy pół
     strony zostaje ukryte. Liczę z getBoundingClientRect przy scrollu.
  ---------------------------------------------------------------*/
  var obserwowane = [];
  var przeliczWidocznosc = function () {
    var wys = window.innerHeight || document.documentElement.clientHeight;
    for (var i = 0; i < obserwowane.length; i++) {
      var o = obserwowane[i];
      var r = o.el.getBoundingClientRect();
      var teraz = r.bottom > -o.margines && r.top < wys + o.margines;
      if (teraz !== o.stan) { o.stan = teraz; o.cb(teraz); }
    }
  };
  var rafWid = null;
  var zaplanujWidocznosc = function () {
    /* w zakładce w tle requestAnimationFrame nie chodzi — liczę od razu */
    if (document.hidden) { przeliczWidocznosc(); return; }
    if (rafWid) return;
    rafWid = requestAnimationFrame(function () { rafWid = null; przeliczWidocznosc(); });
  };
  var widocznosc = function (el, margines, cb) {
    obserwowane.push({ el: el, margines: margines, stan: null, cb: cb });
    przeliczWidocznosc();
  };
  document.addEventListener('visibilitychange', przeliczWidocznosc);
  window.addEventListener('scroll', zaplanujWidocznosc, { passive: true });
  window.addEventListener('resize', zaplanujWidocznosc);

  /* nav: sticky + burger */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var onScroll = function () {
    nav.classList.toggle('is-stuck', window.scrollY > 60);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  burger.addEventListener('click', function () {
    nav.classList.toggle('is-open');
  });
  document.querySelectorAll('#navLinks a').forEach(function (a) {
    a.addEventListener('click', function () { nav.classList.remove('is-open'); });
  });

  /* hero: przenikające się zdjęcia + parallax całej warstwy */
  var media = document.getElementById('heroMedia');
  var slides = Array.prototype.slice.call(document.querySelectorAll('.hero__img'));
  var dotsBox = document.getElementById('heroDots');
  var slow = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TRWANIE = 5600;
  var si = 0, timer = null, widoczny = true;

  /* pozostałe zdjęcia dociągam dopiero po załadowaniu strony */
  var dociagnij = function () {
    slides.forEach(function (im) {
      var d = im.getAttribute('data-src');
      if (d) { im.src = d; im.removeAttribute('data-src'); }
    });
  };
  if (document.readyState === 'complete') dociagnij();
  else window.addEventListener('load', dociagnij);

  var dots = slides.map(function (im, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', 'Zdjęcie ' + (i + 1) + ' z ' + slides.length);
    b.addEventListener('click', function () { pokaz(i); odlicz(); });
    dotsBox.appendChild(b);
    return b;
  });

  function pokaz(n) {
    si = (n + slides.length) % slides.length;
    slides.forEach(function (im, i) { im.classList.toggle('is-on', i === si); });
    dots.forEach(function (b, i) { b.classList.toggle('is-on', i === si); b.setAttribute('aria-selected', i === si); });
  }
  function odlicz() {
    clearTimeout(timer);
    if (slow || !widoczny || slides.length < 2) return;
    timer = setTimeout(function () { pokaz(si + 1); odlicz(); }, TRWANIE);
  }
  pokaz(0);
  odlicz();

  /* nie kręcimy zdjęć, gdy hero zjechało z ekranu albo karta jest w tle */
  var hero = document.querySelector('.hero');
  var naEkranie = true;
  var przelicz = function () {
    widoczny = naEkranie && !document.hidden;
    dotsBox.classList.toggle('is-paused', !widoczny);
    slides.forEach(function (im) { im.style.animationPlayState = widoczny ? '' : 'paused'; });
    if (widoczny) odlicz(); else clearTimeout(timer);
  };
  widocznosc(hero, 0, function (w) { naEkranie = w; przelicz(); });
  document.addEventListener('visibilitychange', przelicz);
  przelicz();

  var raf = null;
  var parallax = function () {
    raf = null;
    var y = window.scrollY;
    if (y > window.innerHeight * 1.2) return;
    media.style.transform = 'translateY(' + (y * 0.16).toFixed(1) + 'px)';
  };
  window.addEventListener('scroll', function () {
    if (!raf) raf = requestAnimationFrame(parallax);
  }, { passive: true });

  /* reveal przy scrollu */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e, i) {
      if (!e.isIntersecting) return;
      var el = e.target;
      setTimeout(function () { el.classList.add('in'); }, i * 70);
      io.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  var doOdslony = document.querySelectorAll('.reveal');
  doOdslony.forEach(function (el) { io.observe(el); });
  /* bezpiecznik: gdy IntersectionObserver milczy, odsłaniam wszystko ręcznie */
  setTimeout(function () {
    if (document.querySelectorAll('.reveal.in').length === 0 && doOdslony.length) {
      doOdslony.forEach(function (el) { el.classList.add('in'); });
    }
  }, 2500);

  /* cennik: zakładki */
  var tabs = document.querySelectorAll('.tab');
  var panels = document.querySelectorAll('.panel');
  var showTab = function (name) {
    tabs.forEach(function (t) { t.classList.toggle('is-active', t.dataset.tab === name); });
    panels.forEach(function (p) { p.classList.toggle('is-active', p.dataset.panel === name); });
  };
  tabs.forEach(function (t) {
    t.addEventListener('click', function () { showTab(t.dataset.tab); });
  });
  /* karta usługi -> otwiera właściwą zakładkę cennika */
  document.querySelectorAll('.card[data-cat]').forEach(function (c) {
    c.addEventListener('click', function () { showTab(c.dataset.cat); });
  });

  /* opinie: pływające kafle startują dopiero w kadrze */
  var scena = document.getElementById('opinieScena');
  if (scena) {
    widocznosc(scena, 120, function (w) {
      if (w) scena.classList.add('is-in');
      scena.classList.toggle('is-paused', !w || document.hidden);
    });
    document.addEventListener('visibilitychange', function () {
      scena.classList.toggle('is-paused', document.hidden);
    });

    /* na wąskim ekranie kafle jadą w pętli — duplikuję komplet, żeby nie było szwu */
    var tor = document.getElementById('opTor');
    if (tor) {
      Array.prototype.slice.call(tor.children).forEach(function (el) {
        var klon = el.cloneNode(true);
        klon.classList.add('op-klon');
        klon.setAttribute('aria-hidden', 'true');
        tor.appendChild(klon);
      });
      /* stałe tempo bez względu na szerokość ekranu: px na sekundę */
      var TEMPO = 34;
      var ustawTempoOpinii = function () {
        var polowa = tor.scrollWidth / 2;
        if (polowa > 0) tor.style.setProperty('--tempo', (polowa / TEMPO).toFixed(1) + 's');
      };
      ustawTempoOpinii();
      window.addEventListener('load', ustawTempoOpinii);
      var tOp = null;
      window.addEventListener('resize', function () {
        clearTimeout(tOp);
        tOp = setTimeout(ustawTempoOpinii, 250);
      });
    }
  }

  /* ---------------------------------------------------------------
     GALERIA — slider z przejściem „glass" na czystym WebGL.
     Bez Three.js i bez GSAP: ten sam efekt, zero zależności z CDN.
     Gdy WebGL nie wystartuje, zostaje przenikanie zwykłych <img>.
  ----------------------------------------------------------------*/
  var gal = document.getElementById('gal');
  var foty = gal ? Array.prototype.slice.call(gal.querySelectorAll('.gal__foto')) : [];
  var galIdx = 0;

  if (gal && foty.length) {
    var CZAS_SLAJDU = 5200;      /* ile stoi jedno zdjęcie */
    var CZAS_PRZEJSCIA = 2100;   /* ile trwa przejście */
    var tytulEl = document.getElementById('galTytul');
    var opisEl = document.getElementById('galOpis');
    var nrEl = document.getElementById('galNr');
    var navEl = document.getElementById('galNav');
    document.getElementById('galIle').textContent = String(foty.length).padStart(2, '0');

    /* --- pozycje nawigacji --- */
    var pozycje = foty.map(function (im, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gal__poz' + (i ? '' : ' is-on');
      b.innerHTML = '<span class="gal__kreska"><span class="gal__wypelnienie"></span></span>' + im.dataset.tytul;
      b.addEventListener('click', function () { idzDo(i, true); });
      navEl.appendChild(b);
      return b;
    });

    /* --- napisy --- */
    var wpiszTytul = function (tekst) {
      tytulEl.innerHTML = tekst.split('').map(function (z, i) {
        return '<span style="animation-delay:' + (i * 0.032).toFixed(3) + 's">' + (z === ' ' ? '&nbsp;' : z) + '</span>';
      }).join('');
    };
    var pokazNapisy = function (i) {
      tytulEl.classList.remove('is-in');
      tytulEl.classList.add('is-out');
      opisEl.classList.remove('is-in');
      setTimeout(function () {
        wpiszTytul(foty[i].dataset.tytul);
        opisEl.textContent = foty[i].dataset.opis;
        tytulEl.classList.remove('is-out');
        void tytulEl.offsetWidth;
        tytulEl.classList.add('is-in');
        opisEl.classList.add('is-in');
      }, 380);
    };
    wpiszTytul(foty[0].dataset.tytul);
    opisEl.textContent = foty[0].dataset.opis;

    /* --- WebGL --- */
    var gl = null, prog = null, tekstury = [], uni = {}, canvas = document.getElementById('galCanvas');
    var postep = 0, wTrakcie = false, klatka = null, galNaEkranie = false;

    var VS = 'attribute vec2 aPos;varying vec2 vUv;void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}';
    var FS = [
      'precision highp float;',
      'uniform sampler2D uT1,uT2;',
      'uniform vec2 uRes,uS1,uS2;',
      'uniform float uP;',
      'varying vec2 vUv;',
      'vec2 cover(vec2 uv,vec2 rozmiar){',
      '  vec2 s=uRes/rozmiar; float sk=max(s.x,s.y);',
      '  vec2 duzy=rozmiar*sk; vec2 off=(uRes-duzy)*0.5;',
      '  return (uv*uRes-off)/duzy;}',
      'void main(){',
      '  vec2 uv1=cover(vUv,uS1), uv2=cover(vUv,uS2);',
      '  float czas=uP*5.0;',
      '  float maxR=length(uRes)*0.85; float r=uP*maxR;',
      '  vec2 p=vUv*uRes; vec2 c=uRes*0.5;',
      '  float d=length(p-c); float nd=d/max(r,0.001);',
      '  float wSrodku=smoothstep(r+14.0,r-14.0,d);',
      '  vec4 nowy;',
      '  if(wSrodku>0.0){',
      '    float ro=0.045*pow(smoothstep(0.35,1.0,nd),1.6);',
      '    vec2 kier=(d>0.0)?(p-c)/d:vec2(0.0);',
      '    vec2 duv=uv2-kier*ro;',
      '    duv+=vec2(sin(czas+nd*10.0),cos(czas*0.8+nd*8.0))*0.007*nd*wSrodku;',
      '    float ab=0.0055*pow(smoothstep(0.45,1.0,nd),1.4);',
      '    nowy=vec4(texture2D(uT2,duv+kier*ab*1.2).r,',
      '              texture2D(uT2,duv+kier*ab*0.2).g,',
      '              texture2D(uT2,duv-kier*ab*0.8).b,1.0);',
      '    float rant=smoothstep(0.95,1.0,nd)*(1.0-smoothstep(1.0,1.01,nd));',
      '    nowy.rgb+=rant*0.12;',
      '  } else { nowy=texture2D(uT2,uv2); }',
      '  if(uP>0.95) nowy=mix(nowy,texture2D(uT2,uv2),(uP-0.95)/0.05);',
      '  gl_FragColor=mix(texture2D(uT1,uv1),nowy,wSrodku);}'
    ].join('\n');

    var szejder = function (typ, kod) {
      var sh = gl.createShader(typ);
      gl.shaderSource(sh, kod); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { return null; }
      return sh;
    };

    var zrobTeksture = function (im) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
      return { tex: t, w: im.naturalWidth, h: im.naturalHeight };
    };

    var rozmiar = function () {
      if (!gl) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      var w = Math.round(gal.clientWidth * dpr), h = Math.round(gal.clientHeight * dpr);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uni.uRes, w, h);
    };

    var rysuj = function () {
      if (!gl) return;
      gl.uniform1f(uni.uP, postep);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    var petla = function () {
      klatka = null;
      rozmiar();
      rysuj();
      if (wTrakcie && galNaEkranie) klatka = requestAnimationFrame(petla);
    };

    var startWebgl = function () {
      try {
        gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
          || canvas.getContext('experimental-webgl');
      } catch (e) { gl = null; }
      if (!gl) return false;
      var vs = szejder(gl.VERTEX_SHADER, VS), fs = szejder(gl.FRAGMENT_SHADER, FS);
      if (!vs || !fs) { gl = null; return false; }
      prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; return false; }
      gl.useProgram(prog);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['uT1', 'uT2', 'uRes', 'uS1', 'uS2', 'uP'].forEach(function (n) { uni[n] = gl.getUniformLocation(prog, n); });
      gl.uniform1i(uni.uT1, 0); gl.uniform1i(uni.uT2, 1);
      return true;
    };

    var wgrajTeksture = function (i) {
      return new Promise(function (res) {
        if (tekstury[i]) { res(tekstury[i]); return; }
        var im = foty[i];
        var gotowe = function () { tekstury[i] = zrobTeksture(im); res(tekstury[i]); };
        if (!im.getAttribute('src')) im.src = im.dataset.src;
        if (im.complete && im.naturalWidth) gotowe();
        else { im.onload = gotowe; im.onerror = function () { res(null); }; }
      });
    };

    var ustawPare = function (a, b) {
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.tex);
      gl.uniform2f(uni.uS1, a.w, a.h);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, b.tex);
      gl.uniform2f(uni.uS2, b.w, b.h);
    };

    /* --- przejście --- */
    var timerPostepu = null, timerAuto = null;
    var przejscie = function (cel) {
      var a = tekstury[galIdx], b = tekstury[cel];
      if (!a || !b) { galIdx = cel; return; }
      wTrakcie = true;
      ustawPare(a, b);
      var t0 = performance.now();
      var krok = function (t) {
        var x = Math.min((t - t0) / CZAS_PRZEJSCIA, 1);
        postep = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; /* easeInOutQuad */
        rysuj();
        if (x < 1) requestAnimationFrame(krok);
        else {
          galIdx = cel;
          postep = 0;
          ustawPare(b, b);
          rysuj();
          wTrakcie = false;
          startOdliczania();
        }
      };
      requestAnimationFrame(krok);
    };

    var idzDo = function (cel, zRekiUzytkownika) {
      if (wTrakcie || cel === galIdx) return;
      stopOdliczania();
      zerujPasek(galIdx);
      pozycje.forEach(function (b, i) { b.classList.toggle('is-on', i === cel); });
      nrEl.textContent = String(cel + 1).padStart(2, '0');
      pokazNapisy(cel);
      foty.forEach(function (im, i) { im.classList.toggle('is-on', i === cel); });
      wgrajTeksture(cel).then(function (t) {
        if (gl && t) przejscie(cel);
        else { galIdx = cel; startOdliczania(); }
      });
      if (zRekiUzytkownika) doladujSasiada(cel + 1);
    };

    var doladujSasiada = function (i) { wgrajTeksture((i + foty.length) % foty.length); };

    var pasek = function (i) { return pozycje[i] && pozycje[i].querySelector('.gal__wypelnienie'); };
    var zerujPasek = function (i) { var el = pasek(i); if (el) { el.style.opacity = '0'; el.style.width = '0%'; } };
    var startOdliczania = function () {
      stopOdliczania();
      if (!galNaEkranie || document.hidden || wolniej) return;
      var el = pasek(galIdx); if (el) el.style.opacity = '1';
      var t0 = performance.now();
      timerPostepu = setInterval(function () {
        var x = Math.min((performance.now() - t0) / CZAS_SLAJDU, 1);
        if (el) el.style.width = (x * 100).toFixed(1) + '%';
        if (x >= 1) {
          stopOdliczania();
          idzDo((galIdx + 1) % foty.length);
          doladujSasiada(galIdx + 2);
        }
      }, 60);
    };
    var stopOdliczania = function () {
      if (timerPostepu) clearInterval(timerPostepu);
      if (timerAuto) clearTimeout(timerAuto);
      timerPostepu = timerAuto = null;
    };

    var wolniej = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* --- start dopiero, gdy galeria zbliża się do ekranu --- */
    var wystartowano = false;
    var odpal = function () {
      if (wystartowano) return;
      wystartowano = true;
      if (startWebgl()) {
        Promise.all([wgrajTeksture(0), wgrajTeksture(1)]).then(function (r) {
          if (!r[0]) { gl = null; return; }
          gal.classList.add('is-webgl');
          ustawPare(r[0], r[0]);
          rozmiar(); rysuj();
          startOdliczania();
        });
      } else {
        foty.forEach(function (im) { if (!im.getAttribute('src')) im.src = im.dataset.src; });
        startOdliczania();
      }
      tytulEl.classList.add('is-in');
      opisEl.classList.add('is-in');
    };

    widocznosc(gal, 300, function (w) {
      galNaEkranie = w;
      if (w) { odpal(); startOdliczania(); } else { stopOdliczania(); }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopOdliczania(); else if (galNaEkranie) startOdliczania();
    });
    gal.addEventListener('mouseenter', stopOdliczania);
    gal.addEventListener('mouseleave', function () { if (galNaEkranie) startOdliczania(); });
    window.addEventListener('resize', function () { rozmiar(); rysuj(); });
  }

  /* lightbox — otwiera aktualne zdjęcie galerii w pełnym rozmiarze */
  var lb = document.getElementById('lb');
  var lbImg = document.getElementById('lbImg');
  if (lb && foty.length) {
    var otworz = function (i) {
      galIdx = (i + foty.length) % foty.length;
      var im = foty[galIdx];
      lbImg.src = im.getAttribute('src') || im.dataset.src;
      lbImg.alt = im.alt;
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };
    var zamknij = function () {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };
    gal.addEventListener('click', function (e) {
      if (e.target.closest('.gal__poz')) return;
      otworz(galIdx);
    });
    document.getElementById('lbX').addEventListener('click', zamknij);
    document.getElementById('lbN').addEventListener('click', function (e) { e.stopPropagation(); otworz(galIdx + 1); });
    document.getElementById('lbP').addEventListener('click', function (e) { e.stopPropagation(); otworz(galIdx - 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target === lbImg) zamknij(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') zamknij();
      if (e.key === 'ArrowRight') otworz(galIdx + 1);
      if (e.key === 'ArrowLeft') otworz(galIdx - 1);
    });
  }

  document.getElementById('yr').textContent = new Date().getFullYear();
})();
