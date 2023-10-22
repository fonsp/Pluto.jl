var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{},t={},o={},n=e.parcelRequire94c2;null==n&&((n=function(e){if(e in t)return t[e].exports;if(e in o){var n=o[e];delete o[e];var r={id:e,exports:{}};return t[e]=r,n.call(r.exports,r,r.exports),r.exports}var l=new Error("Cannot find module '"+e+"'");throw l.code="MODULE_NOT_FOUND",l}).register=function(e,t){o[e]=t},e.parcelRequire94c2=n);var r=n("cNaMA");n("eS9BV");var l,a,i,s,u={};l=u,a="Welcome",i=()=>W,s=e=>W=e,Object.defineProperty(l,a,{get:i,set:s,enumerable:!0,configurable:!0}),n("9Ta4i");r=n("cNaMA"),r=n("cNaMA");var c=n("4zMEb");const d=async()=>{let e=await fetch("https://api.github.com/repos/fonsp/Pluto.jl/releases",{method:"GET",mode:"cors",cache:"no-cache",headers:{"Content-Type":"application/json"},redirect:"follow",referrerPolicy:"no-referrer"});return(await e.json()).reverse()};n("9Ta4i");r=n("cNaMA");var p=n("2ZZ1r");r=n("cNaMA");const m=e=>{const t=`${e}\n`.replace("\r\n","\n"),o=t.indexOf("### A Pluto.jl notebook ###"),n=t.match(/# ... ........-....-....-....-............/g),r=(null==n?void 0:n.length)??0;let l=t.indexOf("# ╔═╡ Cell order:")+17+1;for(let e=1;e<=r;e++)l=t.indexOf("\n",l+1)+1;return t.slice(o,l)},h=({on_start_navigation:e})=>{const t=async t=>{var o;let n;if(console.log(t),(null===(o=((null==t?void 0:t.path)??(null==t?void 0:t.composedPath())).filter((e=>{var t;return null==e||null===(t=e.classList)||void 0===t?void 0:t.contains(".cm-editor")})))||void 0===o?void 0:o.length)>0)return;switch(t.type){case"paste":n=m(t.clipboardData.getData("text/plain"));break;case"dragstart":return void(t.dataTransfer.dropEffect="move");case"dragover":return void t.preventDefault();case"drop":t.preventDefault(),n=t.dataTransfer.types.includes("Files")?await(l=t.dataTransfer.files[0],new Promise(((e,t)=>{const{name:o,type:n}=l,r=new FileReader;r.onerror=()=>t("Failed to read file!"),r.onloadstart=()=>{},r.onprogress=({loaded:e,total:t})=>{},r.onload=()=>{},r.onloadend=()=>e({file:r.result,name:o,type:n}),r.readAsText(l)}))).then((({file:e})=>e)):m(await(r=t.dataTransfer.items[0],new Promise(((e,t)=>{try{r.getAsString((t=>{console.log(t),e(t)}))}catch(e){t(e)}}))))}var r,l;if(!n)return;e("notebook from clipboard",!1),document.body.classList.add("loading");const a=await fetch("./notebookupload",{method:"POST",body:n});if(a.ok)window.location.href=w(await a.text());else{let e=await a.blob();window.location.href=URL.createObjectURL(e)}};return r.useEffect((()=>(document.addEventListener("paste",t),document.addEventListener("drop",t),document.addEventListener("dragstart",t),document.addEventListener("dragover",t),()=>{document.removeEventListener("paste",t),document.removeEventListener("drop",t),document.removeEventListener("dragstart",t),document.removeEventListener("dragover",t)}))),r.html`<span />`};var f=n("1xJnC");const v=({client:e,connected:t,CustomPicker:o,show_samples:n,on_start_navigation:l})=>{const a=o??{text:"Open a notebook",placeholder:"Enter path or URL..."};return r.html`<${h} on_start_navigation=${l} />
        <h2>${a.text}</h2>
        <div id="new" class=${window.plutoDesktop?"desktop_opener":""}>
            <${p.FilePicker}
                key=${a.placeholder}
                client=${e}
                value=""
                on_submit=${async e=>{const t=await f.guess_notebook_location(e);l(t.path_or_url),window.location.href=("path"===t.type?_:g)(t.path_or_url)}}
                on_desktop_submit=${async e=>{var t;null===(t=window.plutoDesktop)||void 0===t||t.fileSystem.openNotebook("path")}}
                button_label=${window.plutoDesktop?"Open File":"Open"}
                placeholder=${a.placeholder}
            />
            ${window.plutoDesktop&&r.html`<${p.FilePicker}
                key=${a.placeholder}
                client=${e}
                value=""
                on_desktop_submit=${async e=>{var t;null===(t=window.plutoDesktop)||void 0===t||t.fileSystem.openNotebook("url",e)}}
                button_label="Open from URL"
                placeholder=${a.placeholder}
            />`}
        </div>`},_=(e,t=!1)=>"open?"+new URLSearchParams({path:e}).toString(),g=e=>"open?"+new URLSearchParams({url:e}).toString(),w=e=>"edit?id="+e;var b=n("9Ta4i"),y=(r=n("cNaMA"),r=n("cNaMA"),n("aN0pg")),$=n("dYd4C");const k=e=>({transitioning:!1,entry:void 0,path:e}),E=e=>({transitioning:!1,entry:e,path:e.path}),P=(e,t)=>e.split(/\/|\\/).slice(-t).join("/"),S=(e,t)=>{let o=1;for(const n of t)if(n!==e)for(;P(e,o)===P(n,o);)o++;return P(e,o)},j=({client:e,connected:t,remote_notebooks:o,CustomRecent:n,on_start_navigation:l})=>{const[a,i]=r.useState(null),s=r.useRef(a);s.current=a;const u=(e,t)=>{i((o=>(null==o?void 0:o.map((o=>o.path==e?{...o,...t}:o)))??null))};r.useEffect((()=>{null!=e&&t&&e.send("get_all_notebooks",{},{}).then((({message:e})=>{const t=e.notebooks.map((e=>E(e))),o=L(),n=[...b.default.sortBy(t,[e=>b.default.findIndex([...o,...t],(t=>t.path===e.path))]),...b.default.differenceBy(o,t,(e=>e.path))];i(n),document.body.classList.remove("loading")}))}),[null!=e&&t]),r.useEffect((()=>{const e=o;if(null!=s.current){const t=[],o=s.current.map((o=>{let n=null;if(n=null!=o.entry?e.find((e=>{var t;return e.notebook_id===(null===(t=o.entry)||void 0===t?void 0:t.notebook_id)})):e.find((e=>e.path===o.path)),null==n)return k(o.path);{const e=E(n);return t.push(n),e}})),n=e.filter((e=>!t.includes(e))).map(E);i([...n,...o])}}),[o]);r.useEffect((()=>{document.body.classList.toggle("nosessions",!(null==a||a.length>0))}),[a]);const c=null==a?void 0:a.map((e=>e.path));let d=null==a?r.html`<li><em>Loading...</em></li>`:a.map((t=>{var o,n;const a=null!=t.entry;return r.html`<li
                      key=${t.path}
                      class=${y.cl({running:a,recent:!a,transitioning:t.transitioning})}
                  >
                      <button
                          onclick=${()=>(t=>{if(t.transitioning)return;if(null!=t.entry){var o;if(null==e)return;confirm((null===(o=t.entry)||void 0===o?void 0:o.process_status)===$.ProcessStatus.waiting_for_permission?"Close notebook session?":"Shut down notebook process?")&&(u(t.path,{running:!1,transitioning:!0}),e.send("shutdown_notebook",{keep_in_session:!1},{notebook_id:null===(o=t.entry)||void 0===o?void 0:o.notebook_id},!1))}else u(t.path,{transitioning:!0}),fetch(_(t.path)+"&execution_allowed=true",{method:"GET"}).then((e=>{if(!e.redirected)throw new Error("file not found maybe? try opening the notebook directly")})).catch((e=>{console.error("Failed to start notebook in background"),console.error(e),u(t.path,{transitioning:!1,notebook_id:null})}))})(t)}
                          title=${a?(null===(o=t.entry)||void 0===o?void 0:o.process_status)===$.ProcessStatus.waiting_for_permission?"Stop session":"Shut down notebook":"Start notebook in background"}
                      >
                          <span class="ionicon"></span>
                      </button>
                      <a
                          href=${a?w(null===(n=t.entry)||void 0===n?void 0:n.notebook_id):_(t.path)}
                          title=${t.path}
                          onClick=${e=>{a||(l(S(t.path,c)),u(t.path,{transitioning:!0}))}}
                          >${S(t.path,c)}</a
                      >
                  </li>`}));return null==n?r.html`
            <h2>My work</h2>
            <ul id="recent" class="show-scrollbar">
                <li class="new">
                    <a
                        href="new"
                        onClick=${e=>{l("new notebook")}}
                        ><button><span class="ionicon"></span></button>Create a <strong>new notebook</strong></a
                    >
                </li>
                ${d}
            </ul>
        `:r.html`<${n} cl=${y.cl} combined=${a} client=${e} recents=${d} />`},L=()=>{const e=localStorage.getItem("recent notebooks"),t=null!=e?JSON.parse(e):[];return(t instanceof Array?t:[]).map(k)};b=n("9Ta4i"),r=n("cNaMA");var C=n("h2NGW"),x=n("jqrYR"),T=n("41Mhf");n("9Ta4i");r=n("cNaMA");const N=({entry:e,source_url:t,direct_html_links:o})=>{var n,l,a,i,s,u;const c=null===(n=e.frontmatter)||void 0===n?void 0:n.title,d=e=>null==t?e:null==e?null:new URL(e,new URL(t,window.location.href)).href,p=o?d(e.html_path):T.with_query_params("editor.html",{statefile:d(e.statefile_path),notebookfile:d(e.notebookfile_path),notebookfile_integrity:`sha256-${x.base64url_to_base64(e.hash)}`,disable_ui:"true",pluto_server_url:".",name:null==c?null:`sample ${c}`}),m=A(e.frontmatter);return r.html`
        <featured-card style=${`--card-color-hue: ${(e=>79*[...e].reduce(((e,t)=>e+t.charCodeAt(0)),0)%360)(e.id)}deg;`}>
            <a class="banner" href=${p}><img src=${d(null==e||null===(l=e.frontmatter)||void 0===l?void 0:l.image)??"data:image/svg+xml;charset=utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E"} /></a>
            ${null==(null==m?void 0:m.name)?null:r.html`
                      <div class="author">
                          <a href=${m.url}> <img src=${m.image??"data:image/svg+xml;charset=utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E"} /><span>${m.name}</span></a>
                      </div>
                  `}
            <h3><a href=${p} title=${null==e||null===(a=e.frontmatter)||void 0===a?void 0:a.title}>${(null==e||null===(i=e.frontmatter)||void 0===i?void 0:i.title)??e.id}</a></h3>
            <p title=${null==e||null===(s=e.frontmatter)||void 0===s?void 0:s.description}>${null==e||null===(u=e.frontmatter)||void 0===u?void 0:u.description}</p>
        </featured-card>
    `},A=e=>R(e.author)??R({name:e.author_name,url:e.author_url,image:e.author_image}),R=e=>{if(e instanceof Array)return R(e[0]);if(null==e)return null;if("string"==typeof e)return{name:e,url:null,image:null};if(e instanceof Object){let{name:t,image:o,url:n}=e;return null==o&&null!=n&&(o=n+".png?size=48"),{name:t,url:n,image:o}}return null},O=[{title:"Featured Notebooks",description:"These notebooks from the Julia community show off what you can do with Pluto. Give it a try, you might learn something new!",collections:[{title:"Loading...",tags:[]}],notebooks:{}}],D=r.html`
    <div class="featured-source">
        <h1>${O[0].title}</h1>
        <p>Here are a couple of notebooks to get started with Pluto.jl:</p>
        <ul>
            <li>1. <a href="sample/Getting%20started.jl">Getting started</a></li>
            <li>2. <a href="sample/Basic%20mathematics.jl">Basic mathematics</a></li>
            <li>3. <a href="sample/Interactivity.jl">Interactivity</a></li>
            <li>4. <a href="sample/PlutoUI.jl.jl">PlutoUI.jl</a></li>
            <li>5. <a href="sample/Plots.jl.jl">Plots.jl</a></li>
            <li>6. <a href="sample/Tower%20of%20Hanoi.jl">Tower of Hanoi</a></li>
            <li>7. <a href="sample/JavaScript.jl">JavaScript</a></li>
        </ul>
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
        <p>Tip: <em>Visit this page again when you are connected to the internet to read our online collection of featured notebooks.</em></p>
    </div>
`,M=[{title:"Notebooks",tags:"everything"}],U=e=>(null==e?void 0:e.id)??e.url,F=({sources:e,direct_html_links:t})=>{const[o,n]=r.useState({});r.useEffect((()=>{if(null!=e){a(!1),n({});const t=Array.from(new Set(e.map(U)));console.log(t),console.log("123123123213123");const o=t.map((t=>{const o=e.filter((e=>U(e)===t));return I(o.map((async e=>{const{url:o,integrity:n,valid_until:r}=e;if(null!=r&&new Date(r)<new Date)throw new Error(`Source ${o} is expired with valid_until ${r}`);const l=await(await fetch(new Request(o,{integrity:n??void 0}))).json();if("1"!==l.format_version)throw new Error(`Invalid format version: ${l.format_version}`);return[l,t,o]}))).then((([e,t,o])=>{n((n=>({...n,[t]:{...e,source_url:o}})))}))}));Promise.any(o).catch((e=>{console.error("All featured sources failed to load: ",e),((null==e?void 0:e.errors)??[]).forEach((e=>console.error(e))),a(!0)}))}}),[e]),r.useEffect((()=>{Object.entries(o).length>0&&console.log("Sources:",o)}),[o]);const[l,a]=r.useState(!1);r.useEffect((()=>{setTimeout((()=>{a(!0)}),8e3)}),[]);const i=0===Object.entries(o).length,s=Array.from(new Set((null==e?void 0:e.map(U))??[])).map((e=>o[e])).filter((e=>null!=e));return i&&l?D:r.html`
              ${(i?O:s).map((e=>{let o=(null==e?void 0:e.collections)??M;return r.html`
                      <div class="featured-source">
                          <h1>${e.title}</h1>
                          <p>${e.description}</p>
                          ${o.map((o=>r.html`
                                  <div class="collection">
                                      <h2>${o.title}</h2>
                                      <p>${o.description}</p>
                                      <div class="card-list">
                                          ${q(Object.values(e.notebooks),o.tags??[]).map((o=>r.html`<${N} entry=${o} source_url=${e.source_url} direct_html_links=${t} />`))}
                                      </div>
                                  </div>
                              `))}
                      </div>
                  `}))}
          `};C.default(F,"pluto-featured",["sources","direct_html_links"]);const q=(e,t)=>{const o="everything"===t?e:e.filter((e=>t.some((t=>{var o;return((null===(o=e.frontmatter)||void 0===o?void 0:o.tags)??[]).includes(t)}))));return b.default.sortBy(o,[e=>{var t;return(e=>isNaN(e)?e:Number(e))(null==e||null===(t=e.frontmatter)||void 0===t?void 0:t.order)},"id"])},I=(e,t=[])=>e.length<=1?Promise.any([...e,...t]):e[0].catch((()=>I(e.slice(1),[...t,e[0]])));var B,G=n("cpCG6"),J={sources:[{url:"https://cdn.jsdelivr.net/gh/JuliaPluto/featured@v3/pluto_export.json",integrity:"sha256-y2E/niS8Em5a4wfSupsmDi0JaTrKSI0WF9DBkfEiQYQ="}]};const Y=(null===(B=document.head.querySelector("link[rel='pluto-logo-big']"))||void 0===B?void 0:B.getAttribute("href"))??"",W=({launch_params:e})=>{const[t,o]=r.useState([]),[n,l]=r.useState(!1),[a,i]=r.useState({show_samples:!0,CustomPicker:null,CustomRecent:null}),s=r.useRef({});r.useEffect((()=>{const t=l;c.create_pluto_connection({on_unrequested_update:({message:e,type:t})=>{"notebook_list"===t&&o(e.notebooks)},on_connection_status:t,on_reconnect:()=>!0,ws_address:e.pluto_server_url?c.ws_address_from_base(e.pluto_server_url):void 0}).then((async e=>{Object.assign(s.current,e),l(!0);try{const t=await G.get_environment(e),{custom_recent:o,custom_filepicker:n,show_samples:l=!0}=t({client:e,editor:void 0,imports:{preact:r}});i((e=>({...e,CustomRecent:o,CustomPicker:n,show_samples:l})))}catch(e){}(e=>{d().then((t=>{const o=e.version_info.pluto,n=t[t.length-1].tag_name;console.log(`Pluto version ${o}`);const r=t.findIndex((e=>e.tag_name===o));-1!==r&&t.slice(r+1).filter((e=>e.body.toLowerCase().includes("recommended update"))).length>0&&(console.log(`Newer version ${n} is available`),e.version_info.dismiss_update_notification||alert("A new version of Pluto.jl is available! 🎉\n\n    You have "+o+", the latest is "+n+'.\n\nYou can update Pluto.jl using the julia package manager:\n    import Pkg; Pkg.update("Pluto")\nAfterwards, exit Pluto.jl and restart julia.'))})).catch((()=>{}))})(e),e.send("current_time"),e.send("completepath",{query:""},{})}))}),[]);const{show_samples:u,CustomRecent:p,CustomPicker:m}=a,[h,f]=r.useState(null),_=(e,t=!0)=>{if(t){const t=t=>{f(e)};window.addEventListener("beforeunload",t),setTimeout((()=>window.removeEventListener("beforeunload",t)),1e3)}else f(e)},g=r.useMemo((()=>e.featured_sources??(e.featured_source_url?[{url:e.featured_source_url,integrity:e.featured_source_integrity}]:J.sources)),[e]);return null!=h?r.html`
            <div class="navigating-away-banner">
                <h2>Loading ${h}...</h2>
            </div>
        `:r.html`
        <section id="title">
            <h1>welcome to <img src=${Y} /></h1>
        </section>
        <section id="mywork">
            <div>
                <${j}
                    client=${s.current}
                    connected=${n}
                    remote_notebooks=${t}
                    CustomRecent=${p}
                    on_start_navigation=${_}
                />
            </div>
        </section>
        <section id="open">
            <div>
                <${v}
                    client=${s.current}
                    connected=${n}
                    CustomPicker=${m}
                    show_samples=${u}
                    on_start_navigation=${_}
                />
            </div>
        </section>
        <section id="featured">
            <div>
                <${F} sources=${g} direct_html_links=${e.featured_direct_html_links} />
            </div>
        </section>
    `},H=new URLSearchParams(window.location.search),z={featured_direct_html_links:!!(H.get("featured_direct_html_links")??window.pluto_featured_direct_html_links),featured_sources:window.pluto_featured_sources,featured_source_url:H.get("featured_source_url")??window.pluto_featured_source_url,featured_source_integrity:H.get("featured_source_integrity")??window.pluto_featured_source_integrity,pluto_server_url:H.get("pluto_server_url")??window.pluto_server_url};console.log("Launch parameters: ",z),r.render(r.html`<${u.Welcome} launch_params=${z} />`,document.querySelector("#app"));