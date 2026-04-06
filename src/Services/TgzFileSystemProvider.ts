/* eslint-env node */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as tarStream from 'tar-stream';

export class TgzFileSystemProvider implements vscode.FileSystemProvider {
    private readonly _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile = this._onDidChangeFile.event;

    private tgzCache = new Map<string, TgzFileEntry[]>();
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    async loadTgzFile(tgzPath: string): Promise<void> {
        if (this.tgzCache.has(tgzPath)) {
            return; // Already loaded
        }

        const entries: TgzFileEntry[] = [];
        
        return new Promise((resolve, reject) => {
            const extract = tarStream.extract();
            const fileStream = fs.createReadStream(tgzPath);
            const gunzip = zlib.createGunzip();

            extract.on('entry', (header: any, stream: any, next: any) => {
                const chunks: Buffer[] = [];
                
                stream.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                });
                
                stream.on('end', () => {
                    const content = Buffer.concat(chunks);
                    const normalizedPath = this.normalizePath(header.name);
                    
                    entries.push({
                        name: normalizedPath,
                        type: header.type === 'directory' ? vscode.FileType.Directory : vscode.FileType.File,
                        size: header.size || content.length,
                        content: content,
                        mtime: header.mtime ? new Date(header.mtime).getTime() : Date.now(),
                        ctime: Date.now()
                    });
                    next();
                });
            });

            extract.on('finish', () => {
                this.tgzCache.set(tgzPath, entries);
                this.log(`Loaded ${entries.length} entries from ${path.basename(tgzPath)}`);
                resolve();
            });

            extract.on('error', (err: any) => {
                this.log(`Error loading ${path.basename(tgzPath)}: ${err.message}`);
                reject(err);
            });

            fileStream.on('error', (err: any) => {
                this.log(`File read error for ${path.basename(tgzPath)}: ${err.message}`);
                reject(err);
            });

            fileStream.pipe(gunzip).pipe(extract);
        });
    }

    private normalizePath(tarPath: string): string {
        // Remove leading ./ and ensure consistent path separators
        return tarPath.replace(/^\.\//, '').replace(/\\/g, '/');
    }

    private parseUri(uri: vscode.Uri): { tgzPath: string; filePath: string } {
        // URI format: tgz:/path/to/file.tgz/path/inside/tgz
        const fullPath = uri.path;
        const tgzMatch = fullPath.match(/^(\/.*\.tgz)(\/.*)?$/);
        
        if (!tgzMatch) {
            throw new Error(`Invalid tgz URI format: ${uri.toString()}`);
        }
        
        const tgzPath = tgzMatch[1];
        const filePath = tgzMatch[2] ? tgzMatch[2].substring(1) : ''; // Remove leading /
        
        return { tgzPath, filePath };
    }

    private getEntry(tgzPath: string, filePath: string): TgzFileEntry | undefined {
        const entries = this.tgzCache.get(tgzPath);
        if (!entries) {
            return undefined;
        }
        
        if (filePath === '') {
            // Root directory - create virtual entry
            return {
                name: '',
                type: vscode.FileType.Directory,
                size: 0,
                content: Buffer.alloc(0),
                mtime: Date.now(),
                ctime: Date.now()
            };
        }

        // Exact match (file) or explicit directory entry (trailing slash)
        const exact = entries.find(e => e.name === filePath || e.name === filePath + '/');
        if (exact) {
            return exact;
        }

        // No explicit directory entry — infer it from child paths
        const prefix = filePath + '/';
        const hasChildren = entries.some(e => e.name.startsWith(prefix));
        if (hasChildren) {
            return {
                name: filePath,
                type: vscode.FileType.Directory,
                size: 0,
                content: Buffer.alloc(0),
                mtime: Date.now(),
                ctime: Date.now()
            };
        }

        return undefined;
    }

    private getChildEntries(tgzPath: string, dirPath: string): TgzFileEntry[] {
        const entries = this.tgzCache.get(tgzPath);
        if (!entries) {
            return [];
        }
        
        const normalizedDir = dirPath === '' ? '' : dirPath.endsWith('/') ? dirPath : dirPath + '/';
        
        const children: TgzFileEntry[] = [];
        const seenNames = new Set<string>();
        
        for (const entry of entries) {
            const relativePath = normalizedDir === ''
                ? entry.name
                : entry.name.startsWith(normalizedDir) ? entry.name.substring(normalizedDir.length) : null;

            if (relativePath === null || relativePath === '') {
                continue;
            }

            // First path segment is the direct child name; if there are more segments it's a directory
            const slashIdx = relativePath.indexOf('/');
            const childName = slashIdx === -1 ? relativePath : relativePath.substring(0, slashIdx);
            const isDirectory = slashIdx !== -1;

            if (childName && !seenNames.has(childName)) {
                seenNames.add(childName);
                children.push({
                    ...entry,
                    name: childName,
                    type: isDirectory ? vscode.FileType.Directory : vscode.FileType.File
                });
            }
        }
        
        return children;
    }

    watch(): vscode.Disposable {
        return new vscode.Disposable(() => {
            // No-op for read-only file system
        });
    }

    stat(uri: vscode.Uri): vscode.FileStat {
        const { tgzPath, filePath } = this.parseUri(uri);
        const entry = this.getEntry(tgzPath, filePath);
        
        if (!entry) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }

        return {
            type: entry.type,
            ctime: entry.ctime,
            mtime: entry.mtime,
            size: entry.size
        };
    }

    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
        const { tgzPath, filePath } = this.parseUri(uri);
        const children = this.getChildEntries(tgzPath, filePath);
        
        return children.map(entry => [entry.name, entry.type]);
    }

    createDirectory(): void {
        throw vscode.FileSystemError.NoPermissions('Cannot create directories in .tgz files');
    }

    readFile(uri: vscode.Uri): Uint8Array {
        const { tgzPath, filePath } = this.parseUri(uri);
        const entry = this.getEntry(tgzPath, filePath);
        
        if (!entry) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        
        if (entry.type === vscode.FileType.Directory) {
            throw vscode.FileSystemError.FileIsADirectory(uri);
        }

        return new Uint8Array(entry.content);
    }

    writeFile(): void {
        throw vscode.FileSystemError.NoPermissions('Cannot write to .tgz files');
    }

    delete(): void {
        throw vscode.FileSystemError.NoPermissions('Cannot delete from .tgz files');
    }

    rename(): void {
        throw vscode.FileSystemError.NoPermissions('Cannot rename in .tgz files');
    }

    private log(message: string): void {
        this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
    }

    public dispose(): void {
        this.tgzCache.clear();
        this._onDidChangeFile.dispose();
    }
}

interface TgzFileEntry {
    name: string;
    type: vscode.FileType;
    size: number;
    content: Buffer;
    mtime: number;
    ctime: number;
}