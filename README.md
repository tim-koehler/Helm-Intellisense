<h1 align="center">Helm-Intellisense</h1>
<div align="center">

![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/Tim-Koehler.helm-intellisense?style=flat-square)
![Visual Studio Marketplace Rating (Stars)](https://img.shields.io/visual-studio-marketplace/stars/Tim-Koehler.helm-intellisense?style=flat-square)
![GitHub Repo stars](https://img.shields.io/github/stars/tim-koehler/Helm-Intellisense?label=GitHub%20Stars&style=flat-square)
![GitHub issues](https://img.shields.io/github/issues-raw/tim-koehler/Helm-Intellisense?style=flat-square)

### Extension to help writing Helm-Templates by providing intellisense

![Demo Gif](https://imgur.com/pC2vuoN.gif) 
</div>

## Features

- The `values.yaml` file of the chart will be read and evaluated automatically to provide intellisense.
- Autocomplete will also work for all `Named Templates` defined in the any `.tpl` file.
- Compatible with Windows and Linux/Unix.
- Support for custom named value files is provided (see settings section below).
- Lint command to validate correct values templating and usage of NamedTemplates.
- Support and autocomplete for `yaml` anchors and labels
- The extension is compatible with the `Kubernetes` extension.
- Working with language type `yaml` and `helm-template`.

## Commands

* `Helm-Intellisense: Lint` :       This command parses the currently active document and validates that all paths(like `.Values.foo.bar`) point to valid values.
* `Helm-Intellisense: Lint Chart` : Equivalent to `Lint` command but for all files in the chart of the file that is currently active.

## Settings

| Setting                                   | Description
|:------------------------------------------|:----------------------------------------------------------------------------------------
| `helm-intellisense.customValueFileNames`  | Defines list of possible files containing values<br>(default: `values.yaml`)
| `helm-intellisense.lintFileOnSave`        | If set to `true` the `Helm-Intellisense: Lint` command will be executed on save (default: `true`)

## Multiple value files (overriding)

When mulitple value files are defined they are parsed from the bottom up:
```json
"helm-intellisense.customValueFileNames": [
    "prod-values.yaml",
    "dev-values.yaml",
    "values.yaml"
]
```
In this case values will be overwritten by dev and dev by prod. This also means that the linter will only throw an error if a certain key is not found in any of the specified files.
