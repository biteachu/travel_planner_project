import { readFile, access } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const evidence = JSON.parse(
  await readFile(new URL("./evidence.json", import.meta.url), "utf8"),
);
const publicDir = fileURLToPath(new URL("./public/", import.meta.url));
const issues = [];
const promptLog = await readFile(
  new URL("../docs/process/prompts.md", import.meta.url),
  "utf8",
);
if (evidence.cases.length < 3) issues.push("비교 사례가 3개 이상 필요합니다.");
for (const [i, item] of evidence.cases.entries()) {
  if (!promptLog.includes(item.prompt) || !item.prompt.trim())
    issues.push(`${i + 1}번: 지시 원문 기록에서 발췌를 찾지 못했습니다.`);
  try {
    if (!/^[a-f0-9]{7,40}$/.test(item.commit))
      throw new Error("invalid commit");
    execFileSync("git", ["cat-file", "-e", `${item.commit}^{commit}`], {
      stdio: "pipe",
    });
  } catch {
    issues.push(`${i + 1}번: 저장소의 실제 커밋 확인이 필요합니다.`);
  }
  if (
    !item.verified ||
    !item.prompt.trim() ||
    !item.reason.trim() ||
    !item.commit.trim()
  )
    issues.push(`${i + 1}번: 실제 지시·이유·커밋과 자료 확인이 필요합니다.`);
  for (const key of ["before", "after"]) {
    const path = resolve(publicDir, item[key] || "");
    const rel = relative(publicDir, path);
    if (!item[key] || rel.startsWith("..") || isAbsolute(rel)) {
      issues.push(
        `${i + 1}번 ${key}: public 폴더 안의 이미지 경로가 필요합니다.`,
      );
      continue;
    }
    try {
      await access(path);
      const source = new URL(`../docs/process/${item[key]}`, import.meta.url);
      if (!(await readFile(path)).equals(await readFile(source)))
        issues.push(`${i + 1}번 ${key}: 보존한 원본 화면과 파일이 다릅니다.`);
    } catch {
      issues.push(`${i + 1}번 ${key}: 이미지가 없습니다.`);
    }
  }
}
if (issues.length) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    "자료 필드와 파일 확인 완료. 원문 일치·전후 화면·실제 변경 사유는 사람이 최종 대조해야 합니다.",
  );
