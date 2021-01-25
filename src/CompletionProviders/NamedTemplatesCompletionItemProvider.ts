import * as vscode from 'vscode';
import * as utils from "../utils";

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
            const content: string = utils.getAllNamedTemplatesFromFiles(document);
            if(content.length === 0) {
                return undefined;
            }
            return this.getCompletionItemList(content);
        }
    }

    /**
     * Generates a list of possible completions for the current template prefix.
     */
    getCompletionItemList(content: string): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        let listOfCompletionItems = [];
        const listOfNamedTemplates = getListOfNamedTemplates(content);
        for (const tpl of listOfNamedTemplates) {
            let item = new vscode.CompletionItem(tpl, vscode.CompletionItemKind.Field);
            item.insertText = tpl;
            listOfCompletionItems.push(item);

        }
        return listOfCompletionItems;
    }
}

/**
 * Parses named-template names from the _helpers.tpl files content.
 */
export function getListOfNamedTemplates(content: string): string[] {
    const matchRanges = [];

    const templatePattern = /{{-? *define +"(.+?)" *-?}}/g;
    let result;
    while ((result = templatePattern.exec(content)) !== null) {
        matchRanges.push(result[1]);
    }

    return matchRanges;
}
