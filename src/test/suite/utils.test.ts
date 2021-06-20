import * as assert from 'assert';
import * as utils from '../../utils';
import * as path from 'path';

const TEST_CHART_PATH = path.join(path.resolve(), 'src', 'test', 'Test');
const DUMMY_PATH = path.join(path.resolve(), 'src', 'test', 'Dummy');
const SHOULD_VALUES = `{"replicaCount":1,"foo":{"bar":"baz","baz":["foo","bar","baz"]},"image":{"repository":"nginx","tag":"stable","pullPolicy":"IfNotPresent"},"imagePullSecrets":[],"nameOverride":"","fullnameOverride":"","serviceAccount":{"create":true,"name":null},"podSecurityContext":{},"securityContext":{},"service":{"type":"ClusterIP","port":80},"ingress":{"enabled":false,"annotations":{},"hosts":[{"host":"chart-example.local","paths":[]}],"tls":[]},"resources":{},"nodeSelector":{},"tolerations":[],"affinity":{}}`;

suite('Test Utils', () => {
    test('isInsideBrackets() outside brackets', () => {
        assert.strictEqual(utils.isInsideBrackets('foo {{ bar }} baz', 0), false);
        assert.strictEqual(utils.isInsideBrackets('foo {{ bar }} baz', 3), false);
        assert.strictEqual(utils.isInsideBrackets('foo {{ bar }} baz', 14), false);
        assert.strictEqual(utils.isInsideBrackets('foo {{ bar }} baz', 17), false);
    });
    test('isInsideBrackets() on brackets', () => {
        assert.strictEqual(utils.isInsideBrackets('foo {{ bar }} baz', 4), false);
        assert.strictEqual(utils.isInsideBrackets('foo {{ bar }} baz', 5), false);
        assert.strictEqual(utils.isInsideBrackets('foo {{ bar }} baz', 12), false);
        assert.strictEqual(utils.isInsideBrackets('foo {{ bar }} baz', 13), false);
    });
    test('isInsideBrackets() inside brackets', () => {
        assert.strictEqual(utils.isInsideBrackets('foo {{ bar }} baz', 6), true);
        assert.strictEqual(utils.isInsideBrackets('foo {{ bar }} baz', 11), true);
    });
    test('getChartBasePath()', () => {
        const testPaths = [path.join(TEST_CHART_PATH, 'templates', 'deployment.yaml'),
            path.join(TEST_CHART_PATH, 'templates', 'testForRecursiveNamedTemplates', 'foo.tpl'),
            path.join(TEST_CHART_PATH, 'values.yaml')];

        for (const path of testPaths) {
            let returnedPath = utils.getChartBasePath(path);
            assert.notStrictEqual(returnedPath, undefined);
            assert.strictEqual(returnedPath?.endsWith('/Test'), true);
        }

        let returnedPath = utils.getChartBasePath(DUMMY_PATH + path.sep + 'foo');
        assert.strictEqual(returnedPath, undefined);
    });
    test('getNameOfChart()', () => {
        assert.strictEqual(utils.getNameOfChart(path.join(TEST_CHART_PATH, 'templates', 'ingress.yaml')), 'Test');
        assert.strictEqual(utils.getNameOfChart(path.join(DUMMY_PATH, 'DummyDummy', 'bar')), 'No name found');
    });
    test('getAllNamedTemplatesFromFiles()', () => {
        const shouldList: string[] = ['Test.name', 'Test.fullname', 'Test.chart', 'Test.labels', 'Test.serviceAccountName', 'Test.recursive'];
        const namedTemplates: string[] = utils.getAllNamedTemplatesFromFiles(path.join(TEST_CHART_PATH, 'values.yaml'));
        for (const shouldItem of shouldList) {
            assert.strictEqual(namedTemplates.includes(shouldItem), true);
        }
    });
    test('getValuesFromFile', () => {
        assert.strictEqual(JSON.stringify(utils.getValuesFromFile(path.join(TEST_CHART_PATH, 'values.yaml'))), SHOULD_VALUES);
    });
    test('getWordAt() empty string', () => {
        assert.strictEqual(utils.getWordAt('', 0), '');
    });
    test('getWordAt() extrema', () => {
        assert.strictEqual(utils.getWordAt('foo bar baz', 0), 'f');
        assert.strictEqual(utils.getWordAt('foo bar baz', 2), 'foo');
    });
    test('getWordAt() between words', () => {
        assert.strictEqual(utils.getWordAt('foo bar baz', 3), '');
    });
    test('getWordAt() second word', () => {
        assert.strictEqual(utils.getWordAt('foo bar baz', 5), 'ba');
    });
    test('getWordAt() third word', () => {
        assert.strictEqual(utils.getWordAt('foo bar baz', 8), 'b');
    });
    test('getWordAt() out of bounds', () => {
        assert.strictEqual(utils.getWordAt('foo bar baz', 100), 'baz');
    });
});
