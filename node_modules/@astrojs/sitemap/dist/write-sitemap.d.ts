import type { AstroConfig } from 'astro';
import type { SitemapItem } from './index.js';
type WriteSitemapConfig = {
    filenameBase: string;
    hostname: string;
    sitemapHostname?: string;
    customSitemaps?: string[];
    sourceData: SitemapItem[];
    destinationDir: string;
    publicBasePath?: string;
    limit?: number;
    xslURL?: string;
    lastmod?: string;
};
export declare function writeSitemap({ filenameBase, hostname, sitemapHostname, sourceData, destinationDir, limit, customSitemaps, publicBasePath, xslURL: xslUrl, lastmod, }: WriteSitemapConfig, astroConfig: AstroConfig): Promise<void>;
export {};
