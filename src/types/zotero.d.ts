/**
 * Zotero TaskFlow - Global Gecko / Zotero Runtime Type Declarations
 */

interface ZoteroTabEntry {
  id: string;
  type?: string;
  container?: HTMLElement & { querySelector: (s: string) => HTMLIFrameElement | null };
  data?: { itemID?: number | string };
}

interface ZoteroTabsAPI {
  _tabs?: ZoteroTabEntry[];
  selectedTab?: ZoteroTabEntry;
  add?: (opts: Record<string, unknown>) => ZoteroTabEntry | string;
  select?: (id: string) => void;
  close?: (id: string) => void;
  getTabContainer?: (id: string | ZoteroTabEntry) => HTMLElement | null;
  getTab?: (id: string) => ZoteroTabEntry | undefined;
}

interface ZoteroPaneAPI {
  itemsView?: { getSelectedItems?: () => unknown[] };
  getSelectedItems?: () => unknown[];
  selectItem?: (id: number | string) => Promise<void> | void;
  getRowForNode?: (node: unknown) => { ref?: { id?: number | string } | number | string } | null;
}

interface ZoteroItemConstructor {
  new (type: string): {
    id: number | string;
    key?: string;
    libraryID: number;
    parentID: number | string;
    setNote: (html: string) => void;
    addTag: (tag: string) => void;
    saveTx: () => Promise<unknown>;
  };
}

interface ZoteroProgressWindowInstance {
  changeHeadline: (headline: string) => void;
  addDescription: (description: string) => void;
  show: () => void;
  startCloseTimer: (timeout: number) => void;
}

interface ZoteroGlobal {
  DataDirectory?: { dir?: string };
  Prefs?: {
    get: (key: string, global?: boolean) => unknown;
    set: (key: string, val: unknown, global?: boolean) => void;
    registerObserver?: (key: string, handler: () => void, global?: boolean) => unknown;
    unregisterObserver?: (token: unknown) => void;
  };
  Libraries?: {
    userLibraryID?: number;
    get?: (id: unknown) => { groupID?: number } | undefined;
  };
  Groups?: {
    getLibraryIDFromGroupID?: (groupID: number) => number | undefined;
  };
  Items?: {
    get: (id: unknown) => any;
    getByLibraryAndKey?: (libraryID: number, key: string) => any;
  };
  Item?: ZoteroItemConstructor;
  Collections?: {
    get?: (id: unknown) => any;
    getByLibrary?: (libraryID: number) => any[];
  };
  Notifier?: {
    registerObserver?: (observer: { notify: (...args: any[]) => void }, types: string[], id: string) => unknown;
    unregisterObserver?: (id: unknown) => void;
  };
  Reader?: {
    registerEventListener?: (type: string, handler: (arg: any) => void, addonID: string) => void;
    unregisterEventListener?: (type: string, handler: (arg: any) => void) => void;
    getByTabID?: (id: string) => any;
    open?: (itemID: number | string, location?: Record<string, unknown>) => Promise<void>;
  };
  MenuManager?: {
    registerMenu?: (config: Record<string, unknown>) => unknown;
    unregisterMenu?: (id: unknown) => void;
  };
  ItemPaneManager?: {
    registerSection?: (config: Record<string, unknown>) => unknown;
    unregisterSection?: (id: unknown) => void;
  };
  ProgressWindow?: new (opts: { closeOnClick?: boolean }) => ZoteroProgressWindowInstance;
  Utilities?: {
    Internal?: {
      openPreferences?: (paneID: string) => void;
    };
  };
  getMainWindow?: () => (Window & Record<string, any>) | null;
  getActiveZoteroPane?: () => ZoteroPaneAPI | null;
  log?: (msg: string) => void;
  logError?: (msg: string) => void;
  TaskFlow?: any;
  Todolist?: any;
  TaskFlowItemPane?: any;
}

declare var Zotero: ZoteroGlobal;
declare var Services: {
  wm?: {
    getEnumerator: (type: string | null) => { hasMoreElements: () => boolean; getNext: () => any };
    getMostRecentWindow: (type: string) => (Window & Record<string, any>) | null;
    addListener: (listener: Record<string, unknown>) => void;
    removeListener: (listener: Record<string, unknown>) => void;
  };
  ww?: {
    openWindow: (parent: unknown, url: string, name: string, features: string, args: unknown) => any;
  };
};
declare var Ci: Record<string, any>;
declare var Cc: Record<string, { createInstance: (iface: unknown) => any; getService: (iface: unknown) => any }>;
declare var Cu: Record<string, any>;
declare var rootURI: string;
declare var version: string;
declare var addonId: string;
declare var PathUtils: { join: (...parts: string[]) => string; profileDir: string };
declare var IOUtils: {
  exists: (path: string) => Promise<boolean>;
  readUTF8: (path: string) => Promise<string>;
  writeUTF8: (path: string, content: string, opts?: { tmpPath?: string }) => Promise<void>;
};
declare var Zotero_Tabs: ZoteroTabsAPI | undefined;
declare var ChromeUtils: Record<string, any>;

interface Window {
  AbortController?: typeof AbortController;
  AbortSignal?: typeof AbortSignal;
  Zotero?: ZoteroGlobal;
  ZoteroPane?: ZoteroPaneAPI;
  Zotero_Tabs?: ZoteroTabsAPI;
  ZoteroBridge?: { handleHostNavigation?: (options: unknown) => void };
  TaskFlow_Preferences?: { init: (win: Window) => void };
  Todolist_Preferences?: { init: (win: Window) => void };
  __taskflowPrefObserverToken?: unknown;
  __taskflowPrefController?: AbortController;
  _todolistPending?: unknown;
  openPreferences?: (paneID: string) => void;
  openDialog?: (url: string, name: string, features: string) => void;
  MozXULElement?: { insertFTLIfNeeded: (ftl: string) => void };
}

interface Document {
  l10n?: { setAttributes?: (el: Element, id: string, args?: Record<string, unknown>) => void };
  popupNode?: Element | null;
  createXULElement?: (tag: string) => Element;
}
