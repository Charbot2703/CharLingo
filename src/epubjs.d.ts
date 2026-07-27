declare module "epubjs" {
  const ePub: {
    (url: string | ArrayBuffer | Uint8Array, options?: any): Promise<any>;
    Book: any;
    Rendition: any;
    Contents: any;
    CFI: any;
    VERSION: string;
    utils: any;
    register: any;
    ViewManagers: any;
    Views: any;
  };
  export default ePub;
}
