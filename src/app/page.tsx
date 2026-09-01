const REPO = {
  firmware: "https://github.com/yibeilahei/lazahata",
  cookbook: "https://github.com/yibeilahei/cookbook",
};

export default function HomePage() {
  return (
    <div className="wrap">
      <header className="hero">
        <div className="hero-top">
          <h1>lazahata</h1>
          <div className="hero-links">
            <a className="hero-link" href={REPO.firmware}>
              Firmware on GitHub
            </a>
            <a className="hero-link" href={REPO.cookbook}>
              Cookbook on GitHub
            </a>
          </div>
        </div>
        <p className="lede">
          Open-source tools for Xteink e-readers: firmware that replaces the
          stock reader, and a desktop app that prepares your books for it.
        </p>
      </header>

      <main className="projects">
        <section className="card project">
          <h2>Firmware</h2>
          <p className="project-tagline">
            An open-source XTCH reader firmware for the Xteink X3 and X4,
            replacing the stock CrossPoint software.
          </p>
          <ul className="features">
            <li>Blits pre-rendered <code>.xtch</code> page bitmaps straight from the SD card — no on-device layout or scaling</li>
            <li>One firmware binary per device, tuned for its panel (X3: 792×528, X4: 800×480)</li>
            <li>Home, browser, reader, chapters, settings, and update screens</li>
            <li>Firmware updates from SD, with a recovery picker if something goes wrong</li>
            <li>Settings and per-book reading progress saved on the SD card</li>
          </ul>
          <div className="actions">
            <a className="btn btn-primary" href={`${REPO.firmware}/releases/latest`}>
              Download latest release
            </a>
            <a className="btn btn-ghost" href={REPO.firmware}>
              View source
            </a>
          </div>
        </section>

        <section className="card project">
          <h2>Cookbook</h2>
          <p className="project-tagline">
            A desktop app (macOS and Windows) that converts ebooks and PDFs
            for eink readers.
          </p>
          <ul className="features">
            <li><code>.xtch</code> output for Xteink / CrossPoint devices</li>
            <li>Panel-sized PDF output for Kindle, Sony DPT, and other readers</li>
            <li>Drag and drop ebooks, PDFs, or whole folders to convert in a batch</li>
            <li>Editable device presets, per-book language detection, and CJK romanization for filenames</li>
            <li>Calibre-powered ebook → PDF conversion, plus a bundled packer for PDF → XTCH</li>
          </ul>
          <div className="actions">
            <a className="btn btn-primary" href={`${REPO.cookbook}/releases/latest`}>
              Download latest release
            </a>
            <a className="btn btn-ghost" href={REPO.cookbook}>
              View source
            </a>
          </div>
        </section>
      </main>

      <footer className="site-foot">
        <a href="https://x.com/adamzhang1999">Contact</a>
      </footer>
    </div>
  );
}
