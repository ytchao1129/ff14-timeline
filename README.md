# FF14 副本排軸器

在同一條時間軸上編排副本王招式與玩家技能的網頁工具。

## 開發環境

- Node.js 22 以上

## 常用指令

| 指令 | 用途 |
| --- | --- |
| `npm install` | 安裝依賴套件（第一次下載專案時執行） |
| `npm run dev` | 啟動開發伺服器，修改程式碼後瀏覽器會自動更新 |
| `npm run build` | 型別檢查並產生正式版網頁至 `dist/` |
| `npm run lint` | 程式碼風格與常見錯誤檢查 |
| `npm run preview` | 在本機預覽 `dist/` 的正式版網頁 |

## 發布（GitHub Pages）

推送到 `main` 分支後，`.github/workflows/deploy.yml` 會自動執行檢查、測試、建置並發布。

首次設定：

1. 在 GitHub 建立公開的 repository，並將本專案推送到 `main`。
2. 到 repository 的 Settings → Pages，將 Source 設為「GitHub Actions」。
3. 等 Actions 執行完成後，網址為 `https://<帳號>.github.io/<repository 名稱>/`。

使用者的排軸資料存在各自的瀏覽器中；分享排軸請使用「匯出」與「匯入」。內建的預設排軸放在 `presets/`。
