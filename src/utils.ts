/**
 * Checks whether the position in the line is in between curly brackets.
 */
export function isInsideBrackets(currentLine: string, position: number): boolean {
    const prefix = currentLine.substring(0, position);

    if(!isBracketsInPrefix(prefix)) {
        return false;
    }
    return true;
}

/**
 * Checks whether string before cursor contains'{{' or not
 */
function isBracketsInPrefix(prefix: string) {
    let prevChar = '';
    for (let index = prefix.length - 1; index >= 0; index--) {
        if (prefix.charAt(index) === '}') {
            return false;
        }
        if (prefix.charAt(index) === '{' && prevChar === '{') {
            return true;
        }
        prevChar = prefix.charAt(index);
    }
    return false;
}

/**
 * Retrieves the word at and around the position. A word is considered to be
 * the sequence of characters from the last and to the next whitespace.
 */
export function getWordAt(str: string, pos: number): string {
    const left = str.slice(0, pos + 1).search(/\S+$/);
    const right = str.slice(pos).search(/\s/);

    if (right < 0) {
        return str.slice(left);
    }

    return str.slice(left, right + pos);
}