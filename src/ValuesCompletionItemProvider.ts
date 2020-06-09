import * as vscode from 'vscode';
import * as utils from "./utils"; 

export class ValuesCompletionItemProvider implements vscode.CompletionItemProvider {
    /**
     * Generates a list of completion items based on the current position in the
     * document.
     */
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const currentLine = document.lineAt(position).text;

        if (!utils.isInsideBrackets(currentLine, position.character)) {
            return undefined;
        }

        if (!utils.isInValuesString(currentLine, position.character)) {
            if (currentLine.charAt(position.character - 1) === '.') {
                return [new vscode.CompletionItem('Values', vscode.CompletionItemKind.Method)];
            } else if (currentLine.charAt(position.character - 1) === ' ') {
                return [new vscode.CompletionItem('.Values', vscode.CompletionItemKind.Method)];
            }
            return undefined;
        }

        const doc = utils.getValuesFromFile(document);
        let currentString = utils.getWordAt(currentLine, position.character - 1).replace('.', '',).replace('$', '');

        let currentKey = doc;
        if (currentString.charAt(currentString.length - 1) === '.') {
            // Removing the dot at the end
            currentString = currentString.slice(0, -1);

            if (currentString === 'Values') {
                return utils.getCompletionItemList(currentKey);
            }

            // Removing prefix 'Values.'
            const allKeys = currentString.replace('Values.', '').split('.');

            currentKey = utils.updateCurrentKey(currentKey, allKeys);
        } else {
            if (!currentString.includes('Values.')) {
                return undefined;
            }

            // Removing prefix 'Values.'
            const allKeys = currentString.replace('Values.', '').split('.');
            allKeys.pop();

            currentKey = utils.updateCurrentKey(currentKey, allKeys);
        }
        return utils.getCompletionItemList(currentKey);
    }
}