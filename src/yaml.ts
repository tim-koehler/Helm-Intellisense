import * as yaml from 'js-yaml';
import * as fs from 'fs';

// @ts-ignore
import mergeYaml = require('merge-yaml');

export type Yaml = string | number | boolean | null | Yaml[] | { [key: string]: Yaml };

/**
 * Loads and returns the contents of the given file as YAML. The passed file
 * is assumed to be UTF-8 encoded.
 */
export function load(filename: string): Yaml {
    const fileContents = fs.readFileSync(filename, {encoding: 'utf8'});
    return yaml.safeLoad(fileContents, {filename}) as Yaml;
}

/**
 * Loads and returns the contents of the given files as a single YAML object.
 * Files are merged with increasing priority, meaning that files having a
 * higher index in the passed array override those with a lower index.
 */
export function loadMerge(filenames: string[]): Yaml {
    return mergeYaml(filenames) as Yaml;
}
