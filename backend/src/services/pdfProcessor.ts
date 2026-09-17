import fs from 'fs';
import pdfParse from 'pdf-parse';
import { PageText } from '../utils/chunker';
import { logger } from '../config/logger';

export interface PDFProcessResult {
  text: string;
  pageCount: number;
  pages: PageText[];
}

export class PDFProcessor {
  async extractText(filePath: string): Promise<PDFProcessResult> {
    try {
      const dataBuffer = fs.readFileSync(filePath);

      const pages: PageText[] = [];

      const options = {
        pagerender: (pageData: any) => {
          return pageData.getTextContent().then((textContent: any) => {
            let lastY = null;
            let text = '';
            for (const item of textContent.items) {
              if (lastY === null || lastY === item.transform[5]) {
                text += item.str;
              } else {
                text += '\n' + item.str;
              }
              lastY = item.transform[5];
            }
            pages.push({
              pageNumber: pageData.pageIndex + 1,
              text,
            });
            return text;
          });
        },
      };

      const data = await pdfParse(dataBuffer, options);

      const MAX_ALLOWED_PAGES = 100;
      if (data.numpages && data.numpages > MAX_ALLOWED_PAGES) {
        throw new Error(
          `PDF exceeds maximum allowed length of ${MAX_ALLOWED_PAGES} pages (uploaded document has ${data.numpages} pages). Please upload a smaller section or document.`
        );
      }

      // Fallback if custom pagerender yielded no pages
      if (pages.length === 0 && data.text) {
        pages.push({ pageNumber: 1, text: data.text });
      }

      return {
        text: data.text,
        pageCount: data.numpages || pages.length,
        pages,
      };
    } catch (error) {
      logger.error(`PDF Extraction failed for file ${filePath}:`, error);
      throw error;
    }
  }
}

export const pdfProcessor = new PDFProcessor();
