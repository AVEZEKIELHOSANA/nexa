import { FileText, Download } from "lucide-react";
import { assetKind, assetLabel } from "@/lib/assets";

/** Files attached to a course: images shown, audio playable, PDFs as download links. */
export function CourseAssets({ assets }: { assets: { path: string; url: string }[] }) {
  if (assets.length === 0) return null;
  return (
    <section aria-labelledby="assets" className="space-y-3">
      <h2 id="assets" className="text-lg font-semibold">
        Materials
      </h2>
      <ul className="space-y-4">
        {assets.map((a) => {
          const kind = assetKind(a.path);
          const label = assetLabel(a.path);
          return (
            <li key={a.path} className="space-y-1.5">
              {kind === "image" && (
                // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded files from storage; sizes unknown
                <img src={a.url} alt={label} loading="lazy" className="max-h-96 w-auto max-w-full rounded-lg border" />
              )}
              {kind === "audio" && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">{label}</p>
                  <audio controls preload="none" src={a.url} className="w-full" />
                </div>
              )}
              {(kind === "pdf" || kind === "other") && (
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                  <FileText className="h-4 w-4" aria-hidden /> {label} <Download className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
