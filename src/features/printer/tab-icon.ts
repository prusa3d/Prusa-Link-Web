/// The browser tab's icon with a badge for the printer's state, so a print
/// can be watched from another tab: a pie of the progress while printing, a
/// red "!" when the printer needs someone.
const COLOR: Readonly<Record<string, string>> = {
  PRINTING: '#2f7de1',
  BUSY: '#2f7de1',
  PAUSED: '#9b59b6',
  FINISHED: '#21ba45',
  ATTENTION: '#db2828',
  ERROR: '#db2828',
};

let original: string | undefined;
let picture: Promise<HTMLImageElement> | undefined;

export async function badgeTabIcon(
  state: string | undefined,
  progress?: number,
): Promise<void> {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) return;
  original ??= link.href;
  const color = state && COLOR[state];
  if (!color) {
    if (link.href !== original) link.href = original;
    return;
  }
  // Its own request: the one the tab made for its icon may not be readable.
  picture ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = reject;
    img.src = `${original ?? ''}?tab`;
  });
  try {
    const img = await picture;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const g = canvas.getContext('2d');
    if (!g) return;
    const dot = (radius: number, fill: string, turn = 1) => {
      g.beginPath();
      g.moveTo(24, 24);
      g.arc(24, 24, radius, -Math.PI / 2, (turn * 2 - 0.5) * Math.PI);
      g.fillStyle = fill;
      g.fill();
    };
    g.drawImage(img, 0, 0, 32, 32);
    dot(8, '#fff');
    if (progress === undefined) dot(6.5, color);
    else {
      dot(6.5, '#d0d7e2');
      dot(6.5, color, progress / 100);
    }
    if (state === 'ATTENTION' || state === 'ERROR') {
      g.fillStyle = '#fff';
      g.fillRect(22.75, 19.5, 2.5, 5.5);
      g.fillRect(22.75, 26, 2.5, 2);
    }
    link.href = canvas.toDataURL();
  } catch {
    picture = undefined;
  }
}
