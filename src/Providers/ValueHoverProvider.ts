import * as vscode from 'vscode';
import { ValueHierarchyService } from '../Services/ValueHierarchyService';
import * as utils from '../utils';

export class ValueHoverProvider implements vscode.HoverProvider {
    constructor(private valueHierarchyService: ValueHierarchyService) {}

    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
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

        // Get the chart context
        const chart = this.valueHierarchyService.getChartForFile(document.fileName);
        if (!chart) {
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

        // Build hover content
        const content = new vscode.MarkdownString();
        content.appendMarkdown(`### Value: \`.Values.${valuePath}\`\n\n`);

        // Show current chart context
        content.appendMarkdown(`**Current Chart:** ${chart.name}\n\n`);

        // Show value hierarchy
        if (references.length > 0) {
            content.appendMarkdown('**Value Hierarchy:**\n\n');

            for (const ref of references) {
                const isCurrentChart = ref.chartName === chart.name;
                const marker = isCurrentChart ? '→' : '  ';

                content.appendMarkdown(`${marker} **${ref.chartName}**\n`);
                content.appendCodeblock(
                    this.formatValue(ref.value),
                    'yaml'
                );
                content.appendMarkdown('\n');
            }
        }

        // Show parent override info if this is a subchart
        if (chart.parentChart) {
            content.appendMarkdown('---\n');
            content.appendMarkdown(`💡 This chart is a subchart of **${chart.parentChart.name}**\n\n`);
            content.appendMarkdown('Parent can override these values using:\n');
            content.appendCodeblock(`${chart.name}:\n  ${valuePath.replace(/\./g, ':\n  ')}: <value>`, 'yaml');
        }

        // Show subchart info if value is for a subchart
        const subchartMatch = valuePath.match(/^([^.]+)\./);
        if (subchartMatch) {
            const subchartName = subchartMatch[1];
            const subchart = chart.subcharts.get(subchartName);
            if (subchart) {
                content.appendMarkdown('---\n');
                content.appendMarkdown(`📦 This value is for subchart **${subchartName}**\n\n`);
                content.appendMarkdown(`Subchart location: \`${subchart.path}\`\n`);
            }
        }

        return new vscode.Hover(content);
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

    private formatValue(value: any): string {
        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    }
}