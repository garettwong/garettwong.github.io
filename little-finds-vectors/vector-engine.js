// The SVG artwork is decoded once. Gameplay only blits cached surfaces;
// the pop animation is a compositor transform, not a full SVG repaint.
export async function loadVectorScene(progress = () => {}) {
  const response = await fetch('vector91/layers.json');
  if (!response.ok) throw new Error('Object list could not load');
  const layers = await response.json();
  const load = src => new Promise((resolve, reject) => {
    const im = new Image();
    let attempt = 0;
    im.onload = () => resolve(im);
    im.onerror = () => {
      if (attempt < 2) {
        attempt++;
        setTimeout(() => {im.src = src + '?retry=' + attempt;}, attempt * 400);
      } else reject(new Error('Artwork could not load: ' + src));
    };
    im.src = src;
  });
  let completed = 0;
  const artworkPromise = load('vector91/scene.svg');
  // Keep decoding/network concurrency bounded on phones.
  let next = 0;
  const workers = Array.from({length: 3}, async () => {
    while (next < layers.length) {
      const layer = layers[next++];
      [layer.sprite, layer.reveal] = await Promise.all([load(layer.item), load(layer.patch)]);
      progress(++completed, layers.length + 1);
    }
  });
  const [artwork] = await Promise.all([artworkPromise, ...workers]);
  progress(++completed, layers.length + 1);
  const scale = 2, width = 1536, height = 1024;
  const make = () => {
    const c = document.createElement('canvas');
    c.width = width * scale; c.height = height * scale;
    return c;
  };
  const pristine = make(), current = make();
  pristine.getContext('2d').drawImage(artwork, 0, 0, pristine.width, pristine.height);
  const context = current.getContext('2d');
  const byId = new Map(layers.map(layer => [layer.id, layer]));
  function compose(found) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(pristine, 0, 0);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    for (const layer of layers) if (found.has(layer.id)) {
      context.drawImage(layer.reveal, layer.x, layer.y, layer.w, layer.h);
    }
    // Preserve neighbouring treasures where their silhouettes overlap a reveal.
    for (const layer of layers) if (!found.has(layer.id) && found.size) {
      context.drawImage(layer.sprite, layer.x, layer.y, layer.w, layer.h);
    }
    return current;
  }
  compose(new Set());
  return {layers, byId, pristine, current, compose, scale};
}

export function popCollect(layer, board, transform, destination) {
  const {tx, ty, factor} = transform;
  const bounds = board.getBoundingClientRect();
  const image = document.createElement('img');
  image.src = layer.item;
  image.alt = '';
  image.className = 'collect-pop';
  image.style.left = (bounds.left + tx + layer.x * factor) + 'px';
  image.style.top = (bounds.top + ty + layer.y * factor) + 'px';
  image.style.width = layer.w * factor + 'px';
  image.style.height = layer.h * factor + 'px';
  document.body.append(image);
  const target = destination.getBoundingClientRect();
  const dx = target.left + target.width / 2 - (bounds.left + tx + (layer.x + layer.w/2) * factor);
  const dy = target.top + target.height / 2 - (bounds.top + ty + (layer.y + layer.h/2) * factor);
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const frames = reduced ? [{opacity: 1}, {opacity: 0}] : [
    {transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0},
    {transform: 'translate(0,-14px) scale(1.5)', opacity: 1, offset: .3},
    {transform: 'translate(0,-14px) scale(1.4)', opacity: 1, offset: .48},
    {transform: `translate(${dx}px,${dy}px) scale(.18)`, opacity: 0, offset: 1}
  ];
  if (!image.animate) {image.remove(); return;}
  const animation = image.animate(frames, {duration: reduced ? 180 : 700, easing: 'cubic-bezier(.2,.7,.25,1)', fill: 'forwards'});
  animation.finished.catch(() => {}).finally(() => image.remove());
  return animation;
}
