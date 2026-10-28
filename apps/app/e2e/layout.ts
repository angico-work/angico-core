// Run in the browser via locator.evaluateAll. Map tiles may extend beyond their
// container; only their painted area, after ancestor clipping, can overflow.
export function findVisibleOverflow(elements: Element[]): string[] {
  return elements.flatMap((element) => {
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return [];
    const rect = element.getBoundingClientRect();
    let { left, right, top, bottom } = rect;
    if (rect.width === 0 || rect.height === 0) return [];

    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const parentStyle = getComputedStyle(parent);
      const bounds = parent.getBoundingClientRect();
      if (parentStyle.overflowX !== 'visible') {
        left = Math.max(left, bounds.left + parent.clientLeft);
        right = Math.min(right, bounds.left + parent.clientLeft + parent.clientWidth);
      }
      if (parentStyle.overflowY !== 'visible') {
        top = Math.max(top, bounds.top + parent.clientTop);
        bottom = Math.min(bottom, bounds.top + parent.clientTop + parent.clientHeight);
      }
    }

    if (right <= left || bottom <= top) return [];
    if (left >= -0.5 && right <= window.innerWidth + 0.5) return [];
    return [`${element.tagName.toLowerCase()}.${element.className}: ${left}/${right}`];
  });
}
