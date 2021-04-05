/**
 * Get element with given ref or id. Returns body if param is undefined.
 * @param {(HTMLElement|string|undefined)} element Pass HTMLElement (ref),
 * string (id) or undefined (body).
 * @returns {HTMLElement}
 */
function getElement(element) {
  return typeof element === "string"
    ? document.getElementById(element)
    : element || document.body;
}

export default getElement;
