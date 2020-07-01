import * as vscode from 'vscode';
import * as utils from "../utils"; 
import * as fs from 'fs';
import { getAllKeyPathsOfDocument, validateKeyPathExists } from './LintCommand';

export function LintChartCommand() {
    const doc = vscode.window.activeTextEditor?.document;
    if (doc === undefined) {
        return;
    }

    const chartBasePath = utils.getChartBasePath(doc);
    if (chartBasePath === undefined) {
        return;
    }

    const templates = walkDirectory(chartBasePath + "/templates");
    for (let index = 0; index < templates.length; index++) {
        vscode.workspace.openTextDocument(templates[index]).then(template => {
            const keys = getAllKeyPathsOfDocument(template);
            const values = utils.getValuesFromFile(template);
            validateKeyPathExists(keys, values, template);
        });   
    }
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