import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as zlib from 'zlib';
import * as tarStream from 'tar-stream';
import { ChartExpansionService } from '../../Services/ChartExpansionService';

const testWorkspaceRoot = path.join(__dirname, '..', 'chartExpansionTest');
const testChartPath = path.join(testWorkspaceRoot, 'test-chart');
const testChartsDir = path.join(testChartPath, 'charts');
const testTgzPath = path.join(testChartsDir, 'dependency-chart-1.0.0.tgz');

suite('ChartExpansionService Test Suite', () => {
    let service: ChartExpansionService;
    let mockContext: vscode.ExtensionContext;

    suiteSetup(async () => {
        await setupTestEnvironment();
    });

    suiteTeardown(async () => {
        await cleanupTestEnvironment();
    });

    setup(() => {
        service = new ChartExpansionService();
        mockContext = {
            subscriptions: [],
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve()
            } as any,
            globalState: {
                get: () => undefined,
                update: () => Promise.resolve()
            } as any
        } as any;
    });

    teardown(() => {
        if (service) {
            service.dispose();
        }
    });

    test('Should find Helm charts in workspace', async () => {
        const findHelmChartsMethod = (service as any).findHelmCharts.bind(service);
        const helmCharts = findHelmChartsMethod(testWorkspaceRoot);

        assert.ok(helmCharts.length > 0, 'Should find at least one Helm chart');
        assert.ok(helmCharts.includes(testChartPath), 'Should find the test chart');
    });

    test('Should extract tgz file correctly', async () => {
        await createTestTgzFile();
        
        const extractPath = path.join(testChartsDir, 'dependency-chart-1.0.0');
        if (fs.existsSync(extractPath)) {
            removeDirectoryRecursively(extractPath);
        }

        const expandTgzFileMethod = (service as any).expandTgzFile.bind(service);
        await expandTgzFileMethod(testTgzPath);

        assert.ok(fs.existsSync(extractPath), 'Extract directory should exist');
        assert.ok(fs.existsSync(path.join(extractPath, 'dependency-chart', 'Chart.yaml')), 'Chart.yaml should be extracted');
        assert.ok(fs.existsSync(path.join(extractPath, 'dependency-chart', 'values.yaml')), 'values.yaml should be extracted');
        assert.ok(fs.existsSync(path.join(extractPath, 'dependency-chart', 'templates', 'deployment.yaml')), 'Templates should be extracted');
    });

    test('Should respect overwriteExpandedCharts configuration', async () => {
        await createTestTgzFile();

        const extractPath = path.join(testChartsDir, 'dependency-chart-1.0.0');
        const testFilePath = path.join(extractPath, 'test-marker.txt');

        fs.mkdirSync(extractPath, { recursive: true });
        fs.writeFileSync(testFilePath, 'original content');

        const mockGet = (key: string) => {
            if (key === 'autoExpandChartDependencies') return true;
            if (key === 'overwriteExpandedCharts') return false;
            return undefined;
        };
        const originalGetConfiguration = vscode.workspace.getConfiguration;
        vscode.workspace.getConfiguration = () => ({ get: mockGet } as any);

        try {
            const expandTgzFileMethod = (service as any).expandTgzFile.bind(service);
            await expandTgzFileMethod(testTgzPath);

            assert.ok(fs.existsSync(testFilePath), 'Marker file should still exist when overwrite is disabled');
            assert.strictEqual(fs.readFileSync(testFilePath, 'utf8'), 'original content');
        } finally {
            vscode.workspace.getConfiguration = originalGetConfiguration;
        }
    });

    test('Should overwrite when overwriteExpandedCharts is enabled', async () => {
        await createTestTgzFile();
        
        const extractPath = path.join(testChartsDir, 'dependency-chart-1.0.0');
        const testFilePath = path.join(extractPath, 'test-marker.txt');

        fs.mkdirSync(extractPath, { recursive: true });
        fs.writeFileSync(testFilePath, 'original content');

        const mockGet = (key: string) => {
            if (key === 'autoExpandChartDependencies') return true;
            if (key === 'overwriteExpandedCharts') return true;
            return undefined;
        };
        const originalGetConfiguration = vscode.workspace.getConfiguration;
        vscode.workspace.getConfiguration = () => ({ get: mockGet } as any);

        try {
            const expandTgzFileMethod = (service as any).expandTgzFile.bind(service);
            await expandTgzFileMethod(testTgzPath);

            assert.ok(!fs.existsSync(testFilePath), 'Marker file should be removed when overwrite is enabled');
            assert.ok(fs.existsSync(path.join(extractPath, 'dependency-chart', 'Chart.yaml')), 'Chart.yaml should exist after extraction');
        } finally {
            vscode.workspace.getConfiguration = originalGetConfiguration;
        }
    });
});

async function setupTestEnvironment(): Promise<void> {
    fs.mkdirSync(testWorkspaceRoot, { recursive: true });
    fs.mkdirSync(testChartPath, { recursive: true });
    fs.mkdirSync(testChartsDir, { recursive: true });
    fs.mkdirSync(path.join(testChartPath, 'templates'), { recursive: true });

    const chartYaml = `apiVersion: v2
name: test-chart
description: A test Helm chart
type: application
version: 0.1.0
appVersion: "1.0"
dependencies:
  - name: dependency-chart
    version: "1.0.0"
    repository: "https://charts.example.com"
`;
    fs.writeFileSync(path.join(testChartPath, 'Chart.yaml'), chartYaml);

    const valuesYaml = `replicaCount: 1
image:
  repository: nginx
  tag: latest
`;
    fs.writeFileSync(path.join(testChartPath, 'values.yaml'), valuesYaml);

    const deploymentYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "test-chart.fullname" . }}
spec:
  replicas: {{ .Values.replicaCount }}
`;
    fs.writeFileSync(path.join(testChartPath, 'templates', 'deployment.yaml'), deploymentYaml);
}

async function cleanupTestEnvironment(): Promise<void> {
    if (fs.existsSync(testWorkspaceRoot)) {
        removeDirectoryRecursively(testWorkspaceRoot);
    }
}

async function createTestTgzFile(): Promise<void> {
    const pack = tarStream.pack();

    pack.entry({ name: 'dependency-chart/', type: 'directory' });
    pack.entry({ name: 'dependency-chart/templates/', type: 'directory' });

    pack.entry({ name: 'dependency-chart/Chart.yaml' }, `apiVersion: v2
name: dependency-chart
description: A dependency chart
version: 1.0.0
`);

    pack.entry({ name: 'dependency-chart/values.yaml' }, `service:
  type: ClusterIP
  port: 80
`);

    pack.entry({ name: 'dependency-chart/templates/deployment.yaml' }, `apiVersion: apps/v1
kind: Deployment
metadata:
  name: dependency-chart
`);

    pack.finalize();

    const gzip = zlib.createGzip();
    const writeStream = fs.createWriteStream(testTgzPath);

    return new Promise((resolve, reject) => {
        pack.pipe(gzip).pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
}

function removeDirectoryRecursively(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            if (fs.statSync(filePath).isDirectory()) {
                removeDirectoryRecursively(filePath);
            } else {
                fs.unlinkSync(filePath);
            }
        }
        fs.rmdirSync(dirPath);
    }
}

function getAllFilesRecursively(dirPath: string): string[] {
    const files: string[] = [];
    if (fs.existsSync(dirPath)) {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            if (fs.statSync(itemPath).isDirectory()) {
                files.push(`${item}/`);
                files.push(...getAllFilesRecursively(itemPath).map(f => `${item}/${f}`));
            } else {
                files.push(item);
            }
        }
    }
    return files;
}