const purgecss = require("@fullhuman/postcss-purgecss");

module.exports = {
  plugins: [
    require("precss"),
    require("postcss-nested"),
    require("autoprefixer"),
    purgecss({
      content: ["./src/**/*.html", "./src/**/*.js"],
    }),
    require("postcss-csso"),
  ],
};
