import * as vscode from 'vscode';
import * as utils from "./utils"; 

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

        if (!this.isInReleaseString(currentLine, position.character)) {
            if (currentLine.charAt(position.character - 1) === '.') {
                return [new vscode.CompletionItem('Release', vscode.CompletionItemKind.Method)];
            } else if (currentLine.charAt(position.character - 1) === ' ') {
                return [new vscode.CompletionItem('.Release', vscode.CompletionItemKind.Method)];
            }
            return undefined;
        }
 
        if (utils.getWordAt(currentLine, position.character - 1).replace('.', '',).replace('$', '') !== 'Release.') {
            return undefined;
        }

        return this.getCompletionItems();
    }

    /**
    * Checks whether the position is part of a release reference.
    */
    isInReleaseString(currentLine: string, position: number): boolean {
        return utils.getWordAt(currentLine, position - 1).includes('.Release');
    }

    getCompletionItems(): vscode.CompletionItem[] {
        let name = new vscode.CompletionItem("Name", vscode.CompletionItemKind.Field);
        name.documentation = "The release name";

        let namespace = new vscode.CompletionItem("Namespace", vscode.CompletionItemKind.Field);
        namespace.documentation = "The namespace to be released into (if the manifest doesn’t override)";

        let isUpgrade = new vscode.CompletionItem("IsUpgrade", vscode.CompletionItemKind.Field);
        isUpgrade.documentation = "This is set to true if the current operation is an upgrade or rollback.";

        let isInstall = new vscode.CompletionItem("IsInstall", vscode.CompletionItemKind.Field);
        isInstall.documentation = "This is set to true if the current operation is an install.";

        let revision = new vscode.CompletionItem("Revision", vscode.CompletionItemKind.Field);
        revision.documentation = "The revision number for this release. On install, this is 1, and it is incremented with each upgrade and rollback.";

        let service = new vscode.CompletionItem("Service", vscode.CompletionItemKind.Field);
        service.documentation = "The service that is rendering the present template. On Helm, this is always Helm.";
 
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