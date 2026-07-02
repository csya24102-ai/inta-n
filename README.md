# インターン選考管理PWA

## 機能[README.md](https://github.com/user-attachments/files/29583149/README.md)

- 社名、卒業年度、選考状況、希望度、締め切り、面接日時、マイページURL、ID、パスワード、メモを登録
- 社名検索で登録済みの企業マイページURLを表示・開く
- ID・パスワードをコピー
- ID・パスワードはアプリ用パスワードでAES-GCM暗号化してブラウザ内に保存
- PWAとしてインストール、オフラインでアプリ画面を起動

## 非対象
- 企業名だけからマイページURLを自動検索する機能# インターン選考管理PWA（社名のみ必須版）

## 主な変更点

- 卒業年度の入力・表示を削除
- **社名だけで登録可能**。選考状況、希望度、締切、インターン日時、URL、ID、パスワード、メモはすべて任意
- 締切を複数登録可能
  - ES締切
  - Webテスト締切
  - 適性検査締切
  - 応募締切
  - 書類提出締切
  - その他（締切名を自由入力）
- インターン日時を任意で入力可能
- 登録済みでURLがある企業はマイページを開く。未登録・URL未登録企業は「社名 公式サイト」の検索結果を開く

## 起動方法

```bash
python -m http.server 8000
```

Mac/Linuxで `python` が使えない場合:

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開きます。

## GitHub Pagesへ反映する場合

リポジトリのルートに以下のファイルを置きます。

```text
index.html
styles.css
app.js
manifest.webmanifest
sw.js
icons/icon.svg
```

`sw.js` のキャッシュ名は `intern-selection-manager-v4` です。更新後、公開サイトで強制再読み込みしてください。

- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

## 注意

- 入力データはブラウザのローカルストレージに保存されます。
- ID・パスワードはアプリ用パスワードで暗号化します。
- アプリ用パスワードを忘れると、保存済みの認証情報を復元できません。
- 本物のID・パスワードやCSVバックアップをGitHubリポジトリにアップロードしないでください。

- 企業サイトへの自動ログイン
- 複数端末間の同期

## 実行
```bash
python -m http.server 8000
```

ブラウザで `http://localhost:8000` を開きます。PWA機能は `file://` で直接開くと動きません。

## GitHub Pages
`main` ブランチの `/(root)` を公開元に設定します。`index.html` はリポジトリ直下に置いてください。
