import * as vscode from 'vscode';
import * as utils from "../utils"; 

export function LintCommand(outputChannel: vscode.OutputChannel) {
    const doc = vscode.window.activeTextEditor?.document;
    if (doc === undefined) {
        return;
    }

    const keys = getAllKeyPathsOfDocument(doc);
    const values = utils.getValuesFromFile(doc);

    const invalidKeyPaths = getInvalidKeyPaths(keys, values, doc);
    printToOutputChannel(invalidKeyPaths, outputChannel);
}

export function getAllKeyPathsOfDocument(doc: vscode.TextDocument): Map<string, number> {
    const txt = doc.getText().split('\n');
    
    let map = new Map<string, number>();
    for (let lineIndex = 0; lineIndex < txt.length; lineIndex++) {
        const line = txt[lineIndex];
        if (!line.includes('.Values')) {
            continue;
        }
        
        const words = line.split(" ");
        for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
            const word = words[wordIndex];
            if(!word.includes('.Values')) {
                continue;
            }
            map.set(word, lineIndex+1);
        }
    }
    return map;    
}

export function getInvalidKeyPaths(map: Map<string, number>, values: any, doc: vscode.TextDocument): string[] {
    let list: string[] =  [];
    map.forEach((lineNumber: number, key: string) => {
        const parts = key.split('.');
        parts.shift(); // Remove empty
        parts.shift(); // Remove '.Values'
        
        let current = values;
        for (let index = 0; index < parts.length; index++) {
            const element = parts[index];
            current	= current[element];
            if (current === undefined) {
                break;
            }
        }
        if(current === undefined) {
            list.push(`Missing value at path [${key}] in file [${doc.fileName}:${lineNumber}]`);
        }
    });
    return list;
}

export function printToOutputChannel(listOfInvalidKeyPaths: string[], outputChannel: vscode.OutputChannel) {
    if (listOfInvalidKeyPaths.length === 0) {
        outputChannel.clear();
        outputChannel.hide();
        return;
    }
    outputChannel.clear();
    for (let index = 0; index < listOfInvalidKeyPaths.length; index++) {
        const element = listOfInvalidKeyPaths[index];       
        outputChannel.appendLine(element);
    }
    outputChannel.show();
}