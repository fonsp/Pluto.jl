var t="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{};function e(t,e,n,s){Object.defineProperty(t,e,{get:n,set:s,enumerable:!0,configurable:!0})}var n=t.parcelRequire94c2;n.register("euEJ3",(function(s,r){e(s.exports,"setLogLevel",(()=>Ps)),e(s.exports,"_logWarn",(()=>qs)),e(s.exports,"_debugAssert",(()=>$s)),e(s.exports,"FirestoreError",(()=>zs)),e(s.exports,"_EmptyCredentialsProvider",(()=>Ys)),e(s.exports,"Timestamp",(()=>ar)),e(s.exports,"_FieldPath",(()=>mr)),e(s.exports,"_isBase64Available",(()=>yr)),e(s.exports,"_DocumentKey",(()=>xr)),e(s.exports,"_DatabaseId",(()=>$l)),e(s.exports,"_validateIsNotUsedTogether",(()=>zl)),e(s.exports,"_cast",(()=>Xl)),e(s.exports,"connectFirestoreEmulator",(()=>ed)),e(s.exports,"DocumentReference",(()=>nd)),e(s.exports,"CollectionReference",(()=>rd)),e(s.exports,"Query",(()=>sd)),e(s.exports,"collection",(()=>id)),e(s.exports,"collectionGroup",(()=>od)),e(s.exports,"doc",(()=>ad)),e(s.exports,"refEqual",(()=>cd)),e(s.exports,"queryEqual",(()=>ud)),e(s.exports,"LoadBundleTask",(()=>dd)),e(s.exports,"CACHE_SIZE_UNLIMITED",(()=>fd)),e(s.exports,"Firestore",(()=>gd)),e(s.exports,"initializeFirestore",(()=>md)),e(s.exports,"getFirestore",(()=>pd)),e(s.exports,"ensureFirestoreConfigured",(()=>yd)),e(s.exports,"enableIndexedDbPersistence",(()=>vd)),e(s.exports,"enableMultiTabIndexedDbPersistence",(()=>bd)),e(s.exports,"clearIndexedDbPersistence",(()=>Td)),e(s.exports,"waitForPendingWrites",(()=>Id)),e(s.exports,"enableNetwork",(()=>Sd)),e(s.exports,"disableNetwork",(()=>_d)),e(s.exports,"terminate",(()=>Nd)),e(s.exports,"loadBundle",(()=>Ad)),e(s.exports,"namedQuery",(()=>Dd)),e(s.exports,"FieldPath",(()=>Cd)),e(s.exports,"documentId",(()=>kd)),e(s.exports,"Bytes",(()=>Rd)),e(s.exports,"FieldValue",(()=>Ld)),e(s.exports,"GeoPoint",(()=>Od)),e(s.exports,"SnapshotMetadata",(()=>lf)),e(s.exports,"DocumentSnapshot",(()=>df)),e(s.exports,"QueryDocumentSnapshot",(()=>ff)),e(s.exports,"QuerySnapshot",(()=>gf)),e(s.exports,"snapshotEqual",(()=>pf)),e(s.exports,"QueryConstraint",(()=>wf)),e(s.exports,"query",(()=>vf)),e(s.exports,"where",(()=>Ef)),e(s.exports,"orderBy",(()=>If)),e(s.exports,"limit",(()=>_f)),e(s.exports,"limitToLast",(()=>Nf)),e(s.exports,"startAt",(()=>Df)),e(s.exports,"startAfter",(()=>xf)),e(s.exports,"endBefore",(()=>kf)),e(s.exports,"endAt",(()=>Rf)),e(s.exports,"AbstractUserDataWriter",(()=>Pf)),e(s.exports,"WriteBatch",(()=>qf)),e(s.exports,"getDoc",(()=>jf)),e(s.exports,"getDocFromCache",(()=>$f)),e(s.exports,"getDocFromServer",(()=>Gf)),e(s.exports,"getDocs",(()=>Hf)),e(s.exports,"getDocsFromCache",(()=>zf)),e(s.exports,"getDocsFromServer",(()=>Qf)),e(s.exports,"setDoc",(()=>Wf)),e(s.exports,"executeWrite",(()=>eg)),e(s.exports,"updateDoc",(()=>Yf)),e(s.exports,"deleteDoc",(()=>Xf)),e(s.exports,"addDoc",(()=>Jf)),e(s.exports,"onSnapshot",(()=>Zf)),e(s.exports,"onSnapshotsInSync",(()=>tg)),e(s.exports,"Transaction",(()=>sg)),e(s.exports,"runTransaction",(()=>rg)),e(s.exports,"deleteField",(()=>ig)),e(s.exports,"serverTimestamp",(()=>og)),e(s.exports,"arrayUnion",(()=>ag)),e(s.exports,"arrayRemove",(()=>cg)),e(s.exports,"increment",(()=>ug)),e(s.exports,"writeBatch",(()=>hg));var i=n("kseP6"),o=n("4Sb90");
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const a=function(t){const e=[];let n=0;for(let s=0;s<t.length;s++){let r=t.charCodeAt(s);r<128?e[n++]=r:r<2048?(e[n++]=r>>6|192,e[n++]=63&r|128):55296==(64512&r)&&s+1<t.length&&56320==(64512&t.charCodeAt(s+1))?(r=65536+((1023&r)<<10)+(1023&t.charCodeAt(++s)),e[n++]=r>>18|240,e[n++]=r>>12&63|128,e[n++]=r>>6&63|128,e[n++]=63&r|128):(e[n++]=r>>12|224,e[n++]=r>>6&63|128,e[n++]=63&r|128)}return e},c={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:"function"==typeof atob,encodeByteArray(t,e){if(!Array.isArray(t))throw Error("encodeByteArray takes an array as a parameter");this.init_();const n=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,s=[];for(let e=0;e<t.length;e+=3){const r=t[e],i=e+1<t.length,o=i?t[e+1]:0,a=e+2<t.length,c=a?t[e+2]:0,u=r>>2,h=(3&r)<<4|o>>4;let l=(15&o)<<2|c>>6,d=63&c;a||(d=64,i||(l=64)),s.push(n[u],n[h],n[l],n[d])}return s.join("")},encodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(t):this.encodeByteArray(a(t),e)},decodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(t):function(t){const e=[];let n=0,s=0;for(;n<t.length;){const r=t[n++];if(r<128)e[s++]=String.fromCharCode(r);else if(r>191&&r<224){const i=t[n++];e[s++]=String.fromCharCode((31&r)<<6|63&i)}else if(r>239&&r<365){const i=((7&r)<<18|(63&t[n++])<<12|(63&t[n++])<<6|63&t[n++])-65536;e[s++]=String.fromCharCode(55296+(i>>10)),e[s++]=String.fromCharCode(56320+(1023&i))}else{const i=t[n++],o=t[n++];e[s++]=String.fromCharCode((15&r)<<12|(63&i)<<6|63&o)}}return e.join("")}(this.decodeStringToByteArray(t,e))},decodeStringToByteArray(t,e){this.init_();const n=e?this.charToByteMapWebSafe_:this.charToByteMap_,s=[];for(let e=0;e<t.length;){const r=n[t.charAt(e++)],i=e<t.length?n[t.charAt(e)]:0;++e;const o=e<t.length?n[t.charAt(e)]:64;++e;const a=e<t.length?n[t.charAt(e)]:64;if(++e,null==r||null==i||null==o||null==a)throw Error();const c=r<<2|i>>4;if(s.push(c),64!==o){const t=i<<4&240|o>>2;if(s.push(t),64!==a){const t=o<<6&192|a;s.push(t)}}}return s},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let t=0;t<this.ENCODED_VALS.length;t++)this.byteToCharMap_[t]=this.ENCODED_VALS.charAt(t),this.charToByteMap_[this.byteToCharMap_[t]]=t,this.byteToCharMapWebSafe_[t]=this.ENCODED_VALS_WEBSAFE.charAt(t),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[t]]=t,t>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(t)]=t,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(t)]=t)}}},u=function(t){return function(t){const e=a(t);return c.encodeByteArray(e,!0)}(t).replace(/\./g,"")};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function h(){return"undefined"!=typeof navigator&&"string"==typeof navigator.userAgent?navigator.userAgent:""}function l(){return!function(){try{return"[object process]"===Object.prototype.toString.call(t.process)}catch(t){return!1}}()&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function d(t,e){if(t===e)return!0;const n=Object.keys(t),s=Object.keys(e);for(const r of n){if(!s.includes(r))return!1;const n=t[r],i=e[r];if(f(n)&&f(i)){if(!d(n,i))return!1}else if(n!==i)return!1}for(const t of s)if(!n.includes(t))return!1;return!0}function f(t){return null!==t&&"object"==typeof t}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function g(t){return t&&t._delegate?t._delegate:t}class m{constructor(t,e,n){this.name=t,this.instanceFactory=e,this.type=n,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(t){return this.instantiationMode=t,this}setMultipleInstances(t){return this.multipleInstances=t,this}setServiceProps(t){return this.serviceProps=t,this}setInstanceCreatedCallback(t){return this.onInstanceCreated=t,this}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var p,y;(y=p||(p={}))[y.DEBUG=0]="DEBUG",y[y.VERBOSE=1]="VERBOSE",y[y.INFO=2]="INFO",y[y.WARN=3]="WARN",y[y.ERROR=4]="ERROR",y[y.SILENT=5]="SILENT";const w={debug:p.DEBUG,verbose:p.VERBOSE,info:p.INFO,warn:p.WARN,error:p.ERROR,silent:p.SILENT},v=p.INFO,b={[p.DEBUG]:"log",[p.VERBOSE]:"log",[p.INFO]:"info",[p.WARN]:"warn",[p.ERROR]:"error"},E=(t,e,...n)=>{if(e<t.logLevel)return;const s=(new Date).toISOString(),r=b[e];if(!r)throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`);console[r](`[${s}]  ${t.name}:`,...n)};var T,I="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof window?window:void 0!==t?t:"undefined"!=typeof self?self:{},S=S||{},_=I||self;function N(){}function A(t){var e=typeof t;return"array"==(e="object"!=e?e:t?Array.isArray(t)?"array":e:"null")||"object"==e&&"number"==typeof t.length}function D(t){var e=typeof t;return"object"==e&&null!=t||"function"==e}var x="closure_uid_"+(1e9*Math.random()>>>0),C=0;function k(t,e,n){return t.call.apply(t.bind,arguments)}function R(t,e,n){if(!t)throw Error();if(2<arguments.length){var s=Array.prototype.slice.call(arguments,2);return function(){var n=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(n,s),t.apply(e,n)}}return function(){return t.apply(e,arguments)}}function L(t,e,n){return(L=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?k:R).apply(null,arguments)}function O(t,e){var n=Array.prototype.slice.call(arguments,1);return function(){var e=n.slice();return e.push.apply(e,arguments),t.apply(this,e)}}function M(t,e){function n(){}n.prototype=e.prototype,t.Z=e.prototype,t.prototype=new n,t.prototype.constructor=t,t.Vb=function(t,n,s){for(var r=Array(arguments.length-2),i=2;i<arguments.length;i++)r[i-2]=arguments[i];return e.prototype[n].apply(t,r)}}function F(){this.s=this.s,this.o=this.o}var P={};F.prototype.s=!1,F.prototype.na=function(){if(!this.s&&(this.s=!0,this.M(),0)){var t=function(t){return Object.prototype.hasOwnProperty.call(t,x)&&t[x]||(t[x]=++C)}(this);delete P[t]}},F.prototype.M=function(){if(this.o)for(;this.o.length;)this.o.shift()()};const V=Array.prototype.indexOf?function(t,e){return Array.prototype.indexOf.call(t,e,void 0)}:function(t,e){if("string"==typeof t)return"string"!=typeof e||1!=e.length?-1:t.indexOf(e,0);for(let n=0;n<t.length;n++)if(n in t&&t[n]===e)return n;return-1},U=Array.prototype.forEach?function(t,e,n){Array.prototype.forEach.call(t,e,n)}:function(t,e,n){const s=t.length,r="string"==typeof t?t.split(""):t;for(let i=0;i<s;i++)i in r&&e.call(n,r[i],i,t)};function q(t){return Array.prototype.concat.apply([],arguments)}function B(t){const e=t.length;if(0<e){const n=Array(e);for(let s=0;s<e;s++)n[s]=t[s];return n}return[]}function j(t){return/^[\s\xa0]*$/.test(t)}var K,$=String.prototype.trim?function(t){return t.trim()}:function(t){return/^[\s\xa0]*([\s\S]*?)[\s\xa0]*$/.exec(t)[1]};function G(t,e){return-1!=t.indexOf(e)}function H(t,e){return t<e?-1:t>e?1:0}t:{var z=_.navigator;if(z){var Q=z.userAgent;if(Q){K=Q;break t}}K=""}function W(t,e,n){for(const s in t)e.call(n,t[s],s,t)}function Y(t){const e={};for(const n in t)e[n]=t[n];return e}var X="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function J(t,e){let n,s;for(let e=1;e<arguments.length;e++){for(n in s=arguments[e],s)t[n]=s[n];for(let e=0;e<X.length;e++)n=X[e],Object.prototype.hasOwnProperty.call(s,n)&&(t[n]=s[n])}}function Z(t){return Z[" "](t),t}Z[" "]=N;var tt,et,nt=G(K,"Opera"),st=G(K,"Trident")||G(K,"MSIE"),rt=G(K,"Edge"),it=rt||st,ot=G(K,"Gecko")&&!(G(K.toLowerCase(),"webkit")&&!G(K,"Edge"))&&!(G(K,"Trident")||G(K,"MSIE"))&&!G(K,"Edge"),at=G(K.toLowerCase(),"webkit")&&!G(K,"Edge");function ct(){var t=_.document;return t?t.documentMode:void 0}t:{var ut="",ht=(et=K,ot?/rv:([^\);]+)(\)|;)/.exec(et):rt?/Edge\/([\d\.]+)/.exec(et):st?/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(et):at?/WebKit\/(\S+)/.exec(et):nt?/(?:Version)[ \/]?(\S+)/.exec(et):void 0);if(ht&&(ut=ht?ht[1]:""),st){var lt=ct();if(null!=lt&&lt>parseFloat(ut)){tt=String(lt);break t}}tt=ut}var dt,ft={};function gt(){return function(t){var e=ft;return Object.prototype.hasOwnProperty.call(e,9)?e[9]:e[9]=t(9)}((function(){let t=0;const e=$(String(tt)).split("."),n=$("9").split("."),s=Math.max(e.length,n.length);for(let o=0;0==t&&o<s;o++){var r=e[o]||"",i=n[o]||"";do{if(r=/(\d*)(\D*)(.*)/.exec(r)||["","","",""],i=/(\d*)(\D*)(.*)/.exec(i)||["","","",""],0==r[0].length&&0==i[0].length)break;t=H(0==r[1].length?0:parseInt(r[1],10),0==i[1].length?0:parseInt(i[1],10))||H(0==r[2].length,0==i[2].length)||H(r[2],i[2]),r=r[3],i=i[3]}while(0==t)}return 0<=t}))}if(_.document&&st){var mt=ct();dt=mt||(parseInt(tt,10)||void 0)}else dt=void 0;var pt=dt,yt=function(){if(!_.addEventListener||!Object.defineProperty)return!1;var t=!1,e=Object.defineProperty({},"passive",{get:function(){t=!0}});try{_.addEventListener("test",N,e),_.removeEventListener("test",N,e)}catch(t){}return t}();function wt(t,e){this.type=t,this.g=this.target=e,this.defaultPrevented=!1}function vt(t,e){if(wt.call(this,t?t.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,t){var n=this.type=t.type,s=t.changedTouches&&t.changedTouches.length?t.changedTouches[0]:null;if(this.target=t.target||t.srcElement,this.g=e,e=t.relatedTarget){if(ot){t:{try{Z(e.nodeName);var r=!0;break t}catch(t){}r=!1}r||(e=null)}}else"mouseover"==n?e=t.fromElement:"mouseout"==n&&(e=t.toElement);this.relatedTarget=e,s?(this.clientX=void 0!==s.clientX?s.clientX:s.pageX,this.clientY=void 0!==s.clientY?s.clientY:s.pageY,this.screenX=s.screenX||0,this.screenY=s.screenY||0):(this.clientX=void 0!==t.clientX?t.clientX:t.pageX,this.clientY=void 0!==t.clientY?t.clientY:t.pageY,this.screenX=t.screenX||0,this.screenY=t.screenY||0),this.button=t.button,this.key=t.key||"",this.ctrlKey=t.ctrlKey,this.altKey=t.altKey,this.shiftKey=t.shiftKey,this.metaKey=t.metaKey,this.pointerId=t.pointerId||0,this.pointerType="string"==typeof t.pointerType?t.pointerType:bt[t.pointerType]||"",this.state=t.state,this.i=t,t.defaultPrevented&&vt.Z.h.call(this)}}wt.prototype.h=function(){this.defaultPrevented=!0},M(vt,wt);var bt={2:"touch",3:"pen",4:"mouse"};vt.prototype.h=function(){vt.Z.h.call(this);var t=this.i;t.preventDefault?t.preventDefault():t.returnValue=!1};var Et="closure_listenable_"+(1e6*Math.random()|0),Tt=0;function It(t,e,n,s,r){this.listener=t,this.proxy=null,this.src=e,this.type=n,this.capture=!!s,this.ia=r,this.key=++Tt,this.ca=this.fa=!1}function St(t){t.ca=!0,t.listener=null,t.proxy=null,t.src=null,t.ia=null}function _t(t){this.src=t,this.g={},this.h=0}function Nt(t,e){var n=e.type;if(n in t.g){var s,r=t.g[n],i=V(r,e);(s=0<=i)&&Array.prototype.splice.call(r,i,1),s&&(St(e),0==t.g[n].length&&(delete t.g[n],t.h--))}}function At(t,e,n,s){for(var r=0;r<t.length;++r){var i=t[r];if(!i.ca&&i.listener==e&&i.capture==!!n&&i.ia==s)return r}return-1}_t.prototype.add=function(t,e,n,s,r){var i=t.toString();(t=this.g[i])||(t=this.g[i]=[],this.h++);var o=At(t,e,s,r);return-1<o?(e=t[o],n||(e.fa=!1)):((e=new It(e,this.src,i,!!s,r)).fa=n,t.push(e)),e};var Dt="closure_lm_"+(1e6*Math.random()|0),xt={};function Ct(t,e,n,s,r){if(s&&s.once)return Rt(t,e,n,s,r);if(Array.isArray(e)){for(var i=0;i<e.length;i++)Ct(t,e[i],n,s,r);return null}return n=Ut(n),t&&t[Et]?t.N(e,n,D(s)?!!s.capture:!!s,r):kt(t,e,n,!1,s,r)}function kt(t,e,n,s,r,i){if(!e)throw Error("Invalid event type");var o=D(r)?!!r.capture:!!r,a=Pt(t);if(a||(t[Dt]=a=new _t(t)),(n=a.add(e,n,s,o,i)).proxy)return n;if(s=function(){function t(n){return e.call(t.src,t.listener,n)}var e=Ft;return t}(),n.proxy=s,s.src=t,s.listener=n,t.addEventListener)yt||(r=o),void 0===r&&(r=!1),t.addEventListener(e.toString(),s,r);else if(t.attachEvent)t.attachEvent(Mt(e.toString()),s);else{if(!t.addListener||!t.removeListener)throw Error("addEventListener and attachEvent are unavailable.");t.addListener(s)}return n}function Rt(t,e,n,s,r){if(Array.isArray(e)){for(var i=0;i<e.length;i++)Rt(t,e[i],n,s,r);return null}return n=Ut(n),t&&t[Et]?t.O(e,n,D(s)?!!s.capture:!!s,r):kt(t,e,n,!0,s,r)}function Lt(t,e,n,s,r){if(Array.isArray(e))for(var i=0;i<e.length;i++)Lt(t,e[i],n,s,r);else s=D(s)?!!s.capture:!!s,n=Ut(n),t&&t[Et]?(t=t.i,(e=String(e).toString())in t.g&&(-1<(n=At(i=t.g[e],n,s,r))&&(St(i[n]),Array.prototype.splice.call(i,n,1),0==i.length&&(delete t.g[e],t.h--)))):t&&(t=Pt(t))&&(e=t.g[e.toString()],t=-1,e&&(t=At(e,n,s,r)),(n=-1<t?e[t]:null)&&Ot(n))}function Ot(t){if("number"!=typeof t&&t&&!t.ca){var e=t.src;if(e&&e[Et])Nt(e.i,t);else{var n=t.type,s=t.proxy;e.removeEventListener?e.removeEventListener(n,s,t.capture):e.detachEvent?e.detachEvent(Mt(n),s):e.addListener&&e.removeListener&&e.removeListener(s),(n=Pt(e))?(Nt(n,t),0==n.h&&(n.src=null,e[Dt]=null)):St(t)}}}function Mt(t){return t in xt?xt[t]:xt[t]="on"+t}function Ft(t,e){if(t.ca)t=!0;else{e=new vt(e,this);var n=t.listener,s=t.ia||t.src;t.fa&&Ot(t),t=n.call(s,e)}return t}function Pt(t){return(t=t[Dt])instanceof _t?t:null}var Vt="__closure_events_fn_"+(1e9*Math.random()>>>0);function Ut(t){return"function"==typeof t?t:(t[Vt]||(t[Vt]=function(e){return t.handleEvent(e)}),t[Vt])}function qt(){F.call(this),this.i=new _t(this),this.P=this,this.I=null}function Bt(t,e){var n,s=t.I;if(s)for(n=[];s;s=s.I)n.push(s);if(t=t.P,s=e.type||e,"string"==typeof e)e=new wt(e,t);else if(e instanceof wt)e.target=e.target||t;else{var r=e;J(e=new wt(s,t),r)}if(r=!0,n)for(var i=n.length-1;0<=i;i--){var o=e.g=n[i];r=jt(o,s,!0,e)&&r}if(r=jt(o=e.g=t,s,!0,e)&&r,r=jt(o,s,!1,e)&&r,n)for(i=0;i<n.length;i++)r=jt(o=e.g=n[i],s,!1,e)&&r}function jt(t,e,n,s){if(!(e=t.i.g[String(e)]))return!0;e=e.concat();for(var r=!0,i=0;i<e.length;++i){var o=e[i];if(o&&!o.ca&&o.capture==n){var a=o.listener,c=o.ia||o.src;o.fa&&Nt(t.i,o),r=!1!==a.call(c,s)&&r}}return r&&!s.defaultPrevented}M(qt,F),qt.prototype[Et]=!0,qt.prototype.removeEventListener=function(t,e,n,s){Lt(this,t,e,n,s)},qt.prototype.M=function(){if(qt.Z.M.call(this),this.i){var t,e=this.i;for(t in e.g){for(var n=e.g[t],s=0;s<n.length;s++)St(n[s]);delete e.g[t],e.h--}}this.I=null},qt.prototype.N=function(t,e,n,s){return this.i.add(String(t),e,!1,n,s)},qt.prototype.O=function(t,e,n,s){return this.i.add(String(t),e,!0,n,s)};var Kt=_.JSON.stringify;function $t(){var t=Xt;let e=null;return t.g&&(e=t.g,t.g=t.g.next,t.g||(t.h=null),e.next=null),e}var Gt,Ht=new class{constructor(t,e){this.i=t,this.j=e,this.h=0,this.g=null}get(){let t;return 0<this.h?(this.h--,t=this.g,this.g=t.next,t.next=null):t=this.i(),t}}((()=>new zt),(t=>t.reset()));class zt{constructor(){this.next=this.g=this.h=null}set(t,e){this.h=t,this.g=e,this.next=null}reset(){this.next=this.g=this.h=null}}function Qt(t){_.setTimeout((()=>{throw t}),0)}function Wt(t,e){Gt||function(){var t=_.Promise.resolve(void 0);Gt=function(){t.then(Jt)}}(),Yt||(Gt(),Yt=!0),Xt.add(t,e)}var Yt=!1,Xt=new class{constructor(){this.h=this.g=null}add(t,e){const n=Ht.get();n.set(t,e),this.h?this.h.next=n:this.g=n,this.h=n}};function Jt(){for(var t;t=$t();){try{t.h.call(t.g)}catch(t){Qt(t)}var e=Ht;e.j(t),100>e.h&&(e.h++,t.next=e.g,e.g=t)}Yt=!1}function Zt(t,e){qt.call(this),this.h=t||1,this.g=e||_,this.j=L(this.kb,this),this.l=Date.now()}function te(t){t.da=!1,t.S&&(t.g.clearTimeout(t.S),t.S=null)}function ee(t,e,n){if("function"==typeof t)n&&(t=L(t,n));else{if(!t||"function"!=typeof t.handleEvent)throw Error("Invalid listener argument");t=L(t.handleEvent,t)}return 2147483647<Number(e)?-1:_.setTimeout(t,e||0)}function ne(t){t.g=ee((()=>{t.g=null,t.i&&(t.i=!1,ne(t))}),t.j);const e=t.h;t.h=null,t.m.apply(null,e)}M(Zt,qt),(T=Zt.prototype).da=!1,T.S=null,T.kb=function(){if(this.da){var t=Date.now()-this.l;0<t&&t<.8*this.h?this.S=this.g.setTimeout(this.j,this.h-t):(this.S&&(this.g.clearTimeout(this.S),this.S=null),Bt(this,"tick"),this.da&&(te(this),this.start()))}},T.start=function(){this.da=!0,this.S||(this.S=this.g.setTimeout(this.j,this.h),this.l=Date.now())},T.M=function(){Zt.Z.M.call(this),te(this),delete this.g};class se extends F{constructor(t,e){super(),this.m=t,this.j=e,this.h=null,this.i=!1,this.g=null}l(t){this.h=arguments,this.g?this.i=!0:ne(this)}M(){super.M(),this.g&&(_.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function re(t){F.call(this),this.h=t,this.g={}}M(re,F);var ie=[];function oe(t,e,n,s){Array.isArray(n)||(n&&(ie[0]=n.toString()),n=ie);for(var r=0;r<n.length;r++){var i=Ct(e,n[r],s||t.handleEvent,!1,t.h||t);if(!i)break;t.g[i.key]=i}}function ae(t){W(t.g,(function(t,e){this.g.hasOwnProperty(e)&&Ot(t)}),t),t.g={}}function ce(){this.g=!0}function ue(t,e,n,s){t.info((function(){return"XMLHTTP TEXT ("+e+"): "+function(t,e){if(!t.g)return e;if(!e)return null;try{var n=JSON.parse(e);if(n)for(t=0;t<n.length;t++)if(Array.isArray(n[t])){var s=n[t];if(!(2>s.length)){var r=s[1];if(Array.isArray(r)&&!(1>r.length)){var i=r[0];if("noop"!=i&&"stop"!=i&&"close"!=i)for(var o=1;o<r.length;o++)r[o]=""}}}return Kt(n)}catch(t){return e}}(t,n)+(s?" "+s:"")}))}re.prototype.M=function(){re.Z.M.call(this),ae(this)},re.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")},ce.prototype.Aa=function(){this.g=!1},ce.prototype.info=function(){};var he={},le=null;function de(){return le=le||new qt}function fe(t){wt.call(this,he.Ma,t)}function ge(t){const e=de();Bt(e,new fe(e,t))}function me(t,e){wt.call(this,he.STAT_EVENT,t),this.stat=e}function pe(t){const e=de();Bt(e,new me(e,t))}function ye(t,e){wt.call(this,he.Na,t),this.size=e}function we(t,e){if("function"!=typeof t)throw Error("Fn must not be null and must be a function");return _.setTimeout((function(){t()}),e)}he.Ma="serverreachability",M(fe,wt),he.STAT_EVENT="statevent",M(me,wt),he.Na="timingevent",M(ye,wt);var ve={NO_ERROR:0,lb:1,yb:2,xb:3,sb:4,wb:5,zb:6,Ja:7,TIMEOUT:8,Cb:9},be={qb:"complete",Mb:"success",Ka:"error",Ja:"abort",Eb:"ready",Fb:"readystatechange",TIMEOUT:"timeout",Ab:"incrementaldata",Db:"progress",tb:"downloadprogress",Ub:"uploadprogress"};function Ee(){}function Te(t){return t.h||(t.h=t.i())}function Ie(){}Ee.prototype.h=null;var Se,_e={OPEN:"a",pb:"b",Ka:"c",Bb:"d"};function Ne(){wt.call(this,"d")}function Ae(){wt.call(this,"c")}function De(){}function xe(t,e,n,s){this.l=t,this.j=e,this.m=n,this.X=s||1,this.V=new re(this),this.P=ke,t=it?125:void 0,this.W=new Zt(t),this.H=null,this.i=!1,this.s=this.A=this.v=this.K=this.F=this.Y=this.B=null,this.D=[],this.g=null,this.C=0,this.o=this.u=null,this.N=-1,this.I=!1,this.O=0,this.L=null,this.aa=this.J=this.$=this.U=!1,this.h=new Ce}function Ce(){this.i=null,this.g="",this.h=!1}M(Ne,wt),M(Ae,wt),M(De,Ee),De.prototype.g=function(){return new XMLHttpRequest},De.prototype.i=function(){return{}},Se=new De;var ke=45e3,Re={},Le={};function Oe(t,e,n){t.K=1,t.v=sn(Xe(e)),t.s=n,t.U=!0,Me(t,null)}function Me(t,e){t.F=Date.now(),Ue(t),t.A=Xe(t.v);var n=t.A,s=t.X;Array.isArray(s)||(s=[String(s)]),yn(n.h,"t",s),t.C=0,n=t.l.H,t.h=new Ce,t.g=ys(t.l,n?e:null,!t.s),0<t.O&&(t.L=new se(L(t.Ia,t,t.g),t.O)),oe(t.V,t.g,"readystatechange",t.gb),e=t.H?Y(t.H):{},t.s?(t.u||(t.u="POST"),e["Content-Type"]="application/x-www-form-urlencoded",t.g.ea(t.A,t.u,t.s,e)):(t.u="GET",t.g.ea(t.A,t.u,null,e)),ge(1),function(t,e,n,s,r,i){t.info((function(){if(t.g)if(i)for(var o="",a=i.split("&"),c=0;c<a.length;c++){var u=a[c].split("=");if(1<u.length){var h=u[0];u=u[1];var l=h.split("_");o=2<=l.length&&"type"==l[1]?o+(h+"=")+u+"&":o+(h+"=redacted&")}}else o=null;else o=i;return"XMLHTTP REQ ("+s+") [attempt "+r+"]: "+e+"\n"+n+"\n"+o}))}(t.j,t.u,t.A,t.m,t.X,t.s)}function Fe(t){return!!t.g&&("GET"==t.u&&2!=t.K&&t.l.Ba)}function Pe(t,e,n){let s,r=!0;for(;!t.I&&t.C<n.length;){if(s=Ve(t,n),s==Le){4==e&&(t.o=4,pe(14),r=!1),ue(t.j,t.m,null,"[Incomplete Response]");break}if(s==Re){t.o=4,pe(15),ue(t.j,t.m,n,"[Invalid Chunk]"),r=!1;break}ue(t.j,t.m,s,null),$e(t,s)}Fe(t)&&s!=Le&&s!=Re&&(t.h.g="",t.C=0),4!=e||0!=n.length||t.h.h||(t.o=1,pe(16),r=!1),t.i=t.i&&r,r?0<n.length&&!t.aa&&(t.aa=!0,(e=t.l).g==t&&e.$&&!e.L&&(e.h.info("Great, no buffering proxy detected. Bytes received: "+n.length),us(e),e.L=!0,pe(11))):(ue(t.j,t.m,n,"[Invalid Chunked Response]"),Ke(t),je(t))}function Ve(t,e){var n=t.C,s=e.indexOf("\n",n);return-1==s?Le:(n=Number(e.substring(n,s)),isNaN(n)?Re:(s+=1)+n>e.length?Le:(e=e.substr(s,n),t.C=s+n,e))}function Ue(t){t.Y=Date.now()+t.P,qe(t,t.P)}function qe(t,e){if(null!=t.B)throw Error("WatchDog timer not null");t.B=we(L(t.eb,t),e)}function Be(t){t.B&&(_.clearTimeout(t.B),t.B=null)}function je(t){0==t.l.G||t.I||ds(t.l,t)}function Ke(t){Be(t);var e=t.L;e&&"function"==typeof e.na&&e.na(),t.L=null,te(t.W),ae(t.V),t.g&&(e=t.g,t.g=null,e.abort(),e.na())}function $e(t,e){try{var n=t.l;if(0!=n.G&&(n.g==t||In(n.i,t)))if(n.I=t.N,!t.J&&In(n.i,t)&&3==n.G){try{var s=n.Ca.g.parse(e)}catch(t){s=null}if(Array.isArray(s)&&3==s.length){var r=s;if(0==r[0]){t:if(!n.u){if(n.g){if(!(n.g.F+3e3<t.F))break t;ls(n),ts(n)}cs(n),pe(18)}}else n.ta=r[1],0<n.ta-n.U&&37500>r[2]&&n.N&&0==n.A&&!n.v&&(n.v=we(L(n.ab,n),6e3));if(1>=Tn(n.i)&&n.ka){try{n.ka()}catch(t){}n.ka=void 0}}else gs(n,11)}else if((t.J||n.g==t)&&ls(n),!j(e))for(r=n.Ca.g.parse(e),e=0;e<r.length;e++){let u=r[e];if(n.U=u[0],u=u[1],2==n.G)if("c"==u[0]){n.J=u[1],n.la=u[2];const e=u[3];null!=e&&(n.ma=e,n.h.info("VER="+n.ma));const r=u[4];null!=r&&(n.za=r,n.h.info("SVER="+n.za));const h=u[5];null!=h&&"number"==typeof h&&0<h&&(s=1.5*h,n.K=s,n.h.info("backChannelRequestTimeoutMs_="+s)),s=n;const l=t.g;if(l){const t=l.g?l.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(t){var i=s.i;!i.g&&(G(t,"spdy")||G(t,"quic")||G(t,"h2"))&&(i.j=i.l,i.g=new Set,i.h&&(Sn(i,i.h),i.h=null))}if(s.D){const t=l.g?l.g.getResponseHeader("X-HTTP-Session-Id"):null;t&&(s.sa=t,nn(s.F,s.D,t))}}n.G=3,n.j&&n.j.xa(),n.$&&(n.O=Date.now()-t.F,n.h.info("Handshake RTT: "+n.O+"ms"));var o=t;if((s=n).oa=ps(s,s.H?s.la:null,s.W),o.J){_n(s.i,o);var a=o,c=s.K;c&&a.setTimeout(c),a.B&&(Be(a),Ue(a)),s.g=o}else as(s);0<n.l.length&&ss(n)}else"stop"!=u[0]&&"close"!=u[0]||gs(n,7);else 3==n.G&&("stop"==u[0]||"close"==u[0]?"stop"==u[0]?gs(n,7):Zn(n):"noop"!=u[0]&&n.j&&n.j.wa(u),n.A=0)}ge(4)}catch(t){}}function Ge(t,e){if(t.forEach&&"function"==typeof t.forEach)t.forEach(e,void 0);else if(A(t)||"string"==typeof t)U(t,e,void 0);else{if(t.T&&"function"==typeof t.T)var n=t.T();else if(t.R&&"function"==typeof t.R)n=void 0;else if(A(t)||"string"==typeof t){n=[];for(var s=t.length,r=0;r<s;r++)n.push(r)}else for(r in n=[],s=0,t)n[s++]=r;s=function(t){if(t.R&&"function"==typeof t.R)return t.R();if("string"==typeof t)return t.split("");if(A(t)){for(var e=[],n=t.length,s=0;s<n;s++)e.push(t[s]);return e}for(s in e=[],n=0,t)e[n++]=t[s];return e}(t),r=s.length;for(var i=0;i<r;i++)e.call(void 0,s[i],n&&n[i],t)}}function He(t,e){this.h={},this.g=[],this.i=0;var n=arguments.length;if(1<n){if(n%2)throw Error("Uneven number of arguments");for(var s=0;s<n;s+=2)this.set(arguments[s],arguments[s+1])}else if(t)if(t instanceof He)for(n=t.T(),s=0;s<n.length;s++)this.set(n[s],t.get(n[s]));else for(s in t)this.set(s,t[s])}function ze(t){if(t.i!=t.g.length){for(var e=0,n=0;e<t.g.length;){var s=t.g[e];Qe(t.h,s)&&(t.g[n++]=s),e++}t.g.length=n}if(t.i!=t.g.length){var r={};for(n=e=0;e<t.g.length;)Qe(r,s=t.g[e])||(t.g[n++]=s,r[s]=1),e++;t.g.length=n}}function Qe(t,e){return Object.prototype.hasOwnProperty.call(t,e)}(T=xe.prototype).setTimeout=function(t){this.P=t},T.gb=function(t){t=t.target;const e=this.L;e&&3==Qn(t)?e.l():this.Ia(t)},T.Ia=function(t){try{if(t==this.g)t:{const h=Qn(this.g);var e=this.g.Da();const l=this.g.ba();if(!(3>h)&&(3!=h||it||this.g&&(this.h.h||this.g.ga()||Wn(this.g)))){this.I||4!=h||7==e||ge(8==e||0>=l?3:2),Be(this);var n=this.g.ba();this.N=n;e:if(Fe(this)){var s=Wn(this.g);t="";var r=s.length,i=4==Qn(this.g);if(!this.h.i){if("undefined"==typeof TextDecoder){Ke(this),je(this);var o="";break e}this.h.i=new _.TextDecoder}for(e=0;e<r;e++)this.h.h=!0,t+=this.h.i.decode(s[e],{stream:i&&e==r-1});s.splice(0,r),this.h.g+=t,this.C=0,o=this.h.g}else o=this.g.ga();if(this.i=200==n,function(t,e,n,s,r,i,o){t.info((function(){return"XMLHTTP RESP ("+s+") [ attempt "+r+"]: "+e+"\n"+n+"\n"+i+" "+o}))}(this.j,this.u,this.A,this.m,this.X,h,n),this.i){if(this.$&&!this.J){e:{if(this.g){var a,c=this.g;if((a=c.g?c.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!j(a)){var u=a;break e}}u=null}if(!(n=u)){this.i=!1,this.o=3,pe(12),Ke(this),je(this);break t}ue(this.j,this.m,n,"Initial handshake response via X-HTTP-Initial-Response"),this.J=!0,$e(this,n)}this.U?(Pe(this,h,o),it&&this.i&&3==h&&(oe(this.V,this.W,"tick",this.fb),this.W.start())):(ue(this.j,this.m,o,null),$e(this,o)),4==h&&Ke(this),this.i&&!this.I&&(4==h?ds(this.l,this):(this.i=!1,Ue(this)))}else 400==n&&0<o.indexOf("Unknown SID")?(this.o=3,pe(12)):(this.o=0,pe(13)),Ke(this),je(this)}}}catch(t){}},T.fb=function(){if(this.g){var t=Qn(this.g),e=this.g.ga();this.C<e.length&&(Be(this),Pe(this,t,e),this.i&&4!=t&&Ue(this))}},T.cancel=function(){this.I=!0,Ke(this)},T.eb=function(){this.B=null;const t=Date.now();0<=t-this.Y?(function(t,e){t.info((function(){return"TIMEOUT: "+e}))}(this.j,this.A),2!=this.K&&(ge(3),pe(17)),Ke(this),this.o=2,je(this)):qe(this,this.Y-t)},(T=He.prototype).R=function(){ze(this);for(var t=[],e=0;e<this.g.length;e++)t.push(this.h[this.g[e]]);return t},T.T=function(){return ze(this),this.g.concat()},T.get=function(t,e){return Qe(this.h,t)?this.h[t]:e},T.set=function(t,e){Qe(this.h,t)||(this.i++,this.g.push(t)),this.h[t]=e},T.forEach=function(t,e){for(var n=this.T(),s=0;s<n.length;s++){var r=n[s],i=this.get(r);t.call(e,i,r,this)}};var We=/^(?:([^:/?#.]+):)?(?:\/\/(?:([^\\/?#]*)@)?([^\\/?#]*?)(?::([0-9]+))?(?=[\\/?#]|$))?([^?#]+)?(?:\?([^#]*))?(?:#([\s\S]*))?$/;function Ye(t,e){if(this.i=this.s=this.j="",this.m=null,this.o=this.l="",this.g=!1,t instanceof Ye){this.g=void 0!==e?e:t.g,Je(this,t.j),this.s=t.s,Ze(this,t.i),tn(this,t.m),this.l=t.l,e=t.h;var n=new fn;n.i=e.i,e.g&&(n.g=new He(e.g),n.h=e.h),en(this,n),this.o=t.o}else t&&(n=String(t).match(We))?(this.g=!!e,Je(this,n[1]||"",!0),this.s=rn(n[2]||""),Ze(this,n[3]||"",!0),tn(this,n[4]),this.l=rn(n[5]||"",!0),en(this,n[6]||"",!0),this.o=rn(n[7]||"")):(this.g=!!e,this.h=new fn(null,this.g))}function Xe(t){return new Ye(t)}function Je(t,e,n){t.j=n?rn(e,!0):e,t.j&&(t.j=t.j.replace(/:$/,""))}function Ze(t,e,n){t.i=n?rn(e,!0):e}function tn(t,e){if(e){if(e=Number(e),isNaN(e)||0>e)throw Error("Bad port number "+e);t.m=e}else t.m=null}function en(t,e,n){e instanceof fn?(t.h=e,function(t,e){e&&!t.j&&(gn(t),t.i=null,t.g.forEach((function(t,e){var n=e.toLowerCase();e!=n&&(mn(this,e),yn(this,n,t))}),t)),t.j=e}(t.h,t.g)):(n||(e=on(e,ln)),t.h=new fn(e,t.g))}function nn(t,e,n){t.h.set(e,n)}function sn(t){return nn(t,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36)),t}function rn(t,e){return t?e?decodeURI(t.replace(/%25/g,"%2525")):decodeURIComponent(t):""}function on(t,e,n){return"string"==typeof t?(t=encodeURI(t).replace(e,an),n&&(t=t.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),t):null}function an(t){return"%"+((t=t.charCodeAt(0))>>4&15).toString(16)+(15&t).toString(16)}Ye.prototype.toString=function(){var t=[],e=this.j;e&&t.push(on(e,cn,!0),":");var n=this.i;return(n||"file"==e)&&(t.push("//"),(e=this.s)&&t.push(on(e,cn,!0),"@"),t.push(encodeURIComponent(String(n)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),null!=(n=this.m)&&t.push(":",String(n))),(n=this.l)&&(this.i&&"/"!=n.charAt(0)&&t.push("/"),t.push(on(n,"/"==n.charAt(0)?hn:un,!0))),(n=this.h.toString())&&t.push("?",n),(n=this.o)&&t.push("#",on(n,dn)),t.join("")};var cn=/[#\/\?@]/g,un=/[#\?:]/g,hn=/[#\?]/g,ln=/[#\?@]/g,dn=/#/g;function fn(t,e){this.h=this.g=null,this.i=t||null,this.j=!!e}function gn(t){t.g||(t.g=new He,t.h=0,t.i&&function(t,e){if(t){t=t.split("&");for(var n=0;n<t.length;n++){var s=t[n].indexOf("="),r=null;if(0<=s){var i=t[n].substring(0,s);r=t[n].substring(s+1)}else i=t[n];e(i,r?decodeURIComponent(r.replace(/\+/g," ")):"")}}}(t.i,(function(e,n){t.add(decodeURIComponent(e.replace(/\+/g," ")),n)})))}function mn(t,e){gn(t),e=wn(t,e),Qe(t.g.h,e)&&(t.i=null,t.h-=t.g.get(e).length,Qe((t=t.g).h,e)&&(delete t.h[e],t.i--,t.g.length>2*t.i&&ze(t)))}function pn(t,e){return gn(t),e=wn(t,e),Qe(t.g.h,e)}function yn(t,e,n){mn(t,e),0<n.length&&(t.i=null,t.g.set(wn(t,e),B(n)),t.h+=n.length)}function wn(t,e){return e=String(e),t.j&&(e=e.toLowerCase()),e}(T=fn.prototype).add=function(t,e){gn(this),this.i=null,t=wn(this,t);var n=this.g.get(t);return n||this.g.set(t,n=[]),n.push(e),this.h+=1,this},T.forEach=function(t,e){gn(this),this.g.forEach((function(n,s){U(n,(function(n){t.call(e,n,s,this)}),this)}),this)},T.T=function(){gn(this);for(var t=this.g.R(),e=this.g.T(),n=[],s=0;s<e.length;s++)for(var r=t[s],i=0;i<r.length;i++)n.push(e[s]);return n},T.R=function(t){gn(this);var e=[];if("string"==typeof t)pn(this,t)&&(e=q(e,this.g.get(wn(this,t))));else{t=this.g.R();for(var n=0;n<t.length;n++)e=q(e,t[n])}return e},T.set=function(t,e){return gn(this),this.i=null,pn(this,t=wn(this,t))&&(this.h-=this.g.get(t).length),this.g.set(t,[e]),this.h+=1,this},T.get=function(t,e){return t&&0<(t=this.R(t)).length?String(t[0]):e},T.toString=function(){if(this.i)return this.i;if(!this.g)return"";for(var t=[],e=this.g.T(),n=0;n<e.length;n++){var s=e[n],r=encodeURIComponent(String(s));s=this.R(s);for(var i=0;i<s.length;i++){var o=r;""!==s[i]&&(o+="="+encodeURIComponent(String(s[i]))),t.push(o)}}return this.i=t.join("&")};function vn(t){this.l=t||bn,_.PerformanceNavigationTiming?t=0<(t=_.performance.getEntriesByType("navigation")).length&&("hq"==t[0].nextHopProtocol||"h2"==t[0].nextHopProtocol):t=!!(_.g&&_.g.Ea&&_.g.Ea()&&_.g.Ea().Zb),this.j=t?this.l:1,this.g=null,1<this.j&&(this.g=new Set),this.h=null,this.i=[]}var bn=10;function En(t){return!!t.h||!!t.g&&t.g.size>=t.j}function Tn(t){return t.h?1:t.g?t.g.size:0}function In(t,e){return t.h?t.h==e:!!t.g&&t.g.has(e)}function Sn(t,e){t.g?t.g.add(e):t.h=e}function _n(t,e){t.h&&t.h==e?t.h=null:t.g&&t.g.has(e)&&t.g.delete(e)}function Nn(t){if(null!=t.h)return t.i.concat(t.h.D);if(null!=t.g&&0!==t.g.size){let e=t.i;for(const n of t.g.values())e=e.concat(n.D);return e}return B(t.i)}function An(){}function Dn(){this.g=new An}function xn(t,e,n){const s=n||"";try{Ge(t,(function(t,n){let r=t;D(t)&&(r=Kt(t)),e.push(s+n+"="+encodeURIComponent(r))}))}catch(t){throw e.push(s+"type="+encodeURIComponent("_badmap")),t}}function Cn(t,e,n,s,r){try{e.onload=null,e.onerror=null,e.onabort=null,e.ontimeout=null,r(s)}catch(t){}}function kn(t){this.l=t.$b||null,this.j=t.ib||!1}function Rn(t,e){qt.call(this),this.D=t,this.u=e,this.m=void 0,this.readyState=Ln,this.status=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.v=new Headers,this.h=null,this.C="GET",this.B="",this.g=!1,this.A=this.j=this.l=null}vn.prototype.cancel=function(){if(this.i=Nn(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&0!==this.g.size){for(const t of this.g.values())t.cancel();this.g.clear()}},An.prototype.stringify=function(t){return _.JSON.stringify(t,void 0)},An.prototype.parse=function(t){return _.JSON.parse(t,void 0)},M(kn,Ee),kn.prototype.g=function(){return new Rn(this.l,this.j)},kn.prototype.i=function(t){return function(){return t}}({}),M(Rn,qt);var Ln=0;function On(t){t.j.read().then(t.Sa.bind(t)).catch(t.ha.bind(t))}function Mn(t){t.readyState=4,t.l=null,t.j=null,t.A=null,Fn(t)}function Fn(t){t.onreadystatechange&&t.onreadystatechange.call(t)}(T=Rn.prototype).open=function(t,e){if(this.readyState!=Ln)throw this.abort(),Error("Error reopening a connection");this.C=t,this.B=e,this.readyState=1,Fn(this)},T.send=function(t){if(1!=this.readyState)throw this.abort(),Error("need to call open() first. ");this.g=!0;const e={headers:this.v,method:this.C,credentials:this.m,cache:void 0};t&&(e.body=t),(this.D||_).fetch(new Request(this.B,e)).then(this.Va.bind(this),this.ha.bind(this))},T.abort=function(){this.response=this.responseText="",this.v=new Headers,this.status=0,this.j&&this.j.cancel("Request was aborted."),1<=this.readyState&&this.g&&4!=this.readyState&&(this.g=!1,Mn(this)),this.readyState=Ln},T.Va=function(t){if(this.g&&(this.l=t,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=t.headers,this.readyState=2,Fn(this)),this.g&&(this.readyState=3,Fn(this),this.g)))if("arraybuffer"===this.responseType)t.arrayBuffer().then(this.Ta.bind(this),this.ha.bind(this));else if(void 0!==_.ReadableStream&&"body"in t){if(this.j=t.body.getReader(),this.u){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.A=new TextDecoder;On(this)}else t.text().then(this.Ua.bind(this),this.ha.bind(this))},T.Sa=function(t){if(this.g){if(this.u&&t.value)this.response.push(t.value);else if(!this.u){var e=t.value?t.value:new Uint8Array(0);(e=this.A.decode(e,{stream:!t.done}))&&(this.response=this.responseText+=e)}t.done?Mn(this):Fn(this),3==this.readyState&&On(this)}},T.Ua=function(t){this.g&&(this.response=this.responseText=t,Mn(this))},T.Ta=function(t){this.g&&(this.response=t,Mn(this))},T.ha=function(){this.g&&Mn(this)},T.setRequestHeader=function(t,e){this.v.append(t,e)},T.getResponseHeader=function(t){return this.h&&this.h.get(t.toLowerCase())||""},T.getAllResponseHeaders=function(){if(!this.h)return"";const t=[],e=this.h.entries();for(var n=e.next();!n.done;)n=n.value,t.push(n[0]+": "+n[1]),n=e.next();return t.join("\r\n")},Object.defineProperty(Rn.prototype,"withCredentials",{get:function(){return"include"===this.m},set:function(t){this.m=t?"include":"same-origin"}});var Pn=_.JSON.parse;function Vn(t){qt.call(this),this.headers=new He,this.u=t||null,this.h=!1,this.C=this.g=null,this.H="",this.m=0,this.j="",this.l=this.F=this.v=this.D=!1,this.B=0,this.A=null,this.J=Un,this.K=this.L=!1}M(Vn,qt);var Un="",qn=/^https?$/i,Bn=["POST","PUT"];function jn(t){return"content-type"==t.toLowerCase()}function Kn(t,e){t.h=!1,t.g&&(t.l=!0,t.g.abort(),t.l=!1),t.j=e,t.m=5,$n(t),Hn(t)}function $n(t){t.D||(t.D=!0,Bt(t,"complete"),Bt(t,"error"))}function Gn(t){if(t.h&&void 0!==S&&(!t.C[1]||4!=Qn(t)||2!=t.ba()))if(t.v&&4==Qn(t))ee(t.Fa,0,t);else if(Bt(t,"readystatechange"),4==Qn(t)){t.h=!1;try{const a=t.ba();t:switch(a){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var e=!0;break t;default:e=!1}var n;if(!(n=e)){var s;if(s=0===a){var r=String(t.H).match(We)[1]||null;if(!r&&_.self&&_.self.location){var i=_.self.location.protocol;r=i.substr(0,i.length-1)}s=!qn.test(r?r.toLowerCase():"")}n=s}if(n)Bt(t,"complete"),Bt(t,"success");else{t.m=6;try{var o=2<Qn(t)?t.g.statusText:""}catch(t){o=""}t.j=o+" ["+t.ba()+"]",$n(t)}}finally{Hn(t)}}}function Hn(t,e){if(t.g){zn(t);const n=t.g,s=t.C[0]?N:null;t.g=null,t.C=null,e||Bt(t,"ready");try{n.onreadystatechange=s}catch(t){}}}function zn(t){t.g&&t.K&&(t.g.ontimeout=null),t.A&&(_.clearTimeout(t.A),t.A=null)}function Qn(t){return t.g?t.g.readyState:0}function Wn(t){try{if(!t.g)return null;if("response"in t.g)return t.g.response;switch(t.J){case Un:case"text":return t.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in t.g)return t.g.mozResponseArrayBuffer}return null}catch(t){return null}}function Yn(t,e,n){t:{for(s in n){var s=!1;break t}s=!0}s||(n=function(t){let e="";return W(t,(function(t,n){e+=n,e+=":",e+=t,e+="\r\n"})),e}(n),"string"==typeof t?null!=n&&encodeURIComponent(String(n)):nn(t,e,n))}function Xn(t,e,n){return n&&n.internalChannelParams&&n.internalChannelParams[t]||e}function Jn(t){this.za=0,this.l=[],this.h=new ce,this.la=this.oa=this.F=this.W=this.g=this.sa=this.D=this.aa=this.o=this.P=this.s=null,this.Za=this.V=0,this.Xa=Xn("failFast",!1,t),this.N=this.v=this.u=this.m=this.j=null,this.X=!0,this.I=this.ta=this.U=-1,this.Y=this.A=this.C=0,this.Pa=Xn("baseRetryDelayMs",5e3,t),this.$a=Xn("retryDelaySeedMs",1e4,t),this.Ya=Xn("forwardChannelMaxRetries",2,t),this.ra=Xn("forwardChannelRequestTimeoutMs",2e4,t),this.qa=t&&t.xmlHttpFactory||void 0,this.Ba=t&&t.Yb||!1,this.K=void 0,this.H=t&&t.supportsCrossDomainXhr||!1,this.J="",this.i=new vn(t&&t.concurrentRequestLimit),this.Ca=new Dn,this.ja=t&&t.fastHandshake||!1,this.Ra=t&&t.Wb||!1,t&&t.Aa&&this.h.Aa(),t&&t.forceLongPolling&&(this.X=!1),this.$=!this.ja&&this.X&&t&&t.detectBufferingProxy||!1,this.ka=void 0,this.O=0,this.L=!1,this.B=null,this.Wa=!t||!1!==t.Xb}function Zn(t){if(es(t),3==t.G){var e=t.V++,n=Xe(t.F);nn(n,"SID",t.J),nn(n,"RID",e),nn(n,"TYPE","terminate"),is(t,n),(e=new xe(t,t.h,e,void 0)).K=2,e.v=sn(Xe(n)),n=!1,_.navigator&&_.navigator.sendBeacon&&(n=_.navigator.sendBeacon(e.v.toString(),"")),!n&&_.Image&&((new Image).src=e.v,n=!0),n||(e.g=ys(e.l,null),e.g.ea(e.v)),e.F=Date.now(),Ue(e)}ms(t)}function ts(t){t.g&&(us(t),t.g.cancel(),t.g=null)}function es(t){ts(t),t.u&&(_.clearTimeout(t.u),t.u=null),ls(t),t.i.cancel(),t.m&&("number"==typeof t.m&&_.clearTimeout(t.m),t.m=null)}function ns(t,e){t.l.push(new class{constructor(t,e){this.h=t,this.g=e}}(t.Za++,e)),3==t.G&&ss(t)}function ss(t){En(t.i)||t.m||(t.m=!0,Wt(t.Ha,t),t.C=0)}function rs(t,e){var n;n=e?e.m:t.V++;const s=Xe(t.F);nn(s,"SID",t.J),nn(s,"RID",n),nn(s,"AID",t.U),is(t,s),t.o&&t.s&&Yn(s,t.o,t.s),n=new xe(t,t.h,n,t.C+1),null===t.o&&(n.H=t.s),e&&(t.l=e.D.concat(t.l)),e=os(t,n,1e3),n.setTimeout(Math.round(.5*t.ra)+Math.round(.5*t.ra*Math.random())),Sn(t.i,n),Oe(n,s,e)}function is(t,e){t.j&&Ge({},(function(t,n){nn(e,n,t)}))}function os(t,e,n){n=Math.min(t.l.length,n);var s=t.j?L(t.j.Oa,t.j,t):null;t:{var r=t.l;let e=-1;for(;;){const t=["count="+n];-1==e?0<n?(e=r[0].h,t.push("ofs="+e)):e=0:t.push("ofs="+e);let i=!0;for(let o=0;o<n;o++){let n=r[o].h;const a=r[o].g;if(n-=e,0>n)e=Math.max(0,r[o].h-100),i=!1;else try{xn(a,t,"req"+n+"_")}catch(t){s&&s(a)}}if(i){s=t.join("&");break t}}}return t=t.l.splice(0,n),e.D=t,s}function as(t){t.g||t.u||(t.Y=1,Wt(t.Ga,t),t.A=0)}function cs(t){return!(t.g||t.u||3<=t.A)&&(t.Y++,t.u=we(L(t.Ga,t),fs(t,t.A)),t.A++,!0)}function us(t){null!=t.B&&(_.clearTimeout(t.B),t.B=null)}function hs(t){t.g=new xe(t,t.h,"rpc",t.Y),null===t.o&&(t.g.H=t.s),t.g.O=0;var e=Xe(t.oa);nn(e,"RID","rpc"),nn(e,"SID",t.J),nn(e,"CI",t.N?"0":"1"),nn(e,"AID",t.U),is(t,e),nn(e,"TYPE","xmlhttp"),t.o&&t.s&&Yn(e,t.o,t.s),t.K&&t.g.setTimeout(t.K);var n=t.g;t=t.la,n.K=1,n.v=sn(Xe(e)),n.s=null,n.U=!0,Me(n,t)}function ls(t){null!=t.v&&(_.clearTimeout(t.v),t.v=null)}function ds(t,e){var n=null;if(t.g==e){ls(t),us(t),t.g=null;var s=2}else{if(!In(t.i,e))return;n=e.D,_n(t.i,e),s=1}if(t.I=e.N,0!=t.G)if(e.i)if(1==s){n=e.s?e.s.length:0,e=Date.now()-e.F;var r=t.C;Bt(s=de(),new ye(s,n,e,r)),ss(t)}else as(t);else if(3==(r=e.o)||0==r&&0<t.I||!(1==s&&function(t,e){return!(Tn(t.i)>=t.i.j-(t.m?1:0)||(t.m?(t.l=e.D.concat(t.l),0):1==t.G||2==t.G||t.C>=(t.Xa?0:t.Ya)||(t.m=we(L(t.Ha,t,e),fs(t,t.C)),t.C++,0)))}(t,e)||2==s&&cs(t)))switch(n&&0<n.length&&(e=t.i,e.i=e.i.concat(n)),r){case 1:gs(t,5);break;case 4:gs(t,10);break;case 3:gs(t,6);break;default:gs(t,2)}}function fs(t,e){let n=t.Pa+Math.floor(Math.random()*t.$a);return t.j||(n*=2),n*e}function gs(t,e){if(t.h.info("Error code "+e),2==e){var n=null;t.j&&(n=null);var s=L(t.jb,t);n||(n=new Ye("//www.google.com/images/cleardot.gif"),_.location&&"http"==_.location.protocol||Je(n,"https"),sn(n)),function(t,e){const n=new ce;if(_.Image){const s=new Image;s.onload=O(Cn,n,s,"TestLoadImage: loaded",!0,e),s.onerror=O(Cn,n,s,"TestLoadImage: error",!1,e),s.onabort=O(Cn,n,s,"TestLoadImage: abort",!1,e),s.ontimeout=O(Cn,n,s,"TestLoadImage: timeout",!1,e),_.setTimeout((function(){s.ontimeout&&s.ontimeout()}),1e4),s.src=t}else e(!1)}(n.toString(),s)}else pe(2);t.G=0,t.j&&t.j.va(e),ms(t),es(t)}function ms(t){t.G=0,t.I=-1,t.j&&(0==Nn(t.i).length&&0==t.l.length||(t.i.i.length=0,B(t.l),t.l.length=0),t.j.ua())}function ps(t,e,n){let s=function(t){return t instanceof Ye?Xe(t):new Ye(t,void 0)}(n);if(""!=s.i)e&&Ze(s,e+"."+s.i),tn(s,s.m);else{const t=_.location;s=function(t,e,n,s){var r=new Ye(null,void 0);return t&&Je(r,t),e&&Ze(r,e),n&&tn(r,n),s&&(r.l=s),r}(t.protocol,e?e+"."+t.hostname:t.hostname,+t.port,n)}return t.aa&&W(t.aa,(function(t,e){nn(s,e,t)})),e=t.D,n=t.sa,e&&n&&nn(s,e,n),nn(s,"VER",t.ma),is(t,s),s}function ys(t,e,n){if(e&&!t.H)throw Error("Can't create secondary domain capable XhrIo object.");return(e=n&&t.Ba&&!t.qa?new Vn(new kn({ib:!0})):new Vn(t.qa)).L=t.H,e}function ws(){}function vs(){if(st&&!(10<=Number(pt)))throw Error("Environmental error: no available transport.")}function bs(t,e){qt.call(this),this.g=new Jn(e),this.l=t,this.h=e&&e.messageUrlParams||null,t=e&&e.messageHeaders||null,e&&e.clientProtocolHeaderRequired&&(t?t["X-Client-Protocol"]="webchannel":t={"X-Client-Protocol":"webchannel"}),this.g.s=t,t=e&&e.initMessageHeaders||null,e&&e.messageContentType&&(t?t["X-WebChannel-Content-Type"]=e.messageContentType:t={"X-WebChannel-Content-Type":e.messageContentType}),e&&e.ya&&(t?t["X-WebChannel-Client-Profile"]=e.ya:t={"X-WebChannel-Client-Profile":e.ya}),this.g.P=t,(t=e&&e.httpHeadersOverwriteParam)&&!j(t)&&(this.g.o=t),this.A=e&&e.supportsCrossDomainXhr||!1,this.v=e&&e.sendRawJson||!1,(e=e&&e.httpSessionIdParam)&&!j(e)&&(this.g.D=e,null!==(t=this.h)&&e in t&&(e in(t=this.h)&&delete t[e])),this.j=new Is(this)}function Es(t){Ne.call(this);var e=t.__sm__;if(e){t:{for(const n in e){t=n;break t}t=void 0}(this.i=t)&&(t=this.i,e=null!==e&&t in e?e[t]:void 0),this.data=e}else this.data=t}function Ts(){Ae.call(this),this.status=1}function Is(t){this.g=t}(T=Vn.prototype).ea=function(t,e,n,s){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.H+"; newUri="+t);e=e?e.toUpperCase():"GET",this.H=t,this.j="",this.m=0,this.D=!1,this.h=!0,this.g=this.u?this.u.g():Se.g(),this.C=this.u?Te(this.u):Te(Se),this.g.onreadystatechange=L(this.Fa,this);try{this.F=!0,this.g.open(e,String(t),!0),this.F=!1}catch(t){return void Kn(this,t)}t=n||"";const r=new He(this.headers);s&&Ge(s,(function(t,e){r.set(e,t)})),s=function(t){t:{var e=jn;const n=t.length,s="string"==typeof t?t.split(""):t;for(let r=0;r<n;r++)if(r in s&&e.call(void 0,s[r],r,t)){e=r;break t}e=-1}return 0>e?null:"string"==typeof t?t.charAt(e):t[e]}(r.T()),n=_.FormData&&t instanceof _.FormData,!(0<=V(Bn,e))||s||n||r.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8"),r.forEach((function(t,e){this.g.setRequestHeader(e,t)}),this),this.J&&(this.g.responseType=this.J),"withCredentials"in this.g&&this.g.withCredentials!==this.L&&(this.g.withCredentials=this.L);try{zn(this),0<this.B&&((this.K=function(t){return st&&gt()&&"number"==typeof t.timeout&&void 0!==t.ontimeout}(this.g))?(this.g.timeout=this.B,this.g.ontimeout=L(this.pa,this)):this.A=ee(this.pa,this.B,this)),this.v=!0,this.g.send(t),this.v=!1}catch(t){Kn(this,t)}},T.pa=function(){void 0!==S&&this.g&&(this.j="Timed out after "+this.B+"ms, aborting",this.m=8,Bt(this,"timeout"),this.abort(8))},T.abort=function(t){this.g&&this.h&&(this.h=!1,this.l=!0,this.g.abort(),this.l=!1,this.m=t||7,Bt(this,"complete"),Bt(this,"abort"),Hn(this))},T.M=function(){this.g&&(this.h&&(this.h=!1,this.l=!0,this.g.abort(),this.l=!1),Hn(this,!0)),Vn.Z.M.call(this)},T.Fa=function(){this.s||(this.F||this.v||this.l?Gn(this):this.cb())},T.cb=function(){Gn(this)},T.ba=function(){try{return 2<Qn(this)?this.g.status:-1}catch(t){return-1}},T.ga=function(){try{return this.g?this.g.responseText:""}catch(t){return""}},T.Qa=function(t){if(this.g){var e=this.g.responseText;return t&&0==e.indexOf(t)&&(e=e.substring(t.length)),Pn(e)}},T.Da=function(){return this.m},T.La=function(){return"string"==typeof this.j?this.j:String(this.j)},(T=Jn.prototype).ma=8,T.G=1,T.hb=function(t){try{this.h.info("Origin Trials invoked: "+t)}catch(t){}},T.Ha=function(t){if(this.m)if(this.m=null,1==this.G){if(!t){this.V=Math.floor(1e5*Math.random()),t=this.V++;const r=new xe(this,this.h,t,void 0);let i=this.s;if(this.P&&(i?(i=Y(i),J(i,this.P)):i=this.P),null===this.o&&(r.H=i),this.ja)t:{for(var e=0,n=0;n<this.l.length;n++){var s=this.l[n];if(void 0===(s="__data__"in s.g&&"string"==typeof(s=s.g.__data__)?s.length:void 0))break;if(4096<(e+=s)){e=n;break t}if(4096===e||n===this.l.length-1){e=n+1;break t}}e=1e3}else e=1e3;e=os(this,r,e),nn(n=Xe(this.F),"RID",t),nn(n,"CVER",22),this.D&&nn(n,"X-HTTP-Session-Id",this.D),is(this,n),this.o&&i&&Yn(n,this.o,i),Sn(this.i,r),this.Ra&&nn(n,"TYPE","init"),this.ja?(nn(n,"$req",e),nn(n,"SID","null"),r.$=!0,Oe(r,n,null)):Oe(r,n,e),this.G=2}}else 3==this.G&&(t?rs(this,t):0==this.l.length||En(this.i)||rs(this))},T.Ga=function(){if(this.u=null,hs(this),this.$&&!(this.L||null==this.g||0>=this.O)){var t=2*this.O;this.h.info("BP detection timer enabled: "+t),this.B=we(L(this.bb,this),t)}},T.bb=function(){this.B&&(this.B=null,this.h.info("BP detection timeout reached."),this.h.info("Buffering proxy detected and switch to long-polling!"),this.N=!1,this.L=!0,pe(10),ts(this),hs(this))},T.ab=function(){null!=this.v&&(this.v=null,ts(this),cs(this),pe(19))},T.jb=function(t){t?(this.h.info("Successfully pinged google.com"),pe(2)):(this.h.info("Failed to ping google.com"),pe(1))},(T=ws.prototype).xa=function(){},T.wa=function(){},T.va=function(){},T.ua=function(){},T.Oa=function(){},vs.prototype.g=function(t,e){return new bs(t,e)},M(bs,qt),bs.prototype.m=function(){this.g.j=this.j,this.A&&(this.g.H=!0);var t=this.g,e=this.l,n=this.h||void 0;t.Wa&&(t.h.info("Origin Trials enabled."),Wt(L(t.hb,t,e))),pe(0),t.W=e,t.aa=n||{},t.N=t.X,t.F=ps(t,null,t.W),ss(t)},bs.prototype.close=function(){Zn(this.g)},bs.prototype.u=function(t){if("string"==typeof t){var e={};e.__data__=t,ns(this.g,e)}else this.v?((e={}).__data__=Kt(t),ns(this.g,e)):ns(this.g,t)},bs.prototype.M=function(){this.g.j=null,delete this.j,Zn(this.g),delete this.g,bs.Z.M.call(this)},M(Es,Ne),M(Ts,Ae),M(Is,ws),Is.prototype.xa=function(){Bt(this.g,"a")},Is.prototype.wa=function(t){Bt(this.g,new Es(t))},Is.prototype.va=function(t){Bt(this.g,new Ts(t))},Is.prototype.ua=function(){Bt(this.g,"b")},vs.prototype.createWebChannel=vs.prototype.g,bs.prototype.send=bs.prototype.u,bs.prototype.open=bs.prototype.m,bs.prototype.close=bs.prototype.close,ve.NO_ERROR=0,ve.TIMEOUT=8,ve.HTTP_ERROR=6,be.COMPLETE="complete",Ie.EventType=_e,_e.OPEN="a",_e.CLOSE="b",_e.ERROR="c",_e.MESSAGE="d",qt.prototype.listen=qt.prototype.N,Vn.prototype.listenOnce=Vn.prototype.O,Vn.prototype.getLastError=Vn.prototype.La,Vn.prototype.getLastErrorCode=Vn.prototype.Da,Vn.prototype.getStatus=Vn.prototype.ba,Vn.prototype.getResponseJson=Vn.prototype.Qa,Vn.prototype.getResponseText=Vn.prototype.ga,Vn.prototype.send=Vn.prototype.ea;var Ss=ve,_s=be,Ns=he,As=10,Ds=11,xs=kn,Cs=Ie,ks=Vn;const Rs="@firebase/firestore";
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ls{constructor(t){this.uid=t}isAuthenticated(){return null!=this.uid}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(t){return t.uid===this.uid}}Ls.UNAUTHENTICATED=new Ls(null),Ls.GOOGLE_CREDENTIALS=new Ls("google-credentials-uid"),Ls.FIRST_PARTY=new Ls("first-party-uid"),Ls.MOCK_USER=new Ls("mock-user");
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
let Os="9.3.0";
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ms=new class{constructor(t){this.name=t,this._logLevel=v,this._logHandler=E,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(t){if(!(t in p))throw new TypeError(`Invalid value "${t}" assigned to \`logLevel\``);this._logLevel=t}setLogLevel(t){this._logLevel="string"==typeof t?w[t]:t}get logHandler(){return this._logHandler}set logHandler(t){if("function"!=typeof t)throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=t}get userLogHandler(){return this._userLogHandler}set userLogHandler(t){this._userLogHandler=t}debug(...t){this._userLogHandler&&this._userLogHandler(this,p.DEBUG,...t),this._logHandler(this,p.DEBUG,...t)}log(...t){this._userLogHandler&&this._userLogHandler(this,p.VERBOSE,...t),this._logHandler(this,p.VERBOSE,...t)}info(...t){this._userLogHandler&&this._userLogHandler(this,p.INFO,...t),this._logHandler(this,p.INFO,...t)}warn(...t){this._userLogHandler&&this._userLogHandler(this,p.WARN,...t),this._logHandler(this,p.WARN,...t)}error(...t){this._userLogHandler&&this._userLogHandler(this,p.ERROR,...t),this._logHandler(this,p.ERROR,...t)}}("@firebase/firestore");function Fs(){return Ms.logLevel}function Ps(t){Ms.setLogLevel(t)}function Vs(t,...e){if(Ms.logLevel<=p.DEBUG){const n=e.map(Bs);Ms.debug(`Firestore (${Os}): ${t}`,...n)}}function Us(t,...e){if(Ms.logLevel<=p.ERROR){const n=e.map(Bs);Ms.error(`Firestore (${Os}): ${t}`,...n)}}function qs(t,...e){if(Ms.logLevel<=p.WARN){const n=e.map(Bs);Ms.warn(`Firestore (${Os}): ${t}`,...n)}}function Bs(t){if("string"==typeof t)return t;try{return e=t,JSON.stringify(e)}catch(e){return t}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var e}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function js(t="Unexpected state"){const e=`FIRESTORE (${Os}) INTERNAL ASSERTION FAILED: `+t;throw Us(e),new Error(e)}function Ks(t,e){t||js()}function $s(t,e){t||js()}function Gs(t,e){return t}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Hs={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class zs extends Error{constructor(t,e){super(e),this.code=t,this.message=e,this.name="FirebaseError",this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qs{constructor(){this.promise=new Promise(((t,e)=>{this.resolve=t,this.reject=e}))}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ws{constructor(t,e){this.user=e,this.type="OAuth",this.authHeaders={},this.authHeaders.Authorization=`Bearer ${t}`}}class Ys{getToken(){return Promise.resolve(null)}invalidateToken(){}start(t,e){t.enqueueRetryable((()=>e(Ls.UNAUTHENTICATED)))}shutdown(){}}class Xs{constructor(t){this.token=t,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(t,e){this.changeListener=e,t.enqueueRetryable((()=>e(this.token.user)))}shutdown(){this.changeListener=null}}class Js{constructor(t){this.t=t,this.currentUser=Ls.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(t,e){let n=this.i;const s=t=>this.i!==n?(n=this.i,e(t)):Promise.resolve();let r=new Qs;this.o=()=>{this.i++,this.currentUser=this.u(),r.resolve(),r=new Qs,t.enqueueRetryable((()=>s(this.currentUser)))};const i=()=>{const e=r;t.enqueueRetryable((async()=>{await e.promise,await s(this.currentUser)}))},o=t=>{Vs("FirebaseCredentialsProvider","Auth detected"),this.auth=t,this.auth.addAuthTokenListener(this.o),i()};this.t.onInit((t=>o(t))),setTimeout((()=>{if(!this.auth){const t=this.t.getImmediate({optional:!0});t?o(t):(Vs("FirebaseCredentialsProvider","Auth not yet detected"),r.resolve(),r=new Qs)}}),0),i()}getToken(){const t=this.i,e=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(e).then((e=>this.i!==t?(Vs("FirebaseCredentialsProvider","getToken aborted due to token change."),this.getToken()):e?(Ks("string"==typeof e.accessToken),new Ws(e.accessToken,this.currentUser)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.auth.removeAuthTokenListener(this.o)}u(){const t=this.auth&&this.auth.getUid();return Ks(null===t||"string"==typeof t),new Ls(t)}}class Zs{constructor(t,e,n){this.h=t,this.l=e,this.m=n,this.type="FirstParty",this.user=Ls.FIRST_PARTY}get authHeaders(){const t={"X-Goog-AuthUser":this.l},e=this.h.auth.getAuthHeaderValueForFirstParty([]);return e&&(t.Authorization=e),this.m&&(t["X-Goog-Iam-Authorization-Token"]=this.m),t}}class tr{constructor(t,e,n){this.h=t,this.l=e,this.m=n}getToken(){return Promise.resolve(new Zs(this.h,this.l,this.m))}start(t,e){t.enqueueRetryable((()=>e(Ls.FIRST_PARTY)))}shutdown(){}invalidateToken(){}}
/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class er{constructor(t,e){this.previousValue=t,e&&(e.sequenceNumberHandler=t=>this.g(t),this.p=t=>e.writeSequenceNumber(t))}g(t){return this.previousValue=Math.max(t,this.previousValue),this.previousValue}next(){const t=++this.previousValue;return this.p&&this.p(t),t}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nr(t){const e="undefined"!=typeof self&&(self.crypto||self.msCrypto),n=new Uint8Array(t);if(e&&"function"==typeof e.getRandomValues)e.getRandomValues(n);else for(let e=0;e<t;e++)n[e]=Math.floor(256*Math.random());return n}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */er.T=-1;class sr{static I(){const t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",e=Math.floor(256/t.length)*t.length;let n="";for(;n.length<20;){const s=nr(40);for(let r=0;r<s.length;++r)n.length<20&&s[r]<e&&(n+=t.charAt(s[r]%t.length))}return n}}function rr(t,e){return t<e?-1:t>e?1:0}function ir(t,e,n){return t.length===e.length&&t.every(((t,s)=>n(t,e[s])))}function or(t){return t+"\0"}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ar{constructor(t,e){if(this.seconds=t,this.nanoseconds=e,e<0)throw new zs(Hs.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+e);if(e>=1e9)throw new zs(Hs.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+e);if(t<-62135596800)throw new zs(Hs.INVALID_ARGUMENT,"Timestamp seconds out of range: "+t);if(t>=253402300800)throw new zs(Hs.INVALID_ARGUMENT,"Timestamp seconds out of range: "+t)}static now(){return ar.fromMillis(Date.now())}static fromDate(t){return ar.fromMillis(t.getTime())}static fromMillis(t){const e=Math.floor(t/1e3),n=Math.floor(1e6*(t-1e3*e));return new ar(e,n)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/1e6}_compareTo(t){return this.seconds===t.seconds?rr(this.nanoseconds,t.nanoseconds):rr(this.seconds,t.seconds)}isEqual(t){return t.seconds===this.seconds&&t.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{seconds:this.seconds,nanoseconds:this.nanoseconds}}valueOf(){const t=this.seconds- -62135596800;return String(t).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cr{constructor(t){this.timestamp=t}static fromTimestamp(t){return new cr(t)}static min(){return new cr(new ar(0,0))}compareTo(t){return this.timestamp._compareTo(t.timestamp)}isEqual(t){return this.timestamp.isEqual(t.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ur(t){let e=0;for(const n in t)Object.prototype.hasOwnProperty.call(t,n)&&e++;return e}function hr(t,e){for(const n in t)Object.prototype.hasOwnProperty.call(t,n)&&e(n,t[n])}function lr(t){for(const e in t)if(Object.prototype.hasOwnProperty.call(t,e))return!1;return!0}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dr{constructor(t,e,n){void 0===e?e=0:e>t.length&&js(),void 0===n?n=t.length-e:n>t.length-e&&js(),this.segments=t,this.offset=e,this.len=n}get length(){return this.len}isEqual(t){return 0===dr.comparator(this,t)}child(t){const e=this.segments.slice(this.offset,this.limit());return t instanceof dr?t.forEach((t=>{e.push(t)})):e.push(t),this.construct(e)}limit(){return this.offset+this.length}popFirst(t){return t=void 0===t?1:t,this.construct(this.segments,this.offset+t,this.length-t)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(t){return this.segments[this.offset+t]}isEmpty(){return 0===this.length}isPrefixOf(t){if(t.length<this.length)return!1;for(let e=0;e<this.length;e++)if(this.get(e)!==t.get(e))return!1;return!0}isImmediateParentOf(t){if(this.length+1!==t.length)return!1;for(let e=0;e<this.length;e++)if(this.get(e)!==t.get(e))return!1;return!0}forEach(t){for(let e=this.offset,n=this.limit();e<n;e++)t(this.segments[e])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(t,e){const n=Math.min(t.length,e.length);for(let s=0;s<n;s++){const n=t.get(s),r=e.get(s);if(n<r)return-1;if(n>r)return 1}return t.length<e.length?-1:t.length>e.length?1:0}}class fr extends dr{construct(t,e,n){return new fr(t,e,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}static fromString(...t){const e=[];for(const n of t){if(n.indexOf("//")>=0)throw new zs(Hs.INVALID_ARGUMENT,`Invalid segment (${n}). Paths must not contain // in them.`);e.push(...n.split("/").filter((t=>t.length>0)))}return new fr(e)}static emptyPath(){return new fr([])}}const gr=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class mr extends dr{construct(t,e,n){return new mr(t,e,n)}static isValidIdentifier(t){return gr.test(t)}canonicalString(){return this.toArray().map((t=>(t=t.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),mr.isValidIdentifier(t)||(t="`"+t+"`"),t))).join(".")}toString(){return this.canonicalString()}isKeyField(){return 1===this.length&&"__name__"===this.get(0)}static keyField(){return new mr(["__name__"])}static fromServerFormat(t){const e=[];let n="",s=0;const r=()=>{if(0===n.length)throw new zs(Hs.INVALID_ARGUMENT,`Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);e.push(n),n=""};let i=!1;for(;s<t.length;){const e=t[s];if("\\"===e){if(s+1===t.length)throw new zs(Hs.INVALID_ARGUMENT,"Path has trailing escape character: "+t);const e=t[s+1];if("\\"!==e&&"."!==e&&"`"!==e)throw new zs(Hs.INVALID_ARGUMENT,"Path has invalid escape sequence: "+t);n+=e,s+=2}else"`"===e?(i=!i,s++):"."!==e||i?(n+=e,s++):(r(),s++)}if(r(),i)throw new zs(Hs.INVALID_ARGUMENT,"Unterminated ` in path: "+t);return new mr(e)}static emptyPath(){return new mr([])}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pr{constructor(t){this.fields=t,t.sort(mr.comparator)}covers(t){for(const e of this.fields)if(e.isPrefixOf(t))return!0;return!1}isEqual(t){return ir(this.fields,t.fields,((t,e)=>t.isEqual(e)))}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yr(){return"undefined"!=typeof atob}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wr{constructor(t){this.binaryString=t}static fromBase64String(t){const e=atob(t);return new wr(e)}static fromUint8Array(t){const e=function(t){let e="";for(let n=0;n<t.length;++n)e+=String.fromCharCode(t[n]);return e}(t);return new wr(e)}toBase64(){var t;return t=this.binaryString,btoa(t)}toUint8Array(){return function(t){const e=new Uint8Array(t.length);for(let n=0;n<t.length;n++)e[n]=t.charCodeAt(n);return e}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(t){return rr(this.binaryString,t.binaryString)}isEqual(t){return this.binaryString===t.binaryString}}wr.EMPTY_BYTE_STRING=new wr("");const vr=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function br(t){if(Ks(!!t),"string"==typeof t){let e=0;const n=vr.exec(t);if(Ks(!!n),n[1]){let t=n[1];t=(t+"000000000").substr(0,9),e=Number(t)}const s=new Date(t);return{seconds:Math.floor(s.getTime()/1e3),nanos:e}}return{seconds:Er(t.seconds),nanos:Er(t.nanos)}}function Er(t){return"number"==typeof t?t:"string"==typeof t?Number(t):0}function Tr(t){return"string"==typeof t?wr.fromBase64String(t):wr.fromUint8Array(t)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ir(t){var e,n;return"server_timestamp"===(null===(n=((null===(e=null==t?void 0:t.mapValue)||void 0===e?void 0:e.fields)||{}).__type__)||void 0===n?void 0:n.stringValue)}function Sr(t){const e=t.mapValue.fields.__previous_value__;return Ir(e)?Sr(e):e}function _r(t){const e=br(t.mapValue.fields.__local_write_time__.timestampValue);return new ar(e.seconds,e.nanos)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Nr(t){return null==t}function Ar(t){return 0===t&&1/t==-1/0}function Dr(t){return"number"==typeof t&&Number.isInteger(t)&&!Ar(t)&&t<=Number.MAX_SAFE_INTEGER&&t>=Number.MIN_SAFE_INTEGER}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xr{constructor(t){this.path=t}static fromPath(t){return new xr(fr.fromString(t))}static fromName(t){return new xr(fr.fromString(t).popFirst(5))}hasCollectionId(t){return this.path.length>=2&&this.path.get(this.path.length-2)===t}isEqual(t){return null!==t&&0===fr.comparator(this.path,t.path)}toString(){return this.path.toString()}static comparator(t,e){return fr.comparator(t.path,e.path)}static isDocumentKey(t){return t.length%2==0}static fromSegments(t){return new xr(new fr(t.slice()))}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Cr(t){return"nullValue"in t?0:"booleanValue"in t?1:"integerValue"in t||"doubleValue"in t?2:"timestampValue"in t?3:"stringValue"in t?5:"bytesValue"in t?6:"referenceValue"in t?7:"geoPointValue"in t?8:"arrayValue"in t?9:"mapValue"in t?Ir(t)?4:10:js()}function kr(t,e){const n=Cr(t);if(n!==Cr(e))return!1;switch(n){case 0:return!0;case 1:return t.booleanValue===e.booleanValue;case 4:return _r(t).isEqual(_r(e));case 3:return function(t,e){if("string"==typeof t.timestampValue&&"string"==typeof e.timestampValue&&t.timestampValue.length===e.timestampValue.length)return t.timestampValue===e.timestampValue;const n=br(t.timestampValue),s=br(e.timestampValue);return n.seconds===s.seconds&&n.nanos===s.nanos}(t,e);case 5:return t.stringValue===e.stringValue;case 6:return function(t,e){return Tr(t.bytesValue).isEqual(Tr(e.bytesValue))}(t,e);case 7:return t.referenceValue===e.referenceValue;case 8:return function(t,e){return Er(t.geoPointValue.latitude)===Er(e.geoPointValue.latitude)&&Er(t.geoPointValue.longitude)===Er(e.geoPointValue.longitude)}(t,e);case 2:return function(t,e){if("integerValue"in t&&"integerValue"in e)return Er(t.integerValue)===Er(e.integerValue);if("doubleValue"in t&&"doubleValue"in e){const n=Er(t.doubleValue),s=Er(e.doubleValue);return n===s?Ar(n)===Ar(s):isNaN(n)&&isNaN(s)}return!1}(t,e);case 9:return ir(t.arrayValue.values||[],e.arrayValue.values||[],kr);case 10:return function(t,e){const n=t.mapValue.fields||{},s=e.mapValue.fields||{};if(ur(n)!==ur(s))return!1;for(const t in n)if(n.hasOwnProperty(t)&&(void 0===s[t]||!kr(n[t],s[t])))return!1;return!0}(t,e);default:return js()}}function Rr(t,e){return void 0!==(t.values||[]).find((t=>kr(t,e)))}function Lr(t,e){const n=Cr(t),s=Cr(e);if(n!==s)return rr(n,s);switch(n){case 0:return 0;case 1:return rr(t.booleanValue,e.booleanValue);case 2:return function(t,e){const n=Er(t.integerValue||t.doubleValue),s=Er(e.integerValue||e.doubleValue);return n<s?-1:n>s?1:n===s?0:isNaN(n)?isNaN(s)?0:-1:1}(t,e);case 3:return Or(t.timestampValue,e.timestampValue);case 4:return Or(_r(t),_r(e));case 5:return rr(t.stringValue,e.stringValue);case 6:return function(t,e){const n=Tr(t),s=Tr(e);return n.compareTo(s)}(t.bytesValue,e.bytesValue);case 7:return function(t,e){const n=t.split("/"),s=e.split("/");for(let t=0;t<n.length&&t<s.length;t++){const e=rr(n[t],s[t]);if(0!==e)return e}return rr(n.length,s.length)}(t.referenceValue,e.referenceValue);case 8:return function(t,e){const n=rr(Er(t.latitude),Er(e.latitude));return 0!==n?n:rr(Er(t.longitude),Er(e.longitude))}(t.geoPointValue,e.geoPointValue);case 9:return function(t,e){const n=t.values||[],s=e.values||[];for(let t=0;t<n.length&&t<s.length;++t){const e=Lr(n[t],s[t]);if(e)return e}return rr(n.length,s.length)}(t.arrayValue,e.arrayValue);case 10:return function(t,e){const n=t.fields||{},s=Object.keys(n),r=e.fields||{},i=Object.keys(r);s.sort(),i.sort();for(let t=0;t<s.length&&t<i.length;++t){const e=rr(s[t],i[t]);if(0!==e)return e;const o=Lr(n[s[t]],r[i[t]]);if(0!==o)return o}return rr(s.length,i.length)}(t.mapValue,e.mapValue);default:throw js()}}function Or(t,e){if("string"==typeof t&&"string"==typeof e&&t.length===e.length)return rr(t,e);const n=br(t),s=br(e),r=rr(n.seconds,s.seconds);return 0!==r?r:rr(n.nanos,s.nanos)}function Mr(t){return Fr(t)}function Fr(t){var e,n;return"nullValue"in t?"null":"booleanValue"in t?""+t.booleanValue:"integerValue"in t?""+t.integerValue:"doubleValue"in t?""+t.doubleValue:"timestampValue"in t?function(t){const e=br(t);return`time(${e.seconds},${e.nanos})`}(t.timestampValue):"stringValue"in t?t.stringValue:"bytesValue"in t?Tr(t.bytesValue).toBase64():"referenceValue"in t?(n=t.referenceValue,xr.fromName(n).toString()):"geoPointValue"in t?`geo(${(e=t.geoPointValue).latitude},${e.longitude})`:"arrayValue"in t?function(t){let e="[",n=!0;for(const s of t.values||[])n?n=!1:e+=",",e+=Fr(s);return e+"]"}(t.arrayValue):"mapValue"in t?function(t){const e=Object.keys(t.fields||{}).sort();let n="{",s=!0;for(const r of e)s?s=!1:n+=",",n+=`${r}:${Fr(t.fields[r])}`;return n+"}"}(t.mapValue):js()}function Pr(t,e){return{referenceValue:`projects/${t.projectId}/databases/${t.database}/documents/${e.path.canonicalString()}`}}function Vr(t){return!!t&&"integerValue"in t}function Ur(t){return!!t&&"arrayValue"in t}function qr(t){return!!t&&"nullValue"in t}function Br(t){return!!t&&"doubleValue"in t&&isNaN(Number(t.doubleValue))}function jr(t){return!!t&&"mapValue"in t}function Kr(t){if(t.geoPointValue)return{geoPointValue:Object.assign({},t.geoPointValue)};if(t.timestampValue&&"object"==typeof t.timestampValue)return{timestampValue:Object.assign({},t.timestampValue)};if(t.mapValue){const e={mapValue:{fields:{}}};return hr(t.mapValue.fields,((t,n)=>e.mapValue.fields[t]=Kr(n))),e}if(t.arrayValue){const e={arrayValue:{values:[]}};for(let n=0;n<(t.arrayValue.values||[]).length;++n)e.arrayValue.values[n]=Kr(t.arrayValue.values[n]);return e}return Object.assign({},t)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $r{constructor(t){this.value=t}static empty(){return new $r({mapValue:{}})}field(t){if(t.isEmpty())return this.value;{let e=this.value;for(let n=0;n<t.length-1;++n)if(e=(e.mapValue.fields||{})[t.get(n)],!jr(e))return null;return e=(e.mapValue.fields||{})[t.lastSegment()],e||null}}set(t,e){this.getFieldsMap(t.popLast())[t.lastSegment()]=Kr(e)}setAll(t){let e=mr.emptyPath(),n={},s=[];t.forEach(((t,r)=>{if(!e.isImmediateParentOf(r)){const t=this.getFieldsMap(e);this.applyChanges(t,n,s),n={},s=[],e=r.popLast()}t?n[r.lastSegment()]=Kr(t):s.push(r.lastSegment())}));const r=this.getFieldsMap(e);this.applyChanges(r,n,s)}delete(t){const e=this.field(t.popLast());jr(e)&&e.mapValue.fields&&delete e.mapValue.fields[t.lastSegment()]}isEqual(t){return kr(this.value,t.value)}getFieldsMap(t){let e=this.value;e.mapValue.fields||(e.mapValue={fields:{}});for(let n=0;n<t.length;++n){let s=e.mapValue.fields[t.get(n)];jr(s)&&s.mapValue.fields||(s={mapValue:{fields:{}}},e.mapValue.fields[t.get(n)]=s),e=s}return e.mapValue.fields}applyChanges(t,e,n){hr(e,((e,n)=>t[e]=n));for(const e of n)delete t[e]}clone(){return new $r(Kr(this.value))}}function Gr(t){const e=[];return hr(t.fields,((t,n)=>{const s=new mr([t]);if(jr(n)){const t=Gr(n.mapValue).fields;if(0===t.length)e.push(s);else for(const n of t)e.push(s.child(n))}else e.push(s)})),new pr(e)
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}class Hr{constructor(t,e,n,s,r){this.key=t,this.documentType=e,this.version=n,this.data=s,this.documentState=r}static newInvalidDocument(t){return new Hr(t,0,cr.min(),$r.empty(),0)}static newFoundDocument(t,e,n){return new Hr(t,1,e,n,0)}static newNoDocument(t,e){return new Hr(t,2,e,$r.empty(),0)}static newUnknownDocument(t,e){return new Hr(t,3,e,$r.empty(),2)}convertToFoundDocument(t,e){return this.version=t,this.documentType=1,this.data=e,this.documentState=0,this}convertToNoDocument(t){return this.version=t,this.documentType=2,this.data=$r.empty(),this.documentState=0,this}convertToUnknownDocument(t){return this.version=t,this.documentType=3,this.data=$r.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this}get hasLocalMutations(){return 1===this.documentState}get hasCommittedMutations(){return 2===this.documentState}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return 0!==this.documentType}isFoundDocument(){return 1===this.documentType}isNoDocument(){return 2===this.documentType}isUnknownDocument(){return 3===this.documentType}isEqual(t){return t instanceof Hr&&this.key.isEqual(t.key)&&this.version.isEqual(t.version)&&this.documentType===t.documentType&&this.documentState===t.documentState&&this.data.isEqual(t.data)}clone(){return new Hr(this.key,this.documentType,this.version,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zr{constructor(t,e=null,n=[],s=[],r=null,i=null,o=null){this.path=t,this.collectionGroup=e,this.orderBy=n,this.filters=s,this.limit=r,this.startAt=i,this.endAt=o,this.A=null}}function Qr(t,e=null,n=[],s=[],r=null,i=null,o=null){return new zr(t,e,n,s,r,i,o)}function Wr(t){const e=Gs(t);if(null===e.A){let t=e.path.canonicalString();null!==e.collectionGroup&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map((t=>function(t){return t.field.canonicalString()+t.op.toString()+Mr(t.value)}(t))).join(","),t+="|ob:",t+=e.orderBy.map((t=>function(t){return t.field.canonicalString()+t.dir}(t))).join(","),Nr(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=ci(e.startAt)),e.endAt&&(t+="|ub:",t+=ci(e.endAt)),e.A=t}return e.A}function Yr(t,e){if(t.limit!==e.limit)return!1;if(t.orderBy.length!==e.orderBy.length)return!1;for(let n=0;n<t.orderBy.length;n++)if(!hi(t.orderBy[n],e.orderBy[n]))return!1;if(t.filters.length!==e.filters.length)return!1;for(let r=0;r<t.filters.length;r++)if(n=t.filters[r],s=e.filters[r],n.op!==s.op||!n.field.isEqual(s.field)||!kr(n.value,s.value))return!1;var n,s;return t.collectionGroup===e.collectionGroup&&!!t.path.isEqual(e.path)&&!!di(t.startAt,e.startAt)&&di(t.endAt,e.endAt)}function Xr(t){return xr.isDocumentKey(t.path)&&null===t.collectionGroup&&0===t.filters.length}class Jr extends class{}{constructor(t,e,n){super(),this.field=t,this.op=e,this.value=n}static create(t,e,n){return t.isKeyField()?"in"===e||"not-in"===e?this.R(t,e,n):new Zr(t,e,n):"array-contains"===e?new si(t,n):"in"===e?new ri(t,n):"not-in"===e?new ii(t,n):"array-contains-any"===e?new oi(t,n):new Jr(t,e,n)}static R(t,e,n){return"in"===e?new ti(t,n):new ei(t,n)}matches(t){const e=t.data.field(this.field);return"!="===this.op?null!==e&&this.P(Lr(e,this.value)):null!==e&&Cr(this.value)===Cr(e)&&this.P(Lr(e,this.value))}P(t){switch(this.op){case"<":return t<0;case"<=":return t<=0;case"==":return 0===t;case"!=":return 0!==t;case">":return t>0;case">=":return t>=0;default:return js()}}v(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}}class Zr extends Jr{constructor(t,e,n){super(t,e,n),this.key=xr.fromName(n.referenceValue)}matches(t){const e=xr.comparator(t.key,this.key);return this.P(e)}}class ti extends Jr{constructor(t,e){super(t,"in",e),this.keys=ni("in",e)}matches(t){return this.keys.some((e=>e.isEqual(t.key)))}}class ei extends Jr{constructor(t,e){super(t,"not-in",e),this.keys=ni("not-in",e)}matches(t){return!this.keys.some((e=>e.isEqual(t.key)))}}function ni(t,e){var n;return((null===(n=e.arrayValue)||void 0===n?void 0:n.values)||[]).map((t=>xr.fromName(t.referenceValue)))}class si extends Jr{constructor(t,e){super(t,"array-contains",e)}matches(t){const e=t.data.field(this.field);return Ur(e)&&Rr(e.arrayValue,this.value)}}class ri extends Jr{constructor(t,e){super(t,"in",e)}matches(t){const e=t.data.field(this.field);return null!==e&&Rr(this.value.arrayValue,e)}}class ii extends Jr{constructor(t,e){super(t,"not-in",e)}matches(t){if(Rr(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const e=t.data.field(this.field);return null!==e&&!Rr(this.value.arrayValue,e)}}class oi extends Jr{constructor(t,e){super(t,"array-contains-any",e)}matches(t){const e=t.data.field(this.field);return!(!Ur(e)||!e.arrayValue.values)&&e.arrayValue.values.some((t=>Rr(this.value.arrayValue,t)))}}class ai{constructor(t,e){this.position=t,this.before=e}}function ci(t){return`${t.before?"b":"a"}:${t.position.map((t=>Mr(t))).join(",")}`}class ui{constructor(t,e="asc"){this.field=t,this.dir=e}}function hi(t,e){return t.dir===e.dir&&t.field.isEqual(e.field)}function li(t,e,n){let s=0;for(let r=0;r<t.position.length;r++){const i=e[r],o=t.position[r];if(s=i.field.isKeyField()?xr.comparator(xr.fromName(o.referenceValue),n.key):Lr(o,n.data.field(i.field)),"desc"===i.dir&&(s*=-1),0!==s)break}return t.before?s<=0:s<0}function di(t,e){if(null===t)return null===e;if(null===e)return!1;if(t.before!==e.before||t.position.length!==e.position.length)return!1;for(let n=0;n<t.position.length;n++)if(!kr(t.position[n],e.position[n]))return!1;return!0}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fi{constructor(t,e=null,n=[],s=[],r=null,i="F",o=null,a=null){this.path=t,this.collectionGroup=e,this.explicitOrderBy=n,this.filters=s,this.limit=r,this.limitType=i,this.startAt=o,this.endAt=a,this.V=null,this.S=null,this.startAt,this.endAt}}function gi(t,e,n,s,r,i,o,a){return new fi(t,e,n,s,r,i,o,a)}function mi(t){return new fi(t)}function pi(t){return!Nr(t.limit)&&"F"===t.limitType}function yi(t){return!Nr(t.limit)&&"L"===t.limitType}function wi(t){return t.explicitOrderBy.length>0?t.explicitOrderBy[0].field:null}function vi(t){for(const e of t.filters)if(e.v())return e.field;return null}function bi(t){return null!==t.collectionGroup}function Ei(t){const e=Gs(t);if(null===e.V){e.V=[];const t=vi(e),n=wi(e);if(null!==t&&null===n)t.isKeyField()||e.V.push(new ui(t)),e.V.push(new ui(mr.keyField(),"asc"));else{let t=!1;for(const n of e.explicitOrderBy)e.V.push(n),n.field.isKeyField()&&(t=!0);if(!t){const t=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";e.V.push(new ui(mr.keyField(),t))}}}return e.V}function Ti(t){const e=Gs(t);if(!e.S)if("F"===e.limitType)e.S=Qr(e.path,e.collectionGroup,Ei(e),e.filters,e.limit,e.startAt,e.endAt);else{const t=[];for(const n of Ei(e)){const e="desc"===n.dir?"asc":"desc";t.push(new ui(n.field,e))}const n=e.endAt?new ai(e.endAt.position,!e.endAt.before):null,s=e.startAt?new ai(e.startAt.position,!e.startAt.before):null;e.S=Qr(e.path,e.collectionGroup,t,e.filters,e.limit,n,s)}return e.S}function Ii(t,e,n){return new fi(t.path,t.collectionGroup,t.explicitOrderBy.slice(),t.filters.slice(),e,n,t.startAt,t.endAt)}function Si(t,e){return Yr(Ti(t),Ti(e))&&t.limitType===e.limitType}function _i(t){return`${Wr(Ti(t))}|lt:${t.limitType}`}function Ni(t){return`Query(target=${function(t){let e=t.path.canonicalString();return null!==t.collectionGroup&&(e+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(e+=`, filters: [${t.filters.map((t=>{var e;return`${(e=t).field.canonicalString()} ${e.op} ${Mr(e.value)}`})).join(", ")}]`),Nr(t.limit)||(e+=", limit: "+t.limit),t.orderBy.length>0&&(e+=`, orderBy: [${t.orderBy.map((t=>function(t){return`${t.field.canonicalString()} (${t.dir})`}(t))).join(", ")}]`),t.startAt&&(e+=", startAt: "+ci(t.startAt)),t.endAt&&(e+=", endAt: "+ci(t.endAt)),`Target(${e})`}(Ti(t))}; limitType=${t.limitType})`}function Ai(t,e){return e.isFoundDocument()&&function(t,e){const n=e.key.path;return null!==t.collectionGroup?e.key.hasCollectionId(t.collectionGroup)&&t.path.isPrefixOf(n):xr.isDocumentKey(t.path)?t.path.isEqual(n):t.path.isImmediateParentOf(n)}(t,e)&&function(t,e){for(const n of t.explicitOrderBy)if(!n.field.isKeyField()&&null===e.data.field(n.field))return!1;return!0}(t,e)&&function(t,e){for(const n of t.filters)if(!n.matches(e))return!1;return!0}(t,e)&&function(t,e){return!(t.startAt&&!li(t.startAt,Ei(t),e))&&(!t.endAt||!li(t.endAt,Ei(t),e))}(t,e)}function Di(t){return(e,n)=>{let s=!1;for(const r of Ei(t)){const t=xi(r,e,n);if(0!==t)return t;s=s||r.field.isKeyField()}return 0}}function xi(t,e,n){const s=t.field.isKeyField()?xr.comparator(e.key,n.key):function(t,e,n){const s=e.data.field(t),r=n.data.field(t);return null!==s&&null!==r?Lr(s,r):js()}(t.field,e,n);switch(t.dir){case"asc":return s;case"desc":return-1*s;default:return js()}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ci(t,e){if(t.D){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:Ar(e)?"-0":e}}function ki(t){return{integerValue:""+t}}function Ri(t,e){return Dr(e)?ki(e):Ci(t,e)}
/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Li{constructor(){this._=void 0}}function Oi(t,e,n){return t instanceof Pi?function(t,e){const n={fields:{__type__:{stringValue:"server_timestamp"},__local_write_time__:{timestampValue:{seconds:t.seconds,nanos:t.nanoseconds}}}};return e&&(n.fields.__previous_value__=e),{mapValue:n}}(n,e):t instanceof Vi?Ui(t,e):t instanceof qi?Bi(t,e):function(t,e){const n=Fi(t,e),s=Ki(n)+Ki(t.C);return Vr(n)&&Vr(t.C)?ki(s):Ci(t.N,s)}(t,e)}function Mi(t,e,n){return t instanceof Vi?Ui(t,e):t instanceof qi?Bi(t,e):n}function Fi(t,e){var n;return t instanceof ji?Vr(n=e)||function(t){return!!t&&"doubleValue"in t}(n)?e:{integerValue:0}:null}class Pi extends Li{}class Vi extends Li{constructor(t){super(),this.elements=t}}function Ui(t,e){const n=$i(e);for(const e of t.elements)n.some((t=>kr(t,e)))||n.push(e);return{arrayValue:{values:n}}}class qi extends Li{constructor(t){super(),this.elements=t}}function Bi(t,e){let n=$i(e);for(const e of t.elements)n=n.filter((t=>!kr(t,e)));return{arrayValue:{values:n}}}class ji extends Li{constructor(t,e){super(),this.N=t,this.C=e}}function Ki(t){return Er(t.integerValue||t.doubleValue)}function $i(t){return Ur(t)&&t.arrayValue.values?t.arrayValue.values.slice():[]}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gi{constructor(t,e){this.field=t,this.transform=e}}class Hi{constructor(t,e){this.version=t,this.transformResults=e}}class zi{constructor(t,e){this.updateTime=t,this.exists=e}static none(){return new zi}static exists(t){return new zi(void 0,t)}static updateTime(t){return new zi(t)}get isNone(){return void 0===this.updateTime&&void 0===this.exists}isEqual(t){return this.exists===t.exists&&(this.updateTime?!!t.updateTime&&this.updateTime.isEqual(t.updateTime):!t.updateTime)}}function Qi(t,e){return void 0!==t.updateTime?e.isFoundDocument()&&e.version.isEqual(t.updateTime):void 0===t.exists||t.exists===e.isFoundDocument()}class Wi{}function Yi(t,e,n){t instanceof eo?function(t,e,n){const s=t.value.clone(),r=ro(t.fieldTransforms,e,n.transformResults);s.setAll(r),e.convertToFoundDocument(n.version,s).setHasCommittedMutations()}(t,e,n):t instanceof no?function(t,e,n){if(!Qi(t.precondition,e))return void e.convertToUnknownDocument(n.version);const s=ro(t.fieldTransforms,e,n.transformResults),r=e.data;r.setAll(so(t)),r.setAll(s),e.convertToFoundDocument(n.version,r).setHasCommittedMutations()}(t,e,n):function(t,e,n){e.convertToNoDocument(n.version).setHasCommittedMutations()}(0,e,n)}function Xi(t,e,n){t instanceof eo?function(t,e,n){if(!Qi(t.precondition,e))return;const s=t.value.clone(),r=io(t.fieldTransforms,n,e);s.setAll(r),e.convertToFoundDocument(to(e),s).setHasLocalMutations()}(t,e,n):t instanceof no?function(t,e,n){if(!Qi(t.precondition,e))return;const s=io(t.fieldTransforms,n,e),r=e.data;r.setAll(so(t)),r.setAll(s),e.convertToFoundDocument(to(e),r).setHasLocalMutations()}(t,e,n):function(t,e){Qi(t.precondition,e)&&e.convertToNoDocument(cr.min())}(t,e)}function Ji(t,e){let n=null;for(const s of t.fieldTransforms){const t=e.data.field(s.field),r=Fi(s.transform,t||null);null!=r&&(null==n&&(n=$r.empty()),n.set(s.field,r))}return n||null}function Zi(t,e){return t.type===e.type&&!!t.key.isEqual(e.key)&&!!t.precondition.isEqual(e.precondition)&&!!function(t,e){return void 0===t&&void 0===e||!(!t||!e)&&ir(t,e,((t,e)=>function(t,e){return t.field.isEqual(e.field)&&function(t,e){return t instanceof Vi&&e instanceof Vi||t instanceof qi&&e instanceof qi?ir(t.elements,e.elements,kr):t instanceof ji&&e instanceof ji?kr(t.C,e.C):t instanceof Pi&&e instanceof Pi}(t.transform,e.transform)}(t,e)))}(t.fieldTransforms,e.fieldTransforms)&&(0===t.type?t.value.isEqual(e.value):1!==t.type||t.data.isEqual(e.data)&&t.fieldMask.isEqual(e.fieldMask))}function to(t){return t.isFoundDocument()?t.version:cr.min()}class eo extends Wi{constructor(t,e,n,s=[]){super(),this.key=t,this.value=e,this.precondition=n,this.fieldTransforms=s,this.type=0}}class no extends Wi{constructor(t,e,n,s,r=[]){super(),this.key=t,this.data=e,this.fieldMask=n,this.precondition=s,this.fieldTransforms=r,this.type=1}}function so(t){const e=new Map;return t.fieldMask.fields.forEach((n=>{if(!n.isEmpty()){const s=t.data.field(n);e.set(n,s)}})),e}function ro(t,e,n){const s=new Map;Ks(t.length===n.length);for(let r=0;r<n.length;r++){const i=t[r],o=i.transform,a=e.data.field(i.field);s.set(i.field,Mi(o,a,n[r]))}return s}function io(t,e,n){const s=new Map;for(const r of t){const t=r.transform,i=n.data.field(r.field);s.set(r.field,Oi(t,i,e))}return s}class oo extends Wi{constructor(t,e){super(),this.key=t,this.precondition=e,this.type=2,this.fieldTransforms=[]}}class ao extends Wi{constructor(t,e){super(),this.key=t,this.precondition=e,this.type=3,this.fieldTransforms=[]}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class co{constructor(t){this.count=t}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var uo,ho;function lo(t){switch(t){default:return js();case Hs.CANCELLED:case Hs.UNKNOWN:case Hs.DEADLINE_EXCEEDED:case Hs.RESOURCE_EXHAUSTED:case Hs.INTERNAL:case Hs.UNAVAILABLE:case Hs.UNAUTHENTICATED:return!1;case Hs.INVALID_ARGUMENT:case Hs.NOT_FOUND:case Hs.ALREADY_EXISTS:case Hs.PERMISSION_DENIED:case Hs.FAILED_PRECONDITION:case Hs.ABORTED:case Hs.OUT_OF_RANGE:case Hs.UNIMPLEMENTED:case Hs.DATA_LOSS:return!0}}function fo(t){if(void 0===t)return Us("GRPC error has no .code"),Hs.UNKNOWN;switch(t){case uo.OK:return Hs.OK;case uo.CANCELLED:return Hs.CANCELLED;case uo.UNKNOWN:return Hs.UNKNOWN;case uo.DEADLINE_EXCEEDED:return Hs.DEADLINE_EXCEEDED;case uo.RESOURCE_EXHAUSTED:return Hs.RESOURCE_EXHAUSTED;case uo.INTERNAL:return Hs.INTERNAL;case uo.UNAVAILABLE:return Hs.UNAVAILABLE;case uo.UNAUTHENTICATED:return Hs.UNAUTHENTICATED;case uo.INVALID_ARGUMENT:return Hs.INVALID_ARGUMENT;case uo.NOT_FOUND:return Hs.NOT_FOUND;case uo.ALREADY_EXISTS:return Hs.ALREADY_EXISTS;case uo.PERMISSION_DENIED:return Hs.PERMISSION_DENIED;case uo.FAILED_PRECONDITION:return Hs.FAILED_PRECONDITION;case uo.ABORTED:return Hs.ABORTED;case uo.OUT_OF_RANGE:return Hs.OUT_OF_RANGE;case uo.UNIMPLEMENTED:return Hs.UNIMPLEMENTED;case uo.DATA_LOSS:return Hs.DATA_LOSS;default:return js()}}(ho=uo||(uo={}))[ho.OK=0]="OK",ho[ho.CANCELLED=1]="CANCELLED",ho[ho.UNKNOWN=2]="UNKNOWN",ho[ho.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",ho[ho.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",ho[ho.NOT_FOUND=5]="NOT_FOUND",ho[ho.ALREADY_EXISTS=6]="ALREADY_EXISTS",ho[ho.PERMISSION_DENIED=7]="PERMISSION_DENIED",ho[ho.UNAUTHENTICATED=16]="UNAUTHENTICATED",ho[ho.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",ho[ho.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",ho[ho.ABORTED=10]="ABORTED",ho[ho.OUT_OF_RANGE=11]="OUT_OF_RANGE",ho[ho.UNIMPLEMENTED=12]="UNIMPLEMENTED",ho[ho.INTERNAL=13]="INTERNAL",ho[ho.UNAVAILABLE=14]="UNAVAILABLE",ho[ho.DATA_LOSS=15]="DATA_LOSS";
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class go{constructor(t,e){this.comparator=t,this.root=e||po.EMPTY}insert(t,e){return new go(this.comparator,this.root.insert(t,e,this.comparator).copy(null,null,po.BLACK,null,null))}remove(t){return new go(this.comparator,this.root.remove(t,this.comparator).copy(null,null,po.BLACK,null,null))}get(t){let e=this.root;for(;!e.isEmpty();){const n=this.comparator(t,e.key);if(0===n)return e.value;n<0?e=e.left:n>0&&(e=e.right)}return null}indexOf(t){let e=0,n=this.root;for(;!n.isEmpty();){const s=this.comparator(t,n.key);if(0===s)return e+n.left.size;s<0?n=n.left:(e+=n.left.size+1,n=n.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(t){return this.root.inorderTraversal(t)}forEach(t){this.inorderTraversal(((e,n)=>(t(e,n),!1)))}toString(){const t=[];return this.inorderTraversal(((e,n)=>(t.push(`${e}:${n}`),!1))),`{${t.join(", ")}}`}reverseTraversal(t){return this.root.reverseTraversal(t)}getIterator(){return new mo(this.root,null,this.comparator,!1)}getIteratorFrom(t){return new mo(this.root,t,this.comparator,!1)}getReverseIterator(){return new mo(this.root,null,this.comparator,!0)}getReverseIteratorFrom(t){return new mo(this.root,t,this.comparator,!0)}}class mo{constructor(t,e,n,s){this.isReverse=s,this.nodeStack=[];let r=1;for(;!t.isEmpty();)if(r=e?n(t.key,e):1,s&&(r*=-1),r<0)t=this.isReverse?t.left:t.right;else{if(0===r){this.nodeStack.push(t);break}this.nodeStack.push(t),t=this.isReverse?t.right:t.left}}getNext(){let t=this.nodeStack.pop();const e={key:t.key,value:t.value};if(this.isReverse)for(t=t.left;!t.isEmpty();)this.nodeStack.push(t),t=t.right;else for(t=t.right;!t.isEmpty();)this.nodeStack.push(t),t=t.left;return e}hasNext(){return this.nodeStack.length>0}peek(){if(0===this.nodeStack.length)return null;const t=this.nodeStack[this.nodeStack.length-1];return{key:t.key,value:t.value}}}class po{constructor(t,e,n,s,r){this.key=t,this.value=e,this.color=null!=n?n:po.RED,this.left=null!=s?s:po.EMPTY,this.right=null!=r?r:po.EMPTY,this.size=this.left.size+1+this.right.size}copy(t,e,n,s,r){return new po(null!=t?t:this.key,null!=e?e:this.value,null!=n?n:this.color,null!=s?s:this.left,null!=r?r:this.right)}isEmpty(){return!1}inorderTraversal(t){return this.left.inorderTraversal(t)||t(this.key,this.value)||this.right.inorderTraversal(t)}reverseTraversal(t){return this.right.reverseTraversal(t)||t(this.key,this.value)||this.left.reverseTraversal(t)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(t,e,n){let s=this;const r=n(t,s.key);return s=r<0?s.copy(null,null,null,s.left.insert(t,e,n),null):0===r?s.copy(null,e,null,null,null):s.copy(null,null,null,null,s.right.insert(t,e,n)),s.fixUp()}removeMin(){if(this.left.isEmpty())return po.EMPTY;let t=this;return t.left.isRed()||t.left.left.isRed()||(t=t.moveRedLeft()),t=t.copy(null,null,null,t.left.removeMin(),null),t.fixUp()}remove(t,e){let n,s=this;if(e(t,s.key)<0)s.left.isEmpty()||s.left.isRed()||s.left.left.isRed()||(s=s.moveRedLeft()),s=s.copy(null,null,null,s.left.remove(t,e),null);else{if(s.left.isRed()&&(s=s.rotateRight()),s.right.isEmpty()||s.right.isRed()||s.right.left.isRed()||(s=s.moveRedRight()),0===e(t,s.key)){if(s.right.isEmpty())return po.EMPTY;n=s.right.min(),s=s.copy(n.key,n.value,null,null,s.right.removeMin())}s=s.copy(null,null,null,null,s.right.remove(t,e))}return s.fixUp()}isRed(){return this.color}fixUp(){let t=this;return t.right.isRed()&&!t.left.isRed()&&(t=t.rotateLeft()),t.left.isRed()&&t.left.left.isRed()&&(t=t.rotateRight()),t.left.isRed()&&t.right.isRed()&&(t=t.colorFlip()),t}moveRedLeft(){let t=this.colorFlip();return t.right.left.isRed()&&(t=t.copy(null,null,null,null,t.right.rotateRight()),t=t.rotateLeft(),t=t.colorFlip()),t}moveRedRight(){let t=this.colorFlip();return t.left.left.isRed()&&(t=t.rotateRight(),t=t.colorFlip()),t}rotateLeft(){const t=this.copy(null,null,po.RED,null,this.right.left);return this.right.copy(null,null,this.color,t,null)}rotateRight(){const t=this.copy(null,null,po.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,t)}colorFlip(){const t=this.left.copy(null,null,!this.left.color,null,null),e=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,t,e)}checkMaxDepth(){const t=this.check();return Math.pow(2,t)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw js();if(this.right.isRed())throw js();const t=this.left.check();if(t!==this.right.check())throw js();return t+(this.isRed()?0:1)}}po.EMPTY=null,po.RED=!0,po.BLACK=!1,po.EMPTY=new class{constructor(){this.size=0}get key(){throw js()}get value(){throw js()}get color(){throw js()}get left(){throw js()}get right(){throw js()}copy(t,e,n,s,r){return this}insert(t,e,n){return new po(t,e)}remove(t,e){return this}isEmpty(){return!0}inorderTraversal(t){return!1}reverseTraversal(t){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class yo{constructor(t){this.comparator=t,this.data=new go(this.comparator)}has(t){return null!==this.data.get(t)}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(t){return this.data.indexOf(t)}forEach(t){this.data.inorderTraversal(((e,n)=>(t(e),!1)))}forEachInRange(t,e){const n=this.data.getIteratorFrom(t[0]);for(;n.hasNext();){const s=n.getNext();if(this.comparator(s.key,t[1])>=0)return;e(s.key)}}forEachWhile(t,e){let n;for(n=void 0!==e?this.data.getIteratorFrom(e):this.data.getIterator();n.hasNext();)if(!t(n.getNext().key))return}firstAfterOrEqual(t){const e=this.data.getIteratorFrom(t);return e.hasNext()?e.getNext().key:null}getIterator(){return new wo(this.data.getIterator())}getIteratorFrom(t){return new wo(this.data.getIteratorFrom(t))}add(t){return this.copy(this.data.remove(t).insert(t,!0))}delete(t){return this.has(t)?this.copy(this.data.remove(t)):this}isEmpty(){return this.data.isEmpty()}unionWith(t){let e=this;return e.size<t.size&&(e=t,t=this),t.forEach((t=>{e=e.add(t)})),e}isEqual(t){if(!(t instanceof yo))return!1;if(this.size!==t.size)return!1;const e=this.data.getIterator(),n=t.data.getIterator();for(;e.hasNext();){const t=e.getNext().key,s=n.getNext().key;if(0!==this.comparator(t,s))return!1}return!0}toArray(){const t=[];return this.forEach((e=>{t.push(e)})),t}toString(){const t=[];return this.forEach((e=>t.push(e))),"SortedSet("+t.toString()+")"}copy(t){const e=new yo(this.comparator);return e.data=t,e}}class wo{constructor(t){this.iter=t}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vo=new go(xr.comparator);function bo(){return vo}const Eo=new go(xr.comparator);function To(){return Eo}const Io=new go(xr.comparator);function So(){return Io}const _o=new yo(xr.comparator);function No(...t){let e=_o;for(const n of t)e=e.add(n);return e}const Ao=new yo(rr);function Do(){return Ao}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xo{constructor(t,e,n,s,r){this.snapshotVersion=t,this.targetChanges=e,this.targetMismatches=n,this.documentUpdates=s,this.resolvedLimboDocuments=r}static createSynthesizedRemoteEventForCurrentChange(t,e){const n=new Map;return n.set(t,Co.createSynthesizedTargetChangeForCurrentChange(t,e)),new xo(cr.min(),n,Do(),bo(),No())}}class Co{constructor(t,e,n,s,r){this.resumeToken=t,this.current=e,this.addedDocuments=n,this.modifiedDocuments=s,this.removedDocuments=r}static createSynthesizedTargetChangeForCurrentChange(t,e){return new Co(wr.EMPTY_BYTE_STRING,e,No(),No(),No())}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ko{constructor(t,e,n,s){this.k=t,this.removedTargetIds=e,this.key=n,this.$=s}}class Ro{constructor(t,e){this.targetId=t,this.O=e}}class Lo{constructor(t,e,n=wr.EMPTY_BYTE_STRING,s=null){this.state=t,this.targetIds=e,this.resumeToken=n,this.cause=s}}class Oo{constructor(){this.F=0,this.M=Po(),this.L=wr.EMPTY_BYTE_STRING,this.B=!1,this.U=!0}get current(){return this.B}get resumeToken(){return this.L}get q(){return 0!==this.F}get K(){return this.U}j(t){t.approximateByteSize()>0&&(this.U=!0,this.L=t)}W(){let t=No(),e=No(),n=No();return this.M.forEach(((s,r)=>{switch(r){case 0:t=t.add(s);break;case 2:e=e.add(s);break;case 1:n=n.add(s);break;default:js()}})),new Co(this.L,this.B,t,e,n)}G(){this.U=!1,this.M=Po()}H(t,e){this.U=!0,this.M=this.M.insert(t,e)}J(t){this.U=!0,this.M=this.M.remove(t)}Y(){this.F+=1}X(){this.F-=1}Z(){this.U=!0,this.B=!0}}class Mo{constructor(t){this.tt=t,this.et=new Map,this.nt=bo(),this.st=Fo(),this.it=new yo(rr)}rt(t){for(const e of t.k)t.$&&t.$.isFoundDocument()?this.ot(e,t.$):this.ct(e,t.key,t.$);for(const e of t.removedTargetIds)this.ct(e,t.key,t.$)}at(t){this.forEachTarget(t,(e=>{const n=this.ut(e);switch(t.state){case 0:this.ht(e)&&n.j(t.resumeToken);break;case 1:n.X(),n.q||n.G(),n.j(t.resumeToken);break;case 2:n.X(),n.q||this.removeTarget(e);break;case 3:this.ht(e)&&(n.Z(),n.j(t.resumeToken));break;case 4:this.ht(e)&&(this.lt(e),n.j(t.resumeToken));break;default:js()}}))}forEachTarget(t,e){t.targetIds.length>0?t.targetIds.forEach(e):this.et.forEach(((t,n)=>{this.ht(n)&&e(n)}))}ft(t){const e=t.targetId,n=t.O.count,s=this.dt(e);if(s){const t=s.target;if(Xr(t))if(0===n){const n=new xr(t.path);this.ct(e,n,Hr.newNoDocument(n,cr.min()))}else Ks(1===n);else this.wt(e)!==n&&(this.lt(e),this.it=this.it.add(e))}}_t(t){const e=new Map;this.et.forEach(((n,s)=>{const r=this.dt(s);if(r){if(n.current&&Xr(r.target)){const e=new xr(r.target.path);null!==this.nt.get(e)||this.gt(s,e)||this.ct(s,e,Hr.newNoDocument(e,t))}n.K&&(e.set(s,n.W()),n.G())}}));let n=No();this.st.forEach(((t,e)=>{let s=!0;e.forEachWhile((t=>{const e=this.dt(t);return!e||2===e.purpose||(s=!1,!1)})),s&&(n=n.add(t))}));const s=new xo(t,e,this.it,this.nt,n);return this.nt=bo(),this.st=Fo(),this.it=new yo(rr),s}ot(t,e){if(!this.ht(t))return;const n=this.gt(t,e.key)?2:0;this.ut(t).H(e.key,n),this.nt=this.nt.insert(e.key,e),this.st=this.st.insert(e.key,this.yt(e.key).add(t))}ct(t,e,n){if(!this.ht(t))return;const s=this.ut(t);this.gt(t,e)?s.H(e,1):s.J(e),this.st=this.st.insert(e,this.yt(e).delete(t)),n&&(this.nt=this.nt.insert(e,n))}removeTarget(t){this.et.delete(t)}wt(t){const e=this.ut(t).W();return this.tt.getRemoteKeysForTarget(t).size+e.addedDocuments.size-e.removedDocuments.size}Y(t){this.ut(t).Y()}ut(t){let e=this.et.get(t);return e||(e=new Oo,this.et.set(t,e)),e}yt(t){let e=this.st.get(t);return e||(e=new yo(rr),this.st=this.st.insert(t,e)),e}ht(t){const e=null!==this.dt(t);return e||Vs("WatchChangeAggregator","Detected inactive target",t),e}dt(t){const e=this.et.get(t);return e&&e.q?null:this.tt.Tt(t)}lt(t){this.et.set(t,new Oo),this.tt.getRemoteKeysForTarget(t).forEach((e=>{this.ct(t,e,null)}))}gt(t,e){return this.tt.getRemoteKeysForTarget(t).has(e)}}function Fo(){return new go(xr.comparator)}function Po(){return new go(xr.comparator)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vo={asc:"ASCENDING",desc:"DESCENDING"},Uo={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"};class qo{constructor(t,e){this.databaseId=t,this.D=e}}function Bo(t,e){return t.D?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function jo(t,e){return t.D?e.toBase64():e.toUint8Array()}function Ko(t,e){return Bo(t,e.toTimestamp())}function $o(t){return Ks(!!t),cr.fromTimestamp(function(t){const e=br(t);return new ar(e.seconds,e.nanos)}(t))}function Go(t,e){return function(t){return new fr(["projects",t.projectId,"databases",t.database])}(t).child("documents").child(e).canonicalString()}function Ho(t){const e=fr.fromString(t);return Ks(pa(e)),e}function zo(t,e){return Go(t.databaseId,e.path)}function Qo(t,e){const n=Ho(e);if(n.get(1)!==t.databaseId.projectId)throw new zs(Hs.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+n.get(1)+" vs "+t.databaseId.projectId);if(n.get(3)!==t.databaseId.database)throw new zs(Hs.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+n.get(3)+" vs "+t.databaseId.database);return new xr(Jo(n))}function Wo(t,e){return Go(t.databaseId,e)}function Yo(t){const e=Ho(t);return 4===e.length?fr.emptyPath():Jo(e)}function Xo(t){return new fr(["projects",t.databaseId.projectId,"databases",t.databaseId.database]).canonicalString()}function Jo(t){return Ks(t.length>4&&"documents"===t.get(4)),t.popFirst(5)}function Zo(t,e,n){return{name:zo(t,e),fields:n.value.mapValue.fields}}function ta(t,e,n){const s=Qo(t,e.name),r=$o(e.updateTime),i=new $r({mapValue:{fields:e.fields}}),o=Hr.newFoundDocument(s,r,i);return n&&o.setHasCommittedMutations(),n?o.setHasCommittedMutations():o}function ea(t,e){let n;if(e instanceof eo)n={update:Zo(t,e.key,e.value)};else if(e instanceof oo)n={delete:zo(t,e.key)};else if(e instanceof no)n={update:Zo(t,e.key,e.data),updateMask:ma(e.fieldMask)};else{if(!(e instanceof ao))return js();n={verify:zo(t,e.key)}}return e.fieldTransforms.length>0&&(n.updateTransforms=e.fieldTransforms.map((t=>function(t,e){const n=e.transform;if(n instanceof Pi)return{fieldPath:e.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(n instanceof Vi)return{fieldPath:e.field.canonicalString(),appendMissingElements:{values:n.elements}};if(n instanceof qi)return{fieldPath:e.field.canonicalString(),removeAllFromArray:{values:n.elements}};if(n instanceof ji)return{fieldPath:e.field.canonicalString(),increment:n.C};throw js()}(0,t)))),e.precondition.isNone||(n.currentDocument=function(t,e){return void 0!==e.updateTime?{updateTime:Ko(t,e.updateTime)}:void 0!==e.exists?{exists:e.exists}:js()}(t,e.precondition)),n}function na(t,e){const n=e.currentDocument?function(t){return void 0!==t.updateTime?zi.updateTime($o(t.updateTime)):void 0!==t.exists?zi.exists(t.exists):zi.none()}(e.currentDocument):zi.none(),s=e.updateTransforms?e.updateTransforms.map((e=>function(t,e){let n=null;if("setToServerValue"in e)Ks("REQUEST_TIME"===e.setToServerValue),n=new Pi;else if("appendMissingElements"in e){const t=e.appendMissingElements.values||[];n=new Vi(t)}else if("removeAllFromArray"in e){const t=e.removeAllFromArray.values||[];n=new qi(t)}else"increment"in e?n=new ji(t,e.increment):js();const s=mr.fromServerFormat(e.fieldPath);return new Gi(s,n)}(t,e))):[];if(e.update){e.update.name;const r=Qo(t,e.update.name),i=new $r({mapValue:{fields:e.update.fields}});if(e.updateMask){const t=function(t){const e=t.fieldPaths||[];return new pr(e.map((t=>mr.fromServerFormat(t))))}(e.updateMask);return new no(r,i,t,n,s)}return new eo(r,i,n,s)}if(e.delete){const s=Qo(t,e.delete);return new oo(s,n)}if(e.verify){const s=Qo(t,e.verify);return new ao(s,n)}return js()}function sa(t,e){return{documents:[Wo(t,e.path)]}}function ra(t,e){const n={structuredQuery:{}},s=e.path;null!==e.collectionGroup?(n.parent=Wo(t,s),n.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(n.parent=Wo(t,s.popLast()),n.structuredQuery.from=[{collectionId:s.lastSegment()}]);const r=function(t){if(0===t.length)return;const e=t.map((t=>function(t){if("=="===t.op){if(Br(t.value))return{unaryFilter:{field:la(t.field),op:"IS_NAN"}};if(qr(t.value))return{unaryFilter:{field:la(t.field),op:"IS_NULL"}}}else if("!="===t.op){if(Br(t.value))return{unaryFilter:{field:la(t.field),op:"IS_NOT_NAN"}};if(qr(t.value))return{unaryFilter:{field:la(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:la(t.field),op:ha(t.op),value:t.value}}}(t)));return 1===e.length?e[0]:{compositeFilter:{op:"AND",filters:e}}}(e.filters);r&&(n.structuredQuery.where=r);const i=function(t){if(0!==t.length)return t.map((t=>function(t){return{field:la(t.field),direction:ua(t.dir)}}(t)))}(e.orderBy);i&&(n.structuredQuery.orderBy=i);const o=function(t,e){return t.D||Nr(e)?e:{value:e}}(t,e.limit);return null!==o&&(n.structuredQuery.limit=o),e.startAt&&(n.structuredQuery.startAt=aa(e.startAt)),e.endAt&&(n.structuredQuery.endAt=aa(e.endAt)),n}function ia(t){let e=Yo(t.parent);const n=t.structuredQuery,s=n.from?n.from.length:0;let r=null;if(s>0){Ks(1===s);const t=n.from[0];t.allDescendants?r=t.collectionId:e=e.child(t.collectionId)}let i=[];n.where&&(i=oa(n.where));let o=[];n.orderBy&&(o=n.orderBy.map((t=>function(t){return new ui(da(t.field),function(t){switch(t){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(t.direction))}(t))));let a=null;n.limit&&(a=function(t){let e;return e="object"==typeof t?t.value:t,Nr(e)?null:e}(n.limit));let c=null;n.startAt&&(c=ca(n.startAt));let u=null;return n.endAt&&(u=ca(n.endAt)),gi(e,r,o,i,a,"F",c,u)}function oa(t){return t?void 0!==t.unaryFilter?[ga(t)]:void 0!==t.fieldFilter?[fa(t)]:void 0!==t.compositeFilter?t.compositeFilter.filters.map((t=>oa(t))).reduce(((t,e)=>t.concat(e))):js():[]}function aa(t){return{before:t.before,values:t.position}}function ca(t){const e=!!t.before,n=t.values||[];return new ai(n,e)}function ua(t){return Vo[t]}function ha(t){return Uo[t]}function la(t){return{fieldPath:t.canonicalString()}}function da(t){return mr.fromServerFormat(t.fieldPath)}function fa(t){return Jr.create(da(t.fieldFilter.field),function(t){switch(t){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";default:return js()}}(t.fieldFilter.op),t.fieldFilter.value)}function ga(t){switch(t.unaryFilter.op){case"IS_NAN":const e=da(t.unaryFilter.field);return Jr.create(e,"==",{doubleValue:NaN});case"IS_NULL":const n=da(t.unaryFilter.field);return Jr.create(n,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const s=da(t.unaryFilter.field);return Jr.create(s,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const r=da(t.unaryFilter.field);return Jr.create(r,"!=",{nullValue:"NULL_VALUE"});default:return js()}}function ma(t){const e=[];return t.fields.forEach((t=>e.push(t.canonicalString()))),{fieldPaths:e}}function pa(t){return t.length>=4&&"projects"===t.get(0)&&"databases"===t.get(2)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ya(t){let e="";for(let n=0;n<t.length;n++)e.length>0&&(e=va(e)),e=wa(t.get(n),e);return va(e)}function wa(t,e){let n=e;const s=t.length;for(let e=0;e<s;e++){const s=t.charAt(e);switch(s){case"\0":n+="";break;case"":n+="";break;default:n+=s}}return n}function va(t){return t+""}function ba(t){const e=t.length;if(Ks(e>=2),2===e)return Ks(""===t.charAt(0)&&""===t.charAt(1)),fr.emptyPath();const n=e-2,s=[];let r="";for(let i=0;i<e;){const e=t.indexOf("",i);switch((e<0||e>n)&&js(),t.charAt(e+1)){case"":const n=t.substring(i,e);let o;0===r.length?o=n:(r+=n,o=r,r=""),s.push(o);break;case"":r+=t.substring(i,e),r+="\0";break;case"":r+=t.substring(i,e+1);break;default:js()}i=e+2}return new fr(s)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ea{constructor(t,e){this.seconds=t,this.nanoseconds=e}}class Ta{constructor(t,e,n){this.ownerId=t,this.allowTabSynchronization=e,this.leaseTimestampMs=n}}Ta.store="owner",Ta.key="owner";class Ia{constructor(t,e,n){this.userId=t,this.lastAcknowledgedBatchId=e,this.lastStreamToken=n}}Ia.store="mutationQueues",Ia.keyPath="userId";class Sa{constructor(t,e,n,s,r){this.userId=t,this.batchId=e,this.localWriteTimeMs=n,this.baseMutations=s,this.mutations=r}}Sa.store="mutations",Sa.keyPath="batchId",Sa.userMutationsIndex="userMutationsIndex",Sa.userMutationsKeyPath=["userId","batchId"];class _a{constructor(){}static prefixForUser(t){return[t]}static prefixForPath(t,e){return[t,ya(e)]}static key(t,e,n){return[t,ya(e),n]}}_a.store="documentMutations",_a.PLACEHOLDER=new _a;class Na{constructor(t,e){this.path=t,this.readTime=e}}class Aa{constructor(t,e){this.path=t,this.version=e}}class Da{constructor(t,e,n,s,r,i){this.unknownDocument=t,this.noDocument=e,this.document=n,this.hasCommittedMutations=s,this.readTime=r,this.parentPath=i}}Da.store="remoteDocuments",Da.readTimeIndex="readTimeIndex",Da.readTimeIndexPath="readTime",Da.collectionReadTimeIndex="collectionReadTimeIndex",Da.collectionReadTimeIndexPath=["parentPath","readTime"];class xa{constructor(t){this.byteSize=t}}xa.store="remoteDocumentGlobal",xa.key="remoteDocumentGlobalKey";class Ca{constructor(t,e,n,s,r,i,o){this.targetId=t,this.canonicalId=e,this.readTime=n,this.resumeToken=s,this.lastListenSequenceNumber=r,this.lastLimboFreeSnapshotVersion=i,this.query=o}}Ca.store="targets",Ca.keyPath="targetId",Ca.queryTargetsIndexName="queryTargetsIndex",Ca.queryTargetsKeyPath=["canonicalId","targetId"];class ka{constructor(t,e,n){this.targetId=t,this.path=e,this.sequenceNumber=n}}ka.store="targetDocuments",ka.keyPath=["targetId","path"],ka.documentTargetsIndex="documentTargetsIndex",ka.documentTargetsKeyPath=["path","targetId"];class Ra{constructor(t,e,n,s){this.highestTargetId=t,this.highestListenSequenceNumber=e,this.lastRemoteSnapshotVersion=n,this.targetCount=s}}Ra.key="targetGlobalKey",Ra.store="targetGlobal";class La{constructor(t,e){this.collectionId=t,this.parent=e}}La.store="collectionParents",La.keyPath=["collectionId","parent"];class Oa{constructor(t,e,n,s){this.clientId=t,this.updateTimeMs=e,this.networkEnabled=n,this.inForeground=s}}Oa.store="clientMetadata",Oa.keyPath="clientId";class Ma{constructor(t,e,n){this.bundleId=t,this.createTime=e,this.version=n}}Ma.store="bundles",Ma.keyPath="bundleId";class Fa{constructor(t,e,n){this.name=t,this.readTime=e,this.bundledQuery=n}}Fa.store="namedQueries",Fa.keyPath="name";const Pa=[Ia.store,Sa.store,_a.store,Da.store,Ca.store,Ta.store,Ra.store,ka.store,Oa.store,xa.store,La.store,Ma.store,Fa.store],Va="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class Ua{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(t){this.onCommittedListeners.push(t)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach((t=>t()))}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qa{constructor(t){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,t((t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)}),(t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)}))}catch(t){return this.next(void 0,t)}next(t,e){return this.callbackAttached&&js(),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(e,this.error):this.wrapSuccess(t,this.result):new qa(((n,s)=>{this.nextCallback=e=>{this.wrapSuccess(t,e).next(n,s)},this.catchCallback=t=>{this.wrapFailure(e,t).next(n,s)}}))}toPromise(){return new Promise(((t,e)=>{this.next(t,e)}))}wrapUserFunction(t){try{const e=t();return e instanceof qa?e:qa.resolve(e)}catch(t){return qa.reject(t)}}wrapSuccess(t,e){return t?this.wrapUserFunction((()=>t(e))):qa.resolve(e)}wrapFailure(t,e){return t?this.wrapUserFunction((()=>t(e))):qa.reject(e)}static resolve(t){return new qa(((e,n)=>{e(t)}))}static reject(t){return new qa(((e,n)=>{n(t)}))}static waitFor(t){return new qa(((e,n)=>{let s=0,r=0,i=!1;t.forEach((t=>{++s,t.next((()=>{++r,i&&r===s&&e()}),(t=>n(t)))})),i=!0,r===s&&e()}))}static or(t){let e=qa.resolve(!1);for(const n of t)e=e.next((t=>t?qa.resolve(t):n()));return e}static forEach(t,e){const n=[];return t.forEach(((t,s)=>{n.push(e.call(this,t,s))})),this.waitFor(n)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ba{constructor(t,e){this.action=t,this.transaction=e,this.aborted=!1,this.Et=new Qs,this.transaction.oncomplete=()=>{this.Et.resolve()},this.transaction.onabort=()=>{e.error?this.Et.reject(new $a(t,e.error)):this.Et.resolve()},this.transaction.onerror=e=>{const n=Wa(e.target.error);this.Et.reject(new $a(t,n))}}static open(t,e,n,s){try{return new Ba(e,t.transaction(s,n))}catch(t){throw new $a(e,t)}}get It(){return this.Et.promise}abort(t){t&&this.Et.reject(t),this.aborted||(Vs("SimpleDb","Aborting transaction:",t?t.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}store(t){const e=this.transaction.objectStore(t);return new Ha(e)}}class ja{constructor(t,e,n){this.name=t,this.version=e,this.At=n,12.2===ja.Rt(h())&&Us("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}static delete(t){return Vs("SimpleDb","Removing database:",t),za(window.indexedDB.deleteDatabase(t)).toPromise()}static bt(){if("object"!=typeof indexedDB)return!1;if(ja.Pt())return!0;const t=h(),e=ja.Rt(t),n=0<e&&e<10,s=ja.vt(t),r=0<s&&s<4.5;return!(t.indexOf("MSIE ")>0||t.indexOf("Trident/")>0||t.indexOf("Edge/")>0||n||r)}static Pt(){var t;return void 0!==o&&"YES"===(void 0===(t={})?void 0:t.Vt)}static St(t,e){return t.store(e)}static Rt(t){const e=t.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=e?e[1].split("_").slice(0,2).join("."):"-1";return Number(n)}static vt(t){const e=t.match(/Android ([\d.]+)/i),n=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(n)}async Dt(t){return this.db||(Vs("SimpleDb","Opening database:",this.name),this.db=await new Promise(((e,n)=>{const s=indexedDB.open(this.name,this.version);s.onsuccess=t=>{const n=t.target.result;e(n)},s.onblocked=()=>{n(new $a(t,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},s.onerror=e=>{const s=e.target.error;"VersionError"===s.name?n(new zs(Hs.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):"InvalidStateError"===s.name?n(new zs(Hs.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+s)):n(new $a(t,s))},s.onupgradeneeded=t=>{Vs("SimpleDb",'Database "'+this.name+'" requires upgrade from version:',t.oldVersion);const e=t.target.result;this.At.Ct(e,s.transaction,t.oldVersion,this.version).next((()=>{Vs("SimpleDb","Database upgrade to version "+this.version+" complete")}))}}))),this.Nt&&(this.db.onversionchange=t=>this.Nt(t)),this.db}xt(t){this.Nt=t,this.db&&(this.db.onversionchange=e=>t(e))}async runTransaction(t,e,n,s){const r="readonly"===e;let i=0;for(;;){++i;try{this.db=await this.Dt(t);const e=Ba.open(this.db,t,r?"readonly":"readwrite",n),i=s(e).catch((t=>(e.abort(t),qa.reject(t)))).toPromise();return i.catch((()=>{})),await e.It,i}catch(t){const e="FirebaseError"!==t.name&&i<3;if(Vs("SimpleDb","Transaction failed with error:",t.message,"Retrying:",e),this.close(),!e)return Promise.reject(t)}}}close(){this.db&&this.db.close(),this.db=void 0}}class Ka{constructor(t){this.kt=t,this.$t=!1,this.Ot=null}get isDone(){return this.$t}get Ft(){return this.Ot}set cursor(t){this.kt=t}done(){this.$t=!0}Mt(t){this.Ot=t}delete(){return za(this.kt.delete())}}class $a extends zs{constructor(t,e){super(Hs.UNAVAILABLE,`IndexedDB transaction '${t}' failed: ${e}`),this.name="IndexedDbTransactionError"}}function Ga(t){return"IndexedDbTransactionError"===t.name}class Ha{constructor(t){this.store=t}put(t,e){let n;return void 0!==e?(Vs("SimpleDb","PUT",this.store.name,t,e),n=this.store.put(e,t)):(Vs("SimpleDb","PUT",this.store.name,"<auto-key>",t),n=this.store.put(t)),za(n)}add(t){return Vs("SimpleDb","ADD",this.store.name,t,t),za(this.store.add(t))}get(t){return za(this.store.get(t)).next((e=>(void 0===e&&(e=null),Vs("SimpleDb","GET",this.store.name,t,e),e)))}delete(t){return Vs("SimpleDb","DELETE",this.store.name,t),za(this.store.delete(t))}count(){return Vs("SimpleDb","COUNT",this.store.name),za(this.store.count())}Lt(t,e){const n=this.cursor(this.options(t,e)),s=[];return this.Bt(n,((t,e)=>{s.push(e)})).next((()=>s))}Ut(t,e){Vs("SimpleDb","DELETE ALL",this.store.name);const n=this.options(t,e);n.qt=!1;const s=this.cursor(n);return this.Bt(s,((t,e,n)=>n.delete()))}Kt(t,e){let n;e?n=t:(n={},e=t);const s=this.cursor(n);return this.Bt(s,e)}jt(t){const e=this.cursor({});return new qa(((n,s)=>{e.onerror=t=>{const e=Wa(t.target.error);s(e)},e.onsuccess=e=>{const s=e.target.result;s?t(s.primaryKey,s.value).next((t=>{t?s.continue():n()})):n()}}))}Bt(t,e){const n=[];return new qa(((s,r)=>{t.onerror=t=>{r(t.target.error)},t.onsuccess=t=>{const r=t.target.result;if(!r)return void s();const i=new Ka(r),o=e(r.primaryKey,r.value,i);if(o instanceof qa){const t=o.catch((t=>(i.done(),qa.reject(t))));n.push(t)}i.isDone?s():null===i.Ft?r.continue():r.continue(i.Ft)}})).next((()=>qa.waitFor(n)))}options(t,e){let n;return void 0!==t&&("string"==typeof t?n=t:e=t),{index:n,range:e}}cursor(t){let e="next";if(t.reverse&&(e="prev"),t.index){const n=this.store.index(t.index);return t.qt?n.openKeyCursor(t.range,e):n.openCursor(t.range,e)}return this.store.openCursor(t.range,e)}}function za(t){return new qa(((e,n)=>{t.onsuccess=t=>{const n=t.target.result;e(n)},t.onerror=t=>{const e=Wa(t.target.error);n(e)}}))}let Qa=!1;function Wa(t){const e=ja.Rt(h());if(e>=12.2&&e<13){const e="An internal error was encountered in the Indexed Database server";if(t.message.indexOf(e)>=0){const t=new zs("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${e}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return Qa||(Qa=!0,setTimeout((()=>{throw t}),0)),t}}return t}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ya extends Ua{constructor(t,e){super(),this.Qt=t,this.currentSequenceNumber=e}}function Xa(t,e){const n=Gs(t);return ja.St(n.Qt,e)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ja{constructor(t,e,n,s){this.batchId=t,this.localWriteTime=e,this.baseMutations=n,this.mutations=s}applyToRemoteDocument(t,e){const n=e.mutationResults;for(let e=0;e<this.mutations.length;e++){const s=this.mutations[e];s.key.isEqual(t.key)&&Yi(s,t,n[e])}}applyToLocalView(t){for(const e of this.baseMutations)e.key.isEqual(t.key)&&Xi(e,t,this.localWriteTime);for(const e of this.mutations)e.key.isEqual(t.key)&&Xi(e,t,this.localWriteTime)}applyToLocalDocumentSet(t){this.mutations.forEach((e=>{const n=t.get(e.key),s=n;this.applyToLocalView(s),n.isValidDocument()||s.convertToNoDocument(cr.min())}))}keys(){return this.mutations.reduce(((t,e)=>t.add(e.key)),No())}isEqual(t){return this.batchId===t.batchId&&ir(this.mutations,t.mutations,((t,e)=>Zi(t,e)))&&ir(this.baseMutations,t.baseMutations,((t,e)=>Zi(t,e)))}}class Za{constructor(t,e,n,s){this.batch=t,this.commitVersion=e,this.mutationResults=n,this.docVersions=s}static from(t,e,n){Ks(t.mutations.length===n.length);let s=So();const r=t.mutations;for(let t=0;t<r.length;t++)s=s.insert(r[t].key,n[t].version);return new Za(t,e,n,s)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tc{constructor(t,e,n,s,r=cr.min(),i=cr.min(),o=wr.EMPTY_BYTE_STRING){this.target=t,this.targetId=e,this.purpose=n,this.sequenceNumber=s,this.snapshotVersion=r,this.lastLimboFreeSnapshotVersion=i,this.resumeToken=o}withSequenceNumber(t){return new tc(this.target,this.targetId,this.purpose,t,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken)}withResumeToken(t,e){return new tc(this.target,this.targetId,this.purpose,this.sequenceNumber,e,this.lastLimboFreeSnapshotVersion,t)}withLastLimboFreeSnapshotVersion(t){return new tc(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,t,this.resumeToken)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ec{constructor(t){this.Wt=t}}function nc(t,e){if(e.document)return ta(t.Wt,e.document,!!e.hasCommittedMutations);if(e.noDocument){const t=xr.fromSegments(e.noDocument.path),n=ac(e.noDocument.readTime),s=Hr.newNoDocument(t,n);return e.hasCommittedMutations?s.setHasCommittedMutations():s}if(e.unknownDocument){const t=xr.fromSegments(e.unknownDocument.path),n=ac(e.unknownDocument.version);return Hr.newUnknownDocument(t,n)}return js()}function sc(t,e,n){const s=rc(n),r=e.key.path.popLast().toArray();if(e.isFoundDocument()){const n=function(t,e){return{name:zo(t,e.key),fields:e.data.value.mapValue.fields,updateTime:Bo(t,e.version.toTimestamp())}}(t.Wt,e),i=e.hasCommittedMutations;return new Da(null,null,n,i,s,r)}if(e.isNoDocument()){const t=e.key.path.toArray(),n=oc(e.version),i=e.hasCommittedMutations;return new Da(null,new Na(t,n),null,i,s,r)}if(e.isUnknownDocument()){const t=e.key.path.toArray(),n=oc(e.version);return new Da(new Aa(t,n),null,null,!0,s,r)}return js()}function rc(t){const e=t.toTimestamp();return[e.seconds,e.nanoseconds]}function ic(t){const e=new ar(t[0],t[1]);return cr.fromTimestamp(e)}function oc(t){const e=t.toTimestamp();return new Ea(e.seconds,e.nanoseconds)}function ac(t){const e=new ar(t.seconds,t.nanoseconds);return cr.fromTimestamp(e)}function cc(t,e){const n=(e.baseMutations||[]).map((e=>na(t.Wt,e)));for(let t=0;t<e.mutations.length-1;++t){const n=e.mutations[t];if(t+1<e.mutations.length&&void 0!==e.mutations[t+1].transform){const s=e.mutations[t+1];n.updateTransforms=s.transform.fieldTransforms,e.mutations.splice(t+1,1),++t}}const s=e.mutations.map((e=>na(t.Wt,e))),r=ar.fromMillis(e.localWriteTimeMs);return new Ja(e.batchId,r,n,s)}function uc(t){const e=ac(t.readTime),n=void 0!==t.lastLimboFreeSnapshotVersion?ac(t.lastLimboFreeSnapshotVersion):cr.min();let s;var r;return void 0!==t.query.documents?(Ks(1===(r=t.query).documents.length),s=Ti(mi(Yo(r.documents[0])))):s=function(t){return Ti(ia(t))}(t.query),new tc(s,t.targetId,0,t.lastListenSequenceNumber,e,n,wr.fromBase64String(t.resumeToken))}function hc(t,e){const n=oc(e.snapshotVersion),s=oc(e.lastLimboFreeSnapshotVersion);let r;r=Xr(e.target)?sa(t.Wt,e.target):ra(t.Wt,e.target);const i=e.resumeToken.toBase64();return new Ca(e.targetId,Wr(e.target),n,i,e.sequenceNumber,s,r)}function lc(t){const e=ia({parent:t.parent,structuredQuery:t.structuredQuery});return"LAST"===t.limitType?Ii(e,e.limit,"L"):e}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dc{getBundleMetadata(t,e){return fc(t).get(e).next((t=>{if(t)return{id:(e=t).bundleId,createTime:ac(e.createTime),version:e.version};var e}))}saveBundleMetadata(t,e){var n;return fc(t).put({bundleId:(n=e).id,createTime:oc($o(n.createTime)),version:n.version})}getNamedQuery(t,e){return gc(t).get(e).next((t=>{if(t)return{name:(e=t).name,query:lc(e.bundledQuery),readTime:ac(e.readTime)};var e}))}saveNamedQuery(t,e){return gc(t).put(function(t){return{name:t.name,readTime:oc($o(t.readTime)),bundledQuery:t.bundledQuery}}(e))}}function fc(t){return Xa(t,Ma.store)}function gc(t){return Xa(t,Fa.store)}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mc{constructor(){this.Gt=new pc}addToCollectionParentIndex(t,e){return this.Gt.add(e),qa.resolve()}getCollectionParents(t,e){return qa.resolve(this.Gt.getEntries(e))}}class pc{constructor(){this.index={}}add(t){const e=t.lastSegment(),n=t.popLast(),s=this.index[e]||new yo(fr.comparator),r=!s.has(n);return this.index[e]=s.add(n),r}has(t){const e=t.lastSegment(),n=t.popLast(),s=this.index[e];return s&&s.has(n)}getEntries(t){return(this.index[t]||new yo(fr.comparator)).toArray()}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yc{constructor(){this.zt=new pc}addToCollectionParentIndex(t,e){if(!this.zt.has(e)){const n=e.lastSegment(),s=e.popLast();t.addOnCommittedListener((()=>{this.zt.add(e)}));const r={collectionId:n,parent:ya(s)};return wc(t).put(r)}return qa.resolve()}getCollectionParents(t,e){const n=[],s=IDBKeyRange.bound([e,""],[or(e),""],!1,!0);return wc(t).Lt(s).next((t=>{for(const s of t){if(s.collectionId!==e)break;n.push(ba(s.parent))}return n}))}}function wc(t){return Xa(t,La.store)}
/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vc={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0};class bc{constructor(t,e,n){this.cacheSizeCollectionThreshold=t,this.percentileToCollect=e,this.maximumSequenceNumbersToCollect=n}static withCacheSize(t){return new bc(t,bc.DEFAULT_COLLECTION_PERCENTILE,bc.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ec(t,e,n){const s=t.store(Sa.store),r=t.store(_a.store),i=[],o=IDBKeyRange.only(n.batchId);let a=0;const c=s.Kt({range:o},((t,e,n)=>(a++,n.delete())));i.push(c.next((()=>{Ks(1===a)})));const u=[];for(const t of n.mutations){const s=_a.key(e,t.key.path,n.batchId);i.push(r.delete(s)),u.push(t.key)}return qa.waitFor(i).next((()=>u))}function Tc(t){if(!t)return 0;let e;if(t.document)e=t.document;else if(t.unknownDocument)e=t.unknownDocument;else{if(!t.noDocument)throw js();e=t.noDocument}return JSON.stringify(e).length}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */bc.DEFAULT_COLLECTION_PERCENTILE=10,bc.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,bc.DEFAULT=new bc(41943040,bc.DEFAULT_COLLECTION_PERCENTILE,bc.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),bc.DISABLED=new bc(-1,0,0);class Ic{constructor(t,e,n,s){this.userId=t,this.N=e,this.Ht=n,this.referenceDelegate=s,this.Jt={}}static Yt(t,e,n,s){Ks(""!==t.uid);const r=t.isAuthenticated()?t.uid:"";return new Ic(r,e,n,s)}checkEmpty(t){let e=!0;const n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return _c(t).Kt({index:Sa.userMutationsIndex,range:n},((t,n,s)=>{e=!1,s.done()})).next((()=>e))}addMutationBatch(t,e,n,s){const r=Nc(t),i=_c(t);return i.add({}).next((o=>{Ks("number"==typeof o);const a=new Ja(o,e,n,s),c=function(t,e,n){const s=n.baseMutations.map((e=>ea(t.Wt,e))),r=n.mutations.map((e=>ea(t.Wt,e)));return new Sa(e,n.batchId,n.localWriteTime.toMillis(),s,r)}(this.N,this.userId,a),u=[];let h=new yo(((t,e)=>rr(t.canonicalString(),e.canonicalString())));for(const t of s){const e=_a.key(this.userId,t.key.path,o);h=h.add(t.key.path.popLast()),u.push(i.put(c)),u.push(r.put(e,_a.PLACEHOLDER))}return h.forEach((e=>{u.push(this.Ht.addToCollectionParentIndex(t,e))})),t.addOnCommittedListener((()=>{this.Jt[o]=a.keys()})),qa.waitFor(u).next((()=>a))}))}lookupMutationBatch(t,e){return _c(t).get(e).next((t=>t?(Ks(t.userId===this.userId),cc(this.N,t)):null))}Xt(t,e){return this.Jt[e]?qa.resolve(this.Jt[e]):this.lookupMutationBatch(t,e).next((t=>{if(t){const n=t.keys();return this.Jt[e]=n,n}return null}))}getNextMutationBatchAfterBatchId(t,e){const n=e+1,s=IDBKeyRange.lowerBound([this.userId,n]);let r=null;return _c(t).Kt({index:Sa.userMutationsIndex,range:s},((t,e,s)=>{e.userId===this.userId&&(Ks(e.batchId>=n),r=cc(this.N,e)),s.done()})).next((()=>r))}getHighestUnacknowledgedBatchId(t){const e=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let n=-1;return _c(t).Kt({index:Sa.userMutationsIndex,range:e,reverse:!0},((t,e,s)=>{n=e.batchId,s.done()})).next((()=>n))}getAllMutationBatches(t){const e=IDBKeyRange.bound([this.userId,-1],[this.userId,Number.POSITIVE_INFINITY]);return _c(t).Lt(Sa.userMutationsIndex,e).next((t=>t.map((t=>cc(this.N,t)))))}getAllMutationBatchesAffectingDocumentKey(t,e){const n=_a.prefixForPath(this.userId,e.path),s=IDBKeyRange.lowerBound(n),r=[];return Nc(t).Kt({range:s},((n,s,i)=>{const[o,a,c]=n,u=ba(a);if(o===this.userId&&e.path.isEqual(u))return _c(t).get(c).next((t=>{if(!t)throw js();Ks(t.userId===this.userId),r.push(cc(this.N,t))}));i.done()})).next((()=>r))}getAllMutationBatchesAffectingDocumentKeys(t,e){let n=new yo(rr);const s=[];return e.forEach((e=>{const r=_a.prefixForPath(this.userId,e.path),i=IDBKeyRange.lowerBound(r),o=Nc(t).Kt({range:i},((t,s,r)=>{const[i,o,a]=t,c=ba(o);i===this.userId&&e.path.isEqual(c)?n=n.add(a):r.done()}));s.push(o)})),qa.waitFor(s).next((()=>this.Zt(t,n)))}getAllMutationBatchesAffectingQuery(t,e){const n=e.path,s=n.length+1,r=_a.prefixForPath(this.userId,n),i=IDBKeyRange.lowerBound(r);let o=new yo(rr);return Nc(t).Kt({range:i},((t,e,r)=>{const[i,a,c]=t,u=ba(a);i===this.userId&&n.isPrefixOf(u)?u.length===s&&(o=o.add(c)):r.done()})).next((()=>this.Zt(t,o)))}Zt(t,e){const n=[],s=[];return e.forEach((e=>{s.push(_c(t).get(e).next((t=>{if(null===t)throw js();Ks(t.userId===this.userId),n.push(cc(this.N,t))})))})),qa.waitFor(s).next((()=>n))}removeMutationBatch(t,e){return Ec(t.Qt,this.userId,e).next((n=>(t.addOnCommittedListener((()=>{this.te(e.batchId)})),qa.forEach(n,(e=>this.referenceDelegate.markPotentiallyOrphaned(t,e))))))}te(t){delete this.Jt[t]}performConsistencyCheck(t){return this.checkEmpty(t).next((e=>{if(!e)return qa.resolve();const n=IDBKeyRange.lowerBound(_a.prefixForUser(this.userId)),s=[];return Nc(t).Kt({range:n},((t,e,n)=>{if(t[0]===this.userId){const e=ba(t[1]);s.push(e)}else n.done()})).next((()=>{Ks(0===s.length)}))}))}containsKey(t,e){return Sc(t,this.userId,e)}ee(t){return Ac(t).get(this.userId).next((t=>t||new Ia(this.userId,-1,"")))}}function Sc(t,e,n){const s=_a.prefixForPath(e,n.path),r=s[1],i=IDBKeyRange.lowerBound(s);let o=!1;return Nc(t).Kt({range:i,qt:!0},((t,n,s)=>{const[i,a,c]=t;i===e&&a===r&&(o=!0),s.done()})).next((()=>o))}function _c(t){return Xa(t,Sa.store)}function Nc(t){return Xa(t,_a.store)}function Ac(t){return Xa(t,Ia.store)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Dc{constructor(t){this.ne=t}next(){return this.ne+=2,this.ne}static se(){return new Dc(0)}static ie(){return new Dc(-1)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xc{constructor(t,e){this.referenceDelegate=t,this.N=e}allocateTargetId(t){return this.re(t).next((e=>{const n=new Dc(e.highestTargetId);return e.highestTargetId=n.next(),this.oe(t,e).next((()=>e.highestTargetId))}))}getLastRemoteSnapshotVersion(t){return this.re(t).next((t=>cr.fromTimestamp(new ar(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds))))}getHighestSequenceNumber(t){return this.re(t).next((t=>t.highestListenSequenceNumber))}setTargetsMetadata(t,e,n){return this.re(t).next((s=>(s.highestListenSequenceNumber=e,n&&(s.lastRemoteSnapshotVersion=n.toTimestamp()),e>s.highestListenSequenceNumber&&(s.highestListenSequenceNumber=e),this.oe(t,s))))}addTargetData(t,e){return this.ce(t,e).next((()=>this.re(t).next((n=>(n.targetCount+=1,this.ae(e,n),this.oe(t,n))))))}updateTargetData(t,e){return this.ce(t,e)}removeTargetData(t,e){return this.removeMatchingKeysForTargetId(t,e.targetId).next((()=>Cc(t).delete(e.targetId))).next((()=>this.re(t))).next((e=>(Ks(e.targetCount>0),e.targetCount-=1,this.oe(t,e))))}removeTargets(t,e,n){let s=0;const r=[];return Cc(t).Kt(((i,o)=>{const a=uc(o);a.sequenceNumber<=e&&null===n.get(a.targetId)&&(s++,r.push(this.removeTargetData(t,a)))})).next((()=>qa.waitFor(r))).next((()=>s))}forEachTarget(t,e){return Cc(t).Kt(((t,n)=>{const s=uc(n);e(s)}))}re(t){return kc(t).get(Ra.key).next((t=>(Ks(null!==t),t)))}oe(t,e){return kc(t).put(Ra.key,e)}ce(t,e){return Cc(t).put(hc(this.N,e))}ae(t,e){let n=!1;return t.targetId>e.highestTargetId&&(e.highestTargetId=t.targetId,n=!0),t.sequenceNumber>e.highestListenSequenceNumber&&(e.highestListenSequenceNumber=t.sequenceNumber,n=!0),n}getTargetCount(t){return this.re(t).next((t=>t.targetCount))}getTargetData(t,e){const n=Wr(e),s=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]);let r=null;return Cc(t).Kt({range:s,index:Ca.queryTargetsIndexName},((t,n,s)=>{const i=uc(n);Yr(e,i.target)&&(r=i,s.done())})).next((()=>r))}addMatchingKeys(t,e,n){const s=[],r=Rc(t);return e.forEach((e=>{const i=ya(e.path);s.push(r.put(new ka(n,i))),s.push(this.referenceDelegate.addReference(t,n,e))})),qa.waitFor(s)}removeMatchingKeys(t,e,n){const s=Rc(t);return qa.forEach(e,(e=>{const r=ya(e.path);return qa.waitFor([s.delete([n,r]),this.referenceDelegate.removeReference(t,n,e)])}))}removeMatchingKeysForTargetId(t,e){const n=Rc(t),s=IDBKeyRange.bound([e],[e+1],!1,!0);return n.delete(s)}getMatchingKeysForTargetId(t,e){const n=IDBKeyRange.bound([e],[e+1],!1,!0),s=Rc(t);let r=No();return s.Kt({range:n,qt:!0},((t,e,n)=>{const s=ba(t[1]),i=new xr(s);r=r.add(i)})).next((()=>r))}containsKey(t,e){const n=ya(e.path),s=IDBKeyRange.bound([n],[or(n)],!1,!0);let r=0;return Rc(t).Kt({index:ka.documentTargetsIndex,qt:!0,range:s},(([t,e],n,s)=>{0!==t&&(r++,s.done())})).next((()=>r>0))}Tt(t,e){return Cc(t).get(e).next((t=>t?uc(t):null))}}function Cc(t){return Xa(t,Ca.store)}function kc(t){return Xa(t,Ra.store)}function Rc(t){return Xa(t,ka.store)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Lc(t){if(t.code!==Hs.FAILED_PRECONDITION||t.message!==Va)throw t;Vs("LocalStore","Unexpectedly lost primary lease")}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Oc([t,e],[n,s]){const r=rr(t,n);return 0===r?rr(e,s):r}class Mc{constructor(t){this.ue=t,this.buffer=new yo(Oc),this.he=0}le(){return++this.he}fe(t){const e=[t,this.le()];if(this.buffer.size<this.ue)this.buffer=this.buffer.add(e);else{const t=this.buffer.last();Oc(e,t)<0&&(this.buffer=this.buffer.delete(t).add(e))}}get maxValue(){return this.buffer.last()[0]}}class Fc{constructor(t,e){this.garbageCollector=t,this.asyncQueue=e,this.de=!1,this.we=null}start(t){-1!==this.garbageCollector.params.cacheSizeCollectionThreshold&&this._e(t)}stop(){this.we&&(this.we.cancel(),this.we=null)}get started(){return null!==this.we}_e(t){const e=this.de?3e5:6e4;Vs("LruGarbageCollector",`Garbage collection scheduled in ${e}ms`),this.we=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,(async()=>{this.we=null,this.de=!0;try{await t.collectGarbage(this.garbageCollector)}catch(t){Ga(t)?Vs("LruGarbageCollector","Ignoring IndexedDB error during garbage collection: ",t):await Lc(t)}await this._e(t)}))}}class Pc{constructor(t,e){this.me=t,this.params=e}calculateTargetCount(t,e){return this.me.ge(t).next((t=>Math.floor(e/100*t)))}nthSequenceNumber(t,e){if(0===e)return qa.resolve(er.T);const n=new Mc(e);return this.me.forEachTarget(t,(t=>n.fe(t.sequenceNumber))).next((()=>this.me.ye(t,(t=>n.fe(t))))).next((()=>n.maxValue))}removeTargets(t,e,n){return this.me.removeTargets(t,e,n)}removeOrphanedDocuments(t,e){return this.me.removeOrphanedDocuments(t,e)}collect(t,e){return-1===this.params.cacheSizeCollectionThreshold?(Vs("LruGarbageCollector","Garbage collection skipped; disabled"),qa.resolve(vc)):this.getCacheSize(t).next((n=>n<this.params.cacheSizeCollectionThreshold?(Vs("LruGarbageCollector",`Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),vc):this.pe(t,e)))}getCacheSize(t){return this.me.getCacheSize(t)}pe(t,e){let n,s,r,i,o,a,c;const u=Date.now();return this.calculateTargetCount(t,this.params.percentileToCollect).next((e=>(e>this.params.maximumSequenceNumbersToCollect?(Vs("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${e}`),s=this.params.maximumSequenceNumbersToCollect):s=e,i=Date.now(),this.nthSequenceNumber(t,s)))).next((s=>(n=s,o=Date.now(),this.removeTargets(t,n,e)))).next((e=>(r=e,a=Date.now(),this.removeOrphanedDocuments(t,n)))).next((t=>(c=Date.now(),Fs()<=p.DEBUG&&Vs("LruGarbageCollector",`LRU Garbage Collection\n\tCounted targets in ${i-u}ms\n\tDetermined least recently used ${s} in `+(o-i)+"ms\n"+`\tRemoved ${r} targets in `+(a-o)+"ms\n"+`\tRemoved ${t} documents in `+(c-a)+"ms\n"+`Total Duration: ${c-u}ms`),qa.resolve({didRun:!0,sequenceNumbersCollected:s,targetsRemoved:r,documentsRemoved:t}))))}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vc{constructor(t,e){this.db=t,this.garbageCollector=function(t,e){return new Pc(t,e)}(this,e)}ge(t){const e=this.Te(t);return this.db.getTargetCache().getTargetCount(t).next((t=>e.next((e=>t+e))))}Te(t){let e=0;return this.ye(t,(t=>{e++})).next((()=>e))}forEachTarget(t,e){return this.db.getTargetCache().forEachTarget(t,e)}ye(t,e){return this.Ee(t,((t,n)=>e(n)))}addReference(t,e,n){return Uc(t,n)}removeReference(t,e,n){return Uc(t,n)}removeTargets(t,e,n){return this.db.getTargetCache().removeTargets(t,e,n)}markPotentiallyOrphaned(t,e){return Uc(t,e)}Ie(t,e){return function(t,e){let n=!1;return Ac(t).jt((s=>Sc(t,s,e).next((t=>(t&&(n=!0),qa.resolve(!t)))))).next((()=>n))}(t,e)}removeOrphanedDocuments(t,e){const n=this.db.getRemoteDocumentCache().newChangeBuffer(),s=[];let r=0;return this.Ee(t,((i,o)=>{if(o<=e){const e=this.Ie(t,i).next((e=>{if(!e)return r++,n.getEntry(t,i).next((()=>(n.removeEntry(i),Rc(t).delete([0,ya(i.path)]))))}));s.push(e)}})).next((()=>qa.waitFor(s))).next((()=>n.apply(t))).next((()=>r))}removeTarget(t,e){const n=e.withSequenceNumber(t.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(t,n)}updateLimboDocument(t,e){return Uc(t,e)}Ee(t,e){const n=Rc(t);let s,r=er.T;return n.Kt({index:ka.documentTargetsIndex},(([t,n],{path:i,sequenceNumber:o})=>{0===t?(r!==er.T&&e(new xr(ba(s)),r),r=o,s=i):r=er.T})).next((()=>{r!==er.T&&e(new xr(ba(s)),r)}))}getCacheSize(t){return this.db.getRemoteDocumentCache().getSize(t)}}function Uc(t,e){return Rc(t).put(function(t,e){return new ka(0,ya(t.path),e)}(e,t.currentSequenceNumber))}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qc{constructor(t,e){this.mapKeyFn=t,this.equalsFn=e,this.inner={}}get(t){const e=this.mapKeyFn(t),n=this.inner[e];if(void 0!==n)for(const[e,s]of n)if(this.equalsFn(e,t))return s}has(t){return void 0!==this.get(t)}set(t,e){const n=this.mapKeyFn(t),s=this.inner[n];if(void 0!==s){for(let n=0;n<s.length;n++)if(this.equalsFn(s[n][0],t))return void(s[n]=[t,e]);s.push([t,e])}else this.inner[n]=[[t,e]]}delete(t){const e=this.mapKeyFn(t),n=this.inner[e];if(void 0===n)return!1;for(let s=0;s<n.length;s++)if(this.equalsFn(n[s][0],t))return 1===n.length?delete this.inner[e]:n.splice(s,1),!0;return!1}forEach(t){hr(this.inner,((e,n)=>{for(const[e,s]of n)t(e,s)}))}isEmpty(){return lr(this.inner)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bc{constructor(){this.changes=new qc((t=>t.toString()),((t,e)=>t.isEqual(e))),this.changesApplied=!1}getReadTime(t){const e=this.changes.get(t);return e?e.readTime:cr.min()}addEntry(t,e){this.assertNotApplied(),this.changes.set(t.key,{document:t,readTime:e})}removeEntry(t,e=null){this.assertNotApplied(),this.changes.set(t,{document:Hr.newInvalidDocument(t),readTime:e})}getEntry(t,e){this.assertNotApplied();const n=this.changes.get(e);return void 0!==n?qa.resolve(n.document):this.getFromCache(t,e)}getEntries(t,e){return this.getAllFromCache(t,e)}apply(t){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(t)}assertNotApplied(){}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jc{constructor(t,e){this.N=t,this.Ht=e}addEntry(t,e,n){return Gc(t).put(Hc(e),n)}removeEntry(t,e){const n=Gc(t),s=Hc(e);return n.delete(s)}updateMetadata(t,e){return this.getMetadata(t).next((n=>(n.byteSize+=e,this.Ae(t,n))))}getEntry(t,e){return Gc(t).get(Hc(e)).next((t=>this.Re(e,t)))}be(t,e){return Gc(t).get(Hc(e)).next((t=>({document:this.Re(e,t),size:Tc(t)})))}getEntries(t,e){let n=bo();return this.Pe(t,e,((t,e)=>{const s=this.Re(t,e);n=n.insert(t,s)})).next((()=>n))}ve(t,e){let n=bo(),s=new go(xr.comparator);return this.Pe(t,e,((t,e)=>{const r=this.Re(t,e);n=n.insert(t,r),s=s.insert(t,Tc(e))})).next((()=>({documents:n,Ve:s})))}Pe(t,e,n){if(e.isEmpty())return qa.resolve();const s=IDBKeyRange.bound(e.first().path.toArray(),e.last().path.toArray()),r=e.getIterator();let i=r.getNext();return Gc(t).Kt({range:s},((t,e,s)=>{const o=xr.fromSegments(t);for(;i&&xr.comparator(i,o)<0;)n(i,null),i=r.getNext();i&&i.isEqual(o)&&(n(i,e),i=r.hasNext()?r.getNext():null),i?s.Mt(i.path.toArray()):s.done()})).next((()=>{for(;i;)n(i,null),i=r.hasNext()?r.getNext():null}))}getDocumentsMatchingQuery(t,e,n){let s=bo();const r=e.path.length+1,i={};if(n.isEqual(cr.min())){const t=e.path.toArray();i.range=IDBKeyRange.lowerBound(t)}else{const t=e.path.toArray(),s=rc(n);i.range=IDBKeyRange.lowerBound([t,s],!0),i.index=Da.collectionReadTimeIndex}return Gc(t).Kt(i,((t,n,i)=>{if(t.length!==r)return;const o=nc(this.N,n);e.path.isPrefixOf(o.key.path)?Ai(e,o)&&(s=s.insert(o.key,o)):i.done()})).next((()=>s))}newChangeBuffer(t){return new Kc(this,!!t&&t.trackRemovals)}getSize(t){return this.getMetadata(t).next((t=>t.byteSize))}getMetadata(t){return $c(t).get(xa.key).next((t=>(Ks(!!t),t)))}Ae(t,e){return $c(t).put(xa.key,e)}Re(t,e){if(e){const t=nc(this.N,e);if(!t.isNoDocument()||!t.version.isEqual(cr.min()))return t}return Hr.newInvalidDocument(t)}}class Kc extends Bc{constructor(t,e){super(),this.Se=t,this.trackRemovals=e,this.De=new qc((t=>t.toString()),((t,e)=>t.isEqual(e)))}applyChanges(t){const e=[];let n=0,s=new yo(((t,e)=>rr(t.canonicalString(),e.canonicalString())));return this.changes.forEach(((r,i)=>{const o=this.De.get(r);if(i.document.isValidDocument()){const a=sc(this.Se.N,i.document,this.getReadTime(r));s=s.add(r.path.popLast());const c=Tc(a);n+=c-o,e.push(this.Se.addEntry(t,r,a))}else if(n-=o,this.trackRemovals){const n=sc(this.Se.N,Hr.newNoDocument(r,cr.min()),this.getReadTime(r));e.push(this.Se.addEntry(t,r,n))}else e.push(this.Se.removeEntry(t,r))})),s.forEach((n=>{e.push(this.Se.Ht.addToCollectionParentIndex(t,n))})),e.push(this.Se.updateMetadata(t,n)),qa.waitFor(e)}getFromCache(t,e){return this.Se.be(t,e).next((t=>(this.De.set(e,t.size),t.document)))}getAllFromCache(t,e){return this.Se.ve(t,e).next((({documents:t,Ve:e})=>(e.forEach(((t,e)=>{this.De.set(t,e)})),t)))}}function $c(t){return Xa(t,xa.store)}function Gc(t){return Xa(t,Da.store)}function Hc(t){return t.path.toArray()}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zc{constructor(t){this.N=t}Ct(t,e,n,s){Ks(n<s&&n>=0&&s<=11);const r=new Ba("createOrUpgrade",e);n<1&&s>=1&&(function(t){t.createObjectStore(Ta.store)}(t),function(t){t.createObjectStore(Ia.store,{keyPath:Ia.keyPath}),t.createObjectStore(Sa.store,{keyPath:Sa.keyPath,autoIncrement:!0}).createIndex(Sa.userMutationsIndex,Sa.userMutationsKeyPath,{unique:!0}),t.createObjectStore(_a.store)}(t),Qc(t),function(t){t.createObjectStore(Da.store)}(t));let i=qa.resolve();return n<3&&s>=3&&(0!==n&&(function(t){t.deleteObjectStore(ka.store),t.deleteObjectStore(Ca.store),t.deleteObjectStore(Ra.store)}(t),Qc(t)),i=i.next((()=>function(t){const e=t.store(Ra.store),n=new Ra(0,0,cr.min().toTimestamp(),0);return e.put(Ra.key,n)}(r)))),n<4&&s>=4&&(0!==n&&(i=i.next((()=>function(t,e){return e.store(Sa.store).Lt().next((n=>{t.deleteObjectStore(Sa.store),t.createObjectStore(Sa.store,{keyPath:Sa.keyPath,autoIncrement:!0}).createIndex(Sa.userMutationsIndex,Sa.userMutationsKeyPath,{unique:!0});const s=e.store(Sa.store),r=n.map((t=>s.put(t)));return qa.waitFor(r)}))}(t,r)))),i=i.next((()=>{!function(t){t.createObjectStore(Oa.store,{keyPath:Oa.keyPath})}(t)}))),n<5&&s>=5&&(i=i.next((()=>this.Ce(r)))),n<6&&s>=6&&(i=i.next((()=>(function(t){t.createObjectStore(xa.store)}(t),this.Ne(r))))),n<7&&s>=7&&(i=i.next((()=>this.xe(r)))),n<8&&s>=8&&(i=i.next((()=>this.ke(t,r)))),n<9&&s>=9&&(i=i.next((()=>{!function(t){t.objectStoreNames.contains("remoteDocumentChanges")&&t.deleteObjectStore("remoteDocumentChanges")}(t),function(t){const e=t.objectStore(Da.store);e.createIndex(Da.readTimeIndex,Da.readTimeIndexPath,{unique:!1}),e.createIndex(Da.collectionReadTimeIndex,Da.collectionReadTimeIndexPath,{unique:!1})}(e)}))),n<10&&s>=10&&(i=i.next((()=>this.$e(r)))),n<11&&s>=11&&(i=i.next((()=>{!function(t){t.createObjectStore(Ma.store,{keyPath:Ma.keyPath})}(t),function(t){t.createObjectStore(Fa.store,{keyPath:Fa.keyPath})}(t)}))),i}Ne(t){let e=0;return t.store(Da.store).Kt(((t,n)=>{e+=Tc(n)})).next((()=>{const n=new xa(e);return t.store(xa.store).put(xa.key,n)}))}Ce(t){const e=t.store(Ia.store),n=t.store(Sa.store);return e.Lt().next((e=>qa.forEach(e,(e=>{const s=IDBKeyRange.bound([e.userId,-1],[e.userId,e.lastAcknowledgedBatchId]);return n.Lt(Sa.userMutationsIndex,s).next((n=>qa.forEach(n,(n=>{Ks(n.userId===e.userId);const s=cc(this.N,n);return Ec(t,e.userId,s).next((()=>{}))}))))}))))}xe(t){const e=t.store(ka.store),n=t.store(Da.store);return t.store(Ra.store).get(Ra.key).next((t=>{const s=[];return n.Kt(((n,r)=>{const i=new fr(n),o=function(t){return[0,ya(t)]}(i);s.push(e.get(o).next((n=>n?qa.resolve():(n=>e.put(new ka(0,ya(n),t.highestListenSequenceNumber)))(i))))})).next((()=>qa.waitFor(s)))}))}ke(t,e){t.createObjectStore(La.store,{keyPath:La.keyPath});const n=e.store(La.store),s=new pc,r=t=>{if(s.add(t)){const e=t.lastSegment(),s=t.popLast();return n.put({collectionId:e,parent:ya(s)})}};return e.store(Da.store).Kt({qt:!0},((t,e)=>{const n=new fr(t);return r(n.popLast())})).next((()=>e.store(_a.store).Kt({qt:!0},(([t,e,n],s)=>{const i=ba(e);return r(i.popLast())}))))}$e(t){const e=t.store(Ca.store);return e.Kt(((t,n)=>{const s=uc(n),r=hc(this.N,s);return e.put(r)}))}}function Qc(t){t.createObjectStore(ka.store,{keyPath:ka.keyPath}).createIndex(ka.documentTargetsIndex,ka.documentTargetsKeyPath,{unique:!0}),t.createObjectStore(Ca.store,{keyPath:Ca.keyPath}).createIndex(Ca.queryTargetsIndexName,Ca.queryTargetsKeyPath,{unique:!0}),t.createObjectStore(Ra.store)}const Wc="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.";class Yc{constructor(t,e,n,s,r,i,o,a,c,u){if(this.allowTabSynchronization=t,this.persistenceKey=e,this.clientId=n,this.Oe=r,this.window=i,this.document=o,this.Fe=c,this.Me=u,this.Le=null,this.Be=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Ue=null,this.inForeground=!1,this.qe=null,this.Ke=null,this.je=Number.NEGATIVE_INFINITY,this.Qe=t=>Promise.resolve(),!Yc.bt())throw new zs(Hs.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new Vc(this,s),this.We=e+"main",this.N=new ec(a),this.Ge=new ja(this.We,11,new zc(this.N)),this.ze=new xc(this.referenceDelegate,this.N),this.Ht=new yc,this.He=function(t,e){return new jc(t,e)}(this.N,this.Ht),this.Je=new dc,this.window&&this.window.localStorage?this.Ye=this.window.localStorage:(this.Ye=null,!1===u&&Us("IndexedDbPersistence","LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.Xe().then((()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new zs(Hs.FAILED_PRECONDITION,Wc);return this.Ze(),this.tn(),this.en(),this.runTransaction("getHighestListenSequenceNumber","readonly",(t=>this.ze.getHighestSequenceNumber(t)))})).then((t=>{this.Le=new er(t,this.Fe)})).then((()=>{this.Be=!0})).catch((t=>(this.Ge&&this.Ge.close(),Promise.reject(t))))}nn(t){return this.Qe=async e=>{if(this.started)return t(e)},t(this.isPrimary)}setDatabaseDeletedListener(t){this.Ge.xt((async e=>{null===e.newVersion&&await t()}))}setNetworkEnabled(t){this.networkEnabled!==t&&(this.networkEnabled=t,this.Oe.enqueueAndForget((async()=>{this.started&&await this.Xe()})))}Xe(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",(t=>Jc(t).put(new Oa(this.clientId,Date.now(),this.networkEnabled,this.inForeground)).next((()=>{if(this.isPrimary)return this.sn(t).next((t=>{t||(this.isPrimary=!1,this.Oe.enqueueRetryable((()=>this.Qe(!1))))}))})).next((()=>this.rn(t))).next((e=>this.isPrimary&&!e?this.on(t).next((()=>!1)):!!e&&this.cn(t).next((()=>!0)))))).catch((t=>{if(Ga(t))return Vs("IndexedDbPersistence","Failed to extend owner lease: ",t),this.isPrimary;if(!this.allowTabSynchronization)throw t;return Vs("IndexedDbPersistence","Releasing owner lease after error during lease refresh",t),!1})).then((t=>{this.isPrimary!==t&&this.Oe.enqueueRetryable((()=>this.Qe(t))),this.isPrimary=t}))}sn(t){return Xc(t).get(Ta.key).next((t=>qa.resolve(this.an(t))))}un(t){return Jc(t).delete(this.clientId)}async hn(){if(this.isPrimary&&!this.ln(this.je,18e5)){this.je=Date.now();const t=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",(t=>{const e=Xa(t,Oa.store);return e.Lt().next((t=>{const n=this.fn(t,18e5),s=t.filter((t=>-1===n.indexOf(t)));return qa.forEach(s,(t=>e.delete(t.clientId))).next((()=>s))}))})).catch((()=>[]));if(this.Ye)for(const e of t)this.Ye.removeItem(this.dn(e.clientId))}}en(){this.Ke=this.Oe.enqueueAfterDelay("client_metadata_refresh",4e3,(()=>this.Xe().then((()=>this.hn())).then((()=>this.en()))))}an(t){return!!t&&t.ownerId===this.clientId}rn(t){return this.Me?qa.resolve(!0):Xc(t).get(Ta.key).next((e=>{if(null!==e&&this.ln(e.leaseTimestampMs,5e3)&&!this.wn(e.ownerId)){if(this.an(e)&&this.networkEnabled)return!0;if(!this.an(e)){if(!e.allowTabSynchronization)throw new zs(Hs.FAILED_PRECONDITION,Wc);return!1}}return!(!this.networkEnabled||!this.inForeground)||Jc(t).Lt().next((t=>void 0===this.fn(t,5e3).find((t=>{if(this.clientId!==t.clientId){const e=!this.networkEnabled&&t.networkEnabled,n=!this.inForeground&&t.inForeground,s=this.networkEnabled===t.networkEnabled;if(e||n&&s)return!0}return!1}))))})).next((t=>(this.isPrimary!==t&&Vs("IndexedDbPersistence",`Client ${t?"is":"is not"} eligible for a primary lease.`),t)))}async shutdown(){this.Be=!1,this._n(),this.Ke&&(this.Ke.cancel(),this.Ke=null),this.mn(),this.gn(),await this.Ge.runTransaction("shutdown","readwrite",[Ta.store,Oa.store],(t=>{const e=new Ya(t,er.T);return this.on(e).next((()=>this.un(e)))})),this.Ge.close(),this.yn()}fn(t,e){return t.filter((t=>this.ln(t.updateTimeMs,e)&&!this.wn(t.clientId)))}pn(){return this.runTransaction("getActiveClients","readonly",(t=>Jc(t).Lt().next((t=>this.fn(t,18e5).map((t=>t.clientId))))))}get started(){return this.Be}getMutationQueue(t){return Ic.Yt(t,this.N,this.Ht,this.referenceDelegate)}getTargetCache(){return this.ze}getRemoteDocumentCache(){return this.He}getIndexManager(){return this.Ht}getBundleCache(){return this.Je}runTransaction(t,e,n){Vs("IndexedDbPersistence","Starting transaction:",t);const s="readonly"===e?"readonly":"readwrite";let r;return this.Ge.runTransaction(t,s,Pa,(s=>(r=new Ya(s,this.Le?this.Le.next():er.T),"readwrite-primary"===e?this.sn(r).next((t=>!!t||this.rn(r))).next((e=>{if(!e)throw Us(`Failed to obtain primary lease for action '${t}'.`),this.isPrimary=!1,this.Oe.enqueueRetryable((()=>this.Qe(!1))),new zs(Hs.FAILED_PRECONDITION,Va);return n(r)})).next((t=>this.cn(r).next((()=>t)))):this.Tn(r).next((()=>n(r)))))).then((t=>(r.raiseOnCommittedEvent(),t)))}Tn(t){return Xc(t).get(Ta.key).next((t=>{if(null!==t&&this.ln(t.leaseTimestampMs,5e3)&&!this.wn(t.ownerId)&&!this.an(t)&&!(this.Me||this.allowTabSynchronization&&t.allowTabSynchronization))throw new zs(Hs.FAILED_PRECONDITION,Wc)}))}cn(t){const e=new Ta(this.clientId,this.allowTabSynchronization,Date.now());return Xc(t).put(Ta.key,e)}static bt(){return ja.bt()}on(t){const e=Xc(t);return e.get(Ta.key).next((t=>this.an(t)?(Vs("IndexedDbPersistence","Releasing primary lease."),e.delete(Ta.key)):qa.resolve()))}ln(t,e){const n=Date.now();return!(t<n-e||t>n&&(Us(`Detected an update time that is in the future: ${t} > ${n}`),1))}Ze(){null!==this.document&&"function"==typeof this.document.addEventListener&&(this.qe=()=>{this.Oe.enqueueAndForget((()=>(this.inForeground="visible"===this.document.visibilityState,this.Xe())))},this.document.addEventListener("visibilitychange",this.qe),this.inForeground="visible"===this.document.visibilityState)}mn(){this.qe&&(this.document.removeEventListener("visibilitychange",this.qe),this.qe=null)}tn(){var t;"function"==typeof(null===(t=this.window)||void 0===t?void 0:t.addEventListener)&&(this.Ue=()=>{this._n(),l()&&navigator.appVersion.match("Version/14")&&this.Oe.enterRestrictedMode(!0),this.Oe.enqueueAndForget((()=>this.shutdown()))},this.window.addEventListener("pagehide",this.Ue))}gn(){this.Ue&&(this.window.removeEventListener("pagehide",this.Ue),this.Ue=null)}wn(t){var e;try{const n=null!==(null===(e=this.Ye)||void 0===e?void 0:e.getItem(this.dn(t)));return Vs("IndexedDbPersistence",`Client '${t}' ${n?"is":"is not"} zombied in LocalStorage`),n}catch(t){return Us("IndexedDbPersistence","Failed to get zombied client id.",t),!1}}_n(){if(this.Ye)try{this.Ye.setItem(this.dn(this.clientId),String(Date.now()))}catch(t){Us("Failed to set zombie client id.",t)}}yn(){if(this.Ye)try{this.Ye.removeItem(this.dn(this.clientId))}catch(t){}}dn(t){return`firestore_zombie_${this.persistenceKey}_${t}`}}function Xc(t){return Xa(t,Ta.store)}function Jc(t){return Xa(t,Oa.store)}function Zc(t,e){let n=t.projectId;return t.isDefaultDatabase||(n+="."+t.database),"firestore/"+e+"/"+n+"/"
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}class tu{constructor(t,e){this.progress=t,this.En=e}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eu{constructor(t,e,n){this.He=t,this.In=e,this.Ht=n}An(t,e){return this.In.getAllMutationBatchesAffectingDocumentKey(t,e).next((n=>this.Rn(t,e,n)))}Rn(t,e,n){return this.He.getEntry(t,e).next((t=>{for(const e of n)e.applyToLocalView(t);return t}))}bn(t,e){t.forEach(((t,n)=>{for(const t of e)t.applyToLocalView(n)}))}Pn(t,e){return this.He.getEntries(t,e).next((e=>this.vn(t,e).next((()=>e))))}vn(t,e){return this.In.getAllMutationBatchesAffectingDocumentKeys(t,e).next((t=>this.bn(e,t)))}getDocumentsMatchingQuery(t,e,n){return function(t){return xr.isDocumentKey(t.path)&&null===t.collectionGroup&&0===t.filters.length}(e)?this.Vn(t,e.path):bi(e)?this.Sn(t,e,n):this.Dn(t,e,n)}Vn(t,e){return this.An(t,new xr(e)).next((t=>{let e=To();return t.isFoundDocument()&&(e=e.insert(t.key,t)),e}))}Sn(t,e,n){const s=e.collectionGroup;let r=To();return this.Ht.getCollectionParents(t,s).next((i=>qa.forEach(i,(i=>{const o=function(t,e){return new fi(e,null,t.explicitOrderBy.slice(),t.filters.slice(),t.limit,t.limitType,t.startAt,t.endAt)}(e,i.child(s));return this.Dn(t,o,n).next((t=>{t.forEach(((t,e)=>{r=r.insert(t,e)}))}))})).next((()=>r))))}Dn(t,e,n){let s,r;return this.He.getDocumentsMatchingQuery(t,e,n).next((n=>(s=n,this.In.getAllMutationBatchesAffectingQuery(t,e)))).next((e=>(r=e,this.Cn(t,r,s).next((t=>{s=t;for(const t of r)for(const e of t.mutations){const n=e.key;let r=s.get(n);null==r&&(r=Hr.newInvalidDocument(n),s=s.insert(n,r)),Xi(e,r,t.localWriteTime),r.isFoundDocument()||(s=s.remove(n))}}))))).next((()=>(s.forEach(((t,n)=>{Ai(e,n)||(s=s.remove(t))})),s)))}Cn(t,e,n){let s=No();for(const t of e)for(const e of t.mutations)e instanceof no&&null===n.get(e.key)&&(s=s.add(e.key));let r=n;return this.He.getEntries(t,s).next((t=>(t.forEach(((t,e)=>{e.isFoundDocument()&&(r=r.insert(t,e))})),r)))}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nu{constructor(t,e,n,s){this.targetId=t,this.fromCache=e,this.Nn=n,this.xn=s}static kn(t,e){let n=No(),s=No();for(const t of e.docChanges)switch(t.type){case 0:n=n.add(t.doc.key);break;case 1:s=s.add(t.doc.key)}return new nu(t,e.fromCache,n,s)}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class su{$n(t){this.On=t}getDocumentsMatchingQuery(t,e,n,s){return function(t){return 0===t.filters.length&&null===t.limit&&null==t.startAt&&null==t.endAt&&(0===t.explicitOrderBy.length||1===t.explicitOrderBy.length&&t.explicitOrderBy[0].field.isKeyField())}(e)||n.isEqual(cr.min())?this.Fn(t,e):this.On.Pn(t,s).next((r=>{const i=this.Mn(e,r);return(pi(e)||yi(e))&&this.Ln(e.limitType,i,s,n)?this.Fn(t,e):(Fs()<=p.DEBUG&&Vs("QueryEngine","Re-using previous result from %s to execute query: %s",n.toString(),Ni(e)),this.On.getDocumentsMatchingQuery(t,e,n).next((t=>(i.forEach((e=>{t=t.insert(e.key,e)})),t))))}))}Mn(t,e){let n=new yo(Di(t));return e.forEach(((e,s)=>{Ai(t,s)&&(n=n.add(s))})),n}Ln(t,e,n,s){if(n.size!==e.size)return!0;const r="F"===t?e.last():e.first();return!!r&&(r.hasPendingWrites||r.version.compareTo(s)>0)}Fn(t,e){return Fs()<=p.DEBUG&&Vs("QueryEngine","Using full collection scan to execute query:",Ni(e)),this.On.getDocumentsMatchingQuery(t,e,cr.min())}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ru{constructor(t,e,n,s){this.persistence=t,this.Bn=e,this.N=s,this.Un=new go(rr),this.qn=new qc((t=>Wr(t)),Yr),this.Kn=cr.min(),this.In=t.getMutationQueue(n),this.jn=t.getRemoteDocumentCache(),this.ze=t.getTargetCache(),this.Qn=new eu(this.jn,this.In,this.persistence.getIndexManager()),this.Je=t.getBundleCache(),this.Bn.$n(this.Qn)}collectGarbage(t){return this.persistence.runTransaction("Collect garbage","readwrite-primary",(e=>t.collect(e,this.Un)))}}function iu(t,e,n,s){return new ru(t,e,n,s)}async function ou(t,e){const n=Gs(t);let s=n.In,r=n.Qn;const i=await n.persistence.runTransaction("Handle user change","readonly",(t=>{let i;return n.In.getAllMutationBatches(t).next((o=>(i=o,s=n.persistence.getMutationQueue(e),r=new eu(n.jn,s,n.persistence.getIndexManager()),s.getAllMutationBatches(t)))).next((e=>{const n=[],s=[];let o=No();for(const t of i){n.push(t.batchId);for(const e of t.mutations)o=o.add(e.key)}for(const t of e){s.push(t.batchId);for(const e of t.mutations)o=o.add(e.key)}return r.Pn(t,o).next((t=>({Wn:t,removedBatchIds:n,addedBatchIds:s})))}))}));return n.In=s,n.Qn=r,n.Bn.$n(n.Qn),i}function au(t){const e=Gs(t);return e.persistence.runTransaction("Get last remote snapshot version","readonly",(t=>e.ze.getLastRemoteSnapshotVersion(t)))}function cu(t,e,n,s,r){let i=No();return n.forEach((t=>i=i.add(t))),e.getEntries(t,i).next((t=>{let i=bo();return n.forEach(((n,o)=>{const a=t.get(n),c=(null==r?void 0:r.get(n))||s;o.isNoDocument()&&o.version.isEqual(cr.min())?(e.removeEntry(n,c),i=i.insert(n,o)):!a.isValidDocument()||o.version.compareTo(a.version)>0||0===o.version.compareTo(a.version)&&a.hasPendingWrites?(e.addEntry(o,c),i=i.insert(n,o)):Vs("LocalStore","Ignoring outdated watch update for ",n,". Current version:",a.version," Watch version:",o.version)})),i}))}function uu(t,e){const n=Gs(t);return n.persistence.runTransaction("Get next mutation batch","readonly",(t=>(void 0===e&&(e=-1),n.In.getNextMutationBatchAfterBatchId(t,e))))}function hu(t,e){const n=Gs(t);return n.persistence.runTransaction("Allocate target","readwrite",(t=>{let s;return n.ze.getTargetData(t,e).next((r=>r?(s=r,qa.resolve(s)):n.ze.allocateTargetId(t).next((r=>(s=new tc(e,r,0,t.currentSequenceNumber),n.ze.addTargetData(t,s).next((()=>s)))))))})).then((t=>{const s=n.Un.get(t.targetId);return(null===s||t.snapshotVersion.compareTo(s.snapshotVersion)>0)&&(n.Un=n.Un.insert(t.targetId,t),n.qn.set(e,t.targetId)),t}))}async function lu(t,e,n){const s=Gs(t),r=s.Un.get(e),i=n?"readwrite":"readwrite-primary";try{n||await s.persistence.runTransaction("Release target",i,(t=>s.persistence.referenceDelegate.removeTarget(t,r)))}catch(t){if(!Ga(t))throw t;Vs("LocalStore",`Failed to update sequence numbers for target ${e}: ${t}`)}s.Un=s.Un.remove(e),s.qn.delete(r.target)}function du(t,e,n){const s=Gs(t);let r=cr.min(),i=No();return s.persistence.runTransaction("Execute query","readonly",(t=>function(t,e,n){const s=Gs(t),r=s.qn.get(n);return void 0!==r?qa.resolve(s.Un.get(r)):s.ze.getTargetData(e,n)}(s,t,Ti(e)).next((e=>{if(e)return r=e.lastLimboFreeSnapshotVersion,s.ze.getMatchingKeysForTargetId(t,e.targetId).next((t=>{i=t}))})).next((()=>s.Bn.getDocumentsMatchingQuery(t,e,n?r:cr.min(),n?i:No()))).next((t=>({documents:t,Gn:i})))))}function fu(t,e){const n=Gs(t),s=Gs(n.ze),r=n.Un.get(e);return r?Promise.resolve(r.target):n.persistence.runTransaction("Get target data","readonly",(t=>s.Tt(t,e).next((t=>t?t.target:null))))}function gu(t){const e=Gs(t);return e.persistence.runTransaction("Get new document changes","readonly",(t=>function(t,e,n){const s=Gs(t);let r=bo(),i=rc(n);const o=Gc(e),a=IDBKeyRange.lowerBound(i,!0);return o.Kt({index:Da.readTimeIndex,range:a},((t,e)=>{const n=nc(s.N,e);r=r.insert(n.key,n),i=e.readTime})).next((()=>({En:r,readTime:ic(i)})))}(e.jn,t,e.Kn))).then((({En:t,readTime:n})=>(e.Kn=n,t)))}async function mu(t,e,n=No()){const s=await hu(t,Ti(lc(e.bundledQuery))),r=Gs(t);return r.persistence.runTransaction("Save named query","readwrite",(t=>{const i=$o(e.readTime);if(s.snapshotVersion.compareTo(i)>=0)return r.Je.saveNamedQuery(t,e);const o=s.withResumeToken(wr.EMPTY_BYTE_STRING,i);return r.Un=r.Un.insert(o.targetId,o),r.ze.updateTargetData(t,o).next((()=>r.ze.removeMatchingKeysForTargetId(t,s.targetId))).next((()=>r.ze.addMatchingKeys(t,n,s.targetId))).next((()=>r.Je.saveNamedQuery(t,e)))}))}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pu{constructor(t){this.N=t,this.Yn=new Map,this.Xn=new Map}getBundleMetadata(t,e){return qa.resolve(this.Yn.get(e))}saveBundleMetadata(t,e){var n;return this.Yn.set(e.id,{id:(n=e).id,version:n.version,createTime:$o(n.createTime)}),qa.resolve()}getNamedQuery(t,e){return qa.resolve(this.Xn.get(e))}saveNamedQuery(t,e){return this.Xn.set(e.name,function(t){return{name:t.name,query:lc(t.bundledQuery),readTime:$o(t.readTime)}}(e)),qa.resolve()}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yu{constructor(){this.Zn=new yo(wu.ts),this.es=new yo(wu.ns)}isEmpty(){return this.Zn.isEmpty()}addReference(t,e){const n=new wu(t,e);this.Zn=this.Zn.add(n),this.es=this.es.add(n)}ss(t,e){t.forEach((t=>this.addReference(t,e)))}removeReference(t,e){this.rs(new wu(t,e))}os(t,e){t.forEach((t=>this.removeReference(t,e)))}cs(t){const e=new xr(new fr([])),n=new wu(e,t),s=new wu(e,t+1),r=[];return this.es.forEachInRange([n,s],(t=>{this.rs(t),r.push(t.key)})),r}us(){this.Zn.forEach((t=>this.rs(t)))}rs(t){this.Zn=this.Zn.delete(t),this.es=this.es.delete(t)}hs(t){const e=new xr(new fr([])),n=new wu(e,t),s=new wu(e,t+1);let r=No();return this.es.forEachInRange([n,s],(t=>{r=r.add(t.key)})),r}containsKey(t){const e=new wu(t,0),n=this.Zn.firstAfterOrEqual(e);return null!==n&&t.isEqual(n.key)}}class wu{constructor(t,e){this.key=t,this.ls=e}static ts(t,e){return xr.comparator(t.key,e.key)||rr(t.ls,e.ls)}static ns(t,e){return rr(t.ls,e.ls)||xr.comparator(t.key,e.key)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vu{constructor(t,e){this.Ht=t,this.referenceDelegate=e,this.In=[],this.fs=1,this.ds=new yo(wu.ts)}checkEmpty(t){return qa.resolve(0===this.In.length)}addMutationBatch(t,e,n,s){const r=this.fs;this.fs++,this.In.length>0&&this.In[this.In.length-1];const i=new Ja(r,e,n,s);this.In.push(i);for(const e of s)this.ds=this.ds.add(new wu(e.key,r)),this.Ht.addToCollectionParentIndex(t,e.key.path.popLast());return qa.resolve(i)}lookupMutationBatch(t,e){return qa.resolve(this.ws(e))}getNextMutationBatchAfterBatchId(t,e){const n=e+1,s=this._s(n),r=s<0?0:s;return qa.resolve(this.In.length>r?this.In[r]:null)}getHighestUnacknowledgedBatchId(){return qa.resolve(0===this.In.length?-1:this.fs-1)}getAllMutationBatches(t){return qa.resolve(this.In.slice())}getAllMutationBatchesAffectingDocumentKey(t,e){const n=new wu(e,0),s=new wu(e,Number.POSITIVE_INFINITY),r=[];return this.ds.forEachInRange([n,s],(t=>{const e=this.ws(t.ls);r.push(e)})),qa.resolve(r)}getAllMutationBatchesAffectingDocumentKeys(t,e){let n=new yo(rr);return e.forEach((t=>{const e=new wu(t,0),s=new wu(t,Number.POSITIVE_INFINITY);this.ds.forEachInRange([e,s],(t=>{n=n.add(t.ls)}))})),qa.resolve(this.gs(n))}getAllMutationBatchesAffectingQuery(t,e){const n=e.path,s=n.length+1;let r=n;xr.isDocumentKey(r)||(r=r.child(""));const i=new wu(new xr(r),0);let o=new yo(rr);return this.ds.forEachWhile((t=>{const e=t.key.path;return!!n.isPrefixOf(e)&&(e.length===s&&(o=o.add(t.ls)),!0)}),i),qa.resolve(this.gs(o))}gs(t){const e=[];return t.forEach((t=>{const n=this.ws(t);null!==n&&e.push(n)})),e}removeMutationBatch(t,e){Ks(0===this.ys(e.batchId,"removed")),this.In.shift();let n=this.ds;return qa.forEach(e.mutations,(s=>{const r=new wu(s.key,e.batchId);return n=n.delete(r),this.referenceDelegate.markPotentiallyOrphaned(t,s.key)})).next((()=>{this.ds=n}))}te(t){}containsKey(t,e){const n=new wu(e,0),s=this.ds.firstAfterOrEqual(n);return qa.resolve(e.isEqual(s&&s.key))}performConsistencyCheck(t){return this.In.length,qa.resolve()}ys(t,e){return this._s(t)}_s(t){return 0===this.In.length?0:t-this.In[0].batchId}ws(t){const e=this._s(t);return e<0||e>=this.In.length?null:this.In[e]}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bu{constructor(t,e){this.Ht=t,this.ps=e,this.docs=new go(xr.comparator),this.size=0}addEntry(t,e,n){const s=e.key,r=this.docs.get(s),i=r?r.size:0,o=this.ps(e);return this.docs=this.docs.insert(s,{document:e.clone(),size:o,readTime:n}),this.size+=o-i,this.Ht.addToCollectionParentIndex(t,s.path.popLast())}removeEntry(t){const e=this.docs.get(t);e&&(this.docs=this.docs.remove(t),this.size-=e.size)}getEntry(t,e){const n=this.docs.get(e);return qa.resolve(n?n.document.clone():Hr.newInvalidDocument(e))}getEntries(t,e){let n=bo();return e.forEach((t=>{const e=this.docs.get(t);n=n.insert(t,e?e.document.clone():Hr.newInvalidDocument(t))})),qa.resolve(n)}getDocumentsMatchingQuery(t,e,n){let s=bo();const r=new xr(e.path.child("")),i=this.docs.getIteratorFrom(r);for(;i.hasNext();){const{key:t,value:{document:r,readTime:o}}=i.getNext();if(!e.path.isPrefixOf(t.path))break;o.compareTo(n)<=0||Ai(e,r)&&(s=s.insert(r.key,r.clone()))}return qa.resolve(s)}Ts(t,e){return qa.forEach(this.docs,(t=>e(t)))}newChangeBuffer(t){return new Eu(this)}getSize(t){return qa.resolve(this.size)}}class Eu extends Bc{constructor(t){super(),this.Se=t}applyChanges(t){const e=[];return this.changes.forEach(((n,s)=>{s.document.isValidDocument()?e.push(this.Se.addEntry(t,s.document,this.getReadTime(n))):this.Se.removeEntry(n)})),qa.waitFor(e)}getFromCache(t,e){return this.Se.getEntry(t,e)}getAllFromCache(t,e){return this.Se.getEntries(t,e)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tu{constructor(t){this.persistence=t,this.Es=new qc((t=>Wr(t)),Yr),this.lastRemoteSnapshotVersion=cr.min(),this.highestTargetId=0,this.Is=0,this.As=new yu,this.targetCount=0,this.Rs=Dc.se()}forEachTarget(t,e){return this.Es.forEach(((t,n)=>e(n))),qa.resolve()}getLastRemoteSnapshotVersion(t){return qa.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(t){return qa.resolve(this.Is)}allocateTargetId(t){return this.highestTargetId=this.Rs.next(),qa.resolve(this.highestTargetId)}setTargetsMetadata(t,e,n){return n&&(this.lastRemoteSnapshotVersion=n),e>this.Is&&(this.Is=e),qa.resolve()}ce(t){this.Es.set(t.target,t);const e=t.targetId;e>this.highestTargetId&&(this.Rs=new Dc(e),this.highestTargetId=e),t.sequenceNumber>this.Is&&(this.Is=t.sequenceNumber)}addTargetData(t,e){return this.ce(e),this.targetCount+=1,qa.resolve()}updateTargetData(t,e){return this.ce(e),qa.resolve()}removeTargetData(t,e){return this.Es.delete(e.target),this.As.cs(e.targetId),this.targetCount-=1,qa.resolve()}removeTargets(t,e,n){let s=0;const r=[];return this.Es.forEach(((i,o)=>{o.sequenceNumber<=e&&null===n.get(o.targetId)&&(this.Es.delete(i),r.push(this.removeMatchingKeysForTargetId(t,o.targetId)),s++)})),qa.waitFor(r).next((()=>s))}getTargetCount(t){return qa.resolve(this.targetCount)}getTargetData(t,e){const n=this.Es.get(e)||null;return qa.resolve(n)}addMatchingKeys(t,e,n){return this.As.ss(e,n),qa.resolve()}removeMatchingKeys(t,e,n){this.As.os(e,n);const s=this.persistence.referenceDelegate,r=[];return s&&e.forEach((e=>{r.push(s.markPotentiallyOrphaned(t,e))})),qa.waitFor(r)}removeMatchingKeysForTargetId(t,e){return this.As.cs(e),qa.resolve()}getMatchingKeysForTargetId(t,e){const n=this.As.hs(e);return qa.resolve(n)}containsKey(t,e){return qa.resolve(this.As.containsKey(e))}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Iu{constructor(t,e){this.bs={},this.Le=new er(0),this.Be=!1,this.Be=!0,this.referenceDelegate=t(this),this.ze=new Tu(this),this.Ht=new mc,this.He=function(t,e){return new bu(t,e)}(this.Ht,(t=>this.referenceDelegate.Ps(t))),this.N=new ec(e),this.Je=new pu(this.N)}start(){return Promise.resolve()}shutdown(){return this.Be=!1,Promise.resolve()}get started(){return this.Be}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(){return this.Ht}getMutationQueue(t){let e=this.bs[t.toKey()];return e||(e=new vu(this.Ht,this.referenceDelegate),this.bs[t.toKey()]=e),e}getTargetCache(){return this.ze}getRemoteDocumentCache(){return this.He}getBundleCache(){return this.Je}runTransaction(t,e,n){Vs("MemoryPersistence","Starting transaction:",t);const s=new Su(this.Le.next());return this.referenceDelegate.vs(),n(s).next((t=>this.referenceDelegate.Vs(s).next((()=>t)))).toPromise().then((t=>(s.raiseOnCommittedEvent(),t)))}Ss(t,e){return qa.or(Object.values(this.bs).map((n=>()=>n.containsKey(t,e))))}}class Su extends Ua{constructor(t){super(),this.currentSequenceNumber=t}}class _u{constructor(t){this.persistence=t,this.Ds=new yu,this.Cs=null}static Ns(t){return new _u(t)}get xs(){if(this.Cs)return this.Cs;throw js()}addReference(t,e,n){return this.Ds.addReference(n,e),this.xs.delete(n.toString()),qa.resolve()}removeReference(t,e,n){return this.Ds.removeReference(n,e),this.xs.add(n.toString()),qa.resolve()}markPotentiallyOrphaned(t,e){return this.xs.add(e.toString()),qa.resolve()}removeTarget(t,e){this.Ds.cs(e.targetId).forEach((t=>this.xs.add(t.toString())));const n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(t,e.targetId).next((t=>{t.forEach((t=>this.xs.add(t.toString())))})).next((()=>n.removeTargetData(t,e)))}vs(){this.Cs=new Set}Vs(t){const e=this.persistence.getRemoteDocumentCache().newChangeBuffer();return qa.forEach(this.xs,(n=>{const s=xr.fromPath(n);return this.ks(t,s).next((t=>{t||e.removeEntry(s)}))})).next((()=>(this.Cs=null,e.apply(t))))}updateLimboDocument(t,e){return this.ks(t,e).next((t=>{t?this.xs.delete(e.toString()):this.xs.add(e.toString())}))}Ps(t){return 0}ks(t,e){return qa.or([()=>qa.resolve(this.Ds.containsKey(e)),()=>this.persistence.getTargetCache().containsKey(t,e),()=>this.persistence.Ss(t,e)])}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Nu(t,e){return`firestore_clients_${t}_${e}`}function Au(t,e,n){let s=`firestore_mutations_${t}_${n}`;return e.isAuthenticated()&&(s+=`_${e.uid}`),s}function Du(t,e){return`firestore_targets_${t}_${e}`}class xu{constructor(t,e,n,s){this.user=t,this.batchId=e,this.state=n,this.error=s}static $s(t,e,n){const s=JSON.parse(n);let r,i="object"==typeof s&&-1!==["pending","acknowledged","rejected"].indexOf(s.state)&&(void 0===s.error||"object"==typeof s.error);return i&&s.error&&(i="string"==typeof s.error.message&&"string"==typeof s.error.code,i&&(r=new zs(s.error.code,s.error.message))),i?new xu(t,e,s.state,r):(Us("SharedClientState",`Failed to parse mutation state for ID '${e}': ${n}`),null)}Os(){const t={state:this.state,updateTimeMs:Date.now()};return this.error&&(t.error={code:this.error.code,message:this.error.message}),JSON.stringify(t)}}class Cu{constructor(t,e,n){this.targetId=t,this.state=e,this.error=n}static $s(t,e){const n=JSON.parse(e);let s,r="object"==typeof n&&-1!==["not-current","current","rejected"].indexOf(n.state)&&(void 0===n.error||"object"==typeof n.error);return r&&n.error&&(r="string"==typeof n.error.message&&"string"==typeof n.error.code,r&&(s=new zs(n.error.code,n.error.message))),r?new Cu(t,n.state,s):(Us("SharedClientState",`Failed to parse target state for ID '${t}': ${e}`),null)}Os(){const t={state:this.state,updateTimeMs:Date.now()};return this.error&&(t.error={code:this.error.code,message:this.error.message}),JSON.stringify(t)}}class ku{constructor(t,e){this.clientId=t,this.activeTargetIds=e}static $s(t,e){const n=JSON.parse(e);let s="object"==typeof n&&n.activeTargetIds instanceof Array,r=Do();for(let t=0;s&&t<n.activeTargetIds.length;++t)s=Dr(n.activeTargetIds[t]),r=r.add(n.activeTargetIds[t]);return s?new ku(t,r):(Us("SharedClientState",`Failed to parse client data for instance '${t}': ${e}`),null)}}class Ru{constructor(t,e){this.clientId=t,this.onlineState=e}static $s(t){const e=JSON.parse(t);return"object"==typeof e&&-1!==["Unknown","Online","Offline"].indexOf(e.onlineState)&&"string"==typeof e.clientId?new Ru(e.clientId,e.onlineState):(Us("SharedClientState",`Failed to parse online state: ${t}`),null)}}class Lu{constructor(){this.activeTargetIds=Do()}Fs(t){this.activeTargetIds=this.activeTargetIds.add(t)}Ms(t){this.activeTargetIds=this.activeTargetIds.delete(t)}Os(){const t={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(t)}}class Ou{constructor(t,e,n,s,r){this.window=t,this.Oe=e,this.persistenceKey=n,this.Ls=s,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.Bs=this.Us.bind(this),this.qs=new go(rr),this.started=!1,this.Ks=[];const i=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=r,this.js=Nu(this.persistenceKey,this.Ls),this.Qs=function(t){return`firestore_sequence_number_${t}`}(this.persistenceKey),this.qs=this.qs.insert(this.Ls,new Lu),this.Ws=new RegExp(`^firestore_clients_${i}_([^_]*)$`),this.Gs=new RegExp(`^firestore_mutations_${i}_(\\d+)(?:_(.*))?$`),this.zs=new RegExp(`^firestore_targets_${i}_(\\d+)$`),this.Hs=function(t){return`firestore_online_state_${t}`}(this.persistenceKey),this.Js=function(t){return`firestore_bundle_loaded_${t}`}(this.persistenceKey),this.window.addEventListener("storage",this.Bs)}static bt(t){return!(!t||!t.localStorage)}async start(){const t=await this.syncEngine.pn();for(const e of t){if(e===this.Ls)continue;const t=this.getItem(Nu(this.persistenceKey,e));if(t){const n=ku.$s(e,t);n&&(this.qs=this.qs.insert(n.clientId,n))}}this.Ys();const e=this.storage.getItem(this.Hs);if(e){const t=this.Xs(e);t&&this.Zs(t)}for(const t of this.Ks)this.Us(t);this.Ks=[],this.window.addEventListener("pagehide",(()=>this.shutdown())),this.started=!0}writeSequenceNumber(t){this.setItem(this.Qs,JSON.stringify(t))}getAllActiveQueryTargets(){return this.ti(this.qs)}isActiveQueryTarget(t){let e=!1;return this.qs.forEach(((n,s)=>{s.activeTargetIds.has(t)&&(e=!0)})),e}addPendingMutation(t){this.ei(t,"pending")}updateMutationState(t,e,n){this.ei(t,e,n),this.ni(t)}addLocalQueryTarget(t){let e="not-current";if(this.isActiveQueryTarget(t)){const n=this.storage.getItem(Du(this.persistenceKey,t));if(n){const s=Cu.$s(t,n);s&&(e=s.state)}}return this.si.Fs(t),this.Ys(),e}removeLocalQueryTarget(t){this.si.Ms(t),this.Ys()}isLocalQueryTarget(t){return this.si.activeTargetIds.has(t)}clearQueryState(t){this.removeItem(Du(this.persistenceKey,t))}updateQueryState(t,e,n){this.ii(t,e,n)}handleUserChange(t,e,n){e.forEach((t=>{this.ni(t)})),this.currentUser=t,n.forEach((t=>{this.addPendingMutation(t)}))}setOnlineState(t){this.ri(t)}notifyBundleLoaded(){this.oi()}shutdown(){this.started&&(this.window.removeEventListener("storage",this.Bs),this.removeItem(this.js),this.started=!1)}getItem(t){const e=this.storage.getItem(t);return Vs("SharedClientState","READ",t,e),e}setItem(t,e){Vs("SharedClientState","SET",t,e),this.storage.setItem(t,e)}removeItem(t){Vs("SharedClientState","REMOVE",t),this.storage.removeItem(t)}Us(t){const e=t;if(e.storageArea===this.storage){if(Vs("SharedClientState","EVENT",e.key,e.newValue),e.key===this.js)return void Us("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.Oe.enqueueRetryable((async()=>{if(this.started){if(null!==e.key)if(this.Ws.test(e.key)){if(null==e.newValue){const t=this.ci(e.key);return this.ai(t,null)}{const t=this.ui(e.key,e.newValue);if(t)return this.ai(t.clientId,t)}}else if(this.Gs.test(e.key)){if(null!==e.newValue){const t=this.hi(e.key,e.newValue);if(t)return this.li(t)}}else if(this.zs.test(e.key)){if(null!==e.newValue){const t=this.fi(e.key,e.newValue);if(t)return this.di(t)}}else if(e.key===this.Hs){if(null!==e.newValue){const t=this.Xs(e.newValue);if(t)return this.Zs(t)}}else if(e.key===this.Qs){const t=function(t){let e=er.T;if(null!=t)try{const n=JSON.parse(t);Ks("number"==typeof n),e=n}catch(t){Us("SharedClientState","Failed to read sequence number from WebStorage",t)}return e}(e.newValue);t!==er.T&&this.sequenceNumberHandler(t)}else if(e.key===this.Js)return this.syncEngine.wi()}else this.Ks.push(e)}))}}get si(){return this.qs.get(this.Ls)}Ys(){this.setItem(this.js,this.si.Os())}ei(t,e,n){const s=new xu(this.currentUser,t,e,n),r=Au(this.persistenceKey,this.currentUser,t);this.setItem(r,s.Os())}ni(t){const e=Au(this.persistenceKey,this.currentUser,t);this.removeItem(e)}ri(t){const e={clientId:this.Ls,onlineState:t};this.storage.setItem(this.Hs,JSON.stringify(e))}ii(t,e,n){const s=Du(this.persistenceKey,t),r=new Cu(t,e,n);this.setItem(s,r.Os())}oi(){this.setItem(this.Js,"value-not-used")}ci(t){const e=this.Ws.exec(t);return e?e[1]:null}ui(t,e){const n=this.ci(t);return ku.$s(n,e)}hi(t,e){const n=this.Gs.exec(t),s=Number(n[1]),r=void 0!==n[2]?n[2]:null;return xu.$s(new Ls(r),s,e)}fi(t,e){const n=this.zs.exec(t),s=Number(n[1]);return Cu.$s(s,e)}Xs(t){return Ru.$s(t)}async li(t){if(t.user.uid===this.currentUser.uid)return this.syncEngine._i(t.batchId,t.state,t.error);Vs("SharedClientState",`Ignoring mutation for non-active user ${t.user.uid}`)}di(t){return this.syncEngine.mi(t.targetId,t.state,t.error)}ai(t,e){const n=e?this.qs.insert(t,e):this.qs.remove(t),s=this.ti(this.qs),r=this.ti(n),i=[],o=[];return r.forEach((t=>{s.has(t)||i.push(t)})),s.forEach((t=>{r.has(t)||o.push(t)})),this.syncEngine.gi(i,o).then((()=>{this.qs=n}))}Zs(t){this.qs.get(t.clientId)&&this.onlineStateHandler(t.onlineState)}ti(t){let e=Do();return t.forEach(((t,n)=>{e=e.unionWith(n.activeTargetIds)})),e}}class Mu{constructor(){this.yi=new Lu,this.pi={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(t){}updateMutationState(t,e,n){}addLocalQueryTarget(t){return this.yi.Fs(t),this.pi[t]||"not-current"}updateQueryState(t,e,n){this.pi[t]=e}removeLocalQueryTarget(t){this.yi.Ms(t)}isLocalQueryTarget(t){return this.yi.activeTargetIds.has(t)}clearQueryState(t){delete this.pi[t]}getAllActiveQueryTargets(){return this.yi.activeTargetIds}isActiveQueryTarget(t){return this.yi.activeTargetIds.has(t)}start(){return this.yi=new Lu,Promise.resolve()}handleUserChange(t,e,n){}setOnlineState(t){}shutdown(){}writeSequenceNumber(t){}notifyBundleLoaded(){}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fu{Ti(t){}shutdown(){}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pu{constructor(){this.Ei=()=>this.Ii(),this.Ai=()=>this.Ri(),this.bi=[],this.Pi()}Ti(t){this.bi.push(t)}shutdown(){window.removeEventListener("online",this.Ei),window.removeEventListener("offline",this.Ai)}Pi(){window.addEventListener("online",this.Ei),window.addEventListener("offline",this.Ai)}Ii(){Vs("ConnectivityMonitor","Network connectivity changed: AVAILABLE");for(const t of this.bi)t(0)}Ri(){Vs("ConnectivityMonitor","Network connectivity changed: UNAVAILABLE");for(const t of this.bi)t(1)}static bt(){return"undefined"!=typeof window&&void 0!==window.addEventListener&&void 0!==window.removeEventListener}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vu={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery"};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Uu{constructor(t){this.vi=t.vi,this.Vi=t.Vi}Si(t){this.Di=t}Ci(t){this.Ni=t}onMessage(t){this.xi=t}close(){this.Vi()}send(t){this.vi(t)}ki(){this.Di()}$i(t){this.Ni(t)}Oi(t){this.xi(t)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qu extends class{constructor(t){this.databaseInfo=t,this.databaseId=t.databaseId;const e=t.ssl?"https":"http";this.Fi=e+"://"+t.host,this.Mi="projects/"+this.databaseId.projectId+"/databases/"+this.databaseId.database+"/documents"}Li(t,e,n,s){const r=this.Bi(t,e);Vs("RestConnection","Sending: ",r,n);const i={};return this.Ui(i,s),this.qi(t,r,i,n).then((t=>(Vs("RestConnection","Received: ",t),t)),(e=>{throw qs("RestConnection",`${t} failed with error: `,e,"url: ",r,"request:",n),e}))}Ki(t,e,n,s){return this.Li(t,e,n,s)}Ui(t,e){if(t["X-Goog-Api-Client"]="gl-js/ fire/"+Os,t["Content-Type"]="text/plain",this.databaseInfo.appId&&(t["X-Firebase-GMPID"]=this.databaseInfo.appId),e)for(const n in e.authHeaders)e.authHeaders.hasOwnProperty(n)&&(t[n]=e.authHeaders[n])}Bi(t,e){const n=Vu[t];return`${this.Fi}/v1/${e}:${n}`}}{constructor(t){super(t),this.forceLongPolling=t.forceLongPolling,this.autoDetectLongPolling=t.autoDetectLongPolling,this.useFetchStreams=t.useFetchStreams}qi(t,e,n,s){return new Promise(((r,i)=>{const o=new ks;o.listenOnce(_s.COMPLETE,(()=>{try{switch(o.getLastErrorCode()){case Ss.NO_ERROR:const e=o.getResponseJson();Vs("Connection","XHR received:",JSON.stringify(e)),r(e);break;case Ss.TIMEOUT:Vs("Connection",'RPC "'+t+'" timed out'),i(new zs(Hs.DEADLINE_EXCEEDED,"Request time out"));break;case Ss.HTTP_ERROR:const n=o.getStatus();if(Vs("Connection",'RPC "'+t+'" failed with status:',n,"response text:",o.getResponseText()),n>0){const t=o.getResponseJson().error;if(t&&t.status&&t.message){const e=function(t){const e=t.toLowerCase().replace(/_/g,"-");return Object.values(Hs).indexOf(e)>=0?e:Hs.UNKNOWN}(t.status);i(new zs(e,t.message))}else i(new zs(Hs.UNKNOWN,"Server responded with status "+o.getStatus()))}else i(new zs(Hs.UNAVAILABLE,"Connection failed."));break;default:js()}}finally{Vs("Connection",'RPC "'+t+'" completed.')}}));const a=JSON.stringify(s);o.send(e,"POST",a,n,15)}))}ji(t,e){const n=[this.Fi,"/","google.firestore.v1.Firestore","/",t,"/channel"],s=new vs,r=de(),i={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling};this.useFetchStreams&&(i.xmlHttpFactory=new xs({})),this.Ui(i.initMessageHeaders,e),"undefined"!=typeof window&&(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(h())||"object"==typeof navigator&&"ReactNative"===navigator.product||h().indexOf("Electron/")>=0||function(){const t=h();return t.indexOf("MSIE ")>=0||t.indexOf("Trident/")>=0}()||h().indexOf("MSAppHost/")>=0||function(){const t="object"==typeof chrome?chrome.runtime:"object"==typeof browser?browser.runtime:void 0;return"object"==typeof t&&void 0!==t.id}()||(i.httpHeadersOverwriteParam="$httpHeaders");const o=n.join("");Vs("Connection","Creating WebChannel: "+o,i);const a=s.createWebChannel(o,i);let c=!1,u=!1;const l=new Uu({vi:t=>{u?Vs("Connection","Not sending because WebChannel is closed:",t):(c||(Vs("Connection","Opening WebChannel transport."),a.open(),c=!0),Vs("Connection","WebChannel sending:",t),a.send(t))},Vi:()=>a.close()}),d=(t,e,n)=>{t.listen(e,(t=>{try{n(t)}catch(t){setTimeout((()=>{throw t}),0)}}))};return d(a,Cs.EventType.OPEN,(()=>{u||Vs("Connection","WebChannel transport opened.")})),d(a,Cs.EventType.CLOSE,(()=>{u||(u=!0,Vs("Connection","WebChannel transport closed"),l.$i())})),d(a,Cs.EventType.ERROR,(t=>{u||(u=!0,qs("Connection","WebChannel transport errored:",t),l.$i(new zs(Hs.UNAVAILABLE,"The operation could not be completed")))})),d(a,Cs.EventType.MESSAGE,(t=>{var e;if(!u){const n=t.data[0];Ks(!!n);const s=n,r=s.error||(null===(e=s[0])||void 0===e?void 0:e.error);if(r){Vs("Connection","WebChannel received error:",r);const t=r.status;let e=function(t){const e=uo[t];if(void 0!==e)return fo(e)}(t),n=r.message;void 0===e&&(e=Hs.INTERNAL,n="Unknown error status: "+t+" with message "+r.message),u=!0,l.$i(new zs(e,n)),a.close()}else Vs("Connection","WebChannel received:",n),l.Oi(n)}})),d(r,Ns.STAT_EVENT,(t=>{t.stat===As?Vs("Connection","Detected buffering proxy"):t.stat===Ds&&Vs("Connection","Detected no buffering proxy")})),setTimeout((()=>{l.ki()}),0),l}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Bu(){return"undefined"!=typeof window?window:null}function ju(){return"undefined"!=typeof document?document:null}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ku(t){return new qo(t,!0)}class $u{constructor(t,e,n=1e3,s=1.5,r=6e4){this.Oe=t,this.timerId=e,this.Qi=n,this.Wi=s,this.Gi=r,this.zi=0,this.Hi=null,this.Ji=Date.now(),this.reset()}reset(){this.zi=0}Yi(){this.zi=this.Gi}Xi(t){this.cancel();const e=Math.floor(this.zi+this.Zi()),n=Math.max(0,Date.now()-this.Ji),s=Math.max(0,e-n);s>0&&Vs("ExponentialBackoff",`Backing off for ${s} ms (base delay: ${this.zi} ms, delay with jitter: ${e} ms, last attempt: ${n} ms ago)`),this.Hi=this.Oe.enqueueAfterDelay(this.timerId,s,(()=>(this.Ji=Date.now(),t()))),this.zi*=this.Wi,this.zi<this.Qi&&(this.zi=this.Qi),this.zi>this.Gi&&(this.zi=this.Gi)}tr(){null!==this.Hi&&(this.Hi.skipDelay(),this.Hi=null)}cancel(){null!==this.Hi&&(this.Hi.cancel(),this.Hi=null)}Zi(){return(Math.random()-.5)*this.zi}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gu{constructor(t,e,n,s,r,i,o){this.Oe=t,this.er=n,this.nr=s,this.sr=r,this.credentialsProvider=i,this.listener=o,this.state=0,this.ir=0,this.rr=null,this.cr=null,this.stream=null,this.ar=new $u(t,e)}ur(){return 1===this.state||5===this.state||this.hr()}hr(){return 2===this.state||3===this.state}start(){4!==this.state?this.auth():this.lr()}async stop(){this.ur()&&await this.close(0)}dr(){this.state=0,this.ar.reset()}wr(){this.hr()&&null===this.rr&&(this.rr=this.Oe.enqueueAfterDelay(this.er,6e4,(()=>this._r())))}mr(t){this.gr(),this.stream.send(t)}async _r(){if(this.hr())return this.close(0)}gr(){this.rr&&(this.rr.cancel(),this.rr=null)}yr(){this.cr&&(this.cr.cancel(),this.cr=null)}async close(t,e){this.gr(),this.yr(),this.ar.cancel(),this.ir++,4!==t?this.ar.reset():e&&e.code===Hs.RESOURCE_EXHAUSTED?(Us(e.toString()),Us("Using maximum backoff delay to prevent overloading the backend."),this.ar.Yi()):e&&e.code===Hs.UNAUTHENTICATED&&3!==this.state&&this.credentialsProvider.invalidateToken(),null!==this.stream&&(this.pr(),this.stream.close(),this.stream=null),this.state=t,await this.listener.Ci(e)}pr(){}auth(){this.state=1;const t=this.Tr(this.ir),e=this.ir;this.credentialsProvider.getToken().then((t=>{this.ir===e&&this.Er(t)}),(e=>{t((()=>{const t=new zs(Hs.UNKNOWN,"Fetching auth token failed: "+e.message);return this.Ir(t)}))}))}Er(t){const e=this.Tr(this.ir);this.stream=this.Ar(t),this.stream.Si((()=>{e((()=>(this.state=2,this.cr=this.Oe.enqueueAfterDelay(this.nr,1e4,(()=>(this.hr()&&(this.state=3),Promise.resolve()))),this.listener.Si())))})),this.stream.Ci((t=>{e((()=>this.Ir(t)))})),this.stream.onMessage((t=>{e((()=>this.onMessage(t)))}))}lr(){this.state=5,this.ar.Xi((async()=>{this.state=0,this.start()}))}Ir(t){return Vs("PersistentStream",`close with error: ${t}`),this.stream=null,this.close(4,t)}Tr(t){return e=>{this.Oe.enqueueAndForget((()=>this.ir===t?e():(Vs("PersistentStream","stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve())))}}}class Hu extends Gu{constructor(t,e,n,s,r){super(t,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",e,n,r),this.N=s}Ar(t){return this.sr.ji("Listen",t)}onMessage(t){this.ar.reset();const e=function(t,e){let n;if("targetChange"in e){e.targetChange;const s=function(t){return"NO_CHANGE"===t?0:"ADD"===t?1:"REMOVE"===t?2:"CURRENT"===t?3:"RESET"===t?4:js()}(e.targetChange.targetChangeType||"NO_CHANGE"),r=e.targetChange.targetIds||[],i=function(t,e){return t.D?(Ks(void 0===e||"string"==typeof e),wr.fromBase64String(e||"")):(Ks(void 0===e||e instanceof Uint8Array),wr.fromUint8Array(e||new Uint8Array))}(t,e.targetChange.resumeToken),o=e.targetChange.cause,a=o&&function(t){const e=void 0===t.code?Hs.UNKNOWN:fo(t.code);return new zs(e,t.message||"")}(o);n=new Lo(s,r,i,a||null)}else if("documentChange"in e){e.documentChange;const s=e.documentChange;s.document,s.document.name,s.document.updateTime;const r=Qo(t,s.document.name),i=$o(s.document.updateTime),o=new $r({mapValue:{fields:s.document.fields}}),a=Hr.newFoundDocument(r,i,o),c=s.targetIds||[],u=s.removedTargetIds||[];n=new ko(c,u,a.key,a)}else if("documentDelete"in e){e.documentDelete;const s=e.documentDelete;s.document;const r=Qo(t,s.document),i=s.readTime?$o(s.readTime):cr.min(),o=Hr.newNoDocument(r,i),a=s.removedTargetIds||[];n=new ko([],a,o.key,o)}else if("documentRemove"in e){e.documentRemove;const s=e.documentRemove;s.document;const r=Qo(t,s.document),i=s.removedTargetIds||[];n=new ko([],i,r,null)}else{if(!("filter"in e))return js();{e.filter;const t=e.filter;t.targetId;const s=t.count||0,r=new co(s),i=t.targetId;n=new Ro(i,r)}}return n}(this.N,t),n=function(t){if(!("targetChange"in t))return cr.min();const e=t.targetChange;return e.targetIds&&e.targetIds.length?cr.min():e.readTime?$o(e.readTime):cr.min()}(t);return this.listener.Rr(e,n)}br(t){const e={};e.database=Xo(this.N),e.addTarget=function(t,e){let n;const s=e.target;return n=Xr(s)?{documents:sa(t,s)}:{query:ra(t,s)},n.targetId=e.targetId,e.resumeToken.approximateByteSize()>0?n.resumeToken=jo(t,e.resumeToken):e.snapshotVersion.compareTo(cr.min())>0&&(n.readTime=Bo(t,e.snapshotVersion.toTimestamp())),n}(this.N,t);const n=function(t,e){const n=function(t,e){switch(e){case 0:return null;case 1:return"existence-filter-mismatch";case 2:return"limbo-document";default:return js()}}(0,e.purpose);return null==n?null:{"goog-listen-tags":n}}(this.N,t);n&&(e.labels=n),this.mr(e)}Pr(t){const e={};e.database=Xo(this.N),e.removeTarget=t,this.mr(e)}}class zu extends Gu{constructor(t,e,n,s,r){super(t,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",e,n,r),this.N=s,this.vr=!1}get Vr(){return this.vr}start(){this.vr=!1,this.lastStreamToken=void 0,super.start()}pr(){this.vr&&this.Sr([])}Ar(t){return this.sr.ji("Write",t)}onMessage(t){if(Ks(!!t.streamToken),this.lastStreamToken=t.streamToken,this.vr){this.ar.reset();const e=function(t,e){return t&&t.length>0?(Ks(void 0!==e),t.map((t=>function(t,e){let n=t.updateTime?$o(t.updateTime):$o(e);return n.isEqual(cr.min())&&(n=$o(e)),new Hi(n,t.transformResults||[])}(t,e)))):[]}(t.writeResults,t.commitTime),n=$o(t.commitTime);return this.listener.Dr(n,e)}return Ks(!t.writeResults||0===t.writeResults.length),this.vr=!0,this.listener.Cr()}Nr(){const t={};t.database=Xo(this.N),this.mr(t)}Sr(t){const e={streamToken:this.lastStreamToken,writes:t.map((t=>ea(this.N,t)))};this.mr(e)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qu extends class{}{constructor(t,e,n){super(),this.credentials=t,this.sr=e,this.N=n,this.kr=!1}$r(){if(this.kr)throw new zs(Hs.FAILED_PRECONDITION,"The client has already been terminated.")}Li(t,e,n){return this.$r(),this.credentials.getToken().then((s=>this.sr.Li(t,e,n,s))).catch((t=>{throw"FirebaseError"===t.name?(t.code===Hs.UNAUTHENTICATED&&this.credentials.invalidateToken(),t):new zs(Hs.UNKNOWN,t.toString())}))}Ki(t,e,n){return this.$r(),this.credentials.getToken().then((s=>this.sr.Ki(t,e,n,s))).catch((t=>{throw"FirebaseError"===t.name?(t.code===Hs.UNAUTHENTICATED&&this.credentials.invalidateToken(),t):new zs(Hs.UNKNOWN,t.toString())}))}terminate(){this.kr=!0}}class Wu{constructor(t,e){this.asyncQueue=t,this.onlineStateHandler=e,this.state="Unknown",this.Or=0,this.Fr=null,this.Mr=!0}Lr(){0===this.Or&&(this.Br("Unknown"),this.Fr=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,(()=>(this.Fr=null,this.Ur("Backend didn't respond within 10 seconds."),this.Br("Offline"),Promise.resolve()))))}qr(t){"Online"===this.state?this.Br("Unknown"):(this.Or++,this.Or>=1&&(this.Kr(),this.Ur(`Connection failed 1 times. Most recent error: ${t.toString()}`),this.Br("Offline")))}set(t){this.Kr(),this.Or=0,"Online"===t&&(this.Mr=!1),this.Br(t)}Br(t){t!==this.state&&(this.state=t,this.onlineStateHandler(t))}Ur(t){const e=`Could not reach Cloud Firestore backend. ${t}\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.Mr?(Us(e),this.Mr=!1):Vs("OnlineStateTracker",e)}Kr(){null!==this.Fr&&(this.Fr.cancel(),this.Fr=null)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yu{constructor(t,e,n,s,r){this.localStore=t,this.datastore=e,this.asyncQueue=n,this.remoteSyncer={},this.jr=[],this.Qr=new Map,this.Wr=new Set,this.Gr=[],this.zr=r,this.zr.Ti((t=>{n.enqueueAndForget((async()=>{ih(this)&&(Vs("RemoteStore","Restarting streams for network reachability change."),await async function(t){const e=Gs(t);e.Wr.add(4),await Ju(e),e.Hr.set("Unknown"),e.Wr.delete(4),await Xu(e)}(this))}))})),this.Hr=new Wu(n,s)}}async function Xu(t){if(ih(t))for(const e of t.Gr)await e(!0)}async function Ju(t){for(const e of t.Gr)await e(!1)}function Zu(t,e){const n=Gs(t);n.Qr.has(e.targetId)||(n.Qr.set(e.targetId,e),rh(n)?sh(n):Th(n).hr()&&eh(n,e))}function th(t,e){const n=Gs(t),s=Th(n);n.Qr.delete(e),s.hr()&&nh(n,e),0===n.Qr.size&&(s.hr()?s.wr():ih(n)&&n.Hr.set("Unknown"))}function eh(t,e){t.Jr.Y(e.targetId),Th(t).br(e)}function nh(t,e){t.Jr.Y(e),Th(t).Pr(e)}function sh(t){t.Jr=new Mo({getRemoteKeysForTarget:e=>t.remoteSyncer.getRemoteKeysForTarget(e),Tt:e=>t.Qr.get(e)||null}),Th(t).start(),t.Hr.Lr()}function rh(t){return ih(t)&&!Th(t).ur()&&t.Qr.size>0}function ih(t){return 0===Gs(t).Wr.size}function oh(t){t.Jr=void 0}async function ah(t){t.Qr.forEach(((e,n)=>{eh(t,e)}))}async function ch(t,e){oh(t),rh(t)?(t.Hr.qr(e),sh(t)):t.Hr.set("Unknown")}async function uh(t,e,n){if(t.Hr.set("Online"),e instanceof Lo&&2===e.state&&e.cause)try{await async function(t,e){const n=e.cause;for(const s of e.targetIds)t.Qr.has(s)&&(await t.remoteSyncer.rejectListen(s,n),t.Qr.delete(s),t.Jr.removeTarget(s))}(t,e)}catch(n){Vs("RemoteStore","Failed to remove targets %s: %s ",e.targetIds.join(","),n),await hh(t,n)}else if(e instanceof ko?t.Jr.rt(e):e instanceof Ro?t.Jr.ft(e):t.Jr.at(e),!n.isEqual(cr.min()))try{const e=await au(t.localStore);n.compareTo(e)>=0&&await function(t,e){const n=t.Jr._t(e);return n.targetChanges.forEach(((n,s)=>{if(n.resumeToken.approximateByteSize()>0){const r=t.Qr.get(s);r&&t.Qr.set(s,r.withResumeToken(n.resumeToken,e))}})),n.targetMismatches.forEach((e=>{const n=t.Qr.get(e);if(!n)return;t.Qr.set(e,n.withResumeToken(wr.EMPTY_BYTE_STRING,n.snapshotVersion)),nh(t,e);const s=new tc(n.target,e,1,n.sequenceNumber);eh(t,s)})),t.remoteSyncer.applyRemoteEvent(n)}(t,n)}catch(e){Vs("RemoteStore","Failed to raise snapshot:",e),await hh(t,e)}}async function hh(t,e,n){if(!Ga(e))throw e;t.Wr.add(1),await Ju(t),t.Hr.set("Offline"),n||(n=()=>au(t.localStore)),t.asyncQueue.enqueueRetryable((async()=>{Vs("RemoteStore","Retrying IndexedDB access"),await n(),t.Wr.delete(1),await Xu(t)}))}function lh(t,e){return e().catch((n=>hh(t,n,e)))}async function dh(t){const e=Gs(t),n=Ih(e);let s=e.jr.length>0?e.jr[e.jr.length-1].batchId:-1;for(;fh(e);)try{const t=await uu(e.localStore,s);if(null===t){0===e.jr.length&&n.wr();break}s=t.batchId,gh(e,t)}catch(t){await hh(e,t)}mh(e)&&ph(e)}function fh(t){return ih(t)&&t.jr.length<10}function gh(t,e){t.jr.push(e);const n=Ih(t);n.hr()&&n.Vr&&n.Sr(e.mutations)}function mh(t){return ih(t)&&!Ih(t).ur()&&t.jr.length>0}function ph(t){Ih(t).start()}async function yh(t){Ih(t).Nr()}async function wh(t){const e=Ih(t);for(const n of t.jr)e.Sr(n.mutations)}async function vh(t,e,n){const s=t.jr.shift(),r=Za.from(s,e,n);await lh(t,(()=>t.remoteSyncer.applySuccessfulWrite(r))),await dh(t)}async function bh(t,e){e&&Ih(t).Vr&&await async function(t,e){if(lo(n=e.code)&&n!==Hs.ABORTED){const n=t.jr.shift();Ih(t).dr(),await lh(t,(()=>t.remoteSyncer.rejectFailedWrite(n.batchId,e))),await dh(t)}var n}(t,e),mh(t)&&ph(t)}async function Eh(t,e){const n=Gs(t);e?(n.Wr.delete(2),await Xu(n)):e||(n.Wr.add(2),await Ju(n),n.Hr.set("Unknown"))}function Th(t){return t.Yr||(t.Yr=function(t,e,n){const s=Gs(t);return s.$r(),new Hu(e,s.sr,s.credentials,s.N,n)}(t.datastore,t.asyncQueue,{Si:ah.bind(null,t),Ci:ch.bind(null,t),Rr:uh.bind(null,t)}),t.Gr.push((async e=>{e?(t.Yr.dr(),rh(t)?sh(t):t.Hr.set("Unknown")):(await t.Yr.stop(),oh(t))}))),t.Yr}function Ih(t){return t.Xr||(t.Xr=function(t,e,n){const s=Gs(t);return s.$r(),new zu(e,s.sr,s.credentials,s.N,n)}(t.datastore,t.asyncQueue,{Si:yh.bind(null,t),Ci:bh.bind(null,t),Cr:wh.bind(null,t),Dr:vh.bind(null,t)}),t.Gr.push((async e=>{e?(t.Xr.dr(),await dh(t)):(await t.Xr.stop(),t.jr.length>0&&(Vs("RemoteStore",`Stopping write stream with ${t.jr.length} pending writes`),t.jr=[]))}))),t.Xr
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}class Sh{constructor(t,e,n,s,r){this.asyncQueue=t,this.timerId=e,this.targetTimeMs=n,this.op=s,this.removalCallback=r,this.deferred=new Qs,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch((t=>{}))}static createAndSchedule(t,e,n,s,r){const i=Date.now()+n,o=new Sh(t,e,i,s,r);return o.start(n),o}start(t){this.timerHandle=setTimeout((()=>this.handleDelayElapsed()),t)}skipDelay(){return this.handleDelayElapsed()}cancel(t){null!==this.timerHandle&&(this.clearTimeout(),this.deferred.reject(new zs(Hs.CANCELLED,"Operation cancelled"+(t?": "+t:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget((()=>null!==this.timerHandle?(this.clearTimeout(),this.op().then((t=>this.deferred.resolve(t)))):Promise.resolve()))}clearTimeout(){null!==this.timerHandle&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function _h(t,e){if(Us("AsyncQueue",`${e}: ${t}`),Ga(t))return new zs(Hs.UNAVAILABLE,`${e}: ${t}`);throw t}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nh{constructor(t){this.comparator=t?(e,n)=>t(e,n)||xr.comparator(e.key,n.key):(t,e)=>xr.comparator(t.key,e.key),this.keyedMap=To(),this.sortedSet=new go(this.comparator)}static emptySet(t){return new Nh(t.comparator)}has(t){return null!=this.keyedMap.get(t)}get(t){return this.keyedMap.get(t)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(t){const e=this.keyedMap.get(t);return e?this.sortedSet.indexOf(e):-1}get size(){return this.sortedSet.size}forEach(t){this.sortedSet.inorderTraversal(((e,n)=>(t(e),!1)))}add(t){const e=this.delete(t.key);return e.copy(e.keyedMap.insert(t.key,t),e.sortedSet.insert(t,null))}delete(t){const e=this.get(t);return e?this.copy(this.keyedMap.remove(t),this.sortedSet.remove(e)):this}isEqual(t){if(!(t instanceof Nh))return!1;if(this.size!==t.size)return!1;const e=this.sortedSet.getIterator(),n=t.sortedSet.getIterator();for(;e.hasNext();){const t=e.getNext().key,s=n.getNext().key;if(!t.isEqual(s))return!1}return!0}toString(){const t=[];return this.forEach((e=>{t.push(e.toString())})),0===t.length?"DocumentSet ()":"DocumentSet (\n  "+t.join("  \n")+"\n)"}copy(t,e){const n=new Nh;return n.comparator=this.comparator,n.keyedMap=t,n.sortedSet=e,n}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ah{constructor(){this.Zr=new go(xr.comparator)}track(t){const e=t.doc.key,n=this.Zr.get(e);n?0!==t.type&&3===n.type?this.Zr=this.Zr.insert(e,t):3===t.type&&1!==n.type?this.Zr=this.Zr.insert(e,{type:n.type,doc:t.doc}):2===t.type&&2===n.type?this.Zr=this.Zr.insert(e,{type:2,doc:t.doc}):2===t.type&&0===n.type?this.Zr=this.Zr.insert(e,{type:0,doc:t.doc}):1===t.type&&0===n.type?this.Zr=this.Zr.remove(e):1===t.type&&2===n.type?this.Zr=this.Zr.insert(e,{type:1,doc:n.doc}):0===t.type&&1===n.type?this.Zr=this.Zr.insert(e,{type:2,doc:t.doc}):js():this.Zr=this.Zr.insert(e,t)}eo(){const t=[];return this.Zr.inorderTraversal(((e,n)=>{t.push(n)})),t}}class Dh{constructor(t,e,n,s,r,i,o,a){this.query=t,this.docs=e,this.oldDocs=n,this.docChanges=s,this.mutatedKeys=r,this.fromCache=i,this.syncStateChanged=o,this.excludesMetadataChanges=a}static fromInitialDocuments(t,e,n,s){const r=[];return e.forEach((t=>{r.push({type:0,doc:t})})),new Dh(t,e,Nh.emptySet(e),r,n,s,!0,!1)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(t){if(!(this.fromCache===t.fromCache&&this.syncStateChanged===t.syncStateChanged&&this.mutatedKeys.isEqual(t.mutatedKeys)&&Si(this.query,t.query)&&this.docs.isEqual(t.docs)&&this.oldDocs.isEqual(t.oldDocs)))return!1;const e=this.docChanges,n=t.docChanges;if(e.length!==n.length)return!1;for(let t=0;t<e.length;t++)if(e[t].type!==n[t].type||!e[t].doc.isEqual(n[t].doc))return!1;return!0}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xh{constructor(){this.no=void 0,this.listeners=[]}}class Ch{constructor(){this.queries=new qc((t=>_i(t)),Si),this.onlineState="Unknown",this.so=new Set}}async function kh(t,e){const n=Gs(t),s=e.query;let r=!1,i=n.queries.get(s);if(i||(r=!0,i=new xh),r)try{i.no=await n.onListen(s)}catch(t){const n=_h(t,`Initialization of query '${Ni(e.query)}' failed`);return void e.onError(n)}n.queries.set(s,i),i.listeners.push(e),e.io(n.onlineState),i.no&&e.ro(i.no)&&Mh(n)}async function Rh(t,e){const n=Gs(t),s=e.query;let r=!1;const i=n.queries.get(s);if(i){const t=i.listeners.indexOf(e);t>=0&&(i.listeners.splice(t,1),r=0===i.listeners.length)}if(r)return n.queries.delete(s),n.onUnlisten(s)}function Lh(t,e){const n=Gs(t);let s=!1;for(const t of e){const e=t.query,r=n.queries.get(e);if(r){for(const e of r.listeners)e.ro(t)&&(s=!0);r.no=t}}s&&Mh(n)}function Oh(t,e,n){const s=Gs(t),r=s.queries.get(e);if(r)for(const t of r.listeners)t.onError(n);s.queries.delete(e)}function Mh(t){t.so.forEach((t=>{t.next()}))}class Fh{constructor(t,e,n){this.query=t,this.oo=e,this.co=!1,this.ao=null,this.onlineState="Unknown",this.options=n||{}}ro(t){if(!this.options.includeMetadataChanges){const e=[];for(const n of t.docChanges)3!==n.type&&e.push(n);t=new Dh(t.query,t.docs,t.oldDocs,e,t.mutatedKeys,t.fromCache,t.syncStateChanged,!0)}let e=!1;return this.co?this.uo(t)&&(this.oo.next(t),e=!0):this.ho(t,this.onlineState)&&(this.lo(t),e=!0),this.ao=t,e}onError(t){this.oo.error(t)}io(t){this.onlineState=t;let e=!1;return this.ao&&!this.co&&this.ho(this.ao,t)&&(this.lo(this.ao),e=!0),e}ho(t,e){if(!t.fromCache)return!0;const n="Offline"!==e;return!(this.options.fo&&n||t.docs.isEmpty()&&"Offline"!==e)}uo(t){if(t.docChanges.length>0)return!0;const e=this.ao&&this.ao.hasPendingWrites!==t.hasPendingWrites;return!(!t.syncStateChanged&&!e)&&!0===this.options.includeMetadataChanges}lo(t){t=Dh.fromInitialDocuments(t.query,t.docs,t.mutatedKeys,t.fromCache),this.co=!0,this.oo.next(t)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ph{constructor(t,e){this.payload=t,this.byteLength=e}wo(){return"metadata"in this.payload}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vh{constructor(t){this.N=t}zn(t){return Qo(this.N,t)}Hn(t){return t.metadata.exists?ta(this.N,t.document,!1):Hr.newNoDocument(this.zn(t.metadata.name),this.Jn(t.metadata.readTime))}Jn(t){return $o(t)}}class Uh{constructor(t,e,n){this._o=t,this.localStore=e,this.N=n,this.queries=[],this.documents=[],this.progress=qh(t)}mo(t){this.progress.bytesLoaded+=t.byteLength;let e=this.progress.documentsLoaded;return t.payload.namedQuery?this.queries.push(t.payload.namedQuery):t.payload.documentMetadata?(this.documents.push({metadata:t.payload.documentMetadata}),t.payload.documentMetadata.exists||++e):t.payload.document&&(this.documents[this.documents.length-1].document=t.payload.document,++e),e!==this.progress.documentsLoaded?(this.progress.documentsLoaded=e,Object.assign({},this.progress)):null}yo(t){const e=new Map,n=new Vh(this.N);for(const s of t)if(s.metadata.queries){const t=n.zn(s.metadata.name);for(const n of s.metadata.queries){const s=(e.get(n)||No()).add(t);e.set(n,s)}}return e}async complete(){const t=await async function(t,e,n,s){const r=Gs(t);let i=No(),o=bo(),a=So();for(const t of n){const n=e.zn(t.metadata.name);t.document&&(i=i.add(n)),o=o.insert(n,e.Hn(t)),a=a.insert(n,e.Jn(t.metadata.readTime))}const c=r.jn.newChangeBuffer({trackRemovals:!0}),u=await hu(r,function(t){return Ti(mi(fr.fromString(`__bundle__/docs/${t}`)))}(s));return r.persistence.runTransaction("Apply bundle documents","readwrite",(t=>cu(t,c,o,cr.min(),a).next((e=>(c.apply(t),e))).next((e=>r.ze.removeMatchingKeysForTargetId(t,u.targetId).next((()=>r.ze.addMatchingKeys(t,i,u.targetId))).next((()=>r.Qn.vn(t,e))).next((()=>e))))))}(this.localStore,new Vh(this.N),this.documents,this._o.id),e=this.yo(this.documents);for(const t of this.queries)await mu(this.localStore,t,e.get(t.name));return this.progress.taskState="Success",new tu(Object.assign({},this.progress),t)}}function qh(t){return{taskState:"Running",documentsLoaded:0,bytesLoaded:0,totalDocuments:t.totalDocuments,totalBytes:t.totalBytes}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bh{constructor(t){this.key=t}}class jh{constructor(t){this.key=t}}class Kh{constructor(t,e){this.query=t,this.po=e,this.To=null,this.current=!1,this.Eo=No(),this.mutatedKeys=No(),this.Io=Di(t),this.Ao=new Nh(this.Io)}get Ro(){return this.po}bo(t,e){const n=e?e.Po:new Ah,s=e?e.Ao:this.Ao;let r=e?e.mutatedKeys:this.mutatedKeys,i=s,o=!1;const a=pi(this.query)&&s.size===this.query.limit?s.last():null,c=yi(this.query)&&s.size===this.query.limit?s.first():null;if(t.inorderTraversal(((t,e)=>{const u=s.get(t),h=Ai(this.query,e)?e:null,l=!!u&&this.mutatedKeys.has(u.key),d=!!h&&(h.hasLocalMutations||this.mutatedKeys.has(h.key)&&h.hasCommittedMutations);let f=!1;u&&h?u.data.isEqual(h.data)?l!==d&&(n.track({type:3,doc:h}),f=!0):this.vo(u,h)||(n.track({type:2,doc:h}),f=!0,(a&&this.Io(h,a)>0||c&&this.Io(h,c)<0)&&(o=!0)):!u&&h?(n.track({type:0,doc:h}),f=!0):u&&!h&&(n.track({type:1,doc:u}),f=!0,(a||c)&&(o=!0)),f&&(h?(i=i.add(h),r=d?r.add(t):r.delete(t)):(i=i.delete(t),r=r.delete(t)))})),pi(this.query)||yi(this.query))for(;i.size>this.query.limit;){const t=pi(this.query)?i.last():i.first();i=i.delete(t.key),r=r.delete(t.key),n.track({type:1,doc:t})}return{Ao:i,Po:n,Ln:o,mutatedKeys:r}}vo(t,e){return t.hasLocalMutations&&e.hasCommittedMutations&&!e.hasLocalMutations}applyChanges(t,e,n){const s=this.Ao;this.Ao=t.Ao,this.mutatedKeys=t.mutatedKeys;const r=t.Po.eo();r.sort(((t,e)=>function(t,e){const n=t=>{switch(t){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return js()}};return n(t)-n(e)}(t.type,e.type)||this.Io(t.doc,e.doc))),this.Vo(n);const i=e?this.So():[],o=0===this.Eo.size&&this.current?1:0,a=o!==this.To;return this.To=o,0!==r.length||a?{snapshot:new Dh(this.query,t.Ao,s,r,t.mutatedKeys,0===o,a,!1),Do:i}:{Do:i}}io(t){return this.current&&"Offline"===t?(this.current=!1,this.applyChanges({Ao:this.Ao,Po:new Ah,mutatedKeys:this.mutatedKeys,Ln:!1},!1)):{Do:[]}}Co(t){return!this.po.has(t)&&!!this.Ao.has(t)&&!this.Ao.get(t).hasLocalMutations}Vo(t){t&&(t.addedDocuments.forEach((t=>this.po=this.po.add(t))),t.modifiedDocuments.forEach((t=>{})),t.removedDocuments.forEach((t=>this.po=this.po.delete(t))),this.current=t.current)}So(){if(!this.current)return[];const t=this.Eo;this.Eo=No(),this.Ao.forEach((t=>{this.Co(t.key)&&(this.Eo=this.Eo.add(t.key))}));const e=[];return t.forEach((t=>{this.Eo.has(t)||e.push(new jh(t))})),this.Eo.forEach((n=>{t.has(n)||e.push(new Bh(n))})),e}No(t){this.po=t.Gn,this.Eo=No();const e=this.bo(t.documents);return this.applyChanges(e,!0)}xo(){return Dh.fromInitialDocuments(this.query,this.Ao,this.mutatedKeys,0===this.To)}}class $h{constructor(t,e,n){this.query=t,this.targetId=e,this.view=n}}class Gh{constructor(t){this.key=t,this.ko=!1}}class Hh{constructor(t,e,n,s,r,i){this.localStore=t,this.remoteStore=e,this.eventManager=n,this.sharedClientState=s,this.currentUser=r,this.maxConcurrentLimboResolutions=i,this.$o={},this.Oo=new qc((t=>_i(t)),Si),this.Fo=new Map,this.Mo=new Set,this.Lo=new go(xr.comparator),this.Bo=new Map,this.Uo=new yu,this.qo={},this.Ko=new Map,this.jo=Dc.ie(),this.onlineState="Unknown",this.Qo=void 0}get isPrimaryClient(){return!0===this.Qo}}async function zh(t,e){const n=vl(t);let s,r;const i=n.Oo.get(e);if(i)s=i.targetId,n.sharedClientState.addLocalQueryTarget(s),r=i.view.xo();else{const t=await hu(n.localStore,Ti(e)),i=n.sharedClientState.addLocalQueryTarget(t.targetId);s=t.targetId,r=await Qh(n,e,s,"current"===i),n.isPrimaryClient&&Zu(n.remoteStore,t)}return r}async function Qh(t,e,n,s){t.Wo=(e,n,s)=>async function(t,e,n,s){let r=e.view.bo(n);r.Ln&&(r=await du(t.localStore,e.query,!1).then((({documents:t})=>e.view.bo(t,r))));const i=s&&s.targetChanges.get(e.targetId),o=e.view.applyChanges(r,t.isPrimaryClient,i);return il(t,e.targetId,o.Do),o.snapshot}(t,e,n,s);const r=await du(t.localStore,e,!0),i=new Kh(e,r.Gn),o=i.bo(r.documents),a=Co.createSynthesizedTargetChangeForCurrentChange(n,s&&"Offline"!==t.onlineState),c=i.applyChanges(o,t.isPrimaryClient,a);il(t,n,c.Do);const u=new $h(e,n,i);return t.Oo.set(e,u),t.Fo.has(n)?t.Fo.get(n).push(e):t.Fo.set(n,[e]),c.snapshot}async function Wh(t,e){const n=Gs(t),s=n.Oo.get(e),r=n.Fo.get(s.targetId);if(r.length>1)return n.Fo.set(s.targetId,r.filter((t=>!Si(t,e)))),void n.Oo.delete(e);n.isPrimaryClient?(n.sharedClientState.removeLocalQueryTarget(s.targetId),n.sharedClientState.isActiveQueryTarget(s.targetId)||await lu(n.localStore,s.targetId,!1).then((()=>{n.sharedClientState.clearQueryState(s.targetId),th(n.remoteStore,s.targetId),sl(n,s.targetId)})).catch(Lc)):(sl(n,s.targetId),await lu(n.localStore,s.targetId,!0))}async function Yh(t,e){const n=Gs(t);try{const t=await function(t,e){const n=Gs(t),s=e.snapshotVersion;let r=n.Un;return n.persistence.runTransaction("Apply remote event","readwrite-primary",(t=>{const i=n.jn.newChangeBuffer({trackRemovals:!0});r=n.Un;const o=[];e.targetChanges.forEach(((e,i)=>{const a=r.get(i);if(!a)return;o.push(n.ze.removeMatchingKeys(t,e.removedDocuments,i).next((()=>n.ze.addMatchingKeys(t,e.addedDocuments,i))));const c=e.resumeToken;if(c.approximateByteSize()>0){const u=a.withResumeToken(c,s).withSequenceNumber(t.currentSequenceNumber);r=r.insert(i,u),function(t,e,n){return Ks(e.resumeToken.approximateByteSize()>0),0===t.resumeToken.approximateByteSize()||e.snapshotVersion.toMicroseconds()-t.snapshotVersion.toMicroseconds()>=3e8||n.addedDocuments.size+n.modifiedDocuments.size+n.removedDocuments.size>0}(a,u,e)&&o.push(n.ze.updateTargetData(t,u))}}));let a=bo();if(e.documentUpdates.forEach(((s,r)=>{e.resolvedLimboDocuments.has(s)&&o.push(n.persistence.referenceDelegate.updateLimboDocument(t,s))})),o.push(cu(t,i,e.documentUpdates,s,void 0).next((t=>{a=t}))),!s.isEqual(cr.min())){const e=n.ze.getLastRemoteSnapshotVersion(t).next((e=>n.ze.setTargetsMetadata(t,t.currentSequenceNumber,s)));o.push(e)}return qa.waitFor(o).next((()=>i.apply(t))).next((()=>n.Qn.vn(t,a))).next((()=>a))})).then((t=>(n.Un=r,t)))}(n.localStore,e);e.targetChanges.forEach(((t,e)=>{const s=n.Bo.get(e);s&&(Ks(t.addedDocuments.size+t.modifiedDocuments.size+t.removedDocuments.size<=1),t.addedDocuments.size>0?s.ko=!0:t.modifiedDocuments.size>0?Ks(s.ko):t.removedDocuments.size>0&&(Ks(s.ko),s.ko=!1))})),await cl(n,t,e)}catch(t){await Lc(t)}}function Xh(t,e,n){const s=Gs(t);if(s.isPrimaryClient&&0===n||!s.isPrimaryClient&&1===n){const t=[];s.Oo.forEach(((n,s)=>{const r=s.view.io(e);r.snapshot&&t.push(r.snapshot)})),function(t,e){const n=Gs(t);n.onlineState=e;let s=!1;n.queries.forEach(((t,n)=>{for(const t of n.listeners)t.io(e)&&(s=!0)})),s&&Mh(n)}(s.eventManager,e),t.length&&s.$o.Rr(t),s.onlineState=e,s.isPrimaryClient&&s.sharedClientState.setOnlineState(e)}}async function Jh(t,e,n){const s=Gs(t);s.sharedClientState.updateQueryState(e,"rejected",n);const r=s.Bo.get(e),i=r&&r.key;if(i){let t=new go(xr.comparator);t=t.insert(i,Hr.newNoDocument(i,cr.min()));const n=No().add(i),r=new xo(cr.min(),new Map,new yo(rr),t,n);await Yh(s,r),s.Lo=s.Lo.remove(i),s.Bo.delete(e),al(s)}else await lu(s.localStore,e,!1).then((()=>sl(s,e,n))).catch(Lc)}async function Zh(t,e){const n=Gs(t),s=e.batch.batchId;try{const t=await function(t,e){const n=Gs(t);return n.persistence.runTransaction("Acknowledge batch","readwrite-primary",(t=>{const s=e.batch.keys(),r=n.jn.newChangeBuffer({trackRemovals:!0});return function(t,e,n,s){const r=n.batch,i=r.keys();let o=qa.resolve();return i.forEach((t=>{o=o.next((()=>s.getEntry(e,t))).next((e=>{const i=n.docVersions.get(t);Ks(null!==i),e.version.compareTo(i)<0&&(r.applyToRemoteDocument(e,n),e.isValidDocument()&&s.addEntry(e,n.commitVersion))}))})),o.next((()=>t.In.removeMutationBatch(e,r)))}(n,t,e,r).next((()=>r.apply(t))).next((()=>n.In.performConsistencyCheck(t))).next((()=>n.Qn.Pn(t,s)))}))}(n.localStore,e);nl(n,s,null),el(n,s),n.sharedClientState.updateMutationState(s,"acknowledged"),await cl(n,t)}catch(t){await Lc(t)}}async function tl(t,e,n){const s=Gs(t);try{const t=await function(t,e){const n=Gs(t);return n.persistence.runTransaction("Reject batch","readwrite-primary",(t=>{let s;return n.In.lookupMutationBatch(t,e).next((e=>(Ks(null!==e),s=e.keys(),n.In.removeMutationBatch(t,e)))).next((()=>n.In.performConsistencyCheck(t))).next((()=>n.Qn.Pn(t,s)))}))}(s.localStore,e);nl(s,e,n),el(s,e),s.sharedClientState.updateMutationState(e,"rejected",n),await cl(s,t)}catch(t){await Lc(t)}}function el(t,e){(t.Ko.get(e)||[]).forEach((t=>{t.resolve()})),t.Ko.delete(e)}function nl(t,e,n){const s=Gs(t);let r=s.qo[s.currentUser.toKey()];if(r){const t=r.get(e);t&&(n?t.reject(n):t.resolve(),r=r.remove(e)),s.qo[s.currentUser.toKey()]=r}}function sl(t,e,n=null){t.sharedClientState.removeLocalQueryTarget(e);for(const s of t.Fo.get(e))t.Oo.delete(s),n&&t.$o.Go(s,n);t.Fo.delete(e),t.isPrimaryClient&&t.Uo.cs(e).forEach((e=>{t.Uo.containsKey(e)||rl(t,e)}))}function rl(t,e){t.Mo.delete(e.path.canonicalString());const n=t.Lo.get(e);null!==n&&(th(t.remoteStore,n),t.Lo=t.Lo.remove(e),t.Bo.delete(n),al(t))}function il(t,e,n){for(const s of n)s instanceof Bh?(t.Uo.addReference(s.key,e),ol(t,s)):s instanceof jh?(Vs("SyncEngine","Document no longer in limbo: "+s.key),t.Uo.removeReference(s.key,e),t.Uo.containsKey(s.key)||rl(t,s.key)):js()}function ol(t,e){const n=e.key,s=n.path.canonicalString();t.Lo.get(n)||t.Mo.has(s)||(Vs("SyncEngine","New document in limbo: "+n),t.Mo.add(s),al(t))}function al(t){for(;t.Mo.size>0&&t.Lo.size<t.maxConcurrentLimboResolutions;){const e=t.Mo.values().next().value;t.Mo.delete(e);const n=new xr(fr.fromString(e)),s=t.jo.next();t.Bo.set(s,new Gh(n)),t.Lo=t.Lo.insert(n,s),Zu(t.remoteStore,new tc(Ti(mi(n.path)),s,2,er.T))}}async function cl(t,e,n){const s=Gs(t),r=[],i=[],o=[];s.Oo.isEmpty()||(s.Oo.forEach(((t,a)=>{o.push(s.Wo(a,e,n).then((t=>{if(t){s.isPrimaryClient&&s.sharedClientState.updateQueryState(a.targetId,t.fromCache?"not-current":"current"),r.push(t);const e=nu.kn(a.targetId,t);i.push(e)}})))})),await Promise.all(o),s.$o.Rr(r),await async function(t,e){const n=Gs(t);try{await n.persistence.runTransaction("notifyLocalViewChanges","readwrite",(t=>qa.forEach(e,(e=>qa.forEach(e.Nn,(s=>n.persistence.referenceDelegate.addReference(t,e.targetId,s))).next((()=>qa.forEach(e.xn,(s=>n.persistence.referenceDelegate.removeReference(t,e.targetId,s)))))))))}catch(t){if(!Ga(t))throw t;Vs("LocalStore","Failed to update sequence numbers: "+t)}for(const t of e){const e=t.targetId;if(!t.fromCache){const t=n.Un.get(e),s=t.snapshotVersion,r=t.withLastLimboFreeSnapshotVersion(s);n.Un=n.Un.insert(e,r)}}}(s.localStore,i))}async function ul(t,e){const n=Gs(t);if(!n.currentUser.isEqual(e)){Vs("SyncEngine","User change. New user:",e.toKey());const t=await ou(n.localStore,e);n.currentUser=e,function(t,e){t.Ko.forEach((t=>{t.forEach((t=>{t.reject(new zs(Hs.CANCELLED,"'waitForPendingWrites' promise is rejected due to a user change."))}))})),t.Ko.clear()}(n),n.sharedClientState.handleUserChange(e,t.removedBatchIds,t.addedBatchIds),await cl(n,t.Wn)}}function hl(t,e){const n=Gs(t),s=n.Bo.get(e);if(s&&s.ko)return No().add(s.key);{let t=No();const s=n.Fo.get(e);if(!s)return t;for(const e of s){const s=n.Oo.get(e);t=t.unionWith(s.view.Ro)}return t}}async function ll(t,e){const n=Gs(t),s=await du(n.localStore,e.query,!0),r=e.view.No(s);return n.isPrimaryClient&&il(n,e.targetId,r.Do),r}async function dl(t){const e=Gs(t);return gu(e.localStore).then((t=>cl(e,t)))}async function fl(t,e,n,s){const r=Gs(t),i=await function(t,e){const n=Gs(t),s=Gs(n.In);return n.persistence.runTransaction("Lookup mutation documents","readonly",(t=>s.Xt(t,e).next((e=>e?n.Qn.Pn(t,e):qa.resolve(null)))))}(r.localStore,e);null!==i?("pending"===n?await dh(r.remoteStore):"acknowledged"===n||"rejected"===n?(nl(r,e,s||null),el(r,e),function(t,e){Gs(Gs(t).In).te(e)}(r.localStore,e)):js(),await cl(r,i)):Vs("SyncEngine","Cannot apply mutation batch with id: "+e)}async function gl(t,e,n){const s=Gs(t),r=[],i=[];for(const t of e){let e;const n=s.Fo.get(t);if(n&&0!==n.length){e=await hu(s.localStore,Ti(n[0]));for(const t of n){const e=s.Oo.get(t),n=await ll(s,e);n.snapshot&&i.push(n.snapshot)}}else{const n=await fu(s.localStore,t);e=await hu(s.localStore,n),await Qh(s,ml(n),t,!1)}r.push(e)}return s.$o.Rr(i),r}function ml(t){return gi(t.path,t.collectionGroup,t.orderBy,t.filters,t.limit,"F",t.startAt,t.endAt)}function pl(t){const e=Gs(t);return Gs(Gs(e.localStore).persistence).pn()}async function yl(t,e,n,s){const r=Gs(t);if(r.Qo)Vs("SyncEngine","Ignoring unexpected query state notification.");else if(r.Fo.has(e))switch(n){case"current":case"not-current":{const t=await gu(r.localStore),s=xo.createSynthesizedRemoteEventForCurrentChange(e,"current"===n);await cl(r,t,s);break}case"rejected":await lu(r.localStore,e,!0),sl(r,e,s);break;default:js()}}async function wl(t,e,n){const s=vl(t);if(s.Qo){for(const t of e){if(s.Fo.has(t)){Vs("SyncEngine","Adding an already active target "+t);continue}const e=await fu(s.localStore,t),n=await hu(s.localStore,e);await Qh(s,ml(e),n.targetId,!1),Zu(s.remoteStore,n)}for(const t of n)s.Fo.has(t)&&await lu(s.localStore,t,!1).then((()=>{th(s.remoteStore,t),sl(s,t)})).catch(Lc)}}function vl(t){const e=Gs(t);return e.remoteStore.remoteSyncer.applyRemoteEvent=Yh.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=hl.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=Jh.bind(null,e),e.$o.Rr=Lh.bind(null,e.eventManager),e.$o.Go=Oh.bind(null,e.eventManager),e}function bl(t){const e=Gs(t);return e.remoteStore.remoteSyncer.applySuccessfulWrite=Zh.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=tl.bind(null,e),e}class El{constructor(){this.synchronizeTabs=!1}async initialize(t){this.N=Ku(t.databaseInfo.databaseId),this.sharedClientState=this.Ho(t),this.persistence=this.Jo(t),await this.persistence.start(),this.gcScheduler=this.Yo(t),this.localStore=this.Xo(t)}Yo(t){return null}Xo(t){return iu(this.persistence,new su,t.initialUser,this.N)}Jo(t){return new Iu(_u.Ns,this.N)}Ho(t){return new Mu}async terminate(){this.gcScheduler&&this.gcScheduler.stop(),await this.sharedClientState.shutdown(),await this.persistence.shutdown()}}class Tl extends El{constructor(t,e,n){super(),this.Zo=t,this.cacheSizeBytes=e,this.forceOwnership=n,this.synchronizeTabs=!1}async initialize(t){await super.initialize(t),await async function(t){const e=Gs(t);return e.persistence.runTransaction("Synchronize last document change read time","readonly",(t=>function(t){const e=Gc(t);let n=cr.min();return e.Kt({index:Da.readTimeIndex,reverse:!0},((t,e,s)=>{e.readTime&&(n=ic(e.readTime)),s.done()})).next((()=>n))}(t))).then((t=>{e.Kn=t}))}(this.localStore),await this.Zo.initialize(this,t),await bl(this.Zo.syncEngine),await dh(this.Zo.remoteStore),await this.persistence.nn((()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(this.localStore),Promise.resolve())))}Xo(t){return iu(this.persistence,new su,t.initialUser,this.N)}Yo(t){const e=this.persistence.referenceDelegate.garbageCollector;return new Fc(e,t.asyncQueue)}Jo(t){const e=Zc(t.databaseInfo.databaseId,t.databaseInfo.persistenceKey),n=void 0!==this.cacheSizeBytes?bc.withCacheSize(this.cacheSizeBytes):bc.DEFAULT;return new Yc(this.synchronizeTabs,e,t.clientId,n,t.asyncQueue,Bu(),ju(),this.N,this.sharedClientState,!!this.forceOwnership)}Ho(t){return new Mu}}class Il extends Tl{constructor(t,e){super(t,e,!1),this.Zo=t,this.cacheSizeBytes=e,this.synchronizeTabs=!0}async initialize(t){await super.initialize(t);const e=this.Zo.syncEngine;this.sharedClientState instanceof Ou&&(this.sharedClientState.syncEngine={_i:fl.bind(null,e),mi:yl.bind(null,e),gi:wl.bind(null,e),pn:pl.bind(null,e),wi:dl.bind(null,e)},await this.sharedClientState.start()),await this.persistence.nn((async t=>{await async function(t,e){const n=Gs(t);if(vl(n),bl(n),!0===e&&!0!==n.Qo){const t=n.sharedClientState.getAllActiveQueryTargets(),e=await gl(n,t.toArray());n.Qo=!0,await Eh(n.remoteStore,!0);for(const t of e)Zu(n.remoteStore,t)}else if(!1===e&&!1!==n.Qo){const t=[];let e=Promise.resolve();n.Fo.forEach(((s,r)=>{n.sharedClientState.isLocalQueryTarget(r)?t.push(r):e=e.then((()=>(sl(n,r),lu(n.localStore,r,!0)))),th(n.remoteStore,r)})),await e,await gl(n,t),function(t){const e=Gs(t);e.Bo.forEach(((t,n)=>{th(e.remoteStore,n)})),e.Uo.us(),e.Bo=new Map,e.Lo=new go(xr.comparator)}(n),n.Qo=!1,await Eh(n.remoteStore,!1)}}(this.Zo.syncEngine,t),this.gcScheduler&&(t&&!this.gcScheduler.started?this.gcScheduler.start(this.localStore):t||this.gcScheduler.stop())}))}Ho(t){const e=Bu();if(!Ou.bt(e))throw new zs(Hs.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const n=Zc(t.databaseInfo.databaseId,t.databaseInfo.persistenceKey);return new Ou(e,t.asyncQueue,n,t.clientId,t.initialUser)}}class Sl{async initialize(t,e){this.localStore||(this.localStore=t.localStore,this.sharedClientState=t.sharedClientState,this.datastore=this.createDatastore(e),this.remoteStore=this.createRemoteStore(e),this.eventManager=this.createEventManager(e),this.syncEngine=this.createSyncEngine(e,!t.synchronizeTabs),this.sharedClientState.onlineStateHandler=t=>Xh(this.syncEngine,t,1),this.remoteStore.remoteSyncer.handleCredentialChange=ul.bind(null,this.syncEngine),await Eh(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(t){return new Ch}createDatastore(t){const e=Ku(t.databaseInfo.databaseId),n=(s=t.databaseInfo,new qu(s));var s;return function(t,e,n){return new Qu(t,e,n)}(t.credentials,n,e)}createRemoteStore(t){var e,n,s,r,i;return e=this.localStore,n=this.datastore,s=t.asyncQueue,r=t=>Xh(this.syncEngine,t,0),i=Pu.bt()?new Pu:new Fu,new Yu(e,n,s,r,i)}createSyncEngine(t,e){return function(t,e,n,s,r,i,o){const a=new Hh(t,e,n,s,r,i);return o&&(a.Qo=!0),a}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,t.initialUser,t.maxConcurrentLimboResolutions,e)}terminate(){return async function(t){const e=Gs(t);Vs("RemoteStore","RemoteStore shutting down."),e.Wr.add(5),await Ju(e),e.zr.shutdown(),e.Hr.set("Unknown")}(this.remoteStore)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function _l(t,e=10240){let n=0;return{async read(){if(n<t.byteLength){const s={value:t.slice(n,n+e),done:!1};return n+=e,s}return{done:!0}},async cancel(){},releaseLock(){},closed:Promise.reject("unimplemented")}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nl{constructor(t){this.observer=t,this.muted=!1}next(t){this.observer.next&&this.tc(this.observer.next,t)}error(t){this.observer.error?this.tc(this.observer.error,t):console.error("Uncaught Error in snapshot listener:",t)}ec(){this.muted=!0}tc(t,e){this.muted||setTimeout((()=>{this.muted||t(e)}),0)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Al{constructor(t,e){this.nc=t,this.N=e,this.metadata=new Qs,this.buffer=new Uint8Array,this.sc=new TextDecoder("utf-8"),this.ic().then((t=>{t&&t.wo()?this.metadata.resolve(t.payload.metadata):this.metadata.reject(new Error(`The first element of the bundle is not a metadata, it is\n             ${JSON.stringify(null==t?void 0:t.payload)}`))}),(t=>this.metadata.reject(t)))}close(){return this.nc.cancel()}async getMetadata(){return this.metadata.promise}async zo(){return await this.getMetadata(),this.ic()}async ic(){const t=await this.rc();if(null===t)return null;const e=this.sc.decode(t),n=Number(e);isNaN(n)&&this.oc(`length string (${e}) is not valid number`);const s=await this.cc(n);return new Ph(JSON.parse(s),t.length+n)}ac(){return this.buffer.findIndex((t=>t==="{".charCodeAt(0)))}async rc(){for(;this.ac()<0&&!await this.uc(););if(0===this.buffer.length)return null;const t=this.ac();t<0&&this.oc("Reached the end of bundle when a length string is expected.");const e=this.buffer.slice(0,t);return this.buffer=this.buffer.slice(t),e}async cc(t){for(;this.buffer.length<t;)await this.uc()&&this.oc("Reached the end of bundle when more is expected.");const e=this.sc.decode(this.buffer.slice(0,t));return this.buffer=this.buffer.slice(t),e}oc(t){throw this.nc.cancel(),new Error(`Invalid bundle format: ${t}`)}async uc(){const t=await this.nc.read();if(!t.done){const e=new Uint8Array(this.buffer.length+t.value.length);e.set(this.buffer),e.set(t.value,this.buffer.length),this.buffer=e}return t.done}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Dl{constructor(t){this.datastore=t,this.readVersions=new Map,this.mutations=[],this.committed=!1,this.lastWriteError=null,this.writtenDocs=new Set}async lookup(t){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw new zs(Hs.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes.");const e=await async function(t,e){const n=Gs(t),s=Xo(n.N)+"/documents",r={documents:e.map((t=>zo(n.N,t)))},i=await n.Ki("BatchGetDocuments",s,r),o=new Map;i.forEach((t=>{const e=function(t,e){return"found"in e?function(t,e){Ks(!!e.found),e.found.name,e.found.updateTime;const n=Qo(t,e.found.name),s=$o(e.found.updateTime),r=new $r({mapValue:{fields:e.found.fields}});return Hr.newFoundDocument(n,s,r)}(t,e):"missing"in e?function(t,e){Ks(!!e.missing),Ks(!!e.readTime);const n=Qo(t,e.missing),s=$o(e.readTime);return Hr.newNoDocument(n,s)}(t,e):js()}(n.N,t);o.set(e.key.toString(),e)}));const a=[];return e.forEach((t=>{const e=o.get(t.toString());Ks(!!e),a.push(e)})),a}(this.datastore,t);return e.forEach((t=>this.recordVersion(t))),e}set(t,e){this.write(e.toMutation(t,this.precondition(t))),this.writtenDocs.add(t.toString())}update(t,e){try{this.write(e.toMutation(t,this.preconditionForUpdate(t)))}catch(t){this.lastWriteError=t}this.writtenDocs.add(t.toString())}delete(t){this.write(new oo(t,this.precondition(t))),this.writtenDocs.add(t.toString())}async commit(){if(this.ensureCommitNotCalled(),this.lastWriteError)throw this.lastWriteError;const t=this.readVersions;this.mutations.forEach((e=>{t.delete(e.key.toString())})),t.forEach(((t,e)=>{const n=xr.fromPath(e);this.mutations.push(new ao(n,this.precondition(n)))})),await async function(t,e){const n=Gs(t),s=Xo(n.N)+"/documents",r={writes:e.map((t=>ea(n.N,t)))};await n.Li("Commit",s,r)}(this.datastore,this.mutations),this.committed=!0}recordVersion(t){let e;if(t.isFoundDocument())e=t.version;else{if(!t.isNoDocument())throw js();e=cr.min()}const n=this.readVersions.get(t.key.toString());if(n){if(!e.isEqual(n))throw new zs(Hs.ABORTED,"Document version changed between two reads.")}else this.readVersions.set(t.key.toString(),e)}precondition(t){const e=this.readVersions.get(t.toString());return!this.writtenDocs.has(t.toString())&&e?zi.updateTime(e):zi.none()}preconditionForUpdate(t){const e=this.readVersions.get(t.toString());if(!this.writtenDocs.has(t.toString())&&e){if(e.isEqual(cr.min()))throw new zs(Hs.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return zi.updateTime(e)}return zi.exists(!0)}write(t){this.ensureCommitNotCalled(),this.mutations.push(t)}ensureCommitNotCalled(){}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xl{constructor(t,e,n,s){this.asyncQueue=t,this.datastore=e,this.updateFunction=n,this.deferred=s,this.hc=5,this.ar=new $u(this.asyncQueue,"transaction_retry")}run(){this.hc-=1,this.lc()}lc(){this.ar.Xi((async()=>{const t=new Dl(this.datastore),e=this.fc(t);e&&e.then((e=>{this.asyncQueue.enqueueAndForget((()=>t.commit().then((()=>{this.deferred.resolve(e)})).catch((t=>{this.dc(t)}))))})).catch((t=>{this.dc(t)}))}))}fc(t){try{const e=this.updateFunction(t);return!Nr(e)&&e.catch&&e.then?e:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(t){return this.deferred.reject(t),null}}dc(t){this.hc>0&&this.wc(t)?(this.hc-=1,this.asyncQueue.enqueueAndForget((()=>(this.lc(),Promise.resolve())))):this.deferred.reject(t)}wc(t){if("FirebaseError"===t.name){const e=t.code;return"aborted"===e||"failed-precondition"===e||!lo(e)}return!1}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cl{constructor(t,e,n){this.credentials=t,this.asyncQueue=e,this.databaseInfo=n,this.user=Ls.UNAUTHENTICATED,this.clientId=sr.I(),this.credentialListener=()=>Promise.resolve(),this.credentials.start(e,(async t=>{Vs("FirestoreClient","Received user=",t.uid),await this.credentialListener(t),this.user=t}))}async getConfiguration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,credentials:this.credentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(t){this.credentialListener=t}verifyNotTerminated(){if(this.asyncQueue.isShuttingDown)throw new zs(Hs.FAILED_PRECONDITION,"The client has already been terminated.")}terminate(){this.asyncQueue.enterRestrictedMode();const t=new Qs;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted((async()=>{try{this.onlineComponents&&await this.onlineComponents.terminate(),this.offlineComponents&&await this.offlineComponents.terminate(),this.credentials.shutdown(),t.resolve()}catch(e){const n=_h(e,"Failed to shutdown persistence");t.reject(n)}})),t.promise}}async function kl(t,e){t.asyncQueue.verifyOperationInProgress(),Vs("FirestoreClient","Initializing OfflineComponentProvider");const n=await t.getConfiguration();await e.initialize(n);let s=n.initialUser;t.setCredentialChangeListener((async t=>{s.isEqual(t)||(await ou(e.localStore,t),s=t)})),e.persistence.setDatabaseDeletedListener((()=>t.terminate())),t.offlineComponents=e}async function Rl(t,e){t.asyncQueue.verifyOperationInProgress();const n=await Ll(t);Vs("FirestoreClient","Initializing OnlineComponentProvider");const s=await t.getConfiguration();await e.initialize(n,s),t.setCredentialChangeListener((t=>async function(t,e){const n=Gs(t);n.asyncQueue.verifyOperationInProgress(),Vs("RemoteStore","RemoteStore received new credentials");const s=ih(n);n.Wr.add(3),await Ju(n),s&&n.Hr.set("Unknown"),await n.remoteSyncer.handleCredentialChange(e),n.Wr.delete(3),await Xu(n)}(e.remoteStore,t))),t.onlineComponents=e}async function Ll(t){return t.offlineComponents||(Vs("FirestoreClient","Using default OfflineComponentProvider"),await kl(t,new El)),t.offlineComponents}async function Ol(t){return t.onlineComponents||(Vs("FirestoreClient","Using default OnlineComponentProvider"),await Rl(t,new Sl)),t.onlineComponents}function Ml(t){return Ll(t).then((t=>t.persistence))}function Fl(t){return Ll(t).then((t=>t.localStore))}function Pl(t){return Ol(t).then((t=>t.remoteStore))}function Vl(t){return Ol(t).then((t=>t.syncEngine))}async function Ul(t){const e=await Ol(t),n=e.eventManager;return n.onListen=zh.bind(null,e.syncEngine),n.onUnlisten=Wh.bind(null,e.syncEngine),n}function ql(t,e,n={}){const s=new Qs;return t.asyncQueue.enqueueAndForget((async()=>function(t,e,n,s,r){const i=new Nl({next:i=>{e.enqueueAndForget((()=>Rh(t,o)));const a=i.docs.has(n);!a&&i.fromCache?r.reject(new zs(Hs.UNAVAILABLE,"Failed to get document because the client is offline.")):a&&i.fromCache&&s&&"server"===s.source?r.reject(new zs(Hs.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):r.resolve(i)},error:t=>r.reject(t)}),o=new Fh(mi(n.path),i,{includeMetadataChanges:!0,fo:!0});return kh(t,o)}(await Ul(t),t.asyncQueue,e,n,s))),s.promise}function Bl(t,e,n={}){const s=new Qs;return t.asyncQueue.enqueueAndForget((async()=>function(t,e,n,s,r){const i=new Nl({next:n=>{e.enqueueAndForget((()=>Rh(t,o))),n.fromCache&&"server"===s.source?r.reject(new zs(Hs.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):r.resolve(n)},error:t=>r.reject(t)}),o=new Fh(n,i,{includeMetadataChanges:!0,fo:!0});return kh(t,o)}(await Ul(t),t.asyncQueue,e,n,s))),s.promise}function jl(t,e,n,s){const r=function(t,e){let n;return n="string"==typeof t?(new TextEncoder).encode(t):t,function(t,e){return new Al(t,e)}(function(t,e){if(t instanceof Uint8Array)return _l(t,e);if(t instanceof ArrayBuffer)return _l(new Uint8Array(t),e);if(t instanceof ReadableStream)return t.getReader();throw new Error("Source of `toByteStreamReader` has to be a ArrayBuffer or ReadableStream")}(n),e)}(n,Ku(e));t.asyncQueue.enqueueAndForget((async()=>{!function(t,e,n){const s=Gs(t);(async function(t,e,n){try{const s=await e.getMetadata();if(await function(t,e){const n=Gs(t),s=$o(e.createTime);return n.persistence.runTransaction("hasNewerBundle","readonly",(t=>n.Je.getBundleMetadata(t,e.id))).then((t=>!!t&&t.createTime.compareTo(s)>=0))}(t.localStore,s))return await e.close(),void n._completeWith(function(t){return{taskState:"Success",documentsLoaded:t.totalDocuments,bytesLoaded:t.totalBytes,totalDocuments:t.totalDocuments,totalBytes:t.totalBytes}}(s));n._updateProgress(qh(s));const r=new Uh(s,t.localStore,e.N);let i=await e.zo();for(;i;){const t=await r.mo(i);t&&n._updateProgress(t),i=await e.zo()}const o=await r.complete();await cl(t,o.En,void 0),await function(t,e){const n=Gs(t);return n.persistence.runTransaction("Save bundle","readwrite",(t=>n.Je.saveBundleMetadata(t,e)))}(t.localStore,s),n._completeWith(o.progress)}catch(t){qs("SyncEngine",`Loading bundle failed with ${t}`),n._failWith(t)}})(s,e,n).then((()=>{s.sharedClientState.notifyBundleLoaded()}))}(await Vl(t),r,s)}))}class Kl{constructor(t,e,n,s,r,i,o,a){this.databaseId=t,this.appId=e,this.persistenceKey=n,this.host=s,this.ssl=r,this.forceLongPolling=i,this.autoDetectLongPolling=o,this.useFetchStreams=a}}class $l{constructor(t,e){this.projectId=t,this.database=e||"(default)"}get isDefaultDatabase(){return"(default)"===this.database}isEqual(t){return t instanceof $l&&t.projectId===this.projectId&&t.database===this.database}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gl=new Map;
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Hl(t,e,n){if(!n)throw new zs(Hs.INVALID_ARGUMENT,`Function ${t}() cannot be called with an empty ${e}.`)}function zl(t,e,n,s){if(!0===e&&!0===s)throw new zs(Hs.INVALID_ARGUMENT,`${t} and ${n} cannot be used together.`)}function Ql(t){if(!xr.isDocumentKey(t))throw new zs(Hs.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${t} has ${t.length}.`)}function Wl(t){if(xr.isDocumentKey(t))throw new zs(Hs.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${t} has ${t.length}.`)}function Yl(t){if(void 0===t)return"undefined";if(null===t)return"null";if("string"==typeof t)return t.length>20&&(t=`${t.substring(0,20)}...`),JSON.stringify(t);if("number"==typeof t||"boolean"==typeof t)return""+t;if("object"==typeof t){if(t instanceof Array)return"an array";{const e=function(t){return t.constructor?t.constructor.name:null}(t);return e?`a custom ${e} object`:"an object"}}return"function"==typeof t?"a function":js()}function Xl(t,e){if("_delegate"in t&&(t=t._delegate),!(t instanceof e)){if(e.name===t.constructor.name)throw new zs(Hs.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const n=Yl(t);throw new zs(Hs.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${n}`)}}return t}function Jl(t,e){if(e<=0)throw new zs(Hs.INVALID_ARGUMENT,`Function ${t}() requires a positive number, but it was: ${e}.`)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zl{constructor(t){var e;if(void 0===t.host){if(void 0!==t.ssl)throw new zs(Hs.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host="firestore.googleapis.com",this.ssl=!0}else this.host=t.host,this.ssl=null===(e=t.ssl)||void 0===e||e;if(this.credentials=t.credentials,this.ignoreUndefinedProperties=!!t.ignoreUndefinedProperties,void 0===t.cacheSizeBytes)this.cacheSizeBytes=41943040;else{if(-1!==t.cacheSizeBytes&&t.cacheSizeBytes<1048576)throw new zs(Hs.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=t.cacheSizeBytes}this.experimentalForceLongPolling=!!t.experimentalForceLongPolling,this.experimentalAutoDetectLongPolling=!!t.experimentalAutoDetectLongPolling,this.useFetchStreams=!!t.useFetchStreams,zl("experimentalForceLongPolling",t.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",t.experimentalAutoDetectLongPolling)}isEqual(t){return this.host===t.host&&this.ssl===t.ssl&&this.credentials===t.credentials&&this.cacheSizeBytes===t.cacheSizeBytes&&this.experimentalForceLongPolling===t.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===t.experimentalAutoDetectLongPolling&&this.ignoreUndefinedProperties===t.ignoreUndefinedProperties&&this.useFetchStreams===t.useFetchStreams}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class td{constructor(t,e){this._credentials=e,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new Zl({}),this._settingsFrozen=!1,t instanceof $l?this._databaseId=t:(this._app=t,this._databaseId=function(t){if(!Object.prototype.hasOwnProperty.apply(t.options,["projectId"]))throw new zs(Hs.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new $l(t.options.projectId)}(t))}get app(){if(!this._app)throw new zs(Hs.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return void 0!==this._terminateTask}_setSettings(t){if(this._settingsFrozen)throw new zs(Hs.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new Zl(t),void 0!==t.credentials&&(this._credentials=function(t){if(!t)return new Ys;switch(t.type){case"gapi":const e=t.client;return Ks(!("object"!=typeof e||null===e||!e.auth||!e.auth.getAuthHeaderValueForFirstParty)),new tr(e,t.sessionIndex||"0",t.iamToken||null);case"provider":return t.client;default:throw new zs(Hs.INVALID_ARGUMENT,"makeCredentialsProvider failed due to invalid credential type")}}(t.credentials))}_getSettings(){return this._settings}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask||(this._terminateTask=this._terminate()),this._terminateTask}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(t){const e=Gl.get(t);e&&(Vs("ComponentProvider","Removing Datastore"),Gl.delete(t),e.terminate())}(this),Promise.resolve()}}function ed(t,e,n,s={}){var r;const i=(t=Xl(t,td))._getSettings();if("firestore.googleapis.com"!==i.host&&i.host!==e&&qs("Host has been set in both settings() and useEmulator(), emulator host will be used"),t._setSettings(Object.assign(Object.assign({},i),{host:`${e}:${n}`,ssl:!1})),s.mockUserToken){let e,n;if("string"==typeof s.mockUserToken)e=s.mockUserToken,n=Ls.MOCK_USER;else{e=
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function(t,e){if(t.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const n=e||"demo-project",s=t.iat||0,r=t.sub||t.user_id;if(!r)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const i=Object.assign({iss:`https://securetoken.google.com/${n}`,aud:n,iat:s,exp:s+3600,auth_time:s,sub:r,user_id:r,firebase:{sign_in_provider:"custom",identities:{}}},t);return[u(JSON.stringify({alg:"none",type:"JWT"})),u(JSON.stringify(i)),""].join(".")}(s.mockUserToken,null===(r=t._app)||void 0===r?void 0:r.options.projectId);const i=s.mockUserToken.sub||s.mockUserToken.user_id;if(!i)throw new zs(Hs.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");n=new Ls(i)}t._credentials=new Xs(new Ws(e,n))}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nd{constructor(t,e,n){this.converter=e,this._key=n,this.type="document",this.firestore=t}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new rd(this.firestore,this.converter,this._key.path.popLast())}withConverter(t){return new nd(this.firestore,t,this._key)}}class sd{constructor(t,e,n){this.converter=e,this._query=n,this.type="query",this.firestore=t}withConverter(t){return new sd(this.firestore,t,this._query)}}class rd extends sd{constructor(t,e,n){super(t,e,mi(n)),this._path=n,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const t=this._path.popLast();return t.isEmpty()?null:new nd(this.firestore,null,new xr(t))}withConverter(t){return new rd(this.firestore,t,this._path)}}function id(t,e,...n){if(t=g(t),Hl("collection","path",e),t instanceof td){const s=fr.fromString(e,...n);return Wl(s),new rd(t,null,s)}{if(!(t instanceof nd||t instanceof rd))throw new zs(Hs.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const s=t._path.child(fr.fromString(e,...n));return Wl(s),new rd(t.firestore,null,s)}}function od(t,e){if(t=Xl(t,td),Hl("collectionGroup","collection id",e),e.indexOf("/")>=0)throw new zs(Hs.INVALID_ARGUMENT,`Invalid collection ID '${e}' passed to function collectionGroup(). Collection IDs must not contain '/'.`);return new sd(t,null,function(t){return new fi(fr.emptyPath(),t)}(e))}function ad(t,e,...n){if(t=g(t),1===arguments.length&&(e=sr.I()),Hl("doc","path",e),t instanceof td){const s=fr.fromString(e,...n);return Ql(s),new nd(t,null,new xr(s))}{if(!(t instanceof nd||t instanceof rd))throw new zs(Hs.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const s=t._path.child(fr.fromString(e,...n));return Ql(s),new nd(t.firestore,t instanceof rd?t.converter:null,new xr(s))}}function cd(t,e){return t=g(t),e=g(e),(t instanceof nd||t instanceof rd)&&(e instanceof nd||e instanceof rd)&&t.firestore===e.firestore&&t.path===e.path&&t.converter===e.converter}function ud(t,e){return t=g(t),e=g(e),t instanceof sd&&e instanceof sd&&t.firestore===e.firestore&&Si(t._query,e._query)&&t.converter===e.converter
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}class hd{constructor(){this._c=Promise.resolve(),this.mc=[],this.gc=!1,this.yc=[],this.Tc=null,this.Ec=!1,this.Ic=!1,this.Ac=[],this.ar=new $u(this,"async_queue_retry"),this.Rc=()=>{const t=ju();t&&Vs("AsyncQueue","Visibility state changed to "+t.visibilityState),this.ar.tr()};const t=ju();t&&"function"==typeof t.addEventListener&&t.addEventListener("visibilitychange",this.Rc)}get isShuttingDown(){return this.gc}enqueueAndForget(t){this.enqueue(t)}enqueueAndForgetEvenWhileRestricted(t){this.bc(),this.Pc(t)}enterRestrictedMode(t){if(!this.gc){this.gc=!0,this.Ic=t||!1;const e=ju();e&&"function"==typeof e.removeEventListener&&e.removeEventListener("visibilitychange",this.Rc)}}enqueue(t){if(this.bc(),this.gc)return new Promise((()=>{}));const e=new Qs;return this.Pc((()=>this.gc&&this.Ic?Promise.resolve():(t().then(e.resolve,e.reject),e.promise))).then((()=>e.promise))}enqueueRetryable(t){this.enqueueAndForget((()=>(this.mc.push(t),this.vc())))}async vc(){if(0!==this.mc.length){try{await this.mc[0](),this.mc.shift(),this.ar.reset()}catch(t){if(!Ga(t))throw t;Vs("AsyncQueue","Operation failed with retryable error: "+t)}this.mc.length>0&&this.ar.Xi((()=>this.vc()))}}Pc(t){const e=this._c.then((()=>(this.Ec=!0,t().catch((t=>{this.Tc=t,this.Ec=!1;const e=function(t){let e=t.message||"";return t.stack&&(e=t.stack.includes(t.message)?t.stack:t.message+"\n"+t.stack),e}(t);throw Us("INTERNAL UNHANDLED ERROR: ",e),t})).then((t=>(this.Ec=!1,t))))));return this._c=e,e}enqueueAfterDelay(t,e,n){this.bc(),this.Ac.indexOf(t)>-1&&(e=0);const s=Sh.createAndSchedule(this,t,e,n,(t=>this.Vc(t)));return this.yc.push(s),s}bc(){this.Tc&&js()}verifyOperationInProgress(){}async Sc(){let t;do{t=this._c,await t}while(t!==this._c)}Dc(t){for(const e of this.yc)if(e.timerId===t)return!0;return!1}Cc(t){return this.Sc().then((()=>{this.yc.sort(((t,e)=>t.targetTimeMs-e.targetTimeMs));for(const e of this.yc)if(e.skipDelay(),"all"!==t&&e.timerId===t)break;return this.Sc()}))}Nc(t){this.Ac.push(t)}Vc(t){const e=this.yc.indexOf(t);this.yc.splice(e,1)}}function ld(t){return function(t,e){if("object"!=typeof t||null===t)return!1;const n=t;for(const t of["next","error","complete"])if(t in n&&"function"==typeof n[t])return!0;return!1}(t)}class dd{constructor(){this._progressObserver={},this._taskCompletionResolver=new Qs,this._lastProgress={taskState:"Running",totalBytes:0,totalDocuments:0,bytesLoaded:0,documentsLoaded:0}}onProgress(t,e,n){this._progressObserver={next:t,error:e,complete:n}}catch(t){return this._taskCompletionResolver.promise.catch(t)}then(t,e){return this._taskCompletionResolver.promise.then(t,e)}_completeWith(t){this._updateProgress(t),this._progressObserver.complete&&this._progressObserver.complete(),this._taskCompletionResolver.resolve(t)}_failWith(t){this._lastProgress.taskState="Error",this._progressObserver.next&&this._progressObserver.next(this._lastProgress),this._progressObserver.error&&this._progressObserver.error(t),this._taskCompletionResolver.reject(t)}_updateProgress(t){this._lastProgress=t,this._progressObserver.next&&this._progressObserver.next(t)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fd=-1;class gd extends td{constructor(t,e){super(t,e),this.type="firestore",this._queue=new hd,this._persistenceKey="name"in t?t.name:"[DEFAULT]"}_terminate(){return this._firestoreClient||wd(this),this._firestoreClient.terminate()}}function md(t,e){const n=i._getProvider(t,"firestore");if(n.isInitialized()){const t=n.getImmediate();if(d(n.getOptions(),e))return t;throw new zs(Hs.FAILED_PRECONDITION,"initializeFirestore() has already been called with different options. To avoid this error, call initializeFirestore() with the same options as when it was originally called, or call getFirestore() to return the already initialized instance.")}if(void 0!==e.cacheSizeBytes&&-1!==e.cacheSizeBytes&&e.cacheSizeBytes<1048576)throw new zs(Hs.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");return n.initialize({options:e})}function pd(t=i.getApp()){return i._getProvider(t,"firestore").getImmediate()}function yd(t){return t._firestoreClient||wd(t),t._firestoreClient.verifyNotTerminated(),t._firestoreClient}function wd(t){var e;const n=t._freezeSettings(),s=function(t,e,n,s){return new Kl(t,e,n,s.host,s.ssl,s.experimentalForceLongPolling,s.experimentalAutoDetectLongPolling,s.useFetchStreams)}(t._databaseId,(null===(e=t._app)||void 0===e?void 0:e.options.appId)||"",t._persistenceKey,n);t._firestoreClient=new Cl(t._credentials,t._queue,s)}function vd(t,e){xd(t=Xl(t,gd));const n=yd(t),s=t._freezeSettings(),r=new Sl;return Ed(n,r,new Tl(r,s.cacheSizeBytes,null==e?void 0:e.forceOwnership))}function bd(t){xd(t=Xl(t,gd));const e=yd(t),n=t._freezeSettings(),s=new Sl;return Ed(e,s,new Il(s,n.cacheSizeBytes))}function Ed(t,e,n){const s=new Qs;return t.asyncQueue.enqueue((async()=>{try{await kl(t,n),await Rl(t,e),s.resolve()}catch(t){if(!function(t){return"FirebaseError"===t.name?t.code===Hs.FAILED_PRECONDITION||t.code===Hs.UNIMPLEMENTED:!("undefined"!=typeof DOMException&&t instanceof DOMException)||(22===t.code||20===t.code||11===t.code)}(t))throw t;console.warn("Error enabling offline persistence. Falling back to persistence disabled: "+t),s.reject(t)}})).then((()=>s.promise))}function Td(t){if(t._initialized&&!t._terminated)throw new zs(Hs.FAILED_PRECONDITION,"Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");const e=new Qs;return t._queue.enqueueAndForgetEvenWhileRestricted((async()=>{try{await async function(t){if(!ja.bt())return Promise.resolve();const e=t+"main";await ja.delete(e)}(Zc(t._databaseId,t._persistenceKey)),e.resolve()}catch(t){e.reject(t)}})),e.promise}function Id(t){return function(t){const e=new Qs;return t.asyncQueue.enqueueAndForget((async()=>async function(t,e){const n=Gs(t);ih(n.remoteStore)||Vs("SyncEngine","The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled.");try{const t=await function(t){const e=Gs(t);return e.persistence.runTransaction("Get highest unacknowledged batch id","readonly",(t=>e.In.getHighestUnacknowledgedBatchId(t)))}(n.localStore);if(-1===t)return void e.resolve();const s=n.Ko.get(t)||[];s.push(e),n.Ko.set(t,s)}catch(t){const n=_h(t,"Initialization of waitForPendingWrites() operation failed");e.reject(n)}}(await Vl(t),e))),e.promise}(yd(t=Xl(t,gd)))}function Sd(t){return function(t){return t.asyncQueue.enqueue((async()=>{const e=await Ml(t),n=await Pl(t);return e.setNetworkEnabled(!0),function(t){const e=Gs(t);return e.Wr.delete(0),Xu(e)}(n)}))}(yd(t=Xl(t,gd)))}function _d(t){return function(t){return t.asyncQueue.enqueue((async()=>{const e=await Ml(t),n=await Pl(t);return e.setNetworkEnabled(!1),async function(t){const e=Gs(t);e.Wr.add(0),await Ju(e),e.Hr.set("Offline")}(n)}))}(yd(t=Xl(t,gd)))}function Nd(t){return i._removeServiceInstance(t.app,"firestore"),t._delete()}function Ad(t,e){const n=yd(t=Xl(t,gd)),s=new dd;return jl(n,t._databaseId,e,s),s}function Dd(t,e){return function(t,e){return t.asyncQueue.enqueue((async()=>function(t,e){const n=Gs(t);return n.persistence.runTransaction("Get named query","readonly",(t=>n.Je.getNamedQuery(t,e)))}(await Fl(t),e)))}(yd(t=Xl(t,gd)),e).then((e=>e?new sd(t,null,e.query):null))}function xd(t){if(t._initialized||t._terminated)throw new zs(Hs.FAILED_PRECONDITION,"Firestore has already been started and persistence can no longer be enabled. You can only enable persistence before calling any other methods on a Firestore object.")}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cd{constructor(...t){for(let e=0;e<t.length;++e)if(0===t[e].length)throw new zs(Hs.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new mr(t)}isEqual(t){return this._internalPath.isEqual(t._internalPath)}}function kd(){return new Cd("__name__")}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rd{constructor(t){this._byteString=t}static fromBase64String(t){try{return new Rd(wr.fromBase64String(t))}catch(t){throw new zs(Hs.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(t){return new Rd(wr.fromUint8Array(t))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(t){return this._byteString.isEqual(t._byteString)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ld{constructor(t){this._methodName=t}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Od{constructor(t,e){if(!isFinite(t)||t<-90||t>90)throw new zs(Hs.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+t);if(!isFinite(e)||e<-180||e>180)throw new zs(Hs.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+e);this._lat=t,this._long=e}get latitude(){return this._lat}get longitude(){return this._long}isEqual(t){return this._lat===t._lat&&this._long===t._long}toJSON(){return{latitude:this._lat,longitude:this._long}}_compareTo(t){return rr(this._lat,t._lat)||rr(this._long,t._long)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Md=/^__.*__$/;class Fd{constructor(t,e,n){this.data=t,this.fieldMask=e,this.fieldTransforms=n}toMutation(t,e){return null!==this.fieldMask?new no(t,this.data,this.fieldMask,e,this.fieldTransforms):new eo(t,this.data,e,this.fieldTransforms)}}class Pd{constructor(t,e,n){this.data=t,this.fieldMask=e,this.fieldTransforms=n}toMutation(t,e){return new no(t,this.data,this.fieldMask,e,this.fieldTransforms)}}function Vd(t){switch(t){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw js()}}class Ud{constructor(t,e,n,s,r,i){this.settings=t,this.databaseId=e,this.N=n,this.ignoreUndefinedProperties=s,void 0===r&&this.xc(),this.fieldTransforms=r||[],this.fieldMask=i||[]}get path(){return this.settings.path}get kc(){return this.settings.kc}$c(t){return new Ud(Object.assign(Object.assign({},this.settings),t),this.databaseId,this.N,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}Oc(t){var e;const n=null===(e=this.path)||void 0===e?void 0:e.child(t),s=this.$c({path:n,Fc:!1});return s.Mc(t),s}Lc(t){var e;const n=null===(e=this.path)||void 0===e?void 0:e.child(t),s=this.$c({path:n,Fc:!1});return s.xc(),s}Bc(t){return this.$c({path:void 0,Fc:!0})}Uc(t){return of(t,this.settings.methodName,this.settings.qc||!1,this.path,this.settings.Kc)}contains(t){return void 0!==this.fieldMask.find((e=>t.isPrefixOf(e)))||void 0!==this.fieldTransforms.find((e=>t.isPrefixOf(e.field)))}xc(){if(this.path)for(let t=0;t<this.path.length;t++)this.Mc(this.path.get(t))}Mc(t){if(0===t.length)throw this.Uc("Document fields must not be empty");if(Vd(this.kc)&&Md.test(t))throw this.Uc('Document fields cannot begin and end with "__"')}}class qd{constructor(t,e,n){this.databaseId=t,this.ignoreUndefinedProperties=e,this.N=n||Ku(t)}jc(t,e,n,s=!1){return new Ud({kc:t,methodName:e,Kc:n,path:mr.emptyPath(),Fc:!1,qc:s},this.databaseId,this.N,this.ignoreUndefinedProperties)}}function Bd(t){const e=t._freezeSettings(),n=Ku(t._databaseId);return new qd(t._databaseId,!!e.ignoreUndefinedProperties,n)}function jd(t,e,n,s,r,i={}){const o=t.jc(i.merge||i.mergeFields?2:0,e,n,r);ef("Data must be an object, but it was:",o,s);const a=Zd(s,o);let c,u;if(i.merge)c=new pr(o.fieldMask),u=o.fieldTransforms;else if(i.mergeFields){const t=[];for(const s of i.mergeFields){const r=nf(e,s,n);if(!o.contains(r))throw new zs(Hs.INVALID_ARGUMENT,`Field '${r}' is specified in your field mask but missing from your input data.`);af(t,r)||t.push(r)}c=new pr(t),u=o.fieldTransforms.filter((t=>c.covers(t.field)))}else c=null,u=o.fieldTransforms;return new Fd(new $r(a),c,u)}class Kd extends Ld{_toFieldTransform(t){if(2!==t.kc)throw 1===t.kc?t.Uc(`${this._methodName}() can only appear at the top level of your update data`):t.Uc(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return t.fieldMask.push(t.path),null}isEqual(t){return t instanceof Kd}}function $d(t,e,n){return new Ud({kc:3,Kc:e.settings.Kc,methodName:t._methodName,Fc:n},e.databaseId,e.N,e.ignoreUndefinedProperties)}class Gd extends Ld{_toFieldTransform(t){return new Gi(t.path,new Pi)}isEqual(t){return t instanceof Gd}}class Hd extends Ld{constructor(t,e){super(t),this.Qc=e}_toFieldTransform(t){const e=$d(this,t,!0),n=this.Qc.map((t=>Jd(t,e))),s=new Vi(n);return new Gi(t.path,s)}isEqual(t){return this===t}}class zd extends Ld{constructor(t,e){super(t),this.Qc=e}_toFieldTransform(t){const e=$d(this,t,!0),n=this.Qc.map((t=>Jd(t,e))),s=new qi(n);return new Gi(t.path,s)}isEqual(t){return this===t}}class Qd extends Ld{constructor(t,e){super(t),this.Wc=e}_toFieldTransform(t){const e=new ji(t.N,Ri(t.N,this.Wc));return new Gi(t.path,e)}isEqual(t){return this===t}}function Wd(t,e,n,s){const r=t.jc(1,e,n);ef("Data must be an object, but it was:",r,s);const i=[],o=$r.empty();hr(s,((t,s)=>{const a=rf(e,t,n);s=g(s);const c=r.Lc(a);if(s instanceof Kd)i.push(a);else{const t=Jd(s,c);null!=t&&(i.push(a),o.set(a,t))}}));const a=new pr(i);return new Pd(o,a,r.fieldTransforms)}function Yd(t,e,n,s,r,i){const o=t.jc(1,e,n),a=[nf(e,s,n)],c=[r];if(i.length%2!=0)throw new zs(Hs.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let t=0;t<i.length;t+=2)a.push(nf(e,i[t])),c.push(i[t+1]);const u=[],h=$r.empty();for(let t=a.length-1;t>=0;--t)if(!af(u,a[t])){const e=a[t];let n=c[t];n=g(n);const s=o.Lc(e);if(n instanceof Kd)u.push(e);else{const t=Jd(n,s);null!=t&&(u.push(e),h.set(e,t))}}const l=new pr(u);return new Pd(h,l,o.fieldTransforms)}function Xd(t,e,n,s=!1){return Jd(n,t.jc(s?4:3,e))}function Jd(t,e){if(tf(t=g(t)))return ef("Unsupported field value:",e,t),Zd(t,e);if(t instanceof Ld)return function(t,e){if(!Vd(e.kc))throw e.Uc(`${t._methodName}() can only be used with update() and set()`);if(!e.path)throw e.Uc(`${t._methodName}() is not currently supported inside arrays`);const n=t._toFieldTransform(e);n&&e.fieldTransforms.push(n)}(t,e),null;if(void 0===t&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),t instanceof Array){if(e.settings.Fc&&4!==e.kc)throw e.Uc("Nested arrays are not supported");return function(t,e){const n=[];let s=0;for(const r of t){let t=Jd(r,e.Bc(s));null==t&&(t={nullValue:"NULL_VALUE"}),n.push(t),s++}return{arrayValue:{values:n}}}(t,e)}return function(t,e){if(null===(t=g(t)))return{nullValue:"NULL_VALUE"};if("number"==typeof t)return Ri(e.N,t);if("boolean"==typeof t)return{booleanValue:t};if("string"==typeof t)return{stringValue:t};if(t instanceof Date){const n=ar.fromDate(t);return{timestampValue:Bo(e.N,n)}}if(t instanceof ar){const n=new ar(t.seconds,1e3*Math.floor(t.nanoseconds/1e3));return{timestampValue:Bo(e.N,n)}}if(t instanceof Od)return{geoPointValue:{latitude:t.latitude,longitude:t.longitude}};if(t instanceof Rd)return{bytesValue:jo(e.N,t._byteString)};if(t instanceof nd){const n=e.databaseId,s=t.firestore._databaseId;if(!s.isEqual(n))throw e.Uc(`Document reference is for database ${s.projectId}/${s.database} but should be for database ${n.projectId}/${n.database}`);return{referenceValue:Go(t.firestore._databaseId||e.databaseId,t._key.path)}}throw e.Uc(`Unsupported field value: ${Yl(t)}`)}(t,e)}function Zd(t,e){const n={};return lr(t)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):hr(t,((t,s)=>{const r=Jd(s,e.Oc(t));null!=r&&(n[t]=r)})),{mapValue:{fields:n}}}function tf(t){return!("object"!=typeof t||null===t||t instanceof Array||t instanceof Date||t instanceof ar||t instanceof Od||t instanceof Rd||t instanceof nd||t instanceof Ld)}function ef(t,e,n){if(!tf(n)||!function(t){return"object"==typeof t&&null!==t&&(Object.getPrototypeOf(t)===Object.prototype||null===Object.getPrototypeOf(t))}(n)){const s=Yl(n);throw"an object"===s?e.Uc(t+" a custom object"):e.Uc(t+" "+s)}}function nf(t,e,n){if((e=g(e))instanceof Cd)return e._internalPath;if("string"==typeof e)return rf(t,e);throw of("Field path arguments must be of type string or FieldPath.",t,!1,void 0,n)}const sf=new RegExp("[~\\*/\\[\\]]");function rf(t,e,n){if(e.search(sf)>=0)throw of(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,t,!1,void 0,n);try{return new Cd(...e.split("."))._internalPath}catch(s){throw of(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,t,!1,void 0,n)}}function of(t,e,n,s,r){const i=s&&!s.isEmpty(),o=void 0!==r;let a=`Function ${e}() called with invalid data`;n&&(a+=" (via `toFirestore()`)"),a+=". ";let c="";return(i||o)&&(c+=" (found",i&&(c+=` in field ${s}`),o&&(c+=` in document ${r}`),c+=")"),new zs(Hs.INVALID_ARGUMENT,a+t+c)}function af(t,e){return t.some((t=>t.isEqual(e)))}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cf{constructor(t,e,n,s,r){this._firestore=t,this._userDataWriter=e,this._key=n,this._document=s,this._converter=r}get id(){return this._key.path.lastSegment()}get ref(){return new nd(this._firestore,this._converter,this._key)}exists(){return null!==this._document}data(){if(this._document){if(this._converter){const t=new uf(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(t)}return this._userDataWriter.convertValue(this._document.data.value)}}get(t){if(this._document){const e=this._document.data.field(hf("DocumentSnapshot.get",t));if(null!==e)return this._userDataWriter.convertValue(e)}}}class uf extends cf{data(){return super.data()}}function hf(t,e){return"string"==typeof e?rf(t,e):e instanceof Cd?e._internalPath:e._delegate._internalPath}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lf{constructor(t,e){this.hasPendingWrites=t,this.fromCache=e}isEqual(t){return this.hasPendingWrites===t.hasPendingWrites&&this.fromCache===t.fromCache}}class df extends cf{constructor(t,e,n,s,r,i){super(t,e,n,s,i),this._firestore=t,this._firestoreImpl=t,this.metadata=r}exists(){return super.exists()}data(t={}){if(this._document){if(this._converter){const e=new ff(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(e,t)}return this._userDataWriter.convertValue(this._document.data.value,t.serverTimestamps)}}get(t,e={}){if(this._document){const n=this._document.data.field(hf("DocumentSnapshot.get",t));if(null!==n)return this._userDataWriter.convertValue(n,e.serverTimestamps)}}}class ff extends df{data(t={}){return super.data(t)}}class gf{constructor(t,e,n,s){this._firestore=t,this._userDataWriter=e,this._snapshot=s,this.metadata=new lf(s.hasPendingWrites,s.fromCache),this.query=n}get docs(){const t=[];return this.forEach((e=>t.push(e))),t}get size(){return this._snapshot.docs.size}get empty(){return 0===this.size}forEach(t,e){this._snapshot.docs.forEach((n=>{t.call(e,new ff(this._firestore,this._userDataWriter,n.key,n,new lf(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))}))}docChanges(t={}){const e=!!t.includeMetadataChanges;if(e&&this._snapshot.excludesMetadataChanges)throw new zs(Hs.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===e||(this._cachedChanges=function(t,e){if(t._snapshot.oldDocs.isEmpty()){let e=0;return t._snapshot.docChanges.map((n=>({type:"added",doc:new ff(t._firestore,t._userDataWriter,n.doc.key,n.doc,new lf(t._snapshot.mutatedKeys.has(n.doc.key),t._snapshot.fromCache),t.query.converter),oldIndex:-1,newIndex:e++})))}{let n=t._snapshot.oldDocs;return t._snapshot.docChanges.filter((t=>e||3!==t.type)).map((e=>{const s=new ff(t._firestore,t._userDataWriter,e.doc.key,e.doc,new lf(t._snapshot.mutatedKeys.has(e.doc.key),t._snapshot.fromCache),t.query.converter);let r=-1,i=-1;return 0!==e.type&&(r=n.indexOf(e.doc.key),n=n.delete(e.doc.key)),1!==e.type&&(n=n.add(e.doc),i=n.indexOf(e.doc.key)),{type:mf(e.type),doc:s,oldIndex:r,newIndex:i}}))}}(this,e),this._cachedChangesIncludeMetadataChanges=e),this._cachedChanges}}function mf(t){switch(t){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return js()}}function pf(t,e){return t instanceof df&&e instanceof df?t._firestore===e._firestore&&t._key.isEqual(e._key)&&(null===t._document?null===e._document:t._document.isEqual(e._document))&&t._converter===e._converter:t instanceof gf&&e instanceof gf&&t._firestore===e._firestore&&ud(t.query,e.query)&&t.metadata.isEqual(e.metadata)&&t._snapshot.isEqual(e._snapshot)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yf(t){if(yi(t)&&0===t.explicitOrderBy.length)throw new zs(Hs.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class wf{}function vf(t,...e){for(const n of e)t=n._apply(t);return t}class bf extends wf{constructor(t,e,n){super(),this.Gc=t,this.zc=e,this.Hc=n,this.type="where"}_apply(t){const e=Bd(t.firestore),n=function(t,e,n,s,r,i,o){let a;if(r.isKeyField()){if("array-contains"===i||"array-contains-any"===i)throw new zs(Hs.INVALID_ARGUMENT,`Invalid Query. You can't perform '${i}' queries on FieldPath.documentId().`);if("in"===i||"not-in"===i){Mf(o,i);const e=[];for(const n of o)e.push(Of(s,t,n));a={arrayValue:{values:e}}}else a=Of(s,t,o)}else"in"!==i&&"not-in"!==i&&"array-contains-any"!==i||Mf(o,i),a=Xd(n,"where",o,"in"===i||"not-in"===i);const c=Jr.create(r,i,a);return function(t,e){if(e.v()){const n=vi(t);if(null!==n&&!n.isEqual(e.field))throw new zs(Hs.INVALID_ARGUMENT,`Invalid query. All where filters with an inequality (<, <=, !=, not-in, >, or >=) must be on the same field. But you have inequality filters on '${n.toString()}' and '${e.field.toString()}'`);const s=wi(t);null!==s&&Ff(t,e.field,s)}const n=function(t,e){for(const n of t.filters)if(e.indexOf(n.op)>=0)return n.op;return null}(t,function(t){switch(t){case"!=":return["!=","not-in"];case"array-contains":return["array-contains","array-contains-any","not-in"];case"in":return["array-contains-any","in","not-in"];case"array-contains-any":return["array-contains","array-contains-any","in","not-in"];case"not-in":return["array-contains","array-contains-any","in","not-in","!="];default:return[]}}(e.op));if(null!==n)throw n===e.op?new zs(Hs.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new zs(Hs.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${n.toString()}' filters.`)}(t,c),c}(t._query,0,e,t.firestore._databaseId,this.Gc,this.zc,this.Hc);return new sd(t.firestore,t.converter,function(t,e){const n=t.filters.concat([e]);return new fi(t.path,t.collectionGroup,t.explicitOrderBy.slice(),n,t.limit,t.limitType,t.startAt,t.endAt)}(t._query,n))}}function Ef(t,e,n){const s=e,r=hf("where",t);return new bf(r,s,n)}class Tf extends wf{constructor(t,e){super(),this.Gc=t,this.Jc=e,this.type="orderBy"}_apply(t){const e=function(t,e,n){if(null!==t.startAt)throw new zs(Hs.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(null!==t.endAt)throw new zs(Hs.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");const s=new ui(e,n);return function(t,e){if(null===wi(t)){const n=vi(t);null!==n&&Ff(t,n,e.field)}}(t,s),s}(t._query,this.Gc,this.Jc);return new sd(t.firestore,t.converter,function(t,e){const n=t.explicitOrderBy.concat([e]);return new fi(t.path,t.collectionGroup,n,t.filters.slice(),t.limit,t.limitType,t.startAt,t.endAt)}(t._query,e))}}function If(t,e="asc"){const n=e,s=hf("orderBy",t);return new Tf(s,n)}class Sf extends wf{constructor(t,e,n){super(),this.type=t,this.Yc=e,this.Xc=n}_apply(t){return new sd(t.firestore,t.converter,Ii(t._query,this.Yc,this.Xc))}}function _f(t){return Jl("limit",t),new Sf("limit",t,"F")}function Nf(t){return Jl("limitToLast",t),new Sf("limitToLast",t,"L")}class Af extends wf{constructor(t,e,n){super(),this.type=t,this.Zc=e,this.ta=n}_apply(t){const e=Lf(t,this.type,this.Zc,this.ta);return new sd(t.firestore,t.converter,function(t,e){return new fi(t.path,t.collectionGroup,t.explicitOrderBy.slice(),t.filters.slice(),t.limit,t.limitType,e,t.endAt)}(t._query,e))}}function Df(...t){return new Af("startAt",t,!0)}function xf(...t){return new Af("startAfter",t,!1)}class Cf extends wf{constructor(t,e,n){super(),this.type=t,this.Zc=e,this.ta=n}_apply(t){const e=Lf(t,this.type,this.Zc,this.ta);return new sd(t.firestore,t.converter,function(t,e){return new fi(t.path,t.collectionGroup,t.explicitOrderBy.slice(),t.filters.slice(),t.limit,t.limitType,t.startAt,e)}(t._query,e))}}function kf(...t){return new Cf("endBefore",t,!0)}function Rf(...t){return new Cf("endAt",t,!1)}function Lf(t,e,n,s){if(n[0]=g(n[0]),n[0]instanceof cf)return function(t,e,n,s,r){if(!s)throw new zs(Hs.NOT_FOUND,`Can't use a DocumentSnapshot that doesn't exist for ${n}().`);const i=[];for(const n of Ei(t))if(n.field.isKeyField())i.push(Pr(e,s.key));else{const t=s.data.field(n.field);if(Ir(t))throw new zs(Hs.INVALID_ARGUMENT,'Invalid query. You are trying to start or end a query using a document for which the field "'+n.field+'" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');if(null===t){const t=n.field.canonicalString();throw new zs(Hs.INVALID_ARGUMENT,`Invalid query. You are trying to start or end a query using a document for which the field '${t}' (used as the orderBy) does not exist.`)}i.push(t)}return new ai(i,r)}(t._query,t.firestore._databaseId,e,n[0]._document,s);{const r=Bd(t.firestore);return function(t,e,n,s,r,i){const o=t.explicitOrderBy;if(r.length>o.length)throw new zs(Hs.INVALID_ARGUMENT,`Too many arguments provided to ${s}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);const a=[];for(let i=0;i<r.length;i++){const c=r[i];if(o[i].field.isKeyField()){if("string"!=typeof c)throw new zs(Hs.INVALID_ARGUMENT,`Invalid query. Expected a string for document ID in ${s}(), but got a ${typeof c}`);if(!bi(t)&&-1!==c.indexOf("/"))throw new zs(Hs.INVALID_ARGUMENT,`Invalid query. When querying a collection and ordering by FieldPath.documentId(), the value passed to ${s}() must be a plain document ID, but '${c}' contains a slash.`);const n=t.path.child(fr.fromString(c));if(!xr.isDocumentKey(n))throw new zs(Hs.INVALID_ARGUMENT,`Invalid query. When querying a collection group and ordering by FieldPath.documentId(), the value passed to ${s}() must result in a valid document path, but '${n}' is not because it contains an odd number of segments.`);const r=new xr(n);a.push(Pr(e,r))}else{const t=Xd(n,s,c);a.push(t)}}return new ai(a,i)}(t._query,t.firestore._databaseId,r,e,n,s)}}function Of(t,e,n){if("string"==typeof(n=g(n))){if(""===n)throw new zs(Hs.INVALID_ARGUMENT,"Invalid query. When querying with FieldPath.documentId(), you must provide a valid document ID, but it was an empty string.");if(!bi(e)&&-1!==n.indexOf("/"))throw new zs(Hs.INVALID_ARGUMENT,`Invalid query. When querying a collection by FieldPath.documentId(), you must provide a plain document ID, but '${n}' contains a '/' character.`);const s=e.path.child(fr.fromString(n));if(!xr.isDocumentKey(s))throw new zs(Hs.INVALID_ARGUMENT,`Invalid query. When querying a collection group by FieldPath.documentId(), the value provided must result in a valid document path, but '${s}' is not because it has an odd number of segments (${s.length}).`);return Pr(t,new xr(s))}if(n instanceof nd)return Pr(t,n._key);throw new zs(Hs.INVALID_ARGUMENT,`Invalid query. When querying with FieldPath.documentId(), you must provide a valid string or a DocumentReference, but it was: ${Yl(n)}.`)}function Mf(t,e){if(!Array.isArray(t)||0===t.length)throw new zs(Hs.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`);if(t.length>10)throw new zs(Hs.INVALID_ARGUMENT,`Invalid Query. '${e.toString()}' filters support a maximum of 10 elements in the value array.`)}function Ff(t,e,n){if(!n.isEqual(e))throw new zs(Hs.INVALID_ARGUMENT,`Invalid query. You have a where filter with an inequality (<, <=, !=, not-in, >, or >=) on field '${e.toString()}' and so you must also use '${e.toString()}' as your first argument to orderBy(), but your first orderBy() is on field '${n.toString()}' instead.`)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pf{convertValue(t,e="none"){switch(Cr(t)){case 0:return null;case 1:return t.booleanValue;case 2:return Er(t.integerValue||t.doubleValue);case 3:return this.convertTimestamp(t.timestampValue);case 4:return this.convertServerTimestamp(t,e);case 5:return t.stringValue;case 6:return this.convertBytes(Tr(t.bytesValue));case 7:return this.convertReference(t.referenceValue);case 8:return this.convertGeoPoint(t.geoPointValue);case 9:return this.convertArray(t.arrayValue,e);case 10:return this.convertObject(t.mapValue,e);default:throw js()}}convertObject(t,e){const n={};return hr(t.fields,((t,s)=>{n[t]=this.convertValue(s,e)})),n}convertGeoPoint(t){return new Od(Er(t.latitude),Er(t.longitude))}convertArray(t,e){return(t.values||[]).map((t=>this.convertValue(t,e)))}convertServerTimestamp(t,e){switch(e){case"previous":const n=Sr(t);return null==n?null:this.convertValue(n,e);case"estimate":return this.convertTimestamp(_r(t));default:return null}}convertTimestamp(t){const e=br(t);return new ar(e.seconds,e.nanos)}convertDocumentKey(t,e){const n=fr.fromString(t);Ks(pa(n));const s=new $l(n.get(1),n.get(3)),r=new xr(n.popFirst(5));return s.isEqual(e)||Us(`Document ${r} contains a document reference within a different database (${s.projectId}/${s.database}) which is not supported. It will be treated as a reference in the current database (${e.projectId}/${e.database}) instead.`),r}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Vf(t,e,n){let s;return s=t?n&&(n.merge||n.mergeFields)?t.toFirestore(e,n):t.toFirestore(e):e,s}class Uf extends Pf{constructor(t){super(),this.firestore=t}convertBytes(t){return new Rd(t)}convertReference(t){const e=this.convertDocumentKey(t,this.firestore._databaseId);return new nd(this.firestore,null,e)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qf{constructor(t,e){this._firestore=t,this._commitHandler=e,this._mutations=[],this._committed=!1,this._dataReader=Bd(t)}set(t,e,n){this._verifyNotCommitted();const s=Bf(t,this._firestore),r=Vf(s.converter,e,n),i=jd(this._dataReader,"WriteBatch.set",s._key,r,null!==s.converter,n);return this._mutations.push(i.toMutation(s._key,zi.none())),this}update(t,e,n,...s){this._verifyNotCommitted();const r=Bf(t,this._firestore);let i;return i="string"==typeof(e=g(e))||e instanceof Cd?Yd(this._dataReader,"WriteBatch.update",r._key,e,n,s):Wd(this._dataReader,"WriteBatch.update",r._key,e),this._mutations.push(i.toMutation(r._key,zi.exists(!0))),this}delete(t){this._verifyNotCommitted();const e=Bf(t,this._firestore);return this._mutations=this._mutations.concat(new oo(e._key,zi.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new zs(Hs.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}}function Bf(t,e){if((t=g(t)).firestore!==e)throw new zs(Hs.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return t}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function jf(t){t=Xl(t,nd);const e=Xl(t.firestore,gd);return ql(yd(e),t._key).then((n=>ng(e,t,n)))}class Kf extends Pf{constructor(t){super(),this.firestore=t}convertBytes(t){return new Rd(t)}convertReference(t){const e=this.convertDocumentKey(t,this.firestore._databaseId);return new nd(this.firestore,null,e)}}function $f(t){t=Xl(t,nd);const e=Xl(t.firestore,gd),n=yd(e),s=new Kf(e);return function(t,e){const n=new Qs;return t.asyncQueue.enqueueAndForget((async()=>async function(t,e,n){try{const s=await function(t,e){const n=Gs(t);return n.persistence.runTransaction("read document","readonly",(t=>n.Qn.An(t,e)))}(t,e);s.isFoundDocument()?n.resolve(s):s.isNoDocument()?n.resolve(null):n.reject(new zs(Hs.UNAVAILABLE,"Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)"))}catch(t){const s=_h(t,`Failed to get document '${e} from cache`);n.reject(s)}}(await Fl(t),e,n))),n.promise}(n,t._key).then((n=>new df(e,s,t._key,n,new lf(null!==n&&n.hasLocalMutations,!0),t.converter)))}function Gf(t){t=Xl(t,nd);const e=Xl(t.firestore,gd);return ql(yd(e),t._key,{source:"server"}).then((n=>ng(e,t,n)))}function Hf(t){t=Xl(t,sd);const e=Xl(t.firestore,gd),n=yd(e),s=new Kf(e);return yf(t._query),Bl(n,t._query).then((n=>new gf(e,s,t,n)))}function zf(t){t=Xl(t,sd);const e=Xl(t.firestore,gd),n=yd(e),s=new Kf(e);return function(t,e){const n=new Qs;return t.asyncQueue.enqueueAndForget((async()=>async function(t,e,n){try{const s=await du(t,e,!0),r=new Kh(e,s.Gn),i=r.bo(s.documents),o=r.applyChanges(i,!1);n.resolve(o.snapshot)}catch(t){const s=_h(t,`Failed to execute query '${e} against cache`);n.reject(s)}}(await Fl(t),e,n))),n.promise}(n,t._query).then((n=>new gf(e,s,t,n)))}function Qf(t){t=Xl(t,sd);const e=Xl(t.firestore,gd),n=yd(e),s=new Kf(e);return Bl(n,t._query,{source:"server"}).then((n=>new gf(e,s,t,n)))}function Wf(t,e,n){t=Xl(t,nd);const s=Xl(t.firestore,gd),r=Vf(t.converter,e,n);return eg(s,[jd(Bd(s),"setDoc",t._key,r,null!==t.converter,n).toMutation(t._key,zi.none())])}function Yf(t,e,n,...s){t=Xl(t,nd);const r=Xl(t.firestore,gd),i=Bd(r);let o;return o="string"==typeof(e=g(e))||e instanceof Cd?Yd(i,"updateDoc",t._key,e,n,s):Wd(i,"updateDoc",t._key,e),eg(r,[o.toMutation(t._key,zi.exists(!0))])}function Xf(t){return eg(Xl(t.firestore,gd),[new oo(t._key,zi.none())])}function Jf(t,e){const n=Xl(t.firestore,gd),s=ad(t),r=Vf(t.converter,e);return eg(n,[jd(Bd(t.firestore),"addDoc",s._key,r,null!==t.converter,{}).toMutation(s._key,zi.exists(!1))]).then((()=>s))}function Zf(t,...e){var n,s,r;t=g(t);let i={includeMetadataChanges:!1},o=0;"object"!=typeof e[o]||ld(e[o])||(i=e[o],o++);const a={includeMetadataChanges:i.includeMetadataChanges};if(ld(e[o])){const t=e[o];e[o]=null===(n=t.next)||void 0===n?void 0:n.bind(t),e[o+1]=null===(s=t.error)||void 0===s?void 0:s.bind(t),e[o+2]=null===(r=t.complete)||void 0===r?void 0:r.bind(t)}let c,u,h;if(t instanceof nd)u=Xl(t.firestore,gd),h=mi(t._key.path),c={next:n=>{e[o]&&e[o](ng(u,t,n))},error:e[o+1],complete:e[o+2]};else{const n=Xl(t,sd);u=Xl(n.firestore,gd),h=n._query;const s=new Kf(u);c={next:t=>{e[o]&&e[o](new gf(u,s,n,t))},error:e[o+1],complete:e[o+2]},yf(t._query)}return function(t,e,n,s){const r=new Nl(s),i=new Fh(e,r,n);return t.asyncQueue.enqueueAndForget((async()=>kh(await Ul(t),i))),()=>{r.ec(),t.asyncQueue.enqueueAndForget((async()=>Rh(await Ul(t),i)))}}(yd(u),h,a,c)}function tg(t,e){return function(t,e){const n=new Nl(e);return t.asyncQueue.enqueueAndForget((async()=>function(t,e){Gs(t).so.add(e),e.next()}(await Ul(t),n))),()=>{n.ec(),t.asyncQueue.enqueueAndForget((async()=>function(t,e){Gs(t).so.delete(e)}(await Ul(t),n)))}}(yd(t=Xl(t,gd)),ld(e)?e:{next:e})}function eg(t,e){return function(t,e){const n=new Qs;return t.asyncQueue.enqueueAndForget((async()=>async function(t,e,n){const s=bl(t);try{const t=await function(t,e){const n=Gs(t),s=ar.now(),r=e.reduce(((t,e)=>t.add(e.key)),No());let i;return n.persistence.runTransaction("Locally write mutations","readwrite",(t=>n.Qn.Pn(t,r).next((r=>{i=r;const o=[];for(const t of e){const e=Ji(t,i.get(t.key));null!=e&&o.push(new no(t.key,e,Gr(e.value.mapValue),zi.exists(!0)))}return n.In.addMutationBatch(t,s,o,e)})))).then((t=>(t.applyToLocalDocumentSet(i),{batchId:t.batchId,changes:i})))}(s.localStore,e);s.sharedClientState.addPendingMutation(t.batchId),function(t,e,n){let s=t.qo[t.currentUser.toKey()];s||(s=new go(rr)),s=s.insert(e,n),t.qo[t.currentUser.toKey()]=s}(s,t.batchId,n),await cl(s,t.changes),await dh(s.remoteStore)}catch(t){const e=_h(t,"Failed to persist write");n.reject(e)}}(await Vl(t),e,n))),n.promise}(yd(t),e)}function ng(t,e,n){const s=n.docs.get(e._key),r=new Kf(t);return new df(t,r,e._key,s,new lf(n.hasPendingWrites,n.fromCache),e.converter)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sg extends class{constructor(t,e){this._firestore=t,this._transaction=e,this._dataReader=Bd(t)}get(t){const e=Bf(t,this._firestore),n=new Uf(this._firestore);return this._transaction.lookup([e._key]).then((t=>{if(!t||1!==t.length)return js();const s=t[0];if(s.isFoundDocument())return new cf(this._firestore,n,s.key,s,e.converter);if(s.isNoDocument())return new cf(this._firestore,n,e._key,null,e.converter);throw js()}))}set(t,e,n){const s=Bf(t,this._firestore),r=Vf(s.converter,e,n),i=jd(this._dataReader,"Transaction.set",s._key,r,null!==s.converter,n);return this._transaction.set(s._key,i),this}update(t,e,n,...s){const r=Bf(t,this._firestore);let i;return i="string"==typeof(e=g(e))||e instanceof Cd?Yd(this._dataReader,"Transaction.update",r._key,e,n,s):Wd(this._dataReader,"Transaction.update",r._key,e),this._transaction.update(r._key,i),this}delete(t){const e=Bf(t,this._firestore);return this._transaction.delete(e._key),this}}{constructor(t,e){super(t,e),this._firestore=t}get(t){const e=Bf(t,this._firestore),n=new Kf(this._firestore);return super.get(t).then((t=>new df(this._firestore,n,e._key,t._document,new lf(!1,!1),e.converter)))}}function rg(t,e){return function(t,e){const n=new Qs;return t.asyncQueue.enqueueAndForget((async()=>{const s=await function(t){return Ol(t).then((t=>t.datastore))}(t);new xl(t.asyncQueue,s,e,n).run()})),n.promise}(yd(t=Xl(t,gd)),(n=>e(new sg(t,n))))}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ig(){return new Kd("deleteField")}function og(){return new Gd("serverTimestamp")}function ag(...t){return new Hd("arrayUnion",t)}function cg(...t){return new zd("arrayRemove",t)}function ug(t){return new Qd("increment",t)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hg(t){return yd(t=Xl(t,gd)),new qf(t,(e=>eg(t,e)))}!function(t,e=!0){!function(t){Os=t}(i.SDK_VERSION),i._registerComponent(new m("firestore",((t,{options:n})=>{const s=t.getProvider("app").getImmediate(),r=new gd(s,new Js(t.getProvider("auth-internal")));return n=Object.assign({useFetchStreams:e},n),r._setSettings(n),r}),"PUBLIC")),i.registerVersion(Rs,"3.2.1",t),i.registerVersion(Rs,"3.2.1","esm2017")}()}));
//# sourceMappingURL=firebase-firestore.e712daab.js.map
