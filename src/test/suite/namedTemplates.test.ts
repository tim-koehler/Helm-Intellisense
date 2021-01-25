import * as vscode from 'vscode';
import * as assert from 'assert';
import { getListOfNamedTemplates } from '../../CompletionProviders/NamedTemplatesCompletionItemProvider';
import { getAllNamedTemplatesFromFiles } from '../../utils';

suite('Test Named-Template autocomplete', () => {
    const directory = vscode.workspace.workspaceFolders;
    if (directory === undefined) {
            assert.fail('No directory opened');
    }
    const filePath = directory[0].uri.fsPath;
    
    test('getListOfNamedTemplates()', async () => {
        const baseFile = await vscode.workspace.openTextDocument(filePath + '/templates/service.yaml');
        const shouldList: string[] = ['Test.name','Test.fullname','Test.chart','Test.labels','Test.serviceAccountName', 'Test.recursive'];
        const content: string = getAllNamedTemplatesFromFiles(baseFile);
        const isList = getListOfNamedTemplates(content);
        for (const shouldItem of shouldList) {
            assert.strictEqual(isList.includes(shouldItem), true);
        }
    });
});
