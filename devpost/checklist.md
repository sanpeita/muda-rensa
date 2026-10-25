---
doc: checklist
status: approved
---

# ムダ連鎖 — Build Checklist

Build mode: fast（2026-10-05本人の「yes」で実装順とともに承認済み。最初の遊び心地と最終レビューは本人が試す。）

企画・技術設計・実装順は2026-10-05本人承認済み。専用Git初期化と各工程のローカルcommitも同日の「yes」で許可済み。対象スマートフォンはiPhone 16（本人回答）。同日、ゲーム一式をNetlifyの新しいHTTPSテストサイトへ公開する明示許可を受けて配信済み。Git push・Devpost提出は別途許可が必要。配信証拠は `deployment.md`。

## Slices

- [x] **1. 吸収からハイパー放出・撃破まで遊べる**
  Becomes usable: ボクセル調の街でドローンを動かし、通過吸収、長押し停止と周辺吸引、指の急回転、通常／ビビッドなハイパー放出、連続スコア加算とターゲット撃破まで試せる。5分未撃破の「つづける？」も動く。まだ閉じた後の保存はない。
  Why now: 足場だけを作らず、遊びの核と最大の不確実性である急回転判定を最初に実入力で試す。手触りの修正を保存や配信へ進む前に受ける。
  PRD ref: `prd.md > The Core Journey`, `ドローンによる吸収`, `長押し・回転・解放`, `5分の区切り・続行・撃破`, `Look and Feel`
  Spec ref: `spec.md > Stack`, `File Structure`, `Input and Gesture Detection`, `Game Simulation`, `Rendering and Effects`, `Session and Persistence`
  Build: 起動・ビルド用の足場とThree.js導入を含め、main/input/game/config/render/styleを作る。入力キャンセル、照準保持、保証される基礎ダメージと直接命中の追加ダメージ、吸収重複防止、5分後の任意続行を実装。設定値を調整可能にする。
  Verify (mechanical): `npm test` で円・直線・往復・キャンセルとコアループを検査。`npm run build` 成功。`npm run dev` で実ブラウザを開き、入力・描画・放出・撃破・続行を確認。短縮検証と通常5分検証の結果を分け、ブラウザconsoleのエラーを確認する。
  Learner check: ローカルアプリを開き、移動→指を止めて長押し→急回転→離すを試す。吸引とカラーボールの手触り、回転の成立しやすさ、照準の当てやすさについて本人の観察を受ける。
  Commit: `Add playable drone absorption and hyper discharge loop`

- [x] **2. 閉じても同じプレイの続きから再開できる**
  Becomes usable: 途中で閉じて戻ると、街の吸収状況、位置、エネルギー、スコア、HPと時間が戻る。中断中は時間が止まり、復帰時に勝手な放出が起きない。
  Why now: 実際のコアループを保存して、途中の吸引・弾・続行を含む再開で重複加算や消失を防ぐ。架空の状態だけの保存テストで終えない。
  PRD ref: `prd.md > 中断からの再開`, `States and Boundaries`
  Spec ref: `spec.md > Session and Persistence`, `Data Model`, `Important Failure Modes`
  Build: persistence.js、版と値の検証、定期・節目・非表示時の保存、復帰時の入力解除を接続。保存不可と破損データは明示する。
  Verify (mechanical): `npm test` で保存復元、破損・版不一致・保存不可、吸引と放出途中の復元、基礎ダメージの再適用防止を確認。ブラウザで途中のプレイを再読込し、状態保持と非表示中の停止を確認。
  Learner check: 吸収と放出をしてから閉じ、再度開いて続きが戻ることを試す。移動や発射が勝手に起きないことも確認する。
  Commit: `Persist game sessions and resume safely after interruption`

- [x] **3. 初回取得後に通信なしで起動・再開できる**
  Becomes usable: リリース用一式を端末へ保存でき、キャッシュ完了後は通信なしで起動・プレイ・中断再開ができる。READMEから起動と検証状態が分かる。
  Why now: 完成した実際のアプリと保存をまとめてオフラインで試す。先にキャッシュだけを作ってゲーム完走を未検証にしない。
  PRD ref: `prd.md > 5分の区切り・続行・撃破`, `中断からの再開`
  Spec ref: `spec.md > Offline App Shell`, `Where It Runs and How Someone Tries It`, `Verification`
  Build: Service Worker、manifest、自作アイコン、キャッシュ完了表示、配信用ビルド、README。外部CDN依存を除き、バージョンと保存の整合を確認する。
  Verify (mechanical): `npm test` と `npm run build`。リリース用一式をpreview配信してキャッシュ後にブラウザをオフラインにし、再読込・保存復元・コアループを確認。PC証拠とスマホ実機の機内モード検証を分離。未確認端末の実機検証は未実施のまま記録する。
  Learner check: 対象スマホと安全な接続経路を確認後、初回取得とキャッシュ完了→機内モード→再起動→吸収と放出→中断再開→撃破を本人が試す。配信が必要なら公開前に別途許可を取る。
  Commit: `Add offline app shell and documented run instructions`

## Hands-on Checkpoints

Slice 2・3のPC機械検証は完了。保存復元と破損データの保護、Service Workerの全14アセット取得、通信遮断後の再読込・放出・復元・通常5分設定での撃破を確認。承認済みHTTPSテストサイトを公開し、配信先でもPCのオフライン再起動・放出・復元を確認。iPhone 16の実機操作と最終レビューは本人確認待ち。

Slice 1の機械検証は2026-10-05に完了。19件pass、ビルド成功、実ブラウザでハイパー放出・通常5分設定での撃破・早送り時計による続行を確認。本人が「初プレイ楽しめました。いい感じですね」と報告し、序盤操作確認も完了。`verification.md` に証拠を記録。

- [x] Early usable behavior explored — Slice 1。2026-10-05に本人の肯定的な初プレイ報告を受領。修正要望なし。
- [x] Final kick-the-tires exploration and feedback completed — 保存とオフラインを含む一連のプレイを本人が試す。PCとスマホ実機の証拠は分ける。iPhone 16実機でホーム画面版キャッシュ完了、機内モードでの起動・操作・中断再開・撃破を確認済み（2026-10-12 20:xx JST）。

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — 急回転検出を早く試し、E2Eを維持して調整する流れを実際のコードと検証結果で短く確認。
- [ ] Optional edit and transfer reflection addressed — 振り返りは任意。本人が回答した事実だけを記録。
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: 未実施。
Route and stops: 完成した入力→進行→描画の実ファイルを確認してから記録。
Edit outcome: 未実施。
Reflection: 未実施。個人の振り返りは公開対象外のlearner-profileへ保存。
Activity mode: fast。序盤と最終の本人操作確認は省略しない。

## Revisions

- 高速ドラッグ時の吸収を移動経路の線分で判定 — 移動後の位置だけでは、物の上を通過しても取りこぼすことを再現したため。回帰テストを追加。
- 回転判定でgetCoalescedEventsを読み、時刻順に整理 — 実ブラウザが高速円運動を数件のpointermoveへまとめることを確認。まとめられた途中座標を読む修正後、ネイティブのブラウザ入力でHYPER READYと放出を確認。
- セッション時間を描画の安全用時間刻みから分離 — 低フレームレートでも5分の区切りを遅らせないため。時間計測の回帰テストを追加。
