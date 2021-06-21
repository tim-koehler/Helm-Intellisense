import * as vscode from 'vscode';
import { ValuesCompletionItemProvider } from './CompletionProviders/ValuesCompletionItemProvider';
import { ReleaseCompletionItemProvider } from './CompletionProviders/ReleaseCompletionItemProvider';
import { FilesCompletionItemProvider } from './CompletionProviders/FilesCompletionItemProvider';
import { TemplateCompletionItemProvider } from './CompletionProviders/TemplateCompletionItemProvider';
import { CapabilitiesCompletionItemProvider } from './CompletionProviders/CapabilitiesCompletionItemProvider';
import { ChartCompletionItemProvider } from './CompletionProviders/ChartCompletionItemProvider';
import { AnchorCompletionItemProvider } from './CompletionProviders/AnchorCompletionItemProvider';
import { LintCommand } from './Commands/LintCommand';
import { LintChartCommand } from './Commands/LintChartCommand';
import { NamedTemplatesCompletionItemProvider } from './CompletionProviders/NamedTemplatesCompletionItemProvider';


const GITHUB_URL = 'https://github.com/tim-koehler/Helm-Intellisense';
const LINT_COMMAND_STRING = 'extension.Lint';
const LINT_CHART_COMMAND_STRING = 'extension.LintChart';

/**
 * Activates the extension. Adds completion item providers.
 */
export function activate(context: vscode.ExtensionContext): void {

    updateAndShowRatePopup(context);

    for (const lang of ['yaml', 'helm']) {
        vscode.languages.registerCompletionItemProvider(lang, new ValuesCompletionItemProvider(), '.');
        vscode.languages.registerCompletionItemProvider(lang, new ReleaseCompletionItemProvider(), '.');
        vscode.languages.registerCompletionItemProvider(lang, new FilesCompletionItemProvider(), '.');
        vscode.languages.registerCompletionItemProvider(lang, new TemplateCompletionItemProvider(), '.');
        vscode.languages.registerCompletionItemProvider(lang, new CapabilitiesCompletionItemProvider(), '.');
        vscode.languages.registerCompletionItemProvider(lang, new ChartCompletionItemProvider(), '.');
        vscode.languages.registerCompletionItemProvider(lang, new AnchorCompletionItemProvider(), '*');
        vscode.languages.registerCompletionItemProvider(lang, new NamedTemplatesCompletionItemProvider(), '"');
    }

    const outputChannel = vscode.window.createOutputChannel('Helm-Intellisense');
    const lintCommand = vscode.commands.registerCommand(LINT_COMMAND_STRING, () => LintCommand(outputChannel));
    context.subscriptions.push(lintCommand);

    const lintChartCommand = vscode.commands.registerCommand(LINT_CHART_COMMAND_STRING, () => LintChartCommand(outputChannel));
    context.subscriptions.push(lintChartCommand);

    vscode.workspace.onDidSaveTextDocument(() => {
        if (vscode.workspace.getConfiguration('helm-intellisense').get('lintFileOnSave') === false) {
            return;
        }

        vscode.commands.executeCommand(LINT_COMMAND_STRING).then(undefined, err => {
            console.error(err);
        });
    });
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
