# Helm-Intellisense

- This simple extension provides intellisense for helm-templates. The `values.yaml` file of the chart will be read and evaluated automatically to provide intellisense.
- Support for custom named value files is provided(see settings section below).
- The extension is compatible with the `Kubernetes` extension.
- Working with language type  `yaml` and `helm-template`

![feature X](images/demo.gif)

## Commands

* `Helm-Intellisense: Lint`: This command parses the currently active document and validates that all paths(like `.Values.foo.bar`) point to valid values.

## Extension Settings

This extension contributes the following settings:

* `helm-intellisense.customValueFileNames`: Defines list of possible files containing values(default: `values.yaml`)