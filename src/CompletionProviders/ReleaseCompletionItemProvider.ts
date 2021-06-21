import * as vscode from 'vscode';
import * as utils from '../utils';

export class ReleaseCompletionItemProvider implements vscode.CompletionItemProvider {

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
            return [new vscode.CompletionItem('.Release', vscode.CompletionItemKind.Method)];
        }

        if (currentString.startsWith('.') && !currentString.includes('.Release.') && currentString.split('.').length < 3) {
            return [new vscode.CompletionItem('Release', vscode.CompletionItemKind.Method)];
        }

        if (/^\.Release\.\w*$/.test(currentString)) {
            return this.getCompletionItemList();
        }

        return [];
    }

    /**
     * Put together list of items with the information from the official Helm website.
     */
    private getCompletionItemList(): vscode.CompletionItem[] {
        const name = new vscode.CompletionItem('Name', vscode.CompletionItemKind.Field);
        name.documentation = 'The release name';

        const namespace = new vscode.CompletionItem('Namespace', vscode.CompletionItemKind.Field);
        namespace.documentation = 'The namespace to be released into (if the manifest doesn’t override)';

        const isUpgrade = new vscode.CompletionItem('IsUpgrade', vscode.CompletionItemKind.Field);
        isUpgrade.documentation = 'This is set to true if the current operation is an upgrade or rollback.';

        const isInstall = new vscode.CompletionItem('IsInstall', vscode.CompletionItemKind.Field);
        isInstall.documentation = 'This is set to true if the current operation is an install.';

        const revision = new vscode.CompletionItem('Revision', vscode.CompletionItemKind.Field);
        revision.documentation = 'The revision number for this release. On install, this is 1, and it is incremented with each upgrade and rollback.';

        const service = new vscode.CompletionItem('Service', vscode.CompletionItemKind.Field);
        service.documentation = 'The service that is rendering the present template. On Helm, this is always Helm.';

        return [
            name,
            namespace,
            isUpgrade,
            isInstall,
            revision,
            service
        ];
    }

}
