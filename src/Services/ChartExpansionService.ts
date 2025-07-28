import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as tarStream from 'tar-stream';

export class ChartExpansionService {
    private watchers: Map<string, vscode.FileSystemWatcher> = new Map();
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Helm Chart Expansion');
    }

    public activate(context: vscode.ExtensionContext): void {
        const disposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this.refreshWatchers();
        });
        context.subscriptions.push(disposable);
        
        this.refreshWatchers();
        this.log('Chart expansion service activated');
    }

    private refreshWatchers(): void {
        this.watchers.forEach(watcher => watcher.dispose());
        this.watchers.clear();

        if (!vscode.workspace.workspaceFolders) {
            return;
        }

        for (const workspaceFolder of vscode.workspace.workspaceFolders) {
            this.setupWatchersForWorkspace(workspaceFolder.uri.fsPath);
        }
    }

    private setupWatchersForWorkspace(workspacePath: string): void {
        this.findHelmCharts(workspacePath).forEach(chartPath => {
            this.setupWatcherForChart(chartPath);
        });
    }

    private findHelmCharts(searchPath: string): string[] {
        const helmCharts: string[] = [];
        
        try {
            const items = fs.readdirSync(searchPath, { withFileTypes: true });
            
            for (const item of items) {
                const fullPath = path.join(searchPath, item.name);
                
                if (item.isDirectory()) {
                    if (fs.existsSync(path.join(fullPath, 'Chart.yaml'))) {
                        helmCharts.push(fullPath);
                    }
                    helmCharts.push(...this.findHelmCharts(fullPath));
                }
            }
        } catch (error) {
            this.log(`Error searching for Helm charts in ${searchPath}: ${error}`);
        }
        
        return helmCharts;
    }

    private setupWatcherForChart(chartPath: string): void {
        const chartsDir = path.join(chartPath, 'charts');
        
        if (!fs.existsSync(chartsDir)) {
            return;
        }

        const pattern = new vscode.RelativePattern(chartsDir, '*.tgz');
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        watcher.onDidCreate((uri: vscode.Uri) => this.handleTgzFile(uri, 'created'));
        watcher.onDidChange((uri: vscode.Uri) => this.handleTgzFile(uri, 'changed'));
        
        this.watchers.set(chartPath, watcher);
        this.log(`Watching for .tgz files in: ${chartsDir}`);
    }

    private async handleTgzFile(uri: vscode.Uri, action: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('helm-intellisense');
        const autoExpandEnabled = config.get<boolean>('autoExpandChartDependencies', true);
        
        if (!autoExpandEnabled) {
            return;
        }

        this.log(`Chart dependency ${action}: ${uri.fsPath}`);
        
        try {
            await this.expandTgzFile(uri.fsPath);
            this.log(`Successfully expanded: ${path.basename(uri.fsPath)}`);
        } catch (error) {
            this.log(`Failed to expand ${path.basename(uri.fsPath)}: ${error}`);
            vscode.window.showErrorMessage(`Failed to expand chart: ${path.basename(uri.fsPath)}`);
        }
    }

    private async expandTgzFile(tgzPath: string): Promise<void> {
        const chartName = path.basename(tgzPath, '.tgz');
        const chartsDir = path.dirname(tgzPath);
        const extractPath = path.join(chartsDir, chartName);

        if (fs.existsSync(extractPath)) {
            const config = vscode.workspace.getConfiguration('helm-intellisense');
            const overwriteExisting = config.get<boolean>('overwriteExpandedCharts', false);
            
            if (!overwriteExisting) {
                this.log(`Skipping extraction - directory already exists: ${extractPath}`);
                return;
            }
            
            this.removeDirectoryRecursively(extractPath);
        }

        fs.mkdirSync(extractPath, { recursive: true });

        const extract = tarStream.extract();
        const fileStream = fs.createReadStream(tgzPath);
        const gunzip = zlib.createGunzip();

        extract.on('entry', (header: any, stream: any, next: any) => {
            const filePath = path.join(extractPath, header.name);
            const dir = path.dirname(filePath);

            if (header.type === 'directory') {
                fs.mkdirSync(filePath, { recursive: true });
                stream.resume();
                next();
                return;
            }

            fs.mkdirSync(dir, { recursive: true });
            const writeStream = fs.createWriteStream(filePath);
            
            stream.pipe(writeStream);
            stream.on('end', () => {
                next();
            });
        });

        return new Promise((resolve, reject) => {
            fileStream
                .pipe(gunzip)
                .pipe(extract)
                .on('finish', () => {
                    resolve();
                })
                .on('error', (err: any) => {
                    reject(err);
                });
        });
    }

    private removeDirectoryRecursively(dirPath: string): void {
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                if (fs.statSync(filePath).isDirectory()) {
                    this.removeDirectoryRecursively(filePath);
                } else {
                    fs.unlinkSync(filePath);
                }
            }
            fs.rmdirSync(dirPath);
        }
    }

    private log(message: string): void {
        this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
    }

    public dispose(): void {
        this.watchers.forEach(watcher => watcher.dispose());
        this.watchers.clear();
        this.outputChannel.dispose();
    }
}