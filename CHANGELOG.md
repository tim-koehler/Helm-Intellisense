# Change Log

## [Unreleased]
## Added
- Support for yaml anchors and aliases

## [0.4.0] - 2020-06-13
### Added
- Autocomplete for build in Object `Release`
- Autocomplete for build in Object `Chart` 
- Autocomplete for build in Object `Files` 
- Autocomplete for build in Object `Capabilities` 
- Autocomplete for build in Object `Template` 
### Fixed
- Bug where values was not shown when the key was named 'type'


## [0.3.1] - 2020-06-04
### Changed
- Improved check to decide if cursor is in go-template.

## [0.3.0] - 2020-06-02
### Added
- Support of custom named value files.
- CHANGELOG

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