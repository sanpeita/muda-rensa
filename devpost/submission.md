# Devpost提出記録 — ムダ連鎖

更新: 2026-10-25

## 提出要件の充足状況

| 要件 | 状態 | 実体 |
|---|---|---|
| 空フォルダから開始 | 済 | 2026-09-26 にSkill Pack導入から開始 |
| Devpost Learn Skill Pack を使用 | 済 | `.agents/skills/1-start`〜`6-ship`（リポジトリには含めない: `.gitignore`） |
| 計画文書（scope/prd/spec） | 済 | `devpost/scope.md`・`devpost/prd.md`・`devpost/spec.md`（すべて status: approved） |
| 公開リポジトリ | **済** | https://github.com/sanpeita/muda-rensa （public・未認証200で確認） |
| デモ動画 1〜3分 | **作成済（音声なし）** | `output/muda-rensa-demo-captioned.mp4`（67.6秒 / 1280×720 / H.264 / 字幕入り） |
| 説明文（何を・誰に・学び） | 本人の回答を受領 | 下記「提出文の材料」 |
| Devpost提出 | 未 | — |

## 動画の内容（67.6秒・字幕入り・無音）

字幕タイムライン（ナレーション収録のキュー）:

| 時刻 | 字幕 |
|---|---|
| 0:00 | ムダ連鎖 — 指で街を吸って、円で放つ |
| 0:04 | 指をずらして移動。通過した街の物を吸収 |
| 0:10 | 指を止めると、周囲をサイクロン吸引 |
| 0:14 | 押したまま、素早く円を描くと HYPER |
| 0:15 | 離して放出。衝撃波＋弾の直撃でHPを削る |
| 0:24 | HYPERはビビッドな弾。エネルギーを使い切る |
| 0:33 | 5分で一区切り。足りなければ「つづける？」 |
| 0:53 | 途中で閉じても続きから／通信なしでも起動できる |
| 1:02 | 撃破。ムダ、完了。（SCORE 39,933 / HYPER 5回） |
| 1:05 | 電車待ちの5分を潰したい人へ |

収録方法: Playwright（Chromium / 1280×720）で実プレイを録画し、字幕はページ上のオーバーレイとして同時に描画（アプリのコードは無変更）。ffmpegでH.264化。撃破まで到達、コンソールエラーなし。

### ナレーション合成の手順（音声が届いたら）

```bash
# 音声（m4a/wav）を動画に載せる。映像は再エンコードしない
ffmpeg -y -i muda-rensa-demo-captioned.mp4 -i voice.m4a \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 160k -shortest \
  -movflags +faststart muda-rensa-final.mp4
```

事前検証済み（2026-10-25）: 67.6秒の無音AACで合成し、`h264 + aac` / 67.6秒 / faststart を確認。
音声が67.6秒より長い場合は `-shortest` で切れるので、先に尺を合わせるか、`atempo` で調整する。

## 提出文の材料（本人の回答・原文）

- 何を作ったか（一言）: 「AIとかかわる時間が多いからこそ、AIでつくったもので時間をつぶそう。」
- 誰向けか: 「電車待ちの5分を潰したい人。」
- 学んだこと: 「超カジュアルゲームは、暇をしている人間だからこそスパイスがきくということ。」

提出フォームに合わせた割り当ては本人が決める。エージェントは誤字・文法の校正のみ行う。

## 残り

- ナレーション（本人の声）を動画に載せる → 最終動画
- 動画のアップロード（YouTube限定公開 or Devpostへのファイル添付）とURL確定
- Devpostフォーム入力・exit survey（本人）→ 提出
- `checklist.md` の Final Review と Code Tour and App Map（学習ラップアップ）

## フォーム入力用の確定値（2026-10-25 実測）

- 動画欄は**URL貼り付けのみ**（ファイルアップロード不可・本人確認）
- Project name: 上限60字 → `ムダ連鎖 / Muda Rensa`（17字）
- Elevator pitch: 上限200字 → 下記（70字）

```text
AIと関わる時間が多いからこそ、AIでつくったもので時間をつぶそう。電車待ちの5分を潰したい人のための、オフラインで遊べるカジュアルゲーム。
```

| 欄 | 値 |
|---|---|
| GitHub repo URL | `https://github.com/sanpeita/muda-rensa` |
| Try it out | `https://muda-rensa-iphone-test.netlify.app/` |
| Video demo URL | YouTube等への**限定公開**アップロード後のURL（Release直リンク `https://github.com/sanpeita/muda-rensa/releases/download/v0.1.0/muda-rensa-demo-captioned.mp4` は動画欄の検証を通らない可能性が高い） |
| Thumbnail | `output/thumbnail.png`（1200×800 / 3:2 / 500KB未満） |

## About the project（Project Story）下書き — 本人回答の英訳＋事実

> 注意: 1〜2節は本人の回答の翻訳。3節以降はプロジェクトの事実。最終的な文面は本人が確定する。

```markdown
## Inspiration
I spend a lot of time with AI. So I wanted to spend my idle time on something AI built: a game for the five minutes you wait for a train.

## What it does
Drag to fly a drone over a miniature city and absorb whatever you pass. Stop your finger and it becomes a cyclone that pulls in everything nearby. Hold and draw a quick circle to charge HYPER, then release to fire vivid orbs at the target. One session lasts five minutes; drop the target's HP to zero and you win.

## How we built it
- Planned first with the Devpost Learn skill pack (1-start → 6-ship). scope.md, prd.md and spec.md are in the public repo.
- Vanilla JavaScript + Three.js 0.186.1, bundled locally — no runtime CDN.
- Gestures live in src/input.js: a 350 ms still finger charges, and a quick circle inside a 900 ms window triggers HYPER.
- Progress autosaves to localStorage every second and on key events, so closing the tab resumes the same run.
- A Service Worker caches the app shell; after the first visit it boots with no network (verified on an iPhone 16 in airplane mode).
- 27 logic tests cover input detection, simulation and save/restore.

## Challenges
Browsers merge high-frequency finger positions into a single pointermove event, so a fast circle could be missed. Reading getCoalescedEvents() in timestamp order fixed it — the pure-geometry test passed even while the real browser still failed.

## What we learned
Even a super casual game gets its spice from the fact that the player is bored. Also, "tests pass" and "it feels right" are different things: when recording the demo, a circle drawn too slowly never triggered HYPER, because the turn has to finish inside the 900 ms window.

## What's next
Nothing for this proof of concept — it ends at a playable five-minute loop.
```
