import * as vscode from 'vscode';
import * as assert from 'assert';
import * as linter from '../../Commands/LintCommand';
import * as utils from '../../utils';
import * as path from 'path';
import { stringify } from 'querystring';

suite('Test Linter', () => {
        const directory = vscode.workspace.workspaceFolders;
        if (directory === undefined) {
                assert.fail('No directory opened');
        }
        const filePath = directory[0].uri.fsPath;
        
        test('getAllKeyPathsOfDocument()',  async () => {
                const doc = await vscode.workspace.openTextDocument(filePath + '/templates/deployment.yaml');
                const keys = linter.getAllKeyPathsOfDocument(doc);

                const shouldMap = new Map<string, number>([
                        ['.Values.replicaCount', 8],
                        ['.Values.imagePullSecrets', 19],
                        ['.Values.podSecurityContext', 25],
                        ['.Values.securityContext', 29],
                        ['.Values.image.repository', 30],
                        ['.Values.image.tag', 30],
                        ['.Values.image.pullPolicy', 31],
                        ['.Values.resources', 45],
                        ['.Values.nodeSelector', 46],
                        ['.Values.affinity', 50],
                        ['.Values.tolerations', 54]
                ]);

                assert.strictEqual(compareMaps(keys, shouldMap), true);
        });

        test('getInvalidKeyPaths()', async () => {
                const valuesFile = await vscode.workspace.openTextDocument(filePath + '/values.yaml');
                const values = utils.getValuesFromFile(valuesFile);
                
                const docDeployment = await vscode.workspace.openTextDocument(filePath + '/templates/deployment.yaml');
                const missingKeysDeployment = linter.getInvalidKeyPaths(linter.getAllKeyPathsOfDocument(docDeployment), values, docDeployment);
                assert.strictEqual(missingKeysDeployment.length, 0);

                const docIngress = await vscode.workspace.openTextDocument(filePath + '/templates/ingress.yaml');
                const missingKeysIngress = linter.getInvalidKeyPaths(linter.getAllKeyPathsOfDocument(docIngress), values, docIngress);
                console.log(missingKeysIngress);
                
                assert.strictEqual(missingKeysIngress.length, 1);
                assert.equal(missingKeysIngress[0], ['Missing value at path [.Values.wrong] in file [/home/tim/Coding/VSCodeExtensions/Helm-Intellisense/src/test/Test/templates/ingress.yaml:10]']);
        });
});

function compareMaps(map1: Map<string, number>, map2: Map<string, number>) {
        var testVal;
        if (map1.size !== map2.size) {
            return false;
        }
        for (var [key, val] of map1) {
            testVal = map2.get(key);
            // in cases of an undefined value, make sure the key
            // actually exists on the object so there are no false positives
            if (testVal !== val || (testVal === undefined && !map2.has(key))) {
                return false;
            }
        }
        return true;
    }