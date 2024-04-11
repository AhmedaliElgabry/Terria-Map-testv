### Agroinformatics Platform (Core) Change-log

Agroinformatics Platform is a project that is constantly evolving. This change-log is a record of the changes that have been made to the project. It is organized by release date and tag, and lists the changes made to the project in each release.

### ([v7.51.2](http://bitbucket.org/cioapps/terriajs/compare/v7.51.2..v7.51.1)) 27 September 2023
---

### Other Changes

- chore(release): 7.51.2 [`740e38d`](http://bitbucket.org/cioapps/terriajs/commits/740e38dc29020dbb3793d6f49d5f5ef8dea80c85)

	 * > chore(release): 7.51.2

### ([v7.51.1](http://bitbucket.org/cioapps/terriajs/compare/v7.51.1..v7.51.0)) 25 September 2023
---

### Other Changes

- chore(release): 7.51.1 [`2db5c28`](http://bitbucket.org/cioapps/terriajs/commits/2db5c289b403d24579d8394a208154784d822841)

	 * > chore(release): 7.51.1

### ([v7.51.0](http://bitbucket.org/cioapps/terriajs/compare/v7.51.0..v7.50.0)) 3 September 2023
---

### New Features

- feat: change-log, translation in FR, RU, & ZH, Unit Tests Fix [`c976c1f`](http://bitbucket.org/cioapps/terriajs/commits/c976c1f9d8a668906368c522bd1ac0c6c0665bda)

	 * > feat: change-log, translation in FR, RU, & ZH, Unit Tests Fix

### Other Changes

- chore(release): 7.51.0 [`8961981`](http://bitbucket.org/cioapps/terriajs/commits/8961981c8038f3bbcc5457ad28f361f2b31867ea)

	 * > chore(release): 7.51.0

### ([v7.50.0](http://bitbucket.org/cioapps/terriajs/compare/v7.50.0..v7.49.9)) 29 August 2023
---

### New Features

- feat: Pre defined shapes [`e63bd52`](http://bitbucket.org/cioapps/terriajs/commits/e63bd52facaacb57f07743ed507dd868487c2e36)

	 * > feat: Pre defined shapes
	 * > Add drawer for drawing shapes
	 * > Enable drawing pre-defined shapes on the map
	 * > Support line drawing
	 * > Support line drawing
	 * > Re-style drawing tools for mobile devices
	 * > Cleanup; Remove dead code
	 * > Update message banner content for drawing tools
	 * > Re-write circle drawing logic
	 * > Fix issues with reverting changes in Geo-JSON style editor
	 * > Fix custom shapes drawing issue on 3d maps
	 * > feat: Dimensions Multi-select support
	 * > Enable multi-select on a per-dimension basis
	 * > fix: Tabular view share fixes
	 * > Respect tableType and pivotView selection
	 * > feat: Authorization using init sources
	 * > hide not found private initialization sources for hand-in-hand
	 * > feat: GeoJson Style editor
	 * > Enable geojson download
	 * > Enable live preview for GeoJSON styles editor dialog
	 * > Move string literals to i18n
	 * > Add Geo-JSON download feature
	 * > Disable download link until mustache template loading completes successfully
	 * > feat: Improved guided tours

### Other Changes

- Enable multi-select on a per-dimension basis [`53f74eb`](http://bitbucket.org/cioapps/terriajs/commits/53f74eb6cf8d82f7775e952746addb31aad327c2)

	 * > Enable multi-select on a per-dimension basis

<!-- auto-changelog-above -->
---
The change-log below is generated using a semi-automatic process with the help of openai to summarize the the output obtained from `git log`
# Agroinformatics Platform (Core) Repo Change-log

## 2023-07-21

- Internationalised tabular features
- Made pivot table column headers respect columnStyle config
- Updated French language support
- Disabled word wrap in pivot view

## 2023-04-18

- Fix production bug

## 2023-04-28

- Added export button for WMTS
- Added optional keys for WMTS export
- Export window WMTS support

## 2023-05-04

- Changed login panel to login item
- Added a new version of hidden iframe
- Increased time
- Disabled chart panel on load and removed WMS items for analysis
- WMTS dimension support
- Spec consistency fix

## 2023-05-12

- Removed console statements from login task

## 2023-05-16

- Dev

## 2023-05-25

- Draw tool improvements
- Style improvements in Draw tool
- GeoJSON style editor starts with polygon color
- Show warning message in Draw tool
- Added saving logic to Draw tool
- Added button icons to Draw tool
- Allow editing catalog item name in Draw tool
- Remove stroke width editing in Draw tool
- Change name in Draw tool
- Revert change in Draw tool
- Merged in dev

## 2023-06-08

- Disabled dimension key in Draw tool

## 2023-06-20

- Added non-time-based support for export and analysis window

## 2023-06-23

- Added layer parameter to GetCapabilities request for WMTS wrapper

## 2023-06-27

- For WMTS, request a new legend on dimension change
- Added initial dimension support for WMTS implementation
- Initialize dimension values with defaults in WMTS
- Fixed dropdown not changing bug in WMTS
- Added workspace filter and initial legend request support in WMTS
- Reload legend on dimension change in WMTS
- Added checks for creating time dimension in WMTS
- Additional changes to keep up with new WMTS wrapper
- Tabular view improvements
- Fixed bug in selecting default view for CSV catalog items without tabular view
- Fixed pivot view type selection not working
- Minor table color change in Tabular view
- Moved prepareTabularView from tableStructure to tablecatalogitem
- CSV download fix in Tabular view
- Refactored Tabular view
- Removed unnecessary if condition in Tabular view
- Dev
- Added dateRange and non-time dimension support
- Restored custom print dialog styles
- Fixed taskbar layout issue
- Added missing analysis translation key-value pair
- Reverted to older jimp version
- I18n support
- Enabled language switcher for mobile view
- Using official translation for Spanish and defaulting the rest to English
- Updated i18n config for caching user language preference
- Moved lang mapping to JSON file
- Made useResourceTemplate default false
- Make useResourceTemplate default false

## 2023-07-02

- Reusable modal
- Use modal component in AnalysisWindow
- Use modal component in Sepal and Crtb windows
- Enable setting sizes for modals
- Update modal title icon and title text layout
- Support modal minimization
- Add task bar component to show list of open modal windows
- Styling updates; Hide taskbar while a modal is open
- Enable vertical scroll when modal content overflows
- Make task bar list scrollable
- Fix layout issues in CRTB modal content

## 2023-07-08

- Crtb clean up
- Fix boundary selection
- Support GAUL administrative areas for analysis
- Specify largest size for CRTB modal

## 2023-07-13

- Revert to older jimp version
- Make useResourceTemplate default false
- Dev

