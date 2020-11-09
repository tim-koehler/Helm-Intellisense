import * as vscode from 'vscode';
import * as utils from "../utils"; 

export function LintCommand(outputChannel: vscode.OutputChannel) {
    const doc = vscode.window.activeTextEditor?.document;
    if (doc === undefined) {
        return;
    }

    if (utils.getChartBasePath(doc) === undefined) {
        return;
    }

    const keys = getAllKeyPathsOfDocument(doc);
    const values = utils.getValuesFromFile(doc);

    const invalidKeyPaths = getInvalidKeyPaths(keys, values, doc);
    printToOutputChannel(invalidKeyPaths, outputChannel);
}

export function getAllKeyPathsOfDocument(doc: vscode.TextDocument): Array<[string, number]> {
    const txt = doc.getText().split('\n');
    
    let map = new Array<[string, number]>();
    for (let lineIndex = 0; lineIndex < txt.length; lineIndex++) {
        const line = txt[lineIndex];
        if (!line.includes('.Values')) {
            continue;
        }

        if(line.includes('{{ if') || line.includes('{{- if')) {
            continue;
        }
        
        const words = line.split(" ");
        for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
            let word = words[wordIndex];
            if(!word.includes('.Values')) {
                continue;
            }

            word = word.replace('{{', '').replace('}}', '');

            console.log(word);
            map.push([word, lineIndex]);
        }
    }
    return map;    
}

export function getInvalidKeyPaths(map: Array<[string, number]>, values: any, doc: vscode.TextDocument): string[] {
    let list: string[] =  [];
    
    map.forEach(element => {
        const key = element[0];
        const lineNumber = element[1];

        const parts = key.split('.');
        parts.shift(); // Remove empty
        parts.shift(); // Remove '.Values'
        
        let current = values;
        for (let index = 0; index < parts.length; index++) {
            const element = parts[index];     
            current	= current[element];
            if(current === undefined) {
                if(isDefaultDefined(lineNumber, doc)) {
                    break;
                }
                list.push(`Missing value at path [${key}] in file [${doc.fileName}:${lineNumber + 1}]`);
                break;
            }
        } 
    });
    
    return list;
}

export function isDefaultDefined(lineNumber: number, doc: vscode.TextDocument ): boolean {
    const line = doc.getText(new vscode.Range(new vscode.Position(lineNumber, 0), new vscode.Position(lineNumber + 1, 0)));
    return line.includes('| default');
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
    outputChannel.show(true);
}