# /page/index
## 首頁

用簡單的藍色(暗色) 背景中間放上遊戲介紹
(這個遊戲是 knucklebones)
有辦法建立房間

# /page/account
## 帳號頁面

給予用戶登入 / 註冊(可以共用欄位)

# /page/lobby
## 房間

可以輸入房間代碼 並且加入遊戲

# /page/room

會顯示對方的名稱以及開始遊戲(僅房主)
可以退出遊戲

# /page/game

上方為 player1
下方為 player2
排版如下
    player1 name
    |   |   |   |
    |   |   |   |
    |   |   |   |

[Dice]  Time Player_name(Current)
    |   |   |   |
    |   |   |   |
    |   |   |   |
    player2 name

將會固定時間(5s) 向後端發送請求更新資訊(如果沒有變動就不要更新畫面)
如果有變動 Dice 將會播放動畫並且最終顯示從後端抓取的點數
動畫原理如下 :
  先隨機一個 Array(20).map((_)=>Math.floor(Math.random()*6)+1)
  然後快速切換 (0.2s)
  最後切換成目標的點數
Dice 請以 svg 或是 img 表示 (麻煩建立新檔案)

接著玩家可以選擇放入的地方 (如果填滿了不可放入，若沒有填滿可以選擇放入)
並且呼叫後端更新
當收到遊戲結束時展示全螢幕橫幅(XXX獲勝)
並且在 5s 跳轉回 lobby

# page/howtoplay
## 簡單介紹
介紹遊戲玩法