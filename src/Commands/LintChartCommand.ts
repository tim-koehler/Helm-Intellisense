import * as vscode from 'vscode';
import * as utils from "../utils"; 
import * as fs from 'fs';
import { getAllKeyPathsOfDocument, getInvalidKeyPaths, printToOutputChannel } from './LintCommand';

export async function LintChartCommand(outputChannel: vscode.OutputChannel) {
    const doc = vscode.window.activeTextEditor?.document;
    if (doc === undefined) {
        return;
    }

    const chartBasePath = utils.getChartBasePath(doc);
    if (chartBasePath === undefined) {
        return;
    }

    const templates = walkDirectory(chartBasePath + "/templates");
    let listOfInvalidKeyPaths: string[] = []; 
    for (let index = 0; index < templates.length; index++) {
        await vscode.workspace.openTextDocument(templates[index]).then(template => {
            const keys = getAllKeyPathsOfDocument(template);
            const values = utils.getValuesFromFile(template);
            
            listOfInvalidKeyPaths = listOfInvalidKeyPaths.concat(getInvalidKeyPaths(keys, values, template));
        });   
    }
    printToOutputChannel(listOfInvalidKeyPaths, outputChannel);
}

function walkDirectory(dir: string) {
    var results: string[] = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        var stat = fs.statSync(file);
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