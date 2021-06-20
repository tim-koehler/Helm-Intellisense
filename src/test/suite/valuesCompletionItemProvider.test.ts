import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { ValuesCompletionItemProvider } from "../../CompletionProviders/ValuesCompletionItemProvider";

const TEST_CHART_PATH = path.join(path.resolve(), 'src', 'test', 'Test');
const SHOULD_VALUES_ALL = `[{"label":"replicaCount","kind":"Field","documentation":"Value: 1"},{"label":"foo","kind":"Method"},{"label":"image","kind":"Method"},{"label":"imagePullSecrets","kind":"Method"},{"label":"nameOverride","kind":"Field","documentation":"Value: "},{"label":"fullnameOverride","kind":"Field","documentation":"Value: "},{"label":"serviceAccount","kind":"Method"},{"label":"podSecurityContext","kind":"Method"},{"label":"securityContext","kind":"Method"},{"label":"service","kind":"Method"},{"label":"ingress","kind":"Method"},{"label":"resources","kind":"Method"},{"label":"nodeSelector","kind":"Method"},{"label":"tolerations","kind":"Method"},{"label":"affinity","kind":"Method"}]`;
const SHOULD_VALUES_IMAGE = `[{"label":"repository","kind":"Field","documentation":"Value: nginx"},{"label":"tag","kind":"Field","documentation":"Value: stable"},{"label":"pullPolicy","kind":"Field","documentation":"Value: IfNotPresent"}]`;
suite('Test ValuesCompletionItemProvider', () => {
    test('provideCompletionItems() with all values', async () => {
        const document = await vscode.workspace.openTextDocument(path.join(TEST_CHART_PATH, 'templates', 'deployment.yaml'));
        const valuesCompletionItemProvider = new ValuesCompletionItemProvider();
        const completionItemList = valuesCompletionItemProvider.provideCompletionItems(document, new vscode.Position(46 - 1, 31 - 1));
        if (completionItemList === undefined || completionItemList === null) {
            assert.fail('Should not be undefined or null');
        }
        assert.strictEqual(JSON.stringify(completionItemList), SHOULD_VALUES_ALL);
    });
    test('provideCompletionItems() with `.Values.image.`', async () => {
        const document = await vscode.workspace.openTextDocument(path.join(TEST_CHART_PATH, 'templates', 'deployment.yaml'));
        const valuesCompletionItemProvider = new ValuesCompletionItemProvider();
        const completionItemList = valuesCompletionItemProvider.provideCompletionItems(document, new vscode.Position(30 - 1, 36 - 1));
        if (completionItemList === undefined || completionItemList === null) {
            assert.fail('Should not be undefined or null');
        }
        assert.strictEqual(JSON.stringify(completionItemList), SHOULD_VALUES_IMAGE);
    });
});
