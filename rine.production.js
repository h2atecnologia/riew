!function(n){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=n();else if("function"==typeof define&&define.amd)define([],n);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).rine=n()}}(function(){return function u(i,f,c){function l(e,n){if(!f[e]){if(!i[e]){var t="function"==typeof require&&require;if(!n&&t)return t(e,!0);if(a)return a(e,!0);var r=new Error("Cannot find module '"+e+"'");throw r.code="MODULE_NOT_FOUND",r}var o=f[e]={exports:{}};i[e][0].call(o.exports,function(n){return l(i[e][1][n]||n)},o,o.exports,u,i,f,c)}return f[e].exports}for(var a="function"==typeof require&&require,n=0;n<c.length;n++)l(c[n]);return l}({1:[function(n,e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default=function(n,e){var t=e.broadcast,r=!1,i=[],o=void 0,u=void 0,f=s();function c(o,e){var n=!(2<arguments.length&&void 0!==arguments[2])||arguments[2],u=[];i=i.filter(function(n){var e=n.type,t=n.done,r=n.once;return e!==o||(u.push(t),!r)}),u.forEach(function(n){return n(e)}),n&&t(o,e,f)}function l(e,n){if(!n)return new Promise(function(n){i.push({type:e,done:function(){r&&n.apply(void 0,arguments)},once:!0})});i.push({type:e,done:n,once:!0})}function a(n,e){i.push({type:n,done:e,once:!1})}function d(){return r}return{id:f,in:function(e,t){return r=!0,u=function(n){r&&e(o(n))},n({render:function(n){o="function"==typeof n?n:function(){return n},u(t)},take:l,takeEvery:a,put:c,isMounted:d})},update:function(n){u(n)},out:function(){r=!1,i=[]},put:c,system:function(){return{mounted:r,pending:i}}}};var r=0,s=function(){return"r"+ ++r}},{}],2:[function(t,n,r){(function(n){"use strict";Object.defineProperty(r,"__esModule",{value:!0}),r.System=void 0;var u=Object.assign||function(n){for(var e=1;e<arguments.length;e++){var t=arguments[e];for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r])}return n},f=function(n,e){if(Array.isArray(n))return n;if(Symbol.iterator in Object(n))return function(n,e){var t=[],r=!0,o=!1,u=void 0;try{for(var i,f=n[Symbol.iterator]();!(r=(i=f.next()).done)&&(t.push(i.value),!e||t.length!==e);r=!0);}catch(n){o=!0,u=n}finally{try{!r&&f.return&&f.return()}finally{if(o)throw u}}return t}(n,e);throw new TypeError("Invalid attempt to destructure non-iterable instance")};r.routine=y,r.partial=function(t,n){var r=function(){},o=n,e=y(function(n){var e=n.render;return(r=function(){return e(function(n){return i.default.createElement(t,u({},n,o))})})()});return e.displayName="RinePartial("+s(t)+")",e.set=function(n){o=n,r()},e.get=function(){return o},e};var c="undefined"!=typeof window?window.React:void 0!==n?n.React:null,i=e(c),l=e(t("./RoutineController"));function e(n){return n&&n.__esModule?n:{default:n}}var a=function(n){return n&&"function"==typeof n.next},d=function(n){return n&&"function"==typeof n.then},s=function(n){if(n.name)return n.name;var e=/^function\s+([\w\$]+)\s*\(/.exec(n.toString());return e?e[1]:"unknown"},p=r.System={controllers:{},addController:function(n){this.controllers[n.id]=n},removeController:function(n){delete this.controllers[n.id]},put:function(e,t,r){var o=this;Object.keys(this.controllers).forEach(function(n){n!==r&&o.controllers[n].put(e,t,!1)})},debug:function(){var t=this,n=Object.keys(this.controllers).reduce(function(n,e){return n=n.concat(t.controllers[e].system().pending)},[]);return{controllers:this.controllers,pending:n}}};function y(u){function n(e){var n=(0,c.useState)(null),t=f(n,2),r=t[0],o=t[1];return(0,c.useEffect)(function(){i&&i.update(e)},[e]),(0,c.useEffect)(function(){i=(0,l.default)(u,{broadcast:function(){p.put.apply(p,arguments)}}),p.addController(i);var n=i.in(o,e);return!n||d(n)||a(n)||o(n),function(){i.out(),p.removeController(i)}},[]),r}var i=void 0;return n.displayName="Rine("+s(u)+")",n}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{"./RoutineController":1}]},{},[2])(2)});