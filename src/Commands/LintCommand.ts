import * as vscode from 'vscode';
import * as utils from '../utils';

export enum ElementType {
    KEY_PATH,
    TEMPLATE
}

export type Element = {
    name: string;
    line: number;
    range: vscode.Range;
    type: ElementType;
};

export function LintCommand(collection: vscode.DiagnosticCollection, doc: vscode.TextDocument | undefined = vscode.window.activeTextEditor?.document): boolean {
    if (doc === undefined) {
        return false;
    }

    const excludes = vscode.workspace.getConfiguration('helm-intellisense').get('excludeFromLinting');
    if (!Array.isArray(excludes)) {
        return false;
    }
    
    for (const exclude of excludes) {
        if (typeof exclude !== 'string') {
            continue;
        }

        if (exclude.includes('*')) {
            const splits = exclude.split('*');
            if (doc.fileName.endsWith(splits[splits.length -1])) {
                clearErrors(doc, collection);
                return false;
            }
        } else {
            if (doc.fileName.includes(exclude)) {
                clearErrors(doc, collection);
                return false;
            }
        }
    }    

    if (utils.getChartBasePath(doc.fileName) === undefined) {
        return false;
    }
    
    const keyElements = getAllKeyPathElementsOfDocument(doc);
    const values = utils.getValuesFromFile(doc.fileName);
    const errorKeyPathElements = getInvalidKeyPaths(keyElements, values, doc);

    const usedTplElements = getAllUsedNamedTemplateElementsOfDocument(doc);
    const definedTpls = utils.getAllNamedTemplatesFromFiles(doc.fileName);
    const errorTplElements = getInvalidTpls(usedTplElements, definedTpls);

    const allErrorElementsCombined = errorKeyPathElements.concat(errorTplElements);
    markErrors(allErrorElementsCombined, doc, collection);
    return allErrorElementsCombined.length > 0;
}

export function getAllUsedNamedTemplateElementsOfDocument(doc: vscode.TextDocument): Element[] {
    const txt = doc.getText().split('\n');

    const elementArray = new Array<Element>();
    for (let lineIndex = 0; lineIndex < txt.length; lineIndex++) {
        const line = txt[lineIndex];
        const regex = /\{\{-? *(template|include) +"(.+?)".*?\}\}/g;
        const result = regex.exec(line);
        if (result === null) {
            continue;
        }
        elementArray.push({
            line: lineIndex,
            name: result[2],
            range: new vscode.Range(new vscode.Position(lineIndex, line.indexOf(result[2])), new vscode.Position(lineIndex, line.indexOf(result[2]) + result[2].length)),
            type: ElementType.TEMPLATE,
        });
    }
    return elementArray;
}

export function getAllKeyPathElementsOfDocument(doc: vscode.TextDocument): Element[] {
    const txt = doc.getText().split('\n');

    const elementArray = new Array<Element>();
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

        for (let word of words) {
            if (!word.includes('.Values')) {
                continue;
            }

            word = word.replace('{{', '').replace('}}', '').replace('(', '').replace(')', '');
            elementArray.push({
                line: lineIndex,
                name: word,
                range: new vscode.Range(new vscode.Position(lineIndex, line.indexOf(word)), new vscode.Position(lineIndex, line.indexOf(word) + word.length)),
                type: ElementType.KEY_PATH,
            });
        }
    }
    return elementArray;
}

export function getInvalidKeyPaths(elements: Element[], values: any, doc: vscode.TextDocument): Element[] {
    const errorElements = new Array<Element>();
    elements.forEach(element => {
        const parts = element.name.split('.');
        parts.shift(); // Remove empty
        parts.shift(); // Remove '.Values'
        
        let current = values;
        for (const part of parts) {
            current = current[part];
            if (current === undefined) {
                if (isDefaultDefined(element.line, doc)) {
                    break;
                }
                errorElements.push(element);
            }
        }
    });
    return errorElements;
}

export function getInvalidTpls(elements: Element[], definedTpls: string[]): Element[] {
    const errorElements = new Array<Element>();
    elements.forEach(element => {
        if (!definedTpls.includes(element.name)) {
            errorElements.push(element);
        }
    });
    return errorElements;
}

export function isDefaultDefined(lineNumber: number, doc: vscode.TextDocument): boolean {
    const line = doc.getText(new vscode.Range(new vscode.Position(lineNumber, 0), new vscode.Position(lineNumber + 1, 0)));
    return line.includes('| default');
}

export function clearErrors(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
    collection.set(document.uri, []);
}

export function markErrors(elements: Element[], document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
    collection.set(document.uri, createDiagnosticsArray(elements, document.uri));
}

function createDiagnosticsArray(elements: Element[], uri: vscode.Uri): vscode.Diagnostic[] {
    const diagnostics = new Array<vscode.Diagnostic>();
    elements.forEach(element => {
        let message = '';
        switch (element.type) {
            case ElementType.KEY_PATH:
                message = 'Value not defined';
                break;
            case ElementType.TEMPLATE:
                message = 'Template not defined';
                break;
            default:
                break;
        }

        diagnostics.push({
            code: '',
            message: message,
            range: element.range,
            severity: vscode.DiagnosticSeverity.Error,
            source: 'Helm-Intellisense',
            relatedInformation: [new vscode.DiagnosticRelatedInformation(new vscode.Location(uri, element.range), element.name)]
        });
        
    });
    return diagnostics;
}