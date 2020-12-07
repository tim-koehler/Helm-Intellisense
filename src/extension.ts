import * as vscode from 'vscode';
import { ValuesCompletionItemProvider } from "./CompletionProviders/ValuesCompletionItemProvider";
import { ReleaseCompletionItemProvider } from "./CompletionProviders/ReleaseCompletionItemProvider";
import { FilesCompletionItemProvider } from "./CompletionProviders/FilesCompletionItemProvider";
import { TemplateCompletionItemProvider } from "./CompletionProviders/TemplateCompletionItemProvider";
import { CapabilitiesCompletionItemProvider } from "./CompletionProviders/CapabilitiesCompletionItemProvider";
import { ChartCompletionItemProvider } from "./CompletionProviders/ChartCompletionItemProvider";
import { AnchorCompletionItemProvider } from "./CompletionProviders/AnchorCompletionItemProvider";
import { LintCommand } from './Commands/LintCommand';
import { LintChartCommand } from './Commands/LintChartCommand';
import { NamedTemplatesCompletionItemProvider } from './CompletionProviders/NamedTemplatesCompletionItemProvider';


const githubUrl = 'https://github.com/tim-koehler/Helm-Intellisense';
/**
 * Activates the extension. Adds completion item providers.
 */
export function activate(context: vscode.ExtensionContext): void {

	checkRatePopup(context);

	for (let lang of ['yaml', 'helm']) {
		vscode.languages.registerCompletionItemProvider(lang, new ValuesCompletionItemProvider() , '.');
		vscode.languages.registerCompletionItemProvider(lang, new ReleaseCompletionItemProvider() , '.');
		vscode.languages.registerCompletionItemProvider(lang, new FilesCompletionItemProvider(), '.');
		vscode.languages.registerCompletionItemProvider(lang, new TemplateCompletionItemProvider(), '.');
		vscode.languages.registerCompletionItemProvider(lang, new CapabilitiesCompletionItemProvider(), '.');
		vscode.languages.registerCompletionItemProvider(lang, new ChartCompletionItemProvider(), '.');
		vscode.languages.registerCompletionItemProvider(lang, new AnchorCompletionItemProvider(), '*');
		vscode.languages.registerCompletionItemProvider(lang, new NamedTemplatesCompletionItemProvider(), '"');
	}

	let outputChannel = vscode.window.createOutputChannel("Helm-Intellisense");
	const lintCommand = vscode.commands.registerCommand('extension.Lint', () => LintCommand(outputChannel));
	context.subscriptions.push(lintCommand);

	const lintChartCommand = vscode.commands.registerCommand('extension.LintChart', () => LintChartCommand(outputChannel));
	context.subscriptions.push(lintChartCommand);

	vscode.workspace.onDidSaveTextDocument(() => {
		if (vscode.workspace.getConfiguration('helm-intellisense').get('lintFileOnSave') === true) {
			vscode.commands.executeCommand('extension.Lint').then(undefined, err => {
				console.error(err);
			});
		}
	});
}

/**
 * Deactivates the extension.
 */
export function deactivate(): void {
}

async function checkRatePopup(context: vscode.ExtensionContext) {
	let val = context.globalState.get('ratePopup');
	if (val === undefined || val === true) {
		context.globalState.update('ratePopup', 1);
	} 

	if (val as number >= 50) {
		context.globalState.update('ratePopup', 1);
		await vscode.window.showInformationMessage('If you like Helm-Intellisense, I would appreciate your support :)',
			'Give a ⭐ on GitHub').then(selection => {
			if (selection === 'Give a ⭐ on GitHub') {
				vscode.env.openExternal(vscode.Uri.parse(githubUrl));
			} 
		});
	} else {
		context.globalState.update('ratePopup', val as number + 1);
	}
}