import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

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
function isBracketsInPrefix(prefix: string): boolean {
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
export function getValuesFromFile(fileName: string): any {
    const filenames = getValueFileNamesFromConfig().reverse();
    const chartBasePath = getChartBasePath(fileName);
    if (chartBasePath === undefined) {
        return undefined;
    }

    let allYamlContent = '';
    for (const filename of filenames) {
        const pathToValuesFile = path.join(chartBasePath, filename);
        if (!fs.existsSync(pathToValuesFile)) {
            continue;
        }

        try {
            allYamlContent += fs.readFileSync(pathToValuesFile, 'utf8') + '\n';
        } catch (e) {
            vscode.window.showErrorMessage('Error in \'' + filename + '\':\n' + e.message);
        }
    }
    if (allYamlContent === '') {
        vscode.window.showErrorMessage('Could not locate any values.yaml. Is your values file named differently? Configure correct file name in your settings using \'helm-intellisense.customValueFileNames\'');
        return undefined;
    }
    allYamlContent = allYamlContent.replace(/---/gi, '').replace(/\.\.\./gi, '');
    const loadedYaml = yaml.safeLoad(allYamlContent, {json: true});
    if (typeof loadedYaml === undefined || loadedYaml === '') {
        vscode.window.showErrorMessage('Something went wrong parsing value files');
        return undefined;
    }
    return loadedYaml;
}

/**
 * Retrieves the namend-teamplate names from all `*.tpl`.
 */
export function getAllNamedTemplatesFromFiles(filePath: string): string[] {
    const startPath = getChartBasePath(filePath) + path.sep + 'templates';
    const tplFiles: string[] = getAllTplFilesFromDirectoryRecursively(startPath);

    let content = '';
    for (const tplFile of tplFiles) {
        if (!fs.existsSync(tplFile)) {
            continue;
        }
        try {
            content += fs.readFileSync(tplFile, 'utf8') + '\n\n';
        } catch (e) {
            vscode.window.showErrorMessage('Error in \'' + tplFile + '\':\n' + e.message);
        }
    }
    return getListOfNamedTemplates(content);
}

function getAllTplFilesFromDirectoryRecursively(startPath: string): string[] {
    if (!fs.existsSync(startPath)) {
        return [];
    }

    let tplFiles: string[] = [];
    const files: string[] = fs.readdirSync(startPath);
    for (const file of files) {
        const filename = path.join(startPath, file);
        if (fs.lstatSync(filename).isDirectory()) {
            tplFiles = tplFiles.concat(getAllTplFilesFromDirectoryRecursively(filename));
        } else if (filename.indexOf('.tpl') >= 0) {
            tplFiles.push(filename);
        }
    }
    return tplFiles;
}

/**
 * Parses named-template names from the _helpers.tpl files content.
 */
function getListOfNamedTemplates(content: string): string[] {
    const matchRanges = [];

    const templatePattern = /{{-? *define +"(.+?)" *-?}}/g;
    let result;
    while ((result = templatePattern.exec(content)) !== null) {
        matchRanges.push(result[1]);
    }
    return matchRanges;
}

export function getChartBasePath(fileName: string): string | undefined {
    if (!fs.statSync(fileName).isFile()) {
        return undefined;
    }

    let possiblePathToChartDirectory = path.dirname(fileName);
    const dirs = ['templates', 'charts', 'crds'];
    for (const dir of dirs) {
        const lastIndexOf = possiblePathToChartDirectory.lastIndexOf(path.sep + dir);
        if (lastIndexOf !== -1) {
            possiblePathToChartDirectory = possiblePathToChartDirectory.substr(0, lastIndexOf);
            break;
        }
    }

    const currentFilesInDir = fs.readdirSync(possiblePathToChartDirectory);
    if (!currentFilesInDir.includes('Chart.yaml')) {
        return undefined;
    }

    return possiblePathToChartDirectory;
}

export function getNameOfChart(filePath: string): string {
    const chartBasePath = getChartBasePath(filePath);
    if (chartBasePath === undefined) {
        return 'No name found';
    }

    const pathToChartFile = path.join(chartBasePath, 'Chart.yaml');
    if (!fs.existsSync(pathToChartFile)) {
        return 'No name found';
    }

    const chartYaml = yaml.safeLoad(fs.readFileSync(pathToChartFile, 'utf8'));
    return String((chartYaml as any).name);
}

/**
 * Pulls list of possible values filenames from config.
 */
function getValueFileNamesFromConfig(): string[] {
    const customValueFileNames: any = vscode.workspace.getConfiguration('helm-intellisense').get('customValueFileNames');
    const filenames = [];
    for (const filename of customValueFileNames) {
        filenames.push(filename);
    }
    return filenames;
}
