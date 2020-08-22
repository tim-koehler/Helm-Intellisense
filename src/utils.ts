import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { sep as pathSeperator } from 'path';

/**
 * Checks whether the position in the line is in between curly brackets.
 */
export function isInsideBrackets(currentLine: string, position: number): boolean {
    const prefix = currentLine.substring(0, position);
    return isBracketsInPrefix(prefix);
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
 * Retrieves the word at and around the position. A word is considered to be
 * the sequence of characters from the last and to the next whitespace.
 */
export function getWordAt(str: string, pos: number): string {
    const left = str.slice(0, pos + 1).search(/\S+$/);
    return str.slice(left, pos + 1);
}

/**
 * Retrieves the values from the `values.yaml`.
 */
export function getValuesFromFile(document: vscode.TextDocument): any {
    const filenames = getValueFileNamesFromConfig();
    for (const filename of filenames) {
        const pathToValuesFile = getChartBasePath(document) + pathSeperator + filename;
        if(fs.existsSync(pathToValuesFile)){
            return yaml.safeLoad(fs.readFileSync(pathToValuesFile, 'utf8'));
        }
    }
    vscode.window.showErrorMessage('Could not locate any values.yaml. Is your values file named differently? Configure correct file name in your settings using \'helm-intellisense.customValueFileNames\'');
    return undefined;
}


export function getChartBasePath(document: vscode.TextDocument): string | undefined {
    const pathToChartDirectory = document.fileName.substr(0, document.fileName.lastIndexOf(pathSeperator + 'templates'));

    if(pathToChartDirectory !== '' && fs.existsSync(pathToChartDirectory)){
        return pathToChartDirectory;
    }

    const currentFilePath = document.fileName.substring(0, document.fileName.lastIndexOf(pathSeperator));
    const currentFilesInDir = fs.readdirSync(currentFilePath);
    if (currentFilesInDir.includes("Chart.yaml") && currentFilesInDir.includes("templates")) {
        return currentFilePath;
    } 

    return undefined;
}


export function getChartName(basePath: string): any {
    const pathToChartFile = basePath + pathSeperator + 'Chart.yaml';
    if(fs.existsSync(pathToChartFile)){
        const chartYaml = yaml.safeLoad(fs.readFileSync(pathToChartFile, 'utf8'));
        return String(chartYaml.name);
    }
    return 'Not found';
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
