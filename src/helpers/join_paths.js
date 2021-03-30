/**
 * Join path using "/" separator
 * @param  {...string | string[]} segments
 * @returns {string} path
 */
function joinPaths(...segments) {

  // Segments can be string or arrays, we need to split arrays first.
  let splitted = [];
  segments.forEach(segment => {
    if (Array.isArray(segment)) {
      splitted.push(...segment);
    } else if (segment) {
      splitted.push(segment);
    }
  });

  // Build path
  return splitted.map(str => {
    if (str[0] === '/') {
      str = str.substring(1);
    }
    if (str[str.length - 1] === "/") {
      str = str.substring(0, str.length - 1);
    }
    return str;
  }).filter(str => str !== "").join("/");
}

export default joinPaths;