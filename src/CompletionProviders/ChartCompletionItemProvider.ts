import * as vscode from 'vscode';
import * as yaml from '../yaml';
import * as fs from 'fs';
import * as utils from '../utils';
import { sep as pathSeperator } from 'path';
import {Yaml} from '../yaml';

export class ChartCompletionItemProvider implements vscode.CompletionItemProvider {
    /**
     * Generates a list of completion items based on the current position in the
     * document.
     */
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const currentLine = document.lineAt(position).text;

        if (!utils.isInsideBrackets(currentLine, position.character)) {
            return undefined;
        }

        const currentString = utils.getWordAt(currentLine, position.character - 1).replace('$.', '.').trim();
        if (currentString.length === 0) {
            return [new vscode.CompletionItem('.Chart', vscode.CompletionItemKind.Method)];
        }

        if (currentString.startsWith('.') && !currentString.includes('.Chart.') && currentString.split('.').length < 3) {
            return [new vscode.CompletionItem('Chart', vscode.CompletionItemKind.Method)];
        }

        if (currentString.startsWith('.Chart.')) {
            const doc = this.getValuesFromChartFile(document);

            if (currentString === '.Chart.') {
                return this.getCompletionItemList(doc);
            }

            let currentKey = doc;
            const allKeys = currentString.replace('.Chart.', '').split('.');
            allKeys.pop();

            currentKey = this.updateCurrentKey(currentKey, allKeys);
            return this.getCompletionItemList(currentKey);
        }

        return undefined;
    }

    /**
     * Checks whether the position is part of a values reference.
     */
    private isInChartString(currentLine: string, position: number): boolean {
        return utils.getWordAt(currentLine, position - 1).includes('.Chart');
    }

    /**
     * Retrieves the values from the `values.yaml`.
     */
    private getValuesFromChartFile(document: vscode.TextDocument): Yaml | undefined {
        const chartBasePath = utils.getChartBasePath(document.fileName);
        if (chartBasePath === undefined) {
            return undefined;
        }

        const pathToChartFile = chartBasePath + pathSeperator + 'Chart.yaml';
        if (fs.existsSync(pathToChartFile)) {
            return yaml.load(pathToChartFile);
        }

        vscode.window.showErrorMessage('Could not locate the Chart.yaml.');
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
                    keys.push(new vscode.CompletionItem(key.charAt(0).toUpperCase() + key.slice(1), vscode.CompletionItemKind.Method));
                    break;
                case 'string':
                case 'boolean':
                case 'number':
                    // NOTE: APIVersion is a special case, as it is not camelCase for `{{ .Chart.APIVersion }}`.
                    const completionText = key === 'apiVersion' ? 'APIVersion' : key.charAt(0).toUpperCase() + key.slice(1);
                    const valueItem = new vscode.CompletionItem(completionText, vscode.CompletionItemKind.Field);
                    valueItem.detail = currentKey[key].toString();
                    keys.push(valueItem);
                    break;
                default:
                    console.log('Unknown type: ' + typeof currentKey[key]);
                    const unknownItem = new vscode.CompletionItem(key.charAt(0).toUpperCase() + key.slice(1), vscode.CompletionItemKind.Issue);
                    unknownItem.detail = 'Helm-Intellisense could not find type';
                    keys.push(unknownItem);
                    break;
            }
        }
        return keys;
    }

}
