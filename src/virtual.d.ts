declare module 'virtual:printer-images' {
  /* eslint-disable @typescript-eslint/consistent-type-imports --
     an import declaration in an ambient module cannot name a relative path,
     and the types would silently become any. */
  /// Per variant: SVG markup on a 500-unit canvas, with its status picture's
  /// labels in the same units where it has one.
  type Pictures = Readonly<
    Partial<
      Record<
        import('./lib/printer/models').Variant,
        {
          svg: string;
          status?: import('./lib/printer/status-picture').PictureStatus;
        }
      >
    >
  >;
  /* eslint-enable @typescript-eslint/consistent-type-imports */

  const printerImages: {
    images: Pictures;
    /// The same printers with an MMU3, where the build has one.
    mmu: Pictures;
  };
  export default printerImages;
}

declare module 'virtual:locales' {
  const locales: {
    /// The language the build speaks first (English, or a one-language
    /// build's own), and its messages by key.
    base: string;
    baseMessages: Readonly<Record<string, string>>;
    /// Every message key, in the order of each language's list.
    keys: readonly string[];
    /// Messages per language other than English; null where it has none.
    messages: Readonly<Record<string, readonly (string | null)[]>>;
  };
  export default locales;
}

/// A build for a printer with little room (the MINI): no picture, no graph,
/// one language. Set by scripts/build-all.ts.
