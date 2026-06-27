declare module "html2pdf.js" {
    interface Html2PdfOptions {
        margin?: number | number[];
        filename?: string;
        image?: { type?: string; quality?: number };
        html2canvas?: { scale?: number; useCORS?: boolean; [key: string]: unknown };
        jsPDF?: {
            unit?: string;
            format?: string | number[];
            orientation?: "portrait" | "landscape";
            [key: string]: unknown;
        };
        pagebreak?: {
            mode?: string | string[];
            before?: string | string[];
            after?: string | string[];
            avoid?: string | string[];
        };
        [key: string]: unknown;
    }

    interface Html2PdfInstance {
        set(options: Html2PdfOptions): Html2PdfInstance;
        from(element: HTMLElement | string): Html2PdfInstance;
        save(): Promise<void>;
        output(type: string, options?: unknown): Promise<unknown>;
        toPdf(): Html2PdfInstance;
        toCanvas(): Html2PdfInstance;
        toImg(): Html2PdfInstance;
        outputImg(type?: string): Html2PdfInstance;
    }

    interface Html2PdfFunction {
        (): Html2PdfInstance;
        (element: HTMLElement, options?: Html2PdfOptions): Html2PdfInstance;
    }

    const html2pdf: Html2PdfFunction;
    export default html2pdf;
}
