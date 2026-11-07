/**
 * Zotero TaskFlow - Bootstrap Entry
 * Requires Zotero 10+ (Gecko bootstrap architecture)
 */

if (typeof Zotero === 'undefined') {
  var Zotero;
}

var chromeHandle;
var startupGeneration = 0;
var cancelZoteroWait;

async function waitForZotero() {
  if (typeof Zotero !== 'undefined') {
    await Zotero.initializationPromise;
    return;
  }

  const getZotero = (domWindow) => {
    try {
      return domWindow?.Zotero || domWindow?.wrappedJSObject?.Zotero;
    } catch (_) {
      return null;
    }
  };

  const useWindow = (domWindow) => {
    const z = getZotero(domWindow);
    if (!z) return false;
    Zotero = z;
    return true;
  };

  const pendingWindows = [];
  var windows = Services.wm.getEnumerator('navigator:browser');
  while (windows.hasMoreElements()) {
    const domWindow = windows.getNext();
    if (useWindow(domWindow)) {
      await Zotero.initializationPromise;
      return;
    }
    pendingWindows.push(domWindow);
  }

  await new Promise((resolve) => {
    let settled = false;
    const loads = new Map();
    const cleanup = () => {
      Services.wm.removeListener(listener);
      for (const [win, handler] of loads) {
        win.removeEventListener('load', handler, false);
      }
      loads.clear();
      cancelZoteroWait = null;
    };
    cancelZoteroWait = () => {
      settled = true;
      cleanup();
      resolve();
    };
    const finish = (domWindow) => {
      if (settled || !useWindow(domWindow)) return;
      settled = true;
      cleanup();
      resolve();
    };
    const attachLoad = (domWindow) => {
      if (settled || !domWindow?.addEventListener) return;
      const loadHandler = () => {
        domWindow.removeEventListener('load', loadHandler, false);
        finish(domWindow);
      };
      loads.set(domWindow, loadHandler);
      domWindow.addEventListener('load', loadHandler, false);
      finish(domWindow);
    };
    var listener = {
      onOpenWindow: function (aWindow) {
        let domWindow = aWindow
          .QueryInterface(Ci.nsIInterfaceRequestor)
          .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
        attachLoad(domWindow);
      },
    };
    pendingWindows.forEach(attachLoad);
    if (!settled) Services.wm.addListener(listener);
  });

  if (Zotero) await Zotero.initializationPromise;
}

function install(data, reason) {}

async function startup({ id, version, resourceURI, rootURI }, reason) {
  const generation = ++startupGeneration;
  try {
    await waitForZotero();
    if (generation !== startupGeneration) return;

    if (!rootURI) {
      rootURI = resourceURI.spec;
    }
    if (!rootURI.endsWith('/')) {
      rootURI += '/';
    }
    if (generation !== startupGeneration) return;

    var aomStartup = Cc['@mozilla.org/addons/addon-manager-startup;1'].getService(
      Ci.amIAddonManagerStartup
    );
    var manifestURI = Services.io.newURI(rootURI + 'manifest.json');
    chromeHandle = aomStartup.registerChrome(manifestURI, [
      ['content', 'taskflow', rootURI + 'chrome/content/'],
      ['locale', 'taskflow', 'en-US', rootURI + 'locale/en-US/'],
      ['locale', 'taskflow', 'zh-CN', rootURI + 'locale/zh-CN/'],
    ]);

    const mainWindow = Zotero?.getMainWindow?.();
    const ctx = {
      rootURI,
      addonId: id,
      version,
      Zotero,
      Services,
      Components,
      Cc: typeof Cc !== 'undefined' ? Cc : Components?.classes,
      Ci: typeof Ci !== 'undefined' ? Ci : Components?.interfaces,
      ChromeUtils: typeof ChromeUtils !== 'undefined' ? ChromeUtils : mainWindow?.ChromeUtils,
      IOUtils: typeof IOUtils !== 'undefined' ? IOUtils : mainWindow?.IOUtils,
      PathUtils: typeof PathUtils !== 'undefined' ? PathUtils : mainWindow?.PathUtils,
      fetch: typeof fetch !== 'undefined' ? fetch : mainWindow?.fetch?.bind(mainWindow),
      setTimeout: typeof setTimeout !== 'undefined' ? setTimeout : mainWindow?.setTimeout?.bind(mainWindow),
      clearTimeout: typeof clearTimeout !== 'undefined' ? clearTimeout : mainWindow?.clearTimeout?.bind(mainWindow),
    };
    ctx._globalThis = ctx;

    Services.scriptloader.loadSubScript(`${rootURI}chrome/content/js/taskRules.js`, ctx);
    Services.scriptloader.loadSubScript(`${rootURI}chrome/content/js/literatureWorkflow.js`, ctx);
    Services.scriptloader.loadSubScript(`${rootURI}chrome/content/scripts/itemPane.js`, ctx);
    Services.scriptloader.loadSubScript(`${rootURI}chrome/content/scripts/index.js`, ctx);
  } catch (error) {
    Zotero?.logError?.('Failed to startup TaskFlow addon: ' + error);
    if (generation === startupGeneration && chromeHandle) {
      try {
        chromeHandle.destruct();
      } catch (cleanupError) {
        Zotero?.logError?.('Failed to release TaskFlow chrome handle: ' + cleanupError);
      } finally {
        chromeHandle = null;
      }
    }
  }
}

async function shutdown({ id, version, resourceURI, rootURI }, reason) {
  ++startupGeneration;
  cancelZoteroWait?.();
  if (reason === APP_SHUTDOWN) {
    return;
  }
  try {
    if (reason === ADDON_DISABLE) {
      Services.obs.notifyObservers(null, 'startupcache-invalidate', null);
    }
    if (typeof Zotero === 'undefined') {
      Zotero = Cc['@zotero.org/Zotero;1'].getService(
        Ci.nsISupports
      ).wrappedJSObject;
    }
    await Zotero?.TaskFlow?.shutdown?.();
  } catch (error) {
    Zotero?.logError?.('Error during TaskFlow shutdown: ' + error);
  }
  if (chromeHandle) {
    try {
      chromeHandle.destruct();
    } catch (error) {
      Zotero?.logError?.('Failed to release TaskFlow chrome: ' + error);
    } finally {
      chromeHandle = null;
    }
  }
}

function uninstall(data, reason) {}
