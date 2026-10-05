# ムダ連鎖 — 検証記録

## 2026-10-05 / Slice 1

状態：機械検証済み。2026-10-05に本人が初プレイを楽しめたと報告し、序盤操作確認を完了。修正要望なし。Slice 1をローカルcommitへ保存する。

- `npm test`：19件pass、0件fail。円運動の両方向、低速／小円／直線／往復の拒否、キャンセル、まとめられたpointermove、高速通過吸収、吸収重複防止、保証される弱体化、撃破と続行を検証。
- `npm run build`：成功。Three.js 0.186.1、three.core.jsとLICENSEを含むローカル配信一式を生成。実行時CDNなし。
- 実ブラウザ：localhost:4173のChromiumでネイティブのマウス入力を使い、移動、通常吸収、長押し周辺吸引、通常放出、急回転からのHYPER READY、ハイパー放出とHP減少を確認。最初はまとめられた入力で円判定が失敗し、getCoalescedEvents対応後に成功。
- 通常の5分設定：ブラウザ時計やHPを変更せずプレイして撃破。終了表示「撃破。ムダ、完了。」、残り1:29、HP 0 / 3000、スコア39,635。自動操作の待ち時間もセッション時間に含む。スマホ実入力の実証ではない。
- 続行確認：別のテストでブラウザ時計だけを早送り。5分時点で「つづける？」、0:00、HP 3000 / 3000。続行クリック後は「続行 5:00」、ダイアログ非表示、同じHPを保持。これは早送りテストで、実時間5分の放置検証とは区別する。
- 画面：900×850と390×844の表示を確認。390pxで横方向のはみ出しなし。ブラウザconsoleは0 errors / 0 warnings。

ローカル証拠はGit除外対象の `output/playwright/`：`hyper-ready.png`、`hyper-release.png`、`mobile-layout.png`、`victory.png`、`continued.png`。診断・操作スクリプトも同ディレクトリ。公開資料は後続のship段階で別に整える。

## 2026-10-05 / Slice 2

- `npm test`：27件pass。保存の8件を追加。部分吸引、飛翔中の弾、破損・版不一致・保存不可、余分な入力情報の除外、復元後の進行と基礎ダメージの重複防止を確認。
- 実ブラウザの入力から放出して再読込：HP 2496、スコア6867、放出3回を維持。「続きから再開しました」を表示。指の接触状態は復元しない。
- 非表示の停止：ブラウザ内でdocument.hiddenとvisibilitychangeを模擬し、3.1秒待っても保存時間196.42508199998943秒を維持。自動化ブラウザの別タブ操作ではdocument.hiddenがfalseのままで、実際のバックグラウンド状態は再現できなかった。iPhoneでのアプリ切替・終了確認は別途必要。
- ページ初期化時に非対応版を挿入して起動：説明を表示し、元の文字列を上書きしない。「はじめから」を選ぶとHP3000の新規ゲームへ戻る。実行中の外部書換えは通常のpagehide保存で置換されるため、破損検証は起動前のデータに対して行った。
- `npm run build` 成功。操作スクリプト：`output/playwright/resume-check.js`（Git除外）。

## 2026-10-05 / Slice 3

- 配信用distにHTML、JS/CSS、Three.js、manifest、自作SVG・iPhone用180px PNG、ライセンスを同梱。個人プロフィール、企画文書、Skill Pack、node_modulesは配信対象外。
- PC ChromiumのService Workerが有効になり、全14アセットのキャッシュと「通信なしで起動できます」を確認。
- Playwrightのネットワークをofflineへ切替後、再読込、実マウス入力での吸引と通常放出、再読込後の復元に成功。HP2835.2、スコア2245、放出1回を保持。JavaScriptエラー0、393×852で横はみ出しなし。
- offline状態を保った同じセッションで急回転からの放出を繰り返し、通常の5分設定で撃破。残り1:53、HP0 / 3000、スコア39,740。時計・HPのテスト用変更なし。PCの自動マウス操作であり、iPhoneの実指入力ではない。
- Service Worker更新はskipWaitingを使わず、プレイ中に版を強制切替しない。初回取得の失敗・準備確認の時間切れは未完了表示にする。
- `npm test`：27件pass。`npm run build`成功。証拠は `output/playwright/offline-check.js`、`offline-mobile.png`、`play-progress.png`（Git除外）。
- Netlify向け設定はpublishをdistに限定。HTTPSへの実配信は未実施。

## 未実施

- 保存・オフラインを加えた後の本人最終確認。
- iPhone 16（本人回答）の実機タッチ入力、機内モードの起動と完走。
- 本人の最終レビュー、学習振り返りとapp map。
- Git push、Devpost提出。HTTPSテスト版は2026-10-05に本人承認を受けて公開済み。配信先での証拠は [deployment.md](deployment.md)。
