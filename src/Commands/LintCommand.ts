import * as vscode from 'vscode';
import * as utils from '../utils';

export function LintCommand(outputChannel: vscode.OutputChannel): void {
    const doc = vscode.window.activeTextEditor?.document;
    if (doc === undefined) {
        return;
    }

    if (utils.getChartBasePath(doc.fileName) === undefined) {
        return;
    }

    const keys = getAllKeyPathsOfDocument(doc);
    const values = utils.getValuesFromFile(doc.fileName);
    const invalidKeyPaths = getInvalidKeyPaths(keys, values, doc);

    const usedTpls = getAllUsedNamedTemplatesOfDocument(doc);
    const definedTpls = utils.getAllNamedTemplatesFromFiles(doc.fileName);
    const invalidTpls = getInvalidTpls(usedTpls, definedTpls, doc);

    printToOutputChannel(invalidKeyPaths.concat(invalidTpls), outputChannel);
}

export function getAllUsedNamedTemplatesOfDocument(doc: vscode.TextDocument): [string, number][] {
    const txt = doc.getText().split('\n');

    const map = new Array<[string, number]>();
    for (let lineIndex = 0; lineIndex < txt.length; lineIndex++) {
        const line = txt[lineIndex];
        const regex = /\{\{-? *(template|include) +"(.+?)".*?\}\}/g;
        const result = regex.exec(line);
        if (result === null) {
            continue;
        }
        map.push([result[2], lineIndex]);
    }
    return map;
}

export function getAllKeyPathsOfDocument(doc: vscode.TextDocument): [string, number][] {
    const txt = doc.getText().split('\n');

    const map = new Array<[string, number]>();
    for (let lineIndex = 0; lineIndex < txt.length; lineIndex++) {
        const line = txt[lineIndex];
        if (!line.includes('.Values')) {
            continue;
        }

        const regex = /\{\{-? ?(else )?if .*?\}\}/g;
        if (regex.exec(line) !== null) {
            continue;
        }

        const words = line.split(' ');
        for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
            let word = words[wordIndex];
            if (!word.includes('.Values')) {
                continue;
            }

            word = word.replace('{{', '').replace('}}', '').replace('(', '').replace(')', '');
            map.push([word, lineIndex]);
        }
    }
    return map;
}

export function getInvalidKeyPaths(map: [string, number][], values: any, doc: vscode.TextDocument): string[] {
    const list: string[] = [];

    map.forEach(element => {
        const key = element[0];
        const lineNumber = element[1];

        const parts = key.split('.');
        parts.shift(); // Remove empty
        parts.shift(); // Remove '.Values'

        let current = values;
        for (let index = 0; index < parts.length; index++) {
            const element = parts[index];
            current = current[element];
            if (current === undefined) {
                if (isDefaultDefined(lineNumber, doc)) {
                    break;
                }
                list.push(`Missing value at path [${key}] in file [${doc.fileName}:${lineNumber + 1}]`);
                break;
            }
        }
    });

    return list;
}


export function getInvalidTpls(map: [string, number][], definedTpls: string[], doc: vscode.TextDocument): string[] {
    const list: string[] = [];

    map.forEach(element => {
        const usedTpl = element[0];
        const lineNumber = element[1];

        if (!definedTpls.includes(usedTpl)) {
            list.push(`Undefined Named-Template '${usedTpl}' in file [${doc.fileName}:${lineNumber + 1}]`);
        }
    });
    return list;
}

export function isDefaultDefined(lineNumber: number, doc: vscode.TextDocument): boolean {
    const line = doc.getText(new vscode.Range(new vscode.Position(lineNumber, 0), new vscode.Position(lineNumber + 1, 0)));
    return line.includes('| default');
}

export function printToOutputChannel(listOfErrors: string[], outputChannel: vscode.OutputChannel): void {
    if (listOfErrors.length === 0) {
        outputChannel.clear();
        outputChannel.hide();
        return;
    }
    outputChannel.clear();
    for (let index = 0; index < listOfErrors.length; index++) {
        const element = listOfErrors[index];
        outputChannel.appendLine(element);
    }
    outputChannel.show(true);
}
