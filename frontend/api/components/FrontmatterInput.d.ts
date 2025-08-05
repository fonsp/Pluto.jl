export function FrontMatterInput({ filename, remote_frontmatter, set_remote_frontmatter }: {
    filename: string;
    remote_frontmatter: Record<string, any> | null;
    set_remote_frontmatter: (newval: Record<string, any>) => Promise<void>;
}): import("../imports/Preact.js").ReactElement;
