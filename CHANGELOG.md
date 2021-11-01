# Changelog

## 2021-11-01 (3.3.0)

* Add target temperatures to the left sidebar
* Add possibility to send control values by Enter key press

## 2021-11-09 (3.2.0)

* Add serial number setting
* Add initial 0% to upload process (to be shown even before printer responds)
* Prevent api polling when previous requests were not handled
* Prevent error messages flood in case of a connection problem

## 2021-10-15 (3.1.0)

* Add possibility to build-in all SVG files

## 2021-09-23 (3.0.0)

* Add configuration based build system
* Update fonts includes

## 2021-09-09 (0.5.0)

* Add printer control page

## 2021-08-11 (0.4.0)

* Add advanced upload widget


## 2021-07-26 (0.3.5)

* Add debug outputs to investigate project picture collision


## 2021-07-20 (0.3.4)

* Removed unnecessary colon after hostname in Dashboard
* Switched from data.link to data.printer for settings end point


## 2021-07-14 (0.3.3)

* All not available project properties are hidden
* Toaster messages are now sticky to window bottom
* Increased padding between the preview widget and bottom content
* Fixed printing time estimations missmatching
* No log file will be selected by default anymore
* Files with size above 100MB won't be loaded into textarea
* Added missing Czech translations


## 2021-07-12 (0.3.2)

* Fixed log viewer
* Added possibility to change user login and password
* Added possibility to change printer name and location


## 2021-07-01 (0.3.1)

* Fixed padding for preview widget on Dashboard and Projects page


## 2021-06-30 (0.3.0)

* Fixed progress bar behavior when printing is finished
* Fixed error handling for periodic requests
* Page heading is sticky now
* Telemetry sidebar is sticky now
* Added frontend version to the Settings page
* Fixed 'undefined' error pop up heading in some cases


## 2021-06-25

* Added persistent `/api/job` polling without a rely on the `state.flags.printing`

