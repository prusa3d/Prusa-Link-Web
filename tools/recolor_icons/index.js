const fs = require("fs");
const { join } = require("path");

function main() {
  console.log("Fix primary color for icons:")
  recolor(require("./config/fix_primary_color"));
  console.log("\nRecolor m1 icons:")
  recolor(require("./config/recolor_m1"));
}

function recolor(config) {
  const { colorChanges, outputDir, referencing, sourceDir } = config;
  const stats = {
    referenced: 0,
    changed: 0,
    unchanged: 0,
    total: 0,
  }

  if (!fs.existsSync(outputDir))
    fs.mkdirSync(outputDir);

  for (const fileName of fs.readdirSync(sourceDir)) {
    const filePath = join(sourceDir, fileName);
    if (fs.lstatSync(filePath).isFile() && fileName.endsWith(".svg")) {
      stats.total++;
      const sourceContent = readFile(filePath);
      const outputFilePath = join(outputDir, fileName);

      let modified = sourceContent;
      Object.entries(colorChanges).forEach(([changeFrom, changeTo]) => {
        modified = modified.replace(new RegExp(changeFrom, "gi"), changeTo);
      });

      if (modified !== sourceContent) {
        if (rewriteFile(outputFilePath, modified)) {
          stats.changed++;
          console.log("⬤ ", outputFilePath);
        }
      } else if (referencing) {
        if (rewriteFile(outputFilePath, `../${fileName}`)) {
          stats.referenced++;
          console.log("◯ ", outputFilePath);
        }
      }
    }
  }

  stats.unchanged = stats.total - stats.changed - stats.referenced;
  console.log(`Done!`);
  console.log(`⬤  ${stats.changed} files were changed`);
  if (referencing)
    console.log(`◯  ${stats.referenced} files were referenced to original`);
  console.log(`${stats.unchanged} were unchanged`);
}

function readFile(filePath) {
  return fs.readFileSync(filePath).toString("utf-8");
}

function rewriteFile(filePath, content) {
  if (fs.existsSync(filePath)) {
    if (readFile(filePath) === content)
      return false;
    fs.unlinkSync(filePath);
  }

  fs.writeFileSync(filePath, content);
  return true;
}

main();
