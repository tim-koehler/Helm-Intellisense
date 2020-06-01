// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "Helm-Intellisense" is now active!');

	vscode.languages.registerCompletionItemProvider('yaml',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				return getProvideCompletionItems(document, position);
			}
		},
		'.' // triggered whenever a '.' is being typed
	);

	vscode.languages.registerCompletionItemProvider('helm',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				return getProvideCompletionItems(document, position);
			}
		},
		'.' // triggered whenever a '.' is being typed
	);

	//context.subscriptions.push(providerYaml);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function getProvideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
	var currentLine = document.lineAt(position).text;

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

	var doc = getValuesFromFile(document);
	var currentString = getWordAt(currentLine, position.character - 1).replace('.', '',);

	var currentKey = doc;
	if (currentString.charAt(currentString.length - 1) === '.') {
		// Removing the dot at the end
		currentString = currentString.slice(0, -1);

		if (currentString === 'Values') {
			return getCompletionItemList(currentKey);
		}

		// Removing prefix 'Values.'
		var allKeys = currentString.replace('Values.', '').split('.');

		currentKey = updateCurrentKey(currentKey, allKeys);
	} else {
		if (!currentString.includes('Values.')) {
			return undefined;
		}

		// Removing prefix 'Values.'
		var allKeys = currentString.replace('Values.', '').split('.');
		allKeys.pop();

		currentKey = updateCurrentKey(currentKey, allKeys);
	}
	return getCompletionItemList(currentKey);
}

function isInsideBrackets(currentLine: string, position: number) {
	if (currentLine.substring(0, position).includes('{{') && currentLine.substring(position, currentLine.length).includes('}}')) {
		return true;
	}
	return false;
}

function isInValuesString(currentLine: string, position: number) {
	if (getWordAt(currentLine, position - 1).includes('.Values')) {
		return true;
	}
	return false;
}

function getWordAt(str: string, pos: number) {
	var left = str.slice(0, pos + 1).search(/\S+$/),
		right = str.slice(pos).search(/\s/);

	if (right < 0) {
		return str.slice(left);
	}

	return str.slice(left, right + pos);
}

function getValuesFromFile(document: vscode.TextDocument) {
	var pathToValuesFile = document.fileName.substr(0, document.fileName.indexOf('/templates')) + "/values.yaml";
	return yaml.safeLoad(fs.readFileSync(pathToValuesFile, 'utf8'));
}

function updateCurrentKey(currentKey: any, allKeys: any) {
	for (let key in allKeys) {
		if (typeof currentKey[allKeys[key]] === typeof 'string') {
			return undefined;
		}
		currentKey = currentKey[allKeys[key]];
	}
	return currentKey;
}

function getCompletionItemList(currentKey: any) {
	var keys = [];
	for (let key in currentKey) {
		switch (typeof currentKey[key]) {
			case 'object':
				keys.push(new vscode.CompletionItem(key, vscode.CompletionItemKind.Method));
				break;
			case 'string':
			case 'boolean':
			case 'number':
				keys.push(new vscode.CompletionItem(key, vscode.CompletionItemKind.Field));
				break;
			default:
				console.log("Unknown type: " + typeof currentKey[key]);
				keys.push(new vscode.CompletionItem(key, vscode.CompletionItemKind.Issue));
				break;
		}
	}
	return keys;
}