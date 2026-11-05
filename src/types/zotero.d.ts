/**
 * Zotero TaskFlow - Global Gecko / Zotero Runtime Type Declarations
 */
declare let Zotero: any;
declare let Services: any;
declare let Components: any;
declare let Ci: any;
declare let Cc: any;
declare let Cu: any;
declare let rootURI: string;
declare let version: string;
declare let addonId: string;
declare let PathUtils: any;
declare let IOUtils: any;
declare let Zotero_Tabs: any;
declare let ChromeUtils: any;

interface Window {
  [key: string]: any;
}

interface HTMLElement {
  [key: string]: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
