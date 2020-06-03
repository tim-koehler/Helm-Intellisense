# Change Log

All notable changes to the "Helm-Intellisense" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

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