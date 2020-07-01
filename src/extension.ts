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

/**
 * Activates the extension. Adds completion item providers.
 */
export function activate(context: vscode.ExtensionContext): void {
	console.log('Congratulations, your extension "Helm-Intellisense" is now active!');

	for (let lang of ['yaml', 'helm']) {
		vscode.languages.registerCompletionItemProvider(lang, new ValuesCompletionItemProvider() , '.');
		vscode.languages.registerCompletionItemProvider(lang, new ReleaseCompletionItemProvider() , '.');
		vscode.languages.registerCompletionItemProvider(lang, new FilesCompletionItemProvider(), '.');
		vscode.languages.registerCompletionItemProvider(lang, new TemplateCompletionItemProvider(), '.');
		vscode.languages.registerCompletionItemProvider(lang, new CapabilitiesCompletionItemProvider(), '.');
		vscode.languages.registerCompletionItemProvider(lang, new ChartCompletionItemProvider(), '.');
		vscode.languages.registerCompletionItemProvider(lang, new AnchorCompletionItemProvider(), '*');
	}

	const lintCommand = vscode.commands.registerCommand('extension.Lint', LintCommand);
	context.subscriptions.push(lintCommand);

	const lintChartCommand = vscode.commands.registerCommand('extension.LintChart', LintChartCommand);
	context.subscriptions.push(lintChartCommand);
}

/**
 * Deactivates the extension.
 */
export function deactivate(): void {
}