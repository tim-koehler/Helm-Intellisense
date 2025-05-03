import * as vscode from 'vscode';
import * as utils from '../utils';

export class NamedTemplatesCompletionItemProvider implements vscode.CompletionItemProvider {
    /**
     * Generates a list of completion items based on the current position in the
     * document.
     */
    async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList | undefined> {
        const currentLine = document.lineAt(position).text;

        if (!utils.isInsideBrackets(currentLine, position.character)) {
            return undefined;
        }

        if (!((currentLine.includes('include')) || currentLine.includes('template'))) {
            return undefined;
        }

        const currentString = utils.getWordAt(currentLine, position.character - 1).trim();
        if (currentString.startsWith('"')) {
            const templatesFromFiles = utils.getAllNamedTemplatesFromFiles(document.fileName) ?? [];
            const templatesFromParents = await utils.getAllNamedTemplatesFromParentCharts(document.fileName) ?? [];
            const allNamedTemplates = new Map<string, string>([...templatesFromFiles, ...templatesFromParents]);
            return this.getCompletionItemList(position, currentString, allNamedTemplates);
        }

        return undefined;
    }

    /**
     * Generates a list of possible completions for the current template prefix.
     */
    private getCompletionItemList(position: vscode.Position, currentString: string, namedTemplates: Map<string, string>): vscode.CompletionItem[] | vscode.CompletionList | undefined {
        const listOfCompletionItems: vscode.CompletionItem[] = [];
        for (const [namedTemplate, file] of namedTemplates) {
            const item = new vscode.CompletionItem(namedTemplate, vscode.CompletionItemKind.Field);
            item.detail = file;
            const startPos = new vscode.Position(position.line, position.character - currentString.replace('"', '').length);
            const endPos = position;
            item.range = new vscode.Range(startPos, endPos);

            listOfCompletionItems.push(item);
        }

        return listOfCompletionItems;
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
}
