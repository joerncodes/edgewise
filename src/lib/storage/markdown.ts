import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import YAML from "yaml";
import {
  KnifeSchema,
  OwnerSchema,
  type Knife,
  type Owner,
  type Storage,
} from "./types";

export interface MarkdownStorageOptions {
  dataDir: string;
}

export class MarkdownStorage implements Storage {
  private dataDir: string;
  private knivesDir: string;
  private ownersDir: string;

  constructor(opts: MarkdownStorageOptions) {
    this.dataDir = opts.dataDir;
    this.knivesDir = path.join(this.dataDir, "knives");
    this.ownersDir = path.join(this.dataDir, "owners");
  }

  private async ensureDirs() {
    await fs.mkdir(this.knivesDir, { recursive: true });
    await fs.mkdir(this.ownersDir, { recursive: true });
  }

  private knifePath(id: string) {
    return path.join(this.knivesDir, `${id}.md`);
  }

  private ownerPath(id: string) {
    return path.join(this.ownersDir, `${id}.md`);
  }

  private async readFileOrNull(p: string): Promise<string | null> {
    try {
      return await fs.readFile(p, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  private parseKnife(raw: string): Knife {
    const parsed = matter(raw);
    const data = {
      ...parsed.data,
      notes: parsed.content.trim(),
    };
    return KnifeSchema.parse(data);
  }

  private serializeKnife(knife: Knife): string {
    const { notes, ...rest } = knife;
    const fm = YAML.stringify(rest);
    return `---\n${fm}---\n\n${notes ?? ""}\n`;
  }

  private parseOwner(raw: string): Owner {
    const parsed = matter(raw);
    const data = {
      ...parsed.data,
      notes: parsed.content.trim(),
    };
    return OwnerSchema.parse(data);
  }

  private serializeOwner(owner: Owner): string {
    const { notes, ...rest } = owner;
    const fm = YAML.stringify(rest);
    return `---\n${fm}---\n\n${notes ?? ""}\n`;
  }

  async listKnives(): Promise<Knife[]> {
    await this.ensureDirs();
    const entries = await fs.readdir(this.knivesDir);
    const knives = await Promise.all(
      entries
        .filter((f) => f.endsWith(".md"))
        .map(async (f) => {
          const raw = await fs.readFile(path.join(this.knivesDir, f), "utf8");
          return this.parseKnife(raw);
        }),
    );
    return knives.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getKnife(id: string): Promise<Knife | null> {
    await this.ensureDirs();
    const raw = await this.readFileOrNull(this.knifePath(id));
    return raw ? this.parseKnife(raw) : null;
  }

  async saveKnife(knife: Knife): Promise<void> {
    await this.ensureDirs();
    await fs.writeFile(this.knifePath(knife.id), this.serializeKnife(knife), "utf8");
  }

  async deleteKnife(id: string): Promise<boolean> {
    try {
      await fs.unlink(this.knifePath(id));
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw err;
    }
  }

  async listOwners(): Promise<Owner[]> {
    await this.ensureDirs();
    const entries = await fs.readdir(this.ownersDir);
    const owners = await Promise.all(
      entries
        .filter((f) => f.endsWith(".md"))
        .map(async (f) => {
          const raw = await fs.readFile(path.join(this.ownersDir, f), "utf8");
          return this.parseOwner(raw);
        }),
    );
    return owners.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getOwner(id: string): Promise<Owner | null> {
    await this.ensureDirs();
    const raw = await this.readFileOrNull(this.ownerPath(id));
    return raw ? this.parseOwner(raw) : null;
  }

  async saveOwner(owner: Owner): Promise<void> {
    await this.ensureDirs();
    await fs.writeFile(this.ownerPath(owner.id), this.serializeOwner(owner), "utf8");
  }

  async deleteOwner(id: string): Promise<boolean> {
    try {
      await fs.unlink(this.ownerPath(id));
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw err;
    }
  }
}
