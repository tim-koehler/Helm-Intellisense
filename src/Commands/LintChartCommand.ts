import * as vscode from 'vscode';
import * as utils from '../utils';
import * as fs from 'fs';
import { getAllKeyPathsOfDocument, getInvalidKeyPaths, printToOutputChannel } from './LintCommand';
import { sep } from 'path';

export async function LintChartCommand(outputChannel: vscode.OutputChannel): Promise<void> {
    const doc = vscode.window.activeTextEditor?.document;
    if (doc === undefined) {
        return;
    }

    const chartBasePath = utils.getChartBasePath(doc.fileName);
    if (chartBasePath === undefined) {
        return;
    }

    const templates = walkDirectory(chartBasePath + sep + 'templates');
    let listOfInvalidKeyPaths: string[] = [];
    for (let index = 0; index < templates.length; index++) {
        await vscode.workspace.openTextDocument(templates[index]).then(template => {
            const keys = getAllKeyPathsOfDocument(template);
            const values = utils.getValuesFromFile(template.fileName);

            listOfInvalidKeyPaths = listOfInvalidKeyPaths.concat(getInvalidKeyPaths(keys, values, template));
        });
    }
    printToOutputChannel(listOfInvalidKeyPaths, outputChannel);
    if (listOfInvalidKeyPaths.length !== 0) {
        return;
    }
    vscode.window.showInformationMessage(`No errors found in chart '${utils.getNameOfChart(doc.fileName)}' :)`);
}

function walkDirectory(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = dir + sep + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            /* Recurse into a subdirectory */
            results = results.concat(walkDirectory(file));
        } else {
            /* Is a file */
            if (file.endsWith('.yaml') || file.endsWith('.yml')) {
                results.push(file);
            }
        }
    });
    return results;
}
