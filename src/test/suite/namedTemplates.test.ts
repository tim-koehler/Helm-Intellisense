import * as vscode from 'vscode';
import * as assert from 'assert';
import { NamedTemplatesCompletionItemProvider } from '../../CompletionProviders/NamedTemplatesCompletionItemProvider';

suite('Test Named-Template autocomplete', () => {
    const directory = vscode.workspace.workspaceFolders;
    if (directory === undefined) {
            assert.fail('No directory opened');
    }
    const filePath = directory[0].uri.fsPath;
    
    test('getListOfNamedTemplates()', async () => {
        const helpersFile = await vscode.workspace.openTextDocument(filePath + '/templates/_helpers.tpl');
        const shouldList: string[] = ['Test.name','Test.fullname','Test.chart','Test.labels','Test.serviceAccountName'];
        const isList = new NamedTemplatesCompletionItemProvider().getListOfNamedTemplates(helpersFile.getText());

        for (const shouldItem of shouldList) {
            assert.strictEqual(isList.includes(shouldItem), true);
            
        }
    });
});
