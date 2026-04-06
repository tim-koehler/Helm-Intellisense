import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface ChartInfo {
    name: string;
    path: string;
    valuesFile?: string;
    parentChart?: ChartInfo;
    subcharts: Map<string, ChartInfo>;
    values?: any;
}

export interface ValueReference {
    chartName: string;
    chartPath: string;
    valuePath: string;
    value: any;
    lineNumber?: number;
    columnNumber?: number;
}

export class ValueHierarchyService {
    private charts: Map<string, ChartInfo> = new Map();
    private outputChannel: vscode.OutputChannel;
    private fileWatchers: vscode.FileSystemWatcher[] = [];

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Helm Value Hierarchy');
    }

    public activate(context: vscode.ExtensionContext): void {
        this.log('Activating Value Hierarchy Service...');

        // Watch for changes in Chart.yaml and values.yaml files
        const chartWatcher = vscode.workspace.createFileSystemWatcher('**/Chart.yaml');
        const valuesWatcher = vscode.workspace.createFileSystemWatcher('**/values*.yaml');

        chartWatcher.onDidCreate(() => this.refreshChartHierarchy());
        chartWatcher.onDidChange(() => this.refreshChartHierarchy());
        chartWatcher.onDidDelete(() => this.refreshChartHierarchy());

        valuesWatcher.onDidChange((uri) => this.updateValuesForChart(uri));

        this.fileWatchers.push(chartWatcher, valuesWatcher);
        context.subscriptions.push(chartWatcher, valuesWatcher);

        // Initial scan
        this.refreshChartHierarchy();

        this.log('Value Hierarchy Service activated');
    }

    public async refreshChartHierarchy(): Promise<void> {
        this.charts.clear();

        if (!vscode.workspace.workspaceFolders) {
            return;
        }

        for (const folder of vscode.workspace.workspaceFolders) {
            await this.scanForCharts(folder.uri.fsPath);
        }

        // Build parent-child relationships
        this.buildChartRelationships();

        this.log(`Found ${this.charts.size} charts in workspace`);
    }

    private async scanForCharts(searchPath: string, depth = 0): Promise<void> {
        if (depth > 10) { return; } // Prevent infinite recursion

        try {
            const items = fs.readdirSync(searchPath, { withFileTypes: true });

            for (const item of items) {
                if (item.name.startsWith('.') || item.name === 'node_modules') {
                    continue;
                }

                const fullPath = path.join(searchPath, item.name);

                if (item.isDirectory()) {
                    const chartYaml = path.join(fullPath, 'Chart.yaml');
                    if (fs.existsSync(chartYaml)) {
                        await this.loadChart(fullPath);
                    }
                    await this.scanForCharts(fullPath, depth + 1);
                }
            }
        } catch (error) {
            this.log(`Error scanning for charts: ${error}`);
        }
    }

    private async loadChart(chartPath: string): Promise<void> {
        try {
            const chartYamlPath = path.join(chartPath, 'Chart.yaml');
            const chartContent = fs.readFileSync(chartYamlPath, 'utf8');
            const chartData = yaml.load(chartContent) as any;

            const chartInfo: ChartInfo = {
                name: chartData.name,
                path: chartPath,
                subcharts: new Map(),
            };

            // Load values if exists
            const valuesPath = path.join(chartPath, 'values.yaml');
            if (fs.existsSync(valuesPath)) {
                chartInfo.valuesFile = valuesPath;
                chartInfo.values = await this.loadValues(valuesPath);
            }

            this.charts.set(chartPath, chartInfo);
            this.log(`Loaded chart: ${chartData.name} at ${chartPath}`);

        } catch (error) {
            this.log(`Error loading chart at ${chartPath}: ${error}`);
        }
    }

    private async loadValues(valuesPath: string): Promise<any> {
        try {
            const content = fs.readFileSync(valuesPath, 'utf8');
            return yaml.load(content) || {};
        } catch (error) {
            this.log(`Error loading values from ${valuesPath}: ${error}`);
            return {};
        }
    }

    private buildChartRelationships(): void {
        // Build parent-child relationships based on directory structure and dependencies
        for (const [chartPath, chart] of this.charts) {
            // Check for subcharts in charts/ directory
            const chartsDir = path.join(chartPath, 'charts');
            if (fs.existsSync(chartsDir)) {
                const items = fs.readdirSync(chartsDir, { withFileTypes: true });

                for (const item of items) {
                    if (item.isDirectory()) {
                        const subchartPath = path.join(chartsDir, item.name);
                        const subchart = this.charts.get(subchartPath);

                        if (subchart) {
                            chart.subcharts.set(subchart.name, subchart);
                            subchart.parentChart = chart;
                            this.log(`Linked subchart ${subchart.name} to parent ${chart.name}`);
                        }
                    } else if (item.name.endsWith('.tgz')) {
                        // Check if extracted version exists
                        const extractedName = item.name.replace('.tgz', '');
                        const extractedPath = path.join(chartsDir, extractedName);
                        const subchart = this.charts.get(extractedPath);

                        if (subchart) {
                            chart.subcharts.set(subchart.name, subchart);
                            subchart.parentChart = chart;
                            this.log(`Linked extracted subchart ${subchart.name} to parent ${chart.name}`);
                        }
                    }
                }
            }
        }
    }

    private async updateValuesForChart(uri: vscode.Uri): Promise<void> {
        const chartPath = this.findChartForFile(uri.fsPath);
        if (chartPath) {
            const chart = this.charts.get(chartPath);
            if (chart) {
                chart.values = await this.loadValues(uri.fsPath);
                this.log(`Updated values for chart ${chart.name}`);
            }
        }
    }

    private findChartForFile(filePath: string): string | undefined {
        // Find the chart that contains this file
        let dir = path.dirname(filePath);
        while (dir !== path.dirname(dir)) { // Stop at root
            if (fs.existsSync(path.join(dir, 'Chart.yaml'))) {
                return dir;
            }
            dir = path.dirname(dir);
        }
        return undefined;
    }

    public getChartForFile(filePath: string): ChartInfo | undefined {
        const chartPath = this.findChartForFile(filePath);
        return chartPath ? this.charts.get(chartPath) : undefined;
    }

    public getValueHierarchy(filePath: string, valuePath: string): ValueReference[] {
        const references: ValueReference[] = [];
        const chart = this.getChartForFile(filePath);

        if (!chart) {
            return references;
        }

        // Check current chart
        const currentValue = this.getValueAtPath(chart.values, valuePath);
        if (currentValue !== undefined) {
            references.push({
                chartName: chart.name,
                chartPath: chart.path,
                valuePath: valuePath,
                value: currentValue
            });
        }

        // Check parent charts
        let parent = chart.parentChart;
        while (parent) {
            const parentValuePath = `${chart.name}.${valuePath}`;
            const parentValue = this.getValueAtPath(parent.values, parentValuePath);
            if (parentValue !== undefined) {
                references.push({
                    chartName: parent.name,
                    chartPath: parent.path,
                    valuePath: parentValuePath,
                    value: parentValue
                });
            }
            parent = parent.parentChart;
        }

        // Check subcharts
        for (const [subchartName, subchart] of chart.subcharts) {
            if (valuePath.startsWith(`${subchartName}.`)) {
                const subchartValuePath = valuePath.substring(subchartName.length + 1);
                const subchartValue = this.getValueAtPath(subchart.values, subchartValuePath);
                if (subchartValue !== undefined) {
                    references.push({
                        chartName: subchart.name,
                        chartPath: subchart.path,
                        valuePath: subchartValuePath,
                        value: subchartValue
                    });
                }
            }
        }

        return references;
    }

    private getValueAtPath(values: any, path: string): any {
        if (!values) { return undefined; }

        const parts = path.split('.');
        let current = values;

        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return undefined;
            }
        }

        return current;
    }

    public getAllValuesForChart(chart: ChartInfo): Map<string, any> {
        const allValues = new Map<string, any>();

        // Add chart's own values
        if (chart.values) {
            this.flattenValues(chart.values, '', allValues);
        }

        // Add subchart values with prefix
        for (const [subchartName, subchart] of chart.subcharts) {
            if (subchart.values) {
                this.flattenValues(subchart.values, `${subchartName}.`, allValues);
            }
        }

        // Add parent overrides if this is a subchart
        if (chart.parentChart && chart.parentChart.values) {
            const overrides = chart.parentChart.values[chart.name];
            if (overrides) {
                this.flattenValues(overrides, '', allValues);
            }
        }

        return allValues;
    }

    private flattenValues(obj: any, prefix: string, result: Map<string, any>): void {
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const fullKey = prefix ? `${prefix}${key}` : key;
                result.set(fullKey, obj[key]);

                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    this.flattenValues(obj[key], `${fullKey}.`, result);
                }
            }
        }
    }

    public getCharts(): Map<string, ChartInfo> {
        return this.charts;
    }

    private log(message: string): void {
        this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
    }

    public dispose(): void {
        this.fileWatchers.forEach(w => w.dispose());
        this.outputChannel.dispose();
    }
}