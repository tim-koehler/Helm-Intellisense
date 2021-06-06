# Change Log

## [0.10.0] - 2021-06-06
### Added
- Value file overriding (hierarchy) (Issue #35)
## [0.9.4] - 2021-04-26
### Changed
- 'Rate me' popup. See issue #33.
## [0.9.3] - 2021-04-02
### Fixed
- Security issue
### Added
- New README

## [0.9.2] - 2021-02-25
### Fixed
- Issue #29
## [0.9.1] - 2021-02-03
### Fixed
- Issue #27

## [0.9.0] - 2021-01-30
### Added
- Autocomplete and linting for all NamedTemplates defined in any `*.tpl` file

## [0.8.0] - 2020-12-07
### Added
- Autocomplete for `_helpers.tpl` (#23)

## [0.7.8] - 2020-11-09
### Fixed
- Issue #21

## [0.7.7] - 2020-10-10
### Fixed
- Added error message when values file can't be parsed

## [0.7.6] - 2020-09-24
### Added
- Popup to star on GitHub
### Changed
- Some small things in the README

## [0.7.5] - 2020-08-23
### Changed
- The `Helm-Intellisense: Lint Chart` command now gives feedback after running without errors.

## [0.7.4] - 2020-08-16
### Changed
- Issue #15 -> Preventing focus switch to output when linter ran. 
### Fixed
- Bug which causes linter to crash in some cases.

## [0.7.3] - 2020-08-16
### Changed
- Issue #14 -> Linter will ignore missing value if `default` is set.

## [0.7.2] - 2020-07-18
### Fixed
- Bug which replaced whitespace before alias(anchor) during autocomplete.

## [0.7.1] - 2020-07-16
### Fixed
- Possible security issue with lodash.

## [0.7.0] - 2020-07-16
### Added
- Windows support.

## [0.6.6] - 2020-07-14
### Fixed
- Check if file is inside Helm Chart before linting.

## [0.6.5] - 2020-07-13
### Fixed
- Only one output channel will be used now.
### Added
- Lint file on save can now be configured.
### Changed 
- If linting returns no errors no output box will be displayed.

## [0.6.4] - 2020-07-08
### Fixed 
- Autocomplete is now also working when replacing a key within a path.

## [0.6.3] - 2020-07-03
### Changed 
- Added line number to linting output.

## [0.6.2] - 2020-07-02
### Fixed 
- Bug which crashed linter.

## [0.6.1] - 2020-07-02
### Changed 
- Linting issues will now be printed to the output panel.

## [0.6.0] - 2020-07-01
### Added
- Command to lint current chart.
### Changed
- Name of `Helm-Intellisense: Lint` command to `Helm-Intellisense: Lint File`.

## [0.5.2] - 2020-06-30
### Fixed
- Bug which caused problems with anchor/label completion.

## [0.5.1] - 2020-06-30
### Changed
- Small changes in README.

## [0.5.0] - 2020-06-30
### Added
- Command to lint current template file to find wrongly configured `.Values.foo.bar` paths .
- Support for yaml anchors and aliases.

## [0.4.0] - 2020-06-13
### Added
- Autocomplete for build in Object `Release`.
- Autocomplete for build in Object `Chart`.
- Autocomplete for build in Object `Files`.
- Autocomplete for build in Object `Capabilities`. 
- Autocomplete for build in Object `Template`.

### Fixed
- Bug where values was not shown when the key was named 'type'.

## [0.3.1] - 2020-06-04
### Changed
- Improved check to decide if cursor is in go-template.

## [0.3.0] - 2020-06-02
### Added
- Support of custom named value files.
- CHANGELOG.

## [0.2.3] - 2020-06-02
### Added
- Support of `$.Values`.

## [0.2.2] - 2020-06-01
### Added
- LICENSE.

### Fixed
- Bug which caused array indices to appear.

## [0.2.1] - 2020-06-01
### Fixed
- Bug where `values.yaml` could not be located if two `templates` directories exist in the path.

## [0.2.0] - 2020-06-01
### Added
- Preview of the actual value in the `values.yaml`.

## [0.1.4] - 2020-06-01
### Changed
- Minimal performance improvement.

## [0.1.3] - 2020-05-31
### Changed
- Intellisense is now also working with the trigger key (default space+tab).

## [0.1.2] - 2020-05-31
### Fixed
- Bug with multiple `.Values` in one line.
- Issue #3 (Limit suggestions to go template actions).

## [0.1.1] - 2020-05-31
### Changed
- Updated package.json.

## [0.1.0] - 2020-05-31
### Added
- First release.