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
        const keys = linter.getAllKeyPathElementsOfDocument(doc);

        const shouldTouples: linter.Element[] = [
            { name: '.Values.replicaCount', line: 7, range: new vscode.Range(new vscode.Position(7, 15), new vscode.Position(7, 35)), type: linter.ElementType.KEY_PATH},
            { name: '.Values.imagePullSecrets', line: 18, range: new vscode.Range(new vscode.Position(18, 13), new vscode.Position(18, 37)), type: linter.ElementType.KEY_PATH},
            { name: '.Values.podSecurityContext', line: 24, range: new vscode.Range(new vscode.Position(24, 19), new vscode.Position(24, 45)), type: linter.ElementType.KEY_PATH},
            { name: '.Values.securityContext', line: 28, range: new vscode.Range(new vscode.Position(28, 23), new vscode.Position(28, 46)), type: linter.ElementType.KEY_PATH},
            { name: '.Values.image.repository', line: 29, range: new vscode.Range(new vscode.Position(29, 21), new vscode.Position(29, 45)), type: linter.ElementType.KEY_PATH},
            { name: '.Values.image.tag', line: 29, range: new vscode.Range(new vscode.Position(29, 53), new vscode.Position(29, 70)), type: linter.ElementType.KEY_PATH},
            { name: '.Values.image.pullPolicy', line: 30, range: new vscode.Range(new vscode.Position(30, 30), new vscode.Position(30, 54)), type: linter.ElementType.KEY_PATH},
            { name: '.Values.resources', line: 44, range: new vscode.Range(new vscode.Position(44, 23), new vscode.Position(44, 40)), type: linter.ElementType.KEY_PATH},
            { name: '.Values.nodeSelector', line: 45, range: new vscode.Range(new vscode.Position(45, 15), new vscode.Position(45, 35)), type: linter.ElementType.KEY_PATH},
            { name: '.Values.affinity', line: 49, range: new vscode.Range(new vscode.Position(49, 13), new vscode.Position(49, 29)), type: linter.ElementType.KEY_PATH},
            { name: '.Values.tolerations', line: 53, range: new vscode.Range(new vscode.Position(53, 13), new vscode.Position(53, 32)), type: linter.ElementType.KEY_PATH},
            { name: '.Values.', line: 57, range: new vscode.Range(new vscode.Position(57, 3), new vscode.Position(57, 11)), type: linter.ElementType.KEY_PATH},
            { name: '.Values.imag', line: 58, range: new vscode.Range(new vscode.Position(58, 3), new vscode.Position(58, 15)), type: linter.ElementType.KEY_PATH}
        ];
        compare(keys, shouldTouples);
    });

    test('getInvalidKeyPaths()', async () => {
        const valuesFile = await vscode.workspace.openTextDocument(filePath + '/values.yaml');
        const values = utils.getValuesFromFile(valuesFile.fileName);

        const docDeployment = await vscode.workspace.openTextDocument(filePath + '/templates/deployment.yaml');
        const missingKeysDeployment = linter.getInvalidKeyPaths(linter.getAllKeyPathElementsOfDocument(docDeployment), values, docDeployment);
        assert.strictEqual(missingKeysDeployment.length, 2);

        const docService = await vscode.workspace.openTextDocument(filePath + '/templates/service.yaml');
        const missingKeysService = linter.getInvalidKeyPaths(linter.getAllKeyPathElementsOfDocument(docService), values, docService);
        assert.strictEqual(missingKeysService.length, 0);

        const docIngress = await vscode.workspace.openTextDocument(filePath + '/templates/ingress.yaml');
        const missingKeysIngress = linter.getInvalidKeyPaths(linter.getAllKeyPathElementsOfDocument(docIngress), values, docIngress);

        assert.strictEqual(missingKeysIngress.length, 1);
        assert.deepStrictEqual(missingKeysIngress[0], {
            line: 9,
            name: ".Values.wrong",
            range: new vscode.Range(new vscode.Position(9, 11), new vscode.Position(9, 24)),
            type: linter.ElementType.KEY_PATH
        })
    })
});

function compare(elements1: linter.Element[], elements2: linter.Element[]): void {
    if (elements1.length !== elements2.length) {
        assert.fail('No equal length');
    }
    for (let index = 0; index < elements2.length; index++) {
        assert.strictEqual(elements1[index].name, elements2[index].name, "Name not matching for: " + elements1[index].name);
        assert.strictEqual(elements1[index].line, elements2[index].line, "Line not matching for: " + elements1[index].name);
        assert.strictEqual(elements1[index].range.start.character, elements2[index].range.start.character, "RangeStart not matching for: " + elements1[index].name);
        assert.strictEqual(elements1[index].range.end.character, elements2[index].range.end.character, "RangeEnd not matching for: " + elements1[index].name);
        assert.strictEqual(elements1[index].type, elements2[index].type, "Type not matching for: " + elements1[index].name);
    }
}
