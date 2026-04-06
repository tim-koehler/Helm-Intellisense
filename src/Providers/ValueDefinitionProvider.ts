import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ValueHierarchyService } from '../Services/ValueHierarchyService';
import * as utils from '../utils';

export class ValueDefinitionProvider implements vscode.DefinitionProvider {
    constructor(private valueHierarchyService: ValueHierarchyService) {}

    async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | undefined> {
        const currentLine = document.lineAt(position).text;

        // Check if we're inside a {{ }} block
        if (!utils.isInsideBrackets(currentLine, position.character)) {
            return undefined;
        }

        // Extract the value path
        const valuePath = this.extractValuePath(currentLine, position);
        if (!valuePath) {
            return undefined;
        }

        // Get all references to this value across the chart hierarchy
        const references = this.valueHierarchyService.getValueHierarchy(
            document.fileName,
            valuePath
        );

        if (references.length === 0) {
            return undefined;
        }

        const locations: vscode.Location[] = [];

        for (const ref of references) {
            const location = await this.findValueLocation(ref);
            if (location) {
                locations.push(location);
            }
        }

        return locations;
    }

    private extractValuePath(line: string, position: vscode.Position): string | undefined {
        const match = line.match(/\{\{.*?\}\}/g);
        if (!match) {
            return undefined;
        }

        for (const expr of match) {
            const startIdx = line.indexOf(expr);
            const endIdx = startIdx + expr.length;

            if (position.character >= startIdx && position.character <= endIdx) {
                // Extract the value path from the expression
                const content = expr.substring(2, expr.length - 2).trim();

                // Handle various formats: .Values.xxx, $.Values.xxx, etc.
                const valueMatch = content.match(/\.Values\.([^\s}]+)/);
                if (valueMatch) {
                    return valueMatch[1];
                }
            }
        }

        return undefined;
    }

    private async findValueLocation(ref: any): Promise<vscode.Location | undefined> {
        const valuesFile = path.join(ref.chartPath, 'values.yaml');

        if (!fs.existsSync(valuesFile)) {
            return undefined;
        }

        try {
            const content = fs.readFileSync(valuesFile, 'utf8');
            const lines = content.split('\n');

            // Parse the path to find the key
            const pathParts = ref.valuePath.split('.');
            let currentIndent = 0;
            let lineNumber = -1;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmedLine = line.trim();

                if (trimmedLine === '' || trimmedLine.startsWith('#')) {
                    continue;
                }

                const indent = line.length - line.trimStart().length;

                // Look for each part of the path in sequence
                for (let j = 0; j < pathParts.length; j++) {
                    const part = pathParts[j];
                    const pattern = new RegExp(`^${part}:`);

                    if (j === 0 && indent === 0 && pattern.test(trimmedLine)) {
                        // Found root key
                        if (pathParts.length === 1) {
                            lineNumber = i;
                            break;
                        }
                        currentIndent = indent;
                    } else if (j > 0 && indent > currentIndent && pattern.test(trimmedLine)) {
                        // Found nested key
                        if (j === pathParts.length - 1) {
                            lineNumber = i;
                            break;
                        }
                        currentIndent = indent;
                    }
                }

                if (lineNumber !== -1) {
                    break;
                }
            }

            if (lineNumber !== -1) {
                const uri = vscode.Uri.file(valuesFile);
                const position = new vscode.Position(lineNumber, 0);
                return new vscode.Location(uri, position);
            }
        } catch (error) {
            console.error(`Error finding value location: ${error}`);
        }

        return undefined;
    }
}