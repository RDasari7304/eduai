interface Article {
    title: string;
    byline: string;
    dir: string;
    content: string;
    textContent: string;
    length: number;
    excerpt: string;
    siteName: string;
}

declare module '@mozilla/readability' {
    export class Readability {
        constructor(document: Document);
        parse(): Article | null;
    }    
}