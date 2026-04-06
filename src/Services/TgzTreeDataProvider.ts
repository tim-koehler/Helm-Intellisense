import * as vscode from 'vscode';
import * as path from 'path';
import { TgzFileSystemProvider } from './TgzFileSystemProvider';

export class TgzTreeDataProvider implements vscode.TreeDataProvider<TgzTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TgzTreeItem | undefined | null | void> = new vscode.EventEmitter<TgzTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TgzTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private tgzFiles: Set<string> = new Set();
    
    constructor(private tgzProvider: TgzFileSystemProvider) {}

    addTgzFile(tgzPath: string): void {
        if (!this.tgzFiles.has(tgzPath)) {
            this.tgzFiles.add(tgzPath);
            this.refresh();
        }
    }

    removeTgzFile(tgzPath: string): void {
        if (this.tgzFiles.has(tgzPath)) {
            this.tgzFiles.delete(tgzPath);
            this.refresh();
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TgzTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TgzTreeItem): TgzTreeItem[] {
        if (!element) {
            // Root level - show all .tgz files
            return Array.from(this.tgzFiles).map(tgzPath => {
                const fileName = path.basename(tgzPath, '.tgz');
                return new TgzTreeItem(
                    `📦 ${fileName}`,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'tgz-root',
                    tgzPath,
                    ''
                );
            });
        }

        if (element.contextValue === 'tgz-root' || element.contextValue === 'tgz-directory') {
            // Show contents of .tgz file or directory
            try {
                const tgzUri = vscode.Uri.parse(`tgz:${element.tgzPath}/${element.filePath}`);
                const entries = this.tgzProvider.readDirectory(tgzUri);

                return entries.map(([name, type]) => {
                    const isDirectory = type === vscode.FileType.Directory;
                    const filePath = element.filePath ? `${element.filePath}/${name}` : name;
                    
                    return new TgzTreeItem(
                        name,
                        isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                        isDirectory ? 'tgz-directory' : 'tgz-file',
                        element.tgzPath,
                        filePath,
                        isDirectory ? undefined : vscode.Uri.parse(`tgz:${element.tgzPath}/${filePath}`)
                    );
                });
            } catch (error) {
                return [new TgzTreeItem(
                    `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    vscode.TreeItemCollapsibleState.None,
                    'error'
                )];
            }
        }

        return [];
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}

class TgzTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly tgzPath?: string,
        public readonly filePath?: string,
        public readonly resourceUri?: vscode.Uri
    ) {
        super(label, collapsibleState);

        if (resourceUri) {
            this.resourceUri = resourceUri;
            this.command = {
                command: 'vscode.open',
                title: 'Open',
                arguments: [resourceUri]
            };
        }

        // Set icons based on context
        switch (contextValue) {
            case 'tgz-root':
                this.iconPath = new vscode.ThemeIcon('archive');
                break;
            case 'tgz-directory':
                this.iconPath = new vscode.ThemeIcon('folder');
                break;
            case 'tgz-file':
                this.iconPath = new vscode.ThemeIcon('file');
                break;
            case 'error':
                this.iconPath = new vscode.ThemeIcon('error');
                break;
        }
    }
}