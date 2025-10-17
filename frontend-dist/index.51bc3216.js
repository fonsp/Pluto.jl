var e=globalThis,t={},o={},n=e.parcelRequire94c2;null==n&&((n=function(e){if(e in t)return t[e].exports;if(e in o){var n=o[e];delete o[e];var r={id:e,exports:{}};return t[e]=r,n.call(r.exports,r,r.exports),r.exports}var l=Error("Cannot find module '"+e+"'");throw l.code="MODULE_NOT_FOUND",l}).register=function(e,t){o[e]=t},e.parcelRequire94c2=n),n.register;var r=n("cNaMA");n("eS9BV"),n("9Ta4i");var r=n("cNaMA"),l=n("4zMEb");const a=e=>i().then(t=>{let o=e.version_info.pluto,n=t[t.length-1].tag_name;console.log(`Pluto version ${o}`);let r=t.findIndex(e=>e.tag_name===o);-1!==r&&t.slice(r+1).filter(e=>e.body.toLowerCase().includes("recommended update")).length>0&&(console.log(`Newer version ${n} is available`),e.version_info.dismiss_update_notification||alert("A new version of Pluto.jl is available! \uD83C\uDF89\n\n    You have "+o+", the latest is "+n+'.\n\nYou can update Pluto.jl using the julia package manager:\n    import Pkg; Pkg.update("Pluto")\nAfterwards, exit Pluto.jl and restart julia.'))}).catch(()=>{}),i=async()=>{let e=await fetch("https://api.github.com/repos/fonsp/Pluto.jl/releases",{method:"GET",mode:"cors",cache:"no-cache",headers:{"Content-Type":"application/json"},redirect:"follow",referrerPolicy:"no-referrer"});return(await e.json()).reverse()};n("9Ta4i");var r=n("cNaMA"),s=n("2ZZ1r"),c=n("9fP3D"),u=n("hrGZZ"),r=n("cNaMA");const d=e=>{let t=`${e}
`.replace("\r\n","\n"),o=t.indexOf("### A Pluto.jl notebook ###"),n=t.match(/# ... ........-....-....-....-............/g),r=n?.length??0,l=t.indexOf("# ╔═╡ Cell order:")+17+1;for(let e=1;e<=r;e++)l=t.indexOf("\n",l+1)+1;return t.slice(o,l)},p=e=>new Promise((t,o)=>{try{e.getAsString(e=>{console.log(e),t(e)})}catch(e){o(e)}}),_=e=>new Promise((t,o)=>{let{name:n,type:r}=e,l=new FileReader;l.onerror=()=>o("Failed to read file!"),l.onloadstart=()=>{},l.onprogress=({loaded:e,total:t})=>{},l.onload=()=>{},l.onloadend=()=>t({file:l.result,name:n,type:r}),l.readAsText(e)}),h=({on_start_navigation:e})=>{let t=async t=>{let o;if(console.log(t),(t?.path??t?.composedPath()).filter(e=>e?.classList?.contains(".cm-editor"))?.length>0)return;switch(t.type){case"paste":o=d(t.clipboardData.getData("text/plain"));break;case"dragstart":t.dataTransfer.dropEffect="move";return;case"dragover":t.preventDefault();return;case"drop":t.preventDefault(),o=t.dataTransfer.types.includes("Files")?await _(t.dataTransfer.files[0]).then(({file:e})=>e):d(await p(t.dataTransfer.items[0]))}if(!o)return;e((0,c.t)("t_loading_something_notebook_from_clipboard"),!1),document.body.classList.add("loading");let n=await fetch("./notebookupload",{method:"POST",body:o});if(n.ok)window.location.href=b(await n.text());else{let e=await n.blob();window.location.href=URL.createObjectURL(e)}};return(0,u.useEventListener)(document,"paste",t,[t]),(0,u.useEventListener)(document,"drop",t,[t]),(0,u.useEventListener)(document,"dragstart",t,[t]),(0,u.useEventListener)(document,"dragover",t,[t]),(0,r.html)`<span />`};var m=n("1xJnC"),c=n("9fP3D");const f=({client:e,connected:t,CustomPicker:o,show_samples:n,on_start_navigation:l})=>{let a=async e=>{let t=await (0,m.guess_notebook_location)(e);l(t.display_url??t.path_or_url),window.location.href=("path"===t.type?g:w)(t.path_or_url)},i=async e=>{window.plutoDesktop?.fileSystem.openNotebook("path")},u=async e=>{window.plutoDesktop?.fileSystem.openNotebook("url",e)},d=o??{text:(0,c.t)("t_open_a_notebook_action"),placeholder:(0,c.t)("t_enter_path_or_url")};return(0,r.html)`<${h} on_start_navigation=${l} />
        <h2>${d.text}</h2>
        <div id="new" class=${window.plutoDesktop?"desktop_opener":""}>
            <${s.FilePicker}
                key=${d.placeholder}
                client=${e}
                value=""
                on_submit=${a}
                on_desktop_submit=${i}
                clear_on_blur=${!1}
                button_label=${window.plutoDesktop?(0,c.t)("t_open_file_action"):(0,c.t)("t_open_action")}
                placeholder=${d.placeholder}
            />
            ${null!=window.plutoDesktop?(0,r.html)`<${s.FilePicker}
                      key=${d.placeholder}
                      client=${e}
                      value=""
                      on_desktop_submit=${u}
                      button_label=${(0,c.t)("t_open_from_url_action")}
                      placeholder=${d.placeholder}
                  />`:null}
        </div>`},g=(e,t=!1)=>"open?"+new URLSearchParams({path:e}).toString(),w=e=>"open?"+new URLSearchParams({url:e}).toString(),b=e=>"edit?id="+e;var v=n("9Ta4i"),r=n("cNaMA"),k=n("aN0pg"),$=n("dYd4C"),c=n("9fP3D");const y=e=>({transitioning:!1,entry:void 0,path:e}),P=e=>({transitioning:!1,entry:e,path:e.path}),j=(e,t)=>e.split(/\/|\\/).slice(-t).join("/"),S=(e,t)=>{let o=1;for(let n of t)if(n!==e)for(;j(e,o)===j(n,o);)o++;return j(e,o)},E=({client:e,connected:t,remote_notebooks:o,CustomRecent:n,on_start_navigation:l})=>{let[a,i]=(0,r.useState)(null),s=(0,r.useRef)(a);s.current=a;let u=(e,t)=>{i(o=>o?.map(o=>o.path==e?{...o,...t}:o)??null)};(0,r.useEffect)(()=>{null!=e&&t&&e.send("get_all_notebooks",{},{}).then(({message:e})=>{let t=e.notebooks.map(e=>P(e)),o=x();i([...(0,v.default).sortBy(t,[e=>(0,v.default).findIndex([...o,...t],t=>t.path===e.path)]),...(0,v.default).differenceBy(o,t,e=>e.path)]),document.body.classList.remove("loading")})},[null!=e&&t]),(0,r.useEffect)(()=>{if(null!=s.current){let e=[],t=s.current.map(t=>{let n=null;if(null==(n=null!=t.entry?o.find(e=>e.notebook_id===t.entry?.notebook_id):o.find(e=>e.path===t.path)))return y(t.path);{let t=P(n);return e.push(n),t}});i([...o.filter(t=>!e.includes(t)).map(P),...t])}},[o]);let d=t=>{!t.transitioning&&(null!=t.entry?null!=e&&confirm(t.entry?.process_status===$.ProcessStatus.waiting_for_permission?(0,c.t)("t_close_notebook_session"):(0,c.t)("t_shut_down_notebook_process"))&&(u(t.path,{running:!1,transitioning:!0}),e.send("shutdown_notebook",{keep_in_session:!1},{notebook_id:t.entry?.notebook_id},!1)):(u(t.path,{transitioning:!0}),fetch(g(t.path)+"&execution_allowed=true",{method:"GET"}).then(e=>{if(!e.redirected)throw Error("file not found maybe? try opening the notebook directly")}).catch(e=>{console.error("Failed to start notebook in background"),console.error(e),u(t.path,{transitioning:!1,notebook_id:null})})))};(0,r.useEffect)(()=>{document.body.classList.toggle("nosessions",!(null==a||a.length>0))},[a]);let p=e=>{D(e.path),i(t=>t?.filter(t=>t.path!==e.path)??null)},_=a?.map(e=>e.path),h=null==a?(0,r.html)`<li class="not_yet_ready"><em>${(0,c.t)("t_loading_ellipses")}</em></li>`:a.map(e=>{let t=null!=e.entry;return(0,r.html)`<li
                      key=${e.path}
                      class=${(0,k.cl)({running:t,recent:!t,transitioning:e.transitioning})}
                  >
                      <button
                          onclick=${()=>d(e)}
                          title=${t?e.entry?.process_status===$.ProcessStatus.waiting_for_permission?(0,c.t)("t_stop_notebook_session"):(0,c.t)("t_shut_down_notebook"):(0,c.t)("t_start_notebook_in_background")}
                      >
                          <span class="ionicon"></span>
                      </button>
                      <a
                          href=${t?b(e.entry?.notebook_id):g(e.path)}
                          title=${e.path}
                          onClick=${o=>{t||(l(S(e.path,_)),u(e.path,{transitioning:!0}))}}
                          >${S(e.path,_)}</a
                      >
                      ${t||e.transitioning?null:(0,r.html)`<button
                                class="clear-btn"
                                onclick=${t=>{t.preventDefault(),t.stopPropagation(),p(e)}}
                                title=${(0,c.t)("t_remove_from_recent_notebooks")}
                                aria-label=${(0,c.t)("t_remove_from_recent_notebooks")}
                            >
                                ${(0,c.t)("t_FORGET")}
                            </button>`}
                  </li>`});return null==n?(0,r.html)`
            <h2>${(0,c.t)("t_my_work")}</h2>
            <ul id="recent" class="show_scrollbar">
                <li class="new">
                    <a
                        href="new"
                        onClick=${e=>{l((0,c.t)("t_loading_something_new_notebook"))}}
                        ><button><span class="ionicon"></span></button>${(0,c.th)("t_newnotebook")}</a
                    >
                </li>
                ${h}
            </ul>
        `:(0,r.html)`<${n} cl=${k.cl} combined=${a} client=${e} recents=${h} />`},x=()=>{let e=localStorage.getItem("recent notebooks"),t=null!=e?JSON.parse(e):[];return(t instanceof Array?t:[]).map(y)},D=e=>{let t=x().filter(t=>t.path!==e);localStorage.setItem("recent notebooks",JSON.stringify(t.map(e=>e.path)))};var v=n("9Ta4i"),r=n("cNaMA"),T=n("h2NGW"),C=n("1Mxs0");n("9fP3D");const N=[{title:"Featured Notebooks",description:"These notebooks from the Julia community show off what you can do with Pluto. Give it a try, you might learn something new!",collections:[{title:"Loading...",tags:[]}],notebooks:{}}],L=(0,r.html)`
    <div class="featured-source">
        <h1>${N[0].title}</h1>
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
`,A=[{title:"Notebooks",tags:"everything"}],R=e=>e?.id??e.url,O=({sources:e,direct_html_links:t})=>{let[o,n]=(0,r.useState)({});(0,r.useEffect)(()=>{null!=e&&(a(!1),n({}),Promise.any(Array.from(new Set(e.map(R))).map(t=>M(e.filter(e=>R(e)===t).map(async e=>{let{url:o,integrity:n,valid_until:r}=e;if(null!=r&&new Date(r)<new Date)throw Error(`Source ${o} is expired with valid_until ${r}`);let l=await (await fetch(new Request(o,{integrity:n??void 0}))).json();if("1"!==l.format_version)throw Error(`Invalid format version: ${l.format_version}`);return[l,t,o]})).then(([e,t,o])=>{n(n=>({...n,[t]:{...e,source_url:o}}))}))).catch(e=>{console.error("All featured sources failed to load: ",e),(e?.errors??[]).forEach(e=>console.error(e)),a(!0)}))},[e]),(0,r.useEffect)(()=>{Object.entries(o).length>0&&console.log("Sources:",o)},[o]);let[l,a]=(0,r.useState)(!1);(0,r.useEffect)(()=>{setTimeout(()=>{a(!0)},8e3)},[]);let i=0===Object.entries(o).length,s=Array.from(new Set(e?.map(R)??[])).map(e=>o[e]).filter(e=>null!=e);return i&&l?L:(0,r.html)`
              ${(i?N:s).map(e=>{let o=e?.collections??A;return(0,r.html)`
                      <div class="featured-source">
                          <h1>${e.title}</h1>
                          <p>${e.description}</p>
                          ${o.map(o=>(0,r.html)`
                                  <div class="collection">
                                      <h2>${o.title}</h2>
                                      <p>${o.description}</p>
                                      <div class="card-list">
                                          ${I(Object.values(e.notebooks),o.tags??[]).map(o=>(0,r.html)`<${C.FeaturedCard} entry=${o} source_manifest=${e} direct_html_links=${t} />`)}
                                      </div>
                                  </div>
                              `)}
                      </div>
                  `})}
          `};(0,T.default)(O,"pluto-featured",["sources","direct_html_links"]);const I=(e,t)=>{let o="everything"===t?e:e.filter(e=>t.some(t=>(e.frontmatter?.tags??[]).includes(t))),n=e=>isNaN(e)?e:Number(e);return(0,v.default).sortBy(o,[e=>n(e?.frontmatter?.order),"id"])},M=(e,t=[])=>e.length<=1?Promise.any([...e,...t]):e[0].catch(()=>M(e.slice(1),[...t,e[0]]));var F=n("cpCG6"),G={sources:[{url:"https://featured.plutojl.org/pluto_export.json",valid_until:"2027-10",id:"featured pluto"},{id:"featured pluto",url:"https://cdn.jsdelivr.net/gh/JuliaPluto/featured@v5/pluto_export.json",integrity:"sha256-+zI9b/gHEIJGV/DrckBY85hkxNWGIewgYffkAkEq4/w="},{url:"https://plutojl.org/pluto_export.json",valid_until:"2027-10",id:"pluto website"}]},c=n("9fP3D");const U=document.head.querySelector("link[rel='pluto-logo-big']")?.getAttribute("href")??"",q=new URLSearchParams(window.location.search),J={featured_direct_html_links:!!(q.get("featured_direct_html_links")??window.pluto_featured_direct_html_links),featured_sources:window.pluto_featured_sources,featured_source_url:q.get("featured_source_url")??window.pluto_featured_source_url,featured_source_integrity:q.get("featured_source_integrity")??window.pluto_featured_source_integrity,pluto_server_url:q.get("pluto_server_url")??window.pluto_server_url};console.log("Launch parameters: ",J),(0,r.render)((0,r.html)`<${({launch_params:e})=>{let[t,o]=(0,r.useState)([]),[n,i]=(0,r.useState)(!1),[s,u]=(0,r.useState)({show_samples:!0,CustomPicker:null,CustomRecent:null}),d=(0,r.useRef)({});(0,r.useEffect)(()=>{(0,l.create_pluto_connection)({on_unrequested_update:({message:e,type:t})=>{"notebook_list"===t&&o(e.notebooks)},on_connection_status:i,on_reconnect:async()=>!0,ws_address:e.pluto_server_url?(0,l.ws_address_from_base)(e.pluto_server_url):void 0}).then(async e=>{Object.assign(d.current,e),i(!0);try{let{custom_recent:t,custom_filepicker:o,show_samples:n=!0}=(await (0,F.get_environment)(e))({client:e,editor:void 0,imports:{preact:r}});u(e=>({...e,CustomRecent:t,CustomPicker:o,show_samples:n}))}catch(e){}a(e),e.send("current_time"),e.send("completepath",{query:""},{})})},[]);let{show_samples:p,CustomRecent:_,CustomPicker:h}=s,[m,g]=(0,r.useState)(null),w=(e,t=!0)=>{if(t){let t=t=>{g(e)};window.addEventListener("beforeunload",t),setTimeout(()=>window.removeEventListener("beforeunload",t),1e3)}else g(e)},b=r.useMemo(()=>e.featured_sources??(e.featured_source_url?[{url:e.featured_source_url,integrity:e.featured_source_integrity}]:G.sources),[e]);return null!=m?(0,r.html)`
            <div class="navigating-away-banner">
                <h2>${(0,c.th)("t_loading_something",{text:m})}</h2>
            </div>
        `:(0,r.html)`
        <section id="title">
            <h1>${(0,c.th)("t_welcome_to_pluto",{pluto:(0,r.html)`<img src=${U} />`})}</h1>
        </section>
        <section id="mywork">
            <div>
                <${E}
                    client=${d.current}
                    connected=${n}
                    remote_notebooks=${t}
                    CustomRecent=${_}
                    on_start_navigation=${w}
                />
            </div>
        </section>
        <section id="open">
            <div>
                <${f}
                    client=${d.current}
                    connected=${n}
                    CustomPicker=${h}
                    show_samples=${p}
                    on_start_navigation=${w}
                />
            </div>
        </section>
        <section id="featured">
            <div>
                <${O} sources=${b} direct_html_links=${e.featured_direct_html_links} />
            </div>
        </section>
    `}} launch_params=${J} />`,document.querySelector("#app"));