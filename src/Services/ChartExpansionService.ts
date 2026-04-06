import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as tarStream from 'tar-stream';

export class ChartExpansionService {
    private watchers: Map<string, vscode.FileSystemWatcher> = new Map();
    private outputChannel: vscode.OutputChannel;

    constructor() {
        console.log('ChartExpansionService constructor called');
        this.outputChannel = vscode.window.createOutputChannel('Helm Chart Expansion');
        this.log('ChartExpansionService constructor completed');
    }

    public activate(context: vscode.ExtensionContext): void {
        this.log('Activating Chart expansion service...');

        // Watch for workspace folder changes
        const workspaceFoldersDisposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this.refreshWatchers();
        });
        context.subscriptions.push(workspaceFoldersDisposable);

        // Watch for document changes to detect new Helm charts
        const documentOpenDisposable = vscode.workspace.onDidOpenTextDocument(() => {
            this.refreshWatchers();
        });
        context.subscriptions.push(documentOpenDisposable);

        const documentCloseDisposable = vscode.workspace.onDidCloseTextDocument(() => {
            this.refreshWatchers();
        });
        context.subscriptions.push(documentCloseDisposable);
        
        this.refreshWatchers();
        this.log('Chart expansion service activated');
    }

    private refreshWatchers(): void {
        this.watchers.forEach(watcher => watcher.dispose());
        this.watchers.clear();

        const foldersToWatch: string[] = [];

        // Check workspace folders first
        if (vscode.workspace.workspaceFolders) {
            this.log(`Found ${vscode.workspace.workspaceFolders.length} workspace folder(s)`);
            for (const workspaceFolder of vscode.workspace.workspaceFolders) {
                foldersToWatch.push(workspaceFolder.uri.fsPath);
            }
        }

        // If no workspace folders, check if we have any open text documents that might indicate a Helm chart
        if (foldersToWatch.length === 0) {
            const openDocuments = vscode.workspace.textDocuments;
            const helmChartPaths = new Set<string>();
            
            for (const doc of openDocuments) {
                if (doc.uri.scheme === 'file') {
                    const docDir = path.dirname(doc.uri.fsPath);
                    
                    // Check if this document is in a Helm chart directory
                    if (this.isHelmChartDirectory(docDir)) {
                        helmChartPaths.add(docDir);
                    } else {
                        // Check parent directories up to 3 levels
                        let parentDir = docDir;
                        for (let i = 0; i < 3; i++) {
                            parentDir = path.dirname(parentDir);
                            if (this.isHelmChartDirectory(parentDir)) {
                                helmChartPaths.add(parentDir);
                                break;
                            }
                            if (parentDir === path.dirname(parentDir)) { break; } // reached root
                        }
                    }
                }
            }
            
            foldersToWatch.push(...Array.from(helmChartPaths));
        }

        // If still no folders, try to detect from the first workspace folder
        if (foldersToWatch.length === 0) {
            const firstWorkspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (firstWorkspaceFolder) {
                this.log(`Using first workspace folder: ${firstWorkspaceFolder.uri.fsPath}`);
                foldersToWatch.push(firstWorkspaceFolder.uri.fsPath);
            }
        }

        if (foldersToWatch.length === 0) {
            this.log('No folders found to watch for Helm charts');
            return;
        }

        this.log(`Setting up watchers for ${foldersToWatch.length} folder(s)`);
        for (const folderPath of foldersToWatch) {
            this.log(`Setting up watchers for folder: ${folderPath}`);
            this.setupWatchersForWorkspace(folderPath);
        }
    }

    private isHelmChartDirectory(dirPath: string): boolean {
        try {
            return fs.existsSync(path.join(dirPath, 'Chart.yaml'));
        } catch (error) {
            return false;
        }
    }

    private setupWatchersForWorkspace(workspacePath: string): void {
        const helmCharts = this.findHelmCharts(workspacePath);
        this.log(`Found ${helmCharts.length} Helm chart(s) in workspace: ${workspacePath}`);
        
        helmCharts.forEach(chartPath => {
            this.log(`Setting up watcher for chart: ${chartPath}`);
            this.setupWatcherForChart(chartPath);
        });
    }

    private findHelmCharts(searchPath: string, depth = 0): string[] {
        const helmCharts: string[] = [];
        
        // Prevent infinite recursion and limit search depth
        if (depth > 10) {
            return helmCharts;
        }
        
        try {
            const items = fs.readdirSync(searchPath, { withFileTypes: true });
            
            for (const item of items) {
                if (item.name.startsWith('.') || item.name === 'node_modules') {
                    continue; // Skip hidden directories and node_modules
                }
                
                const fullPath = path.join(searchPath, item.name);
                
                if (item.isDirectory()) {
                    if (fs.existsSync(path.join(fullPath, 'Chart.yaml'))) {
                        helmCharts.push(fullPath);
                    }
                    helmCharts.push(...this.findHelmCharts(fullPath, depth + 1));
                }
            }
        } catch (error) {
            this.log(`Error searching for Helm charts in ${searchPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        return helmCharts;
    }

    private setupWatcherForChart(chartPath: string): void {
        const chartsDir = path.join(chartPath, 'charts');
        
        // Always set up a watcher for the charts directory, even if it doesn't exist yet
        const pattern = new vscode.RelativePattern(chartsDir, '*.tgz');
        const tgzWatcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        tgzWatcher.onDidCreate((uri: vscode.Uri) => this.handleTgzFile(uri, 'created'));
        tgzWatcher.onDidChange((uri: vscode.Uri) => this.handleTgzFile(uri, 'changed'));
        
        // Also watch for the charts directory itself being created/deleted
        const chartsDirPattern = new vscode.RelativePattern(chartPath, 'charts');
        const dirWatcher = vscode.workspace.createFileSystemWatcher(chartsDirPattern);
        
        dirWatcher.onDidCreate(() => {
            this.log(`Charts directory created: ${chartsDir}`);
            this.processExistingTgzFiles(chartsDir);
        });
        
        dirWatcher.onDidDelete(() => {
            this.log(`Charts directory deleted: ${chartsDir}`);
        });
        
        // Store both watchers
        this.watchers.set(chartPath, tgzWatcher);
        this.watchers.set(`${chartPath}_dir`, dirWatcher);
        
        // Process existing .tgz files if directory exists
        if (fs.existsSync(chartsDir)) {
            this.processExistingTgzFiles(chartsDir);
            this.log(`Watching for .tgz files in: ${chartsDir}`);
        } else {
            this.log(`Watching for charts directory creation: ${chartsDir}`);
        }
    }

    private async processExistingTgzFiles(chartsDir: string): Promise<void> {
        try {
            const files = fs.readdirSync(chartsDir);
            const tgzFiles = files.filter(file => file.endsWith('.tgz'));
            
            for (const tgzFile of tgzFiles) {
                const tgzPath = path.join(chartsDir, tgzFile);
                const uri = vscode.Uri.file(tgzPath);
                await this.handleTgzFile(uri, 'existing');
            }
            
            if (tgzFiles.length > 0) {
                this.log(`Processed ${tgzFiles.length} existing .tgz file(s) in: ${chartsDir}`);
            }
        } catch (error) {
            this.log(`Error processing existing .tgz files in ${chartsDir}: ${error}`);
        }
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
            this.log(`Successfully processed: ${path.basename(uri.fsPath)}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.log(`Failed to expand ${path.basename(uri.fsPath)}: ${errorMessage}`);
            vscode.window.showErrorMessage(`Failed to expand chart: ${path.basename(uri.fsPath)}`);
        }
    }

    private async expandTgzFile(tgzPath: string): Promise<void> {
        this.log(`Expanding .tgz file: ${tgzPath}`);
        
        const config = vscode.workspace.getConfiguration('helm-intellisense');
        const overwriteExpandedCharts = config.get<boolean>('overwriteExpandedCharts', false);
        
        const tgzFileName = path.basename(tgzPath, '.tgz');
        const extractPath = path.join(path.dirname(tgzPath), tgzFileName);
        
        // Check if already extracted and whether to overwrite
        if (fs.existsSync(extractPath) && !overwriteExpandedCharts) {
            this.log(`Skipping extraction - directory already exists: ${extractPath}`);
            return;
        }
        
        try {
            // Remove existing directory if overwrite is enabled
            if (fs.existsSync(extractPath) && overwriteExpandedCharts) {
                this.removeDirectoryRecursively(extractPath);
                this.log(`Removed existing directory: ${extractPath}`);
            }
            
            await this.extractTgzFile(tgzPath, extractPath);
            this.log(`Successfully extracted: ${path.basename(tgzPath)} to ${extractPath}`);
            
            // Show success message
            vscode.window.showInformationMessage(`Expanded chart dependency: ${tgzFileName}`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.log(`Error expanding .tgz file: ${errorMessage}`);
            throw error;
        }
    }

    private async extractTgzFile(tgzPath: string, extractPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const extract = tarStream.extract();
            const fileStream = fs.createReadStream(tgzPath);
            const gunzip = zlib.createGunzip();

            extract.on('entry', (header: any, stream: any, next: any) => {
                const filePath = path.join(extractPath, header.name);
                const dirPath = path.dirname(filePath);

                // Ensure directory exists
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }

                if (header.type === 'file') {
                    const writeStream = fs.createWriteStream(filePath);
                    stream.pipe(writeStream);
                    writeStream.on('finish', next);
                    writeStream.on('error', reject);
                } else {
                    stream.resume();
                    next();
                }
            });

            extract.on('finish', () => {
                resolve();
            });

            extract.on('error', reject);
            fileStream.on('error', reject);

            fileStream.pipe(gunzip).pipe(extract);
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




    public async expandChartsInCurrentWorkspace(): Promise<void> {
        this.log('Manual expansion triggered');
        
        const foldersToProcess: string[] = [];
        
        // Get folders to process
        if (vscode.workspace.workspaceFolders) {
            for (const workspaceFolder of vscode.workspace.workspaceFolders) {
                foldersToProcess.push(workspaceFolder.uri.fsPath);
            }
        } else {
            // Fallback to looking at open documents
            const openDocuments = vscode.workspace.textDocuments;
            const helmChartPaths = new Set<string>();
            
            for (const doc of openDocuments) {
                if (doc.uri.scheme === 'file') {
                    const docDir = path.dirname(doc.uri.fsPath);
                    if (this.isHelmChartDirectory(docDir)) {
                        helmChartPaths.add(docDir);
                    }
                }
            }
            foldersToProcess.push(...Array.from(helmChartPaths));
        }
        
        if (foldersToProcess.length === 0) {
            this.log('No Helm chart directories found to process');
            return;
        }
        
        let totalProcessed = 0;
        for (const folderPath of foldersToProcess) {
            const helmCharts = this.findHelmCharts(folderPath);
            this.log(`Found ${helmCharts.length} Helm chart(s) in: ${folderPath}`);
            
            for (const chartPath of helmCharts) {
                const chartsDir = path.join(chartPath, 'charts');
                if (fs.existsSync(chartsDir)) {
                    const tgzFiles = fs.readdirSync(chartsDir).filter(file => file.endsWith('.tgz'));
                    this.log(`Found ${tgzFiles.length} .tgz file(s) in: ${chartsDir}`);
                    
                    for (const tgzFile of tgzFiles) {
                        const tgzPath = path.join(chartsDir, tgzFile);
                        try {
                            await this.expandTgzFile(tgzPath);
                            totalProcessed++;
                        } catch (error) {
                            this.log(`Failed to expand ${tgzFile}: ${error}`);
                        }
                    }
                }
            }
        }
        
        this.log(`Manual expansion complete. Processed ${totalProcessed} .tgz file(s)`);
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