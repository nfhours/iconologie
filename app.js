/* Иконология Бодуэна: указатель и карточки статей.
   Данные: data/entries.json, гравюры: img/, сканы страниц: pages/ рядом с этим файлом. */
(function(){
  // Бампать при каждой правке app.css (и, по желанию, когда меняется логика
  // в app.js, завязанная на новую разметку), чтобы браузеры и CDN не отдавали
  // старую закэшированную копию стилей после деплоя.
  var APP_VER = "9";
  var me = document.currentScript;
  var BASE = (me && me.src) ? me.src.replace(/[^\/]*$/, "") : "./";
  var root = document.getElementById("iconologie");
  if(!root){ root = document.createElement("div"); root.id = "iconologie"; (me && me.parentNode ? me.parentNode : document.body).appendChild(root); }
  root.className = "ic";
  if(root.dataset.top) root.style.setProperty("--top", root.dataset.top);

  // шрифты и стили
  function addLink(href){ var l=document.createElement("link"); l.rel="stylesheet"; l.href=href; document.head.appendChild(l); }
  addLink("https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Literata:opsz,wght@7..72,400;7..72,500;7..72,600&display=swap");
  var existingLink = document.querySelector('link[data-ic]');
  if(existingLink && existingLink.getAttribute("data-ic")!==APP_VER){ existingLink.remove(); existingLink=null; }
  if(!existingLink){
    var l=document.createElement("link"); l.rel="stylesheet"; l.href=BASE+"app.css?v="+APP_VER; l.setAttribute("data-ic",APP_VER); document.head.appendChild(l);
  }

  /* ---------- i18n ---------- */
  var DICT = {
    title:        {ru:"Иконология", en:"Iconologia"},
    subtitle:     {ru:"Чезаре Рипа во французском переводе Жана Бодуэна, Париж, 1644. Указатель обеих частей с переводом. Нажмите на сюжет, чтобы открыть статью.",
                    en:"Cesare Ripa, in the French translation of Jean Baudoin, Paris, 1644. Index of both parts with translation. Click a subject to open the article."},
    progress:     {ru:"Переведено статей: {done} из {total}", en:"Articles translated: {done} of {total}"},
    searchPh:     {ru:"Найти: сюжет, предмет, слово по-русски, по-французски или по-английски", en:"Search: subject, motif, a word in English, French, or Russian"},
    fAll:         {ru:"Все", en:"All"},
    fPart1:       {ru:"Часть 1", en:"Part 1"},
    fPart2:       {ru:"Часть 2", en:"Part 2"},
    fReady:       {ru:"С гравюрой и переводом", en:"With engraving and translation"},
    sBook:        {ru:"Как в книге", en:"As in the book"},
    sAlpha:       {ru:"По алфавиту", en:"Alphabetical"},
    sPage:        {ru:"По странице", en:"By page"},
    found:        {ru:"Найдено: {n}", en:"Found: {n}"},
    emptyReady:   {ru:"Пока нет готовых статей. Они появятся здесь по мере перевода.", en:"No articles finished yet. They will appear here as the translation progresses."},
    emptySearch:  {ru:"Ничего не найдено. Попробуйте другое слово или старое написание, например «hyver» вместо «hiver».",
                    en:"Nothing found. Try another word or the old spelling, e.g. “hyver” instead of “hiver”."},
    part1:        {ru:"Часть первая", en:"Part One"},
    part2:        {ru:"Часть вторая", en:"Part Two"},
    partN:        {ru:"ч. {n}", en:"pt. {n}"},
    pageAbbr:     {ru:"с.", en:"p."},
    loading:      {ru:"Загрузка…", en:"Loading…"},
    loadError:    {ru:"Не удалось загрузить данные. Обновите страницу.", en:"Could not load the data. Please refresh the page."},
    back:         {ru:"← Указатель", en:"← Index"},
    prevArticle:  {ru:"Предыдущая статья", en:"Previous article"},
    nextArticle:  {ru:"Следующая статья", en:"Next article"},
    position:     {ru:"Часть {part}, с. {page}", en:"Part {part}, p. {page}"},
    engravingAlt: {ru:"Гравюра: {title}", en:"Engraving: {title}"},
    figOf:        {ru:"{k} из {n}", en:"{k} of {n}"},
    captionLbl:   {ru:"Подпись на гравюре:", en:"Caption on the engraving:"},
    whatSec:      {ru:"Что изображено", en:"What is depicted"},
    translSec:    {ru:"Перевод", en:"Translation"},
    originalSec:  {ru:"Оригинал", en:"Original"},
    viewScan:     {ru:"скан", en:"scan"},
    viewText:     {ru:"текст", en:"text"},
    openFull:     {ru:"Открыть на весь экран", en:"Open fullscreen"},
    pagePrev:     {ru:"Предыдущая страница", en:"Previous page"},
    pageNext:     {ru:"Следующая страница", en:"Next page"},
    pageOf:       {ru:"стр. {k} из {n}", en:"page {k} of {n}"},
    missing:      {ru:"Эта статья ещё не добавлена.", en:"This article has not been added yet."},
    missingAt:    {ru:"В книге: часть {part}, страница {page}.", en:"In the book: part {part}, page {page}."},
    pagerBack:    {ru:"Назад", en:"Back"},
    pagerNext:    {ru:"Дальше", en:"Next"},
    lbAlt:        {ru:"Гравюра", en:"Engraving"},
    close:        {ru:"Закрыть", en:"Close"},
    readyYes:     {ru:"Есть гравюра и перевод", en:"Has engraving and translation"},
    readyNo:      {ru:"Ещё не добавлено", en:"Not added yet"},
    langName:     {ru:"RU", en:"EN"}
  };
  function t(key, vars){
    var s = (DICT[key] && (DICT[key][state.lang] || DICT[key].ru)) || key;
    if(vars) for(var k in vars) s = s.replace("{"+k+"}", vars[k]);
    return s;
  }

  var items=[], byId={}, state={q:"",filter:"all",sort:"book",scroll:0,lang:"ru"};
  try{ var s=sessionStorage.getItem("ic-state"); if(s){ var o=JSON.parse(s); state.q=o.q||""; state.filter=o.filter||"all"; state.sort=o.sort||"book"; } }catch(e){}

  // язык: ?lang= в URL (приоритет и запоминается) > сохранённый выбор > data-lang на блоке > ru
  (function initLang(){
    var qLang = null;
    try{ qLang = new URLSearchParams(location.search).get("lang"); }catch(e){}
    var saved = null;
    try{ saved = localStorage.getItem("ic-lang"); }catch(e){}
    var fromAttr = root.getAttribute("data-lang");
    var lang = (qLang==="en"||qLang==="ru") ? qLang : (saved==="en"||saved==="ru") ? saved : (fromAttr==="en"||fromAttr==="ru") ? fromAttr : "ru";
    state.lang = lang;
    if(qLang && qLang!==saved){ try{ localStorage.setItem("ic-lang", qLang); }catch(e){} }
    root.setAttribute("data-lang", lang);
  })();
  function setLang(l){
    state.lang = l;
    try{ localStorage.setItem("ic-lang", l); }catch(e){}
    try{
      var u = new URL(location.href);
      u.searchParams.set("lang", l);
      history.replaceState(null, "", u.toString());
    }catch(e){}
    root.setAttribute("data-lang", l);
    route();
  }
  function keep(){ try{ sessionStorage.setItem("ic-state", JSON.stringify({q:state.q,filter:state.filter,sort:state.sort})); }catch(e){} }

  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function norm(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/¶/g,"").replace(/ſ/g,"s").replace(/ё/g,"е").replace(/j/g,"i").replace(/v/g,"u").replace(/y/g,"i").replace(/['’]/g," "); }
  // paragraphs may embed a quoted verse after a ¶ marker, with lines separated by " / ";
  // render the verse as its own italic, line-broken block instead of running it into the prose.
  function paraHtml(arr){
    return (arr||[]).map(function(p){
      var parts = String(p||"").split("¶"), html = "";
      if(parts[0]) html += "<p>"+esc(parts[0])+"</p>";
      for(var i=1;i<parts.length;i++){
        html += '<p class="ic-verse">'+parts[i].split(" / ").map(esc).join("<br>")+'</p>';
      }
      return html;
    }).join("");
  }
  function ready(it){ return (it.img&&it.img.length) || (it.text_ru&&it.text_ru.length); }
  // заголовок/перевод/группа на текущем языке, с откатом на русский, если EN ещё не готов
  function titleOf(it){ return state.lang==="en" && it.en ? it.en : it.ru; }
  function groupOf(it){ return state.lang==="en" && it.group_en ? it.group_en : it.group; }

  root.innerHTML = '<div class="ic-wrap"><p class="ic-sub">'+t("loading")+'</p></div>';

  fetch(BASE+"data/entries.json",{cache:"no-cache"}).then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(d){
    items = d.items || [];
    items.forEach(function(it,i){
      it.ord=i; byId[it.id]=it; it.pn=parseInt(it.page,10)||0;
      it.key = norm([it.fr,it.ru,it.en||"",it.group,it.group_fr,it.group_en||"",it.num,it.caption||"",
        (it.attrs||[]).map(function(a){return a.what+" "+a.meaning+" "+(a.what_en||"")+" "+(a.meaning_en||"");}).join(" "),
        (it.text_ru||[]).join(" "),(it.text_en||[]).join(" "),(it.text_fr||[]).join(" ")].join(" "));
    });
    window.addEventListener("hashchange", route);
    route();
  }).catch(function(){
    root.innerHTML = '<div class="ic-wrap"><p class="ic-empty">'+t("loadError")+'</p></div>';
  });

  function route(){
    var m = location.hash.match(/^#\/(p[12]-\d+)$/);
    if(m && byId[m[1]]) renderCard(byId[m[1]]); else renderIndex();
  }
  function go(id){ state.scroll = window.scrollY; location.hash = "#/"+id; }
  function toTop(){ var r=root.getBoundingClientRect(); if(r.top<0) window.scrollTo(0, window.scrollY+r.top); }
  // WebKit (в т.ч. iPadOS) иногда не перерисовывает position:sticky после замены
  // innerHTML на SPA-переходе — элемент «застревает» в старом положении/размере.
  // Небольшой форс-reflow после каждого рендера чинит это без видимого мигания.
  function nudgeRepaint(){
    requestAnimationFrame(function(){ window.scrollTo(window.scrollX, window.scrollY); });
  }

  function langSwitch(){
    return '<div class="ic-lang" role="group" aria-label="RU / EN">'+
      '<button type="button" class="ic-lang-b" data-lang="ru" aria-pressed="'+(state.lang==="ru")+'">RU</button>'+
      '<button type="button" class="ic-lang-b" data-lang="en" aria-pressed="'+(state.lang==="en")+'">EN</button>'+
      '</div>';
  }
  function bindLangSwitch(container){
    container.querySelectorAll(".ic-lang-b").forEach(function(b){ b.addEventListener("click",function(){ setLang(b.getAttribute("data-lang")); }); });
  }

  /* ---------- указатель ---------- */
  function filtered(){
    var nq = norm(state.q.trim());
    var res = items.filter(function(it){
      if(state.filter==="1" && it.part!==1) return false;
      if(state.filter==="2" && it.part!==2) return false;
      if(state.filter==="ready" && !ready(it)) return false;
      return !nq || nq.split(/\s+/).every(function(w){ return it.key.indexOf(w)>-1; });
    });
    if(state.sort==="ru") res.sort(function(a,b){ return titleOf(a).localeCompare(titleOf(b),state.lang==="en"?"en":"ru"); });
    else if(state.sort==="page") res.sort(function(a,b){ return a.part-b.part || a.pn-b.pn || a.ord-b.ord; });
    return res;
  }

  function renderIndex(){
    var done = items.filter(ready).length, pct = items.length ? Math.round(done*100/items.length) : 0;
    root.innerHTML =
      '<div class="ic-wrap">'+
        '<div class="ic-top-row">'+langSwitch()+'</div>'+
        '<h1 class="ic-title">'+t("title")+'</h1>'+
        '<p class="ic-sub">'+t("subtitle")+'</p>'+
        '<p class="ic-progress">'+t("progress",{done:done,total:items.length})+'<span class="ic-bar"><i style="width:'+pct+'%"></i></span></p>'+
        '<div class="ic-controls">'+
          '<input class="ic-search" type="search" placeholder="'+esc(t("searchPh"))+'" autocomplete="off" aria-label="'+esc(t("searchPh"))+'">'+
          '<div class="ic-row"><div class="ic-seg" role="group" aria-label="Filter">'+
            chip("all",t("fAll"))+chip("1",t("fPart1"))+chip("2",t("fPart2"))+chip("ready",t("fReady"))+
          '</div><select class="ic-sort" aria-label="Sort">'+
            opt("book",t("sBook"))+opt("ru",t("sAlpha"))+opt("page",t("sPage"))+
          '</select></div>'+
          '<p class="ic-count"></p>'+
        '</div>'+
        '<div class="ic-list"></div>'+
      '</div>';
    bindLangSwitch(root);
    var q=root.querySelector(".ic-search"); q.value=state.q;
    q.addEventListener("input",function(){ state.q=q.value; keep(); fill(); });
    root.querySelector(".ic-sort").addEventListener("change",function(e){ state.sort=e.target.value; keep(); fill(); });
    root.querySelectorAll(".ic-chip").forEach(function(b){ b.addEventListener("click",function(){
      state.filter=b.getAttribute("data-f"); keep();
      root.querySelectorAll(".ic-chip").forEach(function(x){ x.setAttribute("aria-pressed", x===b); });
      fill();
    });});
    root.querySelector(".ic-list").addEventListener("click",function(e){
      var r=e.target.closest(".ic-row-item"); if(r) go(r.getAttribute("data-id"));
    });
    root.querySelector(".ic-list").addEventListener("keydown",function(e){
      var r=e.target.closest(".ic-row-item"); if(r && (e.key==="Enter"||e.key===" ")){ e.preventDefault(); go(r.getAttribute("data-id")); }
    });
    fill();
    if(state.scroll){ var y=state.scroll; state.scroll=0; requestAnimationFrame(function(){ window.scrollTo(0,y); }); }
    nudgeRepaint();
  }
  function chip(v,t){ return '<button type="button" class="ic-chip" data-f="'+v+'" aria-pressed="'+(state.filter===v)+'">'+t+'</button>'; }
  function opt(v,t){ return '<option value="'+v+'"'+(state.sort===v?" selected":"")+'>'+t+'</option>'; }

  function fill(){
    var list=root.querySelector(".ic-list"), count=root.querySelector(".ic-count");
    var res=filtered(), nq=state.q.trim();
    count.textContent = res.length ? t("found",{n:res.length}) : "";
    if(!res.length){
      list.innerHTML = '<p class="ic-empty">'+(state.filter==="ready" && !nq ? t("emptyReady") : t("emptySearch"))+'</p>';
      return;
    }
    var grouped = state.sort==="book" && !nq, showPart = state.sort==="ru" || (!grouped && state.filter!=="1" && state.filter!=="2");
    var html="", part=0, grp=null, open=false;
    res.forEach(function(it){
      if(state.sort!=="ru" && it.part!==part){
        if(open){ html+="</ul></section>"; open=false; }
        html+='<h2 class="ic-part">'+(it.part===1?t("part1"):t("part2"))+'</h2>'; part=it.part; grp=null;
      }
      if(grouped){
        var gk=it.part+"|"+it.group+"|"+it.group_fr;
        if(gk!==grp){
          if(open) html+="</ul></section>";
          html+='<section class="ic-group"><h2><span>'+esc(groupOf(it))+'</span>'+(it.group_fr?'<span class="ic-gfr">'+esc(it.group_fr)+'</span>':"")+
            (it.group_page?'<span class="ic-gpg">'+esc(t("pageAbbr"))+' '+esc(it.group_page)+'</span>':"")+'</h2><ul>';
          grp=gk; open=true;
        }
      } else if(!open){ html+='<section class="ic-group"><ul>'; open=true; }
      html+='<li class="ic-row-item" tabindex="0" role="link" data-id="'+it.id+'">'+
        '<span class="ic-pg">'+esc(it.page)+'<small>'+(showPart?t("partN",{n:it.part}):t("pageAbbr"))+'</small></span>'+
        '<span><span class="ic-fr">'+(it.num?'<span class="ic-num">'+it.num+'</span>':"")+esc(it.fr)+'</span>'+
        '<span class="ic-ru">'+esc(titleOf(it))+(it.flag?" ("+esc(it.flag)+")":"")+'</span></span>'+
        '<span class="ic-dot'+(ready(it)?" on":"")+'" title="'+esc(ready(it)?t("readyYes"):t("readyNo"))+'"></span>'+
      '</li>';
    });
    if(open) html+="</ul></section>";
    list.innerHTML=html;
  }

  /* ---------- карточка статьи ---------- */
  function seq(){ var r=filtered(); if(state.sort==="ru") return r; return r.slice().sort(function(a,b){return a.ord-b.ord;}); }

  function renderCard(it){
    var s=seq(), i=s.indexOf(it);
    if(i<0){ s=items; i=it.ord; }
    var prev=s[i-1], next=s[i+1];
    var pos=t("position",{part:it.part,page:it.page});
    var imgs=(it.img||[]).map(function(src,k){
      return '<figure class="ic-fig" data-src="'+esc(BASE+"img/"+src)+'"><img loading="lazy" src="'+esc(BASE+"img/"+src)+'" alt="'+esc(t("engravingAlt",{title:titleOf(it)}))+'">'+
        (it.img.length>1?'<figcaption>'+t("figOf",{k:k+1,n:it.img.length})+'</figcaption>':"")+'</figure>';
    }).join("");
    var captionLine = it.caption ? '<p class="ic-caption"><b>'+esc(t("captionLbl"))+'</b> '+esc(it.caption)+'</p>' : "";
    var attrs=(it.attrs||[]).map(function(a){
      var what = state.lang==="en" && a.what_en ? a.what_en : a.what;
      var meaning = state.lang==="en" && a.meaning_en ? a.meaning_en : a.meaning;
      return '<li><b>'+esc(what)+'</b><span>'+esc(meaning)+'</span></li>';
    }).join("");
    var translArr = state.lang==="en" && it.text_en && it.text_en.length ? it.text_en : it.text_ru;
    var transl=paraHtml(translArr);
    var hasScans = it.scans && it.scans.length;
    var hasFr = it.text_fr && it.text_fr.length;

    root.innerHTML =
      '<div class="ic-wrap">'+
        '<div class="ic-nav">'+
          '<button type="button" class="ic-back">'+t("back")+'</button>'+
          '<span class="ic-nav-pos">'+pos+'</span>'+
          '<button type="button" class="ic-arrow" data-go="'+(prev?prev.id:"")+'"'+(prev?"":" disabled")+' aria-label="'+esc(t("prevArticle"))+'">‹</button>'+
          '<button type="button" class="ic-arrow" data-go="'+(next?next.id:"")+'"'+(next?"":" disabled")+' aria-label="'+esc(t("nextArticle"))+'">›</button>'+
          langSwitch()+
        '</div>'+
        '<header class="ic-head">'+
          '<p class="ic-kicker">'+(it.num?it.num+". ":"")+esc(it.group_fr?groupOf(it):(it.part===1?t("part1"):""))+'</p>'+
          '<h1 class="ic-h-fr">'+esc(it.fr)+'</h1>'+
          '<p class="ic-h-ru">'+esc(titleOf(it))+'</p>'+
        '</header>'+
        (imgs?'<div class="ic-figs">'+imgs+'</div>'+captionLine:"")+
        (attrs?'<section class="ic-sec"><h3>'+t("whatSec")+'</h3><ul class="ic-attrs">'+attrs+'</ul></section>':"")+
        (transl?'<section class="ic-sec"><h3>'+t("translSec")+'</h3><div class="ic-text">'+transl+'</div></section>':"")+
        ((hasScans||hasFr)?renderOriginal(it):"")+
        (!imgs && !transl ? '<div class="ic-missing"><b>'+t("missing")+'</b><br>'+t("missingAt",{part:it.part,page:esc(it.page)})+'</div>':"")+
        '<div class="ic-pager">'+
          '<button type="button" data-go="'+(prev?prev.id:"")+'"'+(prev?"":" disabled")+'><small>'+t("pagerBack")+'</small><span>'+(prev?esc(prev.fr):"")+'</span></button>'+
          '<button type="button" data-go="'+(next?next.id:"")+'"'+(next?"":" disabled")+'><small>'+t("pagerNext")+'</small><span>'+(next?esc(next.fr):"")+'</span></button>'+
        '</div>'+
      '</div>';

    bindLangSwitch(root);
    root.querySelector(".ic-back").addEventListener("click",function(){
      location.hash="";
    });
    root.querySelectorAll("[data-go]").forEach(function(b){ b.addEventListener("click",function(){
      var id=b.getAttribute("data-go"); if(id) location.hash="#/"+id;
    });});
    root.querySelectorAll(".ic-fig").forEach(function(f){ f.addEventListener("click",function(){ lightbox(f.getAttribute("data-src")); }); });
    if(hasScans||hasFr) bindOriginal(it);
    toTop();
    nudgeRepaint();
  }

  /* ---------- раздел «Оригинал»: скан / французский текст ---------- */
  function renderOriginal(it){
    var hasScans = it.scans && it.scans.length;
    var hasFr = it.text_fr && it.text_fr.length;
    var defaultView = hasScans ? "scan" : "text";
    return '<details class="ic-details ic-original"><summary>'+t("originalSec")+'</summary>'+
      '<div class="ic-orig-body" data-loaded="0">'+
        (hasScans && hasFr ? '<div class="ic-orig-toggle">'+
          '<button type="button" class="ic-ov-b" data-view="scan" aria-pressed="true">'+t("viewScan")+'</button>'+
          '<button type="button" class="ic-ov-b" data-view="text" aria-pressed="false">'+t("viewText")+'</button>'+
        '</div>' : "")+
        '<div class="ic-orig-view" data-view="'+defaultView+'"></div>'+
      '</div>'+
    '</details>';
  }
  function bindOriginal(it){
    var det = root.querySelector(".ic-original");
    if(!det) return;
    var body = det.querySelector(".ic-orig-body");
    var view = det.querySelector(".ic-orig-view");
    var page = 0;
    function textHtml(){
      return '<div class="ic-text ic-fr-text">'+paraHtml(it.text_fr)+'</div>';
    }
    function scanHtml(){
      var scans = it.scans||[];
      if(!scans.length) return "";
      var src = BASE+"pages/"+scans[page];
      return '<div class="ic-scan">'+
        '<div class="ic-scan-frame" data-src="'+esc(src)+'">'+
          '<img src="'+esc(src)+'" alt="'+esc(t("engravingAlt",{title:titleOf(it)}))+'">'+
          '<button type="button" class="ic-scan-zoom" aria-label="'+esc(t("openFull"))+'">⤢</button>'+
        '</div>'+
        (scans.length>1?'<div class="ic-scan-nav">'+
          '<button type="button" class="ic-scan-prev" aria-label="'+esc(t("pagePrev"))+'"'+(page===0?" disabled":"")+'>‹</button>'+
          '<span>'+esc(t("pageOf",{k:page+1,n:scans.length}))+'</span>'+
          '<button type="button" class="ic-scan-next" aria-label="'+esc(t("pageNext"))+'"'+(page===scans.length-1?" disabled":"")+'>›</button>'+
        '</div>':"")+
      '</div>';
    }
    function draw(v){
      view.setAttribute("data-view", v);
      view.innerHTML = v==="scan" ? scanHtml() : textHtml();
      if(v==="scan"){
        var frame = view.querySelector(".ic-scan-frame");
        if(frame) frame.addEventListener("click",function(){ lightbox(frame.getAttribute("data-src")); });
        var pv=view.querySelector(".ic-scan-prev"), nx=view.querySelector(".ic-scan-next");
        if(pv) pv.addEventListener("click",function(e){ e.stopPropagation(); if(page>0){ page--; draw("scan"); } });
        if(nx) nx.addEventListener("click",function(e){ e.stopPropagation(); if(page<it.scans.length-1){ page++; draw("scan"); } });
      }
    }
    // ленивая загрузка: рисуем содержимое раздела только при первом открытии <details>
    det.addEventListener("toggle",function(){
      if(det.open && body.getAttribute("data-loaded")==="0"){
        body.setAttribute("data-loaded","1");
        draw(view.getAttribute("data-view"));
      }
    });
    det.querySelectorAll(".ic-ov-b").forEach(function(b){
      b.addEventListener("click",function(){
        det.querySelectorAll(".ic-ov-b").forEach(function(x){ x.setAttribute("aria-pressed", x===b); });
        draw(b.getAttribute("data-view"));
      });
    });
  }

  function lightbox(src){
    var d=document.createElement("div"); d.className="ic ic-lb"; d.setAttribute("role","dialog"); d.setAttribute("aria-label",t("lbAlt"));
    d.innerHTML='<img src="'+esc(src)+'" alt=""><button type="button" aria-label="'+esc(t("close"))+'">×</button>';
    function close(){ d.remove(); document.removeEventListener("keydown",onKey); document.documentElement.style.overflow=""; }
    function onKey(e){ if(e.key==="Escape") close(); }
    d.addEventListener("click",close); document.addEventListener("keydown",onKey);
    document.documentElement.style.overflow="hidden";
    document.body.appendChild(d); d.querySelector("button").focus();
  }

  // стрелки клавиатуры в карточке
  document.addEventListener("keydown",function(e){
    if(!/^#\/p/.test(location.hash) || document.querySelector(".ic-lb")) return;
    if(e.target.matches && e.target.matches("input,textarea,select")) return;
    var b = e.key==="ArrowLeft" ? root.querySelector(".ic-arrow[data-go]") : e.key==="ArrowRight" ? root.querySelectorAll(".ic-arrow")[1] : null;
    if(b && !b.disabled) b.click();
  });
})();
