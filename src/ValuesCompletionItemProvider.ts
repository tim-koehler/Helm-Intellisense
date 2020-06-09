import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
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

       
        let currentString = utils.getWordAt(currentLine, position.character - 1).replace('$', '.').trim();

        if (currentString === '.Values.') {
            currentString = currentString.replace('.', '');
            const doc = this.getValuesFromFile(document);
            let currentKey = doc;
            if (currentString.charAt(currentString.length - 1) === '.') {
                // Removing the dot at the end
                currentString = currentString.slice(0, -1);

                if (currentString === 'Values') {
                    return this.getCompletionItemList(currentKey);
                }

                // Removing prefix 'Values.'
                const allKeys = currentString.replace('Values.', '').split('.');

                currentKey = this.updateCurrentKey(currentKey, allKeys);
            } else {
                if (!currentString.includes('Values.')) {
                    return undefined;
                }

                // Removing prefix 'Values.'
                const allKeys = currentString.replace('Values.', '').split('.');
                allKeys.pop();

                currentKey = this.updateCurrentKey(currentKey, allKeys);
            }
            return this.getCompletionItemList(currentKey);
        }

        if (currentString.startsWith('.')) {
            return [new vscode.CompletionItem('Values', vscode.CompletionItemKind.Method)];
        } 

        return [
            new vscode.CompletionItem(".Values", vscode.CompletionItemKind.Method),
        ];
    }

    /**
    * Checks whether the position is part of a values reference.
    */
    isInValuesString(currentLine: string, position: number): boolean {
        return utils.getWordAt(currentLine, position - 1).includes('.Values');
    }

    /**
     * Retrieves the values from the `values.yaml`.
     */
    getValuesFromFile(document: vscode.TextDocument): any {
        const filenames = this.getValueFileNamesFromConfig();
        for (const filename of filenames) {
            const pathToValuesFile = document.fileName.substr(0, document.fileName.lastIndexOf('/templates')) + "/" + filename;	
            if(fs.existsSync(pathToValuesFile)){
                return yaml.safeLoad(fs.readFileSync(pathToValuesFile, 'utf8'));
            }
        }
        vscode.window.showErrorMessage('Could not locate any values.yaml. Is your values file named differently? Configure correct file name in your settings using \'helm-intellisense.customValueFileNames\'');
        return undefined;
    }

    /**
     * Pulls list of possible values filenames from config.
     */
    getValueFileNamesFromConfig():Array<string> {
        const customValueFileNames:any = vscode.workspace.getConfiguration('helm-intellisense').get('customValueFileNames');
        let filenames = [];
        for (const filename of customValueFileNames) {
            filenames.push(filename);
        }
        return filenames;	
    }

    /**
     * Updates the currently active key.
     */
    updateCurrentKey(currentKey: any, allKeys: any): any {
        for (let key in allKeys) {
            if (typeof currentKey[allKeys[key]] === typeof 'string') {
                return undefined;
            }
            currentKey = currentKey[allKeys[key]];
        }
        return currentKey;
    }

    /**
     * Generates a list of possible completions for the current key.
     */
    getCompletionItemList(currentKey: any): vscode.CompletionItem[] {
        const keys = [];
        for (let key in currentKey) {
            // Check if suggestion is an array index
            if(currentKey[key].type !== undefined) {
                continue;
            }
            switch (typeof currentKey[key]) {
                case 'object':
                    keys.push(new vscode.CompletionItem(key, vscode.CompletionItemKind.Method));
                    break;
                case 'string':
                case 'boolean':
                case 'number':
                    let valueItem = new vscode.CompletionItem(key, vscode.CompletionItemKind.Field);	
                    valueItem.documentation = "Value: " + currentKey[key];
                    keys.push(valueItem);
                    break;
                default:
                    console.log("Unknown type: " + typeof currentKey[key]);
                    let unknownItem = new vscode.CompletionItem(key, vscode.CompletionItemKind.Issue);
                    unknownItem.documentation = "Helm-Intellisense could not find type";
                    keys.push(unknownItem);
                    break;
            }
        }
        return keys;
    }

}