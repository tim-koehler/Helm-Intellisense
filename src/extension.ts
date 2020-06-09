import * as vscode from 'vscode';
import { ValuesCompletionItemProvider } from "./ValuesCompletionItemProvider";

/**
 * Activates the extension. Adds completion item providers.
 */
export function activate(context: vscode.ExtensionContext): void {
	console.log('Congratulations, your extension "Helm-Intellisense" is now active!');

	for (let lang of ['yaml', 'helm']) {
		vscode.languages.registerCompletionItemProvider(lang, new ValuesCompletionItemProvider() , '.');
	}
}

/**
 * Deactivates the extension.
 */
export function deactivate(): void {
}