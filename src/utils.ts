import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

/**
 * Checks whether the position in the line is in between curly brackets.
 */
export function isInsideBrackets(currentLine: string, position: number): boolean {
    const prefix = currentLine.substring(0, position);

    if(!isBracketsInPrefix(prefix)) {
        return false;
    }
    return true;
}

/**
 * Checks whether string before cursor contains'{{' or not
 */
function isBracketsInPrefix(prefix: string) {
    let prevChar = '';
    for (let index = prefix.length - 1; index >= 0; index--) {
        if (prefix.charAt(index) === '}') {
            return false;
        }
        if (prefix.charAt(index) === '{' && prevChar === '{') {
            return true;
        }
        prevChar = prefix.charAt(index);
    }
    return false;
}

/**
 * Checks whether the position is part of a values reference.
 */
export function isInValuesString(currentLine: string, position: number): boolean {
    return getWordAt(currentLine, position - 1).includes('.Values');
}

/**
 * Retrieves the word at and around the position. A word is considered to be
 * the sequence of characters from the last and to the next whitespace.
 */
export function getWordAt(str: string, pos: number): string {
    const left = str.slice(0, pos + 1).search(/\S+$/);
    const right = str.slice(pos).search(/\s/);

    if (right < 0) {
        return str.slice(left);
    }

    return str.slice(left, right + pos);
}

/**
 * Retrieves the values from the `values.yaml`.
 */
export function getValuesFromFile(document: vscode.TextDocument): any {
    const filenames = getValueFileNamesFromConfig();
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
function getValueFileNamesFromConfig():Array<string> {
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
export function updateCurrentKey(currentKey: any, allKeys: any): any {
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
export function getCompletionItemList(currentKey: any): vscode.CompletionItem[] {
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