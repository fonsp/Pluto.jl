var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{},t={},o={},n=e.parcelRequire94c2;null==n&&((n=function(e){if(e in t)return t[e].exports;if(e in o){var n=o[e];delete o[e];var a={id:e,exports:{}};return t[e]=a,n.call(a.exports,a,a.exports),a.exports}var r=new Error("Cannot find module '"+e+"'");throw r.code="MODULE_NOT_FOUND",r}).register=function(e,t){o[e]=t},e.parcelRequire94c2=n);var a=n("cNaMA");n("eS9BV");var r,l,i,s,c={};r=c,l="Welcome",i=()=>F,s=e=>F=e,Object.defineProperty(r,l,{get:i,set:s,enumerable:!0,configurable:!0}),n("9Ta4i");a=n("cNaMA"),a=n("cNaMA");var u=n("4zMEb");const d=async()=>{let e=await fetch("https://api.github.com/repos/fonsp/Pluto.jl/releases",{method:"GET",mode:"cors",cache:"no-cache",headers:{"Content-Type":"application/json"},redirect:"follow",referrerPolicy:"no-referrer"});return(await e.json()).reverse()};n("9Ta4i");a=n("cNaMA");var p=n("2ZZ1r");a=n("cNaMA");const h=e=>{const t=`${e}\n`.replace("\r\n","\n"),o=t.indexOf("### A Pluto.jl notebook ###"),n=t.match(/# ... ........-....-....-....-............/g),a=(null==n?void 0:n.length)??0;let r=t.indexOf("# ╔═╡ Cell order:")+17+1;for(let e=1;e<=a;e++)r=t.indexOf("\n",r+1)+1;return t.slice(o,r)},m=({on_start_navigation:e})=>{const t=async t=>{var o;let n;if(console.log(t),(null===(o=((null==t?void 0:t.path)??(null==t?void 0:t.composedPath())).filter((e=>{var t;return null==e||null===(t=e.classList)||void 0===t?void 0:t.contains(".cm-editor")})))||void 0===o?void 0:o.length)>0)return;switch(t.type){case"paste":n=h(t.clipboardData.getData("text/plain"));break;case"dragstart":return void(t.dataTransfer.dropEffect="move");case"dragover":return void t.preventDefault();case"drop":t.preventDefault(),n=t.dataTransfer.types.includes("Files")?await(r=t.dataTransfer.files[0],new Promise(((e,t)=>{const{name:o,type:n}=r,a=new FileReader;a.onerror=()=>t("Failed to read file!"),a.onloadstart=()=>{},a.onprogress=({loaded:e,total:t})=>{},a.onload=()=>{},a.onloadend=()=>e({file:a.result,name:o,type:n}),a.readAsText(r)}))).then((({file:e})=>e)):h(await(a=t.dataTransfer.items[0],new Promise(((e,t)=>{try{a.getAsString((t=>{console.log(t),e(t)}))}catch(e){t(e)}}))))}var a,r;if(!n)return;e("notebook from clipboard",!1),document.body.classList.add("loading");const l=await fetch("./notebookupload",{method:"POST",body:n});if(l.ok)window.location.href=_(await l.text());else{let e=await l.blob();window.location.href=URL.createObjectURL(e)}};return a.useEffect((()=>(document.addEventListener("paste",t),document.addEventListener("drop",t),document.addEventListener("dragstart",t),document.addEventListener("dragover",t),()=>{document.removeEventListener("paste",t),document.removeEventListener("drop",t),document.removeEventListener("dragstart",t),document.removeEventListener("dragover",t)}))),a.html`<span />`};var f=n("1xJnC");const g=({client:e,connected:t,CustomPicker:o,show_samples:n,on_start_navigation:r})=>{const l=o??{text:"Open a notebook",placeholder:"Enter path or URL..."};return a.html`<${m} on_start_navigation=${r} />
        <h2>${l.text}</h2>
        <div id="new" class=${window.plutoDesktop?"desktop_opener":""}>
            <${p.FilePicker}
                key=${l.placeholder}
                client=${e}
                value=""
                on_submit=${async e=>{const t=await f.guess_notebook_location(e);"path"===t.type?(r(t.path_or_url),window.location.href=v(t.path_or_url)):confirm("Are you sure? This will download and run the file at\n\n"+t.path_or_url)&&(r(t.path_or_url),window.location.href=b(t.path_or_url))}}
                on_desktop_submit=${async e=>{var t;null===(t=window.plutoDesktop)||void 0===t||t.fileSystem.openNotebook("path")}}
                button_label=${window.plutoDesktop?"Open File":"Open"}
                placeholder=${l.placeholder}
            />
            ${window.plutoDesktop&&a.html`<${p.FilePicker}
                key=${l.placeholder}
                client=${e}
                value=""
                on_desktop_submit=${async e=>{var t;null===(t=window.plutoDesktop)||void 0===t||t.fileSystem.openNotebook("url",e)}}
                button_label="Open from URL"
                placeholder=${l.placeholder}
            />`}
        </div>`},v=e=>"open?"+new URLSearchParams({path:e}).toString(),b=e=>"open?"+new URLSearchParams({url:e}).toString(),_=e=>"edit?id="+e;var w=n("9Ta4i"),$=(a=n("cNaMA"),a=n("cNaMA"),n("aN0pg"));const k=(e,t=null)=>({transitioning:!1,notebook_id:t,path:e}),y=(e,t)=>e.split(/\/|\\/).slice(-t).join("/"),j=(e,t)=>{let o=1;for(const n of t)if(n!==e)for(;y(e,o)===y(n,o);)o++;return y(e,o)},E=({client:e,connected:t,remote_notebooks:o,CustomRecent:n,on_start_navigation:r})=>{const[l,i]=a.useState(null),s=a.useRef(l);s.current=l;const c=(e,t)=>{i((o=>(null==o?void 0:o.map((o=>o.path==e?{...o,...t}:o)))??null))};a.useEffect((()=>{null!=e&&t&&e.send("get_all_notebooks",{},{}).then((({message:e})=>{const t=e.notebooks.map((e=>k(e.path,e.notebook_id))),o=P(),n=[...w.default.sortBy(t,[e=>w.default.findIndex([...o,...t],(t=>t.path===e.path))]),...w.default.differenceBy(o,t,(e=>e.path))];i(n),document.body.classList.remove("loading")}))}),[null!=e&&t]),a.useEffect((()=>{const e=o;if(null!=s.current){const t=[],o=s.current.map((o=>{let n=null;if(n=o.notebook_id?e.find((e=>e.notebook_id==o.notebook_id)):e.find((e=>e.path==o.path)),null==n)return k(o.path);{const e=k(n.path,n.notebook_id);return t.push(n),e}})),n=e.filter((e=>!t.includes(e))).map((e=>k(e.path,e.notebook_id)));i([...n,...o])}}),[o]);a.useEffect((()=>{document.body.classList.toggle("nosessions",!(null==l||l.length>0))}),[l]);const u=null==l?void 0:l.map((e=>e.path));let d=null==l?a.html`<li><em>Loading...</em></li>`:l.map((t=>{const o=null!=t.notebook_id;return a.html`<li
                      key=${t.path}
                      class=${$.cl({running:o,recent:!o,transitioning:t.transitioning})}
                  >
                      <button onclick=${()=>(t=>{if(t.transitioning)return;if(null!=t.notebook_id){if(null==e)return;confirm("Shut down notebook process?")&&(c(t.path,{running:!1,transitioning:!0}),e.send("shutdown_notebook",{keep_in_session:!1},{notebook_id:t.notebook_id},!1))}else c(t.path,{transitioning:!0}),fetch(v(t.path),{method:"GET"}).then((e=>{if(!e.redirected)throw new Error("file not found maybe? try opening the notebook directly")})).catch((e=>{console.error("Failed to start notebook in background"),console.error(e),c(t.path,{transitioning:!1,notebook_id:null})}))})(t)} title=${o?"Shut down notebook":"Start notebook in background"}>
                          <span class="ionicon"></span>
                      </button>
                      <a
                          href=${o?_(t.notebook_id):v(t.path)}
                          title=${t.path}
                          onClick=${e=>{o||(r(j(t.path,u)),c(t.path,{transitioning:!0}))}}
                          >${j(t.path,u)}</a
                      >
                  </li>`}));return null==n?a.html`
            <h2>My work</h2>
            <ul id="recent" class="show-scrollbar">
                <li class="new">
                    <a
                        href="new"
                        onClick=${e=>{r("new notebook")}}
                        ><button><span class="ionicon"></span></button>Create a <strong>new notebook</strong></a
                    >
                </li>
                ${d}
            </ul>
        `:a.html`<${n} cl=${$.cl} combined=${l} client=${e} recents=${d} />`},P=()=>{const e=localStorage.getItem("recent notebooks"),t=null!=e?JSON.parse(e):[];return(t instanceof Array?t:[]).map((e=>k(e)))};var L=[{url:"https://cdn.jsdelivr.net/gh/JuliaPluto/featured@6828b12/pluto_export.json",integrity:"sha256-RKFITj6QfwcuqpQE3nhVyhNO5REaCuo84HQulf32l7A="}],S=(w=n("9Ta4i"),a=n("cNaMA"),n("jqrYR")),C=n("41Mhf");n("9Ta4i");a=n("cNaMA");const T=({entry:e,source_url:t})=>{var o;const n=null===(o=e.frontmatter)||void 0===o?void 0:o.title,r=e=>null==e?null:new URL(e,t).href,l=C.with_query_params("editor.html",{statefile:r(e.statefile_path),notebookfile:r(e.notebookfile_path),notebookfile_integrity:`sha256-${S.base64url_to_base64(e.hash)}`,disable_ui:"true",pluto_server_url:".",name:null==n?null:`sample ${n}`}),i=x(e.frontmatter);return a.html`
        <featured-card style=${`--card-color-hue: ${(e=>79*[...e].reduce(((e,t)=>e+t.charCodeAt(0)),0)%360)(e.id)}deg;`}>
            <a class="banner" href=${l}><img src=${r(e.frontmatter.image)??"data:image/svg+xml;charset=utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E"} /></a>
            ${null==(null==i?void 0:i.name)?null:a.html`
                      <div class="author">
                          <a href=${i.url}> <img src=${i.image??"data:image/svg+xml;charset=utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E"} /><span>${i.name}</span></a>
                      </div>
                  `}
            <h3><a href=${l} title=${e.frontmatter.title}>${e.frontmatter.title}</a></h3>
            <p title=${e.frontmatter.description}>${e.frontmatter.description}</p>
        </featured-card>
    `},x=e=>A(e.author)??A({name:e.author_name,url:e.author_url,image:e.author_image}),A=e=>{if(e instanceof Array)return A(e[0]);if(null==e)return null;if("string"==typeof e)return{name:e,url:null,image:null};if(e instanceof Object){let{name:t,image:o,url:n}=e;return null==o&&null!=n&&(o=n+".png?size=48"),{name:t,url:n,image:o}}return null},R=[{title:"Featured Notebooks",description:"These notebooks from the Julia community show off what you can do with Pluto. Give it a try, you might learn something new!",collections:[{title:"Loading...",tags:[]}],notebooks:[]}],N=a.html`
    <div class="featured-source">
        <h1>${R[0].title}</h1>
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
`,O=()=>{const e=L,[t,o]=a.useState([]);a.useEffect((()=>{if(null!=e){const t=e.map((async({url:e,integrity:t})=>{const n=await(await fetch(new Request(e,{integrity:t??void 0}))).json();if("1"!==n.format_version)throw new Error(`Invalid format version: ${n.format_version}`);o((t=>[...t,{...n,source_url:e}]))}));Promise.any(t).catch((e=>{console.error("All featured sources failed to load: ",e),r(!0)}))}}),[e]),a.useEffect((()=>{(null==t?void 0:t.length)>0&&console.log("Sources:",t)}),[t]);const[n,r]=a.useState(!1);a.useEffect((()=>{setTimeout((()=>{r(!0)}),8e3)}),[]);const l=!((null==t?void 0:t.length)>0);return l&&n?N:a.html`
              ${(l?R:t).map((e=>a.html`
                      <div class="featured-source">
                          <h1>${e.title}</h1>
                          <p>${e.description}</p>
                          ${e.collections.map((t=>a.html`
                                  <div class="collection">
                                      <h2>${t.title}</h2>
                                      <p>${t.description}</p>
                                      <div class="card-list">
                                          ${M(Object.values(e.notebooks),t.tags).map((t=>a.html`<${T} entry=${t} source_url=${e.source_url} />`))}
                                      </div>
                                  </div>
                              `))}
                      </div>
                  `))}
          `},M=(e,t)=>{const o=e.filter((e=>t.some((t=>{var o;return((null===(o=e.frontmatter)||void 0===o?void 0:o.tags)??[]).includes(t)}))));return w.default.sortBy(o,[e=>{var t;return Number(null==e||null===(t=e.frontmatter)||void 0===t?void 0:t.order)},"id"])};var D,U=n("cpCG6");const q=(null===(D=document.head.querySelector("link[rel='pluto-logo-big']"))||void 0===D?void 0:D.getAttribute("href"))??"",F=()=>{const[e,t]=a.useState([]),[o,n]=a.useState(!1),[r,l]=a.useState({show_samples:!0,CustomPicker:null,CustomRecent:null}),i=a.useRef({});a.useEffect((()=>{const e=n;u.create_pluto_connection({on_unrequested_update:({message:e,type:o})=>{"notebook_list"===o&&t(e.notebooks)},on_connection_status:e,on_reconnect:()=>!0}).then((async e=>{Object.assign(i.current,e),n(!0);try{const t=await U.get_environment(e),{custom_recent:o,custom_filepicker:n,show_samples:r=!0}=t({client:e,editor:void 0,imports:{preact:a}});l((e=>({...e,CustomRecent:o,CustomPicker:n,show_samples:r})))}catch(e){}(e=>{d().then((t=>{const o=e.version_info.pluto,n=t[t.length-1].tag_name;console.log(`Pluto version ${o}`);const a=t.findIndex((e=>e.tag_name===o));-1!==a&&t.slice(a+1).filter((e=>e.body.toLowerCase().includes("recommended update"))).length>0&&(console.log(`Newer version ${n} is available`),e.version_info.dismiss_update_notification||alert("A new version of Pluto.jl is available! 🎉\n\n    You have "+o+", the latest is "+n+'.\n\nYou can update Pluto.jl using the julia package manager:\n    import Pkg; Pkg.update("Pluto")\nAfterwards, exit Pluto.jl and restart julia.'))})).catch((()=>{}))})(e),e.send("completepath",{query:""},{})}))}),[]);const{show_samples:s,CustomRecent:c,CustomPicker:p}=r,[h,m]=a.useState(null),f=(e,t=!0)=>{if(t){const t=t=>{m(e)};window.addEventListener("beforeunload",t),setTimeout((()=>window.removeEventListener("beforeunload",t)),1e3)}else m(e)};return null!=h?a.html`<div class="navigating-away-banner"><h2>Loading ${h}...</h2></div>`:a.html`
              <section id="title">
                  <h1>welcome to <img src=${q} /></h1>
                  <!-- <a id="github" href="https://github.com/fonsp/Pluto.jl"
                ><img src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/logo-github.svg"
            /></a> -->
              </section>
              <section id="mywork">
                  <div>
                      <${E}
                          client=${i.current}
                          connected=${o}
                          remote_notebooks=${e}
                          CustomRecent=${c}
                          on_start_navigation=${f}
                      />
                  </div>
              </section>
              <section id="open">
                  <div>
                      <${g}
                          client=${i.current}
                          connected=${o}
                          CustomPicker=${p}
                          show_samples=${s}
                          on_start_navigation=${f}
                      />
                  </div>
              </section>
              <section id="featured">
                  <div>
                      <${O} />
                  </div>
              </section>
          `};a.render(a.html`<${c.Welcome} />`,document.querySelector("#app"));