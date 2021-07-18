import * as vscode from 'vscode';
import * as utils from '../utils';

const ZERO_POSITION = new vscode.Position(0, 0);
const VARIABLE_DECLARATION_PATTERN = /{{-?\s*\$(?<key>[a-zA-Z0-9_]+?)\s*:=\s*(?<value>.+?)\s*-?}}/g;

export class VariableCompletionItemProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[]> {
        const currentLine = document.lineAt(position).text;
        if (!utils.isInsideBrackets(currentLine, position.character)) {
            return undefined;
        }

        const definedVariables = getDefinedVariables(document, position);
        return Object.keys(definedVariables)
            .map(key => new vscode.CompletionItem(key.trim(), vscode.CompletionItemKind.Variable));
    }
}

/**
 * Returns a record of all variables defined above the given position.
 */
function getDefinedVariables(document: vscode.TextDocument, position: vscode.Position): Record<string, string> {
    const previousText = document.getText(new vscode.Range(ZERO_POSITION, position));
    return getVariables(previousText);
}

/**
 * Extracts all variable declarations from the given string. Declared variables
 * are returned as a Record, mapping variable names to variable values.
 *
 * @param str The string in which to search for variable declarations.
 */
function getVariables(str: string): Record<string, string> {
    let result;
    const templates: Record<string, string> = {};
    while ((result = VARIABLE_DECLARATION_PATTERN.exec(str)) !== null) {
        if (result.groups === undefined) {
            console.warn('getDefinedVariables: capture groups are unexpectedly undefined.');
            continue;
        }
        templates[result.groups.key] = result.groups.value;
    }
    return templates;
}
