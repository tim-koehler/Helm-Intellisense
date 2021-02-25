import * as vscode from 'vscode';
import * as utils from "../utils";

export class CapabilitiesCompletionItemProvider implements vscode.CompletionItemProvider {

    /**
     * Generates a list of completion items based on the current position in the
     * document.
     */
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const currentLine = document.lineAt(position).text;

        if (!utils.isInsideBrackets(currentLine, position.character)) {
            return undefined;
        }

        let currentString = utils.getWordAt(currentLine, position.character - 1).replace('$.', '.').trim();
        if(currentString.length === 0) {
            return [new vscode.CompletionItem('.Capabilities', vscode.CompletionItemKind.Method)];
        }

        if (currentString.startsWith('.') && !currentString.includes('.Capabilities.') && currentString.split('.').length < 3) {
            return [new vscode.CompletionItem('Capabilities', vscode.CompletionItemKind.Method)];
        }

        if (/^\.Capabilities\.\w*$/.test(currentString)) {
            return [
                new vscode.CompletionItem("APIVersions", vscode.CompletionItemKind.Method),
                new vscode.CompletionItem("KubeVersion", vscode.CompletionItemKind.Method)
            ];
        }

        if (/^\.Capabilities\.APIVersions\.\w*$/.test(currentString)) {
            let has = new vscode.CompletionItem("Has", vscode.CompletionItemKind.Field);
            has.documentation = "Capabilities.APIVersions.Has $version indicates whether a version (e.g., batch/v1) or resource (e.g., apps/v1/Deployment) is available on the cluster.";
            return [has];
        }

        if (/^\.Capabilities\.KubeVersion\.\w*$/.test(currentString)) {
            let version = new vscode.CompletionItem("Version", vscode.CompletionItemKind.Field);
            version.documentation = "Capabilities.KubeVersion and Capabilities.KubeVersion.Version is the Kubernetes version.";
            
            let major = new vscode.CompletionItem("Major", vscode.CompletionItemKind.Field);
            major.documentation = "Capabilities.KubeVersion.Major is the Kubernetes major version.";
            
            let minor = new vscode.CompletionItem("Minor", vscode.CompletionItemKind.Field);
            minor.documentation = "Capabilities.KubeVersion.Minor is the Kubernetes minor version.";
            
            return [version, major, minor];
        }

        return [];
    }
    /**
     * Put together list of items with the information from the official Helm website.
     */
    getCompletionItemList(): vscode.CompletionItem[] {
        let get = new vscode.CompletionItem("Get", vscode.CompletionItemKind.Field);
        get.documentation = "Files.Get is a function for getting a file by name (.Files.Get config.ini)";

        let getBytes = new vscode.CompletionItem("GetBytes", vscode.CompletionItemKind.Field);
        getBytes.documentation = "Files.GetBytes is a function for getting the contents of a file as an array of bytes instead of as a string. This is useful for things like images.";

        let glob = new vscode.CompletionItem("Glob", vscode.CompletionItemKind.Field);
        glob.documentation = "Files.Glob is a function that returns a list of files whose names match the given shell glob pattern.";

        let lines = new vscode.CompletionItem("Lines", vscode.CompletionItemKind.Field);
        lines.documentation = "Files.Lines is a function that reads a file line-by-line. This is useful for iterating over each line in a file.";

        let asSecrets = new vscode.CompletionItem("AsSecrets", vscode.CompletionItemKind.Field);
        asSecrets.documentation = "Files.AsSecrets is a function that returns the file bodies as Base 64 encoded strings.";

        let asConfig = new vscode.CompletionItem("AsConfig", vscode.CompletionItemKind.Field);
        asConfig.documentation = "Files.AsConfig is a function that returns file bodies as a YAML map.";

        return [
            get,
            getBytes,
            glob,
            lines,
            asSecrets,
            asConfig
        ];
    }

}