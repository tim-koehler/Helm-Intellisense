import * as vscode from 'vscode';
import * as assert from 'assert';
import * as linter from '../../Commands/LintCommand';
import * as utils from '../../utils';

suite('Test Linter', () => {
    const directory = vscode.workspace.workspaceFolders;
    if (directory === undefined) {
        assert.fail('No directory opened');
    }
    const filePath = directory[0].uri.fsPath;

    test('getAllKeyPathsOfDocument()', async () => {
        const doc = await vscode.workspace.openTextDocument(filePath + '/templates/deployment.yaml');
        const keys = linter.getAllKeyPathsOfDocument(doc);

        const shouldTouples: [string, number][] = [
            ['.Values.replicaCount', 7],
            ['.Values.imagePullSecrets', 18],
            ['.Values.podSecurityContext', 24],
            ['.Values.securityContext', 28],
            ['.Values.image.repository', 29],
            ['.Values.image.tag', 29],
            ['.Values.image.pullPolicy', 30],
            ['.Values.resources', 44],
            ['.Values.nodeSelector', 45],
            ['.Values.affinity', 49],
            ['.Values.tolerations', 53],
            ['.Values.', 57],
            ['.Values.imag', 58]
        ];
        compareTouples(keys, shouldTouples);
    });

    test('getInvalidKeyPaths()', async () => {
        const valuesFile = await vscode.workspace.openTextDocument(filePath + '/values.yaml');
        const values = utils.getValuesFromFile(valuesFile.fileName);

        const docDeployment = await vscode.workspace.openTextDocument(filePath + '/templates/deployment.yaml');
        const missingKeysDeployment = linter.getInvalidKeyPaths(linter.getAllKeyPathsOfDocument(docDeployment), values, docDeployment);
        assert.strictEqual(missingKeysDeployment.length, 2);

        const docService = await vscode.workspace.openTextDocument(filePath + '/templates/service.yaml');
        const missingKeysService = linter.getInvalidKeyPaths(linter.getAllKeyPathsOfDocument(docService), values, docService);
        assert.strictEqual(missingKeysService.length, 0);

        const docIngress = await vscode.workspace.openTextDocument(filePath + '/templates/ingress.yaml');
        const missingKeysIngress = linter.getInvalidKeyPaths(linter.getAllKeyPathsOfDocument(docIngress), values, docIngress);

        assert.strictEqual(missingKeysIngress.length, 1);
        assert.notStrictEqual(missingKeysIngress[0], ['Missing value at path [.Values.wrong] in file [/home/tim/Coding/VSCodeExtensions/Helm-Intellisense/src/test/Test/templates/ingress.yaml:10]']);
    });
});

function compareTouples(touple1: [string, number][], touple2: [string, number][]): void {
    var testVal;
    if (touple1.length !== touple2.length) {
        assert.fail('No equal length');
    }
    for (let index = 0; index < touple1.length; index++) {
        assert.equal(touple1[index][0], touple2[index][0]);
        assert.equal(touple1[index][1], touple2[index][1]);
    }
}
