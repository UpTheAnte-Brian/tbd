import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type CacheKeyInput = {
    objectId?: string | null;
    url?: string | null;
    ein?: string | null;
};

function normalizeToken(input: string): string {
    return String(input)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function sha1(input: string): string {
    return crypto.createHash("sha1").update(input).digest("hex");
}

export function makeCacheKey(input: CacheKeyInput): string {
    const objectId = input.objectId ? String(input.objectId).trim() : "";
    if (objectId) {
        return `object-${normalizeToken(objectId)}`;
    }

    const url = input.url ? String(input.url).trim() : "";
    if (url) {
        return `url-${sha1(url)}`;
    }

    const ein = input.ein ? String(input.ein).trim() : "";
    if (ein) {
        return `ein-${normalizeToken(ein)}`;
    }

    throw new Error("makeCacheKey requires objectId, url, or ein.");
}

export function getXmlCachePath(key: string, cacheDir?: string): string {
    const base = path.resolve(
        cacheDir || path.join(process.cwd(), "data", "irs-cache"),
    );
    return path.join(base, "xml", `${normalizeToken(key)}.xml`);
}

export function isValidCachedFile(filePath: string): boolean {
    try {
        const stat = fs.statSync(filePath);
        return stat.isFile() && stat.size > 0;
    } catch {
        return false;
    }
}

export function atomicWriteFile(tmpPath: string, finalPath: string): void {
    fs.mkdirSync(path.dirname(finalPath), { recursive: true });
    fs.renameSync(tmpPath, finalPath);
}
