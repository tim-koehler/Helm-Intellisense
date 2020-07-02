import * as vscode from 'vscode';
import * as utils from "../utils"; 

export function LintCommand() {
    const doc = vscode.window.activeTextEditor?.document;
    if (doc === undefined) {
        return;
    }

    const keys = getAllKeyPathsOfDocument(doc);
    const values = utils.getValuesFromFile(doc);

    const invalidKeyPaths = getInvalidKeyPaths(keys, values, doc);
    printToOutputChannel(invalidKeyPaths);
}

export function getAllKeyPathsOfDocument(doc: vscode.TextDocument): string[] {
    const txt = doc.getText().split('\n');
    let keys: string[] = [];
    for (let index = 0; index < txt.length; index++) {
        const line = txt[index];
        if (!line.includes('.Values')) {
            continue;
        }
        
        const words = line.split(" ");
        for (let index2 = 0; index2 < words.length; index2++) {
            const word = words[index2];
            if(!word.includes('.Values')) {
                continue;
            }
            keys.push(word);
        }
    }
    return keys;    
}

export function getInvalidKeyPaths(keys: string[], values: any, doc: vscode.TextDocument): string[] {
    let list: string[] =  [];
    for (let index = 0; index < keys.length; index++) {
        const parts = keys[index].split('.');
        parts.shift(); // Remove empty
        parts.shift(); // Remove '.Values'
        
        let current = values;
        for (let index2 = 0; index2 < parts.length; index2++) {
            const element = parts[index2];
            current	= current[element];
        }
        if(current === undefined) {
            list.push("Missing value at path: \"" + keys[index] + "\" in file: " + doc.fileName);
        }
    }
    return list;
}

export function printToOutputChannel(listOfInvalidKeyPaths: string[]) {
    const outChannel = vscode.window.createOutputChannel("Helm-Intellisense");
    for (let index = 0; index < listOfInvalidKeyPaths.length; index++) {
        const element = listOfInvalidKeyPaths[index];       
        outChannel.appendLine(element);
    }
    if (listOfInvalidKeyPaths.length === 0) {
        outChannel.appendLine("Helm-Intellisense: No issues detected :)");
    }
    outChannel.show();
}