//import * as vscode from 'vscode';
import * as assert from 'assert';
import * as linter from '../../Commands/LintCommand';
import * as utils from '../../utils';

suite('Test Linter', () => {
        test('LintFile', () => {
                //console.log(vscode.workspace.workspaceFolders);
                //vscode.workspace.openTextDocument("")

                //const keys = linter.getAllKeyPathsOfDocument(doc);
                //const values = utils.getValuesFromFile(doc);
            
                //const invalidKeyPaths = linter.getInvalidKeyPaths(keys, values, doc);
        
                assert.strictEqual(utils.getWordAt('foo bar baz', 100), 'baz');
	});
});
