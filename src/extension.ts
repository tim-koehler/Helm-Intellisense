// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { type } from 'os';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "Helm-Intellisense" is now active!');

	const provider1helm = vscode.languages.registerCompletionItemProvider('helm',
	{
		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
			var currentLine = document.lineAt(position).text;
			if (!currentLine.includes('.Values')) {
				const commitCharacterCompletion = new vscode.CompletionItem('.Values', vscode.CompletionItemKind.Method);
				commitCharacterCompletion.commitCharacters = ['.'];
				return [commitCharacterCompletion];
			}
		}
	}
	);

	const provider2helm = vscode.languages.registerCompletionItemProvider('helm',
	{
		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
			return getProvideCompletionItems(document, position);
		}
	},
	'.' // triggered whenever a '.' is being typed
	);

	context.subscriptions.push(provider1helm, provider2helm);
}

// this method is called when your extension is deactivated
export function deactivate() {}

function getProvideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
	var pathToValuesFile = document.fileName.substr(0, document.fileName.indexOf('/templates')) + "/values.yaml";
	var doc = yaml.safeLoad(fs.readFileSync(pathToValuesFile, 'utf8'));
			
	var currentLine = document.lineAt(position).text;
	if (!currentLine.includes('.Values')) {
		return undefined;
	}

	var current = currentLine.substring(currentLine.indexOf('.Values') + 1, currentLine.lastIndexOf(currentLine.charAt(position.character - 1)));
	
	var keys = [];
	var currentKey = doc;
	if(current !== 'Values') {
		var allKeys = current.replace('Values.', '').split('.');
		for (let key in allKeys) {		
			if(typeof currentKey[allKeys[key]] === typeof 'string') {
				return undefined;
			}
			currentKey = currentKey[allKeys[key]];
		}
	}
	for (let key in currentKey) {
		var item;
		switch (typeof currentKey[key]) {
			case 'string':
				keys.push(new vscode.CompletionItem(key, vscode.CompletionItemKind.Field));
				break;
			case 'object':
				keys.push(new vscode.CompletionItem(key, vscode.CompletionItemKind.Method));
				break;
			case 'boolean':
				keys.push(new vscode.CompletionItem(key, vscode.CompletionItemKind.Variable));
				break;
			case 'number':
				keys.push(new vscode.CompletionItem(key, vscode.CompletionItemKind.Value));
				break;
			default:
				console.log("Unknown type: " + typeof currentKey[key]);
				keys.push(new vscode.CompletionItem(key, vscode.CompletionItemKind.Issue));
				break;
		}
		keys.push(item);
	}
	return keys;
}