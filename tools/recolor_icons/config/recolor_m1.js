const config = {
  /** The directory from which files are retrieved. */
  sourceDir: "src/assets/",
  /** The directory where the files will be saved. */
  outputDir: "src/assets/m1",
  /** Enable or disable referencing to the original file. Path is hardcoded to `../${fileName}`. */
  referencing: true,
  /** Map of color changes. Searching is not case sentisive. */
  colorChanges: {
    "#FA6831": "#5ea796",
  },
};

module.exports = config;
