# ムダ連鎖 — HTTPSテスト配信

2026-10-05、本人の「ゲーム一式をNetlifyの新しいHTTPSテストサイトへ公開してよい」で公開を承認。

- ゲームURL：<https://muda-rensa-iphone-test.netlify.app/>
- 管理画面：<https://app.netlify.com/projects/muda-rensa-iphone-test>
- Site ID：`58413026-56a6-43a6-9060-c16a6be96aef`
- Deploy ID：`6ac39c1e56ba0d5ee39657bf`、Netlify状態 `ready`。
- 配信ソース：ローカルcommit `c20367c` から生成した `dist/`。配信ZIPは `output/muda-rensa-iphone-preview.zip`（生成物・Git除外）。
- 新しい公開テストサイト。GitHub連携、Git push、Devpost提出は行っていない。

公開対象はゲームの16ファイル。HTML、JS/CSS、Three.js、ライセンス、Service Worker、manifest、アイコンのみ。個人プロフィール、親repoの変更、Skill Pack、認証情報は含めない。

## 配信と検証

Netlify Connector経由のサイト作成は成功。デプロイ補助CLIのアップロードは403で失敗し、認証済みNetlify管理画面のファイルアップロードからゲームZIPを公開した。

初期のHTMLにはNetlifyのバッジ用スクリプトが自動挿入された。ゲーム操作とオフライン動作へ不要なため、このサイトだけのバッジ設定を無効にした。[Netlify公式の設定手順](https://docs.netlify.com/manage/projects/powered-by-netlify-badge/)。設定後のHTTPS HTMLでバッジ用スクリプトが無いことを確認。

- HTTPSでゲームが起動し、全14アセットのService Workerキャッシュを確認。
- 公開先のmain.js、persistence.js、sw.js、three.core.jsがローカルdistとバイト一致。
- `/devpost/learner-profile.md`、`/.env`、`/devpost/spec.md` はHTTP404。
- PC Chromiumでネットワークをofflineに切替後、再読込、吸引・放出、再読込後の復元に成功。HP2835.2、得点2245、放出1回を保持。393×852の横はみ出しなし。
- バッジ設定後、新規ブラウザ環境でも同じ検証に成功。JavaScript例外0、consoleのエラー0・警告0。ローカル証拠は `output/playwright/https-check.js` と `https-offline-mobile.png`（Git除外）。
- iPhone 16のタッチ、ホーム画面起動、機内モード、中断再開は本人確認待ち。PC検証を実機成功とは扱わない。

## iPhoneで試す

SafariでゲームURLを開き、共有からホーム画面へ追加。そのアイコンから起動して「通信なしで起動できます」を確認する。機内モードにしてWi-Fiも切り、長押し→指で素早い円→離す、中断→再開を試す。詳しい手順は [README](../README.md)。

最終レビューとApp Mapは、実機フィードバックを受けてから完了する。
