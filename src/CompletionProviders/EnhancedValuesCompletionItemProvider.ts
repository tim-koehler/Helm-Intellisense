import * as vscode from 'vscode';
import * as utils from '../utils';
import { ValueHierarchyService } from '../Services/ValueHierarchyService';

export class EnhancedValuesCompletionItemProvider implements vscode.CompletionItemProvider {
    constructor(private valueHierarchyService: ValueHierarchyService) {}

    /**
     * Generates a list of completion items based on the current position in the
     * document, with awareness of chart hierarchy and subchart contexts.
     */
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const currentLine = document.lineAt(position).text;

        if (!utils.isInsideBrackets(currentLine, position.character)) {
            return undefined;
        }

        const currentString = utils.getWordAt(currentLine, position.character - 1).replace('$.', '.').trim();

        if (currentString.length === 0) {
            return [new vscode.CompletionItem('.Values', vscode.CompletionItemKind.Method)];
        }

        if (currentString.startsWith('.') && !currentString.includes('.Values') && currentString.split('.').length < 3) {
            return [new vscode.CompletionItem('Values', vscode.CompletionItemKind.Method)];
        }

        if (currentString.startsWith('.Values.')) {
            return this.getHierarchicalCompletions(document, currentString);
        }

        return undefined;
    }

    private getHierarchicalCompletions(
        document: vscode.TextDocument,
        currentString: string
    ): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        const chart = this.valueHierarchyService.getChartForFile(document.fileName);

        if (!chart) {
            // Fall back to standard values completion
            return this.getStandardCompletions(document, currentString);
        }

        const valuePath = currentString.replace('.Values.', '');
        const allValues = this.valueHierarchyService.getAllValuesForChart(chart);

        // Get completion items for current context
        if (valuePath === '') {
            // Root level - show all available keys including subchart names
            const rootKeys = new Set<string>();

            // Add current chart's values
            for (const [fullPath] of allValues) {
                const firstKey = fullPath.split('.')[0];
                rootKeys.add(firstKey);
            }

            // Add subchart names as completion items
            for (const [subchartName, subchart] of chart.subcharts) {
                const subchartItem = new vscode.CompletionItem(
                    subchartName,
                    vscode.CompletionItemKind.Module
                );
                subchartItem.documentation = new vscode.MarkdownString(
                    `**Subchart:** ${subchartName}\n\nAccess values for the ${subchartName} subchart`
                );
                subchartItem.detail = `Subchart: ${subchart.name}`;
                items.push(subchartItem);
                rootKeys.delete(subchartName); // Remove to avoid duplicates
            }

            // Add regular value keys
            for (const key of rootKeys) {
                const value = allValues.get(key);
                items.push(this.createCompletionItem(key, value, chart.name));
            }
        } else {
            // Nested path - show available sub-keys
            const pathWithDot = valuePath.endsWith('.') ? valuePath : valuePath + '.';
            const addedKeys = new Set<string>();

            for (const [fullPath] of allValues) {
                if (fullPath.startsWith(pathWithDot)) {
                    const remainingPath = fullPath.substring(pathWithDot.length);
                    const nextKey = remainingPath.split('.')[0];

                    if (nextKey && !addedKeys.has(nextKey)) {
                        addedKeys.add(nextKey);
                        const nextFullPath = pathWithDot + nextKey;
                        const nextValue = allValues.get(nextFullPath);

                        // Check if this value comes from a subchart
                        const sourceName = this.getValueSource(chart, nextFullPath);
                        items.push(this.createCompletionItem(nextKey, nextValue, sourceName));
                    }
                }
            }
        }

        // Add parent chart overrides if this is a subchart
        if (chart.parentChart) {
            const parentOverrideItem = new vscode.CompletionItem(
                '⬆ Parent Overrides',
                vscode.CompletionItemKind.Reference
            );
            parentOverrideItem.documentation = new vscode.MarkdownString(
                `Values overridden in parent chart **${chart.parentChart.name}**`
            );
            parentOverrideItem.sortText = 'zzz'; // Sort to bottom
            items.push(parentOverrideItem);
        }

        return items;
    }

    private getStandardCompletions(
        document: vscode.TextDocument,
        currentString: string
    ): vscode.CompletionItem[] {
        const doc = utils.getValuesFromFile(document.fileName);

        if (currentString === '.Values.') {
            return this.getCompletionItemList(doc, 'current');
        }

        let currentKey = doc;
        const allKeys = currentString.replace('.Values.', '').split('.');
        allKeys.pop();

        currentKey = this.updateCurrentKey(currentKey, allKeys);
        return this.getCompletionItemList(currentKey, 'current');
    }

    private updateCurrentKey(currentKey: any, allKeys: any): any {
        for (const key in allKeys) {
            if (Array.isArray(currentKey[allKeys[key]])) {
                return undefined;
            }
            currentKey = currentKey[allKeys[key]];
        }
        return currentKey;
    }

    private getCompletionItemList(currentKey: any, sourceName: string): vscode.CompletionItem[] {
        const keys = [];
        for (const key in currentKey) {
            keys.push(this.createCompletionItem(key, currentKey[key], sourceName));
        }
        return keys;
    }

    private createCompletionItem(key: string, value: any, sourceName: string): vscode.CompletionItem {
        let item: vscode.CompletionItem;

        switch (typeof value) {
            case 'object':
                if (Array.isArray(value)) {
                    item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Enum);
                    item.detail = `Array[${value.length}] from ${sourceName}`;
                } else {
                    item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Method);
                    item.detail = `Object from ${sourceName}`;
                }
                break;
            case 'string':
                item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Field);
                item.detail = `"${value}" from ${sourceName}`;
                break;
            case 'boolean':
                item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Value);
                item.detail = `${value} from ${sourceName}`;
                break;
            case 'number':
                item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Value);
                item.detail = `${value} from ${sourceName}`;
                break;
            default:
                item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Issue);
                item.detail = `Unknown type from ${sourceName}`;
                break;
        }

        // Add documentation about value hierarchy
        const hierarchy = this.valueHierarchyService.getValueHierarchy(
            sourceName,
            key
        );

        if (hierarchy.length > 1) {
            const docs = new vscode.MarkdownString();
            docs.appendMarkdown('**Value Hierarchy:**\n');
            for (const ref of hierarchy) {
                docs.appendMarkdown(`- ${ref.chartName}: \`${JSON.stringify(ref.value)}\`\n`);
            }
            item.documentation = docs;
        }

        return item;
    }

    private getValueSource(chart: any, valuePath: string): string {
        // Check if value comes from a subchart
        for (const [subchartName] of chart.subcharts) {
            if (valuePath.startsWith(`${subchartName}.`)) {
                return subchartName;
            }
        }
        return chart.name;
    }
}