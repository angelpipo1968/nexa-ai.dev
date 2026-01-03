declare module 'pdfjs-dist/build/pdf' {
    export const GlobalWorkerOptions: {
        workerSrc: string;
    };
    export const version: string;
    export function getDocument(src: any): any;
}
