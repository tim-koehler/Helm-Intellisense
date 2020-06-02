import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

/**
 * Activates the extension. Adds completion item providers.
 */
export function activate(context: vscode.ExtensionContext): void {
	console.log('Congratulations, your extension "Helm-Intellisense" is now active!');

	for (let lang of ['yaml', 'helm']) {
		vscode.languages.registerCompletionItemProvider(lang, {
				provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
					return getProvideCompletionItems(document, position);
				}
			}, '.'
		);
	}
}

/**
 * Deactivates the extension.
 */
export function deactivate(): void {
}

/**
 * Generates a list of completion items based on the current position in the
 * document.
 */
function getProvideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] | undefined {
	const currentLine = document.lineAt(position).text;

	if (!isInsideBrackets(currentLine, position.character)) {
		return undefined;
	}

	if (!isInValuesString(currentLine, position.character)) {
		if (currentLine.charAt(position.character - 1) === '.') {
			return [new vscode.CompletionItem('Values', vscode.CompletionItemKind.Method)];
		} else if (currentLine.charAt(position.character - 1) === ' ') {
			return [new vscode.CompletionItem('.Values', vscode.CompletionItemKind.Method)];
		}
		return undefined;
	}

	const doc = getValuesFromFile(document);
	let currentString = getWordAt(currentLine, position.character - 1).replace('.', '',).replace('$', '');
	console.log(currentString);
	


	let currentKey = doc;
	if (currentString.charAt(currentString.length - 1) === '.') {
		// Removing the dot at the end
		currentString = currentString.slice(0, -1);

		if (currentString === 'Values') {
			return getCompletionItemList(currentKey);
		}

		// Removing prefix 'Values.'
		const allKeys = currentString.replace('Values.', '').split('.');

		currentKey = updateCurrentKey(currentKey, allKeys);
	} else {
		if (!currentString.includes('Values.')) {
			return undefined;
		}

		// Removing prefix 'Values.'
		const allKeys = currentString.replace('Values.', '').split('.');
		allKeys.pop();

		currentKey = updateCurrentKey(currentKey, allKeys);
	}
	return getCompletionItemList(currentKey);
}

/**
 * Checks whether the position in the line is in between curly brackets.
 */
function isInsideBrackets(currentLine: string, position: number): boolean {
	return currentLine.substring(0, position).includes('{{')
		&& currentLine.substring(position, currentLine.length).includes('}}');

}

/**
 * Checks whether the position is part of a values reference.
 */
function isInValuesString(currentLine: string, position: number): boolean {
	return getWordAt(currentLine, position - 1).includes('.Values');
}

/**
 * Retrieves the word at and around the position. A word is considered to be
 * the sequence of characters from the last and to the next whitespace.
 */
function getWordAt(str: string, pos: number): string {
	const left = str.slice(0, pos + 1).search(/\S+$/);
	const right = str.slice(pos).search(/\s/);

	if (right < 0) {
		return str.slice(left);
	}

	return str.slice(left, right + pos);
}

/**
 * Retrieves the values from the `values.yaml`.
 */
function getValuesFromFile(document: vscode.TextDocument): any {
	const pathToValuesFile = document.fileName.substr(0, document.fileName.lastIndexOf('/templates')) + "/values.yaml";
	return yaml.safeLoad(fs.readFileSync(pathToValuesFile, 'utf8'));
}

/**
 * Updates the currently active key.
 */
function updateCurrentKey(currentKey: any, allKeys: any): any {
	for (let key in allKeys) {
		if (typeof currentKey[allKeys[key]] === typeof 'string') {
			return undefined;
		}
		currentKey = currentKey[allKeys[key]];
	}
	return currentKey;
}

/**
 * Generates a list of possible completions for the current key.
 */
function getCompletionItemList(currentKey: any): vscode.CompletionItem[] {
	const keys = [];
	for (let key in currentKey) {
		// Check if suggestion is an array index
		if(currentKey[key].type !== undefined) {
			continue;
		}
		switch (typeof currentKey[key]) {
			case 'object':
				keys.push(new vscode.CompletionItem(key, vscode.CompletionItemKind.Method));
				break;
			case 'string':
			case 'boolean':
			case 'number':
				let valueItem = new vscode.CompletionItem(key, vscode.CompletionItemKind.Field);	
				valueItem.documentation = "Value: " + currentKey[key];
				keys.push(valueItem);
				break;
			default:
				console.log("Unknown type: " + typeof currentKey[key]);
				let unknownItem = new vscode.CompletionItem(key, vscode.CompletionItemKind.Issue);
				unknownItem.documentation = "Helm-Intellisense could not find type";
				keys.push(unknownItem);
				break;
		}
	}
	return keys;
}