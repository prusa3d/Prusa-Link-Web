const config = {
  /** The directory from which files are retrieved. */
  sourceDir: "src/assets/",
  /** The directory where the files will be saved. */
  outputDir: "src/assets/",
  /** Enable or disable referencing to the original file. Path is hardcoded to `../${fileName}`. */
  referencing: false,
  /** Map of color changes. Searching is not case sentisive. */
  colorChanges: {
    "#f8651b": "#FA6831",
    "#Ef7f1a": "#FA6831",
    "#fa6831": "#FA6831",
    "#f60": "#FA6831",
    "#ec691f": "#FA6831",
    "#ed6b21": "#FA6831",
    "#f63": "#FA6831",
  },
};

module.exports = config;
