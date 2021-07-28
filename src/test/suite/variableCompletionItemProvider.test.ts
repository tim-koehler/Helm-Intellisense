import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { VariableCompletionItemProvider } from "../../CompletionProviders/VariableCompletionItemProvider";

const TEST_CHART_PATH = path.join(path.resolve(), 'src', 'test', 'Test');
const SHOULD_VALUES_BEFORE = `[]`;
const SHOULD_VALUES_AFTER= `[{"label":"variable","kind":"Variable","detail":"{{ .Values.service.type"}]`;
suite('Test VariableCompletionItemProvider', () => {
    test('provideCompletionItems() without variable', async () => {
        const document = await vscode.workspace.openTextDocument(path.join(TEST_CHART_PATH, 'templates', 'service.yaml'));
        const variablesCompletionItemProvider = new VariableCompletionItemProvider();
        const completionItemList = variablesCompletionItemProvider.provideCompletionItems(document, new vscode.Position(6 - 1, 12 - 1));
        if (completionItemList === undefined || completionItemList === null) {
            assert.fail('Should not be undefined or null');
        }
        assert.strictEqual(JSON.stringify(completionItemList), SHOULD_VALUES_BEFORE);
    });
    test('provideCompletionItems() with `$variable`', async () => {
        const document = await vscode.workspace.openTextDocument(path.join(TEST_CHART_PATH, 'templates', 'service.yaml'));
        const variablesCompletionItemProvider = new VariableCompletionItemProvider();
        const completionItemList = variablesCompletionItemProvider.provideCompletionItems(document, new vscode.Position(9 - 1, 22 - 1));
        if (completionItemList === undefined || completionItemList === null) {
            assert.fail('Should not be undefined or null');
        }
        assert.strictEqual(JSON.stringify(completionItemList), SHOULD_VALUES_AFTER);
    });
});
