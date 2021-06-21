import * as vscode from 'vscode';
import * as utils from '../utils';

export class ValuesCompletionItemProvider implements vscode.CompletionItemProvider {
    /**
     * Generates a list of completion items based on the current position in the
     * document.
     */
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const currentLine = document.lineAt(position).text;

        if (!utils.isInsideBrackets(currentLine, position.character)) {
            return undefined;
        }

        const currentString = utils.getWordAt(currentLine, position.character - 1).replace('$.', '.').trim();

        if (currentString.length === 0) {
            return [new vscode.CompletionItem('.Values', vscode.CompletionItemKind.Method)];
        }

        if (currentString.startsWith('.') && !currentString.includes('.Values') && currentString.split('.').length < 3) {
            return [new vscode.CompletionItem('Values', vscode.CompletionItemKind.Method)];
        }

        if (currentString.startsWith('.Values.')) {
            const doc = utils.getValuesFromFile(document.fileName);

            if (currentString === '.Values.') {
                return this.getCompletionItemList(doc);
            }

            let currentKey = doc;
            const allKeys = currentString.replace('.Values.', '').split('.');
            allKeys.pop();

            currentKey = this.updateCurrentKey(currentKey, allKeys);
            return this.getCompletionItemList(currentKey);
        }

        return undefined;
    }

    /**
     * Updates the currently active key.
     */
    private updateCurrentKey(currentKey: any, allKeys: any): any {
        for (const key in allKeys) {
            if (Array.isArray(currentKey[allKeys[key]])) {
                return undefined;
            }
            currentKey = currentKey[allKeys[key]];
        }
        return currentKey;
    }

    /**
     * Generates a list of possible completions for the current key.
     */
    private getCompletionItemList(currentKey: any): vscode.CompletionItem[] {
        const keys = [];
        for (const key in currentKey) {
            switch (typeof currentKey[key]) {
                case 'object':
                    keys.push(new vscode.CompletionItem(key, vscode.CompletionItemKind.Method));
                    break;
                case 'string':
                case 'boolean':
                case 'number':
                    const valueItem = new vscode.CompletionItem(key, vscode.CompletionItemKind.Field);
                    valueItem.documentation = 'Value: ' + currentKey[key];
                    keys.push(valueItem);
                    break;
                default:
                    const unknownItem = new vscode.CompletionItem(key, vscode.CompletionItemKind.Issue);
                    unknownItem.documentation = 'Helm-Intellisense could not find type';
                    keys.push(unknownItem);
                    break;
            }
        }
        return keys;
    }
}
