var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{},t={},o={},n=e.parcelRequire94c2;null==n&&((n=function(e){if(e in t)return t[e].exports;if(e in o){var n=o[e];delete o[e];var r={id:e,exports:{}};return t[e]=r,n.call(r.exports,r,r.exports),r.exports}var a=new Error("Cannot find module '"+e+"'");throw a.code="MODULE_NOT_FOUND",a}).register=function(e,t){o[e]=t},e.parcelRequire94c2=n);var r=n("cNaMA");n("eS9BV");var a,i,l,s,c={};a=c,i="Welcome",l=()=>q,s=e=>q=e,Object.defineProperty(a,i,{get:l,set:s,enumerable:!0,configurable:!0}),n("9Ta4i");r=n("cNaMA"),r=n("cNaMA");var u=n("4zMEb");const d=async()=>{let e=await fetch("https://api.github.com/repos/fonsp/Pluto.jl/releases",{method:"GET",mode:"cors",cache:"no-cache",headers:{"Content-Type":"application/json"},redirect:"follow",referrerPolicy:"no-referrer"});return(await e.json()).reverse()};n("9Ta4i");r=n("cNaMA");var p=n("2ZZ1r");r=n("cNaMA");const h=e=>{const t=`${e}\n`.replace("\r\n","\n"),o=t.indexOf("### A Pluto.jl notebook ###"),n=t.match(/# ... ........-....-....-....-............/g),r=(null==n?void 0:n.length)??0;let a=t.indexOf("# ╔═╡ Cell order:")+17+1;for(let e=1;e<=r;e++)a=t.indexOf("\n",a+1)+1;return t.slice(o,a)},f=({on_start_navigation:e})=>{const t=async t=>{var o;let n;if(console.log(t),(null===(o=((null==t?void 0:t.path)??(null==t?void 0:t.composedPath())).filter((e=>{var t;return null==e||null===(t=e.classList)||void 0===t?void 0:t.contains(".cm-editor")})))||void 0===o?void 0:o.length)>0)return;switch(t.type){case"paste":n=h(t.clipboardData.getData("text/plain"));break;case"dragstart":return void(t.dataTransfer.dropEffect="move");case"dragover":return void t.preventDefault();case"drop":t.preventDefault(),n=t.dataTransfer.types.includes("Files")?await(a=t.dataTransfer.files[0],new Promise(((e,t)=>{const{name:o,type:n}=a,r=new FileReader;r.onerror=()=>t("Failed to read file!"),r.onloadstart=()=>{},r.onprogress=({loaded:e,total:t})=>{},r.onload=()=>{},r.onloadend=()=>e({file:r.result,name:o,type:n}),r.readAsText(a)}))).then((({file:e})=>e)):h(await(r=t.dataTransfer.items[0],new Promise(((e,t)=>{try{r.getAsString((t=>{console.log(t),e(t)}))}catch(e){t(e)}}))))}var r,a;if(!n)return;e("notebook from clipboard",!1),document.body.classList.add("loading");const i=await fetch("./notebookupload",{method:"POST",body:n});if(i.ok)window.location.href=w(await i.text());else{let e=await i.blob();window.location.href=URL.createObjectURL(e)}};return r.useEffect((()=>(document.addEventListener("paste",t),document.addEventListener("drop",t),document.addEventListener("dragstart",t),document.addEventListener("dragover",t),()=>{document.removeEventListener("paste",t),document.removeEventListener("drop",t),document.removeEventListener("dragstart",t),document.removeEventListener("dragover",t)}))),r.html`<span />`};var m=n("1xJnC");const _=({client:e,connected:t,CustomPicker:o,show_samples:n,on_start_navigation:a})=>{const i=o??{text:"Open a notebook",placeholder:"Enter path or URL..."};return r.html`<${f} on_start_navigation=${a} />
        <h2>${i.text}</h2>
        <div id="new" class=${window.plutoDesktop?"desktop_opener":""}>
            <${p.FilePicker}
                key=${i.placeholder}
                client=${e}
                value=""
                on_submit=${async e=>{const t=await m.guess_notebook_location(e);a(t.path_or_url),window.location.href=("path"===t.type?v:g)(t.path_or_url)}}
                on_desktop_submit=${async e=>{var t;null===(t=window.plutoDesktop)||void 0===t||t.fileSystem.openNotebook("path")}}
                button_label=${window.plutoDesktop?"Open File":"Open"}
                placeholder=${i.placeholder}
            />
            ${window.plutoDesktop&&r.html`<${p.FilePicker}
                key=${i.placeholder}
                client=${e}
                value=""
                on_desktop_submit=${async e=>{var t;null===(t=window.plutoDesktop)||void 0===t||t.fileSystem.openNotebook("url",e)}}
                button_label="Open from URL"
                placeholder=${i.placeholder}
            />`}
        </div>`},v=(e,t=!1)=>"open?"+new URLSearchParams({path:e}).toString(),g=e=>"open?"+new URLSearchParams({url:e}).toString(),w=e=>"edit?id="+e;var b=n("9Ta4i"),y=(r=n("cNaMA"),r=n("cNaMA"),n("aN0pg")),k=n("dYd4C");const $=e=>({transitioning:!1,entry:void 0,path:e}),P=e=>({transitioning:!1,entry:e,path:e.path}),j=(e,t)=>e.split(/\/|\\/).slice(-t).join("/"),S=(e,t)=>{let o=1;for(const n of t)if(n!==e)for(;j(e,o)===j(n,o);)o++;return j(e,o)},E=({client:e,connected:t,remote_notebooks:o,CustomRecent:n,on_start_navigation:a})=>{const[i,l]=r.useState(null),s=r.useRef(i);s.current=i;const c=(e,t)=>{l((o=>(null==o?void 0:o.map((o=>o.path==e?{...o,...t}:o)))??null))};r.useEffect((()=>{null!=e&&t&&e.send("get_all_notebooks",{},{}).then((({message:e})=>{const t=e.notebooks.map((e=>P(e))),o=L(),n=[...b.default.sortBy(t,[e=>b.default.findIndex([...o,...t],(t=>t.path===e.path))]),...b.default.differenceBy(o,t,(e=>e.path))];l(n),document.body.classList.remove("loading")}))}),[null!=e&&t]),r.useEffect((()=>{const e=o;if(null!=s.current){const t=[],o=s.current.map((o=>{let n=null;if(n=null!=o.entry?e.find((e=>{var t;return e.notebook_id===(null===(t=o.entry)||void 0===t?void 0:t.notebook_id)})):e.find((e=>e.path===o.path)),null==n)return $(o.path);{const e=P(n);return t.push(n),e}})),n=e.filter((e=>!t.includes(e))).map(P);l([...n,...o])}}),[o]);r.useEffect((()=>{document.body.classList.toggle("nosessions",!(null==i||i.length>0))}),[i]);const u=null==i?void 0:i.map((e=>e.path));let d=null==i?r.html`<li class="not_yet_ready"><em>Loading...</em></li>`:i.map((t=>{var o,n;const i=null!=t.entry;return r.html`<li
                      key=${t.path}
                      class=${y.cl({running:i,recent:!i,transitioning:t.transitioning})}
                  >
                      <button
                          onclick=${()=>(t=>{if(t.transitioning)return;if(null!=t.entry){var o;if(null==e)return;confirm((null===(o=t.entry)||void 0===o?void 0:o.process_status)===k.ProcessStatus.waiting_for_permission?"Close notebook session?":"Shut down notebook process?")&&(c(t.path,{running:!1,transitioning:!0}),e.send("shutdown_notebook",{keep_in_session:!1},{notebook_id:null===(o=t.entry)||void 0===o?void 0:o.notebook_id},!1))}else c(t.path,{transitioning:!0}),fetch(v(t.path)+"&execution_allowed=true",{method:"GET"}).then((e=>{if(!e.redirected)throw new Error("file not found maybe? try opening the notebook directly")})).catch((e=>{console.error("Failed to start notebook in background"),console.error(e),c(t.path,{transitioning:!1,notebook_id:null})}))})(t)}
                          title=${i?(null===(o=t.entry)||void 0===o?void 0:o.process_status)===k.ProcessStatus.waiting_for_permission?"Stop session":"Shut down notebook":"Start notebook in background"}
                      >
                          <span class="ionicon"></span>
                      </button>
                      <a
                          href=${i?w(null===(n=t.entry)||void 0===n?void 0:n.notebook_id):v(t.path)}
                          title=${t.path}
                          onClick=${e=>{i||(a(S(t.path,u)),c(t.path,{transitioning:!0}))}}
                          >${S(t.path,u)}</a
                      >
                  </li>`}));return null==n?r.html`
            <h2>My work</h2>
            <ul id="recent" class="show_scrollbar">
                <li class="new">
                    <a
                        href="new"
                        onClick=${e=>{a("new notebook")}}
                        ><button><span class="ionicon"></span></button>Create a <strong>new notebook</strong></a
                    >
                </li>
                ${d}
            </ul>
        `:r.html`<${n} cl=${y.cl} combined=${i} client=${e} recents=${d} />`},L=()=>{const e=localStorage.getItem("recent notebooks"),t=null!=e?JSON.parse(e):[];return(t instanceof Array?t:[]).map($)};b=n("9Ta4i"),r=n("cNaMA");var x=n("h2NGW"),T=n("1Mxs0");const C=[{title:"Featured Notebooks",description:"These notebooks from the Julia community show off what you can do with Pluto. Give it a try, you might learn something new!",collections:[{title:"Loading...",tags:[]}],notebooks:{}}],N=r.html`
    <div class="featured-source">
        <h1>${C[0].title}</h1>
        <p>Here are a couple of notebooks to get started with Pluto.jl:</p>
        <ul>
            <li>1. <a href="sample/Getting%20started.jl">Getting started</a></li>
            <li>2. <a href="sample/Markdown.jl">Markdown</a></li>
            <li>3. <a href="sample/Basic%20mathematics.jl">Basic mathematics</a></li>
            <li>4. <a href="sample/Interactivity.jl">Interactivity</a></li>
            <li>5. <a href="sample/PlutoUI.jl.jl">PlutoUI.jl</a></li>
            <li>6. <a href="sample/Plots.jl.jl">Plots.jl</a></li>
            <li>7. <a href="sample/Tower%20of%20Hanoi.jl">Tower of Hanoi</a></li>
            <li>8. <a href="sample/JavaScript.jl">JavaScript</a></li>
        </ul>
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
        <p>Tip: <em>Visit this page again when you are connected to the internet to read our online collection of featured notebooks.</em></p>
    </div>
`,A=[{title:"Notebooks",tags:"everything"}],O=e=>(null==e?void 0:e.id)??e.url,R=({sources:e,direct_html_links:t})=>{const[o,n]=r.useState({});r.useEffect((()=>{if(null!=e){i(!1),n({});const t=Array.from(new Set(e.map(O))).map((t=>{const o=e.filter((e=>O(e)===t));return D(o.map((async e=>{const{url:o,integrity:n,valid_until:r}=e;if(null!=r&&new Date(r)<new Date)throw new Error(`Source ${o} is expired with valid_until ${r}`);const a=await(await fetch(new Request(o,{integrity:n??void 0}))).json();if("1"!==a.format_version)throw new Error(`Invalid format version: ${a.format_version}`);return[a,t,o]}))).then((([e,t,o])=>{n((n=>({...n,[t]:{...e,source_url:o}})))}))}));Promise.any(t).catch((e=>{console.error("All featured sources failed to load: ",e),((null==e?void 0:e.errors)??[]).forEach((e=>console.error(e))),i(!0)}))}}),[e]),r.useEffect((()=>{Object.entries(o).length>0&&console.log("Sources:",o)}),[o]);const[a,i]=r.useState(!1);r.useEffect((()=>{setTimeout((()=>{i(!0)}),8e3)}),[]);const l=0===Object.entries(o).length,s=Array.from(new Set((null==e?void 0:e.map(O))??[])).map((e=>o[e])).filter((e=>null!=e));return l&&a?N:r.html`
              ${(l?C:s).map((e=>{let o=(null==e?void 0:e.collections)??A;return r.html`
                      <div class="featured-source">
                          <h1>${e.title}</h1>
                          <p>${e.description}</p>
                          ${o.map((o=>r.html`
                                  <div class="collection">
                                      <h2>${o.title}</h2>
                                      <p>${o.description}</p>
                                      <div class="card-list">
                                          ${M(Object.values(e.notebooks),o.tags??[]).map((o=>r.html`<${T.FeaturedCard} entry=${o} source_manifest=${e} direct_html_links=${t} />`))}
                                      </div>
                                  </div>
                              `))}
                      </div>
                  `}))}
          `};x.default(R,"pluto-featured",["sources","direct_html_links"]);const M=(e,t)=>{const o="everything"===t?e:e.filter((e=>t.some((t=>{var o;return((null===(o=e.frontmatter)||void 0===o?void 0:o.tags)??[]).includes(t)}))));return b.default.sortBy(o,[e=>{var t;return(e=>isNaN(e)?e:Number(e))(null==e||null===(t=e.frontmatter)||void 0===t?void 0:t.order)},"id"])},D=(e,t=[])=>e.length<=1?Promise.any([...e,...t]):e[0].catch((()=>D(e.slice(1),[...t,e[0]])));var U,F=n("cpCG6"),I={sources:[{url:"https://featured.plutojl.org/pluto_export.json",valid_until:"2024-10",id:"featured pluto"},{id:"featured pluto",url:"https://cdn.jsdelivr.net/gh/JuliaPluto/featured@v4/pluto_export.json",integrity:"sha256-YT5Msj4Iy4cJIuHQi09h3+AwxzreK46WS6EySbPPmJM="}]};const J=(null===(U=document.head.querySelector("link[rel='pluto-logo-big']"))||void 0===U?void 0:U.getAttribute("href"))??"",q=({launch_params:e})=>{const[t,o]=r.useState([]),[n,a]=r.useState(!1),[i,l]=r.useState({show_samples:!0,CustomPicker:null,CustomRecent:null}),s=r.useRef({});r.useEffect((()=>{const t=a;u.create_pluto_connection({on_unrequested_update:({message:e,type:t})=>{"notebook_list"===t&&o(e.notebooks)},on_connection_status:t,on_reconnect:()=>!0,ws_address:e.pluto_server_url?u.ws_address_from_base(e.pluto_server_url):void 0}).then((async e=>{Object.assign(s.current,e),a(!0);try{const t=await F.get_environment(e),{custom_recent:o,custom_filepicker:n,show_samples:a=!0}=t({client:e,editor:void 0,imports:{preact:r}});l((e=>({...e,CustomRecent:o,CustomPicker:n,show_samples:a})))}catch(e){}(e=>{d().then((t=>{const o=e.version_info.pluto,n=t[t.length-1].tag_name;console.log(`Pluto version ${o}`);const r=t.findIndex((e=>e.tag_name===o));-1!==r&&t.slice(r+1).filter((e=>e.body.toLowerCase().includes("recommended update"))).length>0&&(console.log(`Newer version ${n} is available`),e.version_info.dismiss_update_notification||alert("A new version of Pluto.jl is available! 🎉\n\n    You have "+o+", the latest is "+n+'.\n\nYou can update Pluto.jl using the julia package manager:\n    import Pkg; Pkg.update("Pluto")\nAfterwards, exit Pluto.jl and restart julia.'))})).catch((()=>{}))})(e),e.send("current_time"),e.send("completepath",{query:""},{})}))}),[]);const{show_samples:c,CustomRecent:p,CustomPicker:h}=i,[f,m]=r.useState(null),v=(e,t=!0)=>{if(t){const t=t=>{m(e)};window.addEventListener("beforeunload",t),setTimeout((()=>window.removeEventListener("beforeunload",t)),1e3)}else m(e)},g=r.useMemo((()=>e.featured_sources??(e.featured_source_url?[{url:e.featured_source_url,integrity:e.featured_source_integrity}]:I.sources)),[e]);return null!=f?r.html`
            <div class="navigating-away-banner">
                <h2>Loading ${f}...</h2>
            </div>
        `:r.html`
        <section id="title">
            <h1>welcome to <img src=${J} /></h1>
        </section>
        <section id="mywork">
            <div>
                <${E}
                    client=${s.current}
                    connected=${n}
                    remote_notebooks=${t}
                    CustomRecent=${p}
                    on_start_navigation=${v}
                />
            </div>
        </section>
        <section id="open">
            <div>
                <${_}
                    client=${s.current}
                    connected=${n}
                    CustomPicker=${h}
                    show_samples=${c}
                    on_start_navigation=${v}
                />
            </div>
        </section>
        <section id="featured">
            <div>
                <${R} sources=${g} direct_html_links=${e.featured_direct_html_links} />
            </div>
        </section>
    `},G=new URLSearchParams(window.location.search),B={featured_direct_html_links:!!(G.get("featured_direct_html_links")??window.pluto_featured_direct_html_links),featured_sources:window.pluto_featured_sources,featured_source_url:G.get("featured_source_url")??window.pluto_featured_source_url,featured_source_integrity:G.get("featured_source_integrity")??window.pluto_featured_source_integrity,pluto_server_url:G.get("pluto_server_url")??window.pluto_server_url};console.log("Launch parameters: ",B),r.render(r.html`<${c.Welcome} launch_params=${B} />`,document.querySelector("#app"));