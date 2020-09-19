/**
 * 该页脚本主要为劫持websql、indexedDB、localStorage
 * 监听clipboard的获取粘贴值事件。
 */
var injectStart = function() {
  //劫持openDataBase
  const openDb = openDatabase;
  openDatabase = (...args) => {
    window.top.postMessage({
      msgType: "openDatabase",
      msgData: ""
    }, '*');
    return openDb(...args);
  }

  //劫持indexedDB中的add和put。
  ["add", "put"].forEach(func => {
    const oldFunc = IDBObjectStore.prototype[func];
    IDBObjectStore.prototype[func] = function() {
      window.top.postMessage({
        msgType: "indexedDB",
        msgData: {
          idb: arguments[0],
        }
      }, '*');
      return oldFunc.apply(this, arguments);
    }
  });

  //劫持localStorage.setItem
  const lsSetItem = localStorage.__proto__.setItem;
  localStorage.__proto__.setItem = function(keyName, keyValue) {
    // console.log(keyValue);
    window.top.postMessage({
      msgType: "setlocalStorage",
      msgData: {
        ls: {
          keyValue
        },
      }
    }, '*');
    return lsSetItem.apply(this, arguments);
  }

  //劫持clipboard的粘贴事件，但是不劫持drop的事件（通过uninitialized，两者都用DataTransfer）
  const dcGetData = DataTransfer.prototype.getData;
  DataTransfer.prototype.getData = function() {
    if (this.effectAllowed == "uninitialized") {
      window.top.postMessage({
        msgType: "getClipboard",
        msgData: ""
      }, '*');
    }
    return dcGetData.apply(this, arguments);
  };

  //劫持webkitRequestFileSystem
  [
    "requestFileSystem",
    "webkitRequestFileSystem",
    "resolveLocalFileSystemURL",
    "webkitResolveLocalFileSystemURL"
  ].forEach(func => {
    if (window[func]) {
      const oldFunc = window[func];
      window[func] = function() {
        window.top.postMessage({
          msgType: "requestFileSystem",
          msgData: {
            funcName: func,
          }
        }, '*');
        return oldFunc.apply(this, arguments);
      };
    }
  });

  document.documentElement.dataset.odbscriptallow = true;
};


var scriptStart_1 = document.createElement('script');
scriptStart_1.textContent = "(" + injectStart + ")()";
document.documentElement.appendChild(scriptStart_1);

if (!document.documentElement.dataset.odbscriptallow) {
  var scriptStart_2 = document.createElement('script');
  scriptStart_2.textContent = `{
    const iframes = window.top.document.querySelectorAll("iframe[sandbox]");
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow) {
        if (iframes[i].contentWindow.openDatabase) {
          iframes[i].contentWindow.openDatabase = openDatabase;
        }
        if (iframes[i].contentWindow.indexedDB) {
          iframes[i].contentWindow.indexedDB.__proto__.open = indexedDB.__proto__.open;
        }  
      }
    }
  }`;
  window.top.document.documentElement.appendChild(scriptStart_2);
}