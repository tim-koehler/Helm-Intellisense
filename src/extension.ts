import * as vscode from 'vscode';
import { ValuesCompletionItemProvider } from './CompletionProviders/ValuesCompletionItemProvider';
import { EnhancedValuesCompletionItemProvider } from './CompletionProviders/EnhancedValuesCompletionItemProvider';
import { ReleaseCompletionItemProvider } from './CompletionProviders/ReleaseCompletionItemProvider';
import { FilesCompletionItemProvider } from './CompletionProviders/FilesCompletionItemProvider';
import { TemplateCompletionItemProvider } from './CompletionProviders/TemplateCompletionItemProvider';
import { CapabilitiesCompletionItemProvider } from './CompletionProviders/CapabilitiesCompletionItemProvider';
import { ChartCompletionItemProvider } from './CompletionProviders/ChartCompletionItemProvider';
import { AnchorCompletionItemProvider } from './CompletionProviders/AnchorCompletionItemProvider';
import { LintCommand } from './Commands/LintCommand';
import { LintChartCommand } from './Commands/LintChartCommand';
import { NamedTemplatesCompletionItemProvider } from './CompletionProviders/NamedTemplatesCompletionItemProvider';
import { VariableCompletionItemProvider } from './CompletionProviders/VariableCompletionItemProvider';
import { ChartExpansionService } from './Services/ChartExpansionService';
import { ValueHierarchyService } from './Services/ValueHierarchyService';
import { TgzFileSystemProvider } from './Services/TgzFileSystemProvider';
import { TgzTreeDataProvider } from './Services/TgzTreeDataProvider';
import { ValueDefinitionProvider } from './Providers/ValueDefinitionProvider';
import { ValueHoverProvider } from './Providers/ValueHoverProvider';


const GITHUB_URL = 'https://github.com/tim-koehler/Helm-Intellisense';
const LINT_COMMAND_STRING = 'extension.Lint';
const LINT_CHART_COMMAND_STRING = 'extension.LintChart';

/**
 * Activates the extension. Adds completion item providers.
 */
export function activate(context: vscode.ExtensionContext): void {
    console.log('Helm-Intellisense extension activate function called');
    try {
        updateAndShowRatePopup(context);

        // Initialize Value Hierarchy Service
        console.log('Initializing Value Hierarchy Service...');
        const valueHierarchyService = new ValueHierarchyService();
        valueHierarchyService.activate(context);
        context.subscriptions.push(valueHierarchyService);

        // Determine whether to use enhanced completion based on config
        const config = vscode.workspace.getConfiguration('helm-intellisense');
        const useEnhancedCompletion = config.get<boolean>('enhancedValueCompletion', true);

        for (const lang of ['yaml', 'helm']) {
            // Use enhanced or standard values completion based on config
            if (useEnhancedCompletion) {
                vscode.languages.registerCompletionItemProvider(
                    lang,
                    new EnhancedValuesCompletionItemProvider(valueHierarchyService),
                    '.'
                );
            } else {
                vscode.languages.registerCompletionItemProvider(lang, new ValuesCompletionItemProvider(), '.');
            }

            vscode.languages.registerCompletionItemProvider(lang, new ReleaseCompletionItemProvider(), '.');
            vscode.languages.registerCompletionItemProvider(lang, new FilesCompletionItemProvider(), '.');
            vscode.languages.registerCompletionItemProvider(lang, new TemplateCompletionItemProvider(), '.');
            vscode.languages.registerCompletionItemProvider(lang, new CapabilitiesCompletionItemProvider(), '.');
            vscode.languages.registerCompletionItemProvider(lang, new ChartCompletionItemProvider(), '.');
            vscode.languages.registerCompletionItemProvider(lang, new AnchorCompletionItemProvider(), '*');
            vscode.languages.registerCompletionItemProvider(lang, new NamedTemplatesCompletionItemProvider(), '"');
            vscode.languages.registerCompletionItemProvider(lang, new VariableCompletionItemProvider(), '$');

            // Register definition provider for value navigation
            vscode.languages.registerDefinitionProvider(lang, new ValueDefinitionProvider(valueHierarchyService));

            // Register hover provider for value hierarchy info
            vscode.languages.registerHoverProvider(lang, new ValueHoverProvider(valueHierarchyService));
        }

        const collection = vscode.languages.createDiagnosticCollection('Helm-Intellisense');

        const lintCommand = vscode.commands.registerCommand(LINT_COMMAND_STRING, () => LintCommand(collection));
        context.subscriptions.push(lintCommand);

        const lintChartCommand = vscode.commands.registerCommand(LINT_CHART_COMMAND_STRING, () => LintChartCommand(collection));
        context.subscriptions.push(lintChartCommand);

        const testChartExpansionCommand = vscode.commands.registerCommand('extension.TestChartExpansion', () => {
            console.log('Test Chart Expansion command executed');
            vscode.window.showInformationMessage('Chart Expansion Service test executed. Check console and output channel for logs.');
        });
        context.subscriptions.push(testChartExpansionCommand);

        console.log('Creating ChartExpansionService...');
        const chartExpansionService = new ChartExpansionService();
        console.log('Activating ChartExpansionService...');

        const expandChartDependenciesCommand = vscode.commands.registerCommand('extension.ExpandChartDependencies', async () => {
            console.log('Expand Chart Dependencies command executed');
            try {
                await chartExpansionService.expandChartsInCurrentWorkspace();
                vscode.window.showInformationMessage('Chart dependency expansion completed. Check output for details.');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to expand chart dependencies: ${error}`);
            }
        });
        context.subscriptions.push(expandChartDependenciesCommand);
        chartExpansionService.activate(context);
        context.subscriptions.push(chartExpansionService);
        console.log('ChartExpansionService setup complete');

        // Register TGZ virtual file system provider (feature: browse .tgz in explorer)
        const tgzOutputChannel = vscode.window.createOutputChannel('Helm TGZ Browser');
        const tgzFileSystemProvider = new TgzFileSystemProvider(tgzOutputChannel);
        const tgzFsRegistration = vscode.workspace.registerFileSystemProvider('tgz', tgzFileSystemProvider, {
            isCaseSensitive: true,
            isReadonly: true,
        });
        context.subscriptions.push(tgzFsRegistration);
        context.subscriptions.push(tgzFileSystemProvider);

        // Register TGZ tree data provider in Explorer view
        const tgzTreeDataProvider = new TgzTreeDataProvider(tgzFileSystemProvider);
        const tgzTreeView = vscode.window.createTreeView('helmChartDependencies', {
            treeDataProvider: tgzTreeDataProvider,
            showCollapseAll: true,
        });
        context.subscriptions.push(tgzTreeView);
        context.subscriptions.push(tgzTreeDataProvider);

        // Helper: load a .tgz into the FS provider cache, then surface it in the tree
        const registerTgzFile = async (tgzPath: string): Promise<void> => {
            try {
                await tgzFileSystemProvider.loadTgzFile(tgzPath);
                tgzTreeDataProvider.addTgzFile(tgzPath);
            } catch (err) {
                console.error(`Failed to register .tgz file ${tgzPath}: ${err}`);
            }
        };

        // Populate tree with any .tgz files already present in the workspace
        vscode.workspace.findFiles('**/charts/*.tgz', '**/node_modules/**').then(async uris => {
            for (const uri of uris) {
                await registerTgzFile(uri.fsPath);
            }
            if (uris.length > 0) {
                // Reveal the panel so the user sees it
                vscode.commands.executeCommand('helmChartDependencies.focus');
            }
        });

        // Keep tree in sync as .tgz files are added/removed
        const tgzWatcher = vscode.workspace.createFileSystemWatcher('**/charts/*.tgz');
        tgzWatcher.onDidCreate(uri => registerTgzFile(uri.fsPath));
        tgzWatcher.onDidDelete(uri => tgzTreeDataProvider.removeTgzFile(uri.fsPath));
        context.subscriptions.push(tgzWatcher);

        // Add value hierarchy commands
        const refreshValueHierarchyCommand = vscode.commands.registerCommand('extension.RefreshValueHierarchy', async () => {
            await valueHierarchyService.refreshChartHierarchy();
            vscode.window.showInformationMessage('Value hierarchy refreshed successfully');
        });
        context.subscriptions.push(refreshValueHierarchyCommand);

        const showValueHierarchyCommand = vscode.commands.registerCommand('extension.ShowValueHierarchy', () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showWarningMessage('No active editor');
                return;
            }

            const chart = valueHierarchyService.getChartForFile(activeEditor.document.fileName);
            if (!chart) {
                vscode.window.showWarningMessage('Current file is not part of a Helm chart');
                return;
            }

            const outputChannel = vscode.window.createOutputChannel('Helm Value Hierarchy');
            outputChannel.clear();
            outputChannel.appendLine(`Chart: ${chart.name}`);
            outputChannel.appendLine(`Path: ${chart.path}`);
            outputChannel.appendLine('');

            if (chart.parentChart) {
                outputChannel.appendLine(`Parent Chart: ${chart.parentChart.name}`);
            }

            if (chart.subcharts.size > 0) {
                outputChannel.appendLine('Subcharts:');
                for (const [name, subchart] of chart.subcharts) {
                    outputChannel.appendLine(`  - ${name} (${subchart.path})`);
                }
            }

            outputChannel.appendLine('');
            outputChannel.appendLine('All Values:');
            const allValues = valueHierarchyService.getAllValuesForChart(chart);
            for (const [key, value] of allValues) {
                outputChannel.appendLine(`  ${key}: ${JSON.stringify(value)}`);
            }

            outputChannel.show();
        });
        context.subscriptions.push(showValueHierarchyCommand);

        vscode.workspace.onDidSaveTextDocument(() => {
            if (vscode.workspace.getConfiguration('helm-intellisense').get('lintFileOnSave') === false) {
                return;
            }

            vscode.commands.executeCommand(LINT_COMMAND_STRING).then(undefined, err => {
                console.error(err);
            });
        });

    } catch (error) {
        console.error('Error in Helm-Intellisense extension activation:', error);
        vscode.window.showErrorMessage(`Helm-Intellisense activation failed: ${error}`);
    }
}

/**
 * Deactivates the extension.
 */
export function deactivate(): void {
    return;
}

async function updateAndShowRatePopup(context: vscode.ExtensionContext): Promise<void> {
    if (context.globalState.get('ratePopupDisabled') === true) {
        return;
    }

    const ratePopupValue = context.globalState.get('ratePopup');
    if (ratePopupValue === undefined || typeof ratePopupValue !== 'number') {
        context.globalState.update('ratePopup', 1);
        return;
    }

    if (ratePopupValue as number < 50) {
        context.globalState.update('ratePopup', ratePopupValue as number + 1);
        return;
    }

    context.globalState.update('ratePopup', 1);
    await vscode.window.showInformationMessage('If you like Helm-Intellisense, I would appreciate your support :)', 'Give a ⭐ on GitHub').then(selection => {
        if (selection === 'Give a ⭐ on GitHub') {
            vscode.env.openExternal(vscode.Uri.parse(GITHUB_URL));
            context.globalState.update('ratePopupDisabled', true);
        }
    });
}
