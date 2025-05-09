import * as vscode from 'vscode';
import * as yaml from './yaml';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as tarStream from 'tar-stream';

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

    const completeFilePaths = [];
    for (const filename of filenames) {
        completeFilePaths.push(...getAllFilesFromDirectoryRecursively(path.join(chartBasePath, filename)));
    }

    return yaml.loadMerge(completeFilePaths);
}

/**
 * Retrieves the named-templates names from all files.
 */
export function getAllNamedTemplatesFromFiles(filePath: string): Map<string, string> {
    const startPath = getChartBasePath(filePath) + path.sep + 'templates';
    const files: string[] = getAllFilesFromDirectoryRecursively(startPath);

    const templates = new Map<string, string>();
    for (const tplFile of files) {
        if (!fs.existsSync(tplFile)) {
            continue;
        }
        try {
            const tpls = getListOfNamedTemplates(fs.readFileSync(tplFile, 'utf8'));
            for (const tpl of tpls) {
                templates.set(tpl, tplFile);
            }
        } catch (e) {
            vscode.window.showErrorMessage(`Error in '${tplFile}': ${(e as Error).message}`);
        }
    }
    return templates;
}

/**
 * Retrieves the named-template names from all parent charts.
 */
export async function getAllNamedTemplatesFromParentCharts(filePath: string): Promise<Map<string, string>> {
    const templates = new Map<string, string>();

    const chartYamlPath = getChartBasePath(filePath) + path.sep + 'Chart.yaml';
    if (!fs.existsSync(chartYamlPath)) {
        return templates;
    }

    const chartYaml = yaml.load(chartYamlPath);
    if (chartYaml === undefined) {
        return templates;
    }

    const relativeDependencyChartPaths = getRelativeDependencyChartPaths(chartYaml);


    for (const chartPath of relativeDependencyChartPaths) {
        const chartTemplatesPath = path.join(getChartBasePath(filePath) + path.sep, chartPath, 'templates');
        const files = getAllFilesFromDirectoryRecursively(chartTemplatesPath);
        for (const tplFile of files) {
            if (!fs.existsSync(tplFile)) {
                continue;
            }
            try {
                const tpls = getListOfNamedTemplates(fs.readFileSync(tplFile, 'utf8'));
                for (const tpl of tpls) {
                    templates.set(tpl, tplFile);
                }
            } catch (e) {
                vscode.window.showErrorMessage(`Error in '${tplFile}': ${(e as Error).message}`);
            }
        }
    }

    const chartsDirPath = path.join(getChartBasePath(filePath) + path.sep, 'charts');
    if (!fs.existsSync(chartsDirPath)) {
        return templates;
    }

    const chartFiles = fs.readdirSync(chartsDirPath);
    const tarGzPromises: Promise<Map<string, string>>[] = [];

    for (const chartFile of chartFiles) {
        const chartFilePath = path.join(chartsDirPath, chartFile);
        if (fs.statSync(chartFilePath).isFile() && chartFile.endsWith('.tgz')) {
            tarGzPromises.push(getTarGzFileContents(chartFilePath));
        }
    }

    const tarGzContents = await Promise.all(tarGzPromises);
    for (const item of tarGzContents) {
        for (const [fileName, content] of item.entries()) {
            const tpls = getListOfNamedTemplates(content.toString());
            for (const tpl of tpls) {
                templates.set(tpl, fileName.toString());
            }
        }
    }

    return templates;
}

/**
 * Recursively gets all files from the given directory and all subdirectories.
 * Returns an empty array, if the `startPath` does not exist.
 *
 * @param startPath The path at which to start.
 */
function getAllFilesFromDirectoryRecursively(startPath: string): string[] {
    if (!fs.existsSync(startPath)) {
        return [];
    }

    const out: string[] = [];
    const files = fs.readdirSync(startPath, { withFileTypes: true });
    for (const file of files) {
        const filename = path.join(startPath, file.name);
        if (file.isDirectory()) {
            out.push(...getAllFilesFromDirectoryRecursively(filename));
        } else {
            out.push(filename);
        }
    }
    return out;
}

/**
 * Parses named-template names from the _helpers.tpl files content.
 */
function getListOfNamedTemplates(content: string): string[] {
    const matchRanges = new Set<string>();

    const templatePattern = /{{-? *define +"(.+?)" *-?}}/g;
    let result;
    while ((result = templatePattern.exec(content)) !== null) {
        matchRanges.add(result[1]);
    }
    return Array.from(matchRanges);
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

export function getNameOfChart(filePath: string): string | undefined {
    const chartBasePath = getChartBasePath(filePath);
    if (chartBasePath === undefined) {
        return 'No name found';
    }

    const pathToChartFile = path.join(chartBasePath, 'Chart.yaml');
    if (!fs.existsSync(pathToChartFile)) {
        return 'No name found';
    }

    const chartYaml = yaml.load(pathToChartFile);
    if (chartYaml === undefined) {
        return undefined;
    }
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

/**
 * Pulls list of all parent chart dependency paths from Chart.yaml.
 */
function getRelativeDependencyChartPaths(chartYaml: yaml.Yaml): string[] {
    const dependencies = (chartYaml as any).dependencies;
    if (dependencies === undefined) {
        return [];
    }

    const localChartDependencyPaths: string[] = [];
    for (const dependency of dependencies) {
        const repository = dependency.repository;
        if (repository === undefined) {
            continue;
        }
        if (!repository.startsWith('file://')) {
            continue;
        }
        const chartPath = repository.replace('file://', '');
        localChartDependencyPaths.push(chartPath);
    }
    return localChartDependencyPaths;
}

function getTarGzFileContents(filePath: string): Promise<Map<string, string>> {
    const extract = tarStream.extract();
    const fileStream = fs.createReadStream(filePath);
    const gunzip = zlib.createGunzip();

    const fileContent = new Map<string, string>();
    extract.on('entry', (header, stream, next) => {
        if (header.name.endsWith('.tpl') || header.name.endsWith('.yaml') || header.name.endsWith('.yml')) {
            let data = '';
            stream.on('data', chunk => data += chunk.toString());
            stream.on('end', () => {
                fileContent.set(header.name, data);
                next();
            });
            stream.resume();
        } else {
            stream.resume();
            next();
        }
    });

    return new Promise((resolve, reject) => {
        fileStream
            .pipe(gunzip)
            .pipe(extract)
            .on('finish', () => {
                resolve(fileContent);
            })
            .on('error', (err: any) => {
                reject(err);
            });
    });
}

