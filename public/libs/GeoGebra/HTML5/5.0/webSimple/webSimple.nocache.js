function webSimple(){var H='bootstrap',I='begin',J='gwt.codesvr.webSimple=',K='gwt.codesvr=',L='webSimple',M='startup',N='DUMMY',O=0,P=1,Q='iframe',R='position:absolute; width:0; height:0; border:none; left: -1000px;',S=' top: -1000px;',T='Chrome',U='CSS1Compat',V='<!doctype html>',W='',X='<html><head><\/head><body><\/body><\/html>',Y='undefined',Z='readystatechange',$=10,_='script',ab='javascript',bb='Failed to load ',cb='moduleStartup',db='scriptTagAdded',eb='moduleRequested',fb='meta',gb='name',hb='webSimple::',ib='::',jb='gwt:property',kb='content',lb='=',mb='gwt:onPropertyErrorFn',nb='Bad handler "',ob='" for "gwt:onPropertyErrorFn"',pb='gwt:onLoadErrorFn',qb='" for "gwt:onLoadErrorFn"',rb='#',sb='?',tb='/',ub='img',vb='clear.cache.gif',wb='baseUrl',xb='webSimple.nocache.js',yb='base',zb='//',Ab='selectingPermutation',Bb='webSimple.devmode.js',Cb='CF03DB06D8ED6C26A2946DC96C813271',Db=':',Eb='.cache.js',Fb='loadExternalRefs',Gb='end';var n=window;var o=document;q(H,I);function p(){var a=n.location.search;return a.indexOf(J)!=-1||a.indexOf(K)!=-1}
function q(a,b){if(n.__gwtStatsEvent){n.__gwtStatsEvent({moduleName:L,sessionId:n.__gwtStatsSessionId,subSystem:M,evtGroup:a,millis:(new Date).getTime(),type:b})}}
webSimple.__sendStats=q;webSimple.__moduleName=L;webSimple.__errFn=null;webSimple.__moduleBase=N;webSimple.__softPermutationId=O;webSimple.__computePropValue=null;webSimple.__getPropMap=null;webSimple.__installRunAsyncCode=function(){};webSimple.__gwtStartLoadingFragment=function(){return null};webSimple.__gwt_isKnownPropertyValue=function(){return false};webSimple.__gwt_getMetaProperty=function(){return null};var r=null;var s=n.__gwt_activeModules=n.__gwt_activeModules||{};s[L]={moduleName:L};webSimple.__moduleStartupDone=function(e){var f=s[L].bindings;s[L].bindings=function(){var a=f?f():{};var b=e[webSimple.__softPermutationId];for(var c=O;c<b.length;c++){var d=b[c];a[d[O]]=d[P]}return a}};var t;function u(){v();return t}
function v(){if(t){return}var a=o.createElement(Q);a.id=L;a.style.cssText=R+S;a.tabIndex=-1;o.body.appendChild(a);t=a.contentWindow.document;if(navigator.userAgent.indexOf(T)==-1){t.open();var b=document.compatMode==U?V:W;t.write(b+X);t.close()}}
function w(f){function g(a){function b(){if(typeof o.readyState==Y){return typeof o.body!=Y&&o.body!=null}return /loaded|complete/.test(o.readyState)}
var c=b();if(c){a();return}function d(){if(!c){if(!b()){return}c=true;a();if(o.removeEventListener){o.removeEventListener(Z,d,false)}if(e){clearInterval(e)}}}
if(o.addEventListener){o.addEventListener(Z,d,false)}var e=setInterval(function(){d()},$)}
function h(a){var b=u();var c=b.body;var d=b.createElement(_);d.language=ab;if(location.host){d.crossOrigin=W}d.src=a;if(webSimple.__errFn){d.onerror=function(){webSimple.__errFn(L,new Error(bb+a))}}c.appendChild(d);q(cb,db)}
q(cb,eb);g(function(){h(f)})}
webSimple.__startLoadingFragment=function(a){return C(a)};webSimple.__installRunAsyncCode=function(a){var b=u();var c=b.body;var d=b.createElement(_);d.language=ab;d.text=a;c.appendChild(d);c.removeChild(d)};function A(){var c={};var d;var e;var f=o.getElementsByTagName(fb);for(var g=O,h=f.length;g<h;++g){var i=f[g],j=i.getAttribute(gb),k;if(j){j=j.replace(hb,W);if(j.indexOf(ib)>=O){continue}if(j==jb){k=i.getAttribute(kb);if(k){var l,m=k.indexOf(lb);if(m>=O){j=k.substring(O,m);l=k.substring(m+P)}else{j=k;l=W}c[j]=l}}else if(j==mb){k=i.getAttribute(kb);if(k){try{d=eval(k)}catch(a){alert(nb+k+ob)}}}else if(j==pb){k=i.getAttribute(kb);if(k){try{e=eval(k)}catch(a){alert(nb+k+qb)}}}}}__gwt_getMetaProperty=function(a){var b=c[a];return b==null?null:b};r=d;webSimple.__errFn=e}
function B(){function e(a){var b=a.lastIndexOf(rb);if(b==-1){b=a.length}var c=a.indexOf(sb);if(c==-1){c=a.length}var d=a.lastIndexOf(tb,Math.min(c,b));return d>=O?a.substring(O,d+P):W}
function f(a){if(a.match(/^\w+:\/\//)){}else{var b=o.createElement(ub);b.src=a+vb;a=e(b.src)}return a}
function g(){var a=__gwt_getMetaProperty(wb);if(a!=null){return a}return W}
function h(){var a=o.getElementsByTagName(_);for(var b=O;b<a.length;++b){if(a[b].src.indexOf(xb)!=-1){return e(a[b].src)}}return W}
function i(){var a=o.getElementsByTagName(yb);if(a.length>O){return a[a.length-P].href}return W}
function j(){var a=o.location;return a.href==a.protocol+zb+a.host+a.pathname+a.search+a.hash}
var k=g();if(k==W){k=h()}if(k==W){k=i()}if(k==W&&j()){k=e(o.location.href)}k=f(k);return k}
function C(a){if(a.match(/^\//)){return a}if(a.match(/^[a-zA-Z]+:\/\//)){return a}return webSimple.__moduleBase+a}
function D(){var f=[];var g=O;var h=[];var i=[];function j(a){var b=i[a](),c=h[a];if(b in c){return b}var d=[];for(var e in c){d[c[e]]=e}if(r){r(a,d,b)}throw null}
__gwt_isKnownPropertyValue=function(a,b){return b in h[a]};webSimple.__getPropMap=function(){var a={};for(var b in h){if(h.hasOwnProperty(b)){a[b]=j(b)}}return a};webSimple.__computePropValue=j;n.__gwt_activeModules[L].bindings=webSimple.__getPropMap;q(H,Ab);if(p()){return C(Bb)}var k;try{k=Cb;var l=k.indexOf(Db);if(l!=-1){g=parseInt(k.substring(l+P),$);k=k.substring(O,l)}}catch(a){}webSimple.__softPermutationId=g;return C(k+Eb)}
function F(){if(!n.__gwt_stylesLoaded){n.__gwt_stylesLoaded={}}q(Fb,I);q(Fb,Gb)}
A();webSimple.__moduleBase=B();s[L].moduleBase=webSimple.__moduleBase;var G=D();F();q(H,Gb);w(G);return true}
webSimple.succeeded=webSimple();