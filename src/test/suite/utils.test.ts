import * as assert from 'assert';
import * as utils from '../../utils';
import * as path from 'path';

const TEST_CHART_PATH = path.join(__dirname, "..", "..", "..", "src", "test", "Test");
const DUMMY_PATH = path.join(__dirname, "..", "..", "..", "src", "test", "Dummy");
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
    test('getAllNamedTemplatesFromParentCharts()', () => {
        const shouldList: Map<string, string> = new Map([
            ['TestLibrary.resources', 'Library/templates/sample.tpl'],
            ['helm-library.cluster-ip-service.tpl', 'helm-library/templates/_cluster_ip_service.yaml'],
            ['helm-library.cluster-ip-service', 'helm-library/templates/_cluster_ip_service.yaml'],
            ['helm-library.container.tpl', 'helm-library/templates/_container.yaml'],
            ['helm-library.container', 'helm-library/templates/_container.yaml'],
            ['helm-library.deployment.tpl', 'helm-library/templates/_deployment.yaml'],
            ['helm-library.deployment', 'helm-library/templates/_deployment.yaml'],
            ['helm-library.default-check-required-msg', 'helm-library/templates/_helpers.tpl'],
            ['helm-library.service', 'helm-library/templates/_service.yaml'],
            ['helm-library.util.merge', 'helm-library/templates/_utils.yaml'],
            ['common.utils.secret.getvalue', 'memcached/charts/common/templates/_utils.tpl'],
            ['common.utils.fieldToEnvVar', 'memcached/charts/common/templates/_utils.tpl'],
            ['common.utils.getValueFromKey', 'memcached/charts/common/templates/_utils.tpl'],
            ['common.names.namespace', 'memcached/charts/common/templates/_names.tpl'],
            ['common.names.fullname.namespace', 'memcached/charts/common/templates/_names.tpl'],
            ['common.validations.values.multiple.empty', 'memcached/charts/common/templates/validations/_validations.tpl'],
            ['common.validations.values.single.empty', 'memcached/charts/common/templates/validations/_validations.tpl'],
            ['common.images.version', 'memcached/charts/common/templates/_images.tpl'],
            ['common.ingress.supportsIngressClassname', 'memcached/charts/common/templates/_ingress.tpl'],
            ['common.ingress.certManagerRequest', 'memcached/charts/common/templates/_ingress.tpl'],
            ['memcached.image', 'memcached/templates/_helpers.tpl'],
            ['memcached.metrics.image', 'memcached/templates/_helpers.tpl'],
            ['memcached.volumePermissions.image', 'memcached/templates/_helpers.tpl'],
            ['memcached.validateValues.auth', 'memcached/templates/_helpers.tpl'],
            ['memcached.validateValues.readOnlyRootFilesystem', 'memcached/templates/_helpers.tpl'],
            ['memcached.secretPasswordName', 'memcached/templates/_helpers.tpl'],
        ]);
        return utils.getAllNamedTemplatesFromParentCharts(path.join(TEST_CHART_PATH, 'templates', 'ingress.yaml'))
            .then((namedTemplates) => {
                for (const [key, value] of shouldList) {
                    assert.strictEqual(namedTemplates.get(key)?.endsWith(value), true, `Expected ${key} to end with ${value} but got ${namedTemplates.get(key)}`);
                }
            })
            .catch((error) => {
                assert.fail('Error fetching named templates: ' + error);
            });
    });
    test('getAllNamedTemplatesFromFiles()', () => {
        const shouldList: Map<string, string> = new Map([
            ['Test.name', path.join('src', 'test', 'Test', 'templates', '_helpers.tpl')],
            ['Test.fullname', path.join('src', 'test', 'Test', 'templates', '_helpers.tpl')],
            ['Test.chart', path.join('src', 'test', 'Test', 'templates', '_helpers.tpl')],
            ['Test.labels', path.join('src', 'test', 'Test', 'templates', '_helpers.tpl')],
            ['Test.serviceAccountName', path.join('src', 'test', 'Test', 'templates', '_helpers.tpl')],
            ['Test.recursive', path.join('src', 'test', 'Test', 'templates', 'testForRecursiveNamedTemplates', 'foo.tpl')],
        ]);
        const namedTemplates = utils.getAllNamedTemplatesFromFiles(path.join(TEST_CHART_PATH, 'values.yaml'));
        assert.strictEqual(shouldList.size, namedTemplates.size);
        for (const [key, value] of shouldList) {
            assert.strictEqual(namedTemplates.get(key)?.endsWith(value), true);
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
