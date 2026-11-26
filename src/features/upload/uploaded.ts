import type { FileMetadata } from '../../lib/files/metadata';

/// A file offered for printing: picked from the list, or just uploaded.
export interface PrintCandidate {
  /// The 8.3 name, which starts a print.
  name: string;
  /// Its folder on the USB drive, when not the one on screen (printing the
  /// last print again).
  dir?: string | undefined;
  displayName: string;
  /// Read from the file itself, for a file just uploaded.
  meta?: FileMetadata;
  /// The printer's large and small thumbnails, for a file on the stick. Only
  /// this dialog loads the large one.
  thumbnailRef?: string | undefined;
  iconRef?: string | undefined;
  /// The file's version, which its pictures are kept under.
  version?: string | undefined;
  /// For the details: bytes, modification time (Unix s), folder as people
  /// read it.
  size?: number | undefined;
  timestamp?: number | undefined;
  where?: string | undefined;
}
