import * as assert from 'assert';
import * as utils from '../../utils';

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
