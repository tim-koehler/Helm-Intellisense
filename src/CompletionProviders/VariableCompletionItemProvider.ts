import * as vscode from 'vscode';
import * as utils from '../utils';

type Variable = { key: string; value: string };

const ZERO_POSITION = new vscode.Position(0, 0);
const VARIABLE_DECLARATION_PATTERN = /{{-?\s*\$(?<key>[a-zA-Z0-9_]+?)\s*:=\s*(?<value>.+?)\s*-?}}/g;

export class VariableCompletionItemProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[]> {
        const currentLine = document.lineAt(position).text;
        if (!utils.isInsideBrackets(currentLine, position.character)) {
            return undefined;
        }

        return getDefinedVariables(document, position)
            .map(toCompletionItem);
    }
}

function toCompletionItem(variable: Variable): vscode.CompletionItem {
    const completionItem = new vscode.CompletionItem(variable.key, vscode.CompletionItemKind.Variable);
    completionItem.detail = variable.value;
    return completionItem;
}

/**
 * Returns a record of all variables defined above the given position.
 */
function getDefinedVariables(document: vscode.TextDocument, position: vscode.Position): Variable[] {
    const previousText = document.getText(new vscode.Range(ZERO_POSITION, position));
    return getVariables(previousText);
}

/**
 * Extracts all variable declarations from the given string. Declared variables
 * are returned as a Record, mapping variable names to variable values.
 *
 * @param str The string in which to search for variable declarations.
 */
function getVariables(str: string): Variable[] {
    let result;
    const templates: Variable[] = [];
    while ((result = VARIABLE_DECLARATION_PATTERN.exec(str)) !== null) {
        if (result.groups === undefined) {
            console.warn('getDefinedVariables: capture groups are unexpectedly undefined.');
            continue;
        }
        templates.push({key: result.groups.key, value: result.groups.value.trim()});
    }
    return templates;
}
