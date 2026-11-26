import { spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';

// Gzipped as the firmware build does it (Python's gzip, cmake/Utilities.cmake
// gzip_file), so the .gz files are byte for byte what the firmware embeds.
// Node's zlib packs the same page some 400 bytes larger; without Python, it
// stands in.
const PYTHON_GZIP =
  'import gzip,io,sys\nb=io.BytesIO()\nf=gzip.GzipFile(fileobj=b,mode="wb",mtime=0)\nf.write(sys.stdin.buffer.read())\nf.close()\nsys.stdout.buffer.write(b.getvalue())';

export function firmwareGzip(data: Buffer): Buffer {
  const python = spawnSync('python3', ['-c', PYTHON_GZIP], {
    input: data,
    maxBuffer: 64 * 1024 * 1024,
  });
  return python.status === 0 && python.stdout.length > 0
    ? python.stdout
    : gzipSync(data, { level: 9 });
}
