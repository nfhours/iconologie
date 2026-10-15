/* Иконология Бодуэна: указатель и карточки статей.
   Данные: data/entries.json, гравюры: img/ рядом с этим файлом. */
(function(){
  var me = document.currentScript;
  var BASE = (me && me.src) ? me.src.replace(/[^\/]*$/, "") : "./";
  var root = document.getElementById("iconologie");
  if(!root){ root = document.createElement("div"); root.id = "iconologie"; (me && me.parentNode ? me.parentNode : document.body).appendChild(root); }
  root.className = "ic";
  if(root.dataset.top) root.style.setProperty("--top", root.dataset.top);

  // шрифты и стили
  function addLink(href){ var l=document.createElement("link"); l.rel="stylesheet"; l.href=href; document.head.appendChild(l); }
  addLink("https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Literata:opsz,wght@7..72,400;7..72,500;7..72,600&display=swap");
  if(!document.querySelector('link[data-ic]')){
    var l=document.createElement("link"); l.rel="stylesheet"; l.href=BASE+"app.css"; l.setAttribute("data-ic","1"); document.head.appendChild(l);
  }

  var items=[], byId={}, state={q:"",filter:"all",sort:"book",scroll:0};
  try{ var s=sessionStorage.getItem("ic-state"); if(s){ var o=JSON.parse(s); state.q=o.q||""; state.filter=o.filter||"all"; state.sort=o.sort||"book"; } }catch(e){}
  function keep(){ try{ sessionStorage.setItem("ic-state", JSON.stringify({q:state.q,filter:state.filter,sort:state.sort})); }catch(e){} }

  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function norm(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/ſ/g,"s").replace(/ё/g,"е").replace(/j/g,"i").replace(/v/g,"u").replace(/y/g,"i").replace(/['’]/g," "); }
  function ready(it){ return (it.img&&it.img.length) || (it.text_ru&&it.text_ru.length); }

  root.innerHTML = '<div class="ic-wrap"><p class="ic-sub">Загрузка…</p></div>';

  fetch(BASE+"data/entries.json",{cache:"no-cache"}).then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(d){
    items = d.items || [];
    items.forEach(function(it,i){
      it.ord=i; byId[it.id]=it; it.pn=parseInt(it.page,10)||0;
      it.key = norm([it.fr,it.ru,it.group,it.group_fr,it.num,
        (it.attrs||[]).map(function(a){return a.what+" "+a.meaning;}).join(" "),
        (it.text_ru||[]).join(" ")].join(" "));
    });
    window.addEventListener("hashchange", route);
    route();
  }).catch(function(){
    root.innerHTML = '<div class="ic-wrap"><p class="ic-empty">Не удалось загрузить данные. Обновите страницу.</p></div>';
  });

  function route(){
    var m = location.hash.match(/^#\/(p[12]-\d+)$/);
    if(m && byId[m[1]]) renderCard(byId[m[1]]); else renderIndex();
  }
  function go(id){ state.scroll = window.scrollY; location.hash = "#/"+id; }
  function toTop(){ var r=root.getBoundingClientRect(); if(r.top<0) window.scrollTo(0, window.scrollY+r.top); }

  /* ---------- указатель ---------- */
  function filtered(){
    var nq = norm(state.q.trim());
    var res = items.filter(function(it){
      if(state.filter==="1" && it.part!==1) return false;
      if(state.filter==="2" && it.part!==2) return false;
      if(state.filter==="ready" && !ready(it)) return false;
      return !nq || nq.split(/\s+/).every(function(w){ return it.key.indexOf(w)>-1; });
    });
    if(state.sort==="ru") res.sort(function(a,b){ return a.ru.localeCompare(b.ru,"ru"); });
    else if(state.sort==="page") res.sort(function(a,b){ return a.part-b.part || a.pn-b.pn || a.ord-b.ord; });
    return res;
  }

  function renderIndex(){
    var done = items.filter(ready).length, pct = items.length ? Math.round(done*100/items.length) : 0;
    root.innerHTML =
      '<div class="ic-wrap">'+
        '<h1 class="ic-title">Иконология</h1>'+
        '<p class="ic-sub">Чезаре Рипа во французском переводе Жана Бодуэна, Париж, 1644. Указатель обеих частей с переводом. Нажмите на сюжет, чтобы открыть статью.</p>'+
        '<p class="ic-progress">Переведено статей: '+done+' из '+items.length+'<span class="ic-bar"><i style="width:'+pct+'%"></i></span></p>'+
        '<div class="ic-controls">'+
          '<input class="ic-search" type="search" placeholder="Найти: сюжет, предмет, слово по-русски или по-французски" autocomplete="off" aria-label="Поиск">'+
          '<div class="ic-row"><div class="ic-seg" role="group" aria-label="Что показать">'+
            chip("all","Все")+chip("1","Часть 1")+chip("2","Часть 2")+chip("ready","С гравюрой и переводом")+
          '</div><select class="ic-sort" aria-label="Порядок">'+
            opt("book","Как в книге")+opt("ru","По алфавиту")+opt("page","По странице")+
          '</select></div>'+
          '<p class="ic-count"></p>'+
        '</div>'+
        '<div class="ic-list"></div>'+
      '</div>';
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
  }
  function chip(v,t){ return '<button type="button" class="ic-chip" data-f="'+v+'" aria-pressed="'+(state.filter===v)+'">'+t+'</button>'; }
  function opt(v,t){ return '<option value="'+v+'"'+(state.sort===v?" selected":"")+'>'+t+'</option>'; }

  function fill(){
    var list=root.querySelector(".ic-list"), count=root.querySelector(".ic-count");
    var res=filtered(), nq=state.q.trim();
    count.textContent = res.length ? ("Найдено: "+res.length) : "";
    if(!res.length){
      list.innerHTML = '<p class="ic-empty">'+(state.filter==="ready" && !nq
        ? "Пока нет готовых статей. Они появятся здесь по мере перевода."
        : "Ничего не найдено. Попробуйте другое слово или старое написание, например «hyver» вместо «hiver».")+'</p>';
      return;
    }
    var grouped = state.sort==="book" && !nq, showPart = state.sort==="ru" || (!grouped && state.filter!=="1" && state.filter!=="2");
    var html="", part=0, grp=null, open=false;
    res.forEach(function(it){
      if(state.sort!=="ru" && it.part!==part){
        if(open){ html+="</ul></section>"; open=false; }
        html+='<h2 class="ic-part">'+(it.part===1?"Часть первая":"Часть вторая")+'</h2>'; part=it.part; grp=null;
      }
      if(grouped){
        var gk=it.part+"|"+it.group+"|"+it.group_fr;
        if(gk!==grp){
          if(open) html+="</ul></section>";
          html+='<section class="ic-group"><h2><span>'+esc(it.group)+'</span>'+(it.group_fr?'<span class="ic-gfr">'+esc(it.group_fr)+'</span>':"")+
            (it.group_page?'<span class="ic-gpg">с. '+esc(it.group_page)+'</span>':"")+'</h2><ul>';
          grp=gk; open=true;
        }
      } else if(!open){ html+='<section class="ic-group"><ul>'; open=true; }
      html+='<li class="ic-row-item" tabindex="0" role="link" data-id="'+it.id+'">'+
        '<span class="ic-pg">'+esc(it.page)+'<small>'+(showPart?"ч. "+it.part:"с.")+'</small></span>'+
        '<span><span class="ic-fr">'+(it.num?'<span class="ic-num">'+it.num+'</span>':"")+esc(it.fr)+'</span>'+
        '<span class="ic-ru">'+esc(it.ru)+(it.flag?" ("+esc(it.flag)+")":"")+'</span></span>'+
        '<span class="ic-dot'+(ready(it)?" on":"")+'" title="'+(ready(it)?"Есть гравюра и перевод":"Ещё не добавлено")+'"></span>'+
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
    var pos="Часть "+it.part+", с. "+it.page;
    var imgs=(it.img||[]).map(function(src,k){
      return '<figure class="ic-fig" data-src="'+esc(BASE+"img/"+src)+'"><img loading="lazy" src="'+esc(BASE+"img/"+src)+'" alt="Гравюра: '+esc(it.ru)+'">'+
        (it.img.length>1?'<figcaption>'+(k+1)+' из '+it.img.length+'</figcaption>':"")+'</figure>';
    }).join("");
    var attrs=(it.attrs||[]).map(function(a){ return '<li><b>'+esc(a.what)+'</b><span>'+esc(a.meaning)+'</span></li>'; }).join("");
    var ru=(it.text_ru||[]).map(function(p){ return "<p>"+esc(p)+"</p>"; }).join("");
    var fr=(it.text_fr||[]).map(function(p){ return "<p>"+esc(p)+"</p>"; }).join("");

    root.innerHTML =
      '<div class="ic-wrap">'+
        '<div class="ic-nav">'+
          '<button type="button" class="ic-back">← Указатель</button>'+
          '<span class="ic-nav-pos">'+pos+'</span>'+
          '<button type="button" class="ic-arrow" data-go="'+(prev?prev.id:"")+'"'+(prev?"":" disabled")+' aria-label="Предыдущая статья">‹</button>'+
          '<button type="button" class="ic-arrow" data-go="'+(next?next.id:"")+'"'+(next?"":" disabled")+' aria-label="Следующая статья">›</button>'+
        '</div>'+
        '<header class="ic-head">'+
          '<p class="ic-kicker">'+(it.num?it.num+". ":"")+esc(it.group_fr?it.group:(it.part===1?"Часть первая":""))+'</p>'+
          '<h1 class="ic-h-fr">'+esc(it.fr)+'</h1>'+
          '<p class="ic-h-ru">'+esc(it.ru)+'</p>'+
        '</header>'+
        (imgs?'<div class="ic-figs">'+imgs+'</div>':"")+
        (attrs?'<section class="ic-sec"><h3>Что изображено</h3><ul class="ic-attrs">'+attrs+'</ul></section>':"")+
        (ru?'<section class="ic-sec"><h3>Перевод</h3><div class="ic-text">'+ru+'</div></section>':"")+
        (fr?'<details class="ic-details"><summary>Французский текст</summary><div class="ic-text ic-fr-text">'+fr+'</div></details>':"")+
        (!imgs && !ru ? '<div class="ic-missing"><b>Эта статья ещё не добавлена.</b><br>В книге: часть '+it.part+', страница '+esc(it.page)+'.</div>':"")+
        '<div class="ic-pager">'+
          '<button type="button" data-go="'+(prev?prev.id:"")+'"'+(prev?"":" disabled")+'><small>Назад</small><span>'+(prev?esc(prev.fr):"")+'</span></button>'+
          '<button type="button" data-go="'+(next?next.id:"")+'"'+(next?"":" disabled")+'><small>Дальше</small><span>'+(next?esc(next.fr):"")+'</span></button>'+
        '</div>'+
      '</div>';

    root.querySelector(".ic-back").addEventListener("click",function(){
      location.hash="";
    });
    root.querySelectorAll("[data-go]").forEach(function(b){ b.addEventListener("click",function(){
      var id=b.getAttribute("data-go"); if(id) location.hash="#/"+id;
    });});
    root.querySelectorAll(".ic-fig").forEach(function(f){ f.addEventListener("click",function(){ lightbox(f.getAttribute("data-src")); }); });
    toTop();
  }

  function lightbox(src){
    var d=document.createElement("div"); d.className="ic ic-lb"; d.setAttribute("role","dialog"); d.setAttribute("aria-label","Гравюра");
    d.innerHTML='<img src="'+esc(src)+'" alt=""><button type="button" aria-label="Закрыть">×</button>';
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
