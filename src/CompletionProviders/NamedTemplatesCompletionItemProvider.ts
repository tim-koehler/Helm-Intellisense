import * as vscode from 'vscode';
import * as utils from '../utils';

export class NamedTemplatesCompletionItemProvider implements vscode.CompletionItemProvider {
    /**
     * Generates a list of completion items based on the current position in the
     * document.
     */
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const currentLine = document.lineAt(position).text;

        if (!utils.isInsideBrackets(currentLine, position.character)) {
            return undefined;
        }

        if (!((currentLine.includes('include')) || currentLine.includes('template'))) {
            return undefined;
        }

        const currentString = utils.getWordAt(currentLine, position.character - 1).trim();
        if (currentString.startsWith('"')) {
            const namedTemplates: string[] = utils.getAllNamedTemplatesFromFiles(document.fileName);
            return this.getCompletionItemList(namedTemplates);
        }

        return undefined;
    }

    /**
     * Generates a list of possible completions for the current template prefix.
     */
    private getCompletionItemList(namedTemplates: string[]): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const listOfCompletionItems = [];
        for (const namedTemplate of namedTemplates) {
            const item = new vscode.CompletionItem(namedTemplate, vscode.CompletionItemKind.Field);
            item.insertText = namedTemplate;
            listOfCompletionItems.push(item);
        }
        return listOfCompletionItems;
    }
}
