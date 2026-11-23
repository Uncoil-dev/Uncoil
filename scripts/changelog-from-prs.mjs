import { readFileSync } from "node:fs";
import { renderReleaseNotes } from "./changelog-entry.mjs";

const prs = JSON.parse(readFileSync(0, "utf8"));
const notes = renderReleaseNotes(prs);
if (notes) console.log(notes);
