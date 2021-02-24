/**
 * Returns nested value from given object. Something like "obj[nodes][for][specific][key]"
 * @param object Object to get value from.
 * @param {String} path Path to key. For example "nodes.for.specific.key"
 */
function getNestedValue(object, path) {
  let keys = path.split(".");
  let obj = object;
  for (const key of keys) {
    obj = obj[key];
    if (!obj)
      break;
  }
  return obj;
}

export default getNestedValue;