import * as vscode from 'vscode';

export class AnchorCompletionItemProvider implements vscode.CompletionItemProvider {
    /**
     * Generates a list of completion items based on the current position in the
     * document.
     */
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const txt = document.getText(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineAt(position).lineNumber, 0)));
        return this.getCompletionItemList(txt, document, position);
    }

    private getCompletionItemList(txt: string, document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const anchors = this.getAllAnchors(txt);
        const completionItems: vscode.CompletionItem[] = [];
        for (const index in anchors) {
            const wordRange = document.getWordRangeAtPosition(position);
            if (wordRange === undefined) {
                const completionItem = new vscode.CompletionItem(anchors[index].replace('&', '*'));
                completionItems.push(completionItem);
                continue;
            }
            const completionItemWithAsteriskReplace = new vscode.CompletionItem(anchors[index].replace('&', ''));
            completionItemWithAsteriskReplace.range = new vscode.Range(new vscode.Position(wordRange.start.line, wordRange.start.character - 1), wordRange.end);
            completionItemWithAsteriskReplace.insertText = ' *' + anchors[index].replace('&', '');
            completionItems.push(completionItemWithAsteriskReplace);

            const completionItemWithoutAsterisk = new vscode.CompletionItem(anchors[index].replace('&', '*'));
            completionItemWithoutAsterisk.range = new vscode.Range(new vscode.Position(wordRange.start.line, wordRange.start.character), wordRange.end);
            completionItemWithoutAsterisk.insertText = anchors[index].replace('&', '*');
            completionItems.push(completionItemWithoutAsterisk);
        }
        return completionItems;
    }

    private getAllAnchors(txt: string): string[] {
        const phrases = txt.split(' ');
        const anchors: string[] = [];

        for (const index in txt.split(' ')) {
            if (phrases[index].startsWith('&')) {
                anchors.push(phrases[index].replace(/[^\x20-\x7E]+/g, ''));
            }
        }
        return anchors;
    }
}
